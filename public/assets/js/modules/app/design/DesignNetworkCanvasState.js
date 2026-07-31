import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

export const DesignNetworkCanvasState = {
    handleResizeSettingsUpdated(data) {
        if (data.is_active) {
            this.resizeActive = true;
            this.nextResizeAt = data.next_resize_at;
            this.resizeTargetSize = data.target_size;
            
            if (typeof this.startResizeTimer === 'function') {
                this.startResizeTimer();
            }
        } else {
            this.resizeActive = false;
            this.nextResizeAt = null;
            
            if (this.resizeTimerInterval) {
                clearInterval(this.resizeTimerInterval);
                this.resizeTimerInterval = null;
            }
            
            this.removeCanvasBadge('resize-timer', 'right'); 
        }
    },

    handleResetSettingsUpdated(data) {
        if (data.is_active) {
            this.resetActive = true;
            this.nextResetAt = data.next_reset_at;
            
            if (typeof this.startResetTimer === 'function') {
                this.startResetTimer();
            }
        } else {
            this.resetActive = false;
            this.nextResetAt = null;
            
            if (this.resetTimerInterval) {
                clearInterval(this.resetTimerInterval);
                this.resetTimerInterval = null;
            }
            
            this.removeCanvasBadge('reset-timer', 'right'); 
        }
    },

    handleCanvasLockedResize(data) {
        this.isResizeLocked = true;
        
        if (this.canvas) {
            this.canvas.classList.add('component-canvas-blur');
        }

        this.updateLockBadges(); 
        
        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();
        
        showMessage(__('info_expanding_canvas'), 'warning');

        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            if (this.isResizeLocked) {
                this.isResizeLocked = false;
                if (this.canvas) {
                    this.canvas.classList.remove('component-canvas-blur');
                }
                this.updateLockBadges();
                showMessage(__('err_server_timeout'), 'error');
            }
        }, 45000); 
    },

    async handleCanvasResizeCompleted(data) {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
            if (response.aborted) return;

            if (response.success && response.data) {
                const rawSize = String(data?.new_size || response.data.size || '');
                if (rawSize) {
                    const parts = rawSize.toLowerCase().split('x');
                    this.boardWidth = parseInt(parts[0], 10);
                    this.boardHeight = parts.length > 1 ? parseInt(parts[1], 10) : this.boardWidth;
                }
                if (isNaN(this.boardWidth) || this.boardWidth <= 0) this.boardWidth = 64;
                if (isNaN(this.boardHeight) || this.boardHeight <= 0) this.boardHeight = 64;
                
                const wrapper = document.querySelector('[data-ref="design-wrapper"]');
                if (wrapper) wrapper.setAttribute('data-size', `${this.boardWidth}x${this.boardHeight}`);

                this.setupCanvas();
                this.centerBoard();

                this.isPrivateBlocked = false;
                const role = response.data.role || 'spectator';
                this.isSpectator = !(role === 'admin' || role === 'editor');
                this.setRoleUI(role, response.data);

                if (this.loadedChunks) {
                    this.loadedChunks.clear();
                }
                if (typeof this.initCanvasData === 'function') {
                    this.initCanvasData(response.data, true);
                } else if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
            }
        } catch (error) {
        }

        this.isResizeLocked = false;
        
        if (this.canvas && !this.isPrivateBlocked) {
            this.canvas.classList.remove('component-canvas-blur');
        }
        
        this.updateLockBadges();
        this.requestRender();

        showMessage(__('msg_expansion_success'), 'success');
    },

    handleCanvasResizeError(data) {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);

        this.isResizeLocked = false;
        
        if (this.canvas) {
            this.canvas.classList.remove('component-canvas-blur');
        }

        this.updateLockBadges(); 
        showMessage(data.error, 'error');
    },

    handleCanvasLockedClear(data) {
        this.isClearLocked = true;

        if (this.canvas) {
            this.canvas.classList.add('component-canvas-blur');
        }

        this.updateLockBadges();

        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();

        if (this.clearTimeout) clearTimeout(this.clearTimeout);
        this.clearTimeout = setTimeout(() => {
            if (this.isClearLocked) {
                this.isClearLocked = false;
                if (this.canvas) {
                    this.canvas.classList.remove('component-canvas-blur');
                }
                this.updateLockBadges();
            }
        }, 15000);
    },

    async handleCanvasClearCompleted(data) {
        if (this.clearTimeout) clearTimeout(this.clearTimeout);

        // 1. Clear area on worker & offscreenCtx immediately
        if (data.x1 !== undefined && data.y1 !== undefined && data.x2 !== undefined && data.y2 !== undefined) {
            const x1 = parseInt(data.x1, 10);
            const y1 = parseInt(data.y1, 10);
            const x2 = parseInt(data.x2, 10);
            const y2 = parseInt(data.y2, 10);

            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'CLEAR_AREA',
                    payload: { x1, y1, x2, y2 }
                });
            }

            if (this.offscreenCtx) {
                const w = Math.max(1, x2 - x1 + 1);
                const h = Math.max(1, y2 - y1 + 1);
                this.offscreenCtx.clearRect(x1, y1, w, h);
            }
        }

        // 2. Re-fetch full canvas state to guarantee 100% data sync across all clients
        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
            if (!response.aborted && response.success && response.data) {
                if (this.loadedChunks) {
                    this.loadedChunks.clear();
                }
                if (typeof this.initCanvasData === 'function') {
                    this.initCanvasData(response.data, true);
                } else if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
            }
        } catch (error) {}

        this.isClearLocked = false;

        if (this.canvas && !this.isPrivateBlocked) {
            this.canvas.classList.remove('component-canvas-blur');
        }

        this.updateLockBadges();
        this.requestRender();

        showMessage('Zona vaciada con éxito', 'success');
    },

    async checkCanvasAccess() {
        if (!this.canvasIntId || this.canvasIntId === '0') return;

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
            if (response.aborted) return;
            
            const isPremiumLocked = response.locked_requires_downgrade || (response.data && response.data.locked_requires_downgrade);
            if (isPremiumLocked && response.data) {
                this.isSubscriptionLocked = true;
                this.isPrivateBlocked = false;
                this.isSpectator = true;
                this.setRoleUI('premium_locked', response.data);
                
                if (typeof this.initCanvasData === 'function') {
                    this.initCanvasData(response.data);
                } else if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
                return;
            } else if (isPremiumLocked) {
                this.isSubscriptionLocked = true;
                this.isPrivateBlocked = true;
                this.setRoleUI('blocked');
                return;
            }

            if (response.success && response.data) {
                this.isSubscriptionLocked = false;
                this.isPrivateBlocked = false;
                const role = response.data.role || 'spectator';
                
                if (role === 'admin' || role === 'editor') {
                    this.isSpectator = false;
                } else {
                    this.isSpectator = true;
                }
                
                this.setRoleUI(role, response.data);

                if (typeof this.initCanvasData === 'function') {
                    this.initCanvasData(response.data);
                } else if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }

            } else {
                this.isSpectator = true;
                if (this.canvasPrivacy === 'private') {
                    this.isPrivateBlocked = true;
                    this.setRoleUI('blocked');
                } else {
                    this.setRoleUI('spectator');
                }
            }
        } catch (error) {
            this.isSpectator = true;
            this.setRoleUI(this.canvasPrivacy === 'private' ? 'blocked' : 'spectator');
        }
    },

    setRoleUI(role, data = null) {
        const specControls = document.querySelector('[data-ref="spectator-controls"]');
        const designTools = document.querySelector('[data-ref="design-tools-actions"]');
        const actionPill = document.querySelector('.component-action-pill'); 
        
        const btnJoin = document.querySelector('[data-ref="btn-join-direct"]');
        const btnRequest = document.querySelector('[data-ref="btn-request-access"]');
        
        const specBadge = document.querySelector('[data-ref="spectator-status-badge"]');
        const privBadge = document.querySelector('[data-ref="private-status-badge"]');
        const premBadge = document.querySelector('[data-ref="premium-status-badge"]');
        const cooldownBadge = document.querySelector('[data-ref="cooldown-badge"]');

        this.updateLockBadges(); 

        if (role === 'blocked') {
            if (this.canvas) {
                this.canvas.classList.add('component-canvas-blocked');
                this.canvas.classList.add('disabled-interaction');
            }

            if (specControls) {
                specControls.classList.remove('disabled');
                specControls.classList.add('active');
            }
            
            if (designTools) {
                designTools.classList.replace('active', 'disabled');
            }
            if (actionPill) actionPill.classList.add('disabled');

            if (specBadge) specBadge.classList.add('disabled');
            if (cooldownBadge) cooldownBadge.classList.add('disabled');
            if (this.isSubscriptionLocked) {
                if (privBadge) privBadge.classList.add('disabled');
                if (premBadge) premBadge.classList.remove('disabled');
                if (btnJoin) btnJoin.classList.add('disabled');
                if (btnRequest) btnRequest.classList.add('disabled');
            } else {
                if (premBadge) premBadge.classList.add('disabled');
                if (privBadge) privBadge.classList.remove('disabled');
                
                if (this.canvasApproval) {
                    if (btnJoin) btnJoin.classList.add('disabled');
                    if (btnRequest) btnRequest.classList.remove('disabled');
                } else {
                    if (btnJoin) btnJoin.classList.remove('disabled');
                    if (btnRequest) btnRequest.classList.add('disabled');
                }
            }
        } else if (role === 'premium_locked') {
            if (this.canvas) {
                this.canvas.classList.remove('component-canvas-blocked');
                this.canvas.classList.remove('disabled-interaction');
            }

            if (specControls) {
                specControls.classList.remove('disabled');
                specControls.classList.add('active');
            }
            
            if (designTools) {
                designTools.classList.replace('active', 'disabled');
            }
            if (actionPill) actionPill.classList.add('disabled');

            if (specBadge) specBadge.classList.add('disabled');
            if (cooldownBadge) cooldownBadge.classList.add('disabled');
            if (privBadge) privBadge.classList.add('disabled');
            if (premBadge) premBadge.classList.remove('disabled');

            if (btnJoin) btnJoin.classList.add('disabled');
            if (btnRequest) btnRequest.classList.add('disabled');
        } else {
            if (this.canvas) {
                this.canvas.classList.remove('component-canvas-blocked');
                this.canvas.classList.remove('disabled-interaction');
            }

            if (role === 'spectator') {
                if (specControls) {
                    specControls.classList.remove('disabled');
                    specControls.classList.add('active');
                }
                if (designTools) {
                    designTools.classList.replace('active', 'disabled');
                }
                if (actionPill) actionPill.classList.add('disabled');
                
                if (specBadge) specBadge.classList.remove('disabled');
                if (cooldownBadge) cooldownBadge.classList.add('disabled');
                if (privBadge) privBadge.classList.add('disabled');
                if (premBadge) premBadge.classList.add('disabled');

                if (this.canvasApproval) {
                    if (btnJoin) btnJoin.classList.add('disabled');
                    if (btnRequest) btnRequest.classList.remove('disabled');
                } else {
                    if (btnJoin) btnJoin.classList.remove('disabled');
                    if (btnRequest) btnRequest.classList.add('disabled');
                }
            } 
            else if (role === 'editor' || role === 'admin') {
                if (specControls) {
                    specControls.classList.add('disabled');
                    specControls.classList.remove('active');
                }
                if (designTools) {
                    designTools.classList.replace('disabled', 'active');
                }
                if (actionPill) actionPill.classList.remove('disabled');
                if (cooldownBadge) cooldownBadge.classList.remove('disabled');
                if (specBadge) specBadge.classList.add('disabled');
            }
        }
    },

    async handleAccessRequest(btn) {
        if (!this.canvasIntId) return;

        if (window.modalSystem) {
            const res = await window.modalSystem.show('joinCanvasTerms');
            if (!res.confirmed) {
                return;
            }
        }

        setButtonLoading(btn);

        const response = await this.api.post(ApiRoutes.Canvases.RequestAccess, { canvas_id: this.canvasIntId, terms_accepted: true }, this.abortController.signal);
        if (response.aborted) return;
        
        restoreButton(btn);

        if (response.success) {
            showMessage(response.message, 'success');
            
            if (response.joined || response.message.toLowerCase().includes('unido')) {
                this.checkCanvasAccess();
            } else {
                btn.classList.add('disabled-interaction');
                btn.innerHTML = `<span class="material-symbols-rounded">hourglass_empty</span> ${__('btn_pending')}`;
            }
        } else {
            showMessage(response.message, 'error');
        }
    },

    handleCanvasLocked(data) {
        this.isResetLocked = true;
        this.updateLockBadges(); 
        
        this.selectedPixels.clear();
        this.updateSelectionUI();
        
        this.hasPlayedResetAnimation = true;
        if (this.renderWorker) {
            this.renderWorker.postMessage({ type: 'DRAW_IMAGE_BUFFER', payload: { imageBitmap: null } });
        } else if (this.offscreenCtx) {
            this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        }
        
        this.requestRender();
    },
    
    handleCanvasCleared(data) {
        if (!this.hasPlayedResetAnimation) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({ type: 'DRAW_IMAGE_BUFFER', payload: { imageBitmap: null } });
            } else if (this.offscreenCtx) {
                this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
            }
        }
        this.hasPlayedResetAnimation = false;
        this.requestRender();
        
        this.isResetLocked = false;
        this.updateLockBadges(); 
        
        showMessage(__('info_canvas_cleared'), 'info');
        
        if (data.next_reset_at) {
            this.nextResetAt = data.next_reset_at;
            this.startResetTimer();
        }
    },

    handleExpansionBadge(data) {
        let container = document.querySelector('[data-ref="badges-left"]');
        if (!container) {
            container = document.createElement('div');
            container.className = 'canvas-badges-left';
            container.setAttribute('data-ref', 'badges-left');
            document.body.appendChild(container);
        }

        const oldSizeStr = data.old_size || `${this.boardWidth}x${this.boardHeight}`;
        const newSizeStr = data.new_size || `${data.w}x${data.h}`;
        const labelText = (typeof window.__ === 'function' ? window.__('msg_expansion_success') : null) || 'Lienzo expandido';

        const badge = document.createElement('div');
        badge.className = 'component-badge';
        badge.style.backgroundColor = 'rgba(99, 102, 241, 0.9)';
        badge.style.color = '#ffffff';
        badge.style.border = '1px solid var(--color-primary, #6366f1)';
        badge.innerHTML = `<span class="material-symbols-rounded">aspect_ratio</span><span >${labelText}: ${oldSizeStr} ➔ ${newSizeStr}</span>`;

        container.appendChild(badge);
        setTimeout(() => {
            badge.style.opacity = '0';
            badge.style.transition = 'opacity 0.3s ease';
            setTimeout(() => badge.remove(), 300);
        }, 4000);
    },

    handleResetBadge() {
        let container = document.querySelector('[data-ref="badges-left"]');
        if (!container) {
            container = document.createElement('div');
            container.className = 'canvas-badges-left';
            container.setAttribute('data-ref', 'badges-left');
            document.body.appendChild(container);
        }

        const badge = document.createElement('div');
        badge.className = 'component-badge component-badge--warning';
        badge.innerHTML = `<span class="material-symbols-rounded">restart_alt</span><span >Lienzo vaciado</span>`;

        container.appendChild(badge);
        setTimeout(() => {
            badge.style.opacity = '0';
            badge.style.transition = 'opacity 0.3s ease';
            setTimeout(() => badge.remove(), 300);
        }, 3500);
    },

    updateFreezeUI() {
        if (typeof this.updateLockBadges === 'function') {
            this.updateLockBadges();
        }
        if (typeof this.updatePerkBadges === 'function') {
            this.updatePerkBadges();
        }
        this.requestRender();
    }
};
