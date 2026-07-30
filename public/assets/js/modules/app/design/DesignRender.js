import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { PerksRegistry } from './PerksRegistry.js';

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
            
            btn.style.backgroundColor = hex;
            btn.style.setProperty('--color-val', hex); 

            container.appendChild(btn);
        });

        this.requestRender();
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

    requestRender() {
        if (this.renderWorker) {
            if (this._workerRenderPending) return;
            this._workerRenderPending = true;

            requestAnimationFrame(() => {
                this._workerRenderPending = false;
                if (typeof this.positionTemplateToolbar === 'function') {
                    this.positionTemplateToolbar();
                }
                if (!this.renderWorker) return;

                const selArray = this.selectedPixels ? Array.from(this.selectedPixels) : [];
                const hoverKey = this.hoveredPixel ? ((this.hoveredPixel.y << 16) | this.hoveredPixel.x) : -1;
                const isOwnerProtecting = (this.interactionMode === 'owner_protecting' || this.interactionMode === 'user_protecting');
                
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
                        selectedPixels: selArray,
                        hoveredPixelKey: hoverKey,
                        ownerEraserBox: this.ownerEraserBox || null
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

        if (this.templates && this.templates.length > 0 && !this.isResetLocked) {
            this.templates.forEach(tpl => {
                if (!tpl || !tpl.img) return;
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
                
                this.ctx.drawImage(tpl.img, -hw, -hh, tpl.w, tpl.h);

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

        const selCount = this.selectedPixels ? this.selectedPixels.size : 0;
        const hasHover = this.hoveredPixel && !this.isSpectator && !this.isResetLocked;

        if ((selCount > 0 || hasHover) && !this.isSpectator && !this.isResetLocked && this.boardWidth > 0 && this.boardHeight > 0) {
            this.ctx.strokeStyle = activeColor; 
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.beginPath();
            
            const totalPixels = this.boardWidth * this.boardHeight;
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

        if (this.nuclearWarnings && this.nuclearWarnings.length > 0) {
            const now = Date.now();
            this.nuclearWarnings = this.nuclearWarnings.filter(w => !isNaN(w.endTime) && now < w.endTime);
            if (this.nuclearWarnings.length > 0) {
                this.requestRender();
            }

            const scale = this.transform.scale || 1;
            const lineW = 1.2 / scale;

            this.nuclearWarnings.forEach(warning => {
                const wx = warning.x + 0.5;
                const wy = warning.y + 0.5;
                const outerR = warning.radius;
                const crossLength = outerR + (4 / scale);

                this.ctx.save();
                // 1. Mira telescópica fina cruzada en el centro
                this.ctx.beginPath();
                this.ctx.moveTo(wx - crossLength, wy);
                this.ctx.lineTo(wx + crossLength, wy);
                this.ctx.moveTo(wx, wy - crossLength);
                this.ctx.lineTo(wx, wy + crossLength);
                this.ctx.lineWidth = lineW;
                this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
                this.ctx.stroke();

                

                this.ctx.beginPath();
                this.ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                this.ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                this.ctx.fill();
                this.ctx.lineWidth = lineW;
                this.ctx.strokeStyle = '#ef4444';
                this.ctx.stroke();

                // 3. Círculo rojo cerrándose progresivamente hacia el centro
                const duration = warning.endTime - warning.startTime;
                const timeRatio = duration > 0 ? Math.min(1, Math.max(0, (now - warning.startTime) / duration)) : 1;
                const innerR = outerR * (1 - timeRatio);

                if (innerR > 0.1) {
                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, innerR, 0, 2 * Math.PI);
                    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
                    this.ctx.fill();
                    this.ctx.lineWidth = lineW;
                    this.ctx.strokeStyle = '#dc2626';
                    this.ctx.stroke();
                }
                this.ctx.restore();
            });
        }
        
        if (this.explosions && this.explosions.length > 0) {
            const now = Date.now();
            this.explosions = this.explosions.filter(exp => (now - exp.startTime) < exp.duration);
            if (this.explosions.length > 0) {
                this.requestRender();
            }

            this.explosions.forEach(exp => {
                const elapsed = now - exp.startTime;
                const progress = Math.min(1, elapsed / exp.duration);
                const opacity = 1 - progress;
                
                // Animación unificada de onda expansiva circular (escalada proporcionalmente al radio)
                const radiusOuter = exp.maxRadius * (1 + 1.5 * progress);
                const radiusInner = exp.maxRadius * (0.5 + 1 * progress);
                
                // Anillo exterior de onda expansiva
                this.ctx.beginPath();
                this.ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusOuter, 0, 2 * Math.PI);
                this.ctx.lineWidth = Math.max(2, 4 / this.transform.scale);
                this.ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`;
                this.ctx.stroke();

                // Núcleo de fuego interior
                this.ctx.beginPath();
                this.ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusInner, 0, 2 * Math.PI);
                this.ctx.lineWidth = Math.max(3, 5 / this.transform.scale);
                this.ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
                this.ctx.fillStyle = `rgba(220, 38, 38, ${opacity * 0.5})`;
                this.ctx.fill();
                this.ctx.stroke();
            });
        }

        this.ctx.restore();
    }
};