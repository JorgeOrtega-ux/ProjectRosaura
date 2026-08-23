import { showMessage, hsvToHex, getEventCoords } from '../../../../core/utils/uiUtils.js';
import { abgrToHex } from './InteractionHelpers.js';

export const InteractionHistoryColors = {
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
            if (typeof showMessage === 'function') showMessage(window.__('msg_undo') || 'Acci├│n deshecha', 'info');
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
            if (typeof showMessage === 'function') showMessage(window.__('msg_redo') || 'Acci├│n rehecha', 'info');
        }
    },

    loadCustomColors() {
        try {
            const key = this.canvasId ? `rosaura_custom_colors_${this.canvasId}` : 'rosaura_offline_custom_colors';
            const saved = localStorage.getItem(key) || localStorage.getItem('rosaura_offline_custom_colors');
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
            const key = this.canvasId ? `rosaura_custom_colors_${this.canvasId}` : 'rosaura_offline_custom_colors';
            if (Array.isArray(this.customPickedColors)) {
                localStorage.setItem(key, JSON.stringify(this.customPickedColors.slice(0, 18)));
                localStorage.setItem('rosaura_offline_custom_colors', JSON.stringify(this.customPickedColors.slice(0, 18)));
            }
        } catch (e) {
            console.warn('Failed to save custom colors to localStorage:', e);
        }
    },

    selectAndAddCustomColor(hex) {
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

        this.currentColor = hex;
        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
        }

        this.renderCustomPickedColors();
        this.updateActiveColorPreview();
        this.syncActiveColorHighlight();
        this.requestRender();

        if (window.ModuleManager && typeof window.ModuleManager.close === 'function') {
            window.ModuleManager.close('moduleCustomColorPicker');
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
