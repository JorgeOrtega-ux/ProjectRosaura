import { CanvasSyncChannel } from '../../../../core/services/CanvasSyncChannel.js';
import { showMessage } from '../../../../core/utils/uiUtils.js';
import { colorToAbgr } from './InteractionHelpers.js';

export const InteractionSelection = {
    getMaxBalance() {
        if (this.isOfflineMode) return Infinity;
        if (this.interactionMode === 'owner_erasing') return Infinity;
        if (this.interactionMode === 'placing_mines') return 10;
        return Math.floor(this.cooldownBalance);
    },

    getBoardCoords(clientX, clientY) {
        if (!this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const boardX = Math.floor((mouseX - this.transform.x) / this.transform.scale);
        const boardY = Math.floor((mouseY - this.transform.y) / this.transform.scale);

        if (this.isSeamlessTileMode) {
            const minBoundX = -this.boardWidth;
            const maxBoundX = this.boardWidth * 2;
            const minBoundY = -this.boardHeight;
            const maxBoundY = this.boardHeight * 2;
            if (boardX >= minBoundX && boardX < maxBoundX && boardY >= minBoundY && boardY < maxBoundY) {
                const wrappedX = ((boardX % this.boardWidth) + this.boardWidth) % this.boardWidth;
                const wrappedY = ((boardY % this.boardHeight) + this.boardHeight) % this.boardHeight;
                return { x: wrappedX, y: wrappedY };
            }
            return null;
        }

        if (boardX >= 0 && boardX < this.boardWidth && boardY >= 0 && boardY < this.boardHeight) {
            return { x: boardX, y: boardY };
        }
        return null;
    },

    getExactBoardCoords(clientX, clientY) {
        if (!this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        return {
            x: (mouseX - this.transform.x) / this.transform.scale,
            y: (mouseY - this.transform.y) / this.transform.scale
        };
    },

    calculateHoverPixel(clientX, clientY) {
        let newHover = null;
        if (this.interactionMode === 'offline_eyedropper') {
            const exact = this.getExactBoardCoords(clientX, clientY);
            if (exact) {
                newHover = { x: Math.floor(exact.x), y: Math.floor(exact.y) };
            }
        } else {
            newHover = this.getBoardCoords(clientX, clientY);
        }

        const hasHoveredPixel = !!this.hoveredPixel;
        const hasNewHover = !!newHover;
        
        let changed = false;
        if (hasHoveredPixel !== hasNewHover) {
            changed = true;
        } else if (hasHoveredPixel && hasNewHover) {
            if (this.hoveredPixel.x !== newHover.x || this.hoveredPixel.y !== newHover.y) {
                changed = true;
            }
        }

        if (changed) {
            this.hoveredPixel = newHover;
            this._selectionBitmaskDirty = true;
            this.requestRender();
            if (newHover) {
                this.setCanvasBadge('coords', 'my_location', `${newHover.x} , ${newHover.y}`, 'left');
            } else {
                this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            }
        }
    },

    updateSelectionUI() {
        if (typeof this.updateOwnerEraserFloatingToolbar === 'function') {
            this.updateOwnerEraserFloatingToolbar();
        }
        if (typeof this.updateMoveAreaFloatingToolbar === 'function') {
            this.updateMoveAreaFloatingToolbar();
        }

        if (!this.btnPlacePixels || !this.txtPlacePixels) return;

        const actionPill = this.btnPlacePixels.closest('.component-action-pill') || this.btnPlacePixels.parentElement;
        const iconSpan = this.btnPlacePixels.querySelector('.material-symbols-rounded');

        if (this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting') {
            if (actionPill) actionPill.classList.remove('disabled');
            this.btnPlacePixels.classList.remove('component-button--success');
            this.btnPlacePixels.classList.add('component-button--danger');
            if (this.interactionMode === 'owner_protecting') {
                this.btnPlacePixels.classList.remove('component-button--danger');
                this.btnPlacePixels.classList.add('component-button--success');
            }
            
            let areaSize = 0;
            if (this.ownerEraserBox) {
                areaSize = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            }

            if (this.ownerEraserBox && this.ownerEraserStep === 2) {
                this.btnPlacePixels.classList.remove('disabled-interaction');
                const label = this.interactionMode === 'owner_erasing' ? (window.__('btn_clear_area') || 'Vaciar zona') : 'Modificar protección';
                this.txtPlacePixels.textContent = `${label} (${areaSize} px)`;
                if (iconSpan) iconSpan.textContent = this.interactionMode === 'owner_erasing' ? 'delete' : 'admin_panel_settings';
            } else if (this.ownerEraserStep === 1) {
                this.btnPlacePixels.classList.add('disabled-interaction');
                const label = window.__('lbl_defining_zone') || 'Definiendo zona';
                this.txtPlacePixels.textContent = `${label} (${areaSize} px)...`;
                if (iconSpan) iconSpan.textContent = 'crop_free';
            } else {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = window.__('lbl_click_on_canvas') || 'Haz clic en el lienzo';
                if (iconSpan) iconSpan.textContent = 'touch_app';
            }
            return;
        }

        if (this.interactionMode === 'placing_mines') {
            if (actionPill) actionPill.classList.remove('disabled');
            this.btnPlacePixels.classList.remove('component-button--danger');
            this.btnPlacePixels.classList.add('component-button--success');
            if (iconSpan) iconSpan.textContent = 'bomb';

            const count = this.selectedPixels.size;
            if (count > 0 && count <= 10) {
                this.btnPlacePixels.classList.remove('disabled-interaction');
                this.txtPlacePixels.textContent = `Colocar minas (${count}/10)`;
            } else if (count > 10) {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = `Máx 10 minas`;
            } else {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = 'Selecciona píxeles';
            }
            return;
        }

        if (this.isOfflineMode) {
            // In offline mode and not in special interaction (owner_erasing/mines), hide the placement action pill
            if (actionPill) actionPill.classList.add('disabled');
            return;
        }

        if (actionPill) actionPill.classList.remove('disabled');
        let maxBalance = this.getMaxBalance();

        this.btnPlacePixels.classList.remove('component-button--success');
        this.btnPlacePixels.classList.remove('component-button--danger');
        if (iconSpan) iconSpan.textContent = 'touch_app';

        if (this.selectedPixels.size > 0 && this.selectedPixels.size <= maxBalance) {
            this.btnPlacePixels.classList.remove('disabled-interaction');
            this.txtPlacePixels.textContent = window.__('btn_place_pixels');
        } else {
            this.btnPlacePixels.classList.add('disabled-interaction');
            if (this.selectedPixels.size > maxBalance) {
                this.txtPlacePixels.textContent = (__('lbl_max_pixels')).replace(':max', maxBalance === Infinity ? '∞' : maxBalance);
            } else {
                this.txtPlacePixels.textContent = __('btn_select_pixels');
            }
        }
    },

    placePixels() {
        if ((this.selectedPixels.size === 0 && this.interactionMode !== 'owner_erasing' && this.interactionMode !== 'owner_protecting') || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'placing_mines') {
            if (this.selectedPixels.size === 0 || this.selectedPixels.size > 10) return;
            const pixels = Array.from(this.selectedPixels).map(key => {
                return { x: key & 0xffff, y: key >> 16 };
            });
            this.executePlaceMines(pixels);
            return;
        }

        if (this.interactionMode === 'owner_erasing') {
            if (!this.ownerEraserBox) return;
            if (this.isOfflineMode) {
                this.executeOwnerClearArea();
                return;
            }
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            window.modalSystem.show('confirmClearAreaModal', { count }).then(result => {
                if (result && result.confirmed) {
                    this.executeOwnerClearArea();
                }
            });
            return;
        }

        if (this.interactionMode === 'owner_protecting') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            window.modalSystem.show('confirmProtectAreaModal', { count }).then(result => {
                const actStr = (typeof result === 'string') ? result : (result?.action || (result?.confirmed ? 'protect' : null));
                if (actStr === 'protect' || actStr === 'unprotect') {
                    this.executeOwnerProtectArea(actStr === 'protect');
                }
            });
            return;
        }

        let maxBalance = this.getMaxBalance();

        if (this.selectedPixels.size > maxBalance) {
            showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance), 'warning');
            return;
        }

        // Se envía el color hexadecimal directamente
        let colorHex = this.currentColor;

        let validPixels = [];
        let hitProtected = false;
        
        this.selectedPixels.forEach(key => {
            const x = key & 0xFFFF;
            const y = key >> 16;
            const offset = (y * this.boardWidth) + x;

            if (this.protectedPixels && this.protectedPixels.has(offset)) {
                if (!this.isOwner) {
                    hitProtected = true;
                    return;
                }
            }
            validPixels.push({ key, x, y, offset });
        });
        
        if (hitProtected) {
            if (!this.lastProtectedToastTime || (Date.now() - this.lastProtectedToastTime > 2000)) {
                showMessage(__('err_pixel_protected'), 'warning');
                this.lastProtectedToastTime = Date.now();
            }
        }

        if (validPixels.length === 0) {
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        if (this.renderWorker) {
            const pixelsToPush = validPixels.map(p => ({
                x: p.x,
                y: p.y,
                color: this.currentColor
            }));
            this.renderWorker.postMessage({ type: 'PUSH_PIXELS', payload: { pixels: pixelsToPush } });
        } else if (this.offscreenCtx) {
            if (this.isOfflineMode) {
                if (!this.undoStack) this.undoStack = [];
                const diffs = [];
                validPixels.forEach(p => {
                    const img = this.offscreenCtx.getImageData(p.x, p.y, 1, 1);
                    const prevVal = new Uint32Array(img.data.buffer)[0];
                    const nextVal = colorToAbgr(this.currentColor);
                    if (prevVal !== nextVal) {
                        diffs.push({ x: p.x, y: p.y, prev: prevVal, next: nextVal });
                    }
                });
                if (diffs.length > 0) {
                    this.undoStack.push({ type: 'pixels', diffs });
                    this.redoStack = [];
                    if (this.undoStack.length > 50) this.undoStack.shift();
                }
            }
            validPixels.forEach(p => {
                this.offscreenCtx.fillStyle = this.currentColor;
                this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
            });
        }
        
        if (this.wsManager && validPixels.length > 0) {
            const parseColorToRgba = (color) => {
                if (!color || color === 'transparent') {
                    return { r: 0, g: 0, b: 0, a: 0 };
                }
                let hex = color.replace('#', '');
                let r = 0, g = 0, b = 0, a = 255;
                if (hex.length === 3) {
                    r = parseInt(hex[0] + hex[0], 16);
                    g = parseInt(hex[1] + hex[1], 16);
                    b = parseInt(hex[2] + hex[2], 16);
                } else if (hex.length === 6) {
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                } else if (hex.length === 8) {
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                    a = parseInt(hex.substring(6, 8), 16);
                }
                return { r, g, b, a };
            };

            if (validPixels.length === 1) {
                const p = validPixels[0];
                const buffer = new ArrayBuffer(9);
                const view = new DataView(buffer);
                view.setUint8(0, 1); // 1 = pixel opCode
                view.setUint16(1, p.x, false);
                view.setUint16(3, p.y, false);
                
                const rgba = parseColorToRgba(colorHex);
                view.setUint8(5, rgba.r);
                view.setUint8(6, rgba.g);
                view.setUint8(7, rgba.b);
                view.setUint8(8, rgba.a);

                this.wsManager.send(buffer);
            } else {
                const buffer = new ArrayBuffer(7 + 4 * validPixels.length);
                const view = new DataView(buffer);
                
                view.setUint8(0, 3); // 3 = batch_pixels opCode
                view.setUint16(1, validPixels.length, false);
                
                const rgba = parseColorToRgba(colorHex);
                view.setUint8(3, rgba.r);
                view.setUint8(4, rgba.g);
                view.setUint8(5, rgba.b);
                view.setUint8(6, rgba.a);
                
                let offset = 7;
                for (let idx = 0; idx < validPixels.length; idx++) {
                    view.setUint16(offset, validPixels[idx].x, false);
                    view.setUint16(offset + 2, validPixels[idx].y, false);
                    offset += 4;
                }
                this.wsManager.send(buffer);
            }
        }

        if (this.isOfflineMode) {
            try {
                CanvasSyncChannel.broadcast({
                    type: 'local_offline_stroke',
                    canvasId: this.canvasIntId,
                    canvasUuid: this.canvasId,
                    pixels: validPixels,
                    color: this.currentColor
                });
            } catch (e) {}
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.selectedPixels.clear();
            this.updateSelectionUI();
            if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
            this.requestRender();
            return;
        }

        if (!this.isOfflineMode && (this.interactionMode === 'normal' || this.interactionMode === 'default')) {
            this.cooldownBalance = Math.max(0, (this.cooldownBalance !== undefined ? this.cooldownBalance : this.cooldownMax) - validPixels.length);
            
            if (this.cooldownBalance < this.cooldownMax && (this.cooldownNextIn <= 0 || !this.lastSyncTime)) {
                this.cooldownNextIn = this.cooldownSec;
                this.lastSyncTime = Date.now();
            }
            showMessage(__('msg_pixels_placed'), 'success');
        }

        this.selectedPixels.clear();
        
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        this.requestRender();
    },

    cancelInteractionMode() {
        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.cancelMoveArea === 'function') this.cancelMoveArea(true);
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        if (btnEraser) btnEraser.classList.remove('active');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        if (btnBucket) btnBucket.classList.remove('active');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        if (btnSpray) btnSpray.classList.remove('active');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        if (btnDither) btnDither.classList.remove('active');
        const btnQuickShapes = document.querySelector('[data-ref="btn-offline-quick-shapes"]') || document.querySelector('[data-action="toggleOfflineQuickShapes"]');
        if (btnQuickShapes) btnQuickShapes.classList.remove('active');
        this.isQuickShapeDrawing = false;
        this.quickShapeStart = null;
        this.quickShapeCurrent = null;

        const btnShapes = document.querySelector('[data-ref="btn-offline-shapes"]');
        if (btnShapes) btnShapes.classList.remove('active');
        const shapesGrid = document.querySelector('[data-ref="shapes-grid"]');
        if (shapesGrid) {
            shapesGrid.querySelectorAll('.component-shape-card').forEach(c => c.classList.remove('active'));
        }
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.shapePreviewBox = null;

        const btnText = document.querySelector('[data-ref="btn-offline-text"]');
        if (btnText) btnText.classList.remove('active');
        const floatingTextEl = document.querySelector('[data-ref="canvas-floating-text"]');
        if (floatingTextEl) floatingTextEl.classList.add('disabled');
        this.textPreviewPixels = null;
        this.textPreviewShadow = null;
        this.textPreviewOutline = null;
        this.textPreviewBox = null;
        this.isTextDragging = false;
        this.textDragStart = null;

        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (typeof this.closeSubtoolbar === 'function') this.closeSubtoolbar();
        this.isDitherPainting = false;
        this.ditherLastCoords = null;
        this.isBrushPainting = false;
        this.brushLastCoords = null;
        this.isShadingPainting = false;
        this.shadingLastCoords = null;
        if (this.shadingTouchedInStroke) this.shadingTouchedInStroke.clear();
        const btnBrush = document.querySelector('[data-action="toggleOfflineBrush"]');
        if (btnBrush) btnBrush.classList.remove('active');
        const btnShading = document.querySelector('[data-action="toggleOfflineShading"]');
        if (btnShading) btnShading.classList.remove('active');
        document.querySelectorAll('[data-action="toggleEyedropper"]').forEach(btn => btn.classList.remove('active'));
        if (this.canvas) this.canvas.classList.remove('component-cursor-eyedropper');
        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
        if (typeof this.requestRender === 'function') this.requestRender();
        showMessage(window.__('special_mode_deactivated'), 'info');
    },

    

    updateOwnerBadges() {
        const badgesRight = document.querySelector('[data-ref="badges-right"]');
        if (!badgesRight) return;

        Array.from(badgesRight.children).forEach(badge => {
            const badgeId = badge.getAttribute('data-badge-id');
            if (badgeId !== 'reset-timer' && badgeId !== 'resize-timer') {
                badge.remove();
            }
        });

        if (this.isOwner) {
            const now = Date.now();
            const clearCooldownLeft = this.ownerCooldowns && this.ownerCooldowns.clear && this.ownerCooldowns.clear > now ? Math.ceil((this.ownerCooldowns.clear - now) / 1000) : 0;
            const protectCooldownLeft = this.ownerCooldowns && this.ownerCooldowns.protect && this.ownerCooldowns.protect > now ? Math.ceil((this.ownerCooldowns.protect - now) / 1000) : 0;
            const freezeCooldownLeft = this.ownerCooldowns && this.ownerCooldowns.freeze && this.ownerCooldowns.freeze > now ? Math.ceil((this.ownerCooldowns.freeze - now) / 1000) : 0;

            if (!this.isOfflineMode && (this.showOwnerTools || this.interactionMode === 'owner_erasing')) {
                const isToggledOn = (this.interactionMode === 'owner_erasing');
                const colorClass = isToggledOn ? 'component-text-danger' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-error)';
                    badgeEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }
                const label = window.__('badge_owner_eraser') || 'Borrador';
                if (clearCooldownLeft > 0) {
                    badgeEl.classList.add('disable-interaction');
                    badgeEl.innerHTML = `<span class="material-symbols-rounded">cleaning_services</span><span>${label} (${clearCooldownLeft}s)</span>`;
                } else {
                    badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">cleaning_services</span><span>${label}</span>`;
                }
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (clearCooldownLeft > 0) return;
                    this.toggleOwnerEraser();
                });
                badgesRight.appendChild(badgeEl);
            }

            if (!this.isOfflineMode && (this.showOwnerTools || this.isFrozen)) {
                const isToggledOn = this.isFrozen;
                const colorClass = isToggledOn ? 'component-text-warning' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge owner-freeze-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-warning)';
                    badgeEl.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                }
                const label = isToggledOn ? (window.__('badge_owner_unfreeze') || 'Descongelar Actividad') : (window.__('badge_owner_freeze') || 'Congelar Actividad');
                if (freezeCooldownLeft > 0) {
                    badgeEl.classList.add('disable-interaction');
                    badgeEl.innerHTML = `<span class="material-symbols-rounded">ac_unit</span><span>${label} (${freezeCooldownLeft}s)</span>`;
                } else {
                    badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">ac_unit</span><span>${label}</span>`;
                }
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (freezeCooldownLeft > 0) return;
                    this.toggleOwnerFreeze();
                });
                badgesRight.appendChild(badgeEl);
            }

            if (!this.isOfflineMode && (this.showOwnerTools || this.interactionMode === 'owner_protecting')) {
                const isToggledOn = (this.interactionMode === 'owner_protecting');
                const colorClass = isToggledOn ? 'component-text-success' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge owner-protect-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-success)';
                    badgeEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                }
                const label = window.__('badge_owner_protect') || 'Protecci├│n Administrativa';
                if (protectCooldownLeft > 0) {
                    badgeEl.classList.add('disable-interaction');
                    badgeEl.innerHTML = `<span class="material-symbols-rounded">admin_panel_settings</span><span>${label} (${protectCooldownLeft}s)</span>`;
                } else {
                    badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">admin_panel_settings</span><span>${label}</span>`;
                }
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (protectCooldownLeft > 0) return;
                    this.toggleOwnerProtecting();
                });
                badgesRight.appendChild(badgeEl);
            }
        }
    }
};
