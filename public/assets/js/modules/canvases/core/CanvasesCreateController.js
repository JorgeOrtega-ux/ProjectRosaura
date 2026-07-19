import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';

function getAllPalettes() {
    let palettes = [];
    if (window.APP_PALETTES) {
        palettes = Object.values(window.APP_PALETTES);
    }
    if (window.APP_CUSTOM_PALETTES && Array.isArray(window.APP_CUSTOM_PALETTES)) {
        window.APP_CUSTOM_PALETTES.forEach(cp => {
            palettes.push({
                id: cp.palette_key,
                name_key: cp.name,
                colors: cp.colors.map(c => ({ hex: c }))
            });
        });
    }
    return palettes;
}

class CanvasesCreateController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.cardInteractions = null;
        
        this.formState = {
            name: '',
            size: '64',
            privacy: 'private',
            palette_id: 'default',
            limit: 10,
            cooldown_pixels_batch: 5,
            cooldown_seconds: 10,
            is_official: 0
        };

        this.countriesLoaded = false;
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);
        this.bindEvents();
        this.setupDefaultValues();
        this.renderPalettes();
        this.checkAdminPermissions();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
    }

    checkAdminPermissions() {
        let hasPerm = false;
        if (window.APP_CONFIG && window.APP_CONFIG.permissions) {
            const p = window.APP_CONFIG.permissions;
            hasPerm = p.includes('canvases.create_official') || p.includes('access_admin_panel');
        }

        const officialToggle = document.querySelector('[data-ref="val_is_official"]');
        if (officialToggle) {
            if (hasPerm) {
                officialToggle.disabled = false;
            } else {
                officialToggle.disabled = true;
            }
        }
        
        this.updateSizesAvailability(false);
    }

    setupDefaultValues() {
        const timestampName = `Canvas_${Date.now()}`;
        this.formState.name = timestampName;

        const displayEl = document.querySelector('[data-ref="display-canvasname"]');
        const inputEl = document.querySelector('[data-ref="input-canvasname"]');

        if (displayEl) displayEl.textContent = timestampName;
        if (inputEl) {
            inputEl.value = timestampName;
            inputEl.setAttribute('data-original-value', timestampName);
        }
    }

    renderPalettes() {
        const container = document.querySelector('[data-ref="palette-selector-container"]');
        if (!container) return;

        const palettes = getAllPalettes();
        container.innerHTML = '';

        let activePaletteName = window.__('lbl_loading');
        
        const canUseCustomPalettes = window.APP_LIMITS && window.APP_LIMITS.custom_palettes === true;

        palettes.forEach(palette => {
            const isDefault = palette.id === 'default';
            const isLocked = !canUseCustomPalettes && !isDefault;
            
            const translatedName = window.__ ? window.__(palette.name_key) : palette.id;

            const isActive = this.formState.palette_id === palette.id;
            if (isActive) activePaletteName = translatedName;

            const btn = document.createElement('div');
            btn.className = `component-menu-link ${isActive ? 'active' : ''} ${isLocked ? 'disabled-interactive' : ''}`;
            btn.setAttribute('data-action', isLocked ? '' : 'selectPalette');
            btn.setAttribute('data-palette-id', palette.id);
            btn.setAttribute('data-palette-name', translatedName);
            
            if (isLocked) {
                btn.classList.add('disabled-interactive');
                btn.title = window.__('tooltip_upgrade_palette');
            }

            const lockHtml = isLocked ? `<div class="component-menu-link-icon component-menu-link-icon--premium"><span class="material-symbols-rounded">stars</span></div>` : '';

            btn.innerHTML = `
                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                <div class="component-menu-link-text">
                    <span>${translatedName}</span>
                </div>
                ${lockHtml}
            `;
            container.appendChild(btn);
        });

        const triggerWrapper = container.closest('.component-dropdown-wrapper');
        if (triggerWrapper) {
            const textRef = triggerWrapper.querySelector('[data-ref="text-palette"]');
            if (textRef) textRef.textContent = activePaletteName;
        }
    }

    handleInput(e) {
        if (e.target.matches('[data-ref$="-search"]')) {
            const query = e.target.value.toLowerCase();
            const menuList = e.target.closest('.component-menu').querySelector('.component-menu-list');
            if (menuList) {
                let hasVisible = false;
                menuList.querySelectorAll('.component-menu-link:not(.component-menu-empty .component-menu-link)').forEach(link => {
                    const textEl = link.querySelector('.component-menu-link-text span');
                    if (textEl) {
                        const text = textEl.textContent.toLowerCase();
                        if (text.includes(query)) {
                            link.style.display = '';
                            hasVisible = true;
                        } else {
                            link.style.display = 'none';
                        }
                    }
                });
                
                let emptyEl = menuList.querySelector('.component-menu-empty');
                if (!emptyEl) {
                    emptyEl = document.createElement('div');
                    emptyEl.className = 'component-menu-empty';
                    emptyEl.innerHTML = `<div class="component-menu-link disabled-interactive"><div class="component-menu-link-icon"><span class="material-symbols-rounded">search_off</span></div><div class="component-menu-link-text"><span class="component-text-notice--muted">${window.__ ? window.__('no_results_found') : 'No results found'}</span></div></div>`;
                    menuList.appendChild(emptyEl);
                }
                emptyEl.hidden = hasVisible;
            }
        }
    }

    handleClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        if (this.cardInteractions && this.cardInteractions.handleAction(action, actionBtn)) {
            return;
        }

        if (action === 'toggleDropdown') {
            this.toggleDropdown(actionBtn);
        } else if (action === 'selectValue') {
            this.selectDropdownValue(actionBtn);
        } else if (action === 'toggleTag') {
            this.toggleTag(actionBtn);
        } else if (action === 'adjustLimit') {
            this.adjustParticipantLimit(actionBtn);
        } else if (action === 'adjustCooldownBatch') {
            this.adjustCooldownBatch(actionBtn);
        } else if (action === 'adjustCooldownSeconds') {
            this.adjustCooldownSeconds(actionBtn);
        } else if (action === 'saveCanvasName') {
            this.saveCanvasName(actionBtn);
        } else if (action === 'selectPalette') {
            this.selectPalette(actionBtn);
        } else if (action === 'createCanvas') {
            e.preventDefault();
            this.submitCanvas(actionBtn);

        } else if (action === 'navigateCustomPalette') {
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/canvases/palettes/create`);
            } else {
                window.location.href = `${this.basePath}/canvases/palettes/create`;
            }
        }
    }

    updateSizesAvailability(isOfficial) {
        const wrapper = document.querySelector('[data-ref="canvas-create-wrapper"]');
        if (!wrapper) return;
        
        const userTier = parseInt(wrapper.getAttribute('data-user-tier') || '0', 10);
        const sizeLinks = document.querySelectorAll('.component-menu-link[data-type="size"]');
        
        sizeLinks.forEach(link => {
            const requiredTier = parseInt(link.getAttribute('data-tier') || '0', 10);
            const isAllowed = isOfficial || (userTier >= requiredTier);
            
            if (isAllowed) {
                link.classList.remove('disabled-interactive');
                link.setAttribute('data-action', 'selectValue');
                link.removeAttribute('title');
                const lockIcon = link.querySelector('.component-menu-link-icon--premium');
                if (lockIcon) {
                    lockIcon.remove();
                }
            } else {
                link.classList.add('disabled-interactive');
                link.setAttribute('data-action', '');
                link.setAttribute('title', window.__('tooltip_upgrade_required'));
                
                let lockIcon = link.querySelector('.component-menu-link-icon--premium');
                if (!lockIcon) {
                    link.insertAdjacentHTML('beforeend', '<div class="component-menu-link-icon component-menu-link-icon--premium"><span class="material-symbols-rounded">stars</span></div>');
                }
            }
        });

        const activeSize = document.querySelector('.component-menu-link[data-type="size"].active');
        if (activeSize && activeSize.classList.contains('disabled-interactive')) {
            const firstAllowed = document.querySelector('.component-menu-link[data-type="size"]:not(.disabled-interactive)');
            if (firstAllowed) {
                this.selectDropdownValue(firstAllowed);
            }
        }
    }



    saveCanvasName(btn) {
        const container = btn.closest('.component-group-item--stateful');
        if (!container) return;

        const inputEl = container.querySelector('[data-ref="input-canvasname"]');
        const displayEl = container.querySelector('[data-ref="display-canvasname"]');

        if (inputEl && displayEl) {
            const newName = inputEl.value.trim();
            if (newName !== '') {
                displayEl.textContent = newName;
                inputEl.setAttribute('data-original-value', newName);
                this.formState.name = newName;
            } else {
                inputEl.value = inputEl.getAttribute('data-original-value') || '';
            }
        }

        const btnCancel = container.querySelector('[data-action="toggleEditState"]');
        if (btnCancel) {
            btnCancel.click();
        }
    }

    toggleDropdown(triggerBtn) {
        if (triggerBtn.classList.contains('disabled-interactive')) return;
        
        const targetId = triggerBtn.getAttribute('data-target');
        const targetDropdown = document.querySelector(`[data-module="${targetId}"]`);
        
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            if (el !== targetDropdown) {
                el.classList.remove('active');
                el.classList.add('disabled');
            }
        });

        if (targetDropdown) {
            if (targetDropdown.classList.contains('disabled')) {
                targetDropdown.classList.remove('disabled');
                targetDropdown.classList.add('active');
            } else {
                targetDropdown.classList.remove('active');
                targetDropdown.classList.add('disabled');
            }
        }
    }

    selectDropdownValue(optionBtn) {
        const type = optionBtn.getAttribute('data-type');
        const value = optionBtn.getAttribute('data-value');
        const label = optionBtn.getAttribute('data-label');
        const icon = optionBtn.getAttribute('data-icon');

        this.formState[type] = value;

        const menu = optionBtn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
            optionBtn.classList.add('active');
        }

        const dropdownWrapper = optionBtn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('.component-dropdown-text');
            if (triggerText) {
                triggerText.textContent = window.__(label);
            }

            if (icon) {
                const triggerIcon = dropdownWrapper.querySelector('.component-dropdown-trigger .material-symbols-rounded:first-child');
                if (triggerIcon) triggerIcon.textContent = icon;
            }

            const module = dropdownWrapper.querySelector('.component-module--dropdown');
            if (module) {
                module.classList.remove('active');
                module.classList.add('disabled');
            }
        }
    }

    selectPalette(btn) {
        this.formState.palette_id = btn.getAttribute('data-palette-id');
        const paletteName = btn.getAttribute('data-palette-name');

        const menu = btn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        const dropdownWrapper = btn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('[data-ref="text-palette"]');
            if (triggerText) triggerText.textContent = paletteName;

            const dropdownModule = dropdownWrapper.querySelector('.component-module--dropdown');
            if(dropdownModule) {
                dropdownModule.classList.remove('active');
                dropdownModule.classList.add('disabled');
            }
        }
    }

    toggleTag(btn) {
        if (!this.formState.tags) this.formState.tags = [];
        const val = btn.getAttribute('data-value');
        const isSelected = this.formState.tags.includes(val);
        
        if (isSelected) {
            this.formState.tags = this.formState.tags.filter(t => t !== val);
            btn.classList.remove('active');
            const icon = btn.querySelector('[data-ref="icon-check"]');
            if (icon) icon.textContent = 'check_box_outline_blank';
        } else {
            if (this.formState.tags.length >= 8) {
                showMessage(window.__ ? window.__('msg_max_tags') || 'Puedes seleccionar máximo 8 etiquetas.' : 'Puedes seleccionar máximo 8 etiquetas.', 'warning');
                return;
            }
            this.formState.tags.push(val);
            btn.classList.add('active');
            const icon = btn.querySelector('[data-ref="icon-check"]');
            if (icon) icon.textContent = 'check_box';
        }

        const triggerWrapper = btn.closest('.component-dropdown-wrapper');
        if (triggerWrapper) {
            const textRef = triggerWrapper.querySelector('[data-ref="text-tags"]');
            if (textRef) {
                if (this.formState.tags.length > 0) {
                    textRef.textContent = `${this.formState.tags.length} seleccionadas`;
                } else {
                    textRef.textContent = window.__('ph_select_tags');
                }
            }
        }
    }

    adjustParticipantLimit(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min'), 10) || 10;
        
        const fallbackMax = (window.APP_LIMITS && window.APP_LIMITS.max_members_per_canvas !== -1) ? window.APP_LIMITS.max_members_per_canvas : 50000;
        const max = parseInt(btn.getAttribute('data-max'), 10) || fallbackMax;
        
        const centerElement = document.querySelector('[data-ref="val_limit"]');
        if (!centerElement) return;

        let currentVal = parseInt(centerElement.getAttribute('data-val'), 10) || min;
        let newVal = currentVal + step;
        
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        this.formState.limit = newVal;
        centerElement.setAttribute('data-val', newVal);
        centerElement.textContent = newVal;
    }

    adjustCooldownBatch(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 1, 10);
        const max = parseInt(btn.getAttribute('data-max') || 100, 10);
        const valRef = document.querySelector('[data-ref="val_cooldown_batch"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-val'), 10) || min;
            let newVal = currentVal + step;
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            this.formState.cooldown_pixels_batch = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-val', newVal);
        }
    }

    adjustCooldownSeconds(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 0, 10);
        const max = parseInt(btn.getAttribute('data-max') || 3600, 10);
        const valRef = document.querySelector('[data-ref="val_cooldown_seconds"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-val'), 10) || min;
            let newVal = currentVal + step;
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            this.formState.cooldown_seconds = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-val', newVal);
        }
    }

    async submitCanvas(btn) {
        const inputName = document.querySelector('[data-ref="input-canvasname"]');
        if (inputName) {
            this.formState.name = inputName.value.trim();
        }
        
        const inputBatch = document.querySelector('[data-ref="val_cooldown_batch"]');
        if (inputBatch) {
            this.formState.cooldown_pixels_batch = parseInt(inputBatch.getAttribute('data-val'), 10) || 5;
        }

        const inputSec = document.querySelector('[data-ref="val_cooldown_seconds"]');
        if (inputSec) {
            this.formState.cooldown_seconds = parseInt(inputSec.getAttribute('data-val'), 10) || 10;
        }

        const inputPurchases = document.querySelector('[data-ref="val_allow_purchases"]');
        if (inputPurchases) {
            this.formState.allow_purchases = inputPurchases.checked ? 1 : 0;
        }

        const inputChat = document.querySelector('[data-ref="val_allow_chat"]');
        if (inputChat) {
            this.formState.allow_chat = inputChat.checked ? 1 : 0;
        }

        const inputOfficial = document.querySelector('[data-ref="val_is_official"]');
        if (inputOfficial) {
            this.formState.is_official = inputOfficial.checked ? 1 : 0;
        }

        setButtonLoading(btn);

        const res = await this.api.post(ApiRoutes.Canvases.Create, this.formState, this.abortController.signal);
        if (res.aborted) return;

        restoreButton(btn);

        if (res.success) {
            showMessage(window.__('msg_canvas_created'), 'success');
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/design/${res.data.uuid}`);
            }
        } else {
            showMessage(res.message, 'error');
        }
    }
}

export { CanvasesCreateController };