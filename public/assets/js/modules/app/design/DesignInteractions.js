// public/assets/js/modules/app/design/DesignInteractions.js
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

        document.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
        document.addEventListener('touchend', this.handleTouchEndBound);

        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileUploadBound);
        }
    },

    getMaxBalance() {
        if (this.perkNoCooldown) return Infinity;
        if (this.interactionMode === 'protecting') return this.perkProtectionLeft || 0;
        if (this.interactionMode === 'erasing') return this.perkEraserLeft || 0;
        return Math.floor(this.cooldownBalance);
    },

    handleClick(e) {
        // 1. Delegar los eventos de modales (Live Share/Templates) al módulo correspondiente
        if (typeof this.handleTemplateModals === 'function' && this.handleTemplateModals(e)) {
            return; // Si handleTemplateModals devuelve 'true', capturó el evento.
        }

        // 2. Comportamiento general
        const btnActivatePerk = e.target.closest('[data-action="activatePerk"]');
        if (btnActivatePerk) {
            e.preventDefault();
            if (typeof this.activatePerk === 'function') {
                this.activatePerk(btnActivatePerk.getAttribute('data-perk-id'), btnActivatePerk);
            }
            return;
        }

        const btnPlayTimelapse = e.target.closest('[data-action="playTimelapse"]');
        if (btnPlayTimelapse) {
            e.preventDefault();
            if (typeof this.startTimelapse === 'function') this.startTimelapse();
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
                showMessage(__('err_canvas_locked') || 'Lienzo bloqueado', 'warning');
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
                showMessage(__('info_template_live') || 'Plantilla en vivo', 'info');
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
        if (this.isSpectator || this.timelapseActive || this.isResetLocked || this.isResizeLocked) return;
        
        if (e.key === 'Escape') {
            if (this.interactionMode !== 'normal') {
                this.cancelInteractionMode();
            }
            if (this.isSelecting) {
                this.isSelecting = false;
                this.selectedPixels.clear();
                this.updateSelectionUI();
                this.requestRender();
            }
            if (this.selectedPixels.size > 0) {
                this.selectedPixels.clear();
                this.updateSelectionUI();
                this.requestRender();
            }
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

        if (typeof this.limitBounds === 'function') this.limitBounds();
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
            let hit = null;
            if (typeof this.checkTemplateHit === 'function') {
                hit = this.checkTemplateHit(exact.x, exact.y);
            }
            
            if (hit) {
                if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                    showMessage(__('err_only_owner_moves') || 'Solo el creador puede moverla', 'warning');
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
                const maxBalance = this.getMaxBalance();
                if (this.selectedPixels.size < maxBalance) {
                    this.selectedPixels.add(key);
                } else {
                    showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance) || 'Límite alcanzado', 'warning');
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
            
            if (typeof this.limitBounds === 'function') this.limitBounds();
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
            
            // Actualizar interfaz lateral (inline-controls) de manera dinámica si es el owner
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

        if (this.isSelecting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                const key = `${coords.x},${coords.y}`;
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
            if (exact && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
                if (typeof this.checkTemplateHit === 'function') {
                    hit = this.checkTemplateHit(exact.x, exact.y);
                }
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
        if (!target || this.isResizeLocked) return;

        // Si son 2 dedos, iniciamos Pinch-to-Zoom
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

        // Si es 1 dedo
        if (e.touches.length === 1) {
            // Permitimos el scroll por defecto a menos que determinemos que estamos arrastrando el canvas o plantillas
            this.touchStartTime = Date.now();
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            const exact = this.getExactBoardCoords(this.touchStartX, this.touchStartY);
            if (exact && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
                let hit = null;
                if (typeof this.checkTemplateHit === 'function') {
                    hit = this.checkTemplateHit(exact.x, exact.y);
                }
                
                if (hit) {
                    e.preventDefault(); // Prevenir scroll nativo
                    if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                        showMessage(__('err_only_owner_moves') || 'Solo el creador puede moverla', 'warning');
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
            
            // Si no hay plantilla, asumimos Drag para desplazar el canvas por defecto
            this.isDragging = true;
            this.touchHasMoved = false;
        }
    },

    handleTouchMove(e) {
        if (this.isResizeLocked) return;

        if (this.isPinching && e.touches.length === 2) {
            e.preventDefault(); // Prevenir scroll/zoom nativo del navegador
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            // Calcular el centro del pinch
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = centerX - rect.left;
            const mouseY = centerY - rect.top;

            const scaleRatio = currentDistance / this.initialPinchDistance;
            let newScale = this.initialScale * scaleRatio;
            newScale = Math.max(0.05, Math.min(newScale, 40));

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
            
            // Umbral mínimo de movimiento para empezar a prevenir el scroll nativo y considerar que se arrastró
            if (!this.touchHasMoved) {
                const totalDist = Math.hypot(e.touches[0].clientX - this.touchStartX, e.touches[0].clientY - this.touchStartY);
                if (totalDist > 8) {
                    this.touchHasMoved = true;
                }
            }

            if (this.touchHasMoved) {
                e.preventDefault(); // Ya estamos arrastrando el canvas, prevenir refresh o scroll del móvil
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
            
            // Detectar Tap (Toque rápido y sin apenas movimiento)
            const touchDuration = Date.now() - this.touchStartTime;
            if (!this.touchHasMoved && touchDuration < 300) {
                // Es un Tap válido. Interpretar como selección de píxel si aplica.
                if (!this.isSpectator && !this.timelapseActive && !this.isResetLocked && !this.isResizeLocked) {
                    const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                    if (coords) {
                        const key = `${coords.x},${coords.y}`;
                        if (this.selectedPixels.has(key)) {
                            this.selectionMode = 'remove';
                            this.selectedPixels.delete(key);
                        } else {
                            this.selectionMode = 'add';
                            const maxBalance = this.getMaxBalance();
                            if (this.selectedPixels.size < maxBalance) {
                                this.selectedPixels.add(key);
                            } else {
                                showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance) || 'Límite alcanzado', 'warning');
                            }
                        }
                        this.updateSelectionUI();
                        
                        // Mostrar las coordenadas tocadas
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

        let maxBalance = this.getMaxBalance();
        
        if (this.interactionMode === 'protecting') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--success');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');
        } else if (this.interactionMode === 'erasing') {
            this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--danger');
            this.btnPlacePixels.classList.replace('component-button--success', 'component-button--danger');
        } else {
            this.btnPlacePixels.classList.replace('component-button--success', 'component-button--primary');
            this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--primary');
        }

        if (this.selectedPixels.size > 0 && this.selectedPixels.size <= maxBalance) {
            this.btnPlacePixels.classList.remove('disabled-interactive');
            if (this.interactionMode === 'protecting') {
                this.txtPlacePixels.textContent = `Proteger (${this.selectedPixels.size})`;
            } else if (this.interactionMode === 'erasing') {
                this.txtPlacePixels.textContent = `Borrar (${this.selectedPixels.size})`;
            } else {
                this.txtPlacePixels.textContent = __('btn_place_pixels') || 'Colocar';
            }
        } else {
            this.btnPlacePixels.classList.add('disabled-interactive');
            if (this.selectedPixels.size > maxBalance) {
                if (this.interactionMode === 'protecting' || this.interactionMode === 'erasing') {
                    this.txtPlacePixels.textContent = `Máx: ${maxBalance} usos`;
                } else {
                    this.txtPlacePixels.textContent = (__('lbl_max_pixels') || ':max máximo').replace(':max', maxBalance === Infinity ? '∞' : maxBalance);
                }
            } else {
                this.txtPlacePixels.textContent = __('btn_select_pixels') || 'Seleccionar Pixeles';
            }
        }
    },

    placePixels() {
        if (this.selectedPixels.size === 0 || this.isSpectator || this.timelapseActive || this.isResetLocked || this.isResizeLocked) return;
        
        let maxBalance = this.getMaxBalance();

        if (this.selectedPixels.size > maxBalance) {
            showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance) || 'Límite superado', 'warning');
            return;
        }

        const paletteObj = getPaletteById(this.canvasPaletteId);
        let colorIndex = 0;
        if (paletteObj && paletteObj.colors) {
            const idx = paletteObj.colors.findIndex(c => c.hex.toLowerCase() === this.currentColor.toLowerCase());
            if (idx !== -1) colorIndex = idx;
        }

        let validPixels = [];
        let hitProtected = false;
        
        this.selectedPixels.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            const offset = (y * this.boardWidth) + x;

            if (this.interactionMode === 'normal' || this.interactionMode === 'protecting') {
                if (this.protectedPixels && this.protectedPixels.has(offset)) {
                    // Píxel protegido. Bloquear acción como un muro.
                    hitProtected = true;
                    return;
                }
            } else if (this.interactionMode === 'erasing') {
                if (this.protectedPixels && !this.protectedPixels.has(offset)) {
                    // No está protegido, ignorar
                    return;
                }
            }
            validPixels.push({ key, x, y, offset });
        });
        
        if (hitProtected) {
            if (!this.lastProtectedToastTime || (Date.now() - this.lastProtectedToastTime > 2000)) {
                showMessage(__('err_pixel_protected') || 'Este píxel está protegido', 'warning');
                this.lastProtectedToastTime = Date.now();
            }
        }

        if (validPixels.length === 0) {
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        validPixels.forEach(p => {
            if (this.interactionMode === 'normal') {
                this.offscreenCtx.fillStyle = this.currentColor;
                this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
            }
            
            if (this.wsManager) {
                let msgType = 'pixel';
                if (this.interactionMode === 'protecting') msgType = 'protect_pixel';
                if (this.interactionMode === 'erasing') msgType = 'erase_pixel';

                this.wsManager.send({
                    type: msgType,
                    x: p.x,
                    y: p.y,
                    color: colorIndex,
                    width: this.boardWidth,
                    userId: window.activeUserId || null 
                });
            }
        });

        if (this.interactionMode === 'normal') {
            if (!this.perkNoCooldown) {
                this.cooldownBalance -= validPixels.length;
            }
            
            if (this.cooldownBalance < this.cooldownMax && this.cooldownNextIn <= 0) {
                this.cooldownNextIn = this.cooldownSec;
                this.lastSyncTime = Date.now();
            }
            showMessage(__('msg_pixels_placed') || 'Pixeles colocados', 'success');
        } else if (this.interactionMode === 'protecting') {
            this.perkProtectionLeft -= validPixels.length;
            showMessage('Protección aplicada', 'success');
        } else if (this.interactionMode === 'erasing') {
            this.perkEraserLeft -= validPixels.length;
            showMessage('Borrador aplicado', 'success');
        }

        this.selectedPixels.clear();
        
        // Return to normal mode if out of uses
        if (this.interactionMode === 'protecting' && this.perkProtectionLeft <= 0) this.cancelInteractionMode();
        if (this.interactionMode === 'erasing' && this.perkEraserLeft <= 0) this.cancelInteractionMode();
        
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    cancelInteractionMode() {
        this.interactionMode = 'normal';
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        showMessage('Modo especial desactivado', 'info');
    },

    handleResize() {
        if (this.isResizeLocked) return;
        if (typeof this.updateCanvasDimensions === 'function') this.updateCanvasDimensions();
        if (typeof this.limitBounds === 'function') this.limitBounds();
        this.requestRender();
    },

    async loadUserPerks() {
        const list = document.querySelector('[data-ref="user-advantages-list"]');
        if (!list) return;

        const emptyState = list.parentNode.querySelector('[data-ref="empty-state-rendered"]');
        const emptyText = emptyState ? emptyState.querySelector('.component-empty-state-text') : null;

        const showEmpty = (msg) => {
            list.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'flex';
                if (emptyText && msg) emptyText.innerText = msg;
            }
        };

        const hideEmpty = () => {
            if (emptyState) emptyState.style.display = 'none';
            list.style.display = 'grid'; // Grid is used for perks
        };

        try {
            const result = await this.api.post('store.get_my_perks', {});
            if (result && result.success) {
                list.innerHTML = '';
                if (result.data.length === 0) {
                    showEmpty('No tienes ventajas disponibles.');
                    return;
                }

                hideEmpty();
                list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
                list.style.gap = '12px';

                result.data.forEach(p => {
                    const el = document.createElement('div');
                    el.className = 'component-item-card component-item-card--perk';
                    
                    const titles = {
                        'no_cooldown_10s': 'Sin Enfriamiento (10s)',
                        'pixel_protection_25': 'Protección de Píxel (25)',
                        'elite_eraser_25': 'Borrador de Élite (25)'
                    };
                    const icons = {
                        'no_cooldown_10s': 'bolt',
                        'pixel_protection_25': 'shield',
                        'elite_eraser_25': 'ink_eraser'
                    };
                    
                    const title = titles[p.perk_id] || p.perk_id;
                    const icon = icons[p.perk_id] || 'stars';
                    const description = p.description || 'Sin descripción';
                    
                    el.innerHTML = `
                        <div class="component-item-card__header">
                            <div class="component-item-card__icon-box">
                                <span class="material-symbols-rounded">${icon}</span>
                            </div>
                            <div class="component-item-card__title">${title}</div>
                        </div>
                        <div class="component-item-card__desc">${description}</div>
                        <div class="component-item-card__actions">
                            <div class="component-badge" style="margin:0; padding: 4px 8px;">Disponible: ${p.amount}</div>
                            <button class="component-button component-button--primary component-button--sm" style="flex: 1;" data-action="activatePerk" data-perk-id="${p.perk_id}">Usar</button>
                        </div>
                    `;
                    list.appendChild(el);
                });
            } else {
                showEmpty(result?.message || 'Error al cargar ventajas.');
            }
        } catch (error) {
            console.error('Error cargando ventajas:', error);
            showEmpty('Error al cargar ventajas.');
        }
    },

    async activatePerk(perkId, btn) {
        if (!perkId) return;

        // Si es Sin Enfriamiento, primero lo "equipamos" para usarlo desde el badge
        if (perkId === 'no_cooldown_10s') {
            this.perkNoCooldownReady = true;
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            if (typeof showMessage === 'function') showMessage('Ventaja equipada. Haz clic en el badge a la izquierda para activarla.', 'info');
            
            // Cerrar menú de ventajas
            const btnClose = document.querySelector('.component-sheet-close[data-action="closeSheet"]');
            if(btnClose) btnClose.click();
            
            return;
        }

        try {
            if (btn) btn.classList.add('loading');
            const result = await this.api.post('store.activate_perk', { perk_id: perkId });
            if (btn) btn.classList.remove('loading');
            
            if (result && result.success) {
                if (typeof showMessage === 'function') showMessage('Ventaja activada exitosamente', 'success');
                
                // Activar localmente
                if (result.perk_id === 'pixel_protection_25') {
                    this.perkProtectionLeft = (this.perkProtectionLeft || 0) + 25;
                    this.interactionMode = 'protecting';
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                    this.updateSelectionUI();
                    showMessage('Modo Protección activado. Selecciona los píxeles a proteger.', 'info');
                } else if (result.perk_id === 'elite_eraser_25') {
                    this.perkEraserLeft = (this.perkEraserLeft || 0) + 25;
                    this.interactionMode = 'erasing';
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                    this.updateSelectionUI();
                    showMessage('Borrador de Élite activado. Selecciona los píxeles a desproteger.', 'info');
                }

                this.loadUserPerks(); // Recargar lista
            } else {
                if (typeof showMessage === 'function') showMessage(result?.message_key || 'Error al activar ventaja', 'error');
            }
        } catch (error) {
            if (btn) btn.classList.remove('loading');
            console.error('Error activating perk', error);
            if (typeof showMessage === 'function') showMessage('Error al conectar con el servidor', 'error');
        }
    },
    
    updatePerkBadges() {
        const badgesLeft = document.querySelector('[data-ref="badges-left"]');
        if (!badgesLeft) return;

        // Badge Sin Cooldown
        let noCdBadge = badgesLeft.querySelector('[data-badge-id="perk-no-cooldown"]');
        if (this.perkNoCooldown || this.perkNoCooldownReady) {
            if (!noCdBadge) {
                noCdBadge = document.createElement('div');
                noCdBadge.className = 'component-badge';
                noCdBadge.setAttribute('data-badge-id', 'perk-no-cooldown');
                noCdBadge.style.cursor = 'pointer';
                noCdBadge.title = 'Haz clic para activar Sin Enfriamiento';
                
                noCdBadge.addEventListener('click', async () => {
                    if (this.perkNoCooldownReady && !this.perkNoCooldown) {
                        try {
                            // Mostrar loading en el badge
                            noCdBadge.innerHTML = `<span class="material-symbols-rounded" style="color:var(--color-primary);">hourglass_empty</span><span>Activando...</span>`;
                            const result = await this.api.post('store.activate_perk', { perk_id: 'no_cooldown_10s' });
                            
                            if (result && result.success) {
                                this.perkNoCooldownReady = false;
                                this.perkNoCooldown = true;
                                this.perkNoCooldownExpires = Date.now() + 10000;
                                if (typeof showMessage === 'function') showMessage('¡Sin Enfriamiento activado por 10s!', 'success');
                                this.updatePerkBadges();
                                this.updateSelectionUI();
                                this.loadUserPerks(); // Recargar lista internamente
                            } else {
                                if (typeof showMessage === 'function') showMessage(result?.message_key || 'Error al activar ventaja', 'error');
                                this.perkNoCooldownReady = false; // Reset si falló
                                this.updatePerkBadges();
                            }
                        } catch (error) {
                            console.error('Error activating perk', error);
                            if (typeof showMessage === 'function') showMessage('Error al conectar con el servidor', 'error');
                            this.perkNoCooldownReady = false; // Reset si falló
                            this.updatePerkBadges();
                        }
                    }
                });
                
                badgesLeft.appendChild(noCdBadge);
            }
            
            // Actualizar estilo según si está activo o solo listo
            if (this.perkNoCooldown) {
                noCdBadge.innerHTML = `<span class="material-symbols-rounded" style="color:var(--color-success);">bolt</span><span>Sin Cooldown</span>`;
                noCdBadge.style.border = '1px solid var(--color-success)';
                noCdBadge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            } else if (this.perkNoCooldownReady) {
                noCdBadge.innerHTML = `<span class="material-symbols-rounded" style="color:var(--color-primary);">bolt</span><span>Activar Sin Cooldown</span>`;
                noCdBadge.style.border = '';
                noCdBadge.style.backgroundColor = '';
            }
        } else if (noCdBadge) {
            noCdBadge.remove();
        }

        // Badge Protección
        let protBadge = badgesLeft.querySelector('[data-badge-id="perk-protection"]');
        if (this.perkProtectionLeft > 0) {
            if (!protBadge) {
                protBadge = document.createElement('div');
                protBadge.className = 'component-badge';
                protBadge.setAttribute('data-badge-id', 'perk-protection');
                protBadge.style.cursor = 'pointer';
                protBadge.title = 'Haz clic para alternar Modo Protección';
                protBadge.addEventListener('click', () => {
                    this.interactionMode = this.interactionMode === 'protecting' ? 'normal' : 'protecting';
                    this.updateSelectionUI();
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                    if (typeof showMessage === 'function') showMessage(this.interactionMode === 'protecting' ? 'Modo Protección activado' : 'Modo Protección desactivado', 'info');
                });
                badgesLeft.appendChild(protBadge);
            }
            protBadge.innerHTML = `<span class="material-symbols-rounded" style="color:var(--color-success);">shield</span><span>Protección: ${this.perkProtectionLeft}</span>`;
            if (this.interactionMode === 'protecting') {
                protBadge.style.border = '1px solid var(--color-success)';
                protBadge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            } else {
                protBadge.style.border = '';
                protBadge.style.backgroundColor = '';
            }
        } else if (protBadge) {
            protBadge.remove();
        }

        // Badge Borrador de Élite
        let eraserBadge = badgesLeft.querySelector('[data-badge-id="perk-eraser"]');
        if (this.perkEraserLeft > 0) {
            if (!eraserBadge) {
                eraserBadge = document.createElement('div');
                eraserBadge.className = 'component-badge';
                eraserBadge.setAttribute('data-badge-id', 'perk-eraser');
                eraserBadge.style.cursor = 'pointer';
                eraserBadge.title = 'Haz clic para alternar Modo Borrador';
                eraserBadge.addEventListener('click', () => {
                    this.interactionMode = this.interactionMode === 'erasing' ? 'normal' : 'erasing';
                    this.updateSelectionUI();
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                    if (typeof showMessage === 'function') showMessage(this.interactionMode === 'erasing' ? 'Modo Borrador activado' : 'Modo Borrador desactivado', 'info');
                });
                badgesLeft.appendChild(eraserBadge);
            }
            
            if (this.interactionMode === 'erasing') {
                eraserBadge.innerHTML = `<span class="material-symbols-rounded" style="color:var(--color-success);">ink_eraser</span><span>Borrador: ${this.perkEraserLeft}</span>`;
                eraserBadge.style.border = '1px solid var(--color-success)';
                eraserBadge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            } else {
                eraserBadge.innerHTML = `<span class="material-symbols-rounded" style="color:var(--color-danger);">ink_eraser</span><span>Borrador: ${this.perkEraserLeft}</span>`;
                eraserBadge.style.border = '';
                eraserBadge.style.backgroundColor = '';
            }
        } else if (eraserBadge) {
            eraserBadge.remove();
        }
    }
};