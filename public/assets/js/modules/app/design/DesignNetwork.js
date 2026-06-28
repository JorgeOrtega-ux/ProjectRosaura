// public/assets/js/modules/app/DesignNetwork.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { WebSocketManager } from '../../../core/api/WebSocketManager.js';
import { getPaletteById } from './utils/DesignPaletteUtils.js';

export const DesignNetwork = {
    async getTurnstileToken() {
        return new Promise((resolve, reject) => {
            const wrapper = document.getElementById('cf-turnstile-wrapper');
            const sitekey = wrapper ? wrapper.dataset.sitekey : null;
            
            if (!sitekey || !window.turnstile) {
                return resolve(null);
            }

            try {
                window.turnstile.render(wrapper, {
                    sitekey: sitekey,
                    callback: function(token) {
                        resolve(token);
                        setTimeout(() => window.turnstile.reset(wrapper), 1000); 
                    },
                    'error-callback': function() {
                        reject(new Error(__('err_turnstile_failed')));
                    }
                });
            } catch (e) {
                resolve(null);
            }
        });
    },

   async initWebSocket() {
        if (!this.canvasIntId) {
            return;
        }

        const uid = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
        let turnstileToken = null;

        if (!uid) {
            try {
                turnstileToken = await this.getTurnstileToken();
            } catch (e) {
                showMessage(__('err_security_validation'), 'error');
                return;
            }
        }

        try {
            const route = ApiRoutes.Canvases?.GetWsTicket || 'canvases.get_ws_ticket';
            const payload = { canvas_id: this.canvasIntId };
            if (turnstileToken) {
                payload['cf-turnstile-response'] = turnstileToken;
            }

            const response = await this.api.post(route, payload, this.abortController.signal);
            if (response.aborted) return;
            
            if (!response.success || !response.data?.ticket) {
                showMessage(response.message, 'error');
                return;
            }

            const wsTicket = response.data.ticket;

            this.wsManager = new WebSocketManager();
            
            this.wsManager.on('open', () => {
                this.wsManager.send({ type: 'init', userId: uid });
            });

            this.wsManager.on('qos_evicted', (reason) => {
                showMessage(reason, 'warning');
            });

            this.wsManager.on('message', (data) => {
                if (data.type === 'pixel') {
                    const pX = parseInt(data.x, 10);
                    const pY = parseInt(data.y, 10);
                    const cIdx = parseInt(data.color, 10);
                    
                    if (cIdx === 255) {
                        this.offscreenCtx.clearRect(pX, pY, 1, 1);
                    } else {
                        const paletteObj = getPaletteById(this.canvasPaletteId);
                        const hexColor = (paletteObj && paletteObj.colors[cIdx]) ? paletteObj.colors[cIdx] : '#000000';
                        
                        this.offscreenCtx.fillStyle = hexColor;
                        this.offscreenCtx.clearRect(pX, pY, 1, 1);
                        this.offscreenCtx.fillRect(pX, pY, 1, 1);
                    }
                    this.requestRender();
                } 
                else if (data.type === 'init_cooldown' || data.type === 'pixel_confirm' || data.type === 'cooldown_error') {
                    this.handleCooldownSync(data);
                }
                else if (data.type === 'canvas_locked') {
                    this.handleCanvasLocked(data);
                } 
                else if (data.type === 'canvas_cleared') {
                    this.handleCanvasCleared(data);
                }
                else if (data.type === 'canvas_locked_error') {
                    showMessage(__('err_canvas_resetting'), 'warning');
                }
                else if (data.type === 'canvas_locked_resize') {
                    this.handleCanvasLockedResize(data);
                }
                else if (data.type === 'canvas_resize_completed') {
                    this.handleCanvasResizeCompleted(data);
                }
                else if (data.type === 'canvas_resize_error') {
                    this.handleCanvasResizeError(data);
                }
                else if (data.type === 'canvas_resize_settings_updated') {
                    this.handleResizeSettingsUpdated(data);
                }
                else if (data.type === 'canvas_reset_settings_updated') {
                    this.handleResetSettingsUpdated(data);
                }
                else if (data.type === 'live_image_updated') {
                    this.handleLiveImageUpdate(data);
                }
                else if (data.type === 'live_session_ended') {
                    this.handleLiveSessionEnded(data);
                }
            });

            this.wsManager.connect(this.canvasIntId, wsTicket);

            this.wsManager.handleReconnect = async () => {
                if (this.wsManager.reconnectAttempts < this.wsManager.maxReconnectAttempts) {
                    const delay = this.wsManager.baseDelay * Math.pow(2, this.wsManager.reconnectAttempts);
                    
                    setTimeout(async () => {
                        this.wsManager.reconnectAttempts++;
                        let newToken = null;
                        if (!uid) {
                            try { newToken = await this.getTurnstileToken(); } catch(e){}
                        }
                        
                        const p = { canvas_id: this.canvasIntId };
                        if (newToken) p['cf-turnstile-response'] = newToken;

                        const res = await this.api.post(route, p, this.abortController.signal);
                        if (res.aborted) return;
                        
                        if (res.success && res.data?.ticket) {
                            this.wsManager.connect(this.canvasIntId, res.data.ticket);
                        } else {
                            this.wsManager.handleReconnect();
                        }
                    }, delay);
                } else {
                    showMessage(__('err_disconnected_retries'), 'error');
                }
            };

        } catch (error) {
            showMessage(__('err_ws_init'), 'error');
        }
    },

    handleResizeSettingsUpdated(data) {
        if (data.is_active) {
            this.resizeActive = true;
            this.nextResizeAt = data.next_resize_at;
            this.resizeTimerAction = data.timer_action;
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
            this.timerAction = data.timer_action;
            
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
            this.canvas.classList.add('disabled-interactive');
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
                    this.canvas.classList.remove('disabled-interactive');
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
                this.boardWidth = data.new_size;
                this.boardHeight = data.new_size;
                
                const wrapper = document.querySelector('[data-ref="design-wrapper"]');
                if (wrapper) wrapper.setAttribute('data-size', data.new_size);

                this.setupCanvas();
                this.centerBoard();

                this.isPrivateBlocked = false;
                const role = response.data.role || 'spectator';
                this.isSpectator = !(role === 'admin' || role === 'editor');
                this.setRoleUI(role, response.data);

                if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
            }
        } catch (error) {
        }

        this.isResizeLocked = false;
        
        if (this.canvas && !this.isPrivateBlocked) {
            this.canvas.classList.remove('component-canvas-blur');
            this.canvas.classList.remove('disabled-interactive');
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
            this.canvas.classList.remove('disabled-interactive');
        }

        this.updateLockBadges(); 
        showMessage(data.error, 'error');
    },

    async startLiveShare() {
        if (!this.activeTemplateId) {
            showMessage(__('err_select_template'), 'warning');
            return;
        }

        const btn = document.querySelector('[data-action="startLiveShare"]');
        if (btn) setButtonLoading(btn);

        try {
            const route = ApiRoutes.Canvases?.CreateLiveShare || 'canvas/live-share/create';
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            
            const response = await this.api.post(route, { 
                canvas_id: this.canvasIntId,
                img_url: tpl.img.src,
                x: tpl.x,
                y: tpl.y,
                w: tpl.w,
                h: tpl.h,
                opacity: tpl.opacity || 1
            }, this.abortController.signal);
            
            if (response.aborted) return;

            if (response.success && response.data?.code) {
                this.liveShareStatus = 'owner';
                this.liveShareCode = response.data.code;
                this.liveTemplateId = this.activeTemplateId;
                
                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });
                }

                if (btn) btn.classList.add('disabled');
                if (this.uiLiveControls) this.uiLiveControls.classList.remove('disabled');
                if (this.uiLiveCode) this.uiLiveCode.textContent = this.liveShareCode;
                
                if (this.uiLiveInputX) this.uiLiveInputX.value = tpl.x;
                if (this.uiLiveInputY) this.uiLiveInputY.value = tpl.y;
                if (this.uiLiveInputOpacity) this.uiLiveInputOpacity.value = tpl.opacity || 1;

                showMessage(__('msg_broadcasting').replace(':code', this.liveShareCode), 'success');
            } else {
                showMessage(__('err_live_code_gen'), 'error');
            }
        } catch (error) {
            showMessage(__('err_server_live_start'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    },

    stopLiveShare() {
        if (this.liveShareStatus !== 'owner') return;
        
        if (this.wsManager && this.liveShareCode) {
            this.wsManager.send({ type: 'end_live_share', code: this.liveShareCode });
        }

        this.liveShareStatus = 'none';
        this.liveShareCode = null;
        this.liveTemplateId = null;

        const btn = document.querySelector('[data-action="startLiveShare"]');
        if (btn) btn.classList.remove('disabled');
        if (this.uiLiveControls) this.uiLiveControls.classList.add('disabled');

        showMessage(__('msg_broadcast_stopped'), 'info');
    },

    async joinLiveImageSession(code) {
        if (!code) return;
        
        const btn = document.querySelector('[data-action="joinLiveShare"]');
        if (btn) setButtonLoading(btn);

        try {
            const route = ApiRoutes.Canvases?.JoinLiveShare || 'canvases.join_live_share';
            
            const response = await this.api.post(route, { 
                code: code,
                canvas_id: this.canvasIntId 
            }, this.abortController.signal);
            
            if (response.aborted) return;

            if (response.success && response.data) {
                this.liveShareStatus = 'spectator';
                this.liveShareCode = code;
                
                const liveId = `live_tpl_${code}`;
                this.liveTemplateId = liveId;

                let tpl = this.templates.find(t => t.id === liveId);
                if (!tpl) {
                    const img = new Image();
                    img.src = response.data.img_url;
                    
                    await new Promise((resolve) => {
                        img.onload = () => {
                            this.templates.push({
                                id: liveId,
                                img: img,
                                x: parseInt(response.data.x) || 0,
                                y: parseInt(response.data.y) || 0,
                                w: parseInt(response.data.w) || img.width,
                                h: parseInt(response.data.h) || img.height,
                                opacity: parseFloat(response.data.opacity) || 1,
                                locked: true, 
                                url: img.src
                            });
                            this.activeTemplateId = liveId;
                            resolve();
                        };
                        img.onerror = resolve; 
                    });
                }

                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });
                }

                showMessage(__('msg_joined_broadcast').replace(':code', code), 'success');
                this.requestRender();

            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            showMessage(__('err_join_session'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    },
    
    emitLiveImageUpdate() {
        if (this.liveShareStatus !== 'owner' || !this.liveShareCode || !this.wsManager) return;
        
        const tpl = this.templates.find(t => t.id === this.liveTemplateId);
        if (!tpl) return;

        this.wsManager.send({
            type: 'update_live_share',
            code: this.liveShareCode,
            x: tpl.x,
            y: tpl.y,
            w: tpl.w,
            h: tpl.h,
            opacity: tpl.opacity || 1
        });
    },

    handleLiveImageUpdate(data) {
        if (this.liveShareStatus === 'spectator' && this.liveShareCode === data.code) {
            const tpl = this.templates.find(t => t.id === this.liveTemplateId);
            if (tpl) {
                tpl.x = data.x;
                tpl.y = data.y;
                tpl.w = data.w;
                tpl.h = data.h;
                tpl.opacity = data.opacity !== undefined ? data.opacity : 1;
                this.requestRender();
            }
        }
    },

    handleLiveSessionEnded(data) {
        if (this.liveShareStatus === 'spectator' && this.liveShareCode === data.code) {
            showMessage(__('info_live_ended'), 'info');
            this.liveShareStatus = 'none';
            this.liveShareCode = null;
            
            this.templates = this.templates.filter(t => t.id !== this.liveTemplateId);
            this.activeTemplateId = null;
            this.liveTemplateId = null;
            
            this.requestRender();
        }
    },

    handleCooldownSync(data) {
        if (this.isSpectator) {
            return;
        }

        this.cooldownBalance = data.balance;
        this.cooldownMax = data.max_batch;
        this.cooldownSec = data.cooldown_sec;
        this.cooldownNextIn = data.next_replenish_in;
        this.lastSyncTime = Date.now();
        
        if (data.type === 'cooldown_error') {
            showMessage(__('err_sync_limit'), 'warning');
        }
        
        this.updateSelectionUI();
    },

    handleCanvasLocked(data) {
        this.isResetLocked = true;
        this.updateLockBadges(); 
        
        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();
    },
    
    handleCanvasCleared(data) {
        this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();
        
        this.isResetLocked = false;
        this.updateLockBadges(); 
        
        showMessage(__('info_canvas_cleared'), 'info');
        
        if (data.next_reset_at) {
            this.nextResetAt = data.next_reset_at;
            this.startResetTimer();
        }
    },

    async checkCanvasAccess() {
        if (!this.canvasIntId || this.canvasIntId === '0') return;

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
            if (response.aborted) return;
            
            if (response.success && response.data) {
                this.isPrivateBlocked = false;
                const role = response.data.role || 'spectator';
                
                if (role === 'admin' || role === 'editor') {
                    this.isSpectator = false;
                } else {
                    this.isSpectator = true;
                }
                
                this.setRoleUI(role, response.data);

                if (response.data.state_base64) {
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

        this.updateLockBadges(); 

        if (role === 'blocked') {
            if (this.canvas) {
                this.canvas.classList.add('component-canvas-blocked');
                this.canvas.classList.add('disabled-interactive');
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
            if (privBadge) privBadge.classList.remove('disabled');

            if (this.canvasApproval) {
                if (btnJoin) btnJoin.classList.add('disabled');
                if (btnRequest) btnRequest.classList.remove('disabled');
            } else {
                if (btnJoin) btnJoin.classList.remove('disabled');
                if (btnRequest) btnRequest.classList.add('disabled');
            }
        } else {
            if (this.canvas) {
                this.canvas.classList.remove('component-canvas-blocked');
                this.canvas.classList.remove('disabled-interactive');
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
                if (privBadge) privBadge.classList.add('disabled');

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
            }
        }
    },

    async handleAccessRequest(btn) {
        if (!this.canvasIntId) return;
        setButtonLoading(btn);

        const response = await this.api.post(ApiRoutes.Canvases.RequestAccess, { canvas_id: this.canvasIntId }, this.abortController.signal);
        if (response.aborted) return;
        
        restoreButton(btn);

        if (response.success) {
            showMessage(response.message, 'success');
            
            if (response.message.toLowerCase().includes('unido')) {
                setTimeout(() => window.location.reload(), 1000);
            } else {
                btn.classList.add('disabled-interactive');
                btn.innerHTML = `<span class="material-symbols-rounded">hourglass_empty</span> ${__('btn_pending')}`;
            }
        } else {
            showMessage(response.message, 'error');
        }
    },

    async startTimelapse() {
        if (!this.canvasIntId || this.timelapseActive || this.isResetLocked || this.isResizeLocked) return;
        this.timelapseActive = true;
        
        const route = ApiRoutes.Canvases?.GetTimelapse || 'canvas/get_timelapse';

        this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();

        try {
            const response = await this.api.stream(route, { id: this.canvasIntId }, this.abortController.signal);
            if (response.aborted) return;
            
            if (!response.success) {
                showMessage(response.message, 'error');
                this.timelapseActive = false;
                this.checkCanvasAccess(); 
                return;
            }

            const reader = response.reader;
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                if (this.isResetLocked || this.isResizeLocked) break;

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    try {
                        const event = JSON.parse(line);
                        this._drawTimelapsePixel(event);
                    } catch (e) {
                    }
                }
                
                this.requestRender();
                await new Promise(resolve => requestAnimationFrame(resolve)); 
            }
            
            if (buffer.trim() && !this.isResetLocked && !this.isResizeLocked) {
                try {
                    const event = JSON.parse(buffer);
                    this._drawTimelapsePixel(event);
                    this.requestRender();
                } catch(e) {}
            }

            if (!this.isResetLocked && !this.isResizeLocked) showMessage(__('msg_timelapse_ended'), 'success');

        } catch (err) {
            if (err.name !== 'AbortError') {
                showMessage(__('err_timelapse_play'), 'error');
                this.checkCanvasAccess();
            }
        } finally {
            this.timelapseActive = false;
        }
    },

    _drawTimelapsePixel(data) {
        const pX = parseInt(data.x, 10);
        const pY = parseInt(data.y, 10);
        const cIdx = parseInt(data.c, 10);

        if (cIdx === 255) {
            this.offscreenCtx.clearRect(pX, pY, 1, 1);
        } else {
            const paletteObj = getPaletteById(this.canvasPaletteId);
            const hexColor = (paletteObj && paletteObj.colors[cIdx]) ? paletteObj.colors[cIdx] : '#000000';
            
            this.offscreenCtx.fillStyle = hexColor;
            this.offscreenCtx.clearRect(pX, pY, 1, 1);
            this.offscreenCtx.fillRect(pX, pY, 1, 1);
        }
    }
};