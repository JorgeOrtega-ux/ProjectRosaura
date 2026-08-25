import { showMessage } from '../../../../core/utils/uiUtils.js';
import { abgrToHex, getBresenhamLine } from './InteractionHelpers.js';

export const InteractionPointer = {
    handleMouseDown(e) {
        const svArea = e.target.closest('[data-action="dragCustomSV"]');
        if (svArea) {
            this.isDraggingCustomPicker = 'sv';
            this.updateCustomColorFromEvent(e, svArea);
            if (e.cancelable) e.preventDefault();
            return;
        }
        const hueArea = e.target.closest('[data-action="dragCustomHue"]');
        if (hueArea) {
            this.isDraggingCustomPicker = 'hue';
            this.updateCustomColorFromEvent(e, hueArea);
            if (e.cancelable) e.preventDefault();
            return;
        }

        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;

        const exact = this.getExactBoardCoords(e.clientX, e.clientY);
        if (!exact) return;

        const isOperationalLocked = !!(this.isResetLocked || this.isResizeLocked || this.isInjectLocked || this.isClearLocked || (this.isFrozen && !this.isOwner));

        if (this.interactionMode === 'offline_eyedropper' && !this.isSpectator && !isOperationalLocked) {
            e.preventDefault();
            const bx = Math.floor(exact.x);
            const by = Math.floor(exact.y);
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PICK_PIXEL_COLOR',
                    payload: { x: bx, y: by, exactX: exact.x, exactY: exact.y }
                });
            } else {
                const hex = typeof this.sampleColorAtExact === 'function' ? this.sampleColorAtExact(exact.x, exact.y) : '#FFFFFF';
                this.selectAndAddCustomColor(hex);
                this.toggleEyedropper();
            }
            return;
        }



        if (this.activeTemplateId && !this.isSpectator && !isOperationalLocked) {
            const handleHit = typeof this.checkTemplateHandleHit === 'function' ? this.checkTemplateHandleHit(exact.x, exact.y) : null;
            if (handleHit) {
                e.preventDefault();
                const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                if (!tpl || tpl.locked) return;
                
                this.templateInteraction = {
                    type: 'resize-' + handleHit,
                    startX: exact.x,
                    startY: exact.y,
                    origX: tpl.x,
                    origY: tpl.y,
                    origW: tpl.w,
                    origH: tpl.h,
                    origAngle: tpl.angle || 0
                };
                return;
            }
        }

        if (e.shiftKey || e.button === 1 || this.isSpectator || isOperationalLocked) {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.classList.add('component-cursor-grabbing');
            return;
        }

        if (this.activeTemplateId && typeof this.checkTemplateHit === 'function') {
            let hit = this.checkTemplateHit(exact.x, exact.y);
            
            if (hit === 'move') {
                if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                    showMessage(__('err_only_owner_moves'), 'warning');
                    return;
                }

                const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                this.templateInteraction = {
                    type: hit,
                    startX: exact.x,
                    startY: exact.y,
                    origX: tpl.x,
                    origY: tpl.y,
                    origW: tpl.w,
                    origH: tpl.h,
                    origAngle: tpl.angle || 0
                };
                return; 
            }
        }

        const coords = this.getBoardCoords(e.clientX, e.clientY);
        if (coords) {
            if (this.interactionMode === 'offline_moving_area') {
                const box = this.moveAreaBox;
                if (this.moveAreaStep === 2 && box) {
                    const curX1 = Math.min(box.x1, box.x2) + (box.dx || 0);
                    const curX2 = Math.max(box.x1, box.x2) + (box.dx || 0);
                    const curY1 = Math.min(box.y1, box.y2) + (box.dy || 0);
                    const curY2 = Math.max(box.y1, box.y2) + (box.dy || 0);

                    if (coords.x >= curX1 && coords.x <= curX2 && coords.y >= curY1 && coords.y <= curY2) {
                        this.moveAreaStep = 3;
                        this.moveAreaDragAnchor = {
                            startX: coords.x,
                            startY: coords.y,
                            initialDx: box.dx || 0,
                            initialDy: box.dy || 0
                        };
                        this.selectMoveArea(box.x1, box.y1, box.x2, box.y2, box.dx || 0, box.dy || 0, 3);
                        this.canvas.classList.add('component-cursor-grabbing');
                        return;
                    }
                }

                this.moveAreaStep = 1;
                this.moveAreaStart = { x: coords.x, y: coords.y };
                this.selectMoveArea(coords.x, coords.y, coords.x, coords.y, 0, 0, 1);
                return;
            }

            if (this.interactionMode === 'offline_spray') {
                this.startSpray(coords.x, coords.y);
                return;
            }

            if (this.interactionMode === 'offline_bucket') {
                this.executeOfflineBucket(coords.x, coords.y);
                return;
            }

            if (this.interactionMode === 'offline_eraser_brush') {
                this.isBrushErasing = true;
                this.brushEraserLastCoords = { x: coords.x, y: coords.y };
                this.applyBrushEraseAt(coords.x, coords.y, true);
                return;
            }

            if (this.interactionMode === 'offline_dither') {
                this.isDitherPainting = true;
                this.ditherLastCoords = { x: coords.x, y: coords.y };
                this.applyDitherAt(coords.x, coords.y, true);
                return;
            }

            if (this.interactionMode === 'offline_shading') {
                this.isShadingPainting = true;
                this.shadingLastCoords = { x: coords.x, y: coords.y };
                this.shadingTouchedInStroke = new Set();
                this.applyShadingAt(coords.x, coords.y, true);
                return;
            }

            if (this.interactionMode === 'offline_brush') {
                this.isBrushPainting = true;
                this.brushLastCoords = { x: coords.x, y: coords.y };
                this.applyBrushAt(coords.x, coords.y, true);
                return;
            }

            if (this.interactionMode === 'offline_quick_shapes') {
                this.isQuickShapeDrawing = true;
                this.quickShapeStart = { x: coords.x, y: coords.y };
                this.quickShapeCurrent = { x: coords.x, y: coords.y };
                this.updateQuickShapePreview(e && e.shiftKey);
                return;
            }

            if (this.interactionMode === 'offline_shape') {
                this.isShapeDrawing = true;
                this.shapeStart = { x: coords.x, y: coords.y };
                this.shapeCurrent = { x: coords.x, y: coords.y };
                this.updateShapePreview();
                return;
            }

            if (this.interactionMode === 'offline_text') {
                if (!this.textPosition) {
                    this.textPosition = { x: coords.x, y: coords.y };
                    this.updatePixelTextControlsUI();
                    const floatingEl = document.querySelector('[data-ref="canvas-floating-text"]');
                    if (floatingEl) {
                        floatingEl.classList.remove('disabled');
                        floatingEl.classList.add('active');
                    }
                    this.updatePixelTextPreview();
                    const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
                    if (floatingInput) {
                        floatingInput.value = this.activePixelText?.text || '';
                        setTimeout(() => floatingInput.focus(), 60);
                    }
                } else {
                    const box = this.textPreviewBox;
                    if (box && coords.x >= box.minX && coords.x <= box.maxX && coords.y >= box.minY && coords.y <= box.maxY && this.activePixelText?.text?.length > 0) {
                        this.isTextDragging = true;
                        this.textDragStart = {
                            offsetX: coords.x - this.textPosition.x,
                            offsetY: coords.y - this.textPosition.y
                        };
                    } else {
                        this.textPosition = { x: coords.x, y: coords.y };
                        this.updatePixelTextPreview();
                        const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
                        if (floatingInput) {
                            floatingInput.focus();
                        }
                    }
                }
                return;
            }

            if (this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting') {
                const bw = this.boardWidth || 64;
                const offset = (coords.y * bw) + coords.x;
                
                if (this.interactionMode === 'owner_protecting' && (this.ownerEraserStep === 0 || this.ownerEraserStep === 2)) {
                    const area = this.protectedAreas ? this.protectedAreas.find(a => coords.x >= a.x1 && coords.x <= a.x2 && coords.y >= a.y1 && coords.y <= a.y2) : null;
                    if (area) {
                        const count = (area.x2 - area.x1 + 1) * (area.y2 - area.y1 + 1);
                        window.modalSystem.show('confirmUnprotectAreaModal', { count }).then(res => {
                            const actStr = (typeof res === 'string') ? res : (res?.action || null);
                            if (actStr === 'unprotect') {
                                this.executeOwnerUnprotectArea(area.x1, area.y1, area.x2, area.y2);
                            }
                        });
                        return;
                    }
                }

                if (this.ownerEraserStep === 0 || this.ownerEraserStep === 2) {
                    this.ownerEraserStep = 1;
                    this.ownerEraserStart = { x: coords.x, y: coords.y };
                    this.selectOwnerArea(coords.x, coords.y, coords.x, coords.y, false);
                    if (typeof showMessage === 'function') {
                        showMessage(`Esquina 1 fijada en (${coords.x}, ${coords.y}). Mueve el cursor y haz clic de nuevo para fijar la zona.`, 'info');
                    }
                } else if (this.ownerEraserStep === 1) {
                    this.ownerEraserStep = 2;
                    this.selectOwnerArea(this.ownerEraserStart.x, this.ownerEraserStart.y, coords.x, coords.y, false);
                    if (typeof showMessage === 'function') {
                        let areaSize = 0;
                        if (this.ownerEraserBox) {
                            areaSize = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
                        }
                        const actionWord = this.interactionMode === 'owner_erasing' ? 'Vaciar zona' : 'Bloquear zona';
                        showMessage(`Zona fijada (${areaSize} px). Haz clic en '${actionWord}' abajo para confirmar.`, 'success');
                    }
                }
                return;
            }

            if (this.isOfflineMode) {
                if (this.selectedPixels && this.selectedPixels.size > 0) {
                    this.selectedPixels.clear();
                    this.updateSelectionUI();
                }
                this.isBrushPainting = true;
                this.brushLastCoords = { x: coords.x, y: coords.y };
                this.applyBrushAt(coords.x, coords.y, true);
                return;
            }

            const bw = this.boardWidth || 64;
            const key = (coords.y << 16) | coords.x;
            const symX = bw - 1 - coords.x;
            const symKey = (coords.y << 16) | symX;
            const hasSym = this.isMirrorMode && symX >= 0 && symX < bw && symX !== coords.x;

            if (this.selectedPixels.has(key)) {
                this.selectionMode = 'remove';
                this.selectedPixels.delete(key);
                if (hasSym) this.selectedPixels.delete(symKey);
            } else {
                this.selectionMode = 'add';
                const maxBalance = this.getMaxBalance();
                if (this.selectedPixels.size < maxBalance) {
                    this.selectedPixels.add(key);
                    if (hasSym && this.selectedPixels.size < maxBalance) {
                        this.selectedPixels.add(symKey);
                    }
                } else {
                    showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance), 'warning');
                }
            }
            this.isSelecting = true;
            this.updateSelectionUI();
            this.requestRender();
        }
    },

    handleMouseMove(e) {
        if (this.isDraggingCustomPicker) {
            const picker = document.querySelector('[data-ref="customColorPicker"]');
            if (picker) {
                if (this.isDraggingCustomPicker === 'sv') {
                    const svArea = picker.querySelector('[data-action="dragCustomSV"]');
                    if (svArea) this.updateCustomColorFromEvent(e, svArea);
                } else if (this.isDraggingCustomPicker === 'hue') {
                    const hueArea = picker.querySelector('[data-action="dragCustomHue"]');
                    if (hueArea) this.updateCustomColorFromEvent(e, hueArea);
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_moving_area') {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                if (this.moveAreaStep === 1 && this.moveAreaStart) {
                    this.selectMoveArea(this.moveAreaStart.x, this.moveAreaStart.y, coords.x, coords.y, 0, 0, 1);
                    return;
                }
                if (this.moveAreaStep === 3 && this.moveAreaDragAnchor && this.moveAreaBox) {
                    const dx = this.moveAreaDragAnchor.initialDx + (coords.x - this.moveAreaDragAnchor.startX);
                    const dy = this.moveAreaDragAnchor.initialDy + (coords.y - this.moveAreaDragAnchor.startY);
                    this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, dx, dy, 3);
                    return;
                }
            }
        }

        if (this.interactionMode === 'offline_spray' && this.isSpraying) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                this.updateSpray(coords.x, coords.y);
            }
            return;
        }

        if (this.interactionMode === 'offline_eraser_brush' && this.isBrushErasing) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords && this.brushEraserLastCoords) {
                if (coords.x !== this.brushEraserLastCoords.x || coords.y !== this.brushEraserLastCoords.y) {
                    const line = getBresenhamLine(this.brushEraserLastCoords.x, this.brushEraserLastCoords.y, coords.x, coords.y);
                    this.applyBrushEraseLine(line.slice(1), false);
                    this.brushEraserLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_dither' && this.isDitherPainting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords && this.ditherLastCoords) {
                if (coords.x !== this.ditherLastCoords.x || coords.y !== this.ditherLastCoords.y) {
                    const line = getBresenhamLine(this.ditherLastCoords.x, this.ditherLastCoords.y, coords.x, coords.y);
                    this.applyDitherStrokeLine(line.slice(1), false);
                    this.ditherLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_shading' && this.isShadingPainting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords && this.shadingLastCoords) {
                if (coords.x !== this.shadingLastCoords.x || coords.y !== this.shadingLastCoords.y) {
                    const line = getBresenhamLine(this.shadingLastCoords.x, this.shadingLastCoords.y, coords.x, coords.y);
                    this.applyShadingStrokeLine(line.slice(1), false);
                    this.shadingLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.isBrushPainting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords && this.brushLastCoords) {
                if (coords.x !== this.brushLastCoords.x || coords.y !== this.brushLastCoords.y) {
                    const line = getBresenhamLine(this.brushLastCoords.x, this.brushLastCoords.y, coords.x, coords.y);
                    this.applyBrushStrokeLine(line.slice(1), false);
                    this.brushLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_quick_shapes' && this.isQuickShapeDrawing && this.quickShapeStart) {
            let coords = this.getBoardCoords(e.clientX, e.clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords) {
                this.quickShapeCurrent = { x: coords.x, y: coords.y };
                this.updateQuickShapePreview(e && e.shiftKey);
            }
            return;
        }

        if (this.interactionMode === 'offline_shape' && this.isShapeDrawing && this.shapeStart) {
            let coords = this.getBoardCoords(e.clientX, e.clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords && (!this.shapeCurrent || coords.x !== this.shapeCurrent.x || coords.y !== this.shapeCurrent.y)) {
                this.shapeCurrent = { x: coords.x, y: coords.y };
                this.updateShapePreview();
            }
            return;
        }

        if (this.interactionMode === 'offline_text' && this.isTextDragging && this.textDragStart) {
            let coords = this.getBoardCoords(e.clientX, e.clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords) {
                const newX = Math.max(0, coords.x - this.textDragStart.offsetX);
                const newY = Math.max(0, coords.y - this.textDragStart.offsetY);
                if (!this.textPosition || this.textPosition.x !== newX || this.textPosition.y !== newY) {
                    this.textPosition = { x: newX, y: newY };
                    this.updatePixelTextPreview();
                }
            }
            return;
        }

        if ((this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting') && this.ownerEraserStep === 1 && this.ownerEraserStart) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                this.selectOwnerArea(this.ownerEraserStart.x, this.ownerEraserStart.y, coords.x, coords.y, false);
            }
            return;
        }
        
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.transform.x += dx;
            this.transform.y += dy;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            
            if (typeof this.limitBounds === 'function') this.limitBounds();
            this.calculateHoverPixel(e.clientX, e.clientY);
            if (this.interactionMode === 'offline_text' && typeof this.updateFloatingTextPosition === 'function') {
                this.updateFloatingTextPosition();
            }
            this.requestRender();

            if (this.isProgressive && typeof this.updateVisibleChunks === 'function') {
                if (this.chunkThrottleTimer) clearTimeout(this.chunkThrottleTimer);
                this.chunkThrottleTimer = setTimeout(() => this.updateVisibleChunks(), 100);
            }
            return;
        }

        if (this.templateInteraction) {
            const exact = this.getExactBoardCoords(e.clientX, e.clientY);
            if (!exact) return;

            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            const dx = exact.x - this.templateInteraction.startX;
            const dy = exact.y - this.templateInteraction.startY;

            if (this.templateInteraction.type === 'move') {
                let newX = Math.round(this.templateInteraction.origX + dx);
                let newY = Math.round(this.templateInteraction.origY + dy);
                
                const angleRad = (tpl.angle || 0) * Math.PI / 180;
                const cosA = Math.cos(angleRad);
                const sinA = Math.sin(angleRad);
                
                const w2 = tpl.w / 2;
                const h2 = tpl.h / 2;
                
                const corners = [
                    { x: -w2, y: -h2 },
                    { x: w2, y: -h2 },
                    { x: -w2, y: h2 },
                    { x: w2, y: h2 }
                ];
                
                let minRx = Infinity, maxRx = -Infinity;
                let minRy = Infinity, maxRy = -Infinity;
                
                for (let c of corners) {
                    const rx = c.x * cosA - c.y * sinA;
                    const ry = c.x * sinA + c.y * cosA;
                    if (rx < minRx) minRx = rx;
                    if (rx > maxRx) maxRx = rx;
                    if (ry < minRy) minRy = ry;
                    if (ry > maxRy) maxRy = ry;
                }
                
                const minX = Math.round(-w2 - minRx);
                const maxX = Math.round(this.boardWidth - w2 - maxRx);
                const minY = Math.round(-h2 - minRy);
                const maxY = Math.round(this.boardHeight - h2 - maxRy);
                
                newX = Math.max(minX, Math.min(newX, maxX));
                newY = Math.max(minY, Math.min(newY, maxY));
                
                tpl.x = newX;
                tpl.y = newY;
            } else {
                const aspect = this.templateInteraction.origW / this.templateInteraction.origH;
                const angleRad = (this.templateInteraction.origAngle || 0) * Math.PI / 180;
                const cosA = Math.cos(angleRad);
                const sinA = Math.sin(angleRad);

                // 1. Determine anchor's local coordinates relative to center
                let localAnchorX, localAnchorY;
                let signX = 1, signY = 1;
                
                if (this.templateInteraction.type === 'resize-br') {
                    localAnchorX = -this.templateInteraction.origW / 2;
                    localAnchorY = -this.templateInteraction.origH / 2;
                    signX = 1; signY = 1;
                } else if (this.templateInteraction.type === 'resize-tl') {
                    localAnchorX = this.templateInteraction.origW / 2;
                    localAnchorY = this.templateInteraction.origH / 2;
                    signX = -1; signY = -1;
                } else if (this.templateInteraction.type === 'resize-tr') {
                    localAnchorX = -this.templateInteraction.origW / 2;
                    localAnchorY = this.templateInteraction.origH / 2;
                    signX = 1; signY = -1;
                } else if (this.templateInteraction.type === 'resize-bl') {
                    localAnchorX = this.templateInteraction.origW / 2;
                    localAnchorY = -this.templateInteraction.origH / 2;
                    signX = -1; signY = 1;
                }

                // 2. Calculate anchor's board coordinates
                const origCx = this.templateInteraction.origX + this.templateInteraction.origW / 2;
                const origCy = this.templateInteraction.origY + this.templateInteraction.origH / 2;
                const anchorBoardX = origCx + localAnchorX * cosA - localAnchorY * sinA;
                const anchorBoardY = origCy + localAnchorX * sinA + localAnchorY * cosA;

                // 3. Inverse rotate mouse position around the anchor board coordinate
                const dxAnchor = exact.x - anchorBoardX;
                const dyAnchor = exact.y - anchorBoardY;
                const cosInv = Math.cos(-angleRad);
                const sinInv = Math.sin(-angleRad);
                const mouseUnrotatedX = dxAnchor * cosInv - dyAnchor * sinInv;
                const mouseUnrotatedY = dxAnchor * sinInv + dyAnchor * cosInv;

                // 4. Calculate proposed width and height
                const proposedW_X = mouseUnrotatedX * signX;
                const proposedW_Y = (mouseUnrotatedY * signY) * aspect;
                let newW = Math.max(proposedW_X, proposedW_Y);

                // 5. Apply limits and round to even
                newW = Math.max(20, newW);
                
                // Calculate strict maxW to prevent visual bounds from escaping the board
                let strictMaxW = Infinity;
                const normAnchorX = localAnchorX / this.templateInteraction.origW;
                const normAnchorY = localAnchorY / this.templateInteraction.origW;

                const cornerNorms = [
                    { nx: -0.5, ny: -0.5 / aspect },
                    { nx: 0.5, ny: -0.5 / aspect },
                    { nx: -0.5, ny: 0.5 / aspect },
                    { nx: 0.5, ny: 0.5 / aspect }
                ];

                for (let cn of cornerNorms) {
                    const diffX = cn.nx - normAnchorX;
                    const diffY = cn.ny - normAnchorY;
                    const kX = diffX * cosA - diffY * sinA;
                    const kY = diffX * sinA + diffY * cosA;

                    if (kX > 0.0001) strictMaxW = Math.min(strictMaxW, (this.boardWidth - anchorBoardX) / kX);
                    else if (kX < -0.0001) strictMaxW = Math.min(strictMaxW, -anchorBoardX / kX);

                    if (kY > 0.0001) strictMaxW = Math.min(strictMaxW, (this.boardHeight - anchorBoardY) / kY);
                    else if (kY < -0.0001) strictMaxW = Math.min(strictMaxW, -anchorBoardY / kY);
                }

                newW = Math.min(newW, strictMaxW);
                
                const MAX_TEMPLATE_SIZE = Math.max(this.boardWidth || 4096, this.boardHeight || 4096);
                newW = Math.min(newW, MAX_TEMPLATE_SIZE);
                
                newW = Math.round(newW / 2) * 2;
                let newH = Math.round(newW / aspect);
                
                if (newH > MAX_TEMPLATE_SIZE) {
                    newH = MAX_TEMPLATE_SIZE;
                    newW = Math.round(newH * aspect);
                    newW = Math.round(newW / 2) * 2;
                    newH = Math.round(newH / 2) * 2;
                } else {
                    newH = Math.round(newH / 2) * 2;
                }

                // 6. Calculate new center to keep anchor stationary
                let newLocalAnchorX = localAnchorX < 0 ? -newW / 2 : newW / 2;
                let newLocalAnchorY = localAnchorY < 0 ? -newH / 2 : newH / 2;

                const newCx = anchorBoardX - (newLocalAnchorX * cosA - newLocalAnchorY * sinA);
                const newCy = anchorBoardY - (newLocalAnchorX * sinA + newLocalAnchorY * cosA);

                tpl.w = newW;
                tpl.h = newH;
                tpl.x = Math.round(newCx - newW / 2);
                tpl.y = Math.round(newCy - newH / 2);
            }

            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (this.uiLiveInputX) {
                    this.uiLiveInputX.setAttribute('data-value', tpl.x);
                    this.uiLiveInputX.textContent = tpl.x;
                }
                if (this.uiLiveInputY) {
                    this.uiLiveInputY.setAttribute('data-value', tpl.y);
                    this.uiLiveInputY.textContent = tpl.y;
                }
            }

            this.requestRender();
            return; 
        }

        if (this.isOwnerSelecting) {
            if (!this.isOwnerDragActive && this.ownerEraserStart) {
                if (this.selectedPixels.size === 0) {
                    this.selectOwnerArea(this.ownerEraserStart.x, this.ownerEraserStart.y, this.ownerEraserStart.x, this.ownerEraserStart.y, false);
                }
            }
            this.isOwnerSelecting = false;
            this.isOwnerDragActive = false;
        }

        if (this.isSelecting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                const bw = this.boardWidth || 64;
                const key = (coords.y << 16) | coords.x;
                const symX = bw - 1 - coords.x;
                const symKey = (coords.y << 16) | symX;
                const hasSym = this.isMirrorMode && symX >= 0 && symX < bw && symX !== coords.x;
                const sizeBefore = this.selectedPixels.size;
                
                if (this.selectionMode === 'add') {
                    const maxBalance = this.getMaxBalance();
                    if (this.selectedPixels.size < maxBalance) {
                        this.selectedPixels.add(key);
                        if (hasSym && this.selectedPixels.size < maxBalance) {
                            this.selectedPixels.add(symKey);
                        }
                    }
                } else {
                    this.selectedPixels.delete(key);
                    if (hasSym) this.selectedPixels.delete(symKey);
                }
                
                if (this.selectedPixels.size !== sizeBefore) {
                    this.updateSelectionUI();
                    this.requestRender();
                }
            }
        }

        const target = e.target.closest('[data-ref="design-canvas"]');
        if (target) {
            const exact = this.getExactBoardCoords(e.clientX, e.clientY);
            let hit = null;
            if (exact && !this.isSpectator && !this.isResetLocked) {
                if (typeof this.checkTemplateHandleHit === 'function') {
                    hit = this.checkTemplateHandleHit(exact.x, exact.y);
                    if (hit) hit = 'resize-' + hit;
                }
                if (!hit && typeof this.checkTemplateHit === 'function') {
                    hit = this.checkTemplateHit(exact.x, exact.y);
                }
            }
            
            if (hit) {
                if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                    this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw', 'component-cursor-pointer');
                } else {
                    this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw', 'component-cursor-pointer');
                    
                    let visualHit = hit;
                    if (hit && hit.startsWith('resize-')) {
                        let angle = 0;
                        if (this.activeTemplateId) {
                            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                            if (tpl && tpl.angle) angle = (tpl.angle % 360 + 360) % 360;
                        }
                        const corners = ['tl', 'tr', 'br', 'bl'];
                        const corner = hit.split('-')[1];
                        const index = corners.indexOf(corner);
                        if (index !== -1) {
                            const steps = Math.floor((angle + 45) / 90);
                            const visualIndex = (index + steps) % 4;
                            visualHit = 'resize-' + corners[visualIndex];
                        }
                    }

                    if (hit === 'move') this.canvas.classList.add('component-cursor-move');
                    else if (visualHit === 'resize-tl' || visualHit === 'resize-br') this.canvas.classList.add('component-cursor-nwse');
                    else if (visualHit === 'resize-tr' || visualHit === 'resize-bl') this.canvas.classList.add('component-cursor-nesw');
                }
                
                if (this.hoveredPixel !== null) {
                    this.hoveredPixel = null;
                    this._selectionBitmaskDirty = true;
                    this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
                    this.requestRender();
                }
                return;
            } else {
                this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw');
                if (this.isDragging) {
                    this.canvas.classList.add('component-cursor-grabbing');
                } else {
                    this.canvas.classList.remove('component-cursor-grabbing');
                }
            }
            
            this.calculateHoverPixel(e.clientX, e.clientY);
        } else if (this.hoveredPixel !== null) {
            this.hoveredPixel = null;
            this._selectionBitmaskDirty = true;
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            this.requestRender();
        }
    },

    handleMouseUp(e) {
        if (this.isDraggingCustomPicker) {
            this.isDraggingCustomPicker = false;
        }

        if (this.interactionMode === 'offline_text' && this.isTextDragging) {
            this.isTextDragging = false;
            this.textDragStart = null;
        }

        if (this.interactionMode === 'offline_quick_shapes' && this.isQuickShapeDrawing) {
            this.commitQuickShapeDrawing(e && e.shiftKey);
        }

        if (this.interactionMode === 'offline_shape' && this.isShapeDrawing) {
            this.commitShapeDrawing();
        }

        if (this.interactionMode === 'offline_moving_area') {
            if (this.moveAreaStep === 1 && this.moveAreaBox) {
                this.moveAreaStep = 2;
                this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, 0, 0, 2);
                return;
            }
            if (this.moveAreaStep === 3 && this.moveAreaBox) {
                this.canvas.classList.remove('component-cursor-grabbing');
                const dx = this.moveAreaBox.dx || 0;
                const dy = this.moveAreaBox.dy || 0;
                if (dx !== 0 || dy !== 0) {
                    this.commitMoveArea();
                } else {
                    this.moveAreaStep = 2;
                    this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, 0, 0, 2);
                }
                return;
            }
        }

        if (this.interactionMode === 'offline_spray' && this.isSpraying) {
            this.stopSpray();
        }

        if (this.isBrushErasing) {
            this.isBrushErasing = false;
            this.brushEraserLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        }

        if (this.isDitherPainting) {
            this.isDitherPainting = false;
            this.ditherLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        }

        if (this.isShadingPainting) {
            this.isShadingPainting = false;
            this.shadingLastCoords = null;
            if (this.shadingTouchedInStroke) this.shadingTouchedInStroke.clear();
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'APPLY_SHADING',
                        payload: {
                            cx: 0,
                            cy: 0,
                            mode: this.shadingMode || 'shadow',
                            size: this.shadingSize || 1,
                            isMirrorMode: !!this.isMirrorMode,
                            strokePhase: 'end'
                        }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        }

        if (this.isBrushPainting) {
            this.isBrushPainting = false;
            this.brushLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        }

        if (this.recentDragMode) {
            this.saveRecentColor(false);
            this.recentDragMode = null;
            this.recentDragArea = null;
            return;
        }

        if (this.templateInteraction) {
            const activeTpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
            if (activeTpl && activeTpl.isShape && typeof this.refreshShapeTemplateColor === 'function') {
                this.refreshShapeTemplateColor(activeTpl, activeTpl.color || this.currentColor);
            }
            this.templateInteraction = null;
            this.requestRender();
            
            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (typeof this.emitLiveImageUpdate === 'function') {
                    this.emitLiveImageUpdate();
                }
            }

            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.classList.remove('component-cursor-grabbing');
        }
        
        if (this.isSelecting) {
            this.isSelecting = false;
        }

        this.calculateHoverPixel(e.clientX, e.clientY);
        this.requestRender();
    },

    handleTouchStart(e) {
        const svArea = e.target.closest('[data-action="dragCustomSV"]');
        const hueArea = e.target.closest('[data-action="dragCustomHue"]');
        if (svArea || hueArea) {
            this.isDraggingCustomPicker = svArea ? 'sv' : 'hue';
            this.updateCustomColorFromEvent(e.touches[0], svArea || hueArea);
            e.preventDefault();
            return;
        }

        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            this.isPinching = true;
            this.isDragging = false;
            this.templateInteraction = null;
            this.initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            this.initialScale = this.transform.scale;
            return;
        }

        if (e.touches.length === 1) {
            
            this.touchStartTime = Date.now();
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            const isOperationalLocked = !!(this.isResetLocked || this.isResizeLocked || this.isInjectLocked || this.isClearLocked || (this.isFrozen && !this.isOwner));

            if (this.interactionMode === 'offline_eyedropper' && !this.isSpectator && !isOperationalLocked) {
                e.preventDefault();
                const exact = this.getExactBoardCoords(this.touchStartX, this.touchStartY);
                if (exact) {
                    const bx = Math.floor(exact.x);
                    const by = Math.floor(exact.y);
                    if (this.renderWorker) {
                        this.renderWorker.postMessage({
                            type: 'PICK_PIXEL_COLOR',
                            payload: { x: bx, y: by, exactX: exact.x, exactY: exact.y }
                        });
                    } else {
                        const hex = typeof this.sampleColorAtExact === 'function' ? this.sampleColorAtExact(exact.x, exact.y) : '#FFFFFF';
                        this.selectAndAddCustomColor(hex);
                        this.toggleEyedropper();
                    }
                }
                return;
            }

            if (this.interactionMode === 'offline_moving_area' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    const box = this.moveAreaBox;
                    if (this.moveAreaStep === 2 && box) {
                        const curX1 = Math.min(box.x1, box.x2) + (box.dx || 0);
                        const curX2 = Math.max(box.x1, box.x2) + (box.dx || 0);
                        const curY1 = Math.min(box.y1, box.y2) + (box.dy || 0);
                        const curY2 = Math.max(box.y1, box.y2) + (box.dy || 0);

                        if (coords.x >= curX1 && coords.x <= curX2 && coords.y >= curY1 && coords.y <= curY2) {
                            e.preventDefault();
                            this.moveAreaStep = 3;
                            this.moveAreaDragAnchor = {
                                startX: coords.x,
                                startY: coords.y,
                                initialDx: box.dx || 0,
                                initialDy: box.dy || 0
                            };
                            this.selectMoveArea(box.x1, box.y1, box.x2, box.y2, box.dx || 0, box.dy || 0, 3);
                            return;
                        }
                    }

                    e.preventDefault();
                    this.moveAreaStep = 1;
                    this.moveAreaStart = { x: coords.x, y: coords.y };
                    this.selectMoveArea(coords.x, coords.y, coords.x, coords.y, 0, 0, 1);
                    return;
                }
            }

            if (this.interactionMode === 'offline_spray' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.startSpray(coords.x, coords.y);
                    return;
                }
            }

            if (this.interactionMode === 'offline_eraser_brush' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isBrushErasing = true;
                    this.brushEraserLastCoords = { x: coords.x, y: coords.y };
                    this.applyBrushEraseAt(coords.x, coords.y, true);
                    return;
                }
            }

            if (this.interactionMode === 'offline_dither' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isDitherPainting = true;
                    this.ditherLastCoords = { x: coords.x, y: coords.y };
                    this.applyDitherAt(coords.x, coords.y, true);
                    return;
                }
            }

            if (this.interactionMode === 'offline_shading' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isShadingPainting = true;
                    this.shadingLastCoords = { x: coords.x, y: coords.y };
                    this.shadingTouchedInStroke = new Set();
                    this.applyShadingAt(coords.x, coords.y, true);
                    return;
                }
            }

            if ((this.interactionMode === 'offline_brush' || (this.isOfflineMode && this.interactionMode === 'normal')) && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    if (this.selectedPixels && this.selectedPixels.size > 0) {
                        this.selectedPixels.clear();
                        this.updateSelectionUI();
                    }
                    this.isBrushPainting = true;
                    this.brushLastCoords = { x: coords.x, y: coords.y };
                    this.applyBrushAt(coords.x, coords.y, true);
                    return;
                }
            }

            if (this.interactionMode === 'offline_quick_shapes' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isQuickShapeDrawing = true;
                    this.quickShapeStart = { x: coords.x, y: coords.y };
                    this.quickShapeCurrent = { x: coords.x, y: coords.y };
                    this.updateQuickShapePreview(false);
                    return;
                }
            }

            if (this.interactionMode === 'offline_shape' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isShapeDrawing = true;
                    this.shapeStart = { x: coords.x, y: coords.y };
                    this.shapeCurrent = { x: coords.x, y: coords.y };
                    this.updateShapePreview();
                    return;
                }
            }

            if (this.interactionMode === 'offline_text' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    if (!this.textPosition) {
                        this.textPosition = { x: coords.x, y: coords.y };
                        this.updatePixelTextControlsUI();
                        const floatingEl = document.querySelector('[data-ref="canvas-floating-text"]');
                        if (floatingEl) {
                            floatingEl.classList.remove('disabled');
                            floatingEl.classList.add('active');
                        }
                        this.updatePixelTextPreview();
                        const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
                        if (floatingInput) {
                            floatingInput.value = this.activePixelText?.text || '';
                            setTimeout(() => floatingInput.focus(), 60);
                        }
                    } else {
                        const box = this.textPreviewBox;
                        if (box && coords.x >= box.minX && coords.x <= box.maxX && coords.y >= box.minY && coords.y <= box.maxY && this.activePixelText?.text?.length > 0) {
                            this.isTextDragging = true;
                            this.textDragStart = {
                                offsetX: coords.x - this.textPosition.x,
                                offsetY: coords.y - this.textPosition.y
                            };
                        } else {
                            this.textPosition = { x: coords.x, y: coords.y };
                            this.updatePixelTextPreview();
                            const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
                            if (floatingInput) {
                                floatingInput.focus();
                            }
                        }
                    }
                    return;
                }
            }

            const exact = this.getExactBoardCoords(this.touchStartX, this.touchStartY);
            if (exact && !this.isSpectator && !isOperationalLocked) {
                let hit = null;
                if (typeof this.checkTemplateHit === 'function') {
                    hit = this.checkTemplateHit(exact.x, exact.y);
                }
                
                if (hit) {
                    e.preventDefault(); 
                    if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                        showMessage(__('err_only_owner_moves'), 'warning');
                        return;
                    }
                    const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                    this.templateInteraction = {
                        type: hit,
                        startX: exact.x,
                        startY: exact.y,
                        origX: tpl.x,
                        origY: tpl.y,
                        origW: tpl.w,
                        origH: tpl.h
                    };
                    return;
                }
            }

            this.isDragging = true;
            this.touchHasMoved = false;
        }
    },

    handleTouchMove(e) {
        if (this.interactionMode === 'offline_moving_area' && e.touches.length === 1) {
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords) {
                if (this.moveAreaStep === 1 && this.moveAreaStart) {
                    e.preventDefault();
                    this.selectMoveArea(this.moveAreaStart.x, this.moveAreaStart.y, coords.x, coords.y, 0, 0, 1);
                    return;
                }
                if (this.moveAreaStep === 3 && this.moveAreaDragAnchor && this.moveAreaBox) {
                    e.preventDefault();
                    const dx = this.moveAreaDragAnchor.initialDx + (coords.x - this.moveAreaDragAnchor.startX);
                    const dy = this.moveAreaDragAnchor.initialDy + (coords.y - this.moveAreaDragAnchor.startY);
                    this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, dx, dy, 3);
                    return;
                }
            }
        }

        if (this.interactionMode === 'offline_spray' && this.isSpraying && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords) {
                this.updateSpray(coords.x, coords.y);
            }
            return;
        }

        if (this.interactionMode === 'offline_eraser_brush' && this.isBrushErasing && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords && this.brushEraserLastCoords) {
                if (coords.x !== this.brushEraserLastCoords.x || coords.y !== this.brushEraserLastCoords.y) {
                    const line = getBresenhamLine(this.brushEraserLastCoords.x, this.brushEraserLastCoords.y, coords.x, coords.y);
                    this.applyBrushEraseLine(line.slice(1), false);
                    this.brushEraserLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_dither' && this.isDitherPainting && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords && this.ditherLastCoords) {
                if (coords.x !== this.ditherLastCoords.x || coords.y !== this.ditherLastCoords.y) {
                    const line = getBresenhamLine(this.ditherLastCoords.x, this.ditherLastCoords.y, coords.x, coords.y);
                    this.applyDitherStrokeLine(line.slice(1), false);
                    this.ditherLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_shading' && this.isShadingPainting && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords && this.shadingLastCoords) {
                if (coords.x !== this.shadingLastCoords.x || coords.y !== this.shadingLastCoords.y) {
                    const line = getBresenhamLine(this.shadingLastCoords.x, this.shadingLastCoords.y, coords.x, coords.y);
                    this.applyShadingStrokeLine(line.slice(1), false);
                    this.shadingLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.isBrushPainting && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords && this.brushLastCoords) {
                if (coords.x !== this.brushLastCoords.x || coords.y !== this.brushLastCoords.y) {
                    const line = getBresenhamLine(this.brushLastCoords.x, this.brushLastCoords.y, coords.x, coords.y);
                    this.applyBrushStrokeLine(line.slice(1), false);
                    this.brushLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_quick_shapes' && this.isQuickShapeDrawing && this.quickShapeStart && e.touches.length === 1) {
            e.preventDefault();
            let coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.touches[0].clientX - rect.left;
                const mouseY = e.touches[0].clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords) {
                this.quickShapeCurrent = { x: coords.x, y: coords.y };
                this.updateQuickShapePreview(false);
            }
            return;
        }

        if (this.interactionMode === 'offline_shape' && this.isShapeDrawing && this.shapeStart && e.touches.length === 1) {
            e.preventDefault();
            let coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.touches[0].clientX - rect.left;
                const mouseY = e.touches[0].clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords && (!this.shapeCurrent || coords.x !== this.shapeCurrent.x || coords.y !== this.shapeCurrent.y)) {
                this.shapeCurrent = { x: coords.x, y: coords.y };
                this.updateShapePreview();
            }
            return;
        }

        if (this.interactionMode === 'offline_text' && this.isTextDragging && this.textDragStart && e.touches.length === 1) {
            e.preventDefault();
            let coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.touches[0].clientX - rect.left;
                const mouseY = e.touches[0].clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords) {
                const newX = Math.max(0, coords.x - this.textDragStart.offsetX);
                const newY = Math.max(0, coords.y - this.textDragStart.offsetY);
                if (!this.textPosition || this.textPosition.x !== newX || this.textPosition.y !== newY) {
                    this.textPosition = { x: newX, y: newY };
                    this.updatePixelTextPreview();
                }
            }
            return;
        }

        if (this.isDraggingCustomPicker && e.touches && e.touches.length > 0) {
            const picker = document.querySelector('[data-ref="customColorPicker"]');
            if (picker) {
                if (this.isDraggingCustomPicker === 'sv') {
                    const svArea = picker.querySelector('[data-action="dragCustomSV"]');
                    if (svArea) this.updateCustomColorFromEvent(e.touches[0], svArea);
                } else if (this.isDraggingCustomPicker === 'hue') {
                    const hueArea = picker.querySelector('[data-action="dragCustomHue"]');
                    if (hueArea) this.updateCustomColorFromEvent(e.touches[0], hueArea);
                }
            }
            e.preventDefault();
            return;
        }

        if (this.isPinching && e.touches.length === 2) {
            e.preventDefault(); 
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = centerX - rect.left;
            const mouseY = centerY - rect.top;

            const scaleRatio = currentDistance / this.initialPinchDistance;
            let newScale = this.initialScale * scaleRatio;
            const { minScale, maxScale } = typeof this.getZoomBounds === 'function' ? this.getZoomBounds() : { minScale: 0.1, maxScale: 30.0 };
            newScale = Math.max(minScale, Math.min(newScale, maxScale));

            this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
            this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
            this.transform.scale = newScale;

            if (typeof this.limitBounds === 'function') this.limitBounds();
            if (typeof this.updateZoomUI === 'function') this.updateZoomUI();
            this.requestRender();
            return;
        }

        if (this.templateInteraction && e.touches.length === 1) {
            e.preventDefault();
            const exact = this.getExactBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (!exact) return;

            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            const dx = exact.x - this.templateInteraction.startX;
            const dy = exact.y - this.templateInteraction.startY;

            if (this.templateInteraction.type === 'move') {
                let newX = Math.round(this.templateInteraction.origX + dx);
                let newY = Math.round(this.templateInteraction.origY + dy);
                newX = Math.max(0, Math.min(newX, this.boardWidth - tpl.w));
                newY = Math.max(0, Math.min(newY, this.boardHeight - tpl.h));
                tpl.x = newX;
                tpl.y = newY;
            } else if (this.templateInteraction.type === 'rotate') {
                const cx = this.templateInteraction.origX + (this.templateInteraction.origW / 2);
                const cy = this.templateInteraction.origY + (this.templateInteraction.origH / 2);
                
                const dxCenter = exact.x - cx;
                const dyCenter = exact.y - cy;
                
                let angle = Math.atan2(dyCenter, dxCenter) * (180 / Math.PI);
                angle += 90; 
                
                if (angle < 0) angle += 360;
                
                tpl.angle = Math.round(angle);
            } else {
                const aspect = this.templateInteraction.origW / this.templateInteraction.origH;
                const MAX_TEMPLATE_SIZE = Math.max(this.boardWidth || 4096, this.boardHeight || 4096);
                let newW, newH;
                
                const enforceLimits = (w) => {
                    w = Math.min(w, MAX_TEMPLATE_SIZE);
                    let h = w / aspect;
                    if (h > MAX_TEMPLATE_SIZE) {
                        h = MAX_TEMPLATE_SIZE;
                        w = h * aspect;
                    }
                    return { w: Math.round(w), h: Math.round(h) };
                };
                
                if (this.templateInteraction.type === 'resize-br') {
                    newW = Math.round(this.templateInteraction.origW + dx);
                    let maxW = this.boardWidth - this.templateInteraction.origX;
                    let maxW_H = (this.boardHeight - this.templateInteraction.origY) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    const sizes = enforceLimits(newW);
                    tpl.w = sizes.w; tpl.h = sizes.h;
                } else if (this.templateInteraction.type === 'resize-tl') {
                    newW = Math.round(this.templateInteraction.origW - dx);
                    let maxW = this.templateInteraction.origX + this.templateInteraction.origW;
                    let maxW_H = (this.templateInteraction.origY + this.templateInteraction.origH) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    const sizes = enforceLimits(newW);
                    tpl.w = sizes.w; tpl.h = sizes.h;
                    tpl.x = this.templateInteraction.origX + this.templateInteraction.origW - sizes.w;
                    tpl.y = this.templateInteraction.origY + this.templateInteraction.origH - sizes.h;
                } else if (this.templateInteraction.type === 'resize-tr') {
                    newW = Math.round(this.templateInteraction.origW + dx);
                    let maxW = this.boardWidth - this.templateInteraction.origX;
                    let maxW_H = (this.templateInteraction.origY + this.templateInteraction.origH) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    const sizes = enforceLimits(newW);
                    tpl.w = sizes.w; tpl.h = sizes.h;
                    tpl.y = this.templateInteraction.origY + this.templateInteraction.origH - sizes.h;
                } else if (this.templateInteraction.type === 'resize-bl') {
                    newW = Math.round(this.templateInteraction.origW - dx);
                    let maxW = this.templateInteraction.origX + this.templateInteraction.origW;
                    let maxW_H = (this.boardHeight - this.templateInteraction.origY) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    const sizes = enforceLimits(newW);
                    tpl.w = sizes.w; tpl.h = sizes.h;
                    tpl.x = this.templateInteraction.origX + this.templateInteraction.origW - sizes.w;
                }
            }

            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (this.uiLiveInputX) {
                    this.uiLiveInputX.setAttribute('data-value', tpl.x);
                    this.uiLiveInputX.textContent = tpl.x;
                }
                if (this.uiLiveInputY) {
                    this.uiLiveInputY.setAttribute('data-value', tpl.y);
                    this.uiLiveInputY.textContent = tpl.y;
                }
            }
            this.requestRender();
            return;
        }

        if (this.isDragging && e.touches.length === 1) {
            const dx = e.touches[0].clientX - this.lastMouse.x;
            const dy = e.touches[0].clientY - this.lastMouse.y;

            if (!this.touchHasMoved) {
                const totalDist = Math.hypot(e.touches[0].clientX - this.touchStartX, e.touches[0].clientY - this.touchStartY);
                if (totalDist > 8) {
                    this.touchHasMoved = true;
                }
            }

            if (this.touchHasMoved) {
                e.preventDefault(); 
                this.transform.x += dx;
                this.transform.y += dy;
                this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                
                if (typeof this.limitBounds === 'function') this.limitBounds();
                if (this.interactionMode === 'offline_text' && typeof this.updateFloatingTextPosition === 'function') {
                    this.updateFloatingTextPosition();
                }
                this.requestRender();
            }
        }
    },

    handleTouchEnd(e) {
        if (this.isDraggingCustomPicker) {
            this.isDraggingCustomPicker = false;
            return;
        }

        if (this.interactionMode === 'offline_text' && this.isTextDragging) {
            this.isTextDragging = false;
            this.textDragStart = null;
        }

        if (this.interactionMode === 'offline_quick_shapes' && this.isQuickShapeDrawing) {
            this.commitQuickShapeDrawing(false);
            return;
        }

        if (this.interactionMode === 'offline_shape' && this.isShapeDrawing) {
            this.commitShapeDrawing();
            return;
        }

        if (this.interactionMode === 'offline_moving_area') {
            if (this.moveAreaStep === 1 && this.moveAreaBox) {
                this.moveAreaStep = 2;
                this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, 0, 0, 2);
                return;
            }
            if (this.moveAreaStep === 3 && this.moveAreaBox) {
                const dx = this.moveAreaBox.dx || 0;
                const dy = this.moveAreaBox.dy || 0;
                if (dx !== 0 || dy !== 0) {
                    this.commitMoveArea();
                } else {
                    this.moveAreaStep = 2;
                    this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, 0, 0, 2);
                }
                return;
            }
        }

        if (this.interactionMode === 'offline_spray' && this.isSpraying) {
            this.stopSpray();
            return;
        }

        if (this.isBrushErasing) {
            this.isBrushErasing = false;
            this.brushEraserLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isDitherPainting) {
            this.isDitherPainting = false;
            this.ditherLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isShadingPainting) {
            this.isShadingPainting = false;
            this.shadingLastCoords = null;
            if (this.shadingTouchedInStroke) this.shadingTouchedInStroke.clear();
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'APPLY_SHADING',
                        payload: {
                            cx: 0,
                            cy: 0,
                            mode: this.shadingMode || 'shadow',
                            size: this.shadingSize || 1,
                            isMirrorMode: !!this.isMirrorMode,
                            strokePhase: 'end'
                        }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isBrushPainting) {
            this.isBrushPainting = false;
            this.brushLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isPinching) {
            if (e.touches.length < 2) {
                this.isPinching = false;
                this.isDragging = false; 
                if (typeof this.updateZoomUI === 'function') this.updateZoomUI();
            }
            return;
        }

        if (this.templateInteraction) {
            const activeTpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
            if (activeTpl && activeTpl.isShape && typeof this.refreshShapeTemplateColor === 'function') {
                this.refreshShapeTemplateColor(activeTpl, activeTpl.color || this.currentColor);
            }
            this.templateInteraction = null;
            this.requestRender();
            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (typeof this.emitLiveImageUpdate === 'function') {
                    this.emitLiveImageUpdate();
                }
            }
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;

            const touchDuration = Date.now() - this.touchStartTime;
            if (!this.touchHasMoved && touchDuration < 300) {
                
                if (!this.isSpectator && !this.isResetLocked && !this.isResizeLocked) {
                    const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                    if (coords) {
                        if (this.interactionMode === 'offline_bucket') {
                            this.executeOfflineBucket(coords.x, coords.y);
                            return;
                        }

                        const bw = this.boardWidth || 64;
                        const key = (coords.y << 16) | coords.x;
                        const symX = bw - 1 - coords.x;
                        const symKey = (coords.y << 16) | symX;
                        const hasSym = this.isMirrorMode && symX >= 0 && symX < bw && symX !== coords.x;

                        if (this.selectedPixels.has(key)) {
                            this.selectionMode = 'remove';
                            this.selectedPixels.delete(key);
                            if (hasSym) this.selectedPixels.delete(symKey);
                        } else {
                            this.selectionMode = 'add';
                            const maxBalance = this.getMaxBalance();
                            if (this.selectedPixels.size < maxBalance) {
                                this.selectedPixels.add(key);
                                if (hasSym && this.selectedPixels.size < maxBalance) {
                                    this.selectedPixels.add(symKey);
                                }
                            } else {
                                showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance), 'warning');
                            }
                        }
                        this.updateSelectionUI();

                        this.hoveredPixel = coords;
                        this._selectionBitmaskDirty = true;
                        this.setCanvasBadge('coords', 'my_location', `${coords.x} , ${coords.y}`, 'left');
                        
                        this.requestRender();
                    }
                }
            }
        }
    }
};
