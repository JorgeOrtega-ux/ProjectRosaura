// public/assets/js/modules/app/DesignInteractions.js
import { getPaletteById } from './DesignPaletteUtils.js';
import { showMessage } from '../../core/utils/uiUtils.js';

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
    },

    handleClick(e) {
        const btnPlayTimelapse = e.target.closest('[data-action="playTimelapse"]');
        if (btnPlayTimelapse) {
            e.preventDefault();
            this.startTimelapse();
            return;
        }

        const btnJoin = e.target.closest('[data-action="joinCanvasDirectly"]');
        const btnReqAccess = e.target.closest('[data-action="requestCanvasAccess"]');
        const btnReqOverlay = e.target.closest('[data-action="requestAccessFromOverlay"]');

        if (btnJoin || btnReqAccess || btnReqOverlay) {
            e.preventDefault();
            this.handleAccessRequest(btnJoin || btnReqAccess || btnReqOverlay);
            return;
        }

        const imgAdd = e.target.closest('[data-action="addTemplateToCanvas"]');
        if (imgAdd) {
            e.preventDefault();
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

        if (this.isSpectator || this.timelapseActive || this.isResetLocked) return; 

        const btnUpload = e.target.closest('[data-action="triggerTemplateUpload"]');
        if (btnUpload && this.fileInput) {
            e.preventDefault();
            this.fileInput.click();
            return;
        }

        const cardTemplate = e.target.closest('[data-action="selectTemplate"]');
        if (cardTemplate && !e.target.closest('.component-template-action-btn')) {
            const id = cardTemplate.getAttribute('data-id');
            this.toggleTemplate(id);
            return;
        }

        const btnLock = e.target.closest('[data-action="toggleTemplateLock"]');
        if (btnLock) {
            e.stopPropagation();
            const id = btnLock.closest('.component-template-card').getAttribute('data-id');
            this.toggleLockTemplate(id);
            return;
        }

        const btnDelete = e.target.closest('[data-action="deleteTemplate"]');
        if (btnDelete) {
            e.stopPropagation();
            const id = btnDelete.closest('.component-template-card').getAttribute('data-id');
            this.deleteTemplate(id);
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
        if (!target) return;

        if (e.shiftKey || e.button === 1 || this.isSpectator || this.timelapseActive || this.isResetLocked) {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.classList.add('cursor-grabbing');
            return;
        }

        const exact = this.getExactBoardCoords(e.clientX, e.clientY);
        if (exact) {
            const hit = this.checkTemplateHit(exact.x, exact.y);
            if (hit) {
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
                this.selectedPixels.add(key);
            }
            this.isSelecting = true;
            this.updateSelectionUI();
            this.requestRender();
        }
    },

    handleMouseMove(e) {
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
            this.requestRender();
            return; 
        }

        if (this.isSelecting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                const key = `${coords.x},${coords.y}`;
                const sizeBefore = this.selectedPixels.size;
                
                if (this.selectionMode === 'add') {
                    this.selectedPixels.add(key);
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
                if (hit === 'move') this.canvas.style.cursor = 'move';
                else if (hit === 'resize-tl' || hit === 'resize-br') this.canvas.style.cursor = 'nwse-resize';
                else if (hit === 'resize-tr' || hit === 'resize-bl') this.canvas.style.cursor = 'nesw-resize';
                
                if (this.hoveredPixel !== null) {
                    this.hoveredPixel = null;
                    if (this.coordsText) this.coordsText.textContent = '- , -';
                    this.requestRender();
                }
                return;
            } else {
                this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'default';
            }
            
            this.calculateHoverPixel(e.clientX, e.clientY);
        } else if (this.hoveredPixel !== null) {
            this.hoveredPixel = null;
            if (this.coordsText) this.coordsText.textContent = '- , -';
            this.requestRender();
        }
    },

    handleMouseUp(e) {
        if (this.templateInteraction) {
            this.templateInteraction = null;
            this.requestRender();
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.classList.remove('cursor-grabbing');
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

        if (this.coordsText) {
            if (newHover) {
                this.coordsText.textContent = `${newHover.x} , ${newHover.y}`;
            } else {
                this.coordsText.textContent = '- , -';
            }
        }
    },

    updateSelectionUI() {
        if (!this.btnPlacePixels || !this.txtPlacePixels) return;

        const balance = Math.floor(this.cooldownBalance);

        if (this.selectedPixels.size > 0 && this.selectedPixels.size <= balance) {
            this.btnPlacePixels.classList.remove('disabled-interactive');
            this.txtPlacePixels.textContent = window.__ ? window.__('btn_place_pixels') || 'Colocar' : 'Colocar';
        } else {
            this.btnPlacePixels.classList.add('disabled-interactive');
            if (this.selectedPixels.size > balance) {
                this.txtPlacePixels.textContent = `Máx ${balance} px`;
            } else {
                this.txtPlacePixels.textContent = window.__ ? window.__('btn_select_pixels') || 'Seleccionar Píxeles' : 'Seleccionar Píxeles';
            }
        }
    },

    placePixels() {
        if (this.selectedPixels.size === 0 || this.isSpectator || this.timelapseActive || this.isResetLocked) return;
        
        const balance = Math.floor(this.cooldownBalance);
        if (this.selectedPixels.size > balance) {
            showMessage(`Solo tienes ${balance} píxeles disponibles.`, 'warning');
            return;
        }

        const paletteObj = getPaletteById(this.canvasPaletteId);
        let colorIndex = 0;
        if (paletteObj && paletteObj.colors) {
            const idx = paletteObj.colors.indexOf(this.currentColor);
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

        // Actualización optimista de interfaz
        this.cooldownBalance -= this.selectedPixels.size;
        if (this.cooldownBalance < this.cooldownMax && this.cooldownNextIn <= 0) {
            this.cooldownNextIn = this.cooldownSec;
            this.lastSyncTime = Date.now();
        }

        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();
        
        showMessage(window.__ ? window.__('msg_pixels_placed') || 'Píxeles colocados' : 'Píxeles colocados', 'success');
    },

    handleResize() {
        this.updateCanvasDimensions();
        this.limitBounds();
        this.requestRender();
    }
};