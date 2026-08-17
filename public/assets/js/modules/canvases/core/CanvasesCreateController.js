import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { showMessage, setButtonLoading, restoreButton, getDynamicTierName, getAllPalettes, closeDropdown, filterMenuList } from '../../../core/utils/uiUtils.js';


class CanvasesCreateController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.cardInteractions = null;
        
        this.formState = {
            name: '',
            size: '64x64',
            privacy: 'private',
            requires_approval: 'false',
            palette_id: 'default',
            limit: 10,
            cooldown_pixels_batch: 5,
            cooldown_seconds: 10
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
        this.syncStateWithDOM();
        this.renderPalettes();
        this.updateSizesAvailability();

        fetch(`${this.basePath}/assets/config/canvas_templates.json`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                this.templates = data;
                const initialSize = this.formState.size || '64x64';
                this.renderTemplatesGrid(initialSize);
            })
            .catch(e => console.error('Error fetching templates:', e));
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

    syncStateWithDOM() {
        const nameInput = document.querySelector('[data-ref="input-canvasname"]');
        if (nameInput) {
            this.formState.name = nameInput.value.trim();
        }

        const activeSizeEl = document.querySelector('.component-menu-link[data-type="size"].active');
        if (activeSizeEl) {
            this.formState.size = activeSizeEl.getAttribute('data-value');
        } else {
            this.formState.size = '64x64';
        }

        const activePrivacyEl = document.querySelector('.component-menu-link[data-type="privacy"].active');
        if (activePrivacyEl) {
            this.formState.privacy = activePrivacyEl.getAttribute('data-value');
        }

        const activeApprovalEl = document.querySelector('.component-menu-link[data-type="requires_approval"].active');
        if (activeApprovalEl) {
            this.formState.requires_approval = activeApprovalEl.getAttribute('data-value');
        }

        const activePaletteEl = document.querySelector('.component-menu-link[data-action="selectPalette"].active');
        if (activePaletteEl) {
            this.formState.palette_id = activePaletteEl.getAttribute('data-palette-id');
        }

        const cooldownBatchEl = document.querySelector('[data-ref="val_cooldown_batch"]');
        if (cooldownBatchEl) {
            this.formState.cooldown_pixels_batch = parseInt(cooldownBatchEl.getAttribute('data-value'), 10) || 5;
        }

        const cooldownSecondsEl = document.querySelector('[data-ref="val_cooldown_seconds"]');
        if (cooldownSecondsEl) {
            this.formState.cooldown_seconds = parseInt(cooldownSecondsEl.getAttribute('data-value'), 10) || 10;
        }

        const limitEl = document.querySelector('[data-ref="val_limit"]');
        if (limitEl) {
            this.formState.limit = parseInt(limitEl.getAttribute('data-value'), 10) || 10;
        }


        const allowChatEl = document.querySelector('[data-ref="val_allow_chat"]');
        if (allowChatEl) {
            this.formState.allow_chat = allowChatEl.checked ? 1 : 0;
        }

        const templateEl = document.querySelector('[data-ref="canvas_template_id"]');
        if (templateEl) {
            this.formState.template_id = templateEl.getAttribute('data-value') || templateEl.value || null;
        }
    }

    renderPalettes() {
        const container = document.querySelector('[data-ref="palette-selector-container"]');
        if (!container) return;

        const palettes = getAllPalettes();
        container.innerHTML = '';

        let activePaletteName = window.__('lbl_loading');
        
        const userTier = window.APP_USER?.subscription_tier ?? 0;
        const canUseCustomPalettes = window.APP_LIMITS && window.APP_LIMITS.custom_palettes === true;

        palettes.forEach(palette => {
            const isDefault = palette.id === 'default';
            let fallbackTier = 0;
            if (!isDefault && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                const paid = [...window.APP_TIERS].filter(t => parseInt(t.tier_level, 10) > 0 && t.is_active !== 0 && t.is_active !== false).sort((a,b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
                if (paid.length > 0) fallbackTier = parseInt(paid[0].tier_level, 10);
            }
            const reqTier = palette.tier !== undefined ? palette.tier : (isDefault ? 0 : fallbackTier);
            const isLocked = isDefault ? false : (palette.id.startsWith('custom_') || palette.is_custom ? !canUseCustomPalettes : (userTier < reqTier));
            
            const translatedName = window.__ ? window.__(palette.name_key) : palette.id;

            const isActive = this.formState.palette_id === palette.id;
            if (isActive) activePaletteName = translatedName;

            const btn = document.createElement('div');
            btn.className = `component-menu-link ${isActive ? 'active' : ''} ${isLocked ? 'disabled-interaction' : ''}`;
            btn.setAttribute('data-action', isLocked ? '' : 'selectPalette');
            btn.setAttribute('data-palette-id', palette.id);
            btn.setAttribute('data-palette-name', translatedName);
            
            if (isLocked) {
                btn.classList.add('disabled-interaction');
                btn.title = window.__('tooltip_upgrade_palette');
            }

            const tierName = getDynamicTierName(reqTier);
            const lockHtml = isLocked ? `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ${tierName}</span>` : '';

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
            filterMenuList(e.target);
        }
    }

    handleClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        if (action === 'selectCanvasTemplate') {
            const templateId = actionBtn.getAttribute('data-template-id');
            this.formState.template_id = templateId || null;
            
            const listContainer = document.querySelector('[data-ref="canvas_templates_list"]');
            if (listContainer) {
                listContainer.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
                actionBtn.classList.add('active');
            }
            
            const triggerText = document.querySelector('[data-ref="text-template"]');
            if (triggerText) {
                const label = actionBtn.getAttribute('data-label');
                triggerText.textContent = label || __('lbl_select_template');
            }
            
            closeDropdown(actionBtn.closest('.component-module--dropdown'));
            
            const hiddenInput = document.querySelector('[data-ref="canvas_template_id"]');
            if (hiddenInput) {
                hiddenInput.setAttribute('data-value', templateId || '');
                if ('value' in hiddenInput) hiddenInput.value = templateId || '';
            }
            return;
        }

        if (action === 'selectValue') {
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

    updateSizesAvailability() {
        const wrapper = document.querySelector('[data-ref="canvas-create-wrapper"]');
        if (!wrapper) return;
        
        const userTier = parseInt(wrapper.getAttribute('data-user-tier') || '0', 10);
        const tier3Count = parseInt(wrapper.getAttribute('data-tier3-count') || '0', 10);
        const tier3Max = parseInt(wrapper.getAttribute('data-tier3-max') || '3', 10);
        const sizeLinks = document.querySelectorAll('.component-menu-link[data-type="size"]');
        
        sizeLinks.forEach(link => {
            let reqTier = parseInt(link.getAttribute('data-tier') || '0', 10);
            
            if (reqTier > 0) {
                if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                    const paid = [...window.APP_TIERS].filter(t => parseInt(t.tier_level, 10) > 0 && t.is_active !== 0 && t.is_active !== false).sort((a,b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
                    const exactTier = paid.find(t => parseInt(t.tier_level, 10) === reqTier);
                    
                    if (!exactTier) {
                        reqTier = paid.length > 0 ? parseInt(paid[0].tier_level, 10) : 0;
                    }
                } else {
                    reqTier = 0;
                }
            }
            
            const isTierAllowed = userTier >= reqTier;
            const isUltraCapped = (reqTier >= 3 && tier3Count >= tier3Max);
            const isAllowed = isTierAllowed && !isUltraCapped;
            
            if (isAllowed) {
                link.classList.remove('disabled-interaction');
                link.setAttribute('data-action', 'selectValue');
                link.removeAttribute('title');
                const lockIcon = link.querySelector('.component-badge');
                if (lockIcon) {
                    lockIcon.remove();
                }
            } else {
                link.classList.add('disabled-interaction');
                link.setAttribute('data-action', '');
                
                let lockIcon = link.querySelector('.component-badge');
                if (isUltraCapped && isTierAllowed) {
                    link.setAttribute('title', window.__ ? window.__('tooltip_ultra_limit_reached') : 'Límite de 3 lienzos Ultra alcanzado');
                    const badgeHtml = `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">block</span> ${tier3Count}/${tier3Max} Ultra</span>`;
                    if (!lockIcon) {
                        link.insertAdjacentHTML('beforeend', badgeHtml);
                    } else {
                        lockIcon.outerHTML = badgeHtml;
                    }
                } else {
                    link.setAttribute('title', window.__ ? window.__('tooltip_upgrade_required') : 'Mejora de plan requerida');
                    const tierName = getDynamicTierName(reqTier);
                    const badgeHtml = `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ${tierName}</span>`;
                    if (!lockIcon) {
                        link.insertAdjacentHTML('beforeend', badgeHtml);
                    } else {
                        lockIcon.outerHTML = badgeHtml;
                    }
                }
            }
        });

        const activeSize = document.querySelector('.component-menu-link[data-type="size"].active');
        if (activeSize && activeSize.classList.contains('disabled-interaction')) {
            const firstAllowed = document.querySelector('.component-menu-link[data-type="size"]:not(.disabled-interaction)');
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

    selectDropdownValue(optionBtn) {
        const type = optionBtn.getAttribute('data-type');
        const value = optionBtn.getAttribute('data-value');
        const label = optionBtn.getAttribute('data-label');
        const icon = optionBtn.getAttribute('data-icon');

        this.formState[type] = value;

        if (type === 'size') {
            this.renderTemplatesGrid(value);
        }

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

            closeDropdown(dropdownWrapper.querySelector('.component-module--dropdown'));
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

            closeDropdown(dropdownWrapper.querySelector('.component-module--dropdown'));
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
                showMessage(window.__('msg_max_tags'), 'warning');
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

        let currentVal = parseInt(centerElement.getAttribute('data-value'), 10) || min;
        let newVal = currentVal + step;
        
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        this.formState.limit = newVal;
        centerElement.setAttribute('data-value', newVal);
        centerElement.textContent = newVal;
    }

    adjustCooldownBatch(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 1, 10);
        const max = parseInt(btn.getAttribute('data-max') || 100, 10);
        const valRef = document.querySelector('[data-ref="val_cooldown_batch"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-value'), 10) || min;
            let newVal = currentVal + step;
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            this.formState.cooldown_pixels_batch = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-value', newVal);
        }
    }

    adjustCooldownSeconds(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 0, 10);
        const max = parseInt(btn.getAttribute('data-max') || 3600, 10);
        const valRef = document.querySelector('[data-ref="val_cooldown_seconds"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-value'), 10) || min;
            let newVal = currentVal + step;
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            this.formState.cooldown_seconds = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-value', newVal);
        }
    }

    async submitCanvas(btn) {
        this.syncStateWithDOM();

        setButtonLoading(btn);

        const res = await this.api.post(ApiRoutes.Canvases.Create, this.formState, this.abortController.signal);
        if (res.aborted) return;

        restoreButton(btn);

        if (res.success) {
            showMessage(window.__('msg_canvas_created'), 'success');
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/design/${res.data.uuid}`);
            } else {
                window.location.href = `${this.basePath}/design/${res.data.uuid}`;
            }
        } else {
            showMessage(res.message, 'error');
        }
    }

    renderTemplatesGrid(size) {
        const trigger = document.querySelector('[data-ref="template_dropdown_trigger"]');
        const triggerText = document.querySelector('[data-ref="text-template"]');
        const listContainer = document.querySelector('[data-ref="canvas_templates_list"]');
        const hiddenInput = document.querySelector('[data-ref="canvas_template_id"]');

        if (!trigger || !listContainer) return;

        const templates = this.templates || [];
        
        const availableTemplates = templates.filter(tpl => tpl.sizes.includes(size));
        
        const currentTpl = templates.find(t => t.id === this.formState.template_id);
        if (currentTpl && !currentTpl.sizes.includes(size)) {
            this.formState.template_id = null;
            if (hiddenInput) hiddenInput.value = '';
        }

        if (availableTemplates.length === 0) {
            triggerText.textContent = 'Sin plantillas disponibles';
            trigger.classList.add('disabled-interaction');
            listContainer.innerHTML = '';
        } else {
            trigger.classList.remove('disabled-interaction');

            let html = '';
            
            const isNoneActive = !this.formState.template_id ? 'active' : '';
            html += `
                <div class="component-menu-link ${isNoneActive}" data-action="selectCanvasTemplate" data-template-id="" data-label="${window.__('lbl_empty_canvas')}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">crop_free</span></div>
                    <div class="component-menu-link-text"><span>${window.__('lbl_empty_canvas')}</span></div>
                </div>
            `;
            
            availableTemplates.forEach(tpl => {
                const isActive = this.formState.template_id === tpl.id ? 'active' : '';
                const name = window.__ ? window.__(tpl.name_key) : tpl.id;
                
                html += `
                    <div class="component-menu-link ${isActive}" data-action="selectCanvasTemplate" data-template-id="${tpl.id}" data-label="${name}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">crop_free</span></div>
                        <div class="component-menu-link-text"><span>${name}</span></div>
                    </div>
                `;
            });
            
            listContainer.innerHTML = html;
            
            const selectedTpl = availableTemplates.find(t => t.id === this.formState.template_id);
            if (selectedTpl) {
                triggerText.textContent = window.__ ? window.__(selectedTpl.name_key) : selectedTpl.id;
            } else {
                triggerText.textContent = 'Seleccionar plantilla';
            }
        }
    }
}

export { CanvasesCreateController };