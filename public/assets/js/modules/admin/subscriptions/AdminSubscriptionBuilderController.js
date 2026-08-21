import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { setButtonLoading, restoreButton, showMessage, hexToHsv, hsvToHex, getEventCoords } from '../../../core/utils/uiUtils.js';

class AdminSubscriptionBuilderController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 
        this.tierId = null; 
        this.isEditing = false;
        this.isSystemTier = false; 
        this.currentColorType = 'solid';
        this.currentUserWeight = 0; 
        this.isDragging = false; 
        this.activePicker = null;
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleGlobalMousedownBound = this.handleGlobalMousedown.bind(this);
        this.handleGlobalMousemoveBound = this.handleGlobalMousemove.bind(this);
        this.handleGlobalMouseupBound = this.handleGlobalMouseup.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleGlobalTouchstartBound = this.handleGlobalTouchstart.bind(this);
        this.handleGlobalTouchmoveBound = this.handleGlobalTouchmove.bind(this);
        this.handleGlobalChangeBound = this.handleGlobalChange.bind(this);
    }
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
        this.detectModeAndLoad();
    }
    destroy() {
        if (!this.isInitialized) return;
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('mousedown', this.handleGlobalMousedownBound);
        document.removeEventListener('mousemove', this.handleGlobalMousemoveBound);
        document.removeEventListener('mouseup', this.handleGlobalMouseupBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('touchstart', this.handleGlobalTouchstartBound);
        document.removeEventListener('touchmove', this.handleGlobalTouchmoveBound);
        document.removeEventListener('touchend', this.handleGlobalMouseupBound);
        document.removeEventListener('change', this.handleGlobalChangeBound);
        this.isInitialized = false;
        this.currentUserWeight = 0;
        this.isSystemTier = false;
    }
    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('mousedown', this.handleGlobalMousedownBound);
        document.addEventListener('mousemove', this.handleGlobalMousemoveBound);
        document.addEventListener('mouseup', this.handleGlobalMouseupBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('touchstart', this.handleGlobalTouchstartBound, {passive: false});
        document.addEventListener('touchmove', this.handleGlobalTouchmoveBound, {passive: false});
        document.addEventListener('touchend', this.handleGlobalMouseupBound);
        document.addEventListener('change', this.handleGlobalChangeBound);
    }
    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/subscription-create') || e.detail.url.includes('/admin/subscription-edit')) {
            this.detectModeAndLoad();
        }
    }

    getColorBlockTemplate() {
        const uniqueId = 'cp_' + Math.random().toString(36).substr(2, 9);
        return `
            <div class="component-color-row" data-component="color-block">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title" data-ref="blockTitle">${_t('admin_color_block_title', 'Color')}</h2>
                            <p class="component-card__description" data-ref="blockDesc">${_t('admin_color_block_desc', 'Selecciona un color para este bloque.')}</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--color" data-ref="dropdownWrapper">
                            <div class="component-dropdown-trigger component-dropdown-trigger--color" data-action="toggleModule" data-target="${uniqueId}">
                                <div class="component-dropdown-trigger__left">
                                    <div class="component-color-swatch" data-ref="triggerPreview"></div>
                                    <span class="component-dropdown-text" data-ref="triggerHex">#808080</span>
                                </div>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="${uniqueId}" data-ref="componentModule">
                                <div class="component-menu component-menu--w-full component-menu--h-auto">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-color-picker" data-ref="customColorPicker" data-h="0" data-s="0" data-v="50">
                                        <div class="component-color-picker__sv-area" data-action="dragSV">
                                            <div class="component-color-picker__sv-bg"></div>
                                            <div class="component-color-picker__sv-thumb" data-ref="svThumb"></div>
                                        </div>
                                        <div class="component-color-picker__hue-area" data-action="dragHue">
                                            <div class="component-color-picker__hue-thumb" data-ref="hueThumb"></div>
                                        </div>
                                        <div class="component-input-group component-input-group--h34 component-input-group--color">
                                            <div class="component-color-swatch component-color-swatch--sm" data-ref="hexInputPreview"></div>
                                            <input type="text" class="component-input-field component-input-field--mono" data-ref="hexInput" value="#808080" readonly>
                                        </div>
                                        <div class="component-color-picker__controls" data-ref="controlsContainer">
                                            <div class="component-inline-control component-inline-control--fixed component-color-picker__percentage" data-ref="percentageControl">
                                                <div class="component-inline-control__group">
                                                    <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                                    <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-5"><span class="material-symbols-rounded">chevron_left</span></button>
                                                </div>
                                                <div class="component-inline-control__center" data-value="100" data-ref="percentageCenter">
                                                    <span data-ref="stopValueDisplay">100</span>%
                                                </div>
                                                <div class="component-inline-control__group">
                                                    <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="5"><span class="material-symbols-rounded">chevron_right</span></button>
                                                    <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                                </div>
                                            </div>
                                            <button type="button" class="component-button component-button--icon component-button--h40 btn-delete-color" data-action="removeGradientColor" data-ref="deleteBtn">
                                                <span class="material-symbols-rounded">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <hr class="component-divider" data-ref="blockDivider">
            </div>
        `;
    }

    handleGlobalTouchstart(e) {
        const svArea = e.target.closest('[data-action="dragSV"]');
        const hueArea = e.target.closest('[data-action="dragHue"]');
        if (svArea || hueArea) this.handleGlobalMousedown(e);
    }
    handleGlobalTouchmove(e) {
        if (this.isDragging) {
            this.handleGlobalMousemove(e);
            if(e.cancelable) e.preventDefault(); 
        }
    }
    handleGlobalMousedown(e) {
        const svArea = e.target.closest('[data-action="dragSV"]');
        if (svArea) {
            this.isDragging = 'sv';
            this.activePicker = svArea.closest('[data-ref="customColorPicker"]');
            this.updateColorFromEvent(e, svArea);
            if(e.cancelable) e.preventDefault(); 
            return;
        }
        const hueArea = e.target.closest('[data-action="dragHue"]');
        if (hueArea) {
            this.isDragging = 'hue';
            this.activePicker = hueArea.closest('[data-ref="customColorPicker"]');
            this.updateColorFromEvent(e, hueArea);
            if(e.cancelable) e.preventDefault();
            return;
        }
    }
    handleGlobalMousemove(e) {
        if (!this.isDragging || !this.activePicker) return;
        if (this.isDragging === 'sv') {
            const svArea = this.activePicker.querySelector('[data-action="dragSV"]');
            this.updateColorFromEvent(e, svArea);
        } else if (this.isDragging === 'hue') {
            const hueArea = this.activePicker.querySelector('[data-action="dragHue"]');
            this.updateColorFromEvent(e, hueArea);
        }
    }
    handleGlobalMouseup(e) {
        this.isDragging = false;
        this.activePicker = null;
    }
    updateColorFromEvent(e, container) {
        if (!container || !this.activePicker) return;
        const rect = container.getBoundingClientRect();
        const coords = getEventCoords(e);
        let x = Math.max(0, Math.min(coords.clientX - rect.left, rect.width));
        let y = Math.max(0, Math.min(coords.clientY - rect.top, rect.height));
        if (this.isDragging === 'sv') {
            this.activePicker.dataset.s = (x / rect.width) * 100;
            this.activePicker.dataset.v = 100 - ((y / rect.height) * 100);
        } else if (this.isDragging === 'hue') {
            this.activePicker.dataset.h = (x / rect.width) * 360;
        }
        this.updatePickerUI(this.activePicker);
    }

    updatePickerUI(pickerNode) {
        let h = Math.max(0, Math.min(360, parseFloat(pickerNode.dataset.h) || 0));
        let s = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.s) || 0));
        let v = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.v) || 0));
        const hex = hsvToHex(h, s, v);
        const svArea = pickerNode.querySelector('[data-action="dragSV"]');
        if(svArea) svArea.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
        const svThumb = pickerNode.querySelector('[data-ref="svThumb"]');
        if(svThumb) {
            svThumb.style.left = `${s}%`;
            svThumb.style.top = `${100 - v}%`;
        }
        const hueThumb = pickerNode.querySelector('[data-ref="hueThumb"]');
        if(hueThumb) hueThumb.style.left = `${(h / 360) * 100}%`;
        const hexInput = pickerNode.querySelector('[data-ref="hexInput"]');
        if(hexInput) hexInput.value = hex;
        const hexInputPreview = pickerNode.querySelector('[data-ref="hexInputPreview"]');
        if(hexInputPreview) hexInputPreview.style.backgroundColor = hex;
        const blockRow = pickerNode.closest('[data-component="color-block"]');
        if(blockRow) {
            const preview = blockRow.querySelector('[data-ref="triggerPreview"]');
            const hexText = blockRow.querySelector('[data-ref="triggerHex"]');
            if(preview) preview.style.backgroundColor = hex;
            if(hexText) hexText.textContent = hex;
        }
        this.updateLivePreview();
    }

    handleGlobalClick(e) {
        if (e.target.closest('[data-action="saveSubscription"]')) {
            this.saveTier(e.target.closest('[data-action="saveSubscription"]'));
        }
        if (e.target.closest('[data-action="applyRoleName"]')) {
            this.handleApplyRoleName(e.target.closest('[data-action="applyRoleName"]'));
        }
        const applyInlineBtn = e.target.closest('[data-action="applyInlineSetting"]');
        if (applyInlineBtn) this.handleApplyInlineSetting(applyInlineBtn);
        const setColorTypeBtn = e.target.closest('[data-action="setColorType"]');
        if (setColorTypeBtn) this.handleSetColorType(setColorTypeBtn);
        const setAngleBtn = e.target.closest('[data-action="setGradientAngle"]');
        if (setAngleBtn) this.handleSetGradientAngle(setAngleBtn);
        const adjustConfigBtn = e.target.closest('[data-action="adjustConfig"]');
        if (adjustConfigBtn) this.handleAdjustConfig(adjustConfigBtn);
        const adjustColorBtn = e.target.closest('[data-action="adjustColorStop"]');
        if (adjustColorBtn) this.handleAdjustColorStop(adjustColorBtn);
        const addColorBtn = e.target.closest('[data-action="addGradientColor"]');
        const removeColorBtn = e.target.closest('[data-action="removeGradientColor"]');
        if (addColorBtn) {
            this.addColorBlock('gradientColorsContainer', '#000000', null, false); 
        }
        if (removeColorBtn) {
            removeColorBtn.closest('[data-component="color-block"]').remove();
            this.autoDistributeStops();
            this.updateLivePreview();
            this.checkMaxColorsLimit();
        }
        
        const addBenefitBtn = e.target.closest('[data-action="addBenefit"]');
        if (addBenefitBtn) this.handleAddBenefit(addBenefitBtn);
        
        const removeBenefitBtn = e.target.closest('[data-action="removeBenefit"]');
        if (removeBenefitBtn) this.handleRemoveBenefit(removeBenefitBtn);
    }
    handleApplyRoleName(btn) {
        if (this.isSystemTier) return;
        const input = document.querySelector('[data-ref="roleNameInput"]');
        const display = document.querySelector('[data-ref="display-role-name"]');
        if (input && display) display.textContent = input.value.trim() || _t();
        const viewState = document.querySelector('[data-state="role-name-view"]');
        const editState = document.querySelector('[data-state="role-name-edit"]');
        if (viewState) { viewState.classList.remove('disabled'); viewState.classList.add('active'); }
        if (editState) { editState.classList.remove('active'); editState.classList.add('disabled'); }
    }
    handleApplyInlineSetting(btn) {
        const field = btn.getAttribute('data-field');
        if (!field) return;
        const input = document.querySelector(`[data-ref="input-${field}"]`);
        const display = document.querySelector(`[data-ref="display-${field}"]`);
        if (input && display) {
            const val = input.value.trim();
            display.textContent = val || 'No configurado';
            input.setAttribute('data-original-value', val);
        }
        if (window.appInstance && typeof window.appInstance.toggleEditState === 'function') {
            window.appInstance.toggleEditState(field);
        }
    }
    handleSetColorType(btn) {
        const type = btn.dataset.value;
        this.currentColorType = type;
        const triggerText = document.querySelector('[data-ref="colorTypeText"]');
        const triggerIcon = document.querySelector('[data-ref="colorTypeIcon"]');
        if (triggerText && triggerIcon) {
            triggerText.textContent = btn.querySelector('.component-menu-link-text span').textContent.trim();
            triggerIcon.textContent = type === 'solid' ? 'circle' : 'pie_chart';
        }
        const gradContainer = document.querySelector('[data-ref="gradientMasterContainer"]');
        const solidContainer = document.querySelector('[data-ref="solidMasterContainer"]');
        if (type === 'solid') {
            if (gradContainer) gradContainer.classList.add('disabled');
            if (solidContainer) solidContainer.classList.remove('disabled');
            const sContainer = document.querySelector('[data-ref="solidColorContainer"]');
            if (sContainer && sContainer.children.length === 0) {
                this.addColorBlock('solidColorContainer', '#808080', null, true);
            }
        } else {
            if (gradContainer) gradContainer.classList.remove('disabled');
            if (solidContainer) solidContainer.classList.add('disabled');
            const gContainer = document.querySelector('[data-ref="gradientColorsContainer"]');
            if (gContainer && gContainer.children.length === 0) {
                this.addColorBlock('gradientColorsContainer', '#d32029', null, false);
                this.addColorBlock('gradientColorsContainer', '#206bd3', null, false);
            }
        }
        const currentModule = btn.closest('.component-module');
        if (currentModule) {
            currentModule.classList.add('disabled');
            const allLinks = currentModule.querySelectorAll('.component-menu-link');
            allLinks.forEach(l => l.classList.remove('active'));
            btn.classList.add('active');
        }
        this.updateLivePreview();
        this.checkMaxColorsLimit();
    }
    handleSetGradientAngle(btn) {
        const angle = parseInt(btn.dataset.value, 10);
        const trigger = document.querySelector('[data-ref="gradientAngleTrigger"]');
        const triggerText = document.querySelector('[data-ref="gradientAngleText"]');
        if (trigger && triggerText) {
            trigger.dataset.value = angle;
            triggerText.textContent = `${angle}°`;
        }
        const currentModule = btn.closest('.component-module');
        if (currentModule) {
            currentModule.classList.add('disabled');
            const allLinks = currentModule.querySelectorAll('.component-menu-link');
            allLinks.forEach(l => l.classList.remove('active'));
            btn.classList.add('active');
        }
        this.updateLivePreview();
    }
    handleAdjustConfig(btn) {
        const field = btn.dataset.field;
        const isDecimal = btn.dataset.decimal === 'true';
        const step = isDecimal ? parseFloat(btn.dataset.step) : parseInt(btn.dataset.step, 10);
        const min = btn.dataset.min !== undefined ? parseFloat(btn.dataset.min) : -999999;
        const max = btn.dataset.max !== undefined ? parseFloat(btn.dataset.max) : 999999;
        
        const center = document.querySelector(`[data-ref="val_${field}"]`);
        if (!center) return;
        
        let currentVal = isDecimal ? parseFloat(center.dataset.value || 0) : parseInt(center.dataset.value || 0, 10);
        let newVal = currentVal + step;
        
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;
        
        if (isDecimal) {
            newVal = Math.round(newVal * 100) / 100;
            center.dataset.value = newVal;
            center.textContent = newVal.toFixed(2);
        } else {
            center.dataset.value = newVal;
            if (newVal === -1 && (field === 'featMaxCanvases' || field === 'featMaxSnapshots')) {
                center.textContent = '∞';
            } else {
                center.textContent = newVal;
            }
        }
    }
    handleAdjustColorStop(btn) {
        const step = parseInt(btn.dataset.step, 10);
        const rows = Array.from(document.querySelectorAll('[data-ref="gradientColorsContainer"] [data-component="color-block"]'));
        const targetRow = btn.closest('[data-component="color-block"]');
        const index = rows.indexOf(targetRow);
        if (rows.length <= 1) return;
        let currentVals = rows.map(r => parseInt(r.querySelector('[data-ref="percentageCenter"]').dataset.value, 10) || 0);
        let targetVal = Math.max(0, Math.min(100, currentVals[index] + step));
        const actualDelta = targetVal - currentVals[index];
        if (actualDelta === 0) return;
        let remainingToDistribute = -actualDelta;
        let otherIndices = currentVals.map((_, i) => i).filter(i => i !== index);
        let iterations = 0;
        while (Math.abs(remainingToDistribute) > 0 && otherIndices.length > 0 && iterations < 10) {
            let share = Math.sign(remainingToDistribute) * Math.ceil(Math.abs(remainingToDistribute) / otherIndices.length);
            let nextIndices = [];
            for (let i of otherIndices) {
                if (remainingToDistribute === 0) break;
                let apply = share;
                if (Math.abs(apply) > Math.abs(remainingToDistribute)) apply = remainingToDistribute;
                let newVal = currentVals[i] + apply;
                if (newVal < 0) { apply = -currentVals[i]; newVal = 0; } 
                else if (newVal > 100) { apply = 100 - currentVals[i]; newVal = 100; } 
                else { nextIndices.push(i); }
                currentVals[i] += apply;
                remainingToDistribute -= apply;
            }
            otherIndices = nextIndices;
            iterations++;
        }
        if (remainingToDistribute !== 0) currentVals[index] += remainingToDistribute; 
        else currentVals[index] = targetVal;
        rows.forEach((r, i) => {
            const center = r.querySelector('[data-ref="percentageCenter"]');
            const display = r.querySelector('[data-ref="stopValueDisplay"]');
            center.dataset.value = currentVals[i];
            display.textContent = currentVals[i];
        });
        this.updateLivePreview();
    }

    detectModeAndLoad() {
        const wrapper = document.querySelector('[data-ref="admin-subscriptions-wrapper"]');
        if (wrapper) {
            const uuid = (wrapper.dataset.tierUuid || '').trim();
            this.tierId = uuid !== '' ? uuid : null;
            this.isEditing = uuid !== '';
            this.isSystemTier = false;
        }
        
        if (this.isEditing) {
            const btnGradientTrigger = document.querySelector('[data-ref="gradientAngleTrigger"]');
            if (btnGradientTrigger) {
                this.currentColorType = btnGradientTrigger.closest('[data-ref="gradientMasterContainer"]').classList.contains('disabled') ? 'solid' : 'gradient';
            }
        }

        this.initBenefitsLists();
        this.updateLivePreview();
        this.checkMaxColorsLimit();
        this.updateLimitsVisibility();
    }
    handleGlobalChange(e) {
        const checkbox = e.target.closest('input[type="checkbox"][data-ref="feature-toggle"]');
        if (checkbox) {
            this.updateLimitsVisibility();
        }
    }
    updateLimitsVisibility() {
        const customPalettesActive = document.querySelector('input[data-key="feat_custom_palettes"]')?.checked;
        const injectTemplatesActive = document.querySelector('input[data-key="feat_inject_templates"]')?.checked;

        document.querySelectorAll('.component-group-item[data-requires-feature="feat_custom_palettes"]').forEach(el => {
            if (customPalettesActive) {
                el.classList.remove('disabled', 'disabled-interaction');
                el.style.opacity = '';
            } else {
                el.classList.add('disabled', 'disabled-interaction');
                el.style.opacity = '0.5';
                const inputVal = el.querySelector('[data-ref="val_featMaxCustomPalettes"]');
                if (inputVal) {
                    inputVal.dataset.value = 0;
                    inputVal.textContent = 0;
                }
            }
        });

        document.querySelectorAll('.component-group-item[data-requires-feature="feat_inject_templates"]').forEach(el => {
            if (injectTemplatesActive) {
                el.classList.remove('disabled', 'disabled-interaction');
                el.style.opacity = '';
            } else {
                el.classList.add('disabled', 'disabled-interaction');
                el.style.opacity = '0.5';
                const inputVal = el.querySelector('[data-ref="val_featMaxTemplateTokens"]');
                if (inputVal) {
                    inputVal.dataset.value = 0;
                    inputVal.textContent = 0;
                }
            }
        });
    }
    
    initBenefitsLists() {
        const data1 = document.getElementById('benefitsList1Data');
        const data2 = document.getElementById('benefitsList2Data');
        
        if (data1 && data1.value) {
            try {
                const list1 = JSON.parse(data1.value);
                list1.forEach(item => this.renderBenefitRow(1, item));
            } catch (e) {  }
        }
        
        if (data2 && data2.value) {
            try {
                const list2 = JSON.parse(data2.value);
                list2.forEach(item => this.renderBenefitRow(2, item));
            } catch (e) {  }
        }
    }
    
    handleAddBenefit(btn) {
        const listNum = btn.dataset.list;
        this.renderBenefitRow(listNum, {icon: 'check', title_key: '', desc_key: ''});
    }
    
    handleRemoveBenefit(btn) {
        const row = btn.closest('.benefit-row');
        if (row) row.remove();
    }
    
    renderBenefitRow(listNum, data) {
        const container = document.getElementById(`benefitsList2Container`.replace('2', listNum));
        if (!container) return;
        
        const html = `
            <div class="component-group-item component-group-item--stacked benefit-row">
                <div>
                    <div class="component-input-group component-input-group--h34">
                        <input type="text" class="component-input-field component-input-field--simple b-icon" placeholder="Icon" value="${data.icon || 'check'}" title="Material Symbol (ej. check, palette, stars)">
                    </div>
                    <div>
                        <div class="component-input-group component-input-group--h34">
                            <input type="text" class="component-input-field component-input-field--simple b-title" placeholder="${window.__('placeholder_title_key')}" value="${data.title_key || ''}">
                        </div>
                        <div class="component-input-group component-input-group--h34">
                            <input type="text" class="component-input-field component-input-field--simple b-desc" placeholder="${window.__('placeholder_desc_key')}" value="${data.desc_key || ''}">
                        </div>
                    </div>
                    <button type="button" class="component-button component-button--icon component-button--h34" data-action="removeBenefit">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            </div>
        `;
        
        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        container.appendChild(temp.firstElementChild);
    }

    checkMaxColorsLimit() {
        const rows = document.querySelectorAll('[data-ref="gradientColorsContainer"] [data-component="color-block"]');
        const addBtnWrapper = document.querySelector('[data-ref="btnAddGradientColorWrapper"]');
        if (addBtnWrapper) {
            if (rows.length >= 12) addBtnWrapper.classList.add('disabled');
            else addBtnWrapper.classList.remove('disabled');
        }
    }
    addColorBlock(containerRef, hex = '#000000', percentage = null, isSolid = false) {
        const container = document.querySelector(`[data-ref="${containerRef}"]`);
        if (!container) return;
        if (!isSolid) {
            const rows = container.querySelectorAll('[data-component="color-block"]');
            if (rows.length >= 12) return; 
        } else {
            container.innerHTML = ''; 
        }
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.getColorBlockTemplate().trim();
        const block = tempDiv.firstElementChild;
        if (isSolid) {
            const controlsContainer = block.querySelector('[data-ref="controlsContainer"]');
            if (controlsContainer) controlsContainer.classList.add('disabled');
            const titleText = block.querySelector('[data-ref="blockTitle"]');
            const descText = block.querySelector('[data-ref="blockDesc"]');
            if (titleText) titleText.textContent = _t('admin_solid_color_title', 'Color Principal');
            if (descText) descText.textContent = window.__('admin_solid_color_desc');
        } else {
            const actualPercentage = percentage !== null ? percentage : 0;
            const pCenter = block.querySelector('[data-ref="percentageCenter"]');
            const pDisplay = block.querySelector('[data-ref="stopValueDisplay"]');
            if(pCenter && pDisplay) {
                pCenter.dataset.value = actualPercentage;
                pDisplay.textContent = actualPercentage;
            }
        }
        const hsv = hexToHsv(hex);
        const picker = block.querySelector('[data-ref="customColorPicker"]');
        picker.dataset.h = hsv.h;
        picker.dataset.s = hsv.s;
        picker.dataset.v = hsv.v;
        container.appendChild(block);
        this.updatePickerUI(container.lastElementChild.querySelector('[data-ref="customColorPicker"]'));
        if (!isSolid && percentage === null) this.autoDistributeStops();
        this.checkMaxColorsLimit();
        if(!isSolid && percentage === null) this.updateLivePreview();
    }
    autoDistributeStops() {
        const rows = Array.from(document.querySelectorAll('[data-ref="gradientColorsContainer"] [data-component="color-block"]'));
        const count = rows.length;
        if (count === 0) return;
        let base = Math.floor(100 / count);
        let remainder = 100 % count;
        rows.forEach((row, index) => {
            let val = base + (index < remainder ? 1 : 0);
            const center = row.querySelector('[data-ref="percentageCenter"]');
            const display = row.querySelector('[data-ref="stopValueDisplay"]');
            if (center && display) {
                center.dataset.value = val;
                display.textContent = val;
            }
        });
    }
    updateLivePreview() {
        const ring = document.querySelector('[data-ref="roleLivePreviewRing"]');
        if (!ring) return;
        if (this.currentColorType === 'solid') {
            const container = document.querySelector('[data-ref="solidColorContainer"]');
            const hexText = container?.querySelector('[data-ref="triggerHex"]');
            ring.style.background = hexText ? hexText.textContent : '#808080';
        } else {
            const angleTrigger = document.querySelector('[data-ref="gradientAngleTrigger"]');
            const angle = parseInt(angleTrigger ? angleTrigger.dataset.value : 0, 10);
            const rows = Array.from(document.querySelectorAll('[data-ref="gradientColorsContainer"] [data-component="color-block"]'));
            if (rows.length < 2) return;
            let prevStop = 0;
            let segments = rows.map((row) => {
                let hexText = row.querySelector('[data-ref="triggerHex"]')?.textContent || '#808080';
                let center = row.querySelector('[data-ref="percentageCenter"]');
                let percentage = parseInt(center?.dataset.value || 0, 10);
                let endStop = prevStop + percentage;
                let segment = `${hexText} ${prevStop}% ${endStop}%`;
                prevStop = endStop;
                return segment;
            });
            ring.style.background = `conic-gradient(from ${angle}deg, ${segments.join(', ')})`;
        }
    }
    extractTierColorPayload() {
        const solidContainer = document.querySelector('[data-ref="solidColorContainer"]');
        const gradientContainer = document.querySelector('[data-ref="gradientColorsContainer"]');
        if (!solidContainer && !gradientContainer) {
            return null;
        }

        const angleTrigger = document.querySelector('[data-ref="gradientAngleTrigger"]');
        const angle = parseInt(angleTrigger ? angleTrigger.dataset.value : 0, 10);
        let colors = [];
        if (this.currentColorType === 'solid') {
            const hexText = solidContainer?.querySelector('[data-ref="triggerHex"]');
            colors = [{ hex: hexText ? hexText.textContent : '#808080', percentage: 100 }];
        } else {
            const rows = document.querySelectorAll('[data-ref="gradientColorsContainer"] [data-component="color-block"]');
            Array.from(rows).forEach(row => {
                const hexText = row.querySelector('[data-ref="triggerHex"]');
                const center = row.querySelector('[data-ref="percentageCenter"]');
                colors.push({
                    hex: hexText ? hexText.textContent : '#808080',
                    percentage: parseInt(center ? center.dataset.value : 0, 10)
                });
            });
        }
        return { color_type: this.currentColorType, angle: angle, colors: colors };
    }
    extractFeaturesPayload() {
        const payload = {
            price_monthly: parseFloat(document.querySelector('[data-ref="val_priceMonthly"]')?.dataset.value || 0),
            price_yearly: parseFloat(document.querySelector('[data-ref="val_priceYearly"]')?.dataset.value || 0),
            limits: {
                max_canvases: parseInt(document.querySelector('[data-ref="val_featMaxCanvases"]')?.dataset.value || 0, 10),
                max_storage_mb: parseInt(document.querySelector('[data-ref="val_featMaxStorage"]')?.dataset.value || 0, 10),
                max_upload_mb: parseInt(document.querySelector('[data-ref="val_featMaxUpload"]')?.dataset.value || 10, 10),
                max_snapshots_per_canvas: parseInt(document.querySelector('[data-ref="val_featMaxSnapshots"]')?.dataset.value || 0, 10),
                max_members_per_canvas: parseInt(document.querySelector('[data-ref="val_featMaxMembers"]')?.dataset.value || 0, 10),
                max_custom_palettes: parseInt(document.querySelector('[data-ref="val_featMaxCustomPalettes"]')?.dataset.value || 0, 10),
                max_template_tokens: parseInt(document.querySelector('[data-ref="val_featMaxTemplateTokens"]')?.dataset.value || 0, 10),
                max_pixels_per_batch: parseInt(document.querySelector('[data-ref="val_featMaxPixelsPerBatch"]')?.dataset.value || 5, 10)
            }
        };
        
        document.querySelectorAll('input[type="checkbox"][data-ref="feature-toggle"]').forEach(checkbox => {
            if (checkbox.dataset.key) {
                payload[checkbox.dataset.key] = checkbox.checked;
            }
        });

        return payload;
    }

    async saveTier(btn) {
        const tierName = document.querySelector('[data-ref="input-tier-name"]')?.value.trim();
        const tierLevel = document.querySelector('[data-ref="val_tierLevel"]')?.dataset.value;
        const toggleActive = document.querySelector('[data-ref="toggle-active"]');
        const isActive = toggleActive ? (toggleActive.checked ? 1 : 0) : 1;
        
        const stripeMonthly = document.querySelector('[data-ref="input-stripe-monthly"]')?.value.trim();
        const stripeYearly = document.querySelector('[data-ref="input-stripe-yearly"]')?.value.trim();
        
        if (!tierName || tierLevel === undefined || tierLevel === null) {
            showMessage(window.__("admin_tier_name_level_required"), "warning");
            return;
        }

        if (!stripeMonthly || !stripeYearly) {
            showMessage(_t('admin_stripe_ids_required', "Los identificadores de Stripe (Mensual y Anual) son obligatorios."), "warning");
            return;
        }

        const featuresPayload = this.extractFeaturesPayload();
        
        const hasFeature = Object.keys(featuresPayload).some(key => {
            if (['price_monthly', 'price_yearly', 'limits'].includes(key)) return false;
            return featuresPayload[key] === true;
        });

        const hasNumericLimits = featuresPayload.limits && Object.values(featuresPayload.limits).some(val => val !== undefined && val !== null && !isNaN(val) && val !== 0);

        if (!hasFeature && !hasNumericLimits) {
            showMessage(window.__("admin_tier_features_limit_required"), "warning");
            return;
        }

        setButtonLoading(btn);
        
        const colorData = this.extractTierColorPayload();

        const payload = {
            uuid: this.tierId,
            name: tierName,
            tier_level: parseInt(tierLevel, 10),
            is_active: isActive,
            color: colorData,
            stripe_price_id_monthly: stripeMonthly,
            stripe_price_id_yearly: stripeYearly,
            features: featuresPayload
        };

        const res = await this.api.post(ApiRoutes.Admin.SaveTier, payload, this.abortController.signal);

        if (res.aborted) return;
        restoreButton(btn);

        if (res.success) {
            showMessage(res.message, 'success');
            setTimeout(() => this.goBack(), 1500);
        } else {
            showMessage(res.message || window.__('err_default'), 'error');
        }
    }

    goBack() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/subscriptions`);
        } else {
            window.location.href = `${this.basePath}/admin/subscriptions`;
        }
    }
}
export { AdminSubscriptionBuilderController };