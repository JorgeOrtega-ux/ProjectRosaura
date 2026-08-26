import { showMessage, hsvToHex, getEventCoords } from '../../../../core/utils/uiUtils.js';
import { abgrToHex } from './InteractionHelpers.js';
import { generateColorRamp, HUE_SHIFT_PRESETS } from '../utils/HueShiftUtils.js';

export const InteractionHistoryColors = {
    activeRampPreset: 'warm_cool',

    undo() {
        if (!this.isOfflineMode || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        if (this.renderWorker) {
            this.renderWorker.postMessage({ type: 'UNDO' });
        } else if (this.offscreenCtx && this.undoStack && this.undoStack.length > 0) {
            const action = this.undoStack.pop();
            const diffs = action.diffs;
            if (!this.redoStack) this.redoStack = [];
            for (let i = 0; i < diffs.length; i++) {
                const d = diffs[i];
                if (d.prev === 0) {
                    this.offscreenCtx.clearRect(d.x, d.y, 1, 1);
                } else {
                    const hex = abgrToHex(d.prev);
                    this.offscreenCtx.fillStyle = hex;
                    this.offscreenCtx.clearRect(d.x, d.y, 1, 1);
                    this.offscreenCtx.fillRect(d.x, d.y, 1, 1);
                }
            }
            this.redoStack.push(action);
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
            if (typeof showMessage === 'function') showMessage(window.__('msg_undo') || 'Acción deshecha', 'info');
        }
    },

    redo() {
        if (!this.isOfflineMode || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        if (this.renderWorker) {
            this.renderWorker.postMessage({ type: 'REDO' });
        } else if (this.offscreenCtx && this.redoStack && this.redoStack.length > 0) {
            const action = this.redoStack.pop();
            const diffs = action.diffs;
            if (!this.undoStack) this.undoStack = [];
            for (let i = 0; i < diffs.length; i++) {
                const d = diffs[i];
                if (d.next === 0) {
                    this.offscreenCtx.clearRect(d.x, d.y, 1, 1);
                } else {
                    const hex = abgrToHex(d.next);
                    this.offscreenCtx.fillStyle = hex;
                    this.offscreenCtx.clearRect(d.x, d.y, 1, 1);
                    this.offscreenCtx.fillRect(d.x, d.y, 1, 1);
                }
            }
            this.undoStack.push(action);
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
            if (typeof showMessage === 'function') showMessage(window.__('msg_redo') || 'Acción rehecha', 'info');
        }
    },

    getCustomColorsStorageKey() {
        const id = this.canvasId || this.canvasIntId || (typeof this.getCanvasId === 'function' ? this.getCanvasId() : null);
        return id ? `rosaura_custom_colors_${id}` : 'rosaura_offline_custom_colors';
    },

    loadCustomColors() {
        try {
            const key = this.getCustomColorsStorageKey();
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.slice(0, 18);
            }
        } catch (e) {
            console.warn('Failed to load custom colors from localStorage:', e);
        }
        return [];
    },

    saveCustomColors() {
        try {
            const key = this.getCustomColorsStorageKey();
            if (Array.isArray(this.customPickedColors)) {
                localStorage.setItem(key, JSON.stringify(this.customPickedColors.slice(0, 18)));
            }
        } catch (e) {
            console.warn('Failed to save custom colors to localStorage:', e);
        }
    },

    recordRecentColor(hex) {
        if (!this.isOfflineMode) return;
        if (!hex || typeof hex !== 'string') return;
        hex = hex.trim().toUpperCase();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9A-F]{6}$/i.test(hex) && !/^#[0-9A-F]{3}$/i.test(hex)) return;

        if (!Array.isArray(this.customPickedColors)) {
            this.customPickedColors = [];
        }

        const idx = this.customPickedColors.indexOf(hex);
        if (idx > -1) {
            this.customPickedColors.splice(idx, 1);
        }
        this.customPickedColors.unshift(hex);
        if (this.customPickedColors.length > 18) {
            this.customPickedColors = this.customPickedColors.slice(0, 18);
        }

        this.saveCustomColors();
        if (typeof this.renderCustomPickedColors === 'function') {
            this.renderCustomPickedColors();
        }
    },

    swapPrimarySecondaryColors() {
        const temp = this.primaryColor || '#000000';
        this.primaryColor = this.secondaryColor || '#FFFFFF';
        this.secondaryColor = temp;

        this.currentColor = (this.activeColorSlot === 'secondary') ? this.secondaryColor : this.primaryColor;

        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
        }

        this.updateDualColorSwatchesUI();
        this.updateActiveColorPreview();
        this.syncActiveColorHighlight();
        if (typeof this.renderShadingRamps === 'function') {
            this.renderShadingRamps(this.currentColor);
        }
        this.requestRender();

        if (typeof showMessage === 'function') {
            showMessage(`Colores intercambiados: ${this.currentColor}`, 'info');
        }
    },

    resetDefaultColors() {
        this.primaryColor = '#000000';
        this.secondaryColor = '#FFFFFF';
        this.currentColor = (this.activeColorSlot === 'secondary') ? this.secondaryColor : this.primaryColor;

        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
        }

        this.updateDualColorSwatchesUI();
        this.updateActiveColorPreview();
        this.syncActiveColorHighlight();
        if (typeof this.renderShadingRamps === 'function') {
            this.renderShadingRamps(this.currentColor);
        }
        this.requestRender();

        if (typeof showMessage === 'function') {
            showMessage('Colores restablecidos (Negro / Blanco)', 'info');
        }
    },

    selectActiveColorSlot(slot = 'primary') {
        this.activeColorSlot = slot;
        this.currentColor = (slot === 'secondary') ? (this.secondaryColor || '#FFFFFF') : (this.primaryColor || '#000000');

        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
        }

        this.updateDualColorSwatchesUI();
        this.updateActiveColorPreview();
        this.syncActiveColorHighlight();
        if (typeof this.renderShadingRamps === 'function') {
            this.renderShadingRamps(this.currentColor);
        }
        this.requestRender();
    },

    updateDualColorSwatchesUI() {
        const swatchPri = document.querySelector('[data-ref="swatch-primary"]');
        const swatchSec = document.querySelector('[data-ref="swatch-secondary"]');
        const dotPri = document.querySelector('[data-ref="swatch-primary-dot"]');
        const dotSec = document.querySelector('[data-ref="swatch-secondary-dot"]');
        const priColor = this.primaryColor || '#000000';
        const secColor = this.secondaryColor || '#FFFFFF';

        if (swatchPri) {
            swatchPri.style.setProperty('--slot-color', priColor);
            swatchPri.classList.toggle('active', this.activeColorSlot === 'primary');
        }
        if (dotPri) {
            dotPri.style.backgroundColor = priColor;
        }

        if (swatchSec) {
            swatchSec.style.setProperty('--slot-color', secColor);
            swatchSec.classList.toggle('active', this.activeColorSlot === 'secondary');
        }
        if (dotSec) {
            dotSec.style.backgroundColor = secColor;
        }
    },

    selectAndAddCustomColor(hex) {
        if (!hex || typeof hex !== 'string') return;
        hex = hex.trim().toUpperCase();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9A-F]{6}$/i.test(hex) && !/^#[0-9A-F]{3}$/i.test(hex)) return;

        this.recordRecentColor(hex);

        if (this.activeColorSlot === 'secondary') {
            this.secondaryColor = hex;
        } else {
            this.primaryColor = hex;
        }
        this.currentColor = hex;

        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
        }

        this.updateDualColorSwatchesUI();
        this.updateActiveColorPreview();
        this.syncActiveColorHighlight();
        if (typeof this.renderShadingRamps === 'function') {
            this.renderShadingRamps(this.currentColor);
        }
        this.requestRender();

        if (window.ModuleManager && typeof window.ModuleManager.close === 'function') {
            window.ModuleManager.close('moduleCustomColorPicker');
        }
    },

    renderShadingRamps(baseHex = null) {
        if (!this.isOfflineMode) return;
        const container = document.querySelector('[data-ref="color-ramp-swatches-container"]');
        const section = document.querySelector('[data-ref="shading-ramps-section"]');
        if (!container || !section) return;

        section.classList.remove('disabled');
        section.classList.add('active');

        const hex = (baseHex || this.currentColor || '#FF0000').toUpperCase();
        const ramp = generateColorRamp(hex, this.activeRampPreset || 'warm_cool');

        container.innerHTML = '';
        ramp.forEach(step => {
            const isActive = step.hex.toUpperCase() === (this.currentColor || '').toUpperCase();
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = `component-color-btn ${isActive ? 'active' : ''} ${step.isBase ? 'is-base' : ''}`;
            swatch.setAttribute('data-action', 'selectRampColor');
            swatch.setAttribute('data-color', step.hex);
            swatch.style.setProperty('--color-val', step.hex);
            swatch.style.setProperty('--adaptive-ring-color', step.hex);

            // Adaptive border for extreme colors
            const brightness = parseInt(step.hex.slice(1, 3), 16) * 0.299
                + parseInt(step.hex.slice(3, 5), 16) * 0.587
                + parseInt(step.hex.slice(5, 7), 16) * 0.114;
            if (brightness > 210) {
                swatch.classList.add('color-btn--extreme-light');
            } else if (brightness < 20) {
                swatch.classList.add('color-btn--extreme-dark');
            }

            const roleName = typeof window.__ === 'function' ? window.__(step.nameKey) : step.defaultLabel;
            swatch.setAttribute('data-tooltip', `${roleName}: ${step.hex}`);
            swatch.setAttribute('data-position', 'top');

            container.appendChild(swatch);
        });

        const iconRef = document.querySelector('[data-ref="ramp-preset-icon"]');
        const presetConfig = HUE_SHIFT_PRESETS[this.activeRampPreset] || HUE_SHIFT_PRESETS.warm_cool;
        if (iconRef && presetConfig) {
            iconRef.textContent = presetConfig.icon || 'wb_sunny';
        }
    },

    setRampPreset(presetKey) {
        if (!HUE_SHIFT_PRESETS[presetKey]) return;
        this.activeRampPreset = presetKey;
        const dropdown = document.querySelector('[data-ref="ramp-preset-dropdown"]');
        if (dropdown) {
            dropdown.querySelectorAll('[data-action="setRampPreset"]').forEach(link => {
                link.classList.toggle('active', link.getAttribute('data-preset') === presetKey);
            });
            if (window.ModuleManager && typeof window.ModuleManager.close === 'function') {
                window.ModuleManager.close('moduleRampPresetDropdown');
            }
        }
        this.renderShadingRamps(this.currentColor);
        const presetName = (typeof window.__ === 'function' ? window.__(HUE_SHIFT_PRESETS[presetKey].nameKey) : null) || HUE_SHIFT_PRESETS[presetKey].defaultName;
        if (typeof showMessage === 'function') {
            showMessage(`Iluminación: ${presetName}`, 'info');
        }
    },

    selectRampColor(hex) {
        if (!hex) return;
        this.currentColor = hex.toUpperCase();
        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
        }
        this.updateActiveColorPreview();
        this.syncActiveColorHighlight();
        this.renderShadingRamps(this.currentColor);

        const activeTpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
        if (activeTpl && activeTpl.isShape && typeof this.refreshShapeTemplateColor === 'function') {
            this.refreshShapeTemplateColor(activeTpl, this.currentColor);
        }

        this.requestRender();
    },

    stepColorRamp(direction = 1) {
        if (!this.isOfflineMode) return;
        const ramp = generateColorRamp(this.currentColor || '#FF0000', this.activeRampPreset || 'warm_cool');
        if (!ramp || ramp.length === 0) return;

        let curIdx = ramp.findIndex(s => s.hex.toUpperCase() === (this.currentColor || '').toUpperCase());
        if (curIdx === -1) {
            curIdx = 2; // base center
        }

        const nextIdx = Math.max(0, Math.min(ramp.length - 1, curIdx + direction));
        if (nextIdx === curIdx) return;

        const targetStep = ramp[nextIdx];
        this.selectRampColor(targetStep.hex);
        const roleName = (typeof window.__ === 'function' ? window.__(targetStep.nameKey) : null) || targetStep.defaultLabel;
        if (typeof showMessage === 'function') {
            showMessage(`Rampa [${roleName}]: ${targetStep.hex}`, 'info');
        }
    },

    updateCustomPickerUI(pickerNode) {
        if (!pickerNode) pickerNode = document.querySelector('[data-ref="customColorPicker"]');
        if (!pickerNode) return;

        let h = Math.max(0, Math.min(360, parseFloat(pickerNode.dataset.h) || 0));
        let s = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.s) || 0));
        let v = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.v) || 0));
        const hex = hsvToHex(h, s, v);

        const svArea = pickerNode.querySelector('[data-action="dragCustomSV"]');
        if (svArea) svArea.style.backgroundColor = `hsl(${h}, 100%, 50%)`;

        const svThumb = pickerNode.querySelector('[data-ref="customSvThumb"]');
        if (svThumb) {
            svThumb.style.left = `${s}%`;
            svThumb.style.top = `${100 - v}%`;
        }

        const hueThumb = pickerNode.querySelector('[data-ref="customHueThumb"]');
        if (hueThumb) hueThumb.style.left = `${(h / 360) * 100}%`;

        const hexInput = pickerNode.querySelector('[data-ref="customHexInput"]');
        if (hexInput && document.activeElement !== hexInput) {
            hexInput.value = hex;
        }

        const hexInputPreview = pickerNode.querySelector('[data-ref="customHexInputPreview"]');
        if (hexInputPreview) {
            hexInputPreview.style.backgroundColor = hex;
        }
    },

    updateCustomColorFromEvent(e, container) {
        if (!container) return;
        const pickerNode = container.closest('[data-ref="customColorPicker"]');
        if (!pickerNode) return;

        const rect = container.getBoundingClientRect();
        const coords = getEventCoords(e);
        let x = Math.max(0, Math.min(coords.clientX - rect.left, rect.width));
        let y = Math.max(0, Math.min(coords.clientY - rect.top, rect.height));

        if (this.isDraggingCustomPicker === 'sv') {
            pickerNode.dataset.s = (x / rect.width) * 100;
            pickerNode.dataset.v = 100 - ((y / rect.height) * 100);
        } else if (this.isDraggingCustomPicker === 'hue') {
            pickerNode.dataset.h = (x / rect.width) * 360;
        }

        this.updateCustomPickerUI(pickerNode);
    }
};
