import { showMessage, hexToHsv, hsvToHex, updateRangeFill } from '../../../../core/utils/uiUtils.js';
import { getCanvasTier, getToolSizes, getSprayRadii, getTileGridLevels } from '../data/OfflineToolsData.js';
import { colorToAbgr, abgrToHex } from './InteractionHelpers.js';
import { generateShapePixels } from '../utils/GeometricShapesUtils.js';

export const InteractionDrawingTools = {
    async toggleEyedropper() {
        if (typeof window !== 'undefined' && 'EyeDropper' in window) {
            try {
                document.querySelectorAll('[data-action="toggleEyedropper"]').forEach(btn => btn.classList.add('active'));
                const eyeDropper = new window.EyeDropper();
                const result = await eyeDropper.open();
                if (result && result.sRGBHex) {
                    if (typeof this.selectAndAddCustomColor === 'function') {
                        this.selectAndAddCustomColor(result.sRGBHex);
                    }
                }
                document.querySelectorAll('[data-action="toggleEyedropper"]').forEach(btn => btn.classList.remove('active'));
            } catch (err) {
                document.querySelectorAll('[data-action="toggleEyedropper"]').forEach(btn => btn.classList.remove('active'));
            }
            return;
        }

        if (this.interactionMode === 'offline_eyedropper') {
            this.setInteractionMode('offline_brush');
            document.querySelectorAll('[data-action="toggleEyedropper"]').forEach(btn => btn.classList.remove('active'));
        } else {
            this.setInteractionMode('offline_eyedropper');
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'SET_TOOL',
                    payload: { tool: 'eyedropper' }
                });
            }
            document.querySelectorAll('[data-action="toggleEyedropper"]').forEach(btn => btn.classList.add('active'));
        }
        if (typeof this.updateTopPropertyBar === 'function') this.updateTopPropertyBar();
        this.requestRender();
    },

    updateTopPropertyBar(mode = null) {
        const currentMode = mode || this.interactionMode || 'normal';
        const iconEl = document.querySelector('[data-ref="prop-active-tool-icon"]');
        const titleEl = document.querySelector('[data-ref="prop-active-tool-title"]');

        const toolMeta = {
            offline_brush: { title: window.__('lbl_pencil'), icon: 'brush', context: 'offline_brush' },
            offline_eraser: { title: window.__('lbl_eraser'), icon: 'cleaning_services', context: 'offline_eraser' },
            offline_quick_shapes: { title: window.__('lbl_shapes_title'), icon: 'polyline', context: 'offline_quick_shapes' },
            offline_eyedropper: { title: window.__('lbl_eyedropper_title'), icon: 'colorize', context: null },
            offline_moving_area: { title: window.__('lbl_move_title'), icon: 'crop_free', context: 'offline_moving_area' },
            offline_bucket: { title: window.__('lbl_bucket_title'), icon: 'format_color_fill', context: 'offline_bucket' },
            offline_spray: { title: window.__('lbl_spray_title'), icon: 'grain', context: 'offline_spray' },
            offline_dither: { title: window.__('lbl_dither_title'), icon: 'texture', context: 'offline_dither' },
            offline_shading: { title: window.__('lbl_shading_title'), icon: 'exposure', context: 'offline_shading' },
            offline_text: { title: window.__('lbl_text_title'), icon: 'title', context: null },
            offline_seamless_tile: { title: window.__('lbl_seamless_title'), icon: 'repeat', context: null },
            normal: { title: window.__('lbl_nav_title'), icon: 'pan_tool', context: null }
        };

        const meta = toolMeta[currentMode] || toolMeta.normal;
        if (iconEl) iconEl.textContent = meta.icon;
        if (titleEl) titleEl.textContent = meta.title;

        document.querySelectorAll('.component-property-bar__group').forEach(group => {
            const groupContext = group.getAttribute('data-tool-context');
            if (meta.context && groupContext === meta.context) {
                group.classList.remove('disabled');
                group.classList.add('active');
            } else {
                group.classList.remove('active');
                group.classList.add('disabled');
            }
        });

        const sizeQuickGroup = document.querySelector('[data-ref="brush-size-quick-group"]');
        if (sizeQuickGroup) {
            const btns = sizeQuickGroup.querySelectorAll('[data-action="setBrushSize"]');
            btns.forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-size'), 10) === (this.brushSize || 1)));
        }

        const ppBtn = document.querySelector('[data-ref="prop-btn-pixel-perfect"]');
        if (ppBtn) ppBtn.classList.toggle('active', !!this.isPixelPerfect);

        const stabGroup = document.querySelector('[data-ref="brush-stabilizer-group"]');
        if (stabGroup) {
            const btns = stabGroup.querySelectorAll('[data-action="setStabilizerPreset"]');
            btns.forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-stabilizer'), 10) === (this.stabilizer || 0)));
        }

        const mirrorX = document.querySelector('[data-ref="prop-mirror-x"]');
        const mirrorY = document.querySelector('[data-ref="prop-mirror-y"]');
        if (mirrorX) mirrorX.classList.toggle('active', !!this.isMirrorX);
        if (mirrorY) mirrorY.classList.toggle('active', !!this.isMirrorY);

        if (this.topBarCarouselController && typeof this.topBarCarouselController.updateButtons === 'function') {
            setTimeout(() => this.topBarCarouselController.updateButtons(), 50);
        }

        if (typeof this.updateSidebarToolSettingsUI === 'function') {
            this.updateSidebarToolSettingsUI();
        }
    },

    updateSidebarToolSettingsUI() {
        const currentMode = this.interactionMode || 'normal';
        const toolMeta = {
            offline_brush: { title: window.__('lbl_pencil'), icon: 'brush', desc: window.__('lbl_brush_desc'), section: 'offline_brush' },
            offline_eraser: { title: window.__('lbl_eraser'), icon: 'cleaning_services', desc: window.__('lbl_eraser_desc'), section: 'offline_eraser' },
            offline_quick_shapes: { title: window.__('lbl_shapes_title'), icon: 'polyline', desc: window.__('lbl_shapes_desc'), section: 'offline_quick_shapes' },
            offline_eyedropper: { title: window.__('lbl_eyedropper_title'), icon: 'colorize', desc: window.__('lbl_eyedropper_desc'), section: null },
            offline_moving_area: { title: window.__('lbl_move_title'), icon: 'crop_free', desc: window.__('lbl_move_desc'), section: 'offline_moving_area' },
            offline_bucket: { title: window.__('lbl_bucket_title'), icon: 'format_color_fill', desc: window.__('lbl_bucket_desc'), section: 'offline_bucket' },
            offline_spray: { title: window.__('lbl_spray_title'), icon: 'grain', desc: window.__('lbl_spray_desc'), section: 'offline_spray' },
            offline_dither: { title: window.__('lbl_dither_title'), icon: 'texture', desc: window.__('lbl_dither_desc'), section: 'offline_dither' },
            offline_shading: { title: window.__('lbl_shading_title'), icon: 'exposure', desc: window.__('lbl_shading_desc'), section: 'offline_shading' },
            offline_text: { title: window.__('lbl_text_title'), icon: 'title', desc: window.__('lbl_text_desc'), section: null },
            offline_seamless_tile: { title: window.__('lbl_seamless_title'), icon: 'repeat', desc: window.__('lbl_seamless_desc'), section: null },
            normal: { title: window.__('lbl_nav_title'), icon: 'pan_tool', desc: window.__('lbl_nav_desc'), section: null }
        };

        const meta = toolMeta[currentMode] || toolMeta.normal;
        const iconEl = document.querySelector('[data-ref="sidebar-tool-icon"]');
        const titleEl = document.querySelector('[data-ref="sidebar-tool-title"]');
        const descEl = document.querySelector('[data-ref="sidebar-tool-desc"]');
        if (iconEl) iconEl.textContent = meta.icon;
        if (titleEl) titleEl.textContent = meta.title;
        if (descEl) descEl.textContent = meta.desc;

        document.querySelectorAll('.component-tool-settings-section').forEach(sec => {
            const secTool = sec.getAttribute('data-sidebar-tool-section');
            if (meta.section && secTool === meta.section) {
                sec.classList.remove('disabled');
            } else {
                sec.classList.add('disabled');
            }
        });

        // Sync brush size slider & number input
        const bSlider = document.querySelector('[data-ref="sidebar-brush-size-slider"]');
        const bNum = document.querySelector('[data-ref="sidebar-brush-size-number"]');
        const bVal = document.querySelector('[data-ref="sidebar-brush-size-val"]');
        const curSize = this.brushSize || 1;
        if (bSlider) {
            bSlider.value = curSize;
            updateRangeFill(bSlider);
        }
        if (bNum) bNum.value = curSize;
        if (bVal) bVal.textContent = `${curSize}px`;

        // Sync brush shape segmented buttons
        document.querySelectorAll('.component-tool-segmented-btn[data-brush-shape]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-brush-shape') === (this.brushShape || 'square'));
        });

        // Sync pixel-perfect toggle
        const sPP = document.querySelector('[data-ref="sidebar-btn-pixel-perfect"]');
        if (sPP) sPP.classList.toggle('active', !!this.isPixelPerfect);

        // Sync stabilizer slider & number input
        const stabSlider = document.querySelector('[data-ref="sidebar-stabilizer-slider"]');
        const stabNum = document.querySelector('[data-ref="sidebar-stabilizer-number"]');
        const stabVal = document.querySelector('[data-ref="sidebar-stabilizer-val"]');
        const curStab = this.stabilizer || 0;
        if (stabSlider) {
            stabSlider.value = curStab;
            updateRangeFill(stabSlider);
        }
        if (stabNum) stabNum.value = curStab;
        if (stabVal) stabVal.textContent = `${curStab}%`;

        // Sync mirror axes
        const mX = document.querySelector('[data-ref="sidebar-mirror-x"]');
        const mY = document.querySelector('[data-ref="sidebar-mirror-y"]');
        if (mX) mX.classList.toggle('active', !!this.isMirrorX);
        if (mY) mY.classList.toggle('active', !!this.isMirrorY);

        // Sync spray slider & number input
        const spraySlider = document.querySelector('[data-ref="sidebar-spray-slider"]');
        const sprayNum = document.querySelector('[data-ref="sidebar-spray-number"]');
        const sprayVal = document.querySelector('[data-ref="sidebar-spray-val"]');
        const spSize = this.spraySize || 5;
        if (spraySlider) {
            spraySlider.value = spSize;
            updateRangeFill(spraySlider);
        }
        if (sprayNum) sprayNum.value = spSize;
        if (sprayVal) sprayVal.textContent = `${spSize}px`;

        if (typeof this.updateSegmentedGliders === 'function') {
            this.updateSegmentedGliders();
        }
    },

    updateSegmentedGliders(root = document) {
        requestAnimationFrame(() => {
            const containers = root.querySelectorAll ? root.querySelectorAll('.component-tool-segmented, .component-tool-quick-chips') : [];
            containers.forEach(container => {
                const activeBtn = container.querySelector('.active');
                if (!activeBtn) {
                    container.style.setProperty('--glider-opacity', '0');
                    return;
                }
                const left = Math.max(0, activeBtn.offsetLeft - 2);
                const width = activeBtn.offsetWidth;
                if (width > 0) {
                    container.style.setProperty('--glider-opacity', '1');
                    container.style.setProperty('--glider-x', `${left}px`);
                    container.style.setProperty('--glider-width', `${width}px`);
                }
            });
        });
    },

    setBrushSizeRange(size) {
        this.setBrushSize(parseInt(size, 10) || 1);
    },

    setStabilizerRange(val) {
        this.stabilizer = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
        const stabSlider = document.querySelector('[data-ref="sidebar-stabilizer-slider"]');
        const stabNum = document.querySelector('[data-ref="sidebar-stabilizer-number"]');
        const stabVal = document.querySelector('[data-ref="sidebar-stabilizer-val"]');
        if (stabSlider) {
            stabSlider.value = this.stabilizer;
            updateRangeFill(stabSlider);
        }
        if (stabNum) stabNum.value = this.stabilizer;
        if (stabVal) stabVal.textContent = `${this.stabilizer}%`;
    },

    setSpraySizeRange(size) {
        const numSize = parseInt(size, 10) || 5;
        this.spraySize = numSize;
        if (typeof this.setSpraySize === 'function') {
            this.setSpraySize(numSize);
        }
        const spraySlider = document.querySelector('[data-ref="sidebar-spray-slider"]');
        const sprayNum = document.querySelector('[data-ref="sidebar-spray-number"]');
        const sprayVal = document.querySelector('[data-ref="sidebar-spray-val"]');
        if (spraySlider) {
            spraySlider.value = numSize;
            updateRangeFill(spraySlider);
        }
        if (sprayNum) sprayNum.value = numSize;
        if (sprayVal) sprayVal.textContent = `${numSize}px`;
        if (typeof this.updateSegmentedGliders === 'function') {
            this.updateSegmentedGliders();
        }
    },

    toggleOfflineMirrorAxis(axis = 'x') {
        if (axis === 'x') {
            this.isMirrorX = !this.isMirrorX;
        } else if (axis === 'y') {
            this.isMirrorY = !this.isMirrorY;
        }

        if (this.isMirrorX && this.isMirrorY) {
            if (typeof this.setOfflineMirrorMode === 'function') this.setOfflineMirrorMode('quad');
        } else if (this.isMirrorX) {
            if (typeof this.setOfflineMirrorMode === 'function') this.setOfflineMirrorMode('x');
        } else if (this.isMirrorY) {
            if (typeof this.setOfflineMirrorMode === 'function') this.setOfflineMirrorMode('y');
        } else {
            this.isMirrorMode = false;
        }

        this.updateTopPropertyBar();
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
        if (typeof this.updateTopPropertyBar === 'function') this.updateTopPropertyBar();
        this.requestRender();
    },

    setBrushShape(shape = 'square', targetEl = null) {
        this.brushShape = shape;
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const btns = subtoolbar.querySelectorAll('[data-action="setBrushShape"]');
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-brush-shape') === shape));
        }
        document.querySelectorAll('[data-action="setBrushShape"]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-brush-shape') === shape);
        });
        if (typeof this.updateSegmentedGliders === 'function') {
            this.updateSegmentedGliders();
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
        const bSlider = document.querySelector('[data-ref="sidebar-brush-size-slider"]');
        const bNum = document.querySelector('[data-ref="sidebar-brush-size-number"]');
        const bVal = document.querySelector('[data-ref="sidebar-brush-size-val"]');
        if (bSlider) {
            bSlider.value = this.brushSize;
            updateRangeFill(bSlider);
        }
        if (bNum) bNum.value = this.brushSize;
        if (bVal) bVal.textContent = `${this.brushSize}px`;

        if (typeof this.updateSegmentedGliders === 'function') {
            this.updateSegmentedGliders();
        }
        this.requestRender();
    },

    togglePixelPerfect() {
        this.isPixelPerfect = !this.isPixelPerfect;
        const btns = document.querySelectorAll('[data-ref="btn-brush-pixel-perfect"], [data-ref="prop-btn-pixel-perfect"], [data-action="togglePixelPerfect"]');
        btns.forEach(btn => btn.classList.toggle('active', !!this.isPixelPerfect));
        const msg = this.isPixelPerfect 
            ? window.__('msg_pixel_perfect_on')
            : window.__('msg_pixel_perfect_off');
        if (typeof showMessage === 'function') showMessage(msg, 'info');
    },

    filterPixelPerfectStroke(points) {
        if (!this.isPixelPerfect || (this.brushSize || 1) !== 1 || points.length < 3) {
            return points;
        }
        const result = [];
        let i = 0;
        while (i < points.length) {
            if (i > 0 && i < points.length - 1) {
                const p0 = points[i - 1];
                const p1 = points[i];
                const p2 = points[i + 1];
                const dx0 = p1.x - p0.x;
                const dy0 = p1.y - p0.y;
                const dx1 = p2.x - p1.x;
                const dy1 = p2.y - p1.y;
                if ((dx0 === 0 && dy1 === 0 && dy0 !== 0 && dx1 !== 0) ||
                    (dy0 === 0 && dx1 === 0 && dx0 !== 0 && dy1 !== 0)) {
                    if (Math.abs(p2.x - p0.x) === 1 && Math.abs(p2.y - p0.y) === 1) {
                        i++;
                        continue;
                    }
                }
            }
            result.push(points[i]);
            i++;
        }
        return result;
    },

    getSymmetryPoints(x, y, bw = 64, bh = 64) {
        const pts = [{ x, y }];
        if (!this.isMirrorMode) return pts;
        const axis = this.mirrorAxis || 'x';
        const symX = bw - 1 - x;
        const symY = bh - 1 - y;

        if (axis === 'x' || axis === 'quad') {
            if (symX >= 0 && symX < bw && symX !== x) {
                pts.push({ x: symX, y });
            }
        }
        if (axis === 'y' || axis === 'quad') {
            if (symY >= 0 && symY < bh && symY !== y) {
                pts.push({ x, y: symY });
            }
        }
        if (axis === 'quad') {
            if (symX >= 0 && symX < bw && symY >= 0 && symY < bh && (symX !== x || symY !== y)) {
                pts.push({ x: symX, y: symY });
            }
        }
        return pts;
    },

    toggleOfflineQuickShapes() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btn = document.querySelector('[data-ref="btn-offline-quick-shapes"]') || document.querySelector('[data-action="toggleOfflineQuickShapes"]');
        if (this.interactionMode === 'offline_quick_shapes') {
            this.interactionMode = 'normal';
            if (btn) btn.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
        } else {
            if (typeof this.cancelInteractionMode === 'function') {
                this.cancelInteractionMode();
            }
            this.interactionMode = 'offline_quick_shapes';
            if (!this.quickShapeType) this.quickShapeType = 'line';
            if (!this.quickShapeStroke) this.quickShapeStroke = 1;
            if (this.quickShapeFill === undefined) this.quickShapeFill = false;

            if (btn) btn.classList.add('active');
            this.openSubtoolbar('quickShapes');
            this.openBrushSizeToolbar('quickShapes');
        }
        this.requestRender();
    },

    setQuickShapeType(type = 'line', targetEl = null) {
        this.quickShapeType = type;
        document.querySelectorAll('[data-action="setQuickShapeType"]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-shape-type') === type);
        });
        if (typeof this.updateSegmentedGliders === 'function') {
            this.updateSegmentedGliders();
        }
        this.requestRender();
    },

    toggleQuickShapeFill(targetEl = null) {
        this.quickShapeFill = !this.quickShapeFill;
        document.querySelectorAll('[data-action="toggleQuickShapeFill"]').forEach(btn => {
            btn.classList.toggle('active', !!this.quickShapeFill);
        });
        this.requestRender();
    },

    setQuickShapeStroke(stroke = 1, targetEl = null) {
        this.quickShapeStroke = parseInt(stroke, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setQuickShapeStroke"]');
            btns.forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-size'), 10) === this.quickShapeStroke));
        }
        this.requestRender();
    },

    snapQuickShapeCoords(x0, y0, x1, y1, shapeType) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        if (dx === 0 && dy === 0) return { x: x1, y: y1 };

        if (shapeType === 'line') {
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const absAngle = Math.abs(angle);
            const signX = dx >= 0 ? 1 : -1;
            const signY = dy >= 0 ? 1 : -1;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (absAngle < 15 || absAngle > 165) {
                return { x: x1, y: y0 };
            } else if (absAngle > 75 && absAngle < 105) {
                return { x: x0, y: y1 };
            } else if ((absAngle >= 35 && absAngle <= 55) || (absAngle >= 125 && absAngle <= 145)) {
                const d = Math.max(absDx, absDy);
                return { x: x0 + signX * d, y: y0 + signY * d };
            } else if ((absAngle >= 15 && absAngle < 35) || (absAngle > 145 && absAngle <= 165)) {
                const dY = Math.round(absDx / 2);
                return { x: x1, y: y0 + signY * dY };
            } else if ((absAngle > 55 && absAngle <= 75) || (absAngle >= 105 && absAngle < 125)) {
                const dX = Math.round(absDy / 2);
                return { x: x0 + signX * dX, y: y1 };
            }
            return { x: x1, y: y1 };
        } else {
            const maxSide = Math.max(Math.abs(dx), Math.abs(dy));
            const signX = dx >= 0 ? 1 : -1;
            const signY = dy >= 0 ? 1 : -1;
            return { x: x0 + signX * maxSide, y: y0 + signY * maxSide };
        }
    },

    updateQuickShapePreview(isShift = false) {
        if (!this.isQuickShapeDrawing || !this.quickShapeStart || !this.quickShapeCurrent) {
            this.shapePreviewPixels = null;
            this.shapePreviewBox = null;
            this.requestRender();
            return;
        }

        const shapeType = this.quickShapeType || 'line';
        const isFill = !!this.quickShapeFill;
        const strokeWidth = this.quickShapeStroke || 1;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const x0 = this.quickShapeStart.x;
        const y0 = this.quickShapeStart.y;
        let x1 = this.quickShapeCurrent.x;
        let y1 = this.quickShapeCurrent.y;

        if (isShift) {
            const snapped = this.snapQuickShapeCoords(x0, y0, x1, y1, shapeType);
            x1 = Math.max(0, Math.min(bw - 1, snapped.x));
            y1 = Math.max(0, Math.min(bh - 1, snapped.y));
        }

        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;

        const points = generateShapePixels(shapeType, x0, y0, x1, y1, isFill, strokeWidth, bw, bh);
        const previewKeys = [];
        const seen = new Set();

        const addKey = (px, py) => {
            if (px >= 0 && px < bw && py >= 0 && py < bh) {
                const symPts = this.getSymmetryPoints(px, py, bw, bh);
                for (let s = 0; s < symPts.length; s++) {
                    const sp = symPts[s];
                    const key = (sp.y << 16) | (sp.x & 0xFFFF);
                    if (!seen.has(key)) {
                        seen.add(key);
                        previewKeys.push(key);
                    }
                }
            }
        };

        for (let i = 0; i < points.length; i++) {
            addKey(points[i].x, points[i].y);
        }

        this.shapePreviewPixels = previewKeys;
        this.shapePreviewBox = {
            shape: shapeType,
            x0, y0, x1, y1,
            minX, minY, maxX, maxY,
            w, h,
            isFill,
            strokeWidth,
            color: this.currentColor
        };

        if (typeof this.setCanvasBadge === 'function') {
            this.setCanvasBadge('coords', 'shapes', `${w} × ${h} px`, 'left');
        }
        this.requestRender();
    },

    commitQuickShapeDrawing(isShift = false) {
        if (!this.isQuickShapeDrawing || !this.quickShapeStart || !this.quickShapeCurrent) {
            this.isQuickShapeDrawing = false;
            this.quickShapeStart = null;
            this.quickShapeCurrent = null;
            this.shapePreviewPixels = null;
            this.shapePreviewBox = null;
            this.requestRender();
            return;
        }

        const shapeType = this.quickShapeType || 'line';
        const isFill = !!this.quickShapeFill;
        const strokeWidth = this.quickShapeStroke || 1;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const x0 = this.quickShapeStart.x;
        const y0 = this.quickShapeStart.y;
        let x1 = this.quickShapeCurrent.x;
        let y1 = this.quickShapeCurrent.y;

        if (isShift) {
            const snapped = this.snapQuickShapeCoords(x0, y0, x1, y1, shapeType);
            x1 = Math.max(0, Math.min(bw - 1, snapped.x));
            y1 = Math.max(0, Math.min(bh - 1, snapped.y));
        }

        const points = generateShapePixels(shapeType, x0, y0, x1, y1, isFill, strokeWidth, bw, bh);
        const pixelsToPaint = [];
        const color = this.currentColor || '#000000';
        const seen = new Set();

        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const symPts = this.getSymmetryPoints(pt.x, pt.y, bw, bh);
            for (let s = 0; s < symPts.length; s++) {
                const sp = symPts[s];
                const key = (sp.y << 16) | (sp.x & 0xFFFF);
                if (!seen.has(key)) {
                    seen.add(key);
                    pixelsToPaint.push({ x: sp.x, y: sp.y, color });
                }
            }
        }

        this.isQuickShapeDrawing = false;
        this.quickShapeStart = null;
        this.quickShapeCurrent = null;
        this.shapePreviewPixels = null;
        this.shapePreviewBox = null;

        if (pixelsToPaint.length > 0) {
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: {
                            pixels: pixelsToPaint,
                            strokePhase: 'single'
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
        }

        if (typeof this.setCanvasBadge === 'function') {
            this.setCanvasBadge('coords', 'shapes', null, 'left');
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
            showMessage(window.__('msg_shading_on'), 'info');
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
    },

    setShadingSize(size = 1, targetEl = null) {
        this.shadingSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setShadingSize"]');
            btns.forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-size'), 10) === this.shadingSize));
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
            showMessage(window.__('msg_tile_grid_off'), 'info');
        } else {
            const tpl = window.__('msg_tile_grid_on');
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
                const symPts = this.getSymmetryPoints(px, py, bw, bh);
                for (let s = 0; s < symPts.length; s++) {
                    const sp = symPts[s];
                    const k = (sp.y << 16) | sp.x;
                    if (!seen.has(k)) {
                        seen.add(k);
                        pixelsToPaint.push({ x: sp.x, y: sp.y, color });
                    }
                }
            }
        });

        if (pixelsToPaint.length === 0) return;

        if (isStart && this.isOfflineMode && typeof this.recordRecentColor === 'function') {
            this.recordRecentColor(color);
        }

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

        const filteredLine = (this.isPixelPerfect && size === 1) ? this.filterPixelPerfectStroke(line) : line;

        for (let i = 0; i < filteredLine.length; i++) {
            const pt = filteredLine[i];
            for (let j = 0; j < offsets.length; j++) {
                const off = offsets[j];
                const px = pt.x + off.dx;
                const py = pt.y + off.dy;
                if (px >= 0 && px < bw && py >= 0 && py < bh) {
                    const symPts = this.getSymmetryPoints(px, py, bw, bh);
                    for (let s = 0; s < symPts.length; s++) {
                        const sp = symPts[s];
                        const k = (sp.y << 16) | sp.x;
                        if (!seen.has(k)) {
                            seen.add(k);
                            pixelsToPaint.push({ x: sp.x, y: sp.y, color });
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
                    const symPts = this.getSymmetryPoints(x, y, bw, bh);
                    for (let s = 0; s < symPts.length; s++) {
                        const sp = symPts[s];
                        const k = (sp.y << 16) | sp.x;
                        if (!seen.has(k)) {
                            seen.add(k);
                            pixelsToErase.push({ x: sp.x, y: sp.y, color: 'transparent' });
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
                    const symPts = this.getSymmetryPoints(x, y, bw, bh);
                    for (let s = 0; s < symPts.length; s++) {
                        const sp = symPts[s];
                        if (this.isDitherPixel(sp.x, sp.y, pattern)) {
                            const k = (sp.y << 16) | sp.x;
                            if (!seen.has(k)) {
                                seen.add(k);
                                pixelsToPaint.push({ x: sp.x, y: sp.y, color });
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
        if (!this.mirrorAxis) this.mirrorAxis = 'x';
        const btnMirror = document.querySelector('[data-action="toggleOfflineMirror"]');
        if (btnMirror) {
            btnMirror.classList.toggle('active', !!this.isMirrorMode);
        }

        if (this.isMirrorMode) {
            this.openSubtoolbar('mirror');
            const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
            if (subtoolbar) {
                const btns = subtoolbar.querySelectorAll('[data-action="setOfflineMirrorMode"]');
                btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-mirror-axis') === (this.mirrorAxis || 'x')));
            }
        } else {
            this.closeSubtoolbar();
        }

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_MIRROR_MODE',
                payload: { isMirrorMode: this.isMirrorMode, mirrorAxis: this.mirrorAxis || 'x' }
            });
        }

        if (typeof showMessage === 'function') {
            showMessage(
                this.isMirrorMode 
                    ? window.__('msg_mirror_mode_on')
                    : window.__('msg_mirror_mode_off'),
                'info'
            );
        }

        this.requestRender();
    },

    setOfflineMirrorMode(axis = 'x', targetEl = null) {
        this.mirrorAxis = axis;
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const btns = subtoolbar.querySelectorAll('[data-action="setOfflineMirrorMode"]');
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-mirror-axis') === axis));
        }
        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_MIRROR_MODE',
                payload: { isMirrorMode: !!this.isMirrorMode, mirrorAxis: this.mirrorAxis }
            });
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

        if (name === 'brush') {
            const btns = subtoolbar.querySelectorAll('[data-action="setBrushShape"]');
            const currentShape = this.brushShape || 'square';
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-brush-shape') === currentShape));
            const btnPP = subtoolbar.querySelector('[data-ref="btn-brush-pixel-perfect"]') || subtoolbar.querySelector('[data-action="togglePixelPerfect"]');
            if (btnPP) btnPP.classList.toggle('active', !!this.isPixelPerfect);
        } else if (name === 'quickShapes') {
            const btns = subtoolbar.querySelectorAll('[data-action="setQuickShapeType"]');
            const currentType = this.quickShapeType || 'line';
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-shape-type') === currentType));
            const btnFill = subtoolbar.querySelector('[data-ref="btn-quick-shape-fill"]') || subtoolbar.querySelector('[data-action="toggleQuickShapeFill"]');
            if (btnFill) btnFill.classList.toggle('active', !!this.quickShapeFill);
        } else if (name === 'mirror') {
            const btns = subtoolbar.querySelectorAll('[data-action="setOfflineMirrorMode"]');
            const currentAxis = this.mirrorAxis || 'x';
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-mirror-axis') === currentAxis));
        } else if (name === 'bucket') {
            const btns = subtoolbar.querySelectorAll('[data-action="setOfflineBucketMode"]');
            const currentMode = this.offlineBucketMode || 'flood';
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-bucket-mode') === currentMode));
        } else if (name === 'eraser') {
            const btns = subtoolbar.querySelectorAll('[data-action="setOfflineEraserMode"]');
            const currentMode = this.offlineEraserMode || 'box';
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-eraser-mode') === currentMode));
        } else if (name === 'tilegrid') {
            const btns = subtoolbar.querySelectorAll('[data-action="setTileGridLevel"]');
            const current = this.tileGridSize || 0;
            btns.forEach(b => {
                const s = parseInt(b.getAttribute('data-grid-size'), 10) || 0;
                b.classList.toggle('active', s === current);
            });
        } else if (name === 'moveArea') {
            const btns = subtoolbar.querySelectorAll('[data-action="setSelectionMode"]');
            const currentMode = this.selectionMode || 'box';
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-selection-mode') === currentMode));
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
        } else if (forTool === 'quickShapes') {
            const btns = toolbar.querySelectorAll('[data-action="setQuickShapeStroke"]');
            const currentSize = this.quickShapeStroke || 1;
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
            if (typeof showMessage === 'function') showMessage(window.__('msg_eraser_mode_off'), 'info');
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

        document.querySelectorAll('[data-action="setOfflineEraserMode"]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-eraser-mode') === mode);
        });

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
        } else if (mode === 'color') {
            this.interactionMode = 'offline_eraser_brush';
            this.openBrushSizeToolbar('eraser');
        } else {
            this.interactionMode = 'offline_eraser_brush';
            this.openBrushSizeToolbar('eraser');
        }

        this.openSubtoolbar('eraser');
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        if (typeof this.updateSegmentedGliders === 'function') this.updateSegmentedGliders();
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
        const bh = this.boardHeight || 64;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const symPts = this.getSymmetryPoints(x, y, bw, bh);
                for (let s = 0; s < symPts.length; s++) {
                    const sp = symPts[s];
                    pixelsToErase.push({ x: sp.x, y: sp.y, color: 'transparent' });
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
            this.closeSubtoolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_bucket_mode_off'), 'info');
        } else {
            this.interactionMode = 'offline_bucket';
            if (!this.offlineBucketMode) this.offlineBucketMode = 'flood';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnBucket) btnBucket.classList.add('active');
            this.openSubtoolbar('bucket');
            const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
            if (subtoolbar) {
                const btns = subtoolbar.querySelectorAll('[data-action="setOfflineBucketMode"]');
                btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-bucket-mode') === (this.offlineBucketMode || 'flood')));
            }
        }
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        this.requestRender();
    },

    setOfflineBucketMode(mode = 'flood', targetEl = null) {
        this.offlineBucketMode = mode;
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const btns = subtoolbar.querySelectorAll('[data-action="setOfflineBucketMode"]');
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-bucket-mode') === mode));
        }
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
            if (typeof showMessage === 'function') showMessage(window.__('msg_spray_mode_off'), 'info');
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
            if (typeof showMessage === 'function') showMessage(window.__('msg_spray_mode_on'), 'info');
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
            if (typeof showMessage === 'function') showMessage(window.__('msg_dither_mode_off'), 'info');
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

            if (typeof showMessage === 'function') showMessage(window.__('msg_dither_mode_on'), 'info');
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

        const mode = this.offlineBucketMode || 'flood';

        if (mode === 'swap') {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'COLOR_SWAP',
                    payload: {
                        startX,
                        startY,
                        color: this.currentColor
                    }
                });
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isOfflineMode && typeof this.recordRecentColor === 'function') {
            this.recordRecentColor(this.currentColor);
        }

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
    },

    sampleColorAtExact(exactX, exactY) {
        if (this.templates && this.templates.length > 0) {
            for (let i = this.templates.length - 1; i >= 0; i--) {
                const tpl = this.templates[i];
                if (!tpl || (!tpl.img && !tpl.imageBitmap && !tpl.canvas)) continue;
                let px = exactX, py = exactY;
                if (tpl.angle) {
                    const cx = tpl.x + tpl.w / 2;
                    const cy = tpl.y + tpl.h / 2;
                    const rad = (-tpl.angle * Math.PI) / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    px = cos * (exactX - cx) - sin * (exactY - cy) + cx;
                    py = sin * (exactX - cx) + cos * (exactY - cy) + cy;
                }
                if (px >= tpl.x && px <= tpl.x + tpl.w && py >= tpl.y && py <= tpl.y + tpl.h) {
                    const u = (px - tpl.x) / tpl.w;
                    const v = (py - tpl.y) / tpl.h;
                    const source = tpl.canvas || tpl.img || tpl.imageBitmap;
                    const srcW = source.width || source.naturalWidth || tpl.w;
                    const srcH = source.height || source.naturalHeight || tpl.h;
                    const imgX = Math.max(0, Math.min(Math.floor(u * srcW), srcW - 1));
                    const imgY = Math.max(0, Math.min(Math.floor(v * srcH), srcH - 1));
                    
                    if (!this._sampleCanvas) {
                        this._sampleCanvas = document.createElement('canvas');
                        this._sampleCanvas.width = 1;
                        this._sampleCanvas.height = 1;
                        this._sampleCtx = this._sampleCanvas.getContext('2d', { willReadFrequently: true });
                    }
                    this._sampleCtx.clearRect(0, 0, 1, 1);
                    try {
                        this._sampleCtx.drawImage(source, imgX, imgY, 1, 1, 0, 0, 1, 1);
                        const pixel = this._sampleCtx.getImageData(0, 0, 1, 1).data;
                        if (pixel[3] > 10) {
                            return '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
                        }
                    } catch (e) {}
                }
            }
        }

        const bx = Math.floor(exactX);
        const by = Math.floor(exactY);
        if (this.offscreenCtx && bx >= 0 && bx < this.boardWidth && by >= 0 && by < this.boardHeight) {
            const img = this.offscreenCtx.getImageData(bx, by, 1, 1);
            const val = new Uint32Array(img.data.buffer)[0];
            if (val !== 0) return abgrToHex(val);
        }

        return (typeof this.isDarkMode === 'function' && this.isDarkMode()) ? '#1F2937' : '#FFFFFF';
    },

    toggleSeamlessTile() {
        if (!this.isOfflineMode) return;
        this.isSeamlessTileMode = !this.isSeamlessTileMode;

        const btnSeamless = document.querySelector('[data-action="toggleSeamlessTile"]');
        const btnSubToggle = document.querySelector('[data-ref="btn-seamless-sub-toggle"]');
        if (btnSeamless) btnSeamless.classList.toggle('active', !!this.isSeamlessTileMode);
        if (btnSubToggle) btnSubToggle.classList.toggle('active', !!this.isSeamlessTileMode);

        if (this.isSeamlessTileMode) {
            this.openSubtoolbar('seamlessTile');
        }

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_SEAMLESS_TILE_MODE',
                payload: { isSeamlessTileMode: !!this.isSeamlessTileMode }
            });
        }

        const msg = this.isSeamlessTileMode
            ? window.__('msg_seamless_tile_on')
            : window.__('msg_seamless_tile_off');
        if (typeof showMessage === 'function') showMessage(msg, 'info');

        this.requestRender();
    },

    shiftTileOffset(dx = null, dy = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const shiftX = dx !== null ? dx : Math.floor((this.boardWidth || 64) / 2);
        const shiftY = dy !== null ? dy : Math.floor((this.boardHeight || 64) / 2);

        this.renderWorker.postMessage({
            type: 'SHIFT_TILE_OFFSET',
            payload: {
                dx: shiftX,
                dy: shiftY,
                layerId: this.activeLayerId
            }
        });
    }
};
