import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export const DesignRender = {
    renderColorPalette(paletteId) {
        const palette = getPaletteById(paletteId);
        let container = document.querySelector('[data-ref="color-palette-grid"]');
        if (!container) return; 

        const emptyState = container.parentNode.querySelector('[data-ref="empty-state-rendered"]');
        container.innerHTML = '';

        if (!palette || !palette.colors || palette.colors.length === 0) {
            container.classList.remove('active'); container.classList.add('disabled');
            if (emptyState) {
                emptyState.classList.remove('disabled'); emptyState.classList.add('active');
                const emptyText = emptyState.querySelector('.component-empty-state-text');
                if (emptyText) emptyText.innerText = window.__('no_colors_available');
            }
            return;
        }

        container.classList.remove('disabled'); container.classList.add('active');
        if (emptyState) emptyState.classList.remove('active'); emptyState.classList.add('disabled');

        this.currentColor = palette.colors[0].hex;
        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
        }

        palette.colors.forEach((colorObj, index) => {
            const hex = colorObj.hex;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `component-color-btn ${index === 0 ? 'active' : ''}`;
            btn.setAttribute('data-action', 'selectColor');
            btn.setAttribute('data-color', hex);

            const colorName = typeof __ === 'function' ? __(colorObj.name_key) : colorObj.name_key;
            btn.setAttribute('data-tooltip', `${colorName} - ${hex.toUpperCase()}`);

            btn.style.setProperty('--color-val', hex);
            this.applyColorBorderStyle(btn, hex);

            container.appendChild(btn);
        });


        this.renderCustomPickedColors();
        this.updateActiveColorPreview();
        if (typeof this.renderShadingRamps === 'function') {
            this.renderShadingRamps(this.currentColor);
        }
        this.requestRender();
    },

    updateActiveColorPreview() {
        const preview = document.querySelector('[data-ref="active-color-preview"]');
        if (preview) {
            preview.style.backgroundColor = this.currentColor;
            preview.style.setProperty('--color-val', this.currentColor);
        }
    },


    syncActiveColorHighlight() {
        const currentUpper = this.currentColor ? this.currentColor.toUpperCase() : '';
        document.querySelectorAll('.component-color-btn:not(.component-color-btn--rainbow):not(.component-color-btn--eyedropper)').forEach(btn => {
            let btnColor = btn.getAttribute('data-color') || '';
            if (btnColor && !btnColor.startsWith('#')) btnColor = '#' + btnColor;
            btnColor = btnColor.toUpperCase();
            
            if (currentUpper && btnColor === currentUpper) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    renderCustomPickedColors() {
        const container = document.querySelector('[data-ref="recent-colors-container"]') || document.querySelector('[data-ref="custom-colors-container"]');
        if (!container) return;

        // Remove any previously rendered custom swatches in this container
        container.querySelectorAll('.component-color-btn--custom-picked').forEach(el => el.remove());

        const section = container.closest('[data-ref="recent-colors-section"]');
        if (section && this.isOfflineMode) {
            if (Array.isArray(this.customPickedColors) && this.customPickedColors.length > 0) {
                section.classList.remove('disabled');
                section.classList.add('active');
            } else {
                section.classList.remove('active');
                section.classList.add('disabled');
            }
        }

        // Append buttons for each color in customPickedColors
        if (Array.isArray(this.customPickedColors)) {
            this.customPickedColors.forEach(hex => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'component-color-btn component-color-btn--custom-picked';
                btn.setAttribute('data-action', 'selectColor');
                btn.setAttribute('data-color', hex);
                btn.setAttribute('data-tooltip', hex.toUpperCase());

                btn.style.setProperty('--color-val', hex);
                this.applyColorBorderStyle(btn, hex);

                container.appendChild(btn);
            });
        }

        this.syncActiveColorHighlight();
    },

    isDarkMode() {
        const html = document.documentElement;
        const body = document.body;
        return html.classList.contains('dark-theme') || 
               html.classList.contains('dark') || 
               html.getAttribute('data-theme') === 'dark' ||
               body.classList.contains('dark-theme') || 
               body.classList.contains('dark') || 
               body.getAttribute('data-theme') === 'dark';
    },

    /**
     * Calcula la luminancia relativa (0 = negro, 1 = blanco) de un color HEX.
     * Usa el estándar WCAG para la transformación sRGB → lineal.
     */
    getColorLuminance(hex) {
        if (!hex || typeof hex !== 'string') return 0.5;
        const clean = hex.replace(/^#/, '');
        let r, g, b;
        if (clean.length === 3) {
            r = parseInt(clean[0] + clean[0], 16);
            g = parseInt(clean[1] + clean[1], 16);
            b = parseInt(clean[2] + clean[2], 16);
        } else if (clean.length === 6) {
            r = parseInt(clean.substring(0, 2), 16);
            g = parseInt(clean.substring(2, 4), 16);
            b = parseInt(clean.substring(4, 6), 16);
        } else {
            return 0.5;
        }
        const toLinear = c => {
            const s = c / 255;
            return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    },

    /**
     * Aplica un borde adaptativo al elemento según la luminancia del color.
     *
     * Agrega/quita únicamente clases CSS:
     *   .color-btn--extreme-dark  (luminancia < 0.08)
     *   .color-btn--extreme-light (luminancia > 0.80)
     *
     * Los selectores CSS manejan el contexto de tema (.dark-theme, [data-theme="dark"]…)
     * sin necesidad de detectar el tema en JS ni usar variables inline.
     *
     * El parámetro indicatorOnly ya no es necesario: los selectores CSS distinguen
     * entre .component-color-btn y .component-color-indicator automáticamente.
     */
    applyColorBorderStyle(element, hex) {
        if (!element || !hex) return;
        const luminance = this.getColorLuminance(hex);

        element.classList.remove('color-btn--extreme-dark', 'color-btn--extreme-light');

        if (luminance < 0.08) {
            element.classList.add('color-btn--extreme-dark');
        } else if (luminance > 0.80) {
            element.classList.add('color-btn--extreme-light');
        }
    },

    

    requestRender() {
        if (this.renderWorker) {
            if (this._workerRenderPending) return;
            this._workerRenderPending = true;

            requestAnimationFrame(() => {
                this._workerRenderPending = false;
                if (typeof this.positionTemplateToolbar === 'function') {
                    this.positionTemplateToolbar();
                }
                if (typeof this.updateMoveAreaFloatingToolbar === 'function') {
                    this.updateMoveAreaFloatingToolbar();
                }
                if (!this.renderWorker) return;

                const selArray = this.selectedPixels ? Array.from(this.selectedPixels) : [];
                const hoverKey = this.hoveredPixel ? (((this.hoveredPixel.y & 0xFFFF) << 16) | (this.hoveredPixel.x & 0xFFFF)) : -1;
                const isOwnerProtecting = (this.interactionMode === 'owner_protecting');
                
                const topBar = document.querySelector('.general-content-top');
                const canvasEl = this.canvas;
                let topBarCenterX = 0;
                let topBarBottomY = 0;
                if (topBar && canvasEl) {
                    const topBarRect = topBar.getBoundingClientRect();
                    const canvasRect = canvasEl.getBoundingClientRect();
                    topBarCenterX = topBarRect.left + topBarRect.width / 2 - canvasRect.left;
                    topBarBottomY = topBarRect.bottom - canvasRect.top;
                }

                const isPlacingMines = (this.interactionMode === 'placing_mines');
                
                this.renderWorker.postMessage({
                    type: 'UPDATE_RENDER_STATE',
                    payload: {
                        transform: this.transform,
                        isDarkMode: this.isDarkMode(),
                        currentColor: this.currentColor,
                        isSpectator: this.isSpectator,
                        isResetLocked: this.isResetLocked,
                        isFrozen: this.isFrozen,
                        isOwner: this.isOwner,
                        isOwnerProtecting: isOwnerProtecting,
                        isPlacingMines: isPlacingMines,
                        selectedPixels: selArray,
                        hoveredPixelKey: hoverKey,
                        ownerEraserBox: this.ownerEraserBox || null,
                        moveAreaBox: this.moveAreaBox || null,
                        shapePreviewPixels: this.shapePreviewPixels || null,
                        textPreviewPixels: this.textPreviewPixels || null,
                        textPreviewShadow: this.textPreviewShadow || null,
                        textPreviewOutline: this.textPreviewOutline || null,
                        textPreviewBox: this.textPreviewBox || null,
                        interactionMode: this.interactionMode || 'normal',
                        textPosition: this.textPosition || null,
                        activePixelText: this.activePixelText || null,
                        isMirrorMode: !!this.isMirrorMode,
                        isEyedropperActive: (this.interactionMode === 'offline_eyedropper'),
                        tileGridSize: this.tileGridSize || 0,
                        brushSize: (this.interactionMode === 'offline_brush') ? (this.brushSize || 1) : 1,
                        brushShape: (this.interactionMode === 'offline_brush') ? (this.brushShape || 'square') : 'square',
                        topBarCenterX: topBarCenterX,
                        topBarBottomY: topBarBottomY
                    }
                });

                if (this.templates && this.templates.length > 0) {
                    const templatesPayload = this.templates.map(tpl => {
                        if (!tpl.imageBitmap && tpl.img && tpl.img.complete && tpl.img.naturalWidth > 0 && !tpl._isFetchingBitmap) {
                            tpl._isFetchingBitmap = true;
                            createImageBitmap(tpl.img).then(bmp => {
                                tpl.imageBitmap = bmp;
                                tpl._bitmapSentToWorker = false;
                                this.requestRender();
                            }).catch(() => {}).finally(() => { tpl._isFetchingBitmap = false; });
                        }

                        const sendBitmap = !tpl._bitmapSentToWorker && tpl.imageBitmap ? tpl.imageBitmap : null;
                        if (sendBitmap) {
                            tpl._bitmapSentToWorker = true;
                        }
                        return {
                            id: tpl.id,
                            url: tpl.url || tpl.src || (tpl.img ? tpl.img.src : ''),
                            x: tpl.x,
                            y: tpl.y,
                            w: tpl.w,
                            h: tpl.h,
                            angle: tpl.angle || 0,
                            opacity: tpl.opacity !== undefined ? tpl.opacity : 0.5,
                            locked: !!tpl.locked,
                            imageBitmap: sendBitmap
                        };
                    });

                    try {
                        this.renderWorker.postMessage({
                            type: 'UPDATE_TEMPLATES',
                            payload: {
                                activeTemplateId: this.activeTemplateId,
                                templates: templatesPayload
                            }
                        });
                    } catch (err) {
                        const safePayload = this.templates.map(tpl => ({
                            id: tpl.id,
                            x: tpl.x,
                            y: tpl.y,
                            w: tpl.w,
                            h: tpl.h,
                            angle: tpl.angle || 0,
                            opacity: tpl.opacity !== undefined ? tpl.opacity : 0.5,
                            locked: !!tpl.locked,
                            imageBitmap: null
                        }));
                        try {
                            this.renderWorker.postMessage({
                                type: 'UPDATE_TEMPLATES',
                                payload: {
                                    activeTemplateId: this.activeTemplateId,
                                    templates: safePayload
                                }
                            });
                        } catch (e2) {}
                    }
                } else {
                    this.renderWorker.postMessage({
                        type: 'UPDATE_TEMPLATES',
                        payload: { activeTemplateId: null, templates: [] }
                    });
                }
            });
            return;
        }

        if (!this.needsRender) {
            this.needsRender = true;
            this.animationFrameId = requestAnimationFrame(this.renderBound);
        }
    },

    syncProtectedPixelsToWorker() {
        if (!this.renderWorker) return;
        const protArray = this.protectedPixels ? Array.from(this.protectedPixels) : [];
        const ownerProtArray = this.ownerProtectedPixels ? Array.from(this.ownerProtectedPixels) : [];
        const myProtArray = this.myProtectedPixels ? Array.from(this.myProtectedPixels) : [];
        this.renderWorker.postMessage({
            type: 'UPDATE_PROTECTED_PIXELS',
            payload: {
                protectedPixels: protArray,
                ownerProtectedPixels: ownerProtArray,
                myProtectedPixels: myProtArray,
                showMyProtectionsHighlight: !!this.showMyProtectionsHighlight
            }
        });
    },

    syncMinesToWorker() {
        if (!this.renderWorker) return;
        const minesArray = this.myMines ? Array.from(this.myMines) : [];
        const isPlacingMines = (this.interactionMode === 'placing_mines');
        this.renderWorker.postMessage({
            type: 'UPDATE_MY_MINES',
            payload: {
                myMines: minesArray,
                isPlacingMines: isPlacingMines
            }
        });
    },

    render() {
        this.needsRender = false;
        if (!this.ctx || !this.canvas) return;

        if (this.pixelQueue && this.pixelQueue.length > 0 && this.offscreenCtx && this.boardWidth > 0 && this.boardHeight > 0) {
            try {
                const len = this.pixelQueue.length;
                if (len === 1) {
                    const p = this.pixelQueue.pop();
                    const x = p.x;
                    const y = p.y;
                    if (x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight) {
                        const color = p.color;
                        if (color === 'transparent' || color === 255) {
                            this.offscreenCtx.clearRect(x, y, 1, 1);
                        } else if (typeof color === 'string') {
                            this.offscreenCtx.fillStyle = color;
                            this.offscreenCtx.clearRect(x, y, 1, 1);
                            this.offscreenCtx.fillRect(x, y, 1, 1);
                        }
                    }
                } else {
                    const colorGroups = new Map();
                    while (this.pixelQueue.length > 0) {
                        const p = this.pixelQueue.pop();
                        const x = p.x;
                        const y = p.y;
                        if (isNaN(x) || isNaN(y) || x < 0 || x >= this.boardWidth || y < 0 || y >= this.boardHeight) {
                            continue;
                        }
                        const color = p.color;
                        let group = colorGroups.get(color);
                        if (!group) {
                            group = [];
                            colorGroups.set(color, group);
                        }
                        group.push(x, y);
                    }

                    colorGroups.forEach((coords, color) => {
                        if (color === 'transparent' || color === 255) {
                            for (let i = 0; i < coords.length; i += 2) {
                                this.offscreenCtx.clearRect(coords[i], coords[i + 1], 1, 1);
                            }
                        } else if (typeof color === 'string') {
                            this.offscreenCtx.fillStyle = color;
                            for (let i = 0; i < coords.length; i += 2) {
                                this.offscreenCtx.clearRect(coords[i], coords[i + 1], 1, 1);
                                this.offscreenCtx.fillRect(coords[i], coords[i + 1], 1, 1);
                            }
                        }
                    });
                }
            } catch (e) {
                this.pixelQueue.length = 0;
            }
        }

        const isDark = this.isDarkMode();
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
        const activeColor = this.currentColor; 

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr);
        
        this.ctx.translate(this.transform.x, this.transform.y);
        this.ctx.scale(this.transform.scale, this.transform.scale);
        
        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);
        
        if (this.transform.scale > 4) {
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.strokeStyle = gridColor; 
            this.ctx.beginPath();
            
            const rect = this.canvas.getBoundingClientRect();
            
            const startX = Math.max(0, Math.floor(-this.transform.x / this.transform.scale));
            const startY = Math.max(0, Math.floor(-this.transform.y / this.transform.scale));
            const endX = Math.min(this.boardWidth, Math.ceil((rect.width - this.transform.x) / this.transform.scale));
            const endY = Math.min(this.boardHeight, Math.ceil((rect.height - this.transform.y) / this.transform.scale));

            for (let x = startX; x <= endX; x++) {
                this.ctx.moveTo(x, startY);
                this.ctx.lineTo(x, endY);
            }
            for (let y = startY; y <= endY; y++) {
                this.ctx.moveTo(startX, y);
                this.ctx.lineTo(endX, y);
            }
            this.ctx.stroke();
        }

        if (this.offscreenCanvas && this.offscreenCanvas.width > 0 && this.offscreenCanvas.height > 0) {
            this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        }

        if (this.tileGridSize > 0 && this.boardWidth > 0 && this.boardHeight > 0) {
            const screenStep = this.tileGridSize * this.transform.scale;
            if (screenStep >= 3.5 && this.canvas) {
                const dpr = this.dpr || 1;
                const canvasWidthCss = this.canvas.width / dpr;
                const canvasHeightCss = this.canvas.height / dpr;
                const visibleMinX = Math.max(0, Math.floor((-this.transform.x) / this.transform.scale));
                const visibleMaxX = Math.min(this.boardWidth, Math.ceil((canvasWidthCss - this.transform.x) / this.transform.scale));
                const visibleMinY = Math.max(0, Math.floor((-this.transform.y) / this.transform.scale));
                const visibleMaxY = Math.min(this.boardHeight, Math.ceil((canvasHeightCss - this.transform.y) / this.transform.scale));

                if (visibleMinX < visibleMaxX && visibleMinY < visibleMaxY) {
                    this.ctx.save();
                    this.ctx.lineWidth = Math.max(1 / this.transform.scale, 1.5 / this.transform.scale);
                    this.ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.7)' : 'rgba(79, 70, 229, 0.6)';
                    this.ctx.setLineDash([3 / this.transform.scale, 2 / this.transform.scale]);
                    this.ctx.beginPath();

                    const startX = Math.max(this.tileGridSize, Math.floor(visibleMinX / this.tileGridSize) * this.tileGridSize);
                    for (let x = startX; x < visibleMaxX && x < this.boardWidth; x += this.tileGridSize) {
                        this.ctx.moveTo(x, visibleMinY);
                        this.ctx.lineTo(x, visibleMaxY);
                    }
                    const startY = Math.max(this.tileGridSize, Math.floor(visibleMinY / this.tileGridSize) * this.tileGridSize);
                    for (let y = startY; y < visibleMaxY && y < this.boardHeight; y += this.tileGridSize) {
                        this.ctx.moveTo(visibleMinX, y);
                        this.ctx.lineTo(visibleMaxX, y);
                    }
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        }

        if (this.templates && this.templates.length > 0 && !this.isResetLocked) {
            this.templates.forEach(tpl => {
                if (!tpl || (!tpl.img && !tpl.imageBitmap)) return;
                if (tpl.id !== this.activeTemplateId) return;
                this.ctx.save();
                this.ctx.globalAlpha = tpl.opacity !== undefined ? tpl.opacity : 0.5;
                
                const cx = Math.round(tpl.x + tpl.w / 2);
                const cy = Math.round(tpl.y + tpl.h / 2);
                this.ctx.translate(cx, cy);
                if (tpl.angle) {
                    this.ctx.rotate((tpl.angle * Math.PI) / 180);
                }
                const hw = Math.round(tpl.w / 2);
                const hh = Math.round(tpl.h / 2);
                
                this.ctx.imageSmoothingEnabled = false;
                const sourceImg = tpl.imageBitmap || tpl.img;
                if (sourceImg) {
                    this.ctx.drawImage(sourceImg, -hw, -hh, tpl.w, tpl.h);
                }

                if (tpl.id === this.activeTemplateId && !tpl.locked) {
                    this.ctx.strokeStyle = '#2196F3';
                    this.ctx.lineWidth = 2 / this.transform.scale;
                    this.ctx.strokeRect(-hw, -hh, tpl.w, tpl.h);
                    
                    const handleSize = 8 / this.transform.scale;
                    this.ctx.fillStyle = '#FFFFFF';
                    const handles = [
                        [-hw, -hh],
                        [hw, -hh],
                        [-hw, hh],
                        [hw, hh]
                    ];
                    handles.forEach(([hx, hy]) => {
                        this.ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
                        this.ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
                    });
                }
                this.ctx.restore();
            });
        }
        
        if (typeof this.positionTemplateToolbar === 'function') {
            this.positionTemplateToolbar();
        }
        if (typeof this.updateMoveAreaFloatingToolbar === 'function') {
            this.updateMoveAreaFloatingToolbar();
        }

        if (this.shapePreviewBox || (this.shapePreviewPixels && this.shapePreviewPixels.length > 0)) {
            this.ctx.save();
            if (this.shapePreviewPixels && this.shapePreviewPixels.length > 0) {
                this.ctx.fillStyle = this.currentColor;
                for (let i = 0; i < this.shapePreviewPixels.length; i++) {
                    const key = this.shapePreviewPixels[i];
                    const px = key & 0xFFFF;
                    const py = key >> 16;
                    if (px >= 0 && px < this.boardWidth && py >= 0 && py < this.boardHeight) {
                        this.ctx.fillRect(px, py, 1, 1);
                    }
                }
            } else if (this.shapePreviewBox && this.shapePreviewBox.pathD) {
                const { pathD, minX, minY, w, h, isFill, strokeWidth, color } = this.shapePreviewBox;
                let basePath = typeof Path2D !== 'undefined' ? new Path2D(pathD) : null;
                if (basePath) {
                    let pathObj = basePath;
                    if (typeof DOMMatrix !== 'undefined') {
                        const matrix = new DOMMatrix([w / 48, 0, 0, h / 48, 0, 0]);
                        const transformedPath = new Path2D();
                        transformedPath.addPath(basePath, matrix);
                        pathObj = transformedPath;
                    }

                    const drawVector = (ox, oy) => {
                        this.ctx.save();
                        this.ctx.translate(ox, oy);
                        if (isFill) {
                            this.ctx.fillStyle = color || this.currentColor;
                            this.ctx.fill(pathObj, 'evenodd');
                        } else {
                            this.ctx.strokeStyle = color || this.currentColor;
                            this.ctx.lineWidth = Math.max(1, strokeWidth || 1);
                            this.ctx.stroke(pathObj);
                        }
                        this.ctx.restore();
                    };

                    drawVector(minX, minY);
                    if (this.isMirrorMode) {
                        const symMinX = this.boardWidth - 1 - (minX + w - 1);
                        if (symMinX >= 0 && symMinX < this.boardWidth) {
                            drawVector(symMinX, minY);
                        }
                    }
                }
            }

            if (this.shapePreviewBox) {
                const { minX, minY, maxX, maxY, w, h, x0, y0, x1, y1 } = this.shapePreviewBox;

                this.ctx.strokeStyle = '#f59e0b';
                this.ctx.lineWidth = 1 / this.transform.scale;
                this.ctx.setLineDash([3 / this.transform.scale, 3 / this.transform.scale]);
                this.ctx.strokeRect(minX, minY, w, h);

                if (this.isMirrorMode) {
                    const symMinX = this.boardWidth - 1 - maxX;
                    if (symMinX >= 0 && symMinX < this.boardWidth) {
                        this.ctx.strokeRect(symMinX, minY, w, h);
                    }
                }

                this.ctx.setLineDash([]);
                this.ctx.fillStyle = '#f59e0b';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1 / this.transform.scale;
                const handleR = Math.max(0.6, 2.5 / this.transform.scale);

                this.ctx.beginPath();
                this.ctx.arc(x0 + 0.5, y0 + 0.5, handleR, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(x1 + 0.5, y1 + 0.5, handleR, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                if (this.isMirrorMode) {
                    const symX0 = this.boardWidth - 1 - x0;
                    const symX1 = this.boardWidth - 1 - x1;
                    this.ctx.beginPath();
                    this.ctx.arc(symX0 + 0.5, y0 + 0.5, handleR, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.arc(symX1 + 0.5, y1 + 0.5, handleR, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                }
            }

            this.ctx.restore();
        }

        if (this.interactionMode === 'offline_text' && this.textPosition) {
            this.ctx.save();

            if (this.textPreviewShadow && this.textPreviewShadow.length > 0) {
                this.ctx.fillStyle = '#404040';
                for (let i = 0; i < this.textPreviewShadow.length; i++) {
                    const key = this.textPreviewShadow[i];
                    const px = key & 0xFFFF;
                    const py = key >> 16;
                    if (px >= 0 && px < this.boardWidth && py >= 0 && py < this.boardHeight) {
                        this.ctx.fillRect(px, py, 1, 1);
                    }
                }
            }

            if (this.textPreviewOutline && this.textPreviewOutline.length > 0) {
                this.ctx.fillStyle = '#000000';
                for (let i = 0; i < this.textPreviewOutline.length; i++) {
                    const key = this.textPreviewOutline[i];
                    const px = key & 0xFFFF;
                    const py = key >> 16;
                    if (px >= 0 && px < this.boardWidth && py >= 0 && py < this.boardHeight) {
                        this.ctx.fillRect(px, py, 1, 1);
                    }
                }
            }

            if (this.textPreviewPixels && this.textPreviewPixels.length > 0) {
                this.ctx.fillStyle = this.currentColor;
                for (let i = 0; i < this.textPreviewPixels.length; i++) {
                    const key = this.textPreviewPixels[i];
                    const px = key & 0xFFFF;
                    const py = key >> 16;
                    if (px >= 0 && px < this.boardWidth && py >= 0 && py < this.boardHeight) {
                        this.ctx.fillRect(px, py, 1, 1);
                    }
                }
            }

            // Vertical Blinking Caret matching the selected font and scale
            const isCaretVisible = (Math.floor(Date.now() / 500) % 2 === 0);
            if (isCaretVisible) {
                const scale = this.activePixelText?.scale || 1;
                const fontHeights = { 'mini_3x5': 5, 'arcade_5x7': 7, 'cyber_6x8': 8 };
                const fontH = (fontHeights[this.activePixelText?.fontId] || 7) * scale;

                let caretX = (this.textPreviewBox && this.textPreviewBox.cursorX !== undefined) 
                    ? this.textPreviewBox.cursorX 
                    : (this.textPosition ? this.textPosition.x : 0);
                let caretY = this.textPosition ? this.textPosition.y : 0;

                if (caretX >= 0 && caretX < this.boardWidth && caretY >= 0 && caretY < this.boardHeight) {
                    this.ctx.fillStyle = this.currentColor || '#ffffff';
                    this.ctx.fillRect(caretX, caretY, 1, Math.min(fontH, this.boardHeight - caretY));

                    if (this.isMirrorMode) {
                        const symCaretX = this.boardWidth - 1 - caretX;
                        if (symCaretX >= 0 && symCaretX < this.boardWidth) {
                            this.ctx.fillRect(symCaretX, caretY, 1, Math.min(fontH, this.boardHeight - caretY));
                        }
                    }
                }
            }

            if (this.textPreviewBox && this.activePixelText?.text && this.activePixelText.text.length > 0 && this.textPreviewBox.w > 0) {
                const { minX, minY, maxX, maxY, w, h } = this.textPreviewBox;

                this.ctx.strokeStyle = '#8b5cf6';
                this.ctx.lineWidth = 1 / this.transform.scale;
                this.ctx.setLineDash([2 / this.transform.scale, 2 / this.transform.scale]);
                this.ctx.strokeRect(minX - 0.5, minY - 0.5, w + 1, h + 1);

                if (this.isMirrorMode) {
                    const symMinX = this.boardWidth - 1 - maxX;
                    if (symMinX >= 0 && symMinX < this.boardWidth) {
                        this.ctx.strokeRect(symMinX - 0.5, minY - 0.5, w + 1, h + 1);
                    }
                }
                this.ctx.setLineDash([]);
            }

            this.ctx.restore();
        }

        const selCount = this.selectedPixels ? this.selectedPixels.size : 0;
        const hasHover = this.hoveredPixel && !this.isSpectator && !this.isResetLocked;

        if ((selCount > 0 || hasHover) && !this.isSpectator && !this.isResetLocked && this.boardWidth > 0 && this.boardHeight > 0) {
            this.ctx.strokeStyle = activeColor; 
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.beginPath();
            
            const totalPixels = this.boardWidth * this.boardHeight;
            if (this._selectionBitmaskDirty || !this._selectedBitmask || this._selectedBitmask.length !== totalPixels) {
                if (!this._selectedBitmask || this._selectedBitmask.length !== totalPixels) {
                    this._selectedBitmask = new Uint8Array(totalPixels);
                } else {
                    this._selectedBitmask.fill(0);
                }

                if (selCount > 0) {
                    this.selectedPixels.forEach(key => {
                        const x = key & 0xFFFF;
                        const y = key >> 16;
                        if (x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight) {
                            this._selectedBitmask[y * this.boardWidth + x] = 1;
                        }
                    });
                }

                if (hasHover) {
                    const hx = this.hoveredPixel.x;
                    const hy = this.hoveredPixel.y;
                    if (hx >= 0 && hx < this.boardWidth && hy >= 0 && hy < this.boardHeight) {
                        this._selectedBitmask[hy * this.boardWidth + hx] = 1;
                    }
                }
                this._selectionBitmaskDirty = false;
            }

            const drawContour = (key) => {
                const x = key & 0xFFFF;
                const y = key >> 16;
                if (x < 0 || x >= this.boardWidth || y < 0 || y >= this.boardHeight) return;

                const idx = y * this.boardWidth + x;
                const hasTop = y > 0 && this._selectedBitmask[idx - this.boardWidth] === 1;
                const hasBottom = y < this.boardHeight - 1 && this._selectedBitmask[idx + this.boardWidth] === 1;
                const hasLeft = x > 0 && this._selectedBitmask[idx - 1] === 1;
                const hasRight = x < this.boardWidth - 1 && this._selectedBitmask[idx + 1] === 1;

                if (!hasTop) { this.ctx.moveTo(x, y); this.ctx.lineTo(x + 1, y); }
                if (!hasBottom) { this.ctx.moveTo(x, y + 1); this.ctx.lineTo(x + 1, y + 1); }
                if (!hasLeft) { this.ctx.moveTo(x, y); this.ctx.lineTo(x, y + 1); }
                if (!hasRight) { this.ctx.moveTo(x + 1, y); this.ctx.lineTo(x + 1, y + 1); }
            };

            if (selCount > 0) {
                this.selectedPixels.forEach(key => drawContour(key));
            }
            if (hasHover) {
                const hoverKey = (this.hoveredPixel.y << 16) | this.hoveredPixel.x;
                drawContour(hoverKey);
            }
            this.ctx.stroke();
        }

        this.ctx.restore();

        if (this.interactionMode === 'offline_eyedropper' && this.hoveredPixel) {
            this.drawEyedropperLoupe(this.ctx);
        }
    },

    drawEyedropperLoupe(ctx) {
        if (!this.hoveredPixel || !ctx) return;
        const hx = this.hoveredPixel.x;
        const hy = this.hoveredPixel.y;

        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.scale(dpr, dpr);

        const screenX = this.transform.x + (hx + 0.5) * this.transform.scale;
        const screenY = this.transform.y + (hy + 0.5) * this.transform.scale;

        const gridRadius = 4;
        const gridSize = 9;
        const cellSize = 12;
        const loupeRadius = (gridSize * cellSize) / 2;

        const centerHex = typeof this.sampleColorAtExact === 'function'
            ? this.sampleColorAtExact(hx + 0.5, hy + 0.5)
            : '#FFFFFF';

        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, loupeRadius + 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(screenX, screenY, loupeRadius, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = this.isDarkMode() ? '#1f2937' : '#ffffff';
        ctx.fillRect(screenX - loupeRadius, screenY - loupeRadius, loupeRadius * 2, loupeRadius * 2);

        for (let gy = -gridRadius; gy <= gridRadius; gy++) {
            for (let gx = -gridRadius; gx <= gridRadius; gx++) {
                const bx = hx + gx;
                const by = hy + gy;
                const cellColor = typeof this.sampleColorAtExact === 'function'
                    ? this.sampleColorAtExact(bx + 0.5, by + 0.5)
                    : (this.isDarkMode() ? '#111827' : '#e5e7eb');

                const cellX = screenX + gx * cellSize - cellSize / 2;
                const cellY = screenY + gy * cellSize - cellSize / 2;

                ctx.fillStyle = cellColor;
                ctx.fillRect(cellX, cellY, cellSize, cellSize);

                ctx.strokeStyle = this.isDarkMode() ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
                ctx.lineWidth = 1;
                ctx.strokeRect(cellX, cellY, cellSize, cellSize);
            }
        }

        const centerX = screenX - cellSize / 2;
        const centerY = screenY - cellSize / 2;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(centerX, centerY, cellSize, cellSize);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX + 0.5, centerY + 0.5, cellSize - 1, cellSize - 1);

        ctx.restore();

        ctx.beginPath();
        ctx.arc(screenX, screenY, loupeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(screenX, screenY, loupeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(screenX, screenY - loupeRadius - 14, 10, 0, Math.PI * 2);
        ctx.fillStyle = centerHex;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
};