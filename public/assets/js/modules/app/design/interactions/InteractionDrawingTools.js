import { showMessage, hexToHsv, hsvToHex } from '../../../../core/utils/uiUtils.js';
import { getCanvasTier, getToolSizes, getSprayRadii, getTileGridLevels } from '../data/OfflineToolsData.js';
import { colorToAbgr, abgrToHex } from './InteractionHelpers.js';

export const InteractionDrawingTools = {
    toggleEyedropper() {
        if (this.interactionMode === 'offline_eyedropper') {
            this.interactionMode = 'normal';
            const btn = document.querySelector('[data-action="toggleEyedropper"]');
            if (btn) btn.classList.remove('active');
            if (this.canvas) this.canvas.classList.remove('component-cursor-eyedropper');
        } else {
            if (typeof this.cancelInteractionMode === 'function') {
                this.cancelInteractionMode();
            }
            this.interactionMode = 'offline_eyedropper';
            const btn = document.querySelector('[data-action="toggleEyedropper"]');
            if (btn) btn.classList.add('active');
            if (this.canvas) this.canvas.classList.add('component-cursor-eyedropper');
        }
        this.requestRender();
    },

    toggleOfflineBrush() {
        const btnBrush = document.querySelector('[data-action="toggleOfflineBrush"]');
        if (this.interactionMode === 'offline_brush') {
            this.interactionMode = 'normal';
            if (btnBrush) btnBrush.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
        } else {
            if (typeof this.cancelInteractionMode === 'function') {
                this.cancelInteractionMode();
            }
            this.interactionMode = 'offline_brush';
            if (btnBrush) btnBrush.classList.add('active');
            this.openSubtoolbar('brush');
            this.openBrushSizeToolbar('brush');
        }
        this.requestRender();
    },

    setBrushShape(shape = 'square', targetEl = null) {
        this.brushShape = shape;
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const btns = subtoolbar.querySelectorAll('[data-action="setBrushShape"]');
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-brush-shape') === shape));
        }
        const shapeNames = { square: 'Cuadrado', circle: 'Redondo', slash: 'Diagonal' };
        if (typeof showMessage === 'function') {
            showMessage(`Forma de pincel: ${shapeNames[shape] || shape}`, 'info');
        }
        this.requestRender();
    },

    setBrushSize(size = 1, targetEl = null) {
        this.brushSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setBrushSize"]');
            btns.forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-size'), 10) === this.brushSize));
        }
        if (typeof showMessage === 'function') {
            showMessage(`Tama├▒o de pincel: ${this.brushSize}x${this.brushSize} px`, 'info');
        }
        this.requestRender();
    },

    toggleOfflineShading() {
        const btnShading = document.querySelector('[data-action="toggleOfflineShading"]');
        if (this.interactionMode === 'offline_shading') {
            this.interactionMode = 'normal';
            if (btnShading) btnShading.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
        } else {
            if (typeof this.cancelInteractionMode === 'function') {
                this.cancelInteractionMode();
            }
            this.interactionMode = 'offline_shading';
            if (btnShading) btnShading.classList.add('active');
            this.openSubtoolbar('shading');
            this.openBrushSizeToolbar('shading');
            showMessage(window.__('msg_shading_on') || 'Modo Sombreado activado. Pinta sobre p├¡xeles para dar luces o sombras.', 'info');
        }
        this.requestRender();
    },

    setShadingMode(mode = 'shadow', targetEl = null) {
        this.shadingMode = mode;
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const btns = subtoolbar.querySelectorAll('[data-action="setShadingMode"]');
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-shading-mode') === mode));
        }
        const label = mode === 'highlight' ? 'Iluminar (+8%)' : 'Sombrear (-8%)';
        if (typeof showMessage === 'function') {
            showMessage(`Pincel de Sombreado: ${label}`, 'info');
        }
    },

    setShadingSize(size = 1, targetEl = null) {
        this.shadingSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setShadingSize"]');
            btns.forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-size'), 10) === this.shadingSize));
        }
        if (typeof showMessage === 'function') {
            showMessage(`Pincel de Sombreado: ${this.shadingSize}x${this.shadingSize} px`, 'info');
        }
    },

    toggleTileGrid() {
        const btn = document.querySelector('[data-action="toggleTileGrid"]');
        if (this.activeSubtoolbar === 'tilegrid') {
            this.closeSubtoolbar();
        } else {
            this.closeSubtoolbar();
            this.openSubtoolbar('tilegrid');
        }
        if (btn) {
            btn.classList.toggle('active', this.tileGridSize > 0 || this.activeSubtoolbar === 'tilegrid');
        }
    },

    setTileGridLevel(size = 0, targetEl = null) {
        this.tileGridSize = parseInt(size, 10) || 0;

        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const btns = subtoolbar.querySelectorAll('[data-action="setTileGridLevel"]');
            btns.forEach(b => {
                const s = parseInt(b.getAttribute('data-grid-size'), 10) || 0;
                b.classList.toggle('active', s === this.tileGridSize);
            });
        }

        const btn = document.querySelector('[data-action="toggleTileGrid"]');
        if (btn) {
            btn.classList.toggle('active', this.tileGridSize > 0 || this.activeSubtoolbar === 'tilegrid');
        }

        if (this.tileGridSize === 0) {
            showMessage(window.__('msg_tile_grid_off') || 'Cuadr├¡cula de Tiles desactivada', 'info');
        } else {
            const tpl = window.__('msg_tile_grid_on') || 'Cuadr├¡cula de Tiles: :size x :size px';
            const msg = tpl.replace(/:size/g, this.tileGridSize);
            showMessage(msg, 'success');
        }

        this.requestRender();
    },

    getBrushOffsets(size = 1, shape = 'square') {
        const offsets = [];
        if (size <= 1) {
            return [{ dx: 0, dy: 0 }];
        }
        const half1 = Math.floor((size - 1) / 2);
        const half2 = Math.floor(size / 2);

        if (shape === 'circle') {
            if (size === 2) {
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        offsets.push({ dx, dy });
                    }
                }
            } else if (size % 2 === 1) {
                const r = (size - 1) / 2;
                const maxDistSq = r * r + 0.45;
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (dx * dx + dy * dy <= maxDistSq) {
                            offsets.push({ dx, dy });
                        }
                    }
                }
            } else {
                const half = size / 2;
                const maxDistSq = (half - 0.5) * (half - 0.5) + (half - 0.85);
                for (let dy = -half; dy < half; dy++) {
                    for (let dx = -half; dx < half; dx++) {
                        const cx = dx + 0.5;
                        const cy = dy + 0.5;
                        if (cx * cx + cy * cy <= maxDistSq) {
                            offsets.push({ dx, dy });
                        }
                    }
                }
            }
        } else if (shape === 'slash') {
            for (let i = -half1; i <= half2; i++) {
                offsets.push({ dx: i, dy: -i });
            }
        } else {
            for (let dy = -half1; dy <= half2; dy++) {
                for (let dx = -half1; dx <= half2; dx++) {
                    offsets.push({ dx, dy });
                }
            }
        }
        return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    },

    applyBrushAt(cx, cy, isStart = false) {
        const size = this.brushSize || 1;
        const shape = this.brushShape || 'square';
        const color = this.currentColor || '#000000';
        const offsets = this.getBrushOffsets(size, shape);
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const pixelsToPaint = [];
        const seen = new Set();

        offsets.forEach(off => {
            const px = cx + off.dx;
            const py = cy + off.dy;
            if (px >= 0 && px < bw && py >= 0 && py < bh) {
                const k = (py << 16) | px;
                if (!seen.has(k)) {
                    seen.add(k);
                    pixelsToPaint.push({ x: px, y: py, color });
                }
            }
            if (this.isMirrorMode) {
                const symX = bw - 1 - (cx + off.dx);
                const py = cy + off.dy;
                if (symX >= 0 && symX < bw && py >= 0 && py < bh) {
                    const k = (py << 16) | symX;
                    if (!seen.has(k)) {
                        seen.add(k);
                        pixelsToPaint.push({ x: symX, y: py, color });
                    }
                }
            }
        });

        if (pixelsToPaint.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPaint,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.fillStyle = color;
                pixelsToPaint.forEach(p => {
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                });
            }
        }
    },

    applyBrushStrokeLine(line, isStart = false) {
        if (!line || line.length === 0) return;
        const size = this.brushSize || 1;
        const shape = this.brushShape || 'square';
        const color = this.currentColor || '#000000';
        const offsets = this.getBrushOffsets(size, shape);
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const pixelsToPaint = [];
        const seen = new Set();

        for (let i = 0; i < line.length; i++) {
            const pt = line[i];
            for (let j = 0; j < offsets.length; j++) {
                const off = offsets[j];
                const px = pt.x + off.dx;
                const py = pt.y + off.dy;
                if (px >= 0 && px < bw && py >= 0 && py < bh) {
                    const k = (py << 16) | px;
                    if (!seen.has(k)) {
                        seen.add(k);
                        pixelsToPaint.push({ x: px, y: py, color });
                    }
                }
                if (this.isMirrorMode) {
                    const symX = bw - 1 - (pt.x + off.dx);
                    if (symX >= 0 && symX < bw && py >= 0 && py < bh) {
                        const k = (py << 16) | symX;
                        if (!seen.has(k)) {
                            seen.add(k);
                            pixelsToPaint.push({ x: symX, y: py, color });
                        }
                    }
                }
            }
        }

        if (pixelsToPaint.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPaint,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.fillStyle = color;
                pixelsToPaint.forEach(p => {
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                });
            }
        }
    },

    applyBrushEraseLine(line, isStart = false) {
        if (!line || line.length === 0) return;
        const size = this.brushEraserSize || 1;
        const half1 = Math.floor((size - 1) / 2);
        const half2 = Math.floor(size / 2);
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const pixelsToErase = [];
        const seen = new Set();

        for (let i = 0; i < line.length; i++) {
            const pt = line[i];
            const minX = Math.max(0, pt.x - half1);
            const maxX = Math.min(bw - 1, pt.x + half2);
            const minY = Math.max(0, pt.y - half1);
            const maxY = Math.min(bh - 1, pt.y + half2);

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    const k = (y << 16) | x;
                    if (!seen.has(k)) {
                        seen.add(k);
                        pixelsToErase.push({ x, y, color: 'transparent' });
                    }
                    if (this.isMirrorMode) {
                        const symX = bw - 1 - x;
                        if (symX >= 0 && symX < bw && symX !== x) {
                            const symK = (y << 16) | symX;
                            if (!seen.has(symK)) {
                                seen.add(symK);
                                pixelsToErase.push({ x: symX, y, color: 'transparent' });
                            }
                        }
                    }
                }
            }
        }

        if (pixelsToErase.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToErase,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                pixelsToErase.forEach(p => {
                    this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                });
            }
        }
    },

    applyDitherStrokeLine(line, isStart = false) {
        if (!line || line.length === 0) return;
        const size = this.ditherSize || 1;
        const pattern = this.ditherPattern || 'checker_50';
        const color = this.currentColor;
        const half1 = Math.floor((size - 1) / 2);
        const half2 = Math.floor(size / 2);
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const pixelsToPaint = [];
        const seen = new Set();

        for (let i = 0; i < line.length; i++) {
            const pt = line[i];
            const minX = Math.max(0, pt.x - half1);
            const maxX = Math.min(bw - 1, pt.x + half2);
            const minY = Math.max(0, pt.y - half1);
            const maxY = Math.min(bh - 1, pt.y + half2);

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (this.isDitherPixel(x, y, pattern)) {
                        const k = (y << 16) | x;
                        if (!seen.has(k)) {
                            seen.add(k);
                            pixelsToPaint.push({ x, y, color });
                        }
                    }
                    if (this.isMirrorMode) {
                        const symX = bw - 1 - x;
                        if (symX >= 0 && symX < bw && symX !== x) {
                            if (this.isDitherPixel(symX, y, pattern)) {
                                const symK = (y << 16) | symX;
                                if (!seen.has(symK)) {
                                    seen.add(symK);
                                    pixelsToPaint.push({ x: symX, y, color });
                                }
                            }
                        }
                    }
                }
            }
        }

        if (pixelsToPaint.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPaint,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.fillStyle = color;
                pixelsToPaint.forEach(p => {
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                });
            }
        }
    },

    applyShadingStrokeLine(line, isStart = false) {
        if (!line || line.length === 0) return;
        const size = this.shadingSize || 1;
        const mode = this.shadingMode || 'shadow';
        const isMirrorMode = !!this.isMirrorMode;
        const strokePhase = isStart ? 'start' : 'step';

        if (this.isOfflineMode && this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'APPLY_SHADING',
                payload: {
                    points: line,
                    mode,
                    size,
                    isMirrorMode,
                    strokePhase
                }
            });
        }
    },

    applyShadingAt(cx, cy, isStart = false) {
        const size = this.shadingSize || 1;
        const mode = this.shadingMode || 'shadow';
        const isMirrorMode = !!this.isMirrorMode;
        const strokePhase = isStart ? 'start' : 'step';

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'APPLY_SHADING',
                    payload: {
                        cx,
                        cy,
                        mode,
                        size,
                        isMirrorMode,
                        strokePhase
                    }
                });
                return;
            }

            const offsets = this.getBrushOffsets(size, 'square');
            const bw = this.boardWidth || 64;
            const bh = this.boardHeight || 64;
            const pixelsToPaint = [];
            if (!this.shadingTouchedInStroke) this.shadingTouchedInStroke = new Set();

            const processCoord = (px, py) => {
                if (px < 0 || px >= bw || py < 0 || py >= bh) return;
                const key = (py << 16) | px;
                if (this.shadingTouchedInStroke.has(key)) return;
                this.shadingTouchedInStroke.add(key);

                let currentHex = '#FFFFFF';
                if (this.offscreenCtx) {
                    const img = this.offscreenCtx.getImageData(px, py, 1, 1);
                    const val = new Uint32Array(img.data.buffer)[0];
                    if (val === 0 || (val >>> 24) === 0) return;
                    currentHex = abgrToHex(val);
                } else {
                    return;
                }

                const hsv = hexToHsv(currentHex);
                let h = hsv.h;
                let s = hsv.s;
                let v = hsv.v;

                if (mode === 'highlight') {
                    v = Math.min(100, v + 8);
                    if (v >= 96) {
                        s = Math.max(0, s - 8);
                    }
                } else {
                    v = Math.max(0, v - 8);
                    if (v <= 20) {
                        s = Math.min(100, s + 4);
                    }
                }

                const newHex = hsvToHex(h, s, v);
                pixelsToPaint.push({ x: px, y: py, color: newHex });
            };

            offsets.forEach(off => {
                processCoord(cx + off.dx, cy + off.dy);
                if (this.isMirrorMode) {
                    const symX = bw - 1 - (cx + off.dx);
                    processCoord(symX, cy + off.dy);
                }
            });

            if (pixelsToPaint.length === 0) return;

            if (this.offscreenCtx) {
                pixelsToPaint.forEach(p => {
                    this.offscreenCtx.fillStyle = p.color;
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                });
            }
        }
    },

    toggleOfflineMirror() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        this.isMirrorMode = !this.isMirrorMode;
        const btnMirror = document.querySelector('[data-action="toggleOfflineMirror"]');
        if (btnMirror) {
            if (this.isMirrorMode) {
                btnMirror.classList.add('active');
            } else {
                btnMirror.classList.remove('active');
            }
        }

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_MIRROR_MODE',
                payload: { isMirrorMode: this.isMirrorMode }
            });
        }

        if (typeof showMessage === 'function') {
            showMessage(
                this.isMirrorMode 
                    ? (window.__('msg_mirror_mode_on') || 'Modo Espejo activado. Dibuja para pintar en ambos lados a la vez.')
                    : (window.__('msg_mirror_mode_off') || 'Modo Espejo desactivado.'),
                'info'
            );
        }

        this.requestRender();
    },

    openSubtoolbar(name) {
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (!subtoolbar) return;
        subtoolbar.classList.remove('disabled');
        subtoolbar.classList.add('active');

        const groups = subtoolbar.querySelectorAll('.canvas-design-subtoolbar-group');
        groups.forEach(g => {
            if (g.getAttribute('data-subtoolbar') === name) {
                g.classList.remove('disabled');
            } else {
                g.classList.add('disabled');
            }
        });

        if (name === 'tilegrid') {
            const btns = subtoolbar.querySelectorAll('[data-action="setTileGridLevel"]');
            const current = this.tileGridSize || 0;
            btns.forEach(b => {
                const s = parseInt(b.getAttribute('data-grid-size'), 10) || 0;
                b.classList.toggle('active', s === current);
            });
        }

        this.activeSubtoolbar = name;
    },

    closeSubtoolbar() {
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            subtoolbar.classList.remove('active');
            subtoolbar.classList.add('disabled');
            const groups = subtoolbar.querySelectorAll('.canvas-design-subtoolbar-group');
            groups.forEach(g => g.classList.add('disabled'));
        }
        const btnTileGrid = document.querySelector('[data-action="toggleTileGrid"]');
        if (btnTileGrid) {
            btnTileGrid.classList.toggle('active', (this.tileGridSize || 0) > 0);
        }
        this.activeSubtoolbar = null;
        this.closeBrushSizeToolbar();
    },

    openBrushSizeToolbar(forTool = 'eraser') {
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (!toolbar) return;
        toolbar.classList.remove('disabled');
        toolbar.classList.add('active');

        const groups = toolbar.querySelectorAll('.canvas-design-sizes-group');
        groups.forEach(g => {
            if (g.getAttribute('data-sizes-for') === forTool) {
                g.classList.remove('disabled');
                g.classList.add('active');
            } else {
                g.classList.remove('active');
                g.classList.add('disabled');
            }
        });

        if (forTool === 'eraser') {
            const btns = toolbar.querySelectorAll('[data-action="setBrushEraserSize"]');
            const currentSize = this.brushEraserSize || 1;
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == currentSize);
            });
        } else if (forTool === 'dither') {
            const btns = toolbar.querySelectorAll('[data-action="setDitherSize"]');
            const currentSize = this.ditherSize || 1;
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == currentSize);
            });
        } else if (forTool === 'brush') {
            const btns = toolbar.querySelectorAll('[data-action="setBrushSize"]');
            const currentSize = this.brushSize || 1;
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == currentSize);
            });
        } else if (forTool === 'shading') {
            const btns = toolbar.querySelectorAll('[data-action="setShadingSize"]');
            const currentSize = this.shadingSize || 1;
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == currentSize);
            });
        }
    },

    closeBrushSizeToolbar() {
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            toolbar.classList.remove('active');
            toolbar.classList.add('disabled');
        }
    },

    syncOfflineToolsTier(tier = null) {
        if (!this.isOfflineMode) return;
        const currentTier = tier || getCanvasTier(this.boardWidth || 64, this.boardHeight || 64);
        this.currentCanvasTier = currentTier;

        const sizeToolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (sizeToolbar) {
            const toolIds = ['brush', 'eraser', 'dither', 'shading'];
            toolIds.forEach(toolId => {
                const group = sizeToolbar.querySelector(`[data-sizes-for="${toolId}"]`);
                if (!group) return;
                const sizes = getToolSizes(toolId, currentTier);
                const currentVal = (toolId === 'brush') ? (this.brushSize || 1) :
                                   (toolId === 'eraser') ? (this.brushEraserSize || 1) :
                                   (toolId === 'dither') ? (this.ditherSize || 1) :
                                   (this.shadingSize || 1);

                const action = (toolId === 'brush') ? 'setBrushSize' :
                               (toolId === 'eraser') ? 'setBrushEraserSize' :
                               (toolId === 'dither') ? 'setDitherSize' :
                               'setShadingSize';

                group.innerHTML = sizes.map(s => {
                    const isActive = (s === currentVal);
                    return `<button class="component-button component-button--icon component-button--h32 ${isActive ? 'active' : ''}" data-action="${action}" data-size="${s}" data-tooltip="${s}x${s} px" data-position="right">${s}</button>`;
                }).join('');
            });
        }

        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const sprayGroup = subtoolbar.querySelector('[data-subtoolbar="spray"]');
            if (sprayGroup) {
                const radii = getSprayRadii(currentTier);
                const currentRadius = this.sprayRadius || 5;
                sprayGroup.innerHTML = radii.map(r => {
                    const isActive = (r === currentRadius);
                    return `<button class="component-button component-button--icon component-button--h32 ${isActive ? 'active' : ''}" data-action="setSpraySize" data-size="${r}" data-tooltip="Radio ${r} px" data-position="right">${r}</button>`;
                }).join('');
            }

            const gridGroup = subtoolbar.querySelector('[data-subtoolbar="tilegrid"]');
            if (gridGroup) {
                const levels = getTileGridLevels(currentTier);
                const currentGrid = this.tileGridSize || 0;
                gridGroup.innerHTML = levels.map(lvl => {
                    const isActive = (lvl === currentGrid);
                    const label = (lvl === 0) ? '<span class="material-symbols-rounded">grid_off</span>' : lvl;
                    const tooltip = (lvl === 0) ? (window.__('lbl_grid_off') || 'Desactivar cuadr├¡cula') : `${lvl}x${lvl} px`;
                    return `<button class="component-button component-button--icon component-button--h32 ${isActive ? 'active' : ''}" data-action="setTileGridLevel" data-grid-size="${lvl}" data-tooltip="${tooltip}" data-position="right">${label}</button>`;
                }).join('');
            }
        }
    },

    stepActiveToolSize(direction = 1) {
        if (!this.isOfflineMode) return;
        const tier = this.currentCanvasTier || getCanvasTier(this.boardWidth || 64, this.boardHeight || 64);

        if (this.interactionMode === 'offline_brush') {
            const sizes = getToolSizes('brush', tier);
            const current = this.brushSize || 1;
            let idx = sizes.indexOf(current);
            if (idx === -1) idx = 0;
            const nextIdx = Math.max(0, Math.min(sizes.length - 1, idx + direction));
            this.setBrushSize(sizes[nextIdx]);
        } else if (this.interactionMode === 'owner_erasing' && this.offlineEraserMode === 'brush') {
            const sizes = getToolSizes('eraser', tier);
            const current = this.brushEraserSize || 1;
            let idx = sizes.indexOf(current);
            if (idx === -1) idx = 0;
            const nextIdx = Math.max(0, Math.min(sizes.length - 1, idx + direction));
            this.setBrushEraserSize(sizes[nextIdx]);
        } else if (this.interactionMode === 'offline_spray') {
            const radii = getSprayRadii(tier);
            const current = this.sprayRadius || 5;
            let idx = radii.indexOf(current);
            if (idx === -1) idx = 0;
            const nextIdx = Math.max(0, Math.min(radii.length - 1, idx + direction));
            this.setSpraySize(radii[nextIdx]);
        } else if (this.interactionMode === 'offline_dither') {
            const sizes = getToolSizes('dither', tier);
            const current = this.ditherSize || 1;
            let idx = sizes.indexOf(current);
            if (idx === -1) idx = 0;
            const nextIdx = Math.max(0, Math.min(sizes.length - 1, idx + direction));
            this.setDitherSize(sizes[nextIdx]);
        } else if (this.interactionMode === 'offline_shading') {
            const sizes = getToolSizes('shading', tier);
            const current = this.shadingSize || 1;
            let idx = sizes.indexOf(current);
            if (idx === -1) idx = 0;
            const nextIdx = Math.max(0, Math.min(sizes.length - 1, idx + direction));
            this.setShadingSize(sizes[nextIdx]);
        } else if (this.activeSubtoolbar === 'tilegrid') {
            const levels = getTileGridLevels(tier);
            const current = this.tileGridSize || 0;
            let idx = levels.indexOf(current);
            if (idx === -1) idx = 0;
            const nextIdx = Math.max(0, Math.min(levels.length - 1, idx + direction));
            this.setTileGridLevel(levels[nextIdx]);
        }
    },

    setBrushEraserSize(size) {
        this.brushEraserSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setBrushEraserSize"]');
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == this.brushEraserSize);
            });
        }
        if (typeof showMessage === 'function') {
            showMessage(`Tama├▒o de borrador: ${this.brushEraserSize}x${this.brushEraserSize} px`, 'info');
        }
    },

    toggleOfflineEraser() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        const isEraserActive = (this.interactionMode === 'owner_erasing' || this.interactionMode === 'offline_eraser_brush');

        if (isEraserActive) {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            this.isBrushErasing = false;
            this.brushEraserLastCoords = null;
            if (btnEraser) btnEraser.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_eraser_mode_off') || 'Modo borrador desactivado.', 'info');
        } else {
            const currentMode = this.offlineEraserMode || 'box';
            this.setOfflineEraserMode(currentMode);
        }
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        this.requestRender();
    },

    setOfflineEraserMode(mode) {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        this.offlineEraserMode = mode;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        const btnBox = document.querySelector('[data-ref="btn-eraser-mode-box"]');
        const btnBrush = document.querySelector('[data-ref="btn-eraser-mode-brush"]');
        if (btnBox) btnBox.classList.toggle('active', mode === 'box');
        if (btnBrush) btnBrush.classList.toggle('active', mode === 'brush');
        if (btnEraser) btnEraser.classList.add('active');
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.isBrushErasing = false;
        this.brushEraserLastCoords = null;

        if (mode === 'box') {
            this.interactionMode = 'owner_erasing';
            this.closeBrushSizeToolbar();
            if (typeof showMessage === 'function') {
                showMessage('Borrador de Selecci├│n / ├ürea activado. Haz clic en la primera esquina para definir la zona.', 'info');
            }
        } else {
            this.interactionMode = 'offline_eraser_brush';
            this.openBrushSizeToolbar('eraser');
            if (typeof showMessage === 'function') {
                showMessage(`Borrador de Pincel Continuo (${this.brushEraserSize || 1}x${this.brushEraserSize || 1} px) activado. Haz clic y arrastra sobre el lienzo para borrar.`, 'info');
            }
        }

        this.openSubtoolbar('eraser');
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        this.requestRender();
    },

    applyBrushEraseAt(cx, cy, isStart = false) {
        const size = this.brushEraserSize || 1;
        const half1 = Math.floor((size - 1) / 2);
        const half2 = Math.floor(size / 2);

        const minX = Math.max(0, cx - half1);
        const maxX = Math.min((this.boardWidth || 64) - 1, cx + half2);
        const minY = Math.max(0, cy - half1);
        const maxY = Math.min((this.boardHeight || 64) - 1, cy + half2);

        if (minX > maxX || minY > maxY) return;

        const pixelsToErase = [];
        const bw = this.boardWidth || 64;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                pixelsToErase.push({ x, y, color: 'transparent' });
                if (this.isMirrorMode) {
                    const symX = bw - 1 - x;
                    if (symX >= 0 && symX < bw && symX !== x) {
                        pixelsToErase.push({ x: symX, y, color: 'transparent' });
                    }
                }
            }
        }

        if (pixelsToErase.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToErase,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                const w = maxX - minX + 1;
                const h = maxY - minY + 1;
                this.offscreenCtx.clearRect(minX, minY, w, h);
                if (this.isMirrorMode) {
                    const symMinX = bw - 1 - maxX;
                    this.offscreenCtx.clearRect(symMinX, minY, w, h);
                }
            }
        }
    },

    toggleOfflineBucket() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        this.closeSubtoolbar();
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        if (this.interactionMode === 'offline_bucket') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            if (btnBucket) btnBucket.classList.remove('active');
            if (typeof showMessage === 'function') showMessage(window.__('msg_bucket_mode_off') || 'Modo Bote de Pintura desactivado.', 'info');
        } else {
            this.interactionMode = 'offline_bucket';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnBucket) btnBucket.classList.add('active');
            if (typeof showMessage === 'function') showMessage(window.__('msg_bucket_mode_on') || 'Modo Bote de Pintura activado. Haz clic en una zona para rellenar.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        this.requestRender();
    },

    toggleOfflineSpray() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        this.closeSubtoolbar();
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        if (this.interactionMode === 'offline_spray') {
            this.stopSpray();
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            if (btnSpray) btnSpray.classList.remove('active');
            this.closeSubtoolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_spray_mode_off') || 'Modo Spray desactivado.', 'info');
        } else {
            this.interactionMode = 'offline_spray';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnSpray) btnSpray.classList.add('active');
            this.openSubtoolbar('spray');
            const currentSpraySize = this.sprayRadius || 5;
            const sprayGroup = document.querySelector('[data-subtoolbar="spray"]');
            if (sprayGroup) {
                const btns = sprayGroup.querySelectorAll('[data-action="setSpraySize"]');
                btns.forEach(btn => {
                    const val = btn.getAttribute('data-size');
                    btn.classList.toggle('active', val == currentSpraySize);
                });
            }
            if (typeof showMessage === 'function') showMessage(window.__('msg_spray_mode_on') || 'Modo Spray activado. Mant├®n presionado y arrastra para pintar.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        this.requestRender();
    },

    setSpraySize(size) {
        const s = parseInt(size, 10) || 5;
        this.sprayRadius = s;
        this.sprayDensity = Math.max(3, Math.round(s * 1.5));
        const group = document.querySelector('[data-subtoolbar="spray"]');
        if (group) {
            const btns = group.querySelectorAll('[data-action="setSpraySize"]');
            btns.forEach(btn => {
                const val = btn.getAttribute('data-size');
                btn.classList.toggle('active', val == s);
            });
        }
        if (typeof showMessage === 'function') {
            showMessage(`Spray ajustado a radio de ${s} px`, 'info');
        }
    },

    toggleOfflineDither() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');

        if (btnEraser) btnEraser.classList.remove('active');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);

        if (this.interactionMode === 'offline_dither') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.isDitherPainting = false;
            this.ditherLastCoords = null;
            if (btnDither) btnDither.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_dither_mode_off') || 'Modo Dithering desactivado.', 'info');
        } else {
            this.interactionMode = 'offline_dither';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            this.isDitherPainting = false;
            this.ditherLastCoords = null;
            if (btnDither) btnDither.classList.add('active');

            this.openSubtoolbar('dither');
            this.openBrushSizeToolbar('dither');

            const currentPattern = this.ditherPattern || 'checker_50';
            this.setDitherPattern(currentPattern, false);

            if (typeof showMessage === 'function') showMessage(window.__('msg_dither_mode_on') || 'Modo Dithering activado. Pinta sombras y texturas retro.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        this.requestRender();
    },

    setDitherPattern(pattern, notify = true) {
        this.ditherPattern = pattern || 'checker_50';
        const group = document.querySelector('[data-subtoolbar="dither"]');
        if (group) {
            const btns = group.querySelectorAll('[data-action="setDitherPattern"]');
            btns.forEach(btn => {
                const p = btn.getAttribute('data-dither-pattern');
                btn.classList.toggle('active', p === this.ditherPattern);
            });
        }
        if (notify && typeof showMessage === 'function') {
            const names = {
                'checker_50': 'Ajedrez 50%',
                'dots_25': 'Puntos 25%',
                'dots_75': 'Densidad 75%',
                'diag_lines': 'L├¡neas Diagonales',
                'h_lines': 'Scanlines Horizontales'
            };
            showMessage(`Trama seleccionada: ${names[pattern] || pattern}`, 'info');
        }
    },

    setDitherSize(size) {
        this.ditherSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setDitherSize"]');
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == this.ditherSize);
            });
        }
        if (typeof showMessage === 'function') {
            showMessage(`Brocha de dithering: ${this.ditherSize}x${this.ditherSize} px`, 'info');
        }
    },

    isDitherPixel(x, y, pattern = 'checker_50') {
        switch (pattern) {
            case 'checker_50':
                return (x + y) % 2 === 0;
            case 'dots_25':
                return (x % 2 === 0 && y % 2 === 0);
            case 'dots_75':
                return !(x % 2 === 1 && y % 2 === 1);
            case 'diag_lines':
                return ((x + y) % 3 === 0);
            case 'h_lines':
                return (y % 2 === 0);
            default:
                return (x + y) % 2 === 0;
        }
    },

    applyDitherAt(cx, cy, isStart = false) {
        const size = this.ditherSize || 1;
        const pattern = this.ditherPattern || 'checker_50';
        const color = this.currentColor;
        const half1 = Math.floor((size - 1) / 2);
        const half2 = Math.floor(size / 2);

        const minX = Math.max(0, cx - half1);
        const maxX = Math.min((this.boardWidth || 64) - 1, cx + half2);
        const minY = Math.max(0, cy - half1);
        const maxY = Math.min((this.boardHeight || 64) - 1, cy + half2);

        if (minX > maxX || minY > maxY) return;

        const pixelsToPaint = [];
        const bw = this.boardWidth || 64;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.isDitherPixel(x, y, pattern)) {
                    pixelsToPaint.push({ x, y, color });
                }
                if (this.isMirrorMode) {
                    const symX = bw - 1 - x;
                    if (symX >= 0 && symX < bw && symX !== x) {
                        if (this.isDitherPixel(symX, y, pattern)) {
                            pixelsToPaint.push({ x: symX, y, color });
                        }
                    }
                }
            }
        }

        if (pixelsToPaint.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPaint,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.fillStyle = color;
                pixelsToPaint.forEach(p => {
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                });
            }
        }
    },

    startSpray(x, y) {
        if (!this.isOfflineMode || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        this.isSpraying = true;
        this.sprayCenter = { x, y };

        this.fireSprayBurst(x, y);

        if (this.sprayTimer) clearInterval(this.sprayTimer);
        this.sprayTimer = setInterval(() => {
            if (this.isSpraying && this.sprayCenter) {
                this.fireSprayBurst(this.sprayCenter.x, this.sprayCenter.y);
            }
        }, 35);
    },

    updateSpray(x, y) {
        if (!this.isSpraying) return;
        this.sprayCenter = { x, y };
    },

    fireSprayBurst(centerX, centerY) {
        const radius = this.sprayRadius || 5;
        const density = this.sprayDensity || Math.max(3, Math.round(radius * 1.5));

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SPRAY_BURST',
                payload: {
                    centerX,
                    centerY,
                    radius,
                    density,
                    color: this.currentColor
                }
            });
        } else if (this.offscreenCtx) {
            const bw = this.boardWidth || 64;
            const bh = this.boardHeight || 64;
            if (!this._sprayDiffsMap) this._sprayDiffsMap = new Map();

            for (let i = 0; i < density; i++) {
                const theta = Math.random() * 2 * Math.PI;
                const r = Math.sqrt(Math.random()) * radius;
                const px = Math.round(centerX + r * Math.cos(theta));
                const py = Math.round(centerY + r * Math.sin(theta));

                if (px >= 0 && px < bw && py >= 0 && py < bh) {
                    const idx = py * bw + px;
                    const img = this.offscreenCtx.getImageData(px, py, 1, 1);
                    const prevVal = new Uint32Array(img.data.buffer)[0];
                    const nextVal = colorToAbgr(this.currentColor);
                    if (prevVal !== nextVal) {
                        if (!this._sprayDiffsMap.has(idx)) {
                            this._sprayDiffsMap.set(idx, { x: px, y: py, prev: prevVal, next: nextVal });
                        }
                        this.offscreenCtx.fillStyle = this.currentColor;
                        this.offscreenCtx.clearRect(px, py, 1, 1);
                        this.offscreenCtx.fillRect(px, py, 1, 1);
                    }
                }
            }
            this.requestRender();
        }
    },

    stopSpray() {
        if (!this.isSpraying && !this.sprayTimer) return;
        this.isSpraying = false;
        if (this.sprayTimer) {
            clearInterval(this.sprayTimer);
            this.sprayTimer = null;
        }
        this.sprayCenter = null;

        if (this.renderWorker) {
            this.renderWorker.postMessage({ type: 'SPRAY_END' });
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        } else if (this.offscreenCtx && this._sprayDiffsMap) {
            if (this._sprayDiffsMap.size > 0 && this.undoStack) {
                const diffs = Array.from(this._sprayDiffsMap.values());
                this.undoStack.push({ type: 'spray', diffs });
                this.redoStack = [];
                if (this.undoStack.length > 50) this.undoStack.shift();
            }
            this._sprayDiffsMap = null;
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
        }
    },

    executeOfflineBucket(startX, startY) {
        if (!this.isOfflineMode || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        if (startX < 0 || startX >= this.boardWidth || startY < 0 || startY >= this.boardHeight) return;

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'FLOOD_FILL',
                payload: {
                    startX,
                    startY,
                    color: this.currentColor,
                    isMirrorMode: !!this.isMirrorMode
                }
            });
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        } else if (this.offscreenCtx) {
            const bw = this.boardWidth || 64;
            const bh = this.boardHeight || 64;
            const imgData = this.offscreenCtx.getImageData(0, 0, bw, bh);
            const buf32 = new Uint32Array(imgData.data.buffer);
            const fillColor = colorToAbgr(this.currentColor);
            const diffs = [];

            const runFill = (sX, sY) => {
                const startIdx = sY * bw + sX;
                const targetColor = buf32[startIdx];
                if (targetColor === fillColor) return;

                const total = bw * bh;
                const queue = new Int32Array(total);
                let head = 0;
                let tail = 0;

                buf32[startIdx] = fillColor;
                diffs.push({ x: sX, y: sY, prev: targetColor, next: fillColor });
                queue[tail++] = startIdx;

                while (head < tail) {
                    const idx = queue[head++];
                    const cx = idx % bw;
                    const cy = (idx / bw) | 0;

                    if (cx > 0) {
                        const nIdx = idx - 1;
                        if (buf32[nIdx] === targetColor) {
                            buf32[nIdx] = fillColor;
                            diffs.push({ x: cx - 1, y: cy, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    if (cx < bw - 1) {
                        const nIdx = idx + 1;
                        if (buf32[nIdx] === targetColor) {
                            buf32[nIdx] = fillColor;
                            diffs.push({ x: cx + 1, y: cy, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    if (cy > 0) {
                        const nIdx = idx - bw;
                        if (buf32[nIdx] === targetColor) {
                            buf32[nIdx] = fillColor;
                            diffs.push({ x: cx, y: cy - 1, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    if (cy < bh - 1) {
                        const nIdx = idx + bw;
                        if (buf32[nIdx] === targetColor) {
                            buf32[nIdx] = fillColor;
                            diffs.push({ x: cx, y: cy + 1, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                }
            };

            runFill(startX, startY);
            if (this.isMirrorMode) {
                const symX = bw - 1 - startX;
                if (symX >= 0 && symX < bw && symX !== startX) {
                    runFill(symX, startY);
                }
            }

            this.offscreenCtx.putImageData(imgData, 0, 0);

            if (this.undoStack && diffs.length > 0) {
                this.undoStack.push({ type: 'flood_fill', diffs });
                this.redoStack = [];
                if (this.undoStack.length > 50) this.undoStack.shift();
            }

            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
        }
    }
};
