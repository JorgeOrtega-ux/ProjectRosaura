import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { showMessage } from '../../../core/utils/uiUtils.js';
import { PerksRegistry } from './PerksRegistry.js';

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
        if (this.isSandbox) {
            if (this.interactionMode === 'owner_erasing') return Infinity;
            if (this.perkNoCooldown) return Infinity;
            if (this.interactionMode === 'bombing') {
                return typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
            }
            return this.cooldownMax;
        }
        if (this.interactionMode === 'owner_erasing') return Infinity;
        if (this.perkNoCooldown) return Infinity;
        if (this.interactionMode === 'protecting') return this.perkProtectionLeft || 0;
        if (this.interactionMode === 'erasing') return this.perkEraserLeft || 0;
        if (this.interactionMode === 'bombing') {
            return typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
        }
        return Math.floor(this.cooldownBalance);
    },

    handleClick(e) {
        const btnSandboxSettings = e.target.closest('[data-action="openSandboxSettingsModal"]');
        if (btnSandboxSettings) {
            e.preventDefault();
            this.openSandboxSettingsModal();
            return;
        }

        if (this.isSandbox) {
            const btnToggleDropdown = e.target.closest('[data-action="toggleDropdown"]');
            if (btnToggleDropdown) {
                e.preventDefault();
                this.toggleModalDropdown(btnToggleDropdown);
                return;
            }

            const btnSelectValue = e.target.closest('[data-action="selectValue"]');
            if (btnSelectValue) {
                e.preventDefault();
                this.selectModalDropdownValue(btnSelectValue);
                return;
            }

            const btnAdjust = e.target.closest('[data-action="adjustSandboxCooldownBatch"]');
            if (btnAdjust) {
                e.preventDefault();
                const step = parseInt(btnAdjust.getAttribute('data-step'), 10);
                const min = parseInt(btnAdjust.getAttribute('data-min') || '1', 10);
                const max = parseInt(btnAdjust.getAttribute('data-max') || '1000', 10);
                
                const valEl = document.getElementById('sandbox_cooldown_batch_val');
                const inputEl = document.getElementById('sandbox_cooldown_batch');
                if (valEl && inputEl) {
                    let curVal = parseInt(valEl.getAttribute('data-val') || '100', 10);
                    let newVal = curVal + step;
                    if (newVal < min) newVal = min;
                    if (newVal > max) newVal = max;
                    
                    valEl.setAttribute('data-val', newVal);
                    valEl.textContent = newVal;
                    inputEl.value = newVal;
                }
                return;
            }
        }
        
        if (typeof this.handleTemplateModals === 'function' && this.handleTemplateModals(e)) {
            return; 
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
            e.preventDefault();
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
            if (typeof this.deleteServerTemplate === 'function') {
                this.deleteServerTemplate(id);
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
            document.querySelectorAll('.component-color-btn').forEach(btn => btn.classList.remove('active'));
            btnColor.classList.add('active');
            
            this.currentColor = btnColor.getAttribute('data-color') || '#000000';
            
            if (this.btnColorPalette) {
                this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            }
            
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
        
        // Skip shortcuts if a modifier key is pressed (e.g. Ctrl+C)
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

                        if (window.modalSystem) {
                            window.modalSystem.show('confirmUnprotectAreaModal', { count: 1 }).then(res => {
                                const actStr = (typeof res === 'string') ? res : (res?.action || null);
                                if (actStr === 'unprotect') {
                                    this.ownerEraserBox = { x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y };
                                    this.ownerEraserStep = 2;
                                    this.executeOwnerProtectArea(false);
                                }
                            });
                        } else {
                            const act = confirm(window.__('confirm_unprotect_pixel'));
                            if (act) {
                                this.ownerEraserBox = { x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y };
                                this.ownerEraserStep = 2;
                                this.executeOwnerProtectArea(false);
                            }
                        }
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
                    this.uiLiveInputX.setAttribute('data-val', tpl.x);
                    this.uiLiveInputX.textContent = tpl.x;
                }
                if (this.uiLiveInputY) {
                    this.uiLiveInputY.setAttribute('data-val', tpl.y);
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
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            this.requestRender();
        }
    },

    handleMouseUp(e) {

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
                    this.uiLiveInputX.setAttribute('data-val', tpl.x);
                    this.uiLiveInputX.textContent = tpl.x;
                }
                if (this.uiLiveInputY) {
                    this.uiLiveInputY.setAttribute('data-val', tpl.y);
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
        const currentHoverStr = this.hoveredPixel ? `${this.hoveredPixel.x},${this.hoveredPixel.y}` : 'null';
        const newHoverStr = newHover ? `${newHover.x},${newHover.y}` : 'null';

        if (currentHoverStr !== newHoverStr) {
            this.hoveredPixel = newHover;
            this.requestRender();
        }

        if (newHover) {
            this.setCanvasBadge('coords', 'my_location', `${newHover.x} , ${newHover.y}`, 'left');
        } else {
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
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
        
        if (this.interactionMode === 'user_protecting') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            if (window.modalSystem) {
                window.modalSystem.show('confirmProtectAreaModal', { count }).then(result => {
                    const actStr = (typeof result === 'string') ? result : (result?.action || (result?.confirmed ? 'protect' : null));
                    if (actStr === 'protect') {
                        this.executeUserProtectArea();
                    }
                });
            } else {
                const act = confirm(`¿Estás seguro de proteger esta zona de ${count} píxeles por 24 horas usando tu ventaja?`);
                if (act) {
                    this.executeUserProtectArea();
                }
            }
            return;
        }

        if (this.interactionMode === 'owner_erasing') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            if (window.modalSystem) {
                window.modalSystem.show('confirmClearAreaModal', { count }).then(result => {
                    if (result && result.confirmed) {
                        this.executeOwnerClearArea();
                    }
                });
            } else if (confirm(`¿Estás seguro de vaciar esta zona de ${count} píxeles?`)) {
                this.executeOwnerClearArea();
            }
            return;
        }

        if (this.interactionMode === 'owner_protecting') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            if (window.modalSystem) {
                window.modalSystem.show('confirmProtectAreaModal', { count }).then(result => {
                    const actStr = (typeof result === 'string') ? result : (result?.action || (result?.confirmed ? 'protect' : null));
                    if (actStr === 'protect' || actStr === 'unprotect') {
                        this.executeOwnerProtectArea(actStr === 'protect');
                    }
                });
            } else {
                const act = confirm(`Aceptar para Proteger la zona (${count} px). Cancelar para Desproteger la zona.`);
                this.executeOwnerProtectArea(act);
            }
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


            targets.forEach(tgt => {
                const warningData = {
                    x: tgt.x,
                    y: tgt.y,
                    duration: durationSecs,
                    perk: usedPerk,
                    radius: perkRadius
                };
                if (typeof this.handleBombWarning === 'function') {
                    this.handleBombWarning(warningData);
                } else if (typeof this.handleNuclearWarning === 'function') {
                    this.handleNuclearWarning(warningData);
                }
            });

            if (this.isSandbox) {
                setTimeout(() => {
                    if (this.renderWorker) {
                        this.renderWorker.postMessage({
                            type: 'BOMB_PIXEL',
                            payload: { cX: targets[0]?.x ?? 0, cY: targets[0]?.y ?? 0, r: perkRadius, perkId: usedPerk }
                        });
                    }
                    if (typeof this.triggerExplosionEffect === 'function') {
                        this.triggerExplosionEffect(targets[0]?.x ?? 0, targets[0]?.y ?? 0, perkRadius, usedPerk);
                    }
                    this.persistBombExplosion(targets[0]?.x ?? 0, targets[0]?.y ?? 0, perkRadius);
                }, durationSecs * 1000);
            } else {
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
        
        if (this.isSandbox) {
            (async () => {
                try {
                    const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
                    const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

                    const chunkSize = 512;
                    const chunkGroups = {};
                    
                    validPixels.forEach(p => {
                        const cx = Math.floor(p.x / chunkSize);
                        const cy = Math.floor(p.y / chunkSize);
                        const key = `${cx},${cy}`;
                        if (!chunkGroups[key]) {
                            chunkGroups[key] = [];
                        }
                        chunkGroups[key].push(p);
                    });

                    for (const [key, pixels] of Object.entries(chunkGroups)) {
                        const [cx, cy] = key.split(',').map(Number);
                        const actualW = Math.min(chunkSize, this.boardWidth - cx * chunkSize);
                        const actualH = Math.min(chunkSize, this.boardHeight - cy * chunkSize);

                        let base64 = await DesignSandboxDb.getChunk(key, this.sandboxUuid);
                        let bytes;
                        if (base64) {
                            bytes = await DesignSandboxDb.decompress(base64);
                        }
                        if (!bytes || bytes.length !== actualW * actualH * 4) {
                            bytes = new Uint8Array(actualW * actualH * 4);
                        }

                        const colorHex = this.interactionMode === 'erasing' ? '#000000' : this.currentColor;
                        const r = parseInt(colorHex.slice(1, 3), 16);
                        const g = parseInt(colorHex.slice(3, 5), 16);
                        const b = parseInt(colorHex.slice(5, 7), 16);
                        const a = this.interactionMode === 'erasing' ? 0 : 255;

                        pixels.forEach(p => {
                            const lx = p.x % chunkSize;
                            const ly = p.y % chunkSize;
                            const pixelOffset = (ly * actualW + lx) * 4;
                            if (pixelOffset >= 0 && pixelOffset + 3 < bytes.length) {
                                bytes[pixelOffset] = r;
                                bytes[pixelOffset + 1] = g;
                                bytes[pixelOffset + 2] = b;
                                bytes[pixelOffset + 3] = a;
                            }
                        });

                        const newBase64 = await DesignSandboxDb.compressAndEncode(bytes);
                        await DesignSandboxDb.saveChunk(key, newBase64, this.sandboxUuid);
                    }

                    // Capturar miniatura
                    const settings = await DesignSandboxDb.getSettings(this.sandboxUuid);
                    if (settings) {
                        settings.thumbnail = await this.generateSandboxThumbnail();
                        await DesignSandboxDb.saveSettings(settings, this.sandboxUuid);
                    }
                } catch (e) {
                    console.error('[Sandbox] Error saving pixels to IndexedDB:', e);
                }
            })();

            showMessage('Píxeles guardados localmente', 'success');

            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        if (this.wsManager && validPixels.length > 0) {
            if (validPixels.length === 1) {
                const p = validPixels[0];
                let msgType = 'pixel';
                if (this.interactionMode === 'protecting') msgType = 'protect_pixel';
                if (this.interactionMode === 'erasing') msgType = 'erase_pixel';

                this.wsManager.send({
                    type: msgType,
                    x: p.x,
                    y: p.y,
                    color: colorHex,
                    width: this.boardWidth,
                    userId: window.activeUserId || null 
                });
            } else {
                let msgType = 'batch_pixels';
                if (this.interactionMode === 'protecting') msgType = 'batch_protect_pixels';
                if (this.interactionMode === 'erasing') msgType = 'batch_erase_pixels';

                this.wsManager.send({
                    type: msgType,
                    pixels: validPixels.map(p => ({ x: p.x, y: p.y })),
                    color: colorHex,
                    width: this.boardWidth,
                    userId: window.activeUserId || null
                });
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
        if (this.isSandbox) {
            this.inventoryPerks = [
                { perk_id: 'pixel_misil_1', count: 999 },
                { perk_id: 'bomba_pixel_1', count: 999 },
                { perk_id: 'bomba_atomica_1', count: 999 },
                { perk_id: 'bomba_racimo_1', count: 999 },
                { perk_id: 'lluvia_meteoritos_1', count: 999 },
                { perk_id: 'proteccion_pixeles_1', count: 999 }
            ];
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            return;
        }
        try {
            const result = await this.api.post('store.get_my_perks', {});
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

        if (perkId === 'proteccion_pixeles_1') {
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

        if (this.isSandbox) {
            if (perkId.includes('cooldown') || perkId.includes('no_cooldown')) {
                this.perkNoCooldown = true;
                this.perkNoCooldownExpires = Date.now() + 60000;
                showMessage('Ventaja Sin Cooldown activada (60s)', 'success');
            } else {
                showMessage('Ventaja activada con éxito', 'success');
            }
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        try {
            if (btn) btn.classList.add('loading');
            const result = await this.api.post('store.activate_perk', { perk_id: perkId });
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
        const PERK_ORDER = PerksRegistry.getDisplayOrder();
        let renderedInventoryCount = 0;

        PERK_ORDER.forEach(perkId => {
            let isActive = false;
            let activeHtml = '';
            let isToggledOn = false;
            let icon = PerksRegistry.getIcon(perkId);
            let clickHandler = null;

            if (PerksRegistry.isBomb(perkId)) {
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
            } else if (perkId === 'proteccion_pixeles_1') {
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
            protBadge.style.cursor = 'pointer';
            if (isHighlighting) {
                protBadge.style.border = '1px solid var(--color-success)';
                protBadge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                protBadge.innerHTML = `<span class="material-symbols-rounded component-text-success">shield</span><span>Zonas protegidas (${myProtectedCount})<span data-ref="my-protections-timer-label" style="font-family: monospace; font-size: 11px; margin-left: 4px; opacity: 0.8;"></span></span>`;
            } else {
                protBadge.innerHTML = `<span class="material-symbols-rounded">shield</span><span>Zonas protegidas (${myProtectedCount})<span data-ref="my-protections-timer-label" style="font-family: monospace; font-size: 11px; margin-left: 4px; opacity: 0.8;"></span></span>`;
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

    executeUserProtectArea() {
        if (!this.ownerEraserBox) return;

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;

        if (this.wsManager) {
            this.wsManager.send({
                type: "use_pixel_protection",
                perk: "proteccion_pixeles_1",
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

    async openSandboxSettingsModal() {
        if (!window.modalSystem) return;

        try {
            const res = await window.modalSystem.show('sandboxSettingsModal', {
                width: this.boardWidth,
                height: this.boardHeight,
                paletteId: this.canvasPaletteId,
                cooldownBatch: this.cooldownMax
            });

            if (res && res.confirmed && res.data) {
                const newWidth = parseInt(res.data.sandbox_width, 10);
                const newHeight = parseInt(res.data.sandbox_height, 10);
                const newPalette = res.data.sandbox_palette;
                const newLimit = parseInt(res.data.sandbox_cooldown_batch, 10);

                if (isNaN(newWidth) || newWidth < 1 || newWidth > 4096 || isNaN(newHeight) || newHeight < 1 || newHeight > 4096) {
                    showMessage('Dimensiones inválidas (deben ser entre 1 y 4096 px)', 'error');
                    return;
                }
                if (isNaN(newLimit) || newLimit < 1) {
                    showMessage('Límite de lote inválido', 'error');
                    return;
                }

                const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
                const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

                const widthChanged = this.boardWidth !== newWidth;
                const heightChanged = this.boardHeight !== newHeight;

                if (widthChanged || heightChanged) {
                    try {
                        await DesignSandboxDb.migrateChunks(this.boardWidth, this.boardHeight, newWidth, newHeight, this.sandboxUuid);
                    } catch (e) {
                        console.error('[Sandbox] Chunk migration failed:', e);
                    }
                }

                await DesignSandboxDb.saveSettings({
                    width: newWidth,
                    height: newHeight,
                    paletteId: newPalette,
                    cooldownBatch: newLimit
                }, this.sandboxUuid);
                
                this.boardWidth = newWidth;
                this.boardHeight = newHeight;
                this.canvasPaletteId = newPalette;
                this.cooldownMax = newLimit;
                this.cooldownBalance = newLimit;

                this.renderColorPalette(this.canvasPaletteId);

                this.setupCanvas();
                this.centerBoard();

                if (this.loadedChunks) this.loadedChunks.clear();
                if (this.loadingChunks) this.loadingChunks.clear();

                if (this.renderWorker) {
                    if (widthChanged || heightChanged) {
                        this.renderWorker.postMessage({
                            type: 'RESIZE_BOARD',
                            payload: { boardWidth: this.boardWidth, boardHeight: this.boardHeight }
                        });
                    }
                }

                this.updateVisibleChunks();
                this.requestRender();
                showMessage('Ajustes del Sandbox actualizados con éxito', 'success');
            }
        } catch (e) {
            console.error('[Sandbox] Error saving settings from modal:', e);
        }
    },

    async persistBombExplosion(cX, cY, r) {
        try {
            const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
            const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

            const chunkSize = 512;
            const rSq = r * r;

            const minCx = Math.max(0, Math.floor((cX - r) / chunkSize));
            const maxCx = Math.min(Math.floor((this.boardWidth - 1) / chunkSize), Math.floor((cX + r) / chunkSize));
            const minCy = Math.max(0, Math.floor((cY - r) / chunkSize));
            const maxCy = Math.min(Math.floor((this.boardHeight - 1) / chunkSize), Math.floor((cY + r) / chunkSize));

            for (let cx = minCx; cx <= maxCx; cx++) {
                for (let cy = minCy; cy <= maxCy; cy++) {
                    const key = `${cx},${cy}`;
                    const actualW = Math.min(chunkSize, this.boardWidth - cx * chunkSize);
                    const actualH = Math.min(chunkSize, this.boardHeight - cy * chunkSize);

                    let base64 = await DesignSandboxDb.getChunk(key, this.sandboxUuid);
                    let bytes;
                    if (base64) {
                        bytes = await DesignSandboxDb.decompress(base64);
                    }
                    if (!bytes || bytes.length !== actualW * actualH * 4) {
                        bytes = new Uint8Array(actualW * actualH * 4);
                    }

                    let chunkChanged = false;
                    const startX = cx * chunkSize;
                    const startY = cy * chunkSize;

                    for (let ly = 0; ly < actualH; ly++) {
                        const y = startY + ly;
                        const dy = y - cY;
                        if (Math.abs(dy) > r) continue;

                        for (let lx = 0; lx < actualW; lx++) {
                            const x = startX + lx;
                            const dx = x - cX;
                            if (dx * dx + dy * dy <= rSq) {
                                const offset = (ly * actualW + lx) * 4;
                                bytes[offset] = 0;
                                bytes[offset + 1] = 0;
                                bytes[offset + 2] = 0;
                                bytes[offset + 3] = 0;
                                chunkChanged = true;
                            }
                        }
                    }

                    if (chunkChanged) {
                        const newBase64 = await DesignSandboxDb.compressAndEncode(bytes);
                        await DesignSandboxDb.saveChunk(key, newBase64, this.sandboxUuid);
                    }
                }
            }

            // Capturar miniatura para la explosión de la bomba
            try {
                const settings = await DesignSandboxDb.getSettings(this.sandboxUuid);
                if (settings) {
                    settings.thumbnail = await this.generateSandboxThumbnail();
                    await DesignSandboxDb.saveSettings(settings, this.sandboxUuid);
                }
            } catch (err) {}

            if (this.loadedChunks) this.loadedChunks.clear();
            if (this.loadingChunks) this.loadingChunks.clear();
            this.updateVisibleChunks();
            this.requestRender();
        } catch (e) {
            console.error('[Sandbox] Failed to persist bomb explosion in IndexedDB:', e);
        }
    },

    toggleModalDropdown(triggerBtn) {
        if (triggerBtn.classList.contains('disabled-interaction')) return;
        const targetId = triggerBtn.getAttribute('data-target');
        const targetDropdown = document.querySelector(`[data-module="${targetId}"]`);
        
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            if (el !== targetDropdown) {
                el.classList.remove('active');
                el.classList.add('disabled');
            }
        });

        if (targetDropdown) {
            if (targetDropdown.classList.contains('disabled')) {
                targetDropdown.classList.remove('disabled');
                targetDropdown.classList.add('active');
            } else {
                targetDropdown.classList.remove('active');
                targetDropdown.classList.add('disabled');
            }
        }
    },

    selectModalDropdownValue(optionBtn) {
        const type = optionBtn.getAttribute('data-type');
        const value = optionBtn.getAttribute('data-value');
        const label = optionBtn.getAttribute('data-label');
        const icon = optionBtn.getAttribute('data-icon');

        if (type === 'size') {
            const widthInput = document.getElementById('sandbox_width');
            const heightInput = document.getElementById('sandbox_height');
            if (widthInput && heightInput) {
                if (value !== 'custom') {
                    const [w, h] = value.split('x').map(Number);
                    widthInput.value = w;
                    heightInput.value = h;
                }
            }
        } else if (type === 'palette') {
            const paletteInput = document.getElementById('sandbox_palette');
            if (paletteInput) {
                paletteInput.value = value;
            }
        }

        const menu = optionBtn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
            optionBtn.classList.add('active');
        }

        const dropdownWrapper = optionBtn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('.component-dropdown-text');
            if (triggerText) {
                triggerText.textContent = label;
            }
            const triggerIcon = dropdownWrapper.querySelector('.component-dropdown-trigger span:first-child');
            if (triggerIcon && icon) {
                triggerIcon.textContent = icon;
            }
            const targetModule = dropdownWrapper.querySelector('.component-module--dropdown');
            if (targetModule) {
                targetModule.classList.remove('active');
                targetModule.classList.add('disabled');
            }
        }
    }
};