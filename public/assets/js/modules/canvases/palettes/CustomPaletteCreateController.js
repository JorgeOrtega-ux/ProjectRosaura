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

class CustomPaletteCreateController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 

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
        if (e.detail.url.includes('/canvases/palettes/create')) {
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
                            <h2 class="component-card__title" data-ref="blockTitle">${_t('admin_role_hue_adjust')}</h2>
                            <p class="component-card__description" data-ref="blockDesc">${_t('admin_role_hue_adjust_desc')}</p>
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
                                            <div class="component-color-swatch component-color-swatch--sm" data-ref="hexInputPreview"></div>
                                            <input type="text" class="component-input-field component-input-field--mono" data-ref="hexInput" value="#808080" readonly>
                                        </div>
                                        <div class="component-color-picker__controls" data-ref="controlsContainer">
                                            <button type="button" class="component-button component-button--icon component-button--h40 btn-delete-color" data-action="removeColor" data-ref="deleteBtn">
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

    handleGlobalClick(e) {
        if (e.target.closest('[data-action="savePaletteData"]')) {
            this.savePalette(e.target.closest('[data-action="savePaletteData"]'));
        }

        if (e.target.closest('[data-action="applyPaletteName"]')) {
            this.handleApplyPaletteName(e.target.closest('[data-action="applyPaletteName"]'));
        }

        if (e.target.closest('[data-action="goBack"]')) {
            this.goBack();
        }

        const addColorBtn = e.target.closest('[data-action="addColor"]');
        const removeColorBtn = e.target.closest('[data-action="removeColor"]');
        
        if (addColorBtn) {
            this.addColorBlock('paletteColorsContainer', '#000000'); 
        }
        
        if (removeColorBtn) {
            removeColorBtn.closest('[data-component="color-block"]').remove();
            this.updateLivePreview();
            this.checkMaxColorsLimit();
        }
    }

    handleApplyPaletteName(btn) {
        const input = document.querySelector('[data-ref="paletteNameInput"]');
        const display = document.querySelector('[data-ref="display-palette-name"]');
        if (input && display) display.textContent = input.value.trim() || _t('canvas_palette_new');

        if (window.appInstance) {
            window.appInstance.toggleEditState('palette-name');
        }
    }

    detectModeAndLoad() {
        const view = document.querySelector('[data-ref="customPaletteBuilderView"]');
        if (!view) return;

        const gContainer = document.querySelector('[data-ref="paletteColorsContainer"]');
        if (gContainer && gContainer.children.length === 0) {
            this.addColorBlock('paletteColorsContainer', '#d32029');
            this.addColorBlock('paletteColorsContainer', '#206bd3');
            this.addColorBlock('paletteColorsContainer', '#3eb352');
            this.addColorBlock('paletteColorsContainer', '#ff8c00');
        }

        this.updateLivePreview();
        this.checkMaxColorsLimit();
    }

    checkMaxColorsLimit() {
        const rows = document.querySelectorAll('[data-ref="paletteColorsContainer"] [data-component="color-block"]');
        const addBtnWrapper = document.querySelector('[data-ref="btnAddColorWrapper"]');
        if (addBtnWrapper) {
            if (rows.length >= 36) addBtnWrapper.classList.add('disabled');
            else addBtnWrapper.classList.remove('disabled');
        }
    }

    addColorBlock(containerRef, hex = '#000000') {
        const container = document.querySelector(`[data-ref="${containerRef}"]`);
        if (!container) return;

        const rows = container.querySelectorAll('[data-component="color-block"]');
        if (rows.length >= 36) return; 

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.getColorBlockTemplate().trim();
        const block = tempDiv.firstElementChild;

        const hsv = this.hexToHsv(hex);
        const picker = block.querySelector('[data-ref="customColorPicker"]');
        picker.dataset.h = hsv.h;
        picker.dataset.s = hsv.s;
        picker.dataset.v = hsv.v;

        container.appendChild(block);
        this.updatePickerUI(container.lastElementChild.querySelector('[data-ref="customColorPicker"]'));

        this.checkMaxColorsLimit();
        this.updateLivePreview();
    }

    updateLivePreview() {
        const ring = document.querySelector('[data-ref="paletteLivePreviewRing"]');
        if (!ring) return;

        const rows = Array.from(document.querySelectorAll('[data-ref="paletteColorsContainer"] [data-component="color-block"]'));
        if (rows.length === 0) {
            ring.style.background = '#808080';
            return;
        }

        if (rows.length === 1) {
            let hexText = rows[0].querySelector('[data-ref="triggerHex"]')?.textContent || '#808080';
            ring.style.background = hexText;
            return;
        }

        let base = Math.floor(100 / rows.length);
        let remainder = 100 % rows.length;
        
        let prevStop = 0;
        let segments = rows.map((row, index) => {
            let hexText = row.querySelector('[data-ref="triggerHex"]')?.textContent || '#808080';
            let percentage = base + (index < remainder ? 1 : 0);
            
            let endStop = prevStop + percentage;
            let segment = `${hexText} ${prevStop}% ${endStop}%`;
            prevStop = endStop;
            return segment;
        });
        
        ring.style.background = `conic-gradient(from 0deg, ${segments.join(', ')})`;
    }

    extractColors() {
        let colors = [];
        const rows = document.querySelectorAll('[data-ref="paletteColorsContainer"] [data-component="color-block"]');
        Array.from(rows).forEach(row => {
            const hexText = row.querySelector('[data-ref="triggerHex"]');
            colors.push(hexText ? hexText.textContent : '#808080');
        });
        return colors;
    }

    async savePalette(btn) {
        const nameInput = document.querySelector('[data-ref="paletteNameInput"]');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) {
            showMessage(_t('msg_palette_name_required'), 'error');
            return;
        }

        const colors = this.extractColors();

        if (colors.length < 4) {
            showMessage(_t('msg_palette_min_colors'), 'error');
            return;
        }

        setButtonLoading(btn);
        
        const payload = {
            name: name,
            colors: colors
        };

        const route = ApiRoutes.Canvases.CreateCustomPalette;
        const res = await this.api.post(route, payload, this.abortController.signal);
        
        if (res.aborted) return;
        
        restoreButton(btn);

        if (res.success) {
            showMessage(_t('msg_palette_created'), 'success');
            
            if (!window.APP_CUSTOM_PALETTES) window.APP_CUSTOM_PALETTES = [];
            window.APP_CUSTOM_PALETTES.push({
                palette_key: res.data.palette_key,
                name: name,
                colors: colors
            });
            
            this.goBack();
        } else {
            showMessage(res.message || _t('err_default'), 'error');
        }
    }
    
    goBack() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/canvases/create`);
        } else {
            window.location.href = `${this.basePath}/canvases/create`;
        }
    }
}

export { CustomPaletteCreateController };
