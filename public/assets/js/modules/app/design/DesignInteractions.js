import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { showMessage } from '../../../core/utils/uiUtils.js';
import { PerksRegistry } from './PerksRegistry.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { soundManager } from './SoundManager.js';

export const DesignInteractions = {
    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('click', this.handleClickBound);
        window.addEventListener('resize', this.handleResizeBound);

        if (this.canvas && this.canvas.parentElement && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.resizeAnimationFrame) cancelAnimationFrame(this.resizeAnimationFrame);
                this.resizeAnimationFrame = requestAnimationFrame(() => {
                    if (typeof this.handleResize === 'function') {
                        this.handleResize();
                    }
                });
            });
            this.resizeObserver.observe(this.canvas.parentElement);
        }

        document.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
        document.addEventListener('touchend', this.handleTouchEndBound);

        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileUploadBound);
        }
    },

    getMaxBalance() {
        if (this.interactionMode === 'owner_erasing') return Infinity;
        if (this.perkNoCooldown) return Infinity;
        if (this.interactionMode === 'protecting') return this.perkProtectionLeft || 0;
        if (this.interactionMode === 'erasing') return this.perkEraserLeft || 0;
        if (this.interactionMode === 'placing_mines') return 10;
        if (this.interactionMode === 'bombing') {
            return typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
        }
        return Math.floor(this.cooldownBalance);
    },

    handleClick(e) {
        
        if (typeof this.handleTemplateModals === 'function' && this.handleTemplateModals(e)) {
            return; 
        }

        const btnTogglePicker = e.target.closest('[data-action="toggleRecentColorPicker"]');
        if (btnTogglePicker) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleRecentColorPicker();
            return;
        }

        const dropdownPickerInside = e.target.closest('[data-ref="recent-color-picker-dropdown"]');
        if (dropdownPickerInside) {
            e.stopPropagation();
        } else {
            // Close color picker dropdown if open and clicked outside
            const pickerDropdown = document.querySelector('[data-ref="recent-color-picker-dropdown"]');
            if (pickerDropdown && !pickerDropdown.classList.contains('disabled')) {
                const isClickingOtherColor = e.target.closest('.component-color-btn:not(.component-color-btn--rainbow)');
                if (isClickingOtherColor) {
                    pickerDropdown.classList.add('disabled');
                    pickerDropdown.classList.remove('active');
                } else {
                    this.saveRecentColor(true);
                }
            }
        }

        const btnPerks = e.target.closest('[data-action="togglePerksInventory"]');
        if (btnPerks) {
            e.preventDefault();
            this.showInventoryPerks = !this.showInventoryPerks;
            if (this.showInventoryPerks) {
                btnPerks.classList.add('active');
                if (this.showOwnerTools) {
                    this.showOwnerTools = false;
                    const btnOwnerTools = document.querySelector('[data-action="toggleOwnerTools"]');
                    if (btnOwnerTools) btnOwnerTools.classList.remove('active');
                }
                if (!this.inventoryPerks) {
                    this.loadUserPerks();
                } else {
                    this.updatePerkBadges();
                }
            } else {
                btnPerks.classList.remove('active');
                this.updatePerkBadges();
            }
            return;
        }

        const btnActivatePerk = e.target.closest('[data-action="activatePerk"]');
        if (btnActivatePerk) {
            if (this.perkGlobalCooldownUntil && Date.now() < this.perkGlobalCooldownUntil) {
                const remSecs = Math.ceil((this.perkGlobalCooldownUntil - Date.now()) / 1000);
                if (typeof showMessage === 'function') showMessage(`Espera ${remSecs}s a que finalice tu ventaja activa.`, 'warning');
                return;
            }
            soundManager.playUiClick();
            if (typeof this.activatePerk === 'function') {
                this.activatePerk(btnActivatePerk.getAttribute('data-perk-id'), btnActivatePerk);
            }
            return;
        }

        const btnOwnerTools = e.target.closest('[data-action="toggleOwnerTools"]');
        if (btnOwnerTools) {
            e.preventDefault();
            this.showOwnerTools = !this.showOwnerTools;
            if (this.showOwnerTools) {
                btnOwnerTools.classList.add('active');
                if (this.showInventoryPerks) {
                    this.showInventoryPerks = false;
                    const btnPerksElement = document.querySelector('[data-action="togglePerksInventory"]');
                    if (btnPerksElement) btnPerksElement.classList.remove('active');
                }
            } else {
                btnOwnerTools.classList.remove('active');
            }
            if (typeof this.updatePerkBadges === 'function') {
                this.updatePerkBadges();
            }
            return;
        }

        const btnOwnerEraser = e.target.closest('[data-action="toggleOwnerEraser"]');
        if (btnOwnerEraser) {
            e.preventDefault();
            this.toggleOwnerEraser();
            return;
        }



        const btnJoin = e.target.closest('[data-action="joinCanvasDirectly"]');
        const btnReqAccess = e.target.closest('[data-action="requestCanvasAccess"]');

        if (btnJoin || btnReqAccess) {
            e.preventDefault();
            if (typeof this.handleAccessRequest === 'function') {
                this.handleAccessRequest(btnJoin || btnReqAccess);
            }
            return;
        }

        const imgAdd = e.target.closest('[data-action="addTemplateToCanvas"]');
        if (imgAdd) {
            e.preventDefault();
            if (this.isResetLocked || this.isResizeLocked) {
                showMessage(__('err_canvas_locked'), 'warning');
                return;
            }
            const url = imgAdd.getAttribute('data-url');
            if (typeof this.addTemplateFromLibrary === 'function') {
                this.addTemplateFromLibrary(url);
            }
            return;
        }

        const btnDelServer = e.target.closest('[data-action="deleteServerTemplate"]');
        if (btnDelServer) {
            e.preventDefault();
            e.stopPropagation(); 
            const id = btnDelServer.getAttribute('data-id');
            if (window.modalSystem) {
                window.modalSystem.show('confirmDeleteTemplateModal', { templateId: id });
            }
            return;
        }

        const btnConfirmDel = e.target.closest('[data-action="confirmDeleteTemplate"]');
        if (btnConfirmDel) {
            e.preventDefault();
            const id = btnConfirmDel.getAttribute('data-id');
            if (typeof this.deleteServerTemplate === 'function') {
                this.deleteServerTemplate(id, btnConfirmDel);
            }
            return;
        }

        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return; 

        const btnUpload = e.target.closest('[data-action="triggerTemplateUpload"]');
        if (btnUpload && this.fileInput) {
            e.preventDefault();
            this.fileInput.click();
            return;
        }

        const cardTemplate = e.target.closest('[data-action="selectTemplate"]');
        if (cardTemplate && !e.target.closest('.component-template-action-btn')) {
            const id = cardTemplate.getAttribute('data-id');
            if (this.liveShareStatus === 'spectator' && this.liveTemplateId === id) {
                showMessage(__('info_template_live'), 'info');
                return;
            }
            if (typeof this.toggleTemplate === 'function') {
                this.toggleTemplate(id);
            }
            return;
        }

        const btnLock = e.target.closest('[data-action="toggleTemplateLock"]');
        if (btnLock) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.toggleTemplateLock === 'function') {
                this.toggleTemplateLock();
            }
            return;
        }

        const btnUnlockTop = e.target.closest('[data-action="unlockTemplateTop"]');
        if (btnUnlockTop) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.unlockTemplateTop === 'function') {
                this.unlockTemplateTop();
            }
            return;
        }
        
        const btnRotate = e.target.closest('[data-action="rotateTemplate"]');
        if (btnRotate) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.rotateTemplate === 'function') {
                this.rotateTemplate();
            }
            return;
        }
        
        const btnInject = e.target.closest('[data-action="injectTemplate"]');
        if (btnInject) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.injectTemplate === 'function') {
                this.injectTemplate();
            }
            return;
        }

        const btnDelete = e.target.closest('[data-action="deleteTemplate"]');
        if (btnDelete) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.deleteTemplate === 'function') {
                this.deleteTemplate();
            }
            return;
        }

        const btnPlace = e.target.closest('[data-action="placePixels"]');
        if (btnPlace) {
            e.preventDefault();
            this.placePixels();
            return;
        }

        const btnColor = e.target.closest('[data-action="selectColor"]');
        if (btnColor) {
            e.preventDefault();
            this.currentColor = btnColor.getAttribute('data-color') || '#000000';
            
            if (this.btnColorPalette) {
                this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            }
            
            this.updateActiveColorPreview();
            this.syncActiveColorHighlight();
            this.recordRecentColor(this.currentColor);
            this.requestRender();
            return;
        }
    },

    handleKeyDown(e) {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        // Prevent spamming when holding down a key
        if (e.repeat) return;

        // Skip shortcuts if user is typing in inputs or textareas
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
        
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        
        if (e.key === 'Escape') {
            if (this.interactionMode !== 'normal') {
                this.cancelInteractionMode();
            } else {
                this.isSelecting = false;
                this.selectedPixels.clear();
                this.ownerEraserBox = null;
                this.ownerEraserStep = 0;
                this.ownerEraserStart = null;
                this.updateSelectionUI();
                if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                if (typeof this.requestRender === 'function') this.requestRender();
            }
            return;
        }

        const keyUpper = e.key.toUpperCase();

        if (keyUpper === 'J') {
            const btn = document.querySelector('[data-action="openJoinLiveModal"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'S') {
            const btn = document.querySelector('[data-action="toggleLiveBroadcast"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'C') {
            const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-colors"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'T') {
            const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-templates"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'P') {
            const btn = document.querySelector('[data-action="togglePerksInventory"]');
            if (btn && !btn.classList.contains('disabled') && !btn.classList.contains('disabled-interaction')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'O') {
            const btn = document.querySelector('[data-action="toggleOwnerTools"]');
            if (btn && !btn.classList.contains('disabled') && !btn.classList.contains('disabled-interaction')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'H') {
            const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-chat"]');
            if (btn && !btn.classList.contains('disabled') && !btn.classList.contains('disabled-interaction')) { 
                e.preventDefault(); 
                btn.click(); 
                setTimeout(() => {
                    const chatInput = document.querySelector('[data-ref="chat-input-message"]');
                    if (chatInput && chatInput.offsetParent !== null) {
                        chatInput.focus();
                    }
                }, 100);
            }
        } else if (keyUpper === 'U') {
            e.preventDefault();
            if (this.activeTemplateId) {
                const tpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
                if (tpl && !tpl.locked) {
                    if (typeof this.toggleTemplateLock === 'function') {
                        this.toggleTemplateLock();
                        return;
                    }
                }
            }
            const btn = document.querySelector('[data-action="unlockTemplateTop"]');
            if (btn && !btn.classList.contains('disabled')) { btn.click(); }
        } else if (keyUpper === 'R') {
            if (typeof this.rotateTemplate === 'function') { e.preventDefault(); this.rotateTemplate(); }
        } else if (keyUpper === 'B') {
            if (typeof this.injectTemplate === 'function') { e.preventDefault(); this.injectTemplate(); }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.activeTemplateId && typeof this.deleteTemplate === 'function') {
                e.preventDefault();
                this.deleteTemplate();
            }
        }
    },

    handleWheel(e) {
        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;
        
        e.preventDefault(); 
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.1;
        const delta = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(delta * zoomIntensity);

        let newScale = this.transform.scale * zoomFactor;
        const minScale = 200 / Math.max(this.boardWidth || 1000, this.boardHeight || 1000);
        newScale = Math.max(minScale, Math.min(newScale, 40)); 

        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

        this.isZooming = true;
        if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
        this.zoomTimeout = setTimeout(() => {
            this.isZooming = false;
            this.requestRender();
        }, 150);

        if (typeof this.limitBounds === 'function') this.limitBounds();
        this.calculateHoverPixel(e.clientX, e.clientY);
        this.requestRender();

        if (this.isProgressive && typeof this.updateVisibleChunks === 'function') {
            if (this.chunkThrottleTimer) clearTimeout(this.chunkThrottleTimer);
            this.chunkThrottleTimer = setTimeout(() => this.updateVisibleChunks(), 100);
        }
    },

    handleMouseDown(e) {
        const svArea = e.target.closest('[data-action="dragRecentSV"]');
        const hueArea = e.target.closest('[data-action="dragRecentHue"]');
        if (svArea || hueArea) {
            this.recentDragMode = svArea ? 'sv' : 'hue';
            this.recentDragArea = svArea || hueArea;
            this.updateRecentColorFromEvent(e);
            e.preventDefault();
            return;
        }

        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;

        const exact = this.getExactBoardCoords(e.clientX, e.clientY);
        if (!exact) return;

        const isOperationalLocked = !!(this.isResetLocked || this.isResizeLocked || this.isInjectLocked || this.isClearLocked || (this.isFrozen && !this.isOwner));



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
            if (this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting' || this.interactionMode === 'user_protecting') {
                const bw = this.boardWidth || 64;
                const offset = (coords.y * bw) + coords.x;
                
                if (this.interactionMode === 'owner_protecting' && (this.ownerEraserStep === 0 || this.ownerEraserStep === 2)) {
                    if (this.protectedPixels && this.protectedPixels.has(offset)) {

                        window.modalSystem.show('confirmUnprotectAreaModal', { count: 1 }).then(res => {
                            const actStr = (typeof res === 'string') ? res : (res?.action || null);
                            if (actStr === 'unprotect') {
                                this.ownerEraserBox = { x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y };
                                this.ownerEraserStep = 2;
                                this.executeOwnerProtectArea(false);
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

            const key = (coords.y << 16) | coords.x;
            if (this.selectedPixels.has(key)) {
                this.selectionMode = 'remove';
                this.selectedPixels.delete(key);
            } else {
                this.selectionMode = 'add';
                const maxBalance = this.getMaxBalance();
                if (this.selectedPixels.size < maxBalance) {
                    this.selectedPixels.add(key);
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
        if (this.recentDragMode && this.recentDragArea) {
            this.updateRecentColorFromEvent(e);
            e.preventDefault();
            return;
        }

        if ((this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting' || this.interactionMode === 'user_protecting') && this.ownerEraserStep === 1 && this.ownerEraserStart) {
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
                const key = (coords.y << 16) | coords.x;
                const sizeBefore = this.selectedPixels.size;
                
                if (this.selectionMode === 'add') {
                    const maxBalance = this.getMaxBalance();
                    if (this.selectedPixels.size < maxBalance) {
                        this.selectedPixels.add(key);
                    }
                } else {
                    this.selectedPixels.delete(key);
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
        if (this.recentDragMode) {
            this.saveRecentColor(false);
            this.recentDragMode = null;
            this.recentDragArea = null;
            return;
        }

        if (this.templateInteraction) {
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
        const svArea = e.target.closest('[data-action="dragRecentSV"]');
        const hueArea = e.target.closest('[data-action="dragRecentHue"]');
        if (svArea || hueArea) {
            this.recentDragMode = svArea ? 'sv' : 'hue';
            this.recentDragArea = svArea || hueArea;
            this.updateRecentColorFromEvent(e.touches[0]);
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
        if (this.recentDragMode && this.recentDragArea) {
            this.updateRecentColorFromEvent(e.touches[0]);
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
            const minScale = 200 / Math.max(this.boardWidth || 1000, this.boardHeight || 1000);
            newScale = Math.max(minScale, Math.min(newScale, 40));

            this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
            this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
            this.transform.scale = newScale;

            if (typeof this.limitBounds === 'function') this.limitBounds();
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
                this.requestRender();
            }
        }
    },

    handleTouchEnd(e) {
        if (this.recentDragMode) {
            this.saveRecentColor(false);
            this.recentDragMode = null;
            this.recentDragArea = null;
            return;
        }
        if (this.isPinching) {
            if (e.touches.length < 2) {
                this.isPinching = false;
                this.isDragging = false; 
            }
            return;
        }

        if (this.templateInteraction) {
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
                        const key = (coords.y << 16) | coords.x;
                        if (this.selectedPixels.has(key)) {
                            this.selectionMode = 'remove';
                            this.selectedPixels.delete(key);
                        } else {
                            this.selectionMode = 'add';
                            const maxBalance = this.getMaxBalance();
                            if (this.selectedPixels.size < maxBalance) {
                                this.selectedPixels.add(key);
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
    },

    getBoardCoords(clientX, clientY) {
        if (!this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const boardX = Math.floor((mouseX - this.transform.x) / this.transform.scale);
        const boardY = Math.floor((mouseY - this.transform.y) / this.transform.scale);

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
        const newHover = this.getBoardCoords(clientX, clientY);
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
        if (!this.btnPlacePixels || !this.txtPlacePixels) return;

        if (this.interactionMode === 'user_protecting') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--success');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');

            const w = this.boardWidth || 64;
            const maxBudget = w <= 32 ? 16
                            : w <= 64 ? 25
                            : w <= 128 ? 36
                            : w <= 256 ? 49
                            : w <= 512 ? 64
                            : w <= 1024 ? 100
                            : w <= 2048 ? 144
                            : 256;

            let areaSize = 0;
            if (this.ownerEraserBox) {
                areaSize = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            }

            if (this.ownerEraserBox && this.ownerEraserStep === 2) {
                if (areaSize <= maxBudget) {
                    this.btnPlacePixels.classList.remove('disabled-interaction');
                    this.txtPlacePixels.textContent = `Proteger zona (${areaSize} px)`;
                } else {
                    this.btnPlacePixels.classList.add('disabled-interaction');
                    this.txtPlacePixels.textContent = `Excede presupuesto (máx ${maxBudget} px)`;
                }
            } else if (this.ownerEraserStep === 1) {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = `Definiendo zona (${areaSize} px)...`;
            } else {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = 'Haz clic en el lienzo';
            }
            return;
        }

        if (this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--danger');
            this.btnPlacePixels.classList.replace('component-button--success', 'component-button--danger');
            if (this.interactionMode === 'owner_protecting') {
                this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');
            }
            
            let areaSize = 0;
            if (this.ownerEraserBox) {
                areaSize = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            }

            if (this.ownerEraserBox && this.ownerEraserStep === 2) {
                this.btnPlacePixels.classList.remove('disabled-interaction');
                this.txtPlacePixels.textContent = this.interactionMode === 'owner_erasing' ? `Vaciar zona (${areaSize} px)` : `Modificar protección (${areaSize} px)`;
            } else if (this.ownerEraserStep === 1) {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = `Definiendo zona (${areaSize} px)...`;
            } else {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = 'Haz clic en el lienzo';
            }
            return;
        }

        if (this.interactionMode === 'placing_mines') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--success');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');

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

        let maxBalance = this.getMaxBalance();
        
        if (this.interactionMode === 'protecting') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--success');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');
        } else if (this.interactionMode === 'erasing' || this.interactionMode === 'bombing') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--danger');
            this.btnPlacePixels.classList.replace('component-button--success', 'component-button--danger');
        } else {
            this.btnPlacePixels.classList.replace('component-button--success', 'component-button--primary');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--primary');
        }

        if (this.selectedPixels.size > 0 && this.selectedPixels.size <= maxBalance) {
            this.btnPlacePixels.classList.remove('disabled-interaction');
            if (this.interactionMode === 'protecting') {
                this.txtPlacePixels.textContent = `${window.__('btn_protect') || window.__('protect')} (${this.selectedPixels.size})`;
            } else if (this.interactionMode === 'erasing') {
                this.txtPlacePixels.textContent = `${window.__('erase')} (${this.selectedPixels.size})`;
            } else if (this.interactionMode === 'bombing') {
                this.txtPlacePixels.textContent = PerksRegistry.getBombButtonLabel(this.activeBomb);
            } else {
                this.txtPlacePixels.textContent = window.__('btn_place_pixels');
            }
        } else {
            this.btnPlacePixels.classList.add('disabled-interaction');
            if (this.selectedPixels.size > maxBalance) {
                if (this.interactionMode === 'protecting' || this.interactionMode === 'erasing') {
                    this.txtPlacePixels.textContent = `Máx: ${maxBalance} usos`;
                } else {
                    this.txtPlacePixels.textContent = (__('lbl_max_pixels')).replace(':max', maxBalance === Infinity ? '∞' : maxBalance);
                }
            } else {
                this.txtPlacePixels.textContent = __('btn_select_pixels');
            }
        }
    },

    placePixels() {
        if ((this.selectedPixels.size === 0 && this.interactionMode !== 'owner_erasing' && this.interactionMode !== 'owner_protecting' && this.interactionMode !== 'user_protecting') || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'placing_mines') {
            if (this.selectedPixels.size === 0 || this.selectedPixels.size > 10) return;
            const pixels = Array.from(this.selectedPixels).map(key => {
                return { x: key & 0xffff, y: key >> 16 };
            });
            this.executePlaceMines(pixels);
            return;
        }
        
        if (this.interactionMode === 'user_protecting') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            window.modalSystem.show('confirmProtectAreaModal', { count }).then(result => {
                const actStr = (typeof result === 'string') ? result : (result?.action || (result?.confirmed ? 'protect' : null));
                if (actStr === 'protect') {
                    this.executeUserProtectArea();
                }
            });
            return;
        }

        if (this.interactionMode === 'owner_erasing') {
            if (!this.ownerEraserBox) return;
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

        if (this.interactionMode === 'bombing') {
            const requiredTargets = typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
            if (this.selectedPixels.size < requiredTargets) {
                const msgKey = requiredTargets > 1 ? 'msg_select_targets_count' : 'msg_select_target';
                const msgText = (typeof window.__ === 'function' ? window.__(msgKey) : null)?.replace(':count', requiredTargets) || `Selecciona ${requiredTargets} objetivo(s)`;
                if (typeof showMessage === 'function') showMessage(msgText, 'warning');
                return;
            }
            const targets = Array.from(this.selectedPixels).map(key => ({
                x: key & 0xFFFF,
                y: key >> 16
            }));
            const usedPerk = this.activeBomb;
            const perkConfig = typeof PerksRegistry !== 'undefined' ? PerksRegistry.get(usedPerk) : null;
            const durationSecs = parseInt(perkConfig?.warning_seconds || 3, 10);
            const perkRadius = typeof PerksRegistry !== 'undefined' 
                ? PerksRegistry.getExplosionRadius(usedPerk, this.boardWidth, this.boardHeight) 
                : 10;


            if (typeof this.showPreparingPerkBadge === 'function' && usedPerk) {
                this.showPreparingPerkBadge(usedPerk, usedPerk);
            }

            const cooldownMs = (durationSecs + 1) * 1000;
            if (typeof this.setGlobalPerkCooldown === 'function') {
                this.setGlobalPerkCooldown(cooldownMs);
            }

            if (this.wsManager) {
                this.wsManager.send({
                    type: 'bomb_pixel',
                    targets: targets,
                    x: targets[0]?.x ?? 0,
                    y: targets[0]?.y ?? 0,
                    perk: usedPerk,
                    width: this.boardWidth,
                    userId: window.activeUserId || null
                });
            }
            if (this.inventoryPerks && usedPerk) {
                const perkObj = this.inventoryPerks.find(p => p.perk_id === usedPerk);
                if (perkObj) {
                    perkObj.count = Math.max(0, parseInt(perkObj.count, 10) - 1);
                    if (perkObj.count === 0) {
                        this.inventoryPerks = this.inventoryPerks.filter(p => p.perk_id !== usedPerk);
                    }
                }
            }
            this.interactionMode = 'normal';
            this.activeBomb = null;
            this.perkBombReady = null;
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            if (typeof this.loadUserPerks === 'function') this.loadUserPerks();
            return;
        }

        // Se envía el color hexadecimal directamente
        let colorHex = this.currentColor;

        // If the color is a custom picked color, save it to recent colors on first use
        if (this.customPickedColors && this.customPickedColors.includes(colorHex)) {
            this.recordRecentColor(colorHex);
        }

        let validPixels = [];
        let hitProtected = false;
        
        this.selectedPixels.forEach(key => {
            const x = key & 0xFFFF;
            const y = key >> 16;
            const offset = (y * this.boardWidth) + x;

            if (this.interactionMode === 'normal' || this.interactionMode === 'protecting') {
                if (this.protectedPixels && this.protectedPixels.has(offset)) {
                    if (!this.isOwner) {
                        hitProtected = true;
                        return;
                    }
                }
            } else if (this.interactionMode === 'erasing') {
                if (this.protectedPixels && !this.protectedPixels.has(offset)) {
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
                color: this.interactionMode === 'normal' ? this.currentColor : 'transparent'
            }));
            this.renderWorker.postMessage({ type: 'PUSH_PIXELS', payload: { pixels: pixelsToPush } });
        } else if (this.offscreenCtx) {
            validPixels.forEach(p => {
                if (this.interactionMode === 'normal') {
                    this.offscreenCtx.fillStyle = this.currentColor;
                    this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                }
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
                let msgType = 'pixel';
                if (this.interactionMode === 'protecting') msgType = 'protect_pixel';
                if (this.interactionMode === 'erasing') msgType = 'erase_pixel';

                if (msgType === 'pixel' || msgType === 'erase_pixel') {
                    const opCode = msgType === 'pixel' ? 1 : 2;
                    const buffer = new ArrayBuffer(9);
                    const view = new DataView(buffer);
                    view.setUint8(0, opCode);
                    view.setUint16(1, p.x, false);
                    view.setUint16(3, p.y, false);
                    
                    const color = msgType === 'pixel' ? colorHex : 'transparent';
                    const rgba = parseColorToRgba(color);
                    view.setUint8(5, rgba.r);
                    view.setUint8(6, rgba.g);
                    view.setUint8(7, rgba.b);
                    view.setUint8(8, rgba.a);

                    this.wsManager.send(buffer);
                } else {
                    this.wsManager.send({
                        type: msgType,
                        x: p.x,
                        y: p.y,
                        color: colorHex,
                        width: this.boardWidth,
                        userId: window.activeUserId || null 
                    });
                }
            } else {
                let msgType = 'batch_pixels';
                if (this.interactionMode === 'protecting') msgType = 'batch_protect_pixels';
                if (this.interactionMode === 'erasing') msgType = 'batch_erase_pixels';

                if (msgType === 'batch_pixels' || msgType === 'batch_erase_pixels') {
                    const opCode = msgType === 'batch_pixels' ? 3 : 4;
                    const buffer = new ArrayBuffer(7 + 4 * validPixels.length);
                    const view = new DataView(buffer);
                    
                    view.setUint8(0, opCode);
                    view.setUint16(1, validPixels.length, false);
                    
                    const color = msgType === 'batch_pixels' ? colorHex : 'transparent';
                    const rgba = parseColorToRgba(color);
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
                } else {
                    this.wsManager.send({
                        type: msgType,
                        pixels: validPixels.map(p => ({ x: p.x, y: p.y })),
                        color: colorHex,
                        width: this.boardWidth,
                        userId: window.activeUserId || null
                    });
                }
            }
        }

        if (this.interactionMode === 'normal') {
            if (!this.perkNoCooldown) {
                this.cooldownBalance -= validPixels.length;
            }
            
            if (this.cooldownBalance < this.cooldownMax && this.cooldownNextIn <= 0) {
                this.cooldownNextIn = this.cooldownSec;
                this.lastSyncTime = Date.now();
            }
            showMessage(__('msg_pixels_placed'), 'success');
        } else if (this.interactionMode === 'protecting') {
            this.perkProtectionLeft -= validPixels.length;
            showMessage(window.__('msg_prot_applied'), 'success');
        } else if (this.interactionMode === 'erasing') {
            this.perkEraserLeft -= validPixels.length;
            showMessage(window.__('eraser_applied'), 'success');
        }

        this.selectedPixels.clear();

        if (this.interactionMode === 'protecting' && this.perkProtectionLeft <= 0) {
            this.cancelInteractionMode();
            if (typeof this.loadUserPerks === 'function') this.loadUserPerks();
        }
        if (this.interactionMode === 'erasing' && this.perkEraserLeft <= 0) {
            this.cancelInteractionMode();
            if (typeof this.loadUserPerks === 'function') this.loadUserPerks();
        }
        
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    setGlobalPerkCooldown(cooldownMs) {
        this.perkGlobalCooldownUntil = Date.now() + cooldownMs;
        
        if (!document.getElementById('perk-cooldown-style')) {
            const style = document.createElement('style');
            style.id = 'perk-cooldown-style';
            style.textContent = `
                .disable-interaction, .disabled-interaction {
                    pointer-events: none !important;
                    opacity: 0.35 !important;
                    cursor: not-allowed !important;
                    filter: grayscale(0.8) !important;
                    transition: opacity 0.3s ease, filter 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }

        if (typeof this.updatePerkBadges === 'function') {
            this.updatePerkBadges();
        }

        setTimeout(() => {
            if (typeof this.updatePerkBadges === 'function') {
                this.updatePerkBadges();
            }
        }, cooldownMs);
    },

    cancelInteractionMode() {
        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.activeBomb = null;
        this.perkBombReady = null;
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        if (typeof this.requestRender === 'function') this.requestRender();
        showMessage(window.__('special_mode_deactivated'), 'info');
    },

    handleResize() {
        if (this.isResizeLocked) return;
        if (typeof this.updateCanvasDimensions === 'function') this.updateCanvasDimensions();
        if (typeof this.limitBounds === 'function') this.limitBounds();
        this.requestRender();
    },

    ensureExplosionStyles() {
        // Estilos integrados en components.css (.nuclear-shake y .canvas-flash-overlay)
    },

    triggerExplosionEffect(cx, cy, r, perkId) {
        if (!this.explosions) this.explosions = [];
        this.explosions.push({
            x: cx,
            y: cy,
            maxRadius: r,
            perkId: perkId,
            startTime: Date.now(),
            duration: PerksRegistry.getExplosionDuration(perkId)
        });
        
        this.ensureExplosionStyles();

        if (perkId === 'orbital_cannon_1') {
            const ball = document.querySelector('.orbital-cannon-charge-ball');
            if (ball) ball.remove();
        }

        if (PerksRegistry.hasScreenShake(perkId)) {
            if (this.canvas) {
                this.canvas.classList.add('nuclear-shake');
                setTimeout(() => {
                    this.canvas.classList.remove('nuclear-shake');
                }, PerksRegistry.getShakeDuration(perkId));
            }
        }
        
        if (PerksRegistry.hasScreenFlash(perkId)) {
            const flashMs = PerksRegistry.getFlashDuration(perkId);
            const flash = document.createElement('div');
            flash.style.position = 'fixed';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100vw';
            flash.style.height = '100vh';
            flash.style.backgroundColor = 'white';
            flash.style.zIndex = '999999';
            flash.style.pointerEvents = 'none';
            flash.style.transition = `opacity ${flashMs / 1000}s ease-out`;
            document.body.appendChild(flash);
            void flash.offsetHeight;
            flash.style.opacity = '0';
            setTimeout(() => {
                if (flash.parentNode) flash.parentNode.removeChild(flash);
            }, flashMs + 100);
        }
        
        if (!this.renderWorker && !this.isExplosionLoopRunning) {
            this.isExplosionLoopRunning = true;
            const loop = () => {
                if (this.explosions && this.explosions.length > 0) {
                    this.explosions = this.explosions.filter(exp => (Date.now() - exp.startTime) < exp.duration);
                    this.requestRender();
                    requestAnimationFrame(loop);
                } else {
                    this.isExplosionLoopRunning = false;
                }
            };
            requestAnimationFrame(loop);
        }
    },

    // handleNuclearWarning gestionado por DesignNetwork.js

    async loadUserPerks() {
        try {
            const result = await this.api.post(ApiRoutes.Store.GetMyPerks, {});
            if (result && result.success) {
                const grouped = {};
                result.data.forEach(p => {
                    if (!grouped[p.perk_id]) {
                        grouped[p.perk_id] = { ...p, count: 0 };
                    }
                    grouped[p.perk_id].count += parseInt(p.count) || 1;
                });
                this.inventoryPerks = Object.values(grouped);
                if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            }
        } catch (error) {
        }
    },

    async activatePerk(perkId, btn) {
        if (!perkId) return;

        if (perkId === 'mines_1') {
            const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
            const count = owned ? parseInt(owned.count, 10) : 0;
            if (count <= 0) {
                if (typeof showMessage === 'function') showMessage(window.__('err_perk_not_owned'), 'warning');
                return;
            }

            if (this.interactionMode === 'placing_mines') {
                this.interactionMode = 'normal';
                this.selectedPixels.clear();
                if (typeof showMessage === 'function') showMessage('Modo Colocación de Minas desactivado', 'info');
            } else {
                this.interactionMode = 'placing_mines';
                this.activeBomb = null;
                this.selectedPixels.clear();
                if (typeof showMessage === 'function') showMessage('Modo Colocación de Minas activado. Selecciona hasta 10 píxeles en el lienzo.', 'info');
            }

            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            this.updateSelectionUI();
            this.syncMinesToWorker();
            this.requestRender();
            return;
        }

        if (perkId === 'pixel_shield_1') {
            const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
            const count = owned ? parseInt(owned.count, 10) : 0;
            if (count <= 0) {
                if (typeof showMessage === 'function') showMessage(window.__('err_perk_not_owned'), 'warning');
                return;
            }

            if (this.interactionMode === 'user_protecting') {
                this.interactionMode = 'normal';
                this.ownerEraserBox = null;
                this.ownerEraserStep = 0;
                this.ownerEraserStart = null;
                if (typeof showMessage === 'function') showMessage('Modo Protector de Píxeles desactivado', 'info');
            } else {
                this.interactionMode = 'user_protecting';
                this.activeBomb = null;
                this.ownerEraserBox = null;
                this.ownerEraserStep = 0;
                this.ownerEraserStart = null;
                if (typeof showMessage === 'function') showMessage('Modo Protector de Píxeles activado. Haz clic en el lienzo para definir la primera esquina.', 'info');
            }

            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        if (PerksRegistry.isBomb(perkId)) {
            const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
            const count = owned ? parseInt(owned.count, 10) : 0;
            if (count <= 0) {
                if (typeof showMessage === 'function') showMessage(window.__('err_perk_not_owned'), 'warning');
                return;
            }

            if (this.activeBomb === perkId && this.interactionMode === 'bombing') {
                this.perkBombReady = null;
                this.interactionMode = 'normal';
                this.activeBomb = null;
            } else {
                this.perkBombReady = perkId;
                this.interactionMode = 'bombing';
                this.activeBomb = perkId;
                if (typeof showMessage === 'function') showMessage(window.__('msg_perk_equipped_select_target'), 'info');
            }

            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            this.updateSelectionUI();
            return;
        }

        try {
            if (btn) btn.classList.add('loading');
            const result = await this.api.post(ApiRoutes.Store.ActivatePerk, { perk_id: perkId });
            if (btn) btn.classList.remove('loading');
            
            if (result && result.success) {
                if (typeof showMessage === 'function') {
                    showMessage(window.__('msg_perk_activated_success'), 'success');
                }
                this.loadUserPerks(); 
            } else {
                if (typeof showMessage === 'function') showMessage(result?.message_key || window.__('err_activate_perk'), 'error');
            }
        } catch (error) {
            if (btn) btn.classList.remove('loading');
            if (typeof showMessage === 'function') showMessage(window.__('err_server_connection'), 'error');
        }
    },
    
    updatePerkBadges() {
        const badgesRight = document.querySelector('[data-ref="badges-right"]');
        if (!badgesRight) return;

        // Clear only non-timer badges to prevent layout shifting/disappearing of scheduled events
        Array.from(badgesRight.children).forEach(badge => {
            const badgeId = badge.getAttribute('data-badge-id');
            if (badgeId !== 'reset-timer' && badgeId !== 'resize-timer') {
                badge.remove();
            }
        });
        const isGlobalCooldown = !!(this.perkGlobalCooldownUntil && Date.now() < this.perkGlobalCooldownUntil);
        const btnPerksElement = document.querySelector('[data-action="togglePerksInventory"]');
        if (btnPerksElement) {
            if (isGlobalCooldown) btnPerksElement.classList.add('disable-interaction');
            else btnPerksElement.classList.remove('disable-interaction');
        }

        const PERK_ORDER = PerksRegistry.getDisplayOrder();
        let renderedInventoryCount = 0;

        PERK_ORDER.forEach(perkId => {
            let isActive = false;
            let activeHtml = '';
            let isToggledOn = false;
            let icon = PerksRegistry.getIcon(perkId);
            let clickHandler = null;

            if (PerksRegistry.isBomb(perkId) && perkId !== 'mines_1') {
                const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
                const totalAmount = owned ? parseInt(owned.count, 10) : 0;
                
                isActive = (this.activeBomb === perkId && this.interactionMode === 'bombing');
                
                if (isActive) {
                    isToggledOn = true;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded component-text-danger">${icon}</span><span>${titleText} (${totalAmount})</span>`;
                    clickHandler = () => {
                        this.interactionMode = 'normal';
                        this.activeBomb = null;
                        this.perkBombReady = null;
                        this.updateSelectionUI();
                        this.updatePerkBadges();
                    };
                    if (this.showInventoryPerks) renderedInventoryCount++;
                } else if (totalAmount > 0 && this.showInventoryPerks) {
                    isActive = true; 
                    isToggledOn = false;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded">${icon}</span><span>${titleText} (${totalAmount})</span>`;
                    clickHandler = () => {
                        this.activatePerk(perkId);
                    };
                    renderedInventoryCount++;
                }
            } else if (perkId === 'mines_1') {
                const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
                const totalAmount = owned ? parseInt(owned.count, 10) : 0;
                
                isActive = (this.interactionMode === 'placing_mines');
                
                if (isActive) {
                    isToggledOn = true;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded component-text-success">${icon}</span><span>${titleText} (${totalAmount})</span>`;
                    clickHandler = () => {
                        this.interactionMode = 'normal';
                        this.selectedPixels.clear();
                        this.updateSelectionUI();
                        this.updatePerkBadges();
                        this.syncMinesToWorker();
                        this.requestRender();
                    };
                    if (this.showInventoryPerks) renderedInventoryCount++;
                } else if (totalAmount > 0 && this.showInventoryPerks) {
                    isActive = true;
                    isToggledOn = false;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded">${icon}</span><span>${titleText} (${totalAmount})</span>`;
                    clickHandler = () => {
                        this.activatePerk(perkId);
                    };
                    renderedInventoryCount++;
                }
            } else if (perkId === 'pixel_shield_1') {
                const owned = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
                const totalAmount = owned ? parseInt(owned.count, 10) : 0;
                
                isActive = (this.interactionMode === 'user_protecting');
                
                if (isActive) {
                    isToggledOn = true;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded component-text-success">${icon}</span><span>${titleText} (${totalAmount})</span>`;
                    clickHandler = () => {
                        this.interactionMode = 'normal';
                        this.ownerEraserBox = null;
                        this.ownerEraserStep = 0;
                        this.ownerEraserStart = null;
                        this.updateSelectionUI();
                        this.updatePerkBadges();
                        this.requestRender();
                    };
                    if (this.showInventoryPerks) renderedInventoryCount++;
                } else if (totalAmount > 0 && this.showInventoryPerks) {
                    isActive = true;
                    isToggledOn = false;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded">${icon}</span><span>${titleText} (${totalAmount})</span>`;
                    clickHandler = () => {
                        this.activatePerk(perkId);
                    };
                    renderedInventoryCount++;
                }
            }

            const invItem = this.inventoryPerks ? this.inventoryPerks.find(p => p.perk_id === perkId) : null;
            
            if (isActive) {
                const badge = document.createElement('div');
                badge.className = 'component-badge';
                badge.style.cursor = 'pointer';
                badge.innerHTML = activeHtml;
                if (isGlobalCooldown) {
                    badge.classList.add('disable-interaction');
                }
                if (isToggledOn) {
                    if (PerksRegistry.isBomb(perkId)) {
                        badge.style.border = '1px solid var(--color-error)';
                        badge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    } else {
                        badge.style.border = '1px solid var(--color-success)';
                        badge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                    }
                }
                if (clickHandler) badge.addEventListener('click', clickHandler);
                badgesRight.appendChild(badge);
            } 
            else if (invItem && parseInt(invItem.count, 10) > 0 && this.showInventoryPerks) {
                const badge = document.createElement('div');
                badge.className = 'component-badge inventory-badge-temp';
                badge.style.cursor = 'pointer';
                if (isGlobalCooldown) {
                    badge.classList.add('disable-interaction');
                }
                const titleText = PerksRegistry.getLabel(perkId);
                badge.innerHTML = `<span class="material-symbols-rounded">${icon}</span><span>${titleText} (${invItem.count})</span>`;
                badge.addEventListener('click', () => {
                    this.activatePerk(perkId, badge);
                });
                badgesRight.appendChild(badge);
                renderedInventoryCount++;
            }
        });

        if (this.showInventoryPerks && renderedInventoryCount === 0) {
            const emptyBadge = document.createElement('div');
            emptyBadge.className = 'component-badge component-badge--muted inventory-badge-temp';
            const rawTrans = window.__('badge_no_perks_available');
            const displayLabel = (rawTrans && rawTrans !== 'badge_no_perks_available') ? rawTrans : 'Sin ventajas disponibles';
            emptyBadge.innerHTML = `<span class="material-symbols-rounded">info</span><span>${displayLabel}</span>`;
            badgesRight.appendChild(emptyBadge);
        }

        // Badge de Zonas Protegidas del usuario (activo solo si tiene zonas protegidas)
        const myProtectedCount = this.myProtectedPixels ? this.myProtectedPixels.size : 0;
        if (myProtectedCount > 0) {
            const isHighlighting = !!this.showMyProtectionsHighlight;
            const protBadge = document.createElement('div');
            protBadge.className = 'component-badge component-badge--clickable';
            if (isHighlighting) {
                protBadge.classList.add('component-badge--success-highlighted');
                protBadge.innerHTML = `<span class="material-symbols-rounded component-text-success">shield</span><span>Zonas protegidas (${myProtectedCount})<span data-ref="my-protections-timer-label" class="protection-timer-label"></span></span>`;
            } else {
                protBadge.innerHTML = `<span class="material-symbols-rounded">shield</span><span>Zonas protegidas (${myProtectedCount})<span data-ref="my-protections-timer-label" class="protection-timer-label"></span></span>`;
            }
            protBadge.addEventListener('click', () => {
                this.toggleMyProtectionsHighlight();
            });
            badgesRight.appendChild(protBadge);


            this.myProtectionsTimerLabel = protBadge.querySelector('[data-ref="my-protections-timer-label"]');
            if (!this.myProtectionsTimerInterval) {
                this.myProtectionsTimerInterval = setInterval(() => {
                    this.updateMyProtectionsTimer();
                }, 1000);
            }
            this.updateMyProtectionsTimer();
        } else {
            this.myProtectionsTimerLabel = null;
            if (this.myProtectionsTimerInterval) {
                clearInterval(this.myProtectionsTimerInterval);
                this.myProtectionsTimerInterval = null;
            }
        }

        if (this.isOwner) {
            if (this.showOwnerTools || this.interactionMode === 'owner_erasing') {
                const isToggledOn = (this.interactionMode === 'owner_erasing');
                const colorClass = isToggledOn ? 'component-text-danger' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-error)';
                    badgeEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }
                badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">cleaning_services</span><span>${window.__('badge_owner_eraser')}</span>`;
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOwnerEraser();
                });
                badgesRight.appendChild(badgeEl);
            }

            if (this.showOwnerTools || this.isFrozen) {
                const isToggledOn = this.isFrozen;
                const colorClass = isToggledOn ? 'component-text-warning' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge owner-freeze-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-warning)';
                    badgeEl.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                }
                badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">ac_unit</span><span>${isToggledOn ? (window.__('badge_owner_unfreeze') || 'Descongelar Actividad') : (window.__('badge_owner_freeze') || 'Congelar Actividad')}</span>`;
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOwnerFreeze();
                });
                badgesRight.appendChild(badgeEl);
            }

            if (this.showOwnerTools || this.interactionMode === 'owner_protecting') {
                const isToggledOn = (this.interactionMode === 'owner_protecting');
                const colorClass = isToggledOn ? 'component-text-success' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge owner-protect-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-success)';
                    badgeEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                }
                badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">admin_panel_settings</span><span>${window.__('badge_owner_protect') || 'Protección Administrativa'}</span>`;
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOwnerProtecting();
                });
                badgesRight.appendChild(badgeEl);
            }
        }
    },

    toggleOwnerEraser() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'owner_erasing') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage(window.__('msg_eraser_mode_off'), 'info');
        } else {
            this.interactionMode = 'owner_erasing';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage('Modo Borrador de Lienzo activado. Haz clic en la primera esquina para definir la zona.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    selectOwnerArea(x1, y1, x2, y2, append = false) {
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(bw - 1, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(bh - 1, Math.max(y1, y2));

        if (!append) {
            this.selectedPixels.clear();
        }

        // Optimization: Do NOT populate this.selectedPixels.
        // It freezes the browser for large selections. 
        // We only use ownerEraserBox.
        this.ownerEraserBox = { x1: minX, y1: minY, x2: maxX, y2: maxY };
        this.updateSelectionUI();
        this.requestRender();
    },

    executeOwnerClearArea() {
        if (!this.ownerEraserBox) return;

        // Implement cooldown of 5 seconds
        const now = Date.now();
        if (this.lastOwnerEraseTime && now - this.lastOwnerEraseTime < 5000) {
            const secondsLeft = Math.ceil((5000 - (now - this.lastOwnerEraseTime)) / 1000);
            if (typeof showMessage === 'function') {
                showMessage(`Espera ${secondsLeft} segundos antes de usar el borrador de nuevo.`, 'warning');
            }
            return;
        }
        this.lastOwnerEraseTime = now;

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;

        // 2. Broadcast via WebSocket server
        if (this.wsManager) {
            this.wsManager.send({
                type: 'clear_area',
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY,
                width: this.boardWidth || 64,
                canvasId: this.canvasIntId
            });
        }

        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.updateSelectionUI();
        this.requestRender();
        if (typeof showMessage === 'function') showMessage('Zona vaciada con éxito', 'success');
    },

    toggleOwnerFreeze() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const nextFrozen = !this.isFrozen;
        if (this.wsManager) {
            this.wsManager.send({
                type: "toggle_freeze",
                frozen: nextFrozen
            });
        }
    },

    toggleOwnerProtecting() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'owner_protecting') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage('Modo Protector de Zonas desactivado', 'info');
        } else {
            this.interactionMode = 'owner_protecting';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage('Modo Protector de Zonas activado. Haz clic en la primera esquina para definir la zona.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    executeOwnerProtectArea(protect = true) {
        if (!this.ownerEraserBox) return;

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;

        if (this.wsManager) {
            this.wsManager.send({
                type: "protect_area",
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY,
                width: this.boardWidth || 64,
                protect: protect
            });
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    executePlaceMines(pixels) {
        if (this.wsManager && pixels.length > 0) {
            this.wsManager.send({
                type: "place_mines",
                perk: "mines_1",
                pixels: pixels
            });
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.syncMinesToWorker();
        this.requestRender();
    },

    executeUserProtectArea() {
        if (!this.ownerEraserBox) return;

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;

        if (this.wsManager) {
            this.wsManager.send({
                type: "use_pixel_protection",
                perk: "pixel_shield_1",
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY
            });
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    toggleMyProtectionsHighlight() {
        this.showMyProtectionsHighlight = !this.showMyProtectionsHighlight;
        if (typeof showMessage === 'function') {
            if (this.showMyProtectionsHighlight) {
                showMessage('Mostrando tus zonas protegidas', 'info');
            } else {
                showMessage('Ocultando tus zonas protegidas', 'info');
            }
        }
        this.updatePerkBadges();
        if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
        this.requestRender();
    },

    updateMyProtectionsTimer() {
        if (!this.myProtectedExpiries || Object.keys(this.myProtectedExpiries).length === 0) {
            if (this.myProtectionsTimerLabel) {
                this.myProtectionsTimerLabel.textContent = '';
            }
            return;
        }

        const nowSecs = Math.floor(Date.now() / 1000);
        let minExpiry = Infinity;
        let hasExpiredAny = false;

        for (const off in this.myProtectedExpiries) {
            const exp = this.myProtectedExpiries[off];
            if (exp <= nowSecs) {
                if (this.myProtectedPixels) this.myProtectedPixels.delete(parseInt(off, 10));
                delete this.myProtectedExpiries[off];
                hasExpiredAny = true;
            } else if (exp < minExpiry) {
                minExpiry = exp;
            }
        }

        if (hasExpiredAny) {
            this.updatePerkBadges();
            if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
            this.requestRender();
        }

        if (minExpiry === Infinity) {
            if (this.myProtectionsTimerLabel) this.myProtectionsTimerLabel.textContent = '';
            return;
        }

        const diff = minExpiry - nowSecs;
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');

        const timeStr = ` - ${hrs}:${mins}:${secs}`;
        if (this.myProtectionsTimerLabel) {
            this.myProtectionsTimerLabel.textContent = timeStr;
        }
    },

    toggleRecentColorPicker() {
        const pickerDropdown = document.querySelector('[data-ref="recent-color-picker-dropdown"]');
        const pickerInner = document.querySelector('[data-ref="recent-color-picker"]');
        if (pickerDropdown) {
            const isHidden = pickerDropdown.classList.contains('disabled');
            if (isHidden) {
                pickerDropdown.classList.remove('disabled');
                pickerDropdown.classList.add('active');
                if (pickerInner) pickerInner.classList.remove('disabled');
                this.initRecentColorPicker();
            } else {
                pickerDropdown.classList.add('disabled');
                pickerDropdown.classList.remove('active');
            }
        }
    },

    initRecentColorPicker() {
        const picker = document.querySelector('[data-ref="recent-color-picker"]');
        if (!picker) return;
        picker.classList.remove('disabled');

        let activeColor = this.currentColor || '#FFFFFF';
        if (!activeColor.startsWith('#')) activeColor = '#' + activeColor;

        const hsv = this.hexToHsvRecent(activeColor);
        picker.dataset.h = hsv.h;
        picker.dataset.s = hsv.s;
        picker.dataset.v = hsv.v;

        const hexInput = picker.querySelector('[data-ref="recentHexInput"]');
        if (hexInput && !hexInput.dataset.bound) {
            hexInput.dataset.bound = '1';
            hexInput.addEventListener('input', (e) => {
                let val = e.target.value.trim();
                if (!val.startsWith('#')) val = '#' + val;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    const hsvVal = this.hexToHsvRecent(val);
                    picker.dataset.h = hsvVal.h;
                    picker.dataset.s = hsvVal.s;
                    picker.dataset.v = hsvVal.v;
                    this.updateRecentPickerUI(false);
                }
            });
            hexInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveRecentColor(true);
                }
            });
        }

        this.updateRecentPickerUI();
    },

    updateRecentPickerUI(updateInput = true) {
        const picker = document.querySelector('[data-ref="recent-color-picker"]');
        if (!picker) return;

        let h = Math.max(0, Math.min(360, parseFloat(picker.dataset.h) || 0));
        let s = Math.max(0, Math.min(100, parseFloat(picker.dataset.s) || 0));
        let v = Math.max(0, Math.min(100, parseFloat(picker.dataset.v) || 0));

        const hex = this.hsvToHexRecent(h, s, v);
        this.recentColorHex = hex;

        const svArea = picker.querySelector('[data-action="dragRecentSV"]');
        if (svArea) svArea.style.backgroundColor = `hsl(${h}, 100%, 50%)`;

        const svThumb = picker.querySelector('[data-ref="recentSvThumb"]');
        if (svThumb) {
            svThumb.style.left = `${s}%`;
            svThumb.style.top = `${100 - v}%`;
        }

        const hueThumb = picker.querySelector('[data-ref="recentHueThumb"]');
        if (hueThumb) {
            hueThumb.style.left = `${(h / 360) * 100}%`;
        }

        const hexPreview = picker.querySelector('[data-ref="recentHexPreview"]');
        if (hexPreview) hexPreview.style.backgroundColor = hex;

        if (updateInput) {
            const hexInput = picker.querySelector('[data-ref="recentHexInput"]');
            if (hexInput) hexInput.value = hex;
        }
    },

    saveRecentColor(closeDropdown = true) {
        try {
            const picker = document.querySelector('[data-ref="recent-color-picker"]');
            const hexInput = picker ? picker.querySelector('[data-ref="recentHexInput"]') : null;
            let colorToSave = (hexInput && hexInput.value) ? hexInput.value.trim() : this.recentColorHex;

            if (!colorToSave) return;
            if (!colorToSave.startsWith('#')) colorToSave = '#' + colorToSave;
            if (colorToSave.length === 4) {
                colorToSave = '#' + colorToSave[1] + colorToSave[1] + colorToSave[2] + colorToSave[2] + colorToSave[3] + colorToSave[3];
            }
            colorToSave = colorToSave.toUpperCase();

            // 1. Instantly set current color & active preview
            this.currentColor = colorToSave;
            if (this.btnColorPalette) {
                this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            }
            this.updateActiveColorPreview();
            this.syncActiveColorHighlight();

            // 2. Instantly close picker dropdown if requested
            if (closeDropdown) {
                const pickerDropdown = document.querySelector('[data-ref="recent-color-picker-dropdown"]');
                if (pickerDropdown) {
                    pickerDropdown.classList.add('disabled');
                    pickerDropdown.classList.remove('active');
                }
            }
            this.requestRender();

            // 3. Add to custom picked colors in Section 1 (instead of adding directly to Recent colors)
            this.customPickedColors = [colorToSave];
            this.renderCustomPickedColors();
        } catch (e) {
            console.error('Error saving recent color:', e);
        }
    },

    updateRecentColorsLocally(hex) {
        if (!Array.isArray(this.recentColorsList)) {
            this.recentColorsList = [];
        }
        const formattedHex = hex.toUpperCase();
        this.recentColorsList = [
            formattedHex,
            ...this.recentColorsList.filter(c => c.toUpperCase() !== formattedHex)
        ].slice(0, 12);

        this.renderRecentColors(this.recentColorsList);
    },

    recordRecentColor(hex) {
        if (!this.canvasIntId || !hex) return;
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        const formattedHex = hex.toUpperCase();

        // Check if it's already the first item in the local list to avoid duplicates/unnecessary API calls
        if (this.recentColorsList && this.recentColorsList[0] === formattedHex) {
            return;
        }

        // Update local UI immediately for responsiveness
        this.updateRecentColorsLocally(formattedHex);

        // Queue requests sequentially to avoid race conditions when switching colors rapidly
        if (!this.recentColorPromiseQueue) {
            this.recentColorPromiseQueue = Promise.resolve();
        }

        this.recentColorPromiseQueue = this.recentColorPromiseQueue.then(() => {
            return this.api.post(ApiRoutes.Canvases.AddRecentColor, {
                canvas_id: this.canvasIntId,
                color: formattedHex
            }).then(response => {
                if (response && response.success && Array.isArray(response.colors)) {
                    // Only update and re-render if the response corresponds to our current active color
                    let currentUpper = this.currentColor ? this.currentColor.toUpperCase() : '';
                    if (currentUpper && !currentUpper.startsWith('#')) currentUpper = '#' + currentUpper;
                    if (currentUpper === formattedHex) {
                        const listsIdentical = Array.isArray(response.colors) && 
                                               this.recentColorsList && 
                                               response.colors.length === this.recentColorsList.length && 
                                               response.colors.every((val, index) => val === this.recentColorsList[index]);
                        
                        if (!listsIdentical) {
                            this.recentColorsList = response.colors;
                            this.renderRecentColors(response.colors);
                        }
                    }
                }
            }).catch(e => {
                console.error('Error recording recent color:', e);
            });
        });
    },

    getEventCoordsRecent(e) {
        if (e.touches && e.touches.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        return { clientX: e.clientX, clientY: e.clientY };
    },

    updateRecentColorFromEvent(e) {
        if (!this.recentDragArea) return;
        const rect = this.recentDragArea.getBoundingClientRect();
        const coords = this.getEventCoordsRecent(e);

        let x = Math.max(0, Math.min(coords.clientX - rect.left, rect.width));
        let y = Math.max(0, Math.min(coords.clientY - rect.top, rect.height));

        const picker = document.querySelector('[data-ref="recent-color-picker"]');
        if (!picker) return;

        if (this.recentDragMode === 'sv') {
            picker.dataset.s = (x / rect.width) * 100;
            picker.dataset.v = 100 - ((y / rect.height) * 100);
        } else if (this.recentDragMode === 'hue') {
            picker.dataset.h = (x / rect.width) * 360;
        }

        this.updateRecentPickerUI();
    },

    hexToHsvRecent(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        let r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
        let g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
        let b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, v = max, d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max !== min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
    },

    hsvToHexRecent(h, s, v) {
        h /= 360; s /= 100; v /= 100;
        let r, g, b;
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }

        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }
}