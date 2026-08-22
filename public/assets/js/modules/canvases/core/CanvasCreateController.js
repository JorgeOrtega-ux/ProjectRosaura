import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { closeDropdown, filterMenuList, getAllPalettes, getDynamicTierName, restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';

class CanvasCreateController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.cardInteractions = null;
        this.templates = [];
        
        this.formState = {
            name: '',
            size: '64x64',
            privacy: 'private',
            requires_approval: 'false',
            palette_id: 'default',
            limit: 10,
            cooldown_pixels_batch: 5,
            cooldown_seconds: 10,
            template_id: null
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
        this.updatePaletteTriggerDisplay();
        this.updateSizesAvailability();

        fetch(`${this.basePath}/assets/config/canvas_templates.json`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                this.templates = data;
                this.updateTemplateTriggerDisplay();
            })
            .catch(() => {});
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
            this.formState.template_id = templateEl.getAttribute('data-value') || null;
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

        if (action === 'openCanvasTemplateModal') {
            this.openTemplateModal();
            return;
        }

        if (action === 'openCanvasPaletteModal') {
            this.openPaletteModal();
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

    async openTemplateModal() {
        const availableTemplates = (this.templates || []).filter(tpl => tpl.sizes.includes(this.formState.size));

        const res = await window.modalSystem.show('selectCanvasTemplateModal', {
            templates: availableTemplates,
            selectedTemplateId: this.formState.template_id || '',
            basePath: this.basePath
        });

        if (res && res.confirmed) {
            const selectedId = res.data?.selected_template_id || null;
            this.setTemplate(selectedId);
        }
    }

    setTemplate(templateId) {
        this.formState.template_id = templateId || null;
        
        const templateEl = document.querySelector('[data-ref="canvas_template_id"]');
        if (templateEl) {
            templateEl.setAttribute('data-value', templateId || '');
        }

        this.updateTemplateTriggerDisplay();
    }

    updateTemplateTriggerDisplay() {
        const triggerText = document.querySelector('[data-ref="text-template"]');
        if (!triggerText) return;

        if (!this.formState.template_id) {
            triggerText.textContent = window.__('lbl_empty_canvas');
            return;
        }

        const tpl = (this.templates || []).find(t => t.id === this.formState.template_id);
        if (tpl) {
            triggerText.textContent = window.__(tpl.name_key);
        } else {
            triggerText.textContent = window.__('lbl_empty_canvas');
        }
    }

    async openPaletteModal() {
        const palettes = getAllPalettes();
        const userTier = window.APP_USER?.subscription_tier ?? 0;
        const canUseCustomPalettes = window.APP_LIMITS && window.APP_LIMITS.custom_palettes === true;

        const res = await window.modalSystem.show('selectCanvasPaletteModal', {
            palettes,
            selectedPaletteId: this.formState.palette_id || 'default',
            userTier,
            canUseCustomPalettes
        });

        if (res && res.confirmed) {
            const selectedId = res.data?.selected_palette_id || 'default';
            this.setPalette(selectedId);
        }
    }

    setPalette(paletteId) {
        this.formState.palette_id = paletteId || 'default';
        this.updatePaletteTriggerDisplay();
    }

    updatePaletteTriggerDisplay() {
        const triggerText = document.querySelector('[data-ref="text-palette"]');
        if (!triggerText) return;

        const palettes = getAllPalettes();
        const pal = palettes.find(p => p.id === this.formState.palette_id);
        if (pal) {
            triggerText.textContent = window.__(pal.name_key);
        } else {
            triggerText.textContent = this.formState.palette_id;
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
                    link.setAttribute('title', window.__('tooltip_ultra_limit_reached'));
                    const badgeHtml = `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">block</span> ${tier3Count}/${tier3Max} Ultra</span>`;
                    if (!lockIcon) {
                        link.insertAdjacentHTML('beforeend', badgeHtml);
                    } else {
                        lockIcon.outerHTML = badgeHtml;
                    }
                } else {
                    link.setAttribute('title', window.__('tooltip_upgrade_required'));
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
            const currentTpl = (this.templates || []).find(t => t.id === this.formState.template_id);
            if (currentTpl && !currentTpl.sizes.includes(value)) {
                this.setTemplate(null);
            }
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
}

export { CanvasCreateController };