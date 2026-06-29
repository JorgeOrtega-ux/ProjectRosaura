// public/assets/js/modules/app/DesignInteractions.js
import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

export const DesignInteractions = {
    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('click', this.handleClickBound);
        window.addEventListener('resize', this.handleResizeBound);

        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileUploadBound);
        }

        if (this.uiLiveInputX) this.uiLiveInputX.addEventListener('change', this.handleLiveInputBound);
        if (this.uiLiveInputY) this.uiLiveInputY.addEventListener('change', this.handleLiveInputBound);
        if (this.uiLiveInputOpacity) this.uiLiveInputOpacity.addEventListener('input', this.handleLiveInputBound);
    },

    handleLiveInput(e) {
        if (this.isResetLocked || this.isResizeLocked || this.liveShareStatus !== 'owner' || !this.activeTemplateId) return;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (!tpl) return;

        if (e.target === this.uiLiveInputX) tpl.x = parseInt(e.target.value) || 0;
        if (e.target === this.uiLiveInputY) tpl.y = parseInt(e.target.value) || 0;
        if (e.target === this.uiLiveInputOpacity) {
            tpl.opacity = parseFloat(e.target.value) || 1;
            const lbl = document.querySelector('[data-ref="live-opacity-val"]');
            if (lbl) lbl.textContent = `${Math.round(tpl.opacity * 100)}%`;
        }
        
        this.requestRender();
        this.emitLiveImageUpdate(); 
    },

    handleClick(e) {
        const btnStartLive = e.target.closest('[data-action="startLiveShare"]');
        if (btnStartLive) {
            e.preventDefault();
            this.startLiveShare();
            return;
        }

        const btnStopLive = e.target.closest('[data-action="stopLiveShare"]');
        if (btnStopLive) {
            e.preventDefault();
            this.stopLiveShare();
            return;
        }

        const btnJoinLive = e.target.closest('[data-action="joinLiveShare"]');
        if (btnJoinLive) {
            e.preventDefault();
            if (this.uiLiveJoinCode && this.uiLiveJoinCode.value.trim() !== '') {
                this.joinLiveImageSession(this.uiLiveJoinCode.value.trim().toUpperCase());
            } else {
                showMessage(__('err_valid_code'), 'warning');
            }
            return;
        }

        const btnPlayTimelapse = e.target.closest('[data-action="playTimelapse"]');
        if (btnPlayTimelapse) {
            e.preventDefault();
            this.startTimelapse();
            return;
        }

        const btnJoin = e.target.closest('[data-action="joinCanvasDirectly"]');
        const btnReqAccess = e.target.closest('[data-action="requestCanvasAccess"]');

        if (btnJoin || btnReqAccess) {
            e.preventDefault();
            this.handleAccessRequest(btnJoin || btnReqAccess);
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
            this.addTemplateFromLibrary(url);
            return;
        }

        const btnDelServer = e.target.closest('[data-action="deleteServerTemplate"]');
        if (btnDelServer) {
            e.preventDefault();
            e.stopPropagation(); 
            const id = btnDelServer.getAttribute('data-id');
            this.deleteServerTemplate(id);
            return;
        }

        if (this.isSpectator || this.timelapseActive || this.isResetLocked || this.isResizeLocked) return; 

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
            this.toggleTemplate(id);
            return;
        }

        const btnLock = e.target.closest('[data-action="toggleTemplateLock"]');
        if (btnLock) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleTemplateLock();
            return;
        }

        const btnDelete = e.target.closest('[data-action="deleteTemplate"]');
        if (btnDelete) {
            e.preventDefault();
            e.stopPropagation();
            this.deleteTemplate();
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
        if (this.isResetLocked || this.isResizeLocked) return;

        if (e.key === 'Escape' && this.selectedPixels.size > 0) {
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
        }
    },

    handleWheel(e) {
        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;
        
        e.preventDefault(); 
        if (this.isResizeLocked) return; 
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.1;
        const delta = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(delta * zoomIntensity);

        let newScale = this.transform.scale * zoomFactor;
        newScale = Math.max(0.05, Math.min(newScale, 40)); 

        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

        this.limitBounds();
        this.calculateHoverPixel(e.clientX, e.clientY);
        this.requestRender();
    },

    handleMouseDown(e) {
        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target || this.isResizeLocked) return;

        if (e.shiftKey || e.button === 1 || this.isSpectator || this.timelapseActive || this.isResetLocked) {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.classList.add('component-cursor-grabbing');
            return;
        }

        const exact = this.getExactBoardCoords(e.clientX, e.clientY);
        if (exact) {
            const hit = this.checkTemplateHit(exact.x, exact.y);
            if (hit) {
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

        const coords = this.getBoardCoords(e.clientX, e.clientY);
        if (coords) {
            const key = `${coords.x},${coords.y}`;
            if (this.selectedPixels.has(key)) {
                this.selectionMode = 'remove';
                this.selectedPixels.delete(key);
            } else {
                this.selectionMode = 'add';
                if (this.selectedPixels.size < Math.floor(this.cooldownBalance)) {
                    this.selectedPixels.add(key);
                } else {
                    showMessage(__('err_pixel_limit').replace(':limit', Math.floor(this.cooldownBalance)), 'warning');
                }
            }
            this.isSelecting = true;
            this.updateSelectionUI();
            this.requestRender();
        }
    },

    handleMouseMove(e) {
        if (this.isResizeLocked) return;
        
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.transform.x += dx;
            this.transform.y += dy;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            
            this.limitBounds();
            this.calculateHoverPixel(e.clientX, e.clientY);
            this.requestRender();
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
                
                newX = Math.max(0, Math.min(newX, this.boardWidth - tpl.w));
                newY = Math.max(0, Math.min(newY, this.boardHeight - tpl.h));
                
                tpl.x = newX;
                tpl.y = newY;
            } else {
                const aspect = this.templateInteraction.origW / this.templateInteraction.origH;
                let newW, newH;

                if (this.templateInteraction.type === 'resize-br') {
                    newW = Math.round(this.templateInteraction.origW + dx);
                    let maxW = this.boardWidth - this.templateInteraction.origX;
                    let maxW_H = (this.boardHeight - this.templateInteraction.origY) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    newH = Math.round(newW / aspect);
                    
                    tpl.w = newW; tpl.h = newH;
                } else if (this.templateInteraction.type === 'resize-tl') {
                    newW = Math.round(this.templateInteraction.origW - dx);
                    let maxW = this.templateInteraction.origX + this.templateInteraction.origW;
                    let maxW_H = (this.templateInteraction.origY + this.templateInteraction.origH) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    newH = Math.round(newW / aspect);
                    
                    tpl.w = newW; tpl.h = newH;
                    tpl.x = this.templateInteraction.origX + this.templateInteraction.origW - newW;
                    tpl.y = this.templateInteraction.origY + this.templateInteraction.origH - newH;
                } else if (this.templateInteraction.type === 'resize-tr') {
                    newW = Math.round(this.templateInteraction.origW + dx);
                    let maxW = this.boardWidth - this.templateInteraction.origX;
                    let maxW_H = (this.templateInteraction.origY + this.templateInteraction.origH) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    newH = Math.round(newW / aspect);

                    tpl.w = newW; tpl.h = newH;
                    tpl.y = this.templateInteraction.origY + this.templateInteraction.origH - newH;
                } else if (this.templateInteraction.type === 'resize-bl') {
                    newW = Math.round(this.templateInteraction.origW - dx);
                    let maxW = this.templateInteraction.origX + this.templateInteraction.origW;
                    let maxW_H = (this.boardHeight - this.templateInteraction.origY) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    newH = Math.round(newW / aspect);

                    tpl.w = newW; tpl.h = newH;
                    tpl.x = this.templateInteraction.origX + this.templateInteraction.origW - newW;
                }
            }
            
            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (this.uiLiveInputX) this.uiLiveInputX.value = tpl.x;
                if (this.uiLiveInputY) this.uiLiveInputY.value = tpl.y;
            }

            this.requestRender();
            return; 
        }

        if (this.isSelecting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                const key = `${coords.x},${coords.y}`;
                const sizeBefore = this.selectedPixels.size;
                
                if (this.selectionMode === 'add') {
                    if (this.selectedPixels.size < Math.floor(this.cooldownBalance)) {
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
            if (exact && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
                hit = this.checkTemplateHit(exact.x, exact.y);
            }
            
            if (hit) {
                if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                    this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw');
                } else {
                    this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw');
                    if (hit === 'move') this.canvas.classList.add('component-cursor-move');
                    else if (hit === 'resize-tl' || hit === 'resize-br') this.canvas.classList.add('component-cursor-nwse');
                    else if (hit === 'resize-tr' || hit === 'resize-bl') this.canvas.classList.add('component-cursor-nesw');
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
        if (this.isResizeLocked) return;

        if (this.templateInteraction) {
            this.templateInteraction = null;
            this.requestRender();
            
            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                this.emitLiveImageUpdate();
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

        const balance = Math.floor(this.cooldownBalance);

        if (this.selectedPixels.size > 0 && this.selectedPixels.size <= balance) {
            this.btnPlacePixels.classList.remove('disabled-interactive');
            this.txtPlacePixels.textContent = __('btn_place_pixels');
        } else {
            this.btnPlacePixels.classList.add('disabled-interactive');
            if (this.selectedPixels.size > balance) {
                this.txtPlacePixels.textContent = __('lbl_max_pixels').replace(':max', balance);
            } else {
                this.txtPlacePixels.textContent = __('btn_select_pixels');
            }
        }
    },

    placePixels() {
        if (this.selectedPixels.size === 0 || this.isSpectator || this.timelapseActive || this.isResetLocked || this.isResizeLocked) return;
        
        const balance = Math.floor(this.cooldownBalance);
        if (this.selectedPixels.size > balance) {
            showMessage(__('err_pixel_limit').replace(':limit', balance), 'warning');
            return;
        }

        const paletteObj = getPaletteById(this.canvasPaletteId);
        let colorIndex = 0;
        if (paletteObj && paletteObj.colors) {
            const idx = paletteObj.colors.findIndex(c => c.hex.toLowerCase() === this.currentColor.toLowerCase());
            if (idx !== -1) colorIndex = idx;
        }

        this.selectedPixels.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            this.offscreenCtx.fillStyle = this.currentColor;
            this.offscreenCtx.clearRect(x, y, 1, 1);
            this.offscreenCtx.fillRect(x, y, 1, 1);
            
            if (this.wsManager) {
                this.wsManager.send({
                    type: 'pixel',
                    x: x,
                    y: y,
                    color: colorIndex,
                    width: this.boardWidth,
                    userId: window.activeUserId || null 
                });
            }
        });

        this.cooldownBalance -= this.selectedPixels.size;
        if (this.cooldownBalance < this.cooldownMax && this.cooldownNextIn <= 0) {
            this.cooldownNextIn = this.cooldownSec;
            this.lastSyncTime = Date.now();
        }

        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();
        
        showMessage(__('msg_pixels_placed'), 'success');
    },

    handleResize() {
        if (this.isResizeLocked) return;
        this.updateCanvasDimensions();
        this.limitBounds();
        this.requestRender();
    }
};