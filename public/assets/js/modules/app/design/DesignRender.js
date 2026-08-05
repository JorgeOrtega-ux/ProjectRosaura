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

        const activeColorSection = document.querySelector('[data-ref="active-color-section"]');
        if (activeColorSection) {
            if (this.allowCustomColors) {
                activeColorSection.classList.remove('disabled');
            } else {
                activeColorSection.classList.add('disabled');
            }
        }

        const recentPickerWrapper = document.querySelector('[data-ref="recent-picker-dropdown-wrapper"]');
        if (recentPickerWrapper) {
            if (this.allowCustomColors) {
                recentPickerWrapper.classList.remove('picker-wrapper-disabled');
            } else {
                recentPickerWrapper.classList.add('picker-wrapper-disabled');
            }
        }

        this.loadRecentColors();
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

    async loadRecentColors() {
        try {
            if (!this.canvasIntId) return;
            const response = await this.api.post(ApiRoutes.Canvases.GetRecentColors, { canvas_id: this.canvasIntId });
            if (response && Array.isArray(response)) {
                this.renderRecentColors(response);
            } else if (response && response.colors) {
                this.renderRecentColors(response.colors);
            }
        } catch (e) {
            console.error('Error loading recent colors:', e);
        }
    },

    renderRecentColors(colors) {
        if (Array.isArray(colors)) {
            this.recentColorsList = colors;
        }
        const grid = document.querySelector('[data-ref="recent-colors-grid"]');
        const recentSection = document.querySelector('[data-ref="recent-colors-section"]');
        if (!grid) return;
        grid.innerHTML = '';

        if (Array.isArray(colors) && colors.length > 0) {
            if (recentSection) {
                recentSection.classList.remove('disabled');
                recentSection.style.display = 'block';
            }
            colors.forEach(hex => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `component-color-btn ${this.currentColor === hex ? 'active' : ''}`;
                btn.setAttribute('data-action', 'selectColor');
                btn.setAttribute('data-color', hex);
                btn.setAttribute('data-tooltip', hex.toUpperCase());
                
                btn.style.backgroundColor = hex;
                btn.style.setProperty('--color-val', hex);
                
                grid.appendChild(btn);
            });
        } else {
            if (recentSection) {
                recentSection.classList.add('disabled');
                recentSection.style.display = 'none';
            }
        }
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
        const canvasEl = this.canvas;
        if (!topBar || !canvasEl) return;

        const now = Date.now();
        // La bola de carga solo existe durante la fase de carga previa a la explosión (now < w.endTime)
        const orbitalWarnings = this.nuclearWarnings ? this.nuclearWarnings.filter(w => w.perkId === 'canon_orbital_1' && now < w.endTime) : [];
        const topBarRect = topBar.getBoundingClientRect();
        const canvasRect = canvasEl.getBoundingClientRect();
        const scale = this.transform.scale || 1;
        const tx = this.transform.x || 0;

        const activeKeys = new Set();

        orbitalWarnings.forEach(w => {
            activeKeys.add(w.key);
            let energyBall = topBar.querySelector(`[data-warning-key="${w.key}"]`);
            if (!energyBall) {
                energyBall = document.createElement('div');
                energyBall.className = 'orbital-cannon-charge-ball';
                energyBall.setAttribute('data-warning-key', w.key);
                const duration = Math.max(1000, w.endTime - w.startTime);
                energyBall.style.animationDuration = `${duration}ms`;
                topBar.appendChild(energyBall);
            }
            const wx = w.x + 0.5;
            const targetScreenX = wx * scale + tx;
            const leftOffset = canvasRect.left + targetScreenX - topBarRect.left;
            energyBall.style.left = `${leftOffset}px`;
        });

        // Eliminar cualquier bola de carga cuyo tiempo de carga haya concluido o cuya advertencia ya no esté activa
        topBar.querySelectorAll('.orbital-cannon-charge-ball').forEach(ball => {
            const k = ball.getAttribute('data-warning-key');
            if (!activeKeys.has(k)) {
                ball.remove();
            }
        });
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
                
                if (warning.perkId === 'canon_orbital_1') {
                    const elapsed = now - warning.startTime;
                    const duration = warning.endTime - warning.startTime;
                    const progress = Math.min(1, Math.max(0, elapsed / duration));
                    
                    const sourceY = (tbBottomY - this.transform.y) / this.transform.scale;
                    const sourceX = wx; // Alineación vertical perfecta

                    // 1. Línea de rastreo parpadeante durante toda la carga
                    this.ctx.beginPath();
                    this.ctx.moveTo(sourceX, sourceY);
                    this.ctx.lineTo(wx, wy);
                    this.ctx.lineWidth = 1 / scale;
                    this.ctx.strokeStyle = `rgba(239, 68, 68, ${0.15 + 0.25 * Math.sin(now / 80)})`;
                    this.ctx.stroke();

                    // Círculo exterior y cruz fija en el suelo
                    this.ctx.beginPath();
                    this.ctx.moveTo(wx - crossLength, wy);
                    this.ctx.lineTo(wx + crossLength, wy);
                    this.ctx.moveTo(wx, wy - crossLength);
                    this.ctx.lineTo(wx, wy + crossLength);
                    this.ctx.lineWidth = lineW;
                    this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.arc(wx, wy, outerR, 0, 2 * Math.PI);
                    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#ef4444';
                    this.ctx.stroke();

                    // Anillo cerrándose progresivamente
                    const innerR = outerR * (1 - progress);
                    if (innerR > 0.1) {
                        this.ctx.beginPath();
                        this.ctx.arc(wx, wy, innerR, 0, 2 * Math.PI);
                        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
                        this.ctx.fill();
                        this.ctx.strokeStyle = '#dc2626';
                        this.ctx.stroke();
                    }
                } else if (warning.perkId === 'agujero_negro_1') {
                    const elapsed = now - warning.startTime;
                    const duration = warning.endTime - warning.startTime;
                    const progress = Math.min(1, Math.max(0, elapsed / duration));

                    const cx = warning.x;
                    const cy = warning.y;

                    if (!warning.pixelCache && this.offscreenCtx && this.boardWidth > 0 && this.boardWidth <= 1024 && this.boardHeight > 0 && this.boardHeight <= 1024) {
                        try {
                            const imgData = this.offscreenCtx.getImageData(0, 0, this.boardWidth, this.boardHeight);
                            warning.pixelCache = new Uint32Array(imgData.data.buffer);
                        } catch (e) {
                            warning.pixelCache = null;
                        }
                    }

                    if (!warning.detachedPixels) {
                        warning.detachedPixels = [];
                    }

                    // Check all pixels in the warning radius
                    const rInt = Math.ceil(outerR);
                    for (let dy = -rInt; dy <= rInt; dy++) {
                        for (let dx = -rInt; dx <= rInt; dx++) {
                            const px = cx + dx;
                            const py = cy + dy;
                            if (px >= 0 && px < this.boardWidth && py >= 0 && py < this.boardHeight) {
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist <= outerR) {
                                    const hash = ((px * 17 + py * 23) % 100) / 100;
                                    const distRatio = dist / outerR;
                                    // Pull pixels outside-in
                                    const threshold = 0.05 + distRatio * 0.75 + hash * 0.15;

                                    if (progress > threshold) {
                                        const idx = py * this.boardWidth + px;
                                        const colorVal = warning.pixelCache ? warning.pixelCache[idx] : 0;
                                        if (colorVal !== 0) {
                                            warning.detachedPixels.push({
                                                x: px,
                                                y: py,
                                                color: colorVal,
                                                progressStart: progress,
                                                baseAngle: Math.atan2(dy, dx),
                                                radius: dist
                                            });
                                            if (warning.pixelCache) warning.pixelCache[idx] = 0;
                                            if (this.offscreenCtx) {
                                                this.offscreenCtx.clearRect(px, py, 1, 1);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 1. Accretion Disk (glowing radial gradient)
                    const diskRadius = outerR * 0.45 * (1.0 + 0.05 * Math.sin(now / 250));
                    if (diskRadius > 0.1) {
                        const grad = this.ctx.createRadialGradient(wx, wy, 0, wx, wy, diskRadius);
                        grad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)'); // Singularity
                        grad.addColorStop(0.25, 'rgba(10, 10, 12, 1.0)'); // Dark void
                        grad.addColorStop(0.5, 'rgba(40, 25, 60, 0.9)'); // Dark violet haze
                        grad.addColorStop(0.75, 'rgba(100, 100, 110, 0.7)'); // Mysterious gray dust
                        grad.addColorStop(0.9, 'rgba(230, 230, 240, 0.35)'); // Silver accretion edge
                        grad.addColorStop(1.0, 'rgba(230, 230, 240, 0.0)');
                        
                        this.ctx.beginPath();
                        this.ctx.arc(wx, wy, diskRadius, 0, 2 * Math.PI);
                        this.ctx.fillStyle = grad;
                        this.ctx.fill();
                    }

                    // 2. 3 Swirling Galaxy Spiral Arms (slower, mysterious rotation)
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
                        this.ctx.strokeStyle = `rgba(130, 130, 140, ${0.25 + 0.15 * Math.sin(now / 150 + i)})`; // Gray/silver
                        this.ctx.lineWidth = 1.5 / scale;
                        this.ctx.stroke();
                    }

                    // 3. Draw detached pixels spiraling into the black hole
                    warning.detachedPixels.forEach(p => {
                        const t = (progress - p.progressStart) / (1.0001 - p.progressStart);
                        if (t >= 1.0) return;

                        const currentR = p.radius * (1 - t);
                        const currentAngle = p.baseAngle + (t * 3.5 * Math.PI) + (now / 300);
                        const px = wx + currentR * Math.cos(currentAngle);
                        const py = wy + currentR * Math.sin(currentAngle);

                        const pSize = Math.max(0.3, (1.2 * (1 - t))) / scale;

                        const val = p.color;
                        const r_val = val & 0xFF;
                        const g_val = (val >> 8) & 0xFF;
                        const b_val = (val >> 16) & 0xFF;
                        const a_val = ((val >> 24) & 0xFF) / 255;
                        this.ctx.fillStyle = `rgba(${r_val}, ${g_val}, ${b_val}, ${a_val})`;
                        this.ctx.fillRect(px - pSize/2, py - pSize/2, pSize, pSize);
                    });

                    // 4. Flowing cosmic dust particles (mysterious violet/gray/white)
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

                    // 5. Crosshair indicators
                    this.ctx.beginPath();
                    this.ctx.moveTo(wx - crossLength, wy);
                    this.ctx.lineTo(wx + crossLength, wy);
                    this.ctx.moveTo(wx, wy - crossLength);
                    this.ctx.lineTo(wx, wy + crossLength);
                    this.ctx.lineWidth = 0.8 / scale;
                    this.ctx.strokeStyle = 'rgba(120, 120, 130, 0.35)';
                    this.ctx.stroke();
                } else {
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
                
                // Si es cañón orbital, dibujar el rayo de energía residual de la bola al suelo
                if (exp.perkId === 'canon_orbital_1') {
                    const topBar = document.querySelector('.component-top');
                    const canvasEl = this.canvas;
                    let tbBottomY = 0;
                    if (topBar && canvasEl) {
                        const topBarRect = topBar.getBoundingClientRect();
                        const canvasRect = canvasEl.getBoundingClientRect();
                        tbBottomY = topBarRect.bottom - canvasRect.top;
                    }
                    const ex = exp.x + 0.5;
                    const ey = exp.y + 0.5;
                    const sourceY = (tbBottomY - this.transform.y) / this.transform.scale;
                    const sourceX = ex; // Alineación vertical perfecta

                    const maxBeamWidth = 16;
                    const currentBeamWidth = (maxBeamWidth * (1 - progress)) / this.transform.scale;

                    if (currentBeamWidth > 0.05) {
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.moveTo(sourceX, sourceY);
                        this.ctx.lineTo(ex, ey);
                        this.ctx.strokeStyle = `rgba(239, 68, 68, ${0.9 * opacity})`;
                        this.ctx.lineWidth = currentBeamWidth;
                        this.ctx.lineCap = 'round';
                        this.ctx.stroke();

                        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                        this.ctx.lineWidth = currentBeamWidth * 0.35;
                        this.ctx.stroke();
                        this.ctx.restore();
                    }
                }

                if (exp.perkId === 'agujero_negro_1') {
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