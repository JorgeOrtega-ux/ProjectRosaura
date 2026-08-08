import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { PerksRegistry } from './PerksRegistry.js';
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


        this.renderCustomPickedColors();
        this.updateActiveColorPreview();
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
        document.querySelectorAll('.component-color-btn:not(.component-color-btn--rainbow)').forEach(btn => {
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
        const container = document.querySelector('[data-ref="custom-colors-container"]');
        if (!container) return;

        // Remove any previously rendered custom swatches in this container
        container.querySelectorAll('.component-color-btn--custom-picked').forEach(el => el.remove());

        // Append buttons for each color in customPickedColors
        if (Array.isArray(this.customPickedColors)) {
            this.customPickedColors.forEach(hex => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'component-color-btn component-color-btn--custom-picked';
                btn.setAttribute('data-action', 'selectColor');
                btn.setAttribute('data-color', hex);
                btn.setAttribute('data-tooltip', hex.toUpperCase());
                
                btn.style.backgroundColor = hex;
                btn.style.setProperty('--color-val', hex);

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

    updateOrbitalCannonBallPosition() {
        const topBar = document.querySelector('.component-top') || document.querySelector('.general-content-top');
        if (topBar) {
            topBar.querySelectorAll('.orbital-cannon-charge-ball').forEach(ball => ball.remove());
        }
        return;
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
                this.updateOrbitalCannonBallPosition();
                if (!this.renderWorker) return;

                const selArray = this.selectedPixels ? Array.from(this.selectedPixels) : [];
                const hoverKey = this.hoveredPixel ? ((this.hoveredPixel.y << 16) | this.hoveredPixel.x) : -1;
                const isOwnerProtecting = (this.interactionMode === 'owner_protecting' || this.interactionMode === 'user_protecting');
                
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
        if (this.nuclearWarnings && this.nuclearWarnings.length > 0) {
            const now = Date.now();
            this.nuclearWarnings = this.nuclearWarnings.filter(w => !isNaN(w.endTime) && now < w.endTime + 5000);
            if (this.nuclearWarnings.length > 0) {
                this.requestRender();
            }

            const scale = this.transform.scale || 1;
            const lineW = 1.2 / scale;

            // Sincronizar dinámicamente la posición horizontal de la bola de energía orbital en el DOM
            this.updateOrbitalCannonBallPosition();

            const topBar = document.querySelector('.component-top');
            const canvasEl = this.canvas;
            let tbCenterX = 0;
            let tbBottomY = 0;
            if (topBar && canvasEl) {
                const topBarRect = topBar.getBoundingClientRect();
                const canvasRect = canvasEl.getBoundingClientRect();
                tbCenterX = topBarRect.left + topBarRect.width / 2 - canvasRect.left;
                tbBottomY = topBarRect.bottom - canvasRect.top;
            }

            this.nuclearWarnings.forEach(warning => {
                const wx = warning.x + 0.5;
                const wy = warning.y + 0.5;
                const outerR = warning.radius;
                const crossLength = outerR + (4 / scale);

                this.ctx.save();

                // Configuración de colores por perk
                let primaryColor = '#ef4444';
                let secondaryColor = 'rgba(239, 68, 68, 0.35)';
                let fillColor = 'rgba(239, 68, 68, 0.08)';

                if (warning.perkId === 'orbital_cannon_1') {
                    primaryColor = '#00f0ff';
                    secondaryColor = 'rgba(0, 240, 255, 0.4)';
                    fillColor = 'rgba(0, 240, 255, 0.08)';
                } else if (warning.perkId === 'atomic_bomb_1') {
                    primaryColor = '#fb923c';
                    secondaryColor = 'rgba(251, 146, 60, 0.5)';
                    fillColor = 'rgba(251, 146, 60, 0.08)';
                } else if (warning.perkId === 'cluster_bomb_1') {
                    primaryColor = '#a3e635';
                    secondaryColor = 'rgba(163, 230, 53, 0.5)';
                    fillColor = 'rgba(163, 230, 53, 0.08)';
                } else if (warning.perkId === 'meteor_shower_1') {
                    primaryColor = '#e879f9';
                    secondaryColor = 'rgba(232, 121, 249, 0.5)';
                    fillColor = 'rgba(232, 121, 249, 0.08)';
                } else if (warning.perkId === 'black_hole_1') {
                    primaryColor = '#a78bfa';
                    secondaryColor = 'rgba(167, 139, 250, 0.5)';
                    fillColor = 'rgba(167, 139, 250, 0.08)';
                } else if (warning.perkId === 'supernova_blast') {
                    primaryColor = '#f59e0b';
                    secondaryColor = 'rgba(245, 158, 11, 0.4)';
                    fillColor = 'rgba(245, 158, 11, 0.08)';
                } else if (warning.perkId === 'ion_strike') {
                    primaryColor = '#06b6d4';
                    secondaryColor = 'rgba(6, 182, 212, 0.4)';
                    fillColor = 'rgba(6, 182, 212, 0.08)';
                } else if (warning.perkId === 'tectonic_rift') {
                    primaryColor = '#84cc16';
                    secondaryColor = 'rgba(132, 204, 22, 0.4)';
                    fillColor = 'rgba(132, 204, 22, 0.08)';
                }

                const elapsed = now - warning.startTime;
                const duration = warning.endTime - warning.startTime;
                const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1;                if (warning.perkId === 'black_hole_1' || warning.perkId === 'supernova_blast') {
                    // Lógica de succión de píxeles (fallback)
                    if (warning.candidates) {
                        while (warning.candidateIndex < warning.candidates.length) {
                            const cand = warning.candidates[warning.candidateIndex];
                            if (progress < cand.threshold) {
                                break;
                            }
                            const px = cand.x;
                            const py = cand.y;
                            if (this.offscreenCtx) {
                                this.offscreenCtx.clearRect(px, py, 1, 1);
                            }
                            warning.candidateIndex++;
                        }
                    }
                }    

                if (warning.perkId === 'black_hole_1') {
                    // Dibujar disco de acreción del agujero negro
                    const diskRadius = outerR * 0.45 * (1.0 + 0.05 * Math.sin(now / 250));
                    if (diskRadius > 0.1) {
                        const grad = this.ctx.createRadialGradient(wx, wy, 0, wx, wy, diskRadius);
                        grad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
                        grad.addColorStop(0.25, 'rgba(10, 10, 12, 1.0)');
                        grad.addColorStop(0.5, 'rgba(40, 25, 60, 0.9)');
                        grad.addColorStop(0.75, 'rgba(100, 100, 110, 0.7)');
                        grad.addColorStop(0.9, 'rgba(230, 230, 240, 0.35)');
                        grad.addColorStop(1.0, 'rgba(230, 230, 240, 0.0)');
                        
                        this.ctx.beginPath();
                        this.ctx.arc(wx, wy, diskRadius, 0, 2 * Math.PI);
                        this.ctx.fillStyle = grad;
                        this.ctx.fill();
                    }

                    // Dibujar brazos espirales
                    const arms = 3;
                    for (let i = 0; i < arms; i++) {
                        const armAngleOffset = (i * 2 * Math.PI) / arms;
                        this.ctx.beginPath();
                        for (let step = 0; step <= 50; step++) {
                            const t = step / 50;
                            const r = t * outerR;
                            const angle = armAngleOffset + (now / 400) - (3.5 * Math.PI * (1 - t));
                            const px = wx + r * Math.cos(angle);
                            const py = wy + r * Math.sin(angle);
                            if (step === 0) {
                                this.ctx.moveTo(px, py);
                            } else {
                                this.ctx.lineTo(px, py);
                            }
                        }
                        this.ctx.strokeStyle = `rgba(167, 139, 250, ${0.25 + 0.15 * Math.sin(now / 150 + i)})`;
                        this.ctx.lineWidth = 1.5 / scale;
                        this.ctx.stroke();
                    }

                    // Dibujar polvo cósmico
                    const dustCount = 20;
                    for (let k = 0; k < dustCount; k++) {
                        const baseAngle = (k * 2 * Math.PI) / dustCount;
                        const offset = (k * 500) % 5000;
                        const pProgress = ((now + offset) % 5000) / 5000;
                        const pr = outerR * (1 - pProgress);
                        const pAngle = baseAngle + (now / 350) + (4 * Math.PI * pProgress);
                        const px = wx + pr * Math.cos(pAngle);
                        const py = wy + pr * Math.sin(pAngle);
                        const pSize = (1.5 * (1 - pProgress)) / scale;
                        if (pSize > 0.05) {
                            this.ctx.fillStyle = k % 3 === 0 ? 'rgba(240, 240, 245, 0.65)' : (k % 3 === 1 ? 'rgba(100, 100, 110, 0.5)' : 'rgba(76, 29, 149, 0.45)');
                            this.ctx.fillRect(px - pSize / 2, py - pSize / 2, pSize, pSize);
                        }
                    }
                }

                if (warning.perkId === 'supernova_blast') {
                    const currentR = outerR * progress;
                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, currentR, 0, 2 * Math.PI);
                    const grad = this.ctx.createRadialGradient(wx, wy, Math.max(0, currentR - 5 / scale), wx, wy, currentR);
                    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                    grad.addColorStop(0.3, 'rgba(254, 240, 138, 0.8)');
                    grad.addColorStop(0.7, 'rgba(249, 115, 22, 0.6)');
                    grad.addColorStop(1.0, 'rgba(239, 68, 68, 0.0)');
                    this.ctx.fillStyle = grad;
                    this.ctx.fill();

                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, Math.min(outerR * 0.15, 3), 0, 2 * Math.PI);
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fill();
                }

                if (warning.perkId === 'ion_strike') {
                    const p1 = { x: wx, y: wy - outerR };
                    const p2 = { x: wx - outerR * 0.866, y: wy + outerR * 0.5 };
                    const p3 = { x: wx + outerR * 0.866, y: wy + outerR * 0.5 };

                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.lineTo(p3.x, p3.y);
                    this.ctx.closePath();
                    this.ctx.setLineDash([4 / scale, 4 / scale]);
                    this.ctx.strokeStyle = primaryColor;
                    this.ctx.lineWidth = 1.5 / scale;
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                    
                    [p1, p2, p3].forEach(pt => {
                        this.ctx.beginPath();
                        this.ctx.arc(pt.x, pt.y, 3 / scale, 0, 2 * Math.PI);
                        this.ctx.strokeStyle = primaryColor;
                        this.ctx.stroke();
                    });
                }

                if (warning.perkId === 'tectonic_rift') {
                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                    this.ctx.strokeStyle = primaryColor;
                    this.ctx.lineWidth = 1.0 / scale;
                    this.ctx.stroke();
                    
                    const seed = warning.startTime;
                    this.ctx.beginPath();
                    for (let k = 0; k < 5; k++) {
                        const angle = ((seed + k * 1337) % 100) / 100 * 2 * Math.PI;
                        const len = outerR * (0.3 + 0.7 * (((seed + k * 777) % 100) / 100));
                        let curX = wx;
                        let curY = wy;
                        this.ctx.moveTo(curX, curY);
                        const steps = 4;
                        for (let s = 1; s <= steps; s++) {
                            const t = s / steps;
                            const targetX = wx + t * len * Math.cos(angle);
                            const targetY = wy + t * len * Math.sin(angle);
                            const jitterX = (Math.sin(seed + s * 10 + k) * 2) / scale;
                            const jitterY = (Math.cos(seed + s * 10 + k) * 2) / scale;
                            this.ctx.lineTo(targetX + jitterX, targetY + jitterY);
                        }
                    }
                    this.ctx.strokeStyle = `rgba(132, 204, 22, ${0.4 + 0.3 * Math.sin(now / 100)})`;
                    this.ctx.lineWidth = 2.0 / scale;
                    this.ctx.stroke();
                }

                // --- RENDERIZADO DEL CÍRCULO BASE Y LA MIRA ---
                // 1. Mira telescópica cruzada en el centro
                this.ctx.beginPath();
                this.ctx.moveTo(wx - crossLength, wy);
                this.ctx.lineTo(wx + crossLength, wy);
                this.ctx.moveTo(wx, wy - crossLength);
                this.ctx.lineTo(wx, wy + crossLength);
                this.ctx.lineWidth = lineW;
                this.ctx.strokeStyle = secondaryColor;
                this.ctx.stroke();

                // 2. Círculo exterior
                if (warning.perkId !== 'supernova_blast' && warning.perkId !== 'ion_strike' && warning.perkId !== 'tectonic_rift') {
                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                    this.ctx.fillStyle = fillColor;
                    this.ctx.fill();
                    this.ctx.lineWidth = lineW;
                    this.ctx.strokeStyle = primaryColor;
                    this.ctx.stroke();

                    // 3. Anillo cerrándose progresivamente
                    const innerR = outerR * (1 - progress);
                    if (innerR > 0.1) {
                        this.ctx.beginPath();
                        this.ctx.arc(wx, wy, innerR, 0, 2 * Math.PI);
                        this.ctx.fillStyle = secondaryColor;
                        this.ctx.fill();
                        this.ctx.lineWidth = lineW;
                        this.ctx.strokeStyle = primaryColor;
                        this.ctx.stroke();
                    }
                }

                // --- ANIMACIONES EXTRAS ESPECÍFICAS DE ADVERTENCIA ---
                if (warning.perkId === 'orbital_cannon_1') {
                    // Anillo de retícula exterior discontinua giratorio
                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, outerR + (2 / scale), 0, 2 * Math.PI);
                    this.ctx.setLineDash([4 / scale, 4 / scale]);
                    this.ctx.strokeStyle = primaryColor;
                    this.ctx.lineWidth = 1 / scale;
                    this.ctx.lineDashOffset = -now / 150;
                    this.ctx.stroke();
                    this.ctx.setLineDash([]); // Limpiar estilo dashed

                    // Protones/Partículas electromagnéticas cargando en espiral circular hacia el centro
                    const particleCount = 10;
                    for (let i = 0; i < particleCount; i++) {
                        const travelProgress = ((now + i * 150) % 1500) / 1500;
                        const r = outerR * (1 - travelProgress);
                        const angle = (i * 2 * Math.PI / particleCount) + (now / 200) + (travelProgress * Math.PI);
                        const px = wx + r * Math.cos(angle);
                        const py = wy + r * Math.sin(angle);
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.fillRect(px - (1 / scale), py - (1 / scale), 2 / scale, 2 / scale);
                    }
                } else if (warning.perkId === 'atomic_bomb_1') {
                    // Múltiples aureolas concéntricas de pulso naranja expansivas continuas
                    for (let p = 0; p < 3; p++) {
                        const pulseProgress = (((now / 1200) + p * 0.33) % 1.0);
                        const pulseR = outerR * pulseProgress;
                        this.ctx.beginPath();
                        this.ctx.arc(wx, wy, pulseR, 0, 2 * Math.PI);
                        this.ctx.strokeStyle = `rgba(251, 146, 60, ${0.45 * (1 - pulseProgress)})`;
                        this.ctx.lineWidth = 1.2 / scale;
                        this.ctx.stroke();
                    }

                    // Protones orbitando circularmente alrededor del centro
                    const particleCount = 8;
                    for (let i = 0; i < particleCount; i++) {
                        const angle = (i * 2 * Math.PI / particleCount) + (now / 250);
                        const r = outerR * 0.35 * (0.8 + 0.2 * Math.sin(now / 100 + i)); // Órbita vibrante
                        const px = wx + r * Math.cos(angle);
                        const py = wy + r * Math.sin(angle);
                        this.ctx.fillStyle = '#fb923c';
                        this.ctx.fillRect(px - (1 / scale), py - (1 / scale), 2 / scale, 2 / scale);
                    }
                } else if (warning.perkId === 'cluster_bomb_1') {
                    // Cuadrícula táctica de puntos finos en lugar de líneas continuas
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                    this.ctx.clip();
                    
                    this.ctx.fillStyle = 'rgba(163, 230, 53, 0.35)';
                    const spacing = Math.max(3, outerR / 3);
                    for (let xOffset = -outerR; xOffset <= outerR; xOffset += spacing) {
                        for (let yOffset = -outerR; yOffset <= outerR; yOffset += spacing) {
                            this.ctx.fillRect(wx + xOffset - 0.5 / scale, wy + yOffset - 0.5 / scale, 1 / scale, 1 / scale);
                        }
                    }
                    this.ctx.restore();

                    // Barrido de radar verde lima circular
                    this.ctx.beginPath();
                    this.ctx.moveTo(wx, wy);
                    const sweepAngle = (now / 300) % (2 * Math.PI);
                    this.ctx.arc(wx, wy, outerR, sweepAngle, sweepAngle + 0.25);
                    this.ctx.lineTo(wx, wy);
                    this.ctx.fillStyle = 'rgba(163, 230, 53, 0.15)';
                    this.ctx.fill();
                } else if (warning.perkId === 'meteor_shower_1') {
                    // Protones de meteoros cayendo de forma limpia
                    const particleCount = 6;
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                    this.ctx.clip();
                    
                    for (let i = 0; i < particleCount; i++) {
                        const offset = (i * 350) % 1000;
                        const pProgress = ((now + offset) % 1000) / 1000;
                        const px = wx - outerR + (2 * outerR * ((i * 17) % 10 / 10));
                        const py = wy - outerR + (2 * outerR * pProgress);
                        
                        this.ctx.beginPath();
                        this.ctx.arc(px, py, 0.8 / scale, 0, 2 * Math.PI);
                        this.ctx.fillStyle = `rgba(232, 121, 249, ${0.75 * (1 - pProgress)})`;
                        this.ctx.fill();
                    }
                    this.ctx.restore();
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
                
                if (exp.perkId === 'ion_strike') {
                    const p1 = { x: exp.x + 0.5, y: exp.y + 0.5 - exp.maxRadius };
                    const p2 = { x: exp.x + 0.5 - exp.maxRadius * 0.866, y: exp.y + 0.5 + exp.maxRadius * 0.5 };
                    const p3 = { x: exp.x + 0.5 + exp.maxRadius * 0.866, y: exp.y + 0.5 + exp.maxRadius * 0.5 };
                    const vertices = [p1, p2, p3];
                    for (let i = 0; i < 3; i++) {
                        const strikeProgress = Math.min(1, progress * 2.5 - i * 0.3);
                        if (strikeProgress > 0 && strikeProgress < 1.0) {
                            const pt = vertices[i];
                            const op = 1.0 - strikeProgress;
                            this.ctx.beginPath();
                            this.ctx.moveTo(pt.x + (Math.sin(now / 10) * 10) / this.transform.scale, pt.y - 150);
                            let curY = pt.y - 150;
                            let curX = pt.x;
                            const steps = 6;
                            const stepY = 150 / steps;
                            for (let s = 1; s <= steps; s++) {
                                curY += stepY;
                                const jitterX = (Math.sin(now + s * 2.3) * (15 / steps)) / this.transform.scale;
                                this.ctx.lineTo(curX + jitterX, curY);
                            }
                            this.ctx.strokeStyle = `rgba(0, 240, 255, ${op})`;
                            this.ctx.lineWidth = Math.max(1.5, 4.0 * op / this.transform.scale);
                            this.ctx.stroke();
                        }
                    }
                    const triangleProgress = Math.min(1, progress * 1.5 - 0.5);
                    if (triangleProgress > 0) {
                        const op = (1 - triangleProgress) * opacity;
                        this.ctx.beginPath();
                        this.ctx.moveTo(p1.x, p1.y);
                        const drawLightningSegment = (a, b) => {
                            const dx = b.x - a.x;
                            const dy = b.y - a.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const steps = Math.max(5, Math.floor(dist / 5));
                            for (let s = 1; s <= steps; s++) {
                                const t = s / steps;
                                const targetX = a.x + t * dx;
                                const targetY = a.y + t * dy;
                                const jitter = (Math.sin(now / 5 + s * 1.5) * 3) / this.transform.scale;
                                const nx = -dy / dist;
                                const ny = dx / dist;
                                this.ctx.lineTo(targetX + nx * jitter, targetY + ny * jitter);
                            }
                        };
                        this.ctx.moveTo(p1.x, p1.y);
                        drawLightningSegment(p1, p2);
                        drawLightningSegment(p2, p3);
                        drawLightningSegment(p3, p1);
                        this.ctx.closePath();
                        this.ctx.strokeStyle = `rgba(0, 240, 255, ${op})`;
                        this.ctx.lineWidth = Math.max(1.0, 3.0 * op / this.transform.scale);
                        this.ctx.stroke();
                        this.ctx.fillStyle = `rgba(0, 240, 255, ${op * 0.12})`;
                        this.ctx.fill();
                    }
                    return;
                }

                if (exp.perkId === 'tectonic_rift') {
                    const r = exp.maxRadius;
                    const op = opacity;
                    this.ctx.save();
                    this.ctx.beginPath();
                    
                    // Draw 7 asymmetrical, long cracks
                    for (let k = 0; k < 7; k++) {
                        const angleSeed = Math.sin(exp.startTime + k * 12.3) * 1000;
                        const angle = (k * 2 * Math.PI / 7) + (angleSeed % 0.6);
                        const lenSeed = Math.cos(exp.startTime + k * 45.6) * 1000;
                        const len = r * (1.2 + Math.abs(lenSeed % 1.6)) * progress;
                        
                        let curX = exp.x + 0.5;
                        let curY = exp.y + 0.5;
                        this.ctx.moveTo(curX, curY);
                        
                        const steps = 6;
                        for (let s = 1; s <= steps; s++) {
                            const t = s / steps;
                            const targetX = exp.x + 0.5 + t * len * Math.cos(angle);
                            const targetY = exp.y + 0.5 + t * len * Math.sin(angle);
                            
                            const jitterSeed = Math.sin(now * 0.05 + s * 7 + k) * 3.0;
                            const jitter = jitterSeed / this.transform.scale;
                            
                            this.ctx.lineTo(targetX + jitter, targetY - jitter);
                            
                            // Draw visual sub-branch
                            if (s === 3 && (Math.abs(angleSeed) % 10) < 3.5) {
                                this.ctx.save();
                                this.ctx.beginPath();
                                this.ctx.moveTo(targetX + jitter, targetY - jitter);
                                const branchAngle = angle + 0.6;
                                const branchLen = len * 0.45;
                                const bx = targetX + jitter + branchLen * Math.cos(branchAngle);
                                const by = targetY - jitter + branchLen * Math.sin(branchAngle);
                                this.ctx.lineTo(bx, by);
                                this.ctx.strokeStyle = `rgba(132, 204, 22, ${op * 0.65})`;
                                this.ctx.lineWidth = Math.max(0.7, 2.0 * op / this.transform.scale);
                                this.ctx.stroke();
                                this.ctx.restore();
                            }
                        }
                    }
                    this.ctx.strokeStyle = `rgba(132, 204, 22, ${op * 0.85})`;
                    this.ctx.lineWidth = Math.max(1.0, 3.5 * op / this.transform.scale);
                    this.ctx.stroke();
                    
                    // Outer shockwave
                    this.ctx.beginPath();
                    this.ctx.arc(exp.x + 0.5, exp.y + 0.5, r * 1.6 * progress, 0, 2 * Math.PI);
                    this.ctx.strokeStyle = `rgba(163, 230, 53, ${op * 0.35})`;
                    this.ctx.lineWidth = Math.max(1.0, 4.0 * (1 - progress) / this.transform.scale);
                    this.ctx.stroke();
                    this.ctx.restore();
                    return;
                }

                // 1. Explosión limpia de Cañón Orbital (cian/blanco, múltiples aureolas circulares y protones de alta energía)
                if (exp.perkId === 'orbital_cannon_1') {
                    // Múltiples aureolas concéntricas en cian expansivas
                    for (let p = 0; p < 3; p++) {
                        const ringProgress = Math.min(1, progress * 1.5 - p * 0.25);
                        if (ringProgress > 0) {
                            const r = exp.maxRadius * (0.1 + 1.9 * ringProgress);
                            const op = (1 - ringProgress) * opacity;
                            this.ctx.beginPath();
                            this.ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                            this.ctx.strokeStyle = `rgba(0, 240, 255, ${op})`;
                            this.ctx.lineWidth = Math.max(1.5, 3.5 * (1 - ringProgress) / this.transform.scale);
                            this.ctx.stroke();
                        }
                    }

                    // Campo electromagnético central (aureola interna brillante cian)
                    this.ctx.beginPath();
                    this.ctx.arc(exp.x + 0.5, exp.y + 0.5, exp.maxRadius * 0.65 * progress, 0, 2 * Math.PI);
                    this.ctx.fillStyle = `rgba(0, 240, 255, ${opacity * 0.15})`;
                    this.ctx.fill();

                    // Protones electromagnéticos de alta velocidad radial sin gravedad
                    const particleCount = 25;
                    for (let i = 0; i < particleCount; i++) {
                        const hash = Math.sin(exp.startTime + i * 47.13) * 1000;
                        const angle = (hash * 93.7) % (2 * Math.PI);
                        const speed = exp.maxRadius * (0.8 + 1.6 * (Math.abs(hash * 11.2) % 1));
                        const dist = speed * (1 - Math.pow(1 - progress, 3));
                        
                        const px = exp.x + 0.5 + dist * Math.cos(angle) + 0.4 * Math.sin(now / 10);
                        const py = exp.y + 0.5 + dist * Math.sin(angle) + 0.4 * Math.cos(now / 10);
                        
                        const size = Math.max(1, (2.5 * (1 - progress)) / this.transform.scale);
                        this.ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#00f0ff';
                        this.ctx.fillRect(px - size/2, py - size/2, size, size);
                    }
                    return;
                }

                // 2. Agujero Negro
                if (exp.perkId === 'black_hole_1') {
                    if (progress < 0.4) {
                        const phaseProgress = progress / 0.4;
                        const r = exp.maxRadius * 0.8 * Math.sin(phaseProgress * Math.PI / 2);
                        
                        this.ctx.beginPath();
                        this.ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                        this.ctx.fillStyle = '#000000';
                        this.ctx.fill();
                        
                        this.ctx.strokeStyle = `rgba(90, 80, 110, ${0.9 * opacity})`; // Mysterious dark violet/gray
                        this.ctx.lineWidth = Math.max(3, 6 / this.transform.scale);
                        this.ctx.stroke();
                        
                        this.ctx.beginPath();
                        this.ctx.arc(exp.x + 0.5, exp.y + 0.5, r * 1.4, 0, 2 * Math.PI);
                        this.ctx.strokeStyle = `rgba(64, 64, 72, ${0.6 * opacity})`; // Dark slate gray ripple
                        this.ctx.lineWidth = Math.max(1, 3 / this.transform.scale);
                        this.ctx.stroke();
                    } else if (progress < 0.7) {
                        const phaseProgress = (progress - 0.4) / 0.3;
                        const r = exp.maxRadius * 0.8 * (1 - phaseProgress);
                        
                        if (r > 0.1) {
                            this.ctx.beginPath();
                            this.ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                            this.ctx.fillStyle = '#000000';
                            this.ctx.fill();
                            
                            this.ctx.strokeStyle = `rgba(45, 20, 80, ${0.9 * opacity})`; // Deep violet collapse border
                            this.ctx.lineWidth = Math.max(3, 8 * (1 - phaseProgress) / this.transform.scale);
                            this.ctx.stroke();
                        }
                        
                        const collapseRadius = exp.maxRadius * 2.0 * (1 - phaseProgress);
                        this.ctx.beginPath();
                        this.ctx.arc(exp.x + 0.5, exp.y + 0.5, collapseRadius, 0, 2 * Math.PI);
                        this.ctx.strokeStyle = `rgba(200, 200, 210, ${0.75 * opacity})`; // Silver collapsing ring
                        this.ctx.lineWidth = Math.max(1, 2 / this.transform.scale);
                        this.ctx.stroke();
                    } else {
                        const phaseProgress = (progress - 0.7) / 0.3;
                        const r = exp.maxRadius * 2.5 * phaseProgress;
                        
                        const grad = this.ctx.createRadialGradient(
                            exp.x + 0.5, exp.y + 0.5, 0,
                            exp.x + 0.5, exp.y + 0.5, r
                        );
                        grad.addColorStop(0, `rgba(255, 255, 255, ${1.0 - phaseProgress})`); // White center
                        grad.addColorStop(0.35, `rgba(60, 40, 90, ${(1.0 - phaseProgress) * 0.85})`); // Deep cosmic violet
                        grad.addColorStop(0.7, `rgba(30, 30, 40, ${(1.0 - phaseProgress) * 0.5})`); // Dark gray
                        grad.addColorStop(1.0, `rgba(0, 0, 0, 0.0)`);
                        
                        this.ctx.beginPath();
                        this.ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                        this.ctx.fillStyle = grad;
                        this.ctx.fill();
                    }
                    return;
                }

                // 3. Bomba Atómica (Fuego circular termo-nuclear suave, aureolas concéntricas y partículas)
                if (exp.perkId === 'atomic_bomb_1') {
                    // Onda expansiva de fuego circular suave mediante gradiente radial
                    const r = exp.maxRadius * (0.1 + 2.4 * progress);
                    const grad = this.ctx.createRadialGradient(exp.x + 0.5, exp.y + 0.5, 0, exp.x + 0.5, exp.y + 0.5, r);
                    grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
                    grad.addColorStop(0.15, `rgba(254, 240, 138, ${opacity})`); // Amarillo neón
                    grad.addColorStop(0.45, `rgba(249, 115, 22, ${opacity * 0.8})`); // Naranja
                    grad.addColorStop(0.75, `rgba(239, 68, 68, ${opacity * 0.45})`); // Rojo
                    grad.addColorStop(1, `rgba(239, 68, 68, 0)`);
                    
                    this.ctx.beginPath();
                    this.ctx.arc(exp.x + 0.5, exp.y + 0.5, r, 0, 2 * Math.PI);
                    this.ctx.fillStyle = grad;
                    this.ctx.fill();

                    // Múltiples aureolas concéntricas de pulso expansivas (ondas de choque circulares)
                    for (let p = 0; p < 4; p++) {
                        const ringProgress = Math.min(1, progress * 1.6 - p * 0.2);
                        if (ringProgress > 0) {
                            const ar = exp.maxRadius * (0.05 + 2.45 * ringProgress);
                            const op = (1 - ringProgress) * opacity;
                            this.ctx.beginPath();
                            this.ctx.arc(exp.x + 0.5, exp.y + 0.5, ar, 0, 2 * Math.PI);
                            this.ctx.strokeStyle = `rgba(251, 146, 60, ${op * 0.6})`;
                            this.ctx.lineWidth = Math.max(1, 4 * (1 - ringProgress) / this.transform.scale);
                            this.ctx.stroke();
                        }
                    }

                    // Cúpula atómica de fuego ascendente circular
                    const riseDist = exp.maxRadius * 0.7 * progress;
                    const domeR = exp.maxRadius * (0.35 + 1.15 * progress);
                    const mx = exp.x + 0.5 + 0.6 * Math.sin(now / 10);
                    const my = exp.y + 0.5 - riseDist;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(mx, my, domeR * 0.55, 0, 2 * Math.PI);
                    this.ctx.fillStyle = `rgba(251, 146, 60, ${opacity * 0.45})`;
                    this.ctx.fill();
                    
                    this.ctx.beginPath();
                    this.ctx.arc(mx - domeR * 0.25, my + domeR * 0.08, domeR * 0.38, 0, 2 * Math.PI);
                    this.ctx.arc(mx + domeR * 0.25, my + domeR * 0.08, domeR * 0.38, 0, 2 * Math.PI);
                    this.ctx.fillStyle = `rgba(239, 68, 68, ${opacity * 0.35})`;
                    this.ctx.fill();

                    // Protones/escombros del cataclismo volando
                    const particleCount = 45;
                    for (let i = 0; i < particleCount; i++) {
                        const hash = Math.sin(exp.startTime + i * 31.81) * 10000;
                        const angle = (hash * 13.9) % (2 * Math.PI);
                        const speed = exp.maxRadius * 1.5 * (0.4 + 1.2 * (Math.abs(hash * 7.3) % 1));
                        const dist = speed * (1 - Math.pow(1 - progress, 2));
                        
                        const px = exp.x + 0.5 + dist * Math.cos(angle);
                        const py = exp.y + 0.5 + dist * Math.sin(angle) - (exp.maxRadius * 0.4 * progress);
                        
                        // Turbulencia circular
                        const finalPx = px + 1.5 * Math.sin(now / 80 + i) * progress;
                        const finalPy = py + 1.5 * Math.cos(now / 90 + i) * progress;
                        
                        const size = Math.max(1, (3 * (1 - progress)) / this.transform.scale);
                        const colors = ['#facc15', '#f97316', '#ef4444', '#a3e635']; // Colores fuego/radioactivos
                        this.ctx.fillStyle = colors[Math.abs(Math.floor(hash)) % colors.length];
                        this.ctx.fillRect(finalPx - size/2, finalPy - size/2, size, size);
                    }
                    return;
                }

                // 4. Bomba de Racimo (Micro-detonaciones circulares encadenadas y chispas)
                if (exp.perkId === 'cluster_bomb_1') {
                    const bombletCount = 6;
                    for (let i = 0; i < bombletCount; i++) {
                        const delay = i * 0.12;
                        if (progress > delay) {
                            const localProgress = Math.min(1, (progress - delay) / (1 - delay));
                            const localOpacity = 1 - localProgress;
                            
                            const angle = i * 2.37;
                            const dist = exp.maxRadius * 0.65 * Math.sin(i * 1.83);
                            const bx = exp.x + 0.5 + dist * Math.cos(angle);
                            const by = exp.y + 0.5 + dist * Math.sin(angle);
                            
                            // Explosión circular limpia para cada bomblet
                            const localR = (exp.maxRadius * 0.3) * (0.4 + 1.4 * localProgress);
                            this.ctx.beginPath();
                            this.ctx.arc(bx, by, localR, 0, 2 * Math.PI);
                            this.ctx.strokeStyle = `rgba(163, 230, 53, ${localOpacity})`;
                            this.ctx.fillStyle = `rgba(163, 230, 53, ${localOpacity * 0.25})`;
                            this.ctx.fill();
                            this.ctx.stroke();

                            // Chispas verdes/amarillas de la submunición
                            const sparkCount = 4;
                            for (let s = 0; s < sparkCount; s++) {
                                const hash = Math.sin(exp.startTime + i * 5 + s * 11) * 500;
                                const sa = (hash * 7) % (2 * Math.PI);
                                const sd = (exp.maxRadius * 0.4) * localProgress * (0.8 + 0.6 * (hash % 1));
                                const spx = bx + sd * Math.cos(sa);
                                const spy = by + sd * Math.sin(sa);
                                const size = 1.5 / this.transform.scale;
                                this.ctx.fillStyle = '#a3e635';
                                this.ctx.fillRect(spx - size/2, spy - size/2, size, size);
                            }
                        }
                    }
                    return;
                }

                // 5. Lluvia de Meteoritos (Múltiples impactos circulares magenta)
                if (exp.perkId === 'meteor_shower_1') {
                    const subImpacts = 5;
                    for (let i = 0; i < subImpacts; i++) {
                        const delay = i * 0.15;
                        if (progress > delay) {
                            const localProgress = Math.min(1, (progress - delay) / (1 - delay));
                            const localOpacity = 1 - localProgress;
                            
                            const angle = i * 2.1;
                            const dist = exp.maxRadius * 0.5 * Math.sin(i * 1.5);
                            const mx = exp.x + 0.5 + dist * Math.cos(angle);
                            const my = exp.y + 0.5 + dist * Math.sin(angle);
                            
                            const localR = (exp.maxRadius * 0.45) * (0.2 + 1.8 * localProgress);
                            this.ctx.beginPath();
                            this.ctx.arc(mx, my, localR, 0, 2 * Math.PI);
                            this.ctx.lineWidth = Math.max(1.5, 3 / this.transform.scale);
                            this.ctx.strokeStyle = `rgba(232, 121, 249, ${localOpacity})`;
                            this.ctx.fillStyle = `rgba(232, 121, 249, ${localOpacity * 0.2})`;
                            this.ctx.fill();
                            this.ctx.stroke();
                        }
                    }

                    // Escombros magenta de los meteoritos volando
                    const debrisCount = 15;
                    for (let d = 0; d < debrisCount; d++) {
                        const hash = Math.sin(exp.startTime + d * 19.3) * 1000;
                        const angle = (hash * 11) % (2 * Math.PI);
                        const speed = exp.maxRadius * 1.5 * (0.3 + 1.1 * (Math.abs(hash * 3.7) % 1));
                        const dist = speed * (1 - Math.pow(1 - progress, 2));
                        
                        const px = exp.x + 0.5 + dist * Math.cos(angle);
                        const py = exp.y + 0.5 + dist * Math.sin(angle) + (8 * progress * progress);
                        
                        const size = Math.max(1, (2.2 * (1 - progress)) / this.transform.scale);
                        this.ctx.fillStyle = d % 2 === 0 ? '#e879f9' : '#db2777';
                        this.ctx.fillRect(px - size/2, py - size/2, size, size);
                    }
                    return;
                }

                // Fallback genérico para misil, bomba e impactos estándar (Anillos circulares limpios y escombros)
                const maxR = exp.maxRadius;
                const radiusOuter = maxR * (0.8 + 1.7 * progress);
                const radiusInner = maxR * (0.4 + 1.1 * progress);
                const mainCol = exp.perkId === 'pixel_bomb_1' ? '249, 115, 22' : '239, 68, 68';
                const fillCol = exp.perkId === 'pixel_bomb_1' ? '251, 146, 60' : '220, 38, 38';

                // Anillo exterior circular
                this.ctx.beginPath();
                this.ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusOuter, 0, 2 * Math.PI);
                this.ctx.lineWidth = Math.max(2, 4 / this.transform.scale);
                this.ctx.strokeStyle = `rgba(${mainCol}, ${opacity})`;
                this.ctx.stroke();

                // Círculo interior circular
                this.ctx.beginPath();
                this.ctx.arc(exp.x + 0.5, exp.y + 0.5, radiusInner, 0, 2 * Math.PI);
                this.ctx.lineWidth = Math.max(3, 5 / this.transform.scale);
                this.ctx.strokeStyle = `rgba(${fillCol}, ${opacity})`;
                this.ctx.fillStyle = `rgba(${fillCol}, ${opacity * 0.18})`;
                this.ctx.fill();
                this.ctx.stroke();

                // Píxeles esparcidos rotos volando con gravedad
                const debrisCount = 12;
                for (let i = 0; i < debrisCount; i++) {
                    const hash = Math.sin(exp.startTime + i * 29) * 1000;
                    const angle = (hash * 11) % (2 * Math.PI);
                    const speed = maxR * 1.3 * (0.3 + 0.9 * (Math.abs(hash * 5) % 1));
                    const dist = speed * (1 - Math.pow(1 - progress, 2));
                    
                    const px = exp.x + 0.5 + dist * Math.cos(angle);
                    const py = exp.y + 0.5 + dist * Math.sin(angle) + (14 * progress * progress);
                    
                    const size = Math.max(1, (2 / this.transform.scale));
                    this.ctx.fillStyle = i % 2 === 0 ? `rgb(${mainCol})` : `rgb(${fillCol})`;
                    this.ctx.fillRect(px - size/2, py - size/2, size, size);
                }
            });
        }

        this.ctx.restore();
    }
};