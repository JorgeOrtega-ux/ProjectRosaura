// public/assets/js/modules/admin/roles/AdminRoleBuilderController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { setButtonLoading, restoreButton, showMessage } from '../../../core/utils/uiUtils.js';

const _t = (key, fallback) => {
    if (typeof window.__ === 'function') {
        const trans = window.__(key);
        if (trans && trans !== key) return trans;
    }
    return fallback;
};

class AdminRoleBuilderController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 
        
        this.roleId = null; 
        this.isEditing = false;
        this.isSystemRole = false; 
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
        
        this.isInitialized = false;
        this.currentUserWeight = 0;
        this.isSystemRole = false;
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
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/roles/create') || e.detail.url.includes('/admin/roles/edit')) {
            this.detectModeAndLoad();
        }
    }

    /* -----------------------------------------------------------
       PLANTILLA HTML DEL BLOQUE 
    ----------------------------------------------------------- */
    getColorBlockTemplate() {
        const uniqueId = 'cp_' + Math.random().toString(36).substr(2, 9);
        return `
            <div class="component-color-row" data-component="color-block">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title" data-ref="blockTitle">${_t('admin_role_hue_adjust', 'Ajuste de Tono')}</h2>
                            <p class="component-card__description" data-ref="blockDesc">${_t('admin_role_hue_adjust_desc', 'Configura el tono y proporción de este bloque.')}</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--color" data-ref="dropdownWrapper">
                            <div class="component-dropdown-trigger component-dropdown-trigger--color" data-action="toggleModule" data-target="${uniqueId}">
                                <div class="component-dropdown-trigger__left">
                                    <div class="component-color-swatch" data-ref="triggerPreview"></div>
                                    <span class="component-dropdown-text component-text--mono" data-ref="triggerHex">#808080</span>
                                </div>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="${uniqueId}" data-ref="componentModule">
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
                                            <div class="component-color-swatch" data-ref="hexInputPreview" style="width: 20px; height: 20px; flex-shrink: 0;"></div>
                                            <input type="text" class="component-input-field component-input-field--mono" data-ref="hexInput" value="#808080" readonly>
                                        </div>
                                        <div class="component-color-picker__controls" data-ref="controlsContainer">
                                            <div class="component-inline-control component-inline-control--fixed component-color-picker__percentage" data-ref="percentageControl">
                                                <div class="component-inline-control__group">
                                                    <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                                    <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-5"><span class="material-symbols-rounded">chevron_left</span></button>
                                                </div>
                                                <div class="component-inline-control__center" data-val="100" data-ref="percentageCenter">
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

    /* -----------------------------------------------------------
       LÓGICA DE DRAG & DROP PARA COLOR PICKER
    ----------------------------------------------------------- */
    getEventCoords(e) {
        if (e.touches && e.touches.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        return { clientX: e.clientX, clientY: e.clientY };
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
        const coords = this.getEventCoords(e);
        
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

    /* -----------------------------------------------------------
       MATEMÁTICAS DEL COLOR Y ACTUALIZACIÓN UI
    ----------------------------------------------------------- */
    hexToHsv(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        let r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
        let g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
        let b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, v = max, d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max !== min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
    }

    hsvToHex(h, s, v) {
        h /= 360; s /= 100; v /= 100;
        let r, g, b;
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }

        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    updatePickerUI(pickerNode) {
        let h = Math.max(0, Math.min(360, parseFloat(pickerNode.dataset.h) || 0));
        let s = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.s) || 0));
        let v = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.v) || 0));

        const hex = this.hsvToHex(h, s, v);

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

    /* -----------------------------------------------------------
       EVENTOS GLOBALES DE CLIC Y UI
    ----------------------------------------------------------- */
    handleGlobalClick(e) {
        if (e.target.closest('[data-action="saveRoleData"]')) {
            this.saveRole(e.target.closest('[data-action="saveRoleData"]'));
        }

        if (e.target.closest('[data-action="applyRoleName"]')) {
            this.handleApplyRoleName(e.target.closest('[data-action="applyRoleName"]'));
        }

        const adjustWeightBtn = e.target.closest('[data-action="adjustWeight"]');
        if (adjustWeightBtn) this.handleAdjustWeight(adjustWeightBtn);

        const setColorTypeBtn = e.target.closest('[data-action="setColorType"]');
        if (setColorTypeBtn) this.handleSetColorType(setColorTypeBtn);

        const setAngleBtn = e.target.closest('[data-action="setGradientAngle"]');
        if (setAngleBtn) this.handleSetGradientAngle(setAngleBtn);

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
    }

    handleApplyRoleName(btn) {
        if (this.isSystemRole) return;

        const input = document.querySelector('[data-ref="roleNameInput"]');
        const display = document.querySelector('[data-ref="display-role-name"]');
        if (input && display) display.textContent = input.value.trim() || _t('admin_role_undefined', 'Sin definir');

        const viewState = document.querySelector('[data-state="role-name-view"]');
        const editState = document.querySelector('[data-state="role-name-edit"]');
        
        if (viewState && editState) {
            // FIX: Restablecer correctamente las clases de Flexbox
            editState.classList.remove('active');
            editState.classList.add('disabled');
            
            viewState.classList.remove('disabled');
            viewState.classList.add('active'); // Vital para activar el display: flex
        }
    }

    handleAdjustWeight(btn) {
        if (this.isSystemRole) return;

        const step = parseInt(btn.dataset.step, 10);
        const display = document.querySelector('[data-ref="val_role_weight"]');
        
        if (!display) return;
        
        // FIX: Si el DOM no pasó el peso (0), asumimos que es nivel máximo 
        // para que la interfaz no se trabe en 1 permitiendo seguir operando.
        const safeWeight = this.currentUserWeight > 0 ? this.currentUserWeight : 100;
        
        const min = 1;
        const dynamicMax = safeWeight === 100 ? 100 : Math.max(1, safeWeight - 1);
        
        let currentVal = parseInt(display.dataset.val, 10) || 1;
        let newVal = currentVal + step;

        if (newVal < min) newVal = min;
        if (newVal > dynamicMax) newVal = dynamicMax;

        display.dataset.val = newVal;
        display.textContent = newVal;
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
            trigger.dataset.val = angle;
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

    handleAdjustColorStop(btn) {
        const step = parseInt(btn.dataset.step, 10);
        const rows = Array.from(document.querySelectorAll('[data-ref="gradientColorsContainer"] [data-component="color-block"]'));
        const targetRow = btn.closest('[data-component="color-block"]');
        const index = rows.indexOf(targetRow);

        if (rows.length <= 1) return;

        let currentVals = rows.map(r => parseInt(r.querySelector('[data-ref="percentageCenter"]').dataset.val, 10) || 0);
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
            center.dataset.val = currentVals[i];
            display.textContent = currentVals[i];
        });

        this.updateLivePreview();
    }

    /* -----------------------------------------------------------
       LÓGICA LIMPIA. JAVASCRIPT LEE EL DOM YA RENDERIZADO POR PHP
    ----------------------------------------------------------- */
    detectModeAndLoad() {
        const view = document.querySelector('[data-ref="roleBuilderView"]');
        if (!view) return;

        const roleIdStr = view.getAttribute('data-role-id');
        this.currentColorType = view.getAttribute('data-color-type') || 'solid';
        
        this.currentUserWeight = parseInt(view.getAttribute('data-current-user-weight') || 0, 10);
        
        const isSystemStr = view.getAttribute('data-is-system');
        this.isSystemRole = parseInt(isSystemStr, 10) === 1;
        
        const roleId = parseInt(roleIdStr, 10) || 0;
        
        if (roleId > 0) {
            this.isEditing = true;
            this.roleId = roleId;
        } else {
            this.isEditing = false;
            this.roleId = null;
        }

        this.updateLivePreview();
        this.checkMaxColorsLimit();
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
            if (titleText) titleText.textContent = _t('admin_role_color_title', 'Color del Identificador');
            if (descText) descText.textContent = _t('admin_role_color_desc', 'Selecciona el color base para este rol.');
        } else {
            const actualPercentage = percentage !== null ? percentage : 0;
            const pCenter = block.querySelector('[data-ref="percentageCenter"]');
            const pDisplay = block.querySelector('[data-ref="stopValueDisplay"]');
            if(pCenter && pDisplay) {
                pCenter.dataset.val = actualPercentage;
                pDisplay.textContent = actualPercentage;
            }
        }

        const hsv = this.hexToHsv(hex);
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
                center.dataset.val = val;
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
            const angle = parseInt(angleTrigger ? angleTrigger.dataset.val : 0, 10);
            
            const rows = Array.from(document.querySelectorAll('[data-ref="gradientColorsContainer"] [data-component="color-block"]'));
            if (rows.length < 2) return;

            let prevStop = 0;
            let segments = rows.map((row) => {
                let hexText = row.querySelector('[data-ref="triggerHex"]')?.textContent || '#808080';
                let center = row.querySelector('[data-ref="percentageCenter"]');
                let percentage = parseInt(center?.dataset.val || 0, 10);
                
                let endStop = prevStop + percentage;
                let segment = `${hexText} ${prevStop}% ${endStop}%`;
                prevStop = endStop;
                return segment;
            });
            
            ring.style.background = `conic-gradient(from ${angle}deg, ${segments.join(', ')})`;
        }
    }

    extractRoleColorPayload() {
        const angleTrigger = document.querySelector('[data-ref="gradientAngleTrigger"]');
        const angle = parseInt(angleTrigger ? angleTrigger.dataset.val : 0, 10);
        let colors = [];

        if (this.currentColorType === 'solid') {
            const container = document.querySelector('[data-ref="solidColorContainer"]');
            const hexText = container?.querySelector('[data-ref="triggerHex"]');
            colors = [{ hex: hexText ? hexText.textContent : '#808080', percentage: 100 }];
        } else {
            const rows = document.querySelectorAll('[data-ref="gradientColorsContainer"] [data-component="color-block"]');
            Array.from(rows).forEach(row => {
                const hexText = row.querySelector('[data-ref="triggerHex"]');
                const center = row.querySelector('[data-ref="percentageCenter"]');
                colors.push({
                    hex: hexText ? hexText.textContent : '#808080',
                    percentage: parseInt(center ? center.dataset.val : 0, 10)
                });
            });
        }
        return { color_type: this.currentColorType, angle: angle, colors: colors };
    }

    async saveRole(btn) {
        const nameInput = document.querySelector('[data-ref="roleNameInput"]');
        const weightDisplay = document.querySelector('[data-ref="val_role_weight"]');
        
        const roleName = nameInput ? nameInput.value.trim() : '';
        const roleWeight = weightDisplay ? parseInt(weightDisplay.dataset.val, 10) : 1;

        if (!roleName && !this.isSystemRole) {
            showMessage(_t('admin_role_err_name_req', 'El nombre del rol es obligatorio'), 'error');
            return;
        }

        setButtonLoading(btn);

        const colorPayload = this.extractRoleColorPayload();
        
        const payload = {
            name: roleName,
            weight: roleWeight,
            ...colorPayload
        };

        let route = ApiRoutes.Admin.CreateRole;
        if (this.isEditing) {
            route = ApiRoutes.Admin.EditRole;
            payload.id = this.roleId;
        }
        
        const res = await this.api.post(route, payload, this.abortController.signal);
        
        if (res.aborted) return;
        
        restoreButton(btn);

        if (res.success) {
            showMessage(_t('admin_role_save_success', 'Rol guardado exitosamente'), 'success');
            this.goBack();
        } else {
            showMessage(_t('msg_error_prefix', 'Error: ') + res.message_key, 'error');
        }
    }
    
    goBack() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/manage-roles`);
        } else {
            window.location.href = `${this.basePath}/admin/manage-roles`;
        }
    }
}

export { AdminRoleBuilderController };