import { generateShapePixels } from '../utils/GeometricShapesUtils.js?v=34';
import { SHAPE_SVG_PATHS } from '../data/ShapeSvgPathsData.js?v=34';
import { renderPixelText } from '../utils/PixelTextUtils.js';
import { showMessage } from '../../../../core/utils/uiUtils.js';
import { getLassoSelectedPixels } from '../utils/LassoSelectionUtils.js';
import { getMagicWandSelectedPixels } from '../utils/MagicWandUtils.js';

export const InteractionShapesText = {
    selectGeometricShape(shapeId, targetEl) {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        if (typeof this.closeSubtoolbar === 'function') this.closeSubtoolbar();

        document.querySelectorAll('.component-shape-card').forEach(c => {
            const cId = c.getAttribute('data-shape-id');
            c.classList.toggle('active', cId === shapeId);
        });

        const svgFile = targetEl?.getAttribute('data-svg') || (targetEl?.querySelector('img')?.src) || null;
        const sName = targetEl?.getAttribute('data-tooltip') || targetEl?.getAttribute('alt') || shapeId;

        if (typeof this.addShapeToCanvas === 'function') {
            this.addShapeToCanvas(shapeId, svgFile, sName);
        }
    },

    setGeometricShapeFill(isFill, targetEl) {
        if (!this.activeGeometricShape) {
            this.activeGeometricShape = { shape: 'square', fill: !!isFill, strokeWidth: 1 };
        } else {
            this.activeGeometricShape.fill = !!isFill;
        }

        const activeTpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
        if (activeTpl && activeTpl.isShape) {
            activeTpl.isFill = !!isFill;
            if (typeof this.refreshShapeTemplateColor === 'function') {
                this.refreshShapeTemplateColor(activeTpl, activeTpl.color || this.currentColor);
            }
        }

        if (this.isShapeDrawing) {
            this.updateShapePreview();
        }
    },

    deactivateGeometricShapeMode() {
        this.interactionMode = 'normal';
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.shapePreviewBox = null;
        this.selectedPixels.clear();

        const btnShapes = document.querySelector('[data-ref="btn-offline-shapes"]');
        if (btnShapes) btnShapes.classList.remove('active');

        document.querySelectorAll('.component-shape-card').forEach(c => c.classList.remove('active'));

        if (typeof showMessage === 'function') {
            showMessage(__('msg_shape_mode_off') || 'Modo figuras desactivado', 'info');
        }
        this.updateSelectionUI();
        this.requestRender();
    },

    updateShapePreview() {
        if (!this.isShapeDrawing || !this.shapeStart || !this.shapeCurrent) {
            this.shapePreviewPixels = null;
            this.shapePreviewBox = null;
            this.requestRender();
            return;
        }

        const shapeType = this.activeGeometricShape?.shape || 'line';
        const isFill = !!this.activeGeometricShape?.fill;
        const strokeWidth = this.activeGeometricShape?.strokeWidth || 1;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const x0 = this.shapeStart.x;
        const y0 = this.shapeStart.y;
        const x1 = this.shapeCurrent.x;
        const y1 = this.shapeCurrent.y;

        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;

        const pathD = SHAPE_SVG_PATHS ? SHAPE_SVG_PATHS[shapeType] : null;

        this.shapePreviewBox = {
            shape: shapeType,
            pathD: pathD || null,
            x0, y0, x1, y1,
            minX, minY, maxX, maxY,
            w, h,
            isFill,
            strokeWidth,
            color: this.currentColor
        };

        // PREVIEW VECTORIAL PATH2D (0ms Lag a 4096px):
        // Para l├¡neas rectas o miniaturas (<= 32x32) generamos preview de p├¡xeles individuales.
        // Para figuras medianas/grandes/gigantes, el preview vectorial Path2D renderiza en 0.001ms a 120 FPS sin saturar la CPU.
        if (shapeType === 'line' || (w * h <= 1024)) {
            const points = generateShapePixels(shapeType, x0, y0, x1, y1, isFill, strokeWidth, bw, bh);
            const previewKeys = [];
            const seen = new Set();
            const addKey = (px, py) => {
                if (px >= 0 && px < bw && py >= 0 && py < bh) {
                    const key = (py << 16) | (px & 0xFFFF);
                    if (!seen.has(key)) {
                        seen.add(key);
                        previewKeys.push(key);
                    }
                }
            };
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                addKey(p.x, p.y);
                if (this.isMirrorMode) {
                    const symX = bw - 1 - p.x;
                    if (symX >= 0 && symX < bw && symX !== p.x) {
                        addKey(symX, p.y);
                    }
                }
            }
            this.shapePreviewPixels = previewKeys;
        } else {
            this.shapePreviewPixels = null;
        }

        this.setCanvasBadge('coords', 'shapes', `${w} ├ù ${h} px`, 'left');
        this.requestRender();
    },

    commitShapeDrawing() {
        if (!this.isShapeDrawing || !this.shapeStart) {
            this.isShapeDrawing = false;
            this.shapeStart = null;
            this.shapeCurrent = null;
            this.shapePreviewPixels = null;
            this.shapePreviewBox = null;
            this.requestRender();
            return;
        }

        const start = this.shapeStart;
        const current = this.shapeCurrent || this.shapeStart;
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.shapePreviewBox = null;

        const shapeType = this.activeGeometricShape?.shape || 'line';
        const isFill = !!this.activeGeometricShape?.fill;
        const strokeWidth = this.activeGeometricShape?.strokeWidth || 1;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const points = generateShapePixels(shapeType, start.x, start.y, current.x, current.y, isFill, strokeWidth, bw, bh);
        if (!points || points.length === 0) {
            this.setCanvasBadge('coords', 'my_location', `${current.x} , ${current.y}`, 'left');
            this.requestRender();
            return;
        }

        const pixelsToPush = [];
        const seen = new Set();

        const addPixel = (px, py) => {
            if (px >= 0 && px < bw && py >= 0 && py < bh) {
                const key = (py << 16) | (px & 0xFFFF);
                if (!seen.has(key)) {
                    seen.add(key);
                    pixelsToPush.push({ x: px, y: py, color: this.currentColor });
                }
            }
        };

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            addPixel(p.x, p.y);
            if (this.isMirrorMode) {
                const symX = bw - 1 - p.x;
                if (symX >= 0 && symX < bw && symX !== p.x) {
                    addPixel(symX, p.y);
                }
            }
        }

        if (pixelsToPush.length > 0 && this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPush
                    }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.fillStyle = this.currentColor;
                for (let i = 0; i < pixelsToPush.length; i++) {
                    const pt = pixelsToPush[i];
                    this.offscreenCtx.fillRect(pt.x, pt.y, 1, 1);
                }
            }
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        }

        this.setCanvasBadge('coords', 'my_location', `${current.x} , ${current.y}`, 'left');
        this.requestRender();
    },

    toggleOfflineText() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'offline_text') {
            this.deactivatePixelTextMode();
        } else {
            this.activatePixelTextMode();
        }
    },

    activatePixelTextMode() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        const btnShapes = document.querySelector('[data-ref="btn-offline-shapes"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (btnShapes) btnShapes.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        if (typeof this.closeSubtoolbar === 'function') this.closeSubtoolbar();

        this.interactionMode = 'offline_text';
        this.selectedPixels.clear();
        this.textPosition = null;
        this.textPreviewPixels = null;
        this.textPreviewShadow = null;
        this.textPreviewOutline = null;
        this.textPreviewBox = null;

        const btnText = document.querySelector('[data-ref="btn-offline-text"]');
        if (btnText) btnText.classList.add('active');

        if (!this.activePixelText) {
            this.activePixelText = {
                text: '',
                fontId: 'arcade_5x7',
                scale: 1,
                letterSpacing: 1,
                lineSpacing: 2,
                hasOutline: false,
                hasShadow: false
            };
        } else {
            this.activePixelText.text = '';
        }

        const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
        if (floatingInput) {
            floatingInput.value = '';
        }

        const floatingEl = document.querySelector('[data-ref="canvas-floating-text"]');
        if (floatingEl) {
            floatingEl.classList.remove('active');
            floatingEl.classList.add('disabled');
        }

        this.updatePixelTextControlsUI();

        if (this.textCaretInterval) clearInterval(this.textCaretInterval);
        this.textCaretInterval = setInterval(() => {
            if (this.interactionMode === 'offline_text' && this.textPosition) {
                this.requestRender();
            }
        }, 500);

        if (typeof showMessage === 'function') {
            const msg = (typeof window.__ === 'function' ? window.__('msg_text_selected') : null) || 'Modo Texto activado. Haz clic en el lienzo donde desees escribir.';
            showMessage(msg, 'info');
        }
        this.updateSelectionUI();
        this.requestRender();
    },

    deactivatePixelTextMode() {
        if (this.textCaretInterval) {
            clearInterval(this.textCaretInterval);
            this.textCaretInterval = null;
        }

        this.interactionMode = 'normal';
        this.textPosition = null;
        this.textPreviewPixels = null;
        this.textPreviewShadow = null;
        this.textPreviewOutline = null;
        this.textPreviewBox = null;
        this.isTextDragging = false;
        this.textDragStart = null;
        this.selectedPixels.clear();

        if (this.activePixelText) {
            this.activePixelText.text = '';
        }

        const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
        if (floatingInput) {
            floatingInput.value = '';
        }

        const btnText = document.querySelector('[data-ref="btn-offline-text"]');
        if (btnText) btnText.classList.remove('active');

        const floatingEl = document.querySelector('[data-ref="canvas-floating-text"]');
        if (floatingEl) {
            floatingEl.classList.remove('active');
            floatingEl.classList.add('disabled');
        }

        if (typeof showMessage === 'function') {
            const msg = (typeof window.__ === 'function' ? window.__('msg_text_mode_off') : null) || 'Modo Texto desactivado';
            showMessage(msg, 'info');
        }
        this.updateSelectionUI();
        this.requestRender();
    },

    cyclePixelFont() {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
        }
        const fonts = ['arcade_5x7', 'mini_3x5', 'cyber_6x8'];
        const curIdx = fonts.indexOf(this.activePixelText.fontId);
        const nextFont = fonts[(curIdx + 1) % fonts.length];
        this.selectPixelFont(nextFont);
    },

    cyclePixelTextScale() {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
        }
        const currentScale = this.activePixelText.scale || 1;
        const nextScale = currentScale >= 4 ? 1 : currentScale + 1;
        this.setPixelTextScale(nextScale);
    },

    selectPixelFont(fontId, targetEl) {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId, scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
        } else {
            this.activePixelText.fontId = fontId;
        }

        this.updatePixelTextControlsUI();
        this.updatePixelTextPreview();
    },

    setPixelTextScale(scale, targetEl) {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId: 'arcade_5x7', scale, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
        } else {
            this.activePixelText.scale = scale;
        }

        this.updatePixelTextControlsUI();
        this.updatePixelTextPreview();
    },

    togglePixelTextOutline(targetEl) {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: true, hasShadow: false };
        } else {
            this.activePixelText.hasOutline = !this.activePixelText.hasOutline;
        }

        this.updatePixelTextControlsUI();
        this.updatePixelTextPreview();
    },

    togglePixelTextShadow(targetEl) {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: true };
        } else {
            this.activePixelText.hasShadow = !this.activePixelText.hasShadow;
        }

        this.updatePixelTextControlsUI();
        this.updatePixelTextPreview();
    },

    updatePixelTextControlsUI() {
        if (!this.activePixelText) return;

        const btnOutline = document.querySelector('[data-ref="btn-text-outline"]');
        if (btnOutline) {
            btnOutline.classList.toggle('active', !!this.activePixelText.hasOutline);
        }

        const btnShadow = document.querySelector('[data-ref="btn-text-shadow"]');
        if (btnShadow) {
            btnShadow.classList.toggle('active', !!this.activePixelText.hasShadow);
        }

        const scaleLabel = document.querySelector('[data-ref="text-scale-label"]');
        const btnScale = document.querySelector('[data-ref="btn-text-scale"]');
        if (scaleLabel) {
            scaleLabel.textContent = `${this.activePixelText.scale || 1}x`;
        }
        if (btnScale) {
            const scaleTooltip = (typeof window.__ === 'function' ? window.__('lbl_text_scale') : null) || 'Escala';
            btnScale.setAttribute('data-tooltip', `${scaleTooltip}: ${this.activePixelText.scale || 1}x`);
        }

        const btnFont = document.querySelector('[data-ref="btn-text-font"]');
        if (btnFont) {
            const fontNames = {
                'arcade_5x7': (typeof window.__ === 'function' ? window.__('font_arcade') : null) || 'Arcade',
                'mini_3x5': (typeof window.__ === 'function' ? window.__('font_mini') : null) || 'Mini',
                'cyber_6x8': (typeof window.__ === 'function' ? window.__('font_cyber') : null) || 'Cyber'
            };
            const currentName = fontNames[this.activePixelText.fontId] || this.activePixelText.fontId;
            const fontTooltip = (typeof window.__ === 'function' ? window.__('lbl_font_family') : null) || 'Fuente';
            btnFont.setAttribute('data-tooltip', `${fontTooltip}: ${currentName}`);
        }
    },

    updateFloatingTextPosition() {
        const floatingEl = document.querySelector('[data-ref="canvas-floating-text"]');
        if (!floatingEl || !this.canvas || !this.textPosition || !this.transform) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvas.parentNode ? this.canvas.parentNode.getBoundingClientRect() : canvasRect;

        let targetX = this.textPosition.x;
        let targetY = this.textPosition.y;

        if (this.textPreviewBox && this.activePixelText?.text && this.activePixelText.text.length > 0) {
            targetX = this.textPosition.x + (this.textPreviewBox.w / 2);
            targetY = this.textPosition.y;
        }

        const screenX = canvasRect.left + (targetX * this.transform.scale) + this.transform.x;
        const screenY = canvasRect.top + (targetY * this.transform.scale) + this.transform.y;

        const leftPx = screenX - containerRect.left;
        const topPx = screenY - containerRect.top - 8;

        floatingEl.style.position = 'absolute';
        floatingEl.style.left = `${Math.round(leftPx)}px`;
        floatingEl.style.top = `${Math.round(topPx)}px`;
        floatingEl.style.transform = 'translate(-50%, -100%)';
        floatingEl.classList.remove('disabled');
        floatingEl.classList.add('active');
    },

    updatePixelTextPreview() {
        if (this.interactionMode !== 'offline_text' || !this.textPosition) return;

        const text = this.activePixelText?.text || '';
        const fontId = this.activePixelText?.fontId || 'arcade_5x7';
        const scale = this.activePixelText?.scale || 1;
        const letterSpacing = this.activePixelText?.letterSpacing || 1;
        const lineSpacing = this.activePixelText?.lineSpacing || 2;
        const hasOutline = !!this.activePixelText?.hasOutline;
        const hasShadow = !!this.activePixelText?.hasShadow;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        if (!text || text.length === 0) {
            this.textPreviewPixels = null;
            this.textPreviewShadow = null;
            this.textPreviewOutline = null;
            this.textPreviewBox = {
                minX: this.textPosition.x,
                minY: this.textPosition.y,
                maxX: this.textPosition.x,
                maxY: this.textPosition.y,
                w: 0,
                h: 0,
                originX: this.textPosition.x,
                originY: this.textPosition.y,
                cursorX: this.textPosition.x,
                cursorY: this.textPosition.y
            };
            this.updateFloatingTextPosition();
            this.requestRender();
            return;
        }

        const result = renderPixelText({
            text,
            fontId,
            scale,
            letterSpacing,
            lineSpacing,
            hasOutline,
            hasShadow,
            originX: this.textPosition.x,
            originY: this.textPosition.y,
            boardW: bw,
            boardH: bh
        });

        const toKeyList = (pts) => {
            const keys = [];
            const seen = new Set();
            for (let i = 0; i < pts.length; i++) {
                const pt = pts[i];
                if (pt.x >= 0 && pt.x < bw && pt.y >= 0 && pt.y < bh) {
                    const key = (pt.y << 16) | (pt.x & 0xFFFF);
                    if (!seen.has(key)) {
                        seen.add(key);
                        keys.push(key);
                    }
                    if (this.isMirrorMode) {
                        const symX = bw - 1 - pt.x;
                        if (symX >= 0 && symX < bw && symX !== pt.x) {
                            const symKey = (pt.y << 16) | (symX & 0xFFFF);
                            if (!seen.has(symKey)) {
                                seen.add(symKey);
                                keys.push(symKey);
                            }
                        }
                    }
                }
            }
            return keys;
        };

        this.textPreviewPixels = toKeyList(result.points);
        this.textPreviewShadow = toKeyList(result.shadowPoints);
        this.textPreviewOutline = toKeyList(result.outlinePoints);
        this.textPreviewBox = {
            ...result.bounds,
            originX: this.textPosition.x,
            originY: this.textPosition.y,
            cursorX: result.cursorX,
            cursorY: result.cursorY
        };

        this.updateFloatingTextPosition();
        this.setCanvasBadge('coords', 'title', `${result.bounds.w} ├ù ${result.bounds.h} px`, 'left');
        this.requestRender();
    },

    commitPixelText() {
        if (this.interactionMode !== 'offline_text' || !this.activePixelText || !this.textPosition) return;

        const text = this.activePixelText.text || '';
        if (!text || text.length === 0) {
            this.deactivatePixelTextMode();
            return;
        }

        const fontId = this.activePixelText.fontId || 'arcade_5x7';
        const scale = this.activePixelText.scale || 1;
        const letterSpacing = this.activePixelText.letterSpacing || 1;
        const lineSpacing = this.activePixelText.lineSpacing || 2;
        const hasOutline = !!this.activePixelText.hasOutline;
        const hasShadow = !!this.activePixelText.hasShadow;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const origin = this.textPosition || { x: 0, y: 0 };

        const result = renderPixelText({
            text,
            fontId,
            scale,
            letterSpacing,
            lineSpacing,
            hasOutline,
            hasShadow,
            originX: origin.x,
            originY: origin.y,
            boardW: bw,
            boardH: bh
        });

        const pixelsToPush = [];
        const seen = new Set();

        const addPoints = (pts, col) => {
            for (let i = 0; i < pts.length; i++) {
                const pt = pts[i];
                if (pt.x >= 0 && pt.x < bw && pt.y >= 0 && pt.y < bh) {
                    const key = (pt.y << 16) | (pt.x & 0xFFFF);
                    if (!seen.has(key)) {
                        seen.add(key);
                        pixelsToPush.push({ x: pt.x, y: pt.y, color: col });
                    }
                    if (this.isMirrorMode) {
                        const symX = bw - 1 - pt.x;
                        if (symX >= 0 && symX < bw && symX !== pt.x) {
                            const symKey = (pt.y << 16) | (symX & 0xFFFF);
                            if (!seen.has(symKey)) {
                                seen.add(symKey);
                                pixelsToPush.push({ x: symX, y: pt.y, color: col });
                            }
                        }
                    }
                }
            }
        };

        if (hasShadow) {
            addPoints(result.shadowPoints, '#404040');
        }
        if (hasOutline) {
            addPoints(result.outlinePoints, '#000000');
        }
        addPoints(result.points, this.currentColor);

        if (pixelsToPush.length > 0 && this.isOfflineMode) {
            if (typeof this.recordRecentColor === 'function') {
                this.recordRecentColor(this.currentColor);
            }
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPush
                    }
                });
            }
            if (this.offscreenCtx) {
                for (let i = 0; i < pixelsToPush.length; i++) {
                    const pt = pixelsToPush[i];
                    this.offscreenCtx.fillStyle = pt.color;
                    this.offscreenCtx.fillRect(pt.x, pt.y, 1, 1);
                }
            }
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        }

        if (typeof showMessage === 'function') {
            const msg = (typeof window.__ === 'function' ? window.__('msg_text_stamped') : null) || 'Texto estampado en el lienzo';
            showMessage(msg, 'success');
        }
        this.deactivatePixelTextMode();
    },

    cancelPixelText() {
        this.deactivatePixelTextMode();
    },

    toggleOfflineMoveArea() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');

        if (btnBucket) btnBucket.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        this.closeSubtoolbar();
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        if (this.interactionMode === 'offline_moving_area') {
            this.cancelMoveArea(false);
            this.closeSubtoolbar();
            if (typeof showMessage === 'function') showMessage('Modo mover selección desactivado.', 'info');
        } else {
            this.interactionMode = 'offline_moving_area';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            this.moveAreaBox = null;
            this.moveAreaStep = 0;
            this.moveAreaStart = null;
            this.moveAreaDragAnchor = null;
            if (btnMoveArea) btnMoveArea.classList.add('active');
            if (typeof this.openSubtoolbar === 'function') this.openSubtoolbar('moveArea');
            this.updateMoveAreaFloatingToolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_move_area_on') || 'Modo Selección activado. Elige modo en la barra lateral o usa M, Q o W.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        this.requestRender();
    },

    selectMoveArea(x1, y1, x2, y2, dx = 0, dy = 0, state = 1) {
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(bw - 1, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(bh - 1, Math.max(y1, y2));

        this.moveAreaBox = { x1: minX, y1: minY, x2: maxX, y2: maxY, dx, dy, state };

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_MOVE_AREA',
                payload: { moveAreaBox: this.moveAreaBox }
            });
        }

        this.updateMoveAreaFloatingToolbar();
        this.requestRender();
    },

    updateMoveAreaFloatingToolbar() {
        const tb = document.querySelector('[data-ref="move-area-floating-toolbar"]');
        if (!tb) return;

        const isLockedState = !!(this.isSpectator || this.isResetLocked || this.isResizeLocked);

        const hasBox = this.moveAreaBox && this.moveAreaStep >= 2;
        const hasActivePixels = this.activeSelectionPixels && this.activeSelectionPixels.length > 0;
        const hasSelection = (this.interactionMode === 'offline_moving_area') && (hasBox || hasActivePixels);

        if (!hasSelection || isLockedState || this.isDragging || this.isZooming || !this.canvas || !this.transform) {
            tb.classList.add('disabled');
            tb.classList.remove('active');
            return;
        }

        let centerX = 0;
        let topY = 0;

        if (hasBox) {
            const box = this.moveAreaBox;
            const curX1 = Math.min(box.x1, box.x2) + (box.dx || 0);
            const curX2 = Math.max(box.x1, box.x2) + (box.dx || 0);
            const curY1 = Math.min(box.y1, box.y2) + (box.dy || 0);
            centerX = (curX1 + curX2 + 1) / 2;
            topY = curY1;
        } else if (hasActivePixels) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity;
            for (let i = 0; i < this.activeSelectionPixels.length; i++) {
                const p = this.activeSelectionPixels[i];
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
            }
            centerX = (minX + maxX + 1) / 2;
            topY = minY;
        }

        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvas.parentNode ? this.canvas.parentNode.getBoundingClientRect() : canvasRect;

        const screenX = canvasRect.left + (centerX * this.transform.scale) + this.transform.x;
        const screenY = canvasRect.top + (topY * this.transform.scale) + this.transform.y;

        const leftPx = screenX - containerRect.left;
        const topPx = screenY - containerRect.top - 8;

        tb.style.position = 'absolute';
        tb.style.left = `${Math.round(leftPx)}px`;
        tb.style.top = `${Math.round(topPx)}px`;
        tb.style.transform = 'translate(-50%, -100%)';
        tb.classList.remove('disabled');
        tb.classList.add('active');
    },

    commitMoveArea() {
        if (!this.moveAreaBox) return;
        const { x1, y1, x2, y2, dx = 0, dy = 0 } = this.moveAreaBox;

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'COMMIT_MOVE_AREA',
                payload: { x1, y1, x2, y2, dx, dy }
            });
        }

        this.moveAreaBox = null;
        this.moveAreaStep = 0;
        this.moveAreaStart = null;
        this.moveAreaDragAnchor = null;
        this.updateMoveAreaFloatingToolbar();
        this.canvas.classList.remove('component-cursor-grabbing');

        if (typeof showMessage === 'function') {
            showMessage(window.__('msg_move_area_applied') || '├ürea movida con ├®xito.', 'success');
        }
        if (typeof this.saveOfflineCanvasState === 'function') {
            this.saveOfflineCanvasState(false);
        }
        this.requestRender();
    },

    cancelMoveArea(keepMode = false) {
        this.moveAreaBox = null;
        this.moveAreaStep = 0;
        this.moveAreaStart = null;
        this.moveAreaDragAnchor = null;

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_MOVE_AREA',
                payload: { moveAreaBox: null }
            });
        }

        this.updateMoveAreaFloatingToolbar();
        this.canvas.classList.remove('component-cursor-grabbing');

        if (!keepMode) {
            this.interactionMode = 'normal';
            const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
            if (btnMoveArea) btnMoveArea.classList.remove('active');
        }

        this.requestRender();
    },

    setSelectionMode(mode = 'box') {
        this.selectionMode = mode;
        if (this.interactionMode !== 'offline_moving_area' && typeof this.toggleOfflineMoveArea === 'function') {
            this.toggleOfflineMoveArea();
        } else if (typeof this.openSubtoolbar === 'function') {
            this.openSubtoolbar('moveArea');
        }
        document.querySelectorAll('[data-action="setSelectionMode"]').forEach(btn => {
            const actMode = btn.getAttribute('data-selection-mode');
            btn.classList.toggle('active', actMode === mode);
        });
        const msgs = {
            box: 'Modo Selección Rectangular [M]',
            lasso: 'Modo Lazo a mano alzada [Q]',
            wand: 'Modo Varita Mágica [W]'
        };
        if (typeof showMessage === 'function') showMessage(msgs[mode] || 'Modo selección cambiado', 'info');
    },

    executeLassoSelection(rawPoints) {
        if (!this.isOfflineMode) return;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const pixels = getLassoSelectedPixels(rawPoints, bw, bh);
        this.setSelectionPixels(pixels);
    },

    executeMagicWandSelection(startX, startY, tolerance = 0, contiguous = true) {
        if (!this.isOfflineMode) return;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        let buffer = null;
        if (this.layers && this.activeLayerId) {
            const l = this.layers.find(x => x.id === this.activeLayerId);
            if (l && l.buffer) buffer = l.buffer;
        }

        if (!buffer && this.offscreenCtx) {
            const imgData = this.offscreenCtx.getImageData(0, 0, bw, bh);
            buffer = new Uint32Array(imgData.data.buffer);
        }

        if (!buffer) return;

        const pixels = getMagicWandSelectedPixels(buffer, startX, startY, bw, bh, tolerance, contiguous);
        this.setSelectionPixels(pixels);
    },

    setSelectionPixels(pixels) {
        this.activeSelectionPixels = pixels || [];
        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_SELECTION_MASK',
                payload: { pixels: this.activeSelectionPixels }
            });
        }
        if (this.activeSelectionPixels.length > 0) {
            if (typeof showMessage === 'function') {
                showMessage(`Área seleccionada (${this.activeSelectionPixels.length} px). Usa herramientas para pintar dentro o arrastra para mover/transformar.`, 'info');
            }
        }
        this.requestRender();
    },

    clearSelection() {
        this.activeSelectionPixels = [];
        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'CLEAR_SELECTION_MASK'
            });
        }
        this.requestRender();
    },

    deleteSelection() {
        if (this.activeSelectionPixels && this.activeSelectionPixels.length > 0) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'CLEAR_SELECTION_PIXELS'
                });
            }
            this.clearSelection();
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
            return;
        }

        if (this.moveAreaBox) {
            const { x1, y1, x2, y2 } = this.moveAreaBox;
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'CLEAR_AREA',
                    payload: { x1: minX, y1: minY, x2: maxX, y2: maxY }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.clearRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
            }
            this.cancelMoveArea();
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
        }
    },

    floatSelection(isCut = false) {
        if ((!this.activeSelectionPixels || this.activeSelectionPixels.length === 0) && this.moveAreaBox) {
            const pixels = [];
            const minX = Math.min(this.moveAreaBox.x1, this.moveAreaBox.x2);
            const maxX = Math.max(this.moveAreaBox.x1, this.moveAreaBox.x2);
            const minY = Math.min(this.moveAreaBox.y1, this.moveAreaBox.y2);
            const maxY = Math.max(this.moveAreaBox.y1, this.moveAreaBox.y2);
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    pixels.push({ x, y });
                }
            }
            this.activeSelectionPixels = pixels;
        }
        if (!this.activeSelectionPixels || this.activeSelectionPixels.length === 0) return;
        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'EXTRACT_SELECTION_TO_BITMAP',
                payload: { isCut }
            });
        }
    },

    handleSelectionBitmapExtracted(payload) {
        if (!payload || !payload.imageBitmap) return;
        const tpl = {
            id: 'selection_' + Date.now(),
            imageBitmap: payload.imageBitmap,
            x: payload.x,
            y: payload.y,
            w: payload.w,
            h: payload.h,
            angle: 0,
            locked: false,
            opacity: 1.0,
            isSticker: true,
            isSelection: true,
            title: 'Selección'
        };
        if (!this.templates) this.templates = [];
        this.templates.push(tpl);
        this.activeTemplateId = tpl.id;
        this.clearSelection();
        if (typeof this.updateTemplateUI === 'function') this.updateTemplateUI();
        this.requestRender();
        if (typeof showMessage === 'function') showMessage('Selección flotante lista para transformar [Mover, Escalar, Rotar, Voltear].', 'info');
    },

    copySelection() {
        if (!this.activeSelectionPixels || this.activeSelectionPixels.length === 0) return;
        this.floatSelection(false);
    },

    cutSelection() {
        if (!this.activeSelectionPixels || this.activeSelectionPixels.length === 0) return;
        this.floatSelection(true);
    }
};
