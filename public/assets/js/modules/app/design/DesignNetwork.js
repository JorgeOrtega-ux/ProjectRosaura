import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { WebSocketManager } from '../../../core/api/WebSocketManager.js';
import { getPaletteById } from './utils/DesignPaletteUtils.js';

export const DesignNetwork = {
    async getTurnstileToken() {
        return new Promise(async (resolve, reject) => {
            const wrapper = document.querySelector('[data-ref="turnstile-container"]');
            const sitekey = wrapper ? wrapper.dataset.sitekey : null;
            
            if (!sitekey) {
                return resolve(null);
            }

            let attempts = 0;
            while (typeof turnstile === 'undefined' && attempts < 30) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (typeof turnstile === 'undefined') {
                
                return resolve(null);
            }

            try {
                
                if (wrapper.hasChildNodes()) {
                    wrapper.innerHTML = '';
                }

                turnstile.render(wrapper, {
                    sitekey: sitekey,
                    callback: function(token) {
                        resolve(token);
                        setTimeout(() => turnstile.reset(wrapper), 1000); 
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
                if (this.isInfinite && this.chunks) {
                    // Flush pending chunks (requested but never received) so they get re-requested
                    for (const [key, value] of this.chunks) {
                        if (value === null) {
                            this.chunks.delete(key);
                        }
                    }
                }
                if (typeof this.requestChunksForViewport === 'function') {
                    this.requestChunksForViewport();
                }
            });

            this.wsManager.on('qos_evicted', (reason) => {
                showMessage(reason, 'warning');
            });

            this.wsManager.on('message', (data) => {
                if (data.type === 'pixel') {
                    const pX = parseInt(data.x, 10);
                    const pY = parseInt(data.y, 10);
                    const colorData = data.color;
                    
                    if (this.isInfinite) {
                        const chunkX = Math.floor(pX / 512);
                        const chunkY = Math.floor(pY / 512);
                        const chunkKey = `${chunkX},${chunkY}`;
                        let chunkCanvas = this.chunks.get(chunkKey);
                        if (!chunkCanvas) {
                            chunkCanvas = document.createElement('canvas');
                            chunkCanvas.width = 512;
                            chunkCanvas.height = 512;
                            this.chunks.set(chunkKey, chunkCanvas);
                        }
                        const chunkCtx = chunkCanvas.getContext('2d');
                        const localX = ((pX % 512) + 512) % 512;
                        const localY = ((pY % 512) + 512) % 512;
                        if (colorData === 'transparent' || colorData === 255) {
                            chunkCtx.clearRect(localX, localY, 1, 1);
                        } else {
                            chunkCtx.fillStyle = colorData;
                            chunkCtx.clearRect(localX, localY, 1, 1);
                            chunkCtx.fillRect(localX, localY, 1, 1);
                        }
                    } else {
                        if (colorData === 'transparent' || colorData === 255) {
                            this.offscreenCtx.clearRect(pX, pY, 1, 1);
                        } else {
                            this.offscreenCtx.fillStyle = colorData;
                            this.offscreenCtx.clearRect(pX, pY, 1, 1);
                            this.offscreenCtx.fillRect(pX, pY, 1, 1);
                        }
                    }
                    this.requestRender();
                } 
                else if (data.type === 'nuclear_warning') {
                    if (typeof this.handleNuclearWarning === 'function') {
                        this.handleNuclearWarning(data);
                    }
                }
                else if (data.type === 'bomb_pixel') {
                    const cX = parseInt(data.x, 10);
                    const cY = parseInt(data.y, 10);
                    const r = parseInt(data.r, 10);
                    const perkId = data.perk || 'pixel_misil_1';
                    
                    if (typeof this.triggerExplosionEffect === 'function') {
                        this.triggerExplosionEffect(cX, cY, r, perkId);
                    }
                    
                    for (let y = cY - r; y <= cY + r; y++) {
                        const dy = y - cY;
                        const dx = Math.floor(Math.sqrt(r * r - dy * dy));
                        const startX = cX - dx;
                        const endX = cX + dx;
                        const width = endX - startX + 1;

                        if (this.isInfinite) {
                            let currentX = startX;
                            while (currentX <= endX) {
                                const chunkX = Math.floor(currentX / 512);
                                const chunkY = Math.floor(y / 512);
                                const chunkKey = `${chunkX},${chunkY}`;
                                const chunkCanvas = this.chunks.get(chunkKey);
                                
                                const nextChunkBoundaryX = (chunkX + 1) * 512;
                                const drawEndX = Math.min(endX, nextChunkBoundaryX - 1);
                                const drawWidth = drawEndX - currentX + 1;
                                
                                if (chunkCanvas) {
                                    const chunkCtx = chunkCanvas.getContext('2d');
                                    const localX = ((currentX % 512) + 512) % 512;
                                    const localY = ((y % 512) + 512) % 512;
                                    chunkCtx.clearRect(localX, localY, drawWidth, 1);
                                }
                                
                                currentX = drawEndX + 1;
                            }
                        } else {
                            this.offscreenCtx.clearRect(startX, y, width, 1);
                        }
                    }
                    this.requestRender();
                }
                else if (data.type === 'chunk_data') {
                    if (typeof this.hydrateChunk === 'function') {
                        this.hydrateChunk(data.chunk_x, data.chunk_y, data.state_base64);
                    }
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
                else if (data.type === 'init_protected_pixels') {
                    this.protectedPixels = new Set(data.offsets);
                }
                else if (data.type === 'pixel_protected_broadcast') {
                    if (!this.protectedPixels) this.protectedPixels = new Set();
                    this.protectedPixels.add(data.offset);
                }
                else if (data.type === 'pixel_unprotected_broadcast') {
                    if (!this.protectedPixels) this.protectedPixels = new Set();
                    this.protectedPixels.delete(data.offset);
                }
                else if (data.type === 'pixel_protected_error') {
                    
                    if (!this.lastProtectedToastTime || (Date.now() - this.lastProtectedToastTime > 2000)) {
                        showMessage(data.message || 'Este píxel está protegido', 'warning');
                        this.lastProtectedToastTime = Date.now();
                    }

                    if (data.balance !== undefined) {
                        this.handleCooldownSync(data);
                    }

                    if (data.x !== undefined && data.y !== undefined && data.color !== undefined) {
                        const pX = parseInt(data.x, 10);
                        const pY = parseInt(data.y, 10);
                        const colorData = data.color;
                        
                        if (this.isInfinite) {
                            const chunkX = Math.floor(pX / 512);
                            const chunkY = Math.floor(pY / 512);
                            const chunkKey = `${chunkX},${chunkY}`;
                            let chunkCanvas = this.chunks.get(chunkKey);
                            if (!chunkCanvas) {
                                chunkCanvas = document.createElement('canvas');
                                chunkCanvas.width = 512;
                                chunkCanvas.height = 512;
                                this.chunks.set(chunkKey, chunkCanvas);
                            }
                            const chunkCtx = chunkCanvas.getContext('2d');
                            const localX = ((pX % 512) + 512) % 512;
                            const localY = ((pY % 512) + 512) % 512;
                            if (colorData === 'transparent' || colorData === 255) {
                                chunkCtx.clearRect(localX, localY, 1, 1);
                            } else {
                                chunkCtx.fillStyle = colorData;
                                chunkCtx.clearRect(localX, localY, 1, 1);
                                chunkCtx.fillRect(localX, localY, 1, 1);
                            }
                        } else {
                            if (colorData === 'transparent' || colorData === 255) {
                                this.offscreenCtx.clearRect(pX, pY, 1, 1);
                            } else {
                                this.offscreenCtx.fillStyle = colorData;
                                this.offscreenCtx.clearRect(pX, pY, 1, 1);
                                this.offscreenCtx.fillRect(pX, pY, 1, 1);
                            }
                        }
                        this.requestRender();
                    }
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
                else if (data.type === 'canvas_locked_plazmar') {
                    this.handleCanvasLockedPlazmar(data);
                }
                else if (data.type === 'canvas_plazmar_completed') {
                    this.handleCanvasPlazmarCompleted(data);
                }
                else if (data.type === 'canvas_plazmar_error') {
                    this.handleCanvasPlazmarError(data);
                }
                else if (data.type === 'canvas_resize_settings_updated') {
                    this.handleResizeSettingsUpdated(data);
                }
                else if (data.type === 'canvas_reset_settings_updated') {
                    this.handleResetSettingsUpdated(data);
                }
                else if (data.type === 'chat_message') {
                    document.dispatchEvent(new CustomEvent('canvas:chat_message', { detail: data.data }));
                }
                else if (data.type === 'chat_typing') {
                    document.dispatchEvent(new CustomEvent('canvas:chat_typing', { detail: data }));
                }
                else if (data.type === 'chat_message_deleted') {
                    document.dispatchEvent(new CustomEvent('canvas:chat_message_deleted', { detail: data.data }));
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
                    const baseDelayCalc = this.wsManager.baseDelay * Math.pow(2, this.wsManager.reconnectAttempts);
                    const jitter = Math.floor(Math.random() * 2000); // 0 to 2 seconds of random jitter
                    const delay = baseDelayCalc + jitter;
                    
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
                const rawSize = String(data?.new_size || response.data.size || '');
                if (rawSize && !this.isInfinite) {
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

                if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
            }
        } catch (error) {
            console.error('[DesignNetwork] handleCanvasResizeCompleted error:', error);
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

    handleCanvasLockedPlazmar(data) {
        this.isPlazmarLocked = true;

        if (this.canvas) {
            this.canvas.classList.add('component-canvas-blur');
            this.canvas.classList.add('disabled-interactive');
        }

        this.updateLockBadges();

        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();

        showMessage(__('info_stamping_template'), 'warning');

        if (this.plazmarTimeout) clearTimeout(this.plazmarTimeout);
        this.plazmarTimeout = setTimeout(() => {
            if (this.isPlazmarLocked) {
                this.isPlazmarLocked = false;
                if (this.canvas) {
                    this.canvas.classList.remove('component-canvas-blur');
                    this.canvas.classList.remove('disabled-interactive');
                }
                this.updateLockBadges();
                showMessage(__('err_server_timeout'), 'error');
            }
        }, 60000);
    },

    async handleCanvasPlazmarCompleted(data) {
        if (this.plazmarTimeout) clearTimeout(this.plazmarTimeout);

        if (this.isInfinite) {
            // Invalidate affected chunks so they get re-fetched from Redis
            const affectedChunks = data.affected_chunks || [];
            if (affectedChunks.length > 0 && this.chunks) {
                for (const c of affectedChunks) {
                    const key = `${c.x},${c.y}`;
                    this.chunks.delete(key);
                }
            }
            // Request fresh chunk data for the current viewport
            if (typeof this.requestChunksForViewport === 'function') {
                this.requestChunksForViewport();
            }
        } else {
            try {
                const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
                if (response.aborted) return;

                if (response.success && response.data && response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
            } catch (error) {
            }
        }

        this.isPlazmarLocked = false;

        if (this.canvas && !this.isPrivateBlocked) {
            this.canvas.classList.remove('component-canvas-blur');
            this.canvas.classList.remove('disabled-interactive');
        }

        this.updateLockBadges();
        this.requestRender();

        showMessage(__('msg_template_stamped'), 'success');
    },

    handleCanvasPlazmarError(data) {
        if (this.plazmarTimeout) clearTimeout(this.plazmarTimeout);

        this.isPlazmarLocked = false;

        if (this.canvas) {
            this.canvas.classList.remove('component-canvas-blur');
            this.canvas.classList.remove('disabled-interactive');
        }

        this.updateLockBadges();
        showMessage(data.error || __('err_stamp_failed'), 'error');
    },

    async startLiveShare() {
        if (!this.activeTemplateId) {
            showMessage(__('err_select_template'), 'warning');
            return false;
        }

        const btn = document.querySelector('[data-action="startLive"]');
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
                opacity: tpl.opacity || 1,
                angle: tpl.angle || 0
            }, this.abortController.signal);
            
            if (response.aborted) return false;

            if (response.success && response.data?.code) {
                this.liveShareStatus = 'owner';
                this.liveShareCode = response.data.code;
                this.liveTemplateId = this.activeTemplateId;
                
                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });
                }

                if (this.uiLiveCode) this.uiLiveCode.textContent = this.liveShareCode;
                
                if (this.uiLiveInputX) this.uiLiveInputX.value = tpl.x;
                if (this.uiLiveInputY) this.uiLiveInputY.value = tpl.y;
                if (this.uiLiveInputOpacity) this.uiLiveInputOpacity.value = tpl.opacity || 1;

                let badge = document.getElementById('live-share-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'component-badge';
                    badge.id = 'live-share-badge';
                    badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso</span>';
                    const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                    if (badgesContainer) badgesContainer.appendChild(badge);
                }

                showMessage(__('msg_broadcasting').replace(':code', this.liveShareCode), 'success');
                return true;
            } else {
                showMessage(__('err_live_code_gen'), 'error');
                return false;
            }
        } catch (error) {
            showMessage(__('err_server_live_start'), 'error');
            return false;
        } finally {
            if (btn) restoreButton(btn);
        }
    },

    stopLiveShare() {
        if (this.liveShareStatus !== 'owner') return false;
        
        if (this.wsManager && this.liveShareCode) {
            this.wsManager.send({ type: 'end_live_share', code: this.liveShareCode });
        }

        this.liveShareStatus = 'none';
        this.liveShareCode = null;
        this.liveTemplateId = null;

        const badge = document.getElementById('live-share-badge');
        if (badge) badge.remove();

        const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
        if (btnOpenJoinLive) {
            btnOpenJoinLive.classList.remove('disabled-interactive', 'disabled');
            btnOpenJoinLive.removeAttribute('title');
        }

        showMessage(__('msg_broadcast_stopped'), 'info');
        return true;
    },

    async joinLiveImageSession(code) {
        if (!code) return false;
        
        const btn = document.querySelector('[data-action="submitJoinLive"]');
        if (btn) setButtonLoading(btn);

        try {
            const route = ApiRoutes.Canvases?.JoinLiveShare || 'canvases.join_live_share';
            
            const response = await this.api.post(route, { 
                code: code,
                canvas_id: this.canvasIntId 
            }, this.abortController.signal);
            
            if (response.aborted) return false;

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
                                opacity: response.data.empty ? 0 : (parseFloat(response.data.opacity) || 1),
                                angle: parseFloat(response.data.angle) || 0,
                                locked: true, 
                                url: img.src
                            });
                            this.activeTemplateId = liveId;
                            
                            let badge = document.getElementById('live-share-badge');
                            if (!badge) {
                                badge = document.createElement('div');
                                badge.className = 'component-badge';
                                badge.id = 'live-share-badge';
                                badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso</span>';
                                const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                                if (badgesContainer) badgesContainer.appendChild(badge);
                            }
                            
                            resolve();
                        };
                        img.onerror = () => {
                            showMessage(__('err_load_live_img'), 'error');
                            resolve();
                        };
                    });
                } else {
                    let badge = document.getElementById('live-share-badge');
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.className = 'component-badge';
                        badge.id = 'live-share-badge';
                        badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso</span>';
                        const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                        if (badgesContainer) badgesContainer.appendChild(badge);
                    }
                }

                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: code });
                }

                showMessage(__('msg_joined_broadcast').replace(':code', code), 'success');
                this.requestRender();
                return true;

            } else {
                showMessage(response.message, 'error');
                return false;
            }
        } catch (error) {
            showMessage(__('err_join_session'), 'error');
            return false;
        } finally {
            if (btn) restoreButton(btn);
        }
    },
    
    emitLiveImageUpdate() {
        if (this.liveShareStatus !== 'owner' || !this.liveShareCode || !this.wsManager) return;
        
        const tpl = this.templates.find(t => t.id === this.liveTemplateId);
        if (!tpl) {
            this.wsManager.send({
                type: 'update_live_share',
                code: this.liveShareCode,
                empty: true
            });
            return;
        }

        this.wsManager.send({
            type: 'update_live_share',
            code: this.liveShareCode,
            x: tpl.x,
            y: tpl.y,
            w: tpl.w,
            h: tpl.h,
            opacity: tpl.opacity || 1,
            angle: tpl.angle || 0
        });
    },

    handleLiveImageUpdate(data) {
        if (this.liveShareStatus === 'spectator' && this.liveShareCode === data.code) {
            const tpl = this.templates.find(t => t.id === this.liveTemplateId);
            if (tpl) {
                if (data.empty) {
                    tpl.opacity = 0; // Hide the template if the owner deleted it but kept the session open
                } else {
                    tpl.x = data.x;
                    tpl.y = data.y;
                    tpl.w = data.w;
                    tpl.h = data.h;
                    tpl.opacity = data.opacity !== undefined ? data.opacity : 1;
                    tpl.angle = data.angle || 0;
                }
                this.requestRender();
            }
        }
    },

    handleLiveSessionEnded(data) {
        if (this.liveShareStatus === 'spectator' && this.liveShareCode === data.code) {
            showMessage(__('info_live_ended'), 'info');
            this.liveShareStatus = 'none';
            this.liveShareCode = null;
            
            const badge = document.getElementById('live-share-badge');
            if (badge) badge.remove();

            if (this.liveTemplateId) {
                this.templates = this.templates.filter(t => t.id !== this.liveTemplateId);
                if (this.activeTemplateId === this.liveTemplateId) {
                    this.activeTemplateId = null;
                }
                this.liveTemplateId = null;
            }
            
            this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw');
            
            const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
            if (btnOpenJoinLive) {
                btnOpenJoinLive.classList.remove('disabled-interactive', 'disabled');
                btnOpenJoinLive.removeAttribute('title');
            }

            this.requestRender();
        }
    },

    handleCooldownSync(data) {
        if (data.type === 'init_cooldown' && data.node_id) {
            console.log(`[Network] Connected to WebSocket server: ${data.node_id}`);
        }

        if (this.isSpectator) {
            return;
        }

        if (data.balance !== undefined) this.cooldownBalance = data.balance;
        if (data.max_batch !== undefined) this.cooldownMax = data.max_batch;
        if (data.cooldown_sec !== undefined) this.cooldownSec = data.cooldown_sec;
        if (data.next_replenish_in !== undefined) {
            this.cooldownNextIn = data.next_replenish_in;
            this.lastSyncTime = Date.now();
        }

        if (data.perk_no_cooldown !== undefined) this.perkNoCooldown = data.perk_no_cooldown;
        if (data.perk_protection_left !== undefined) this.perkProtectionLeft = data.perk_protection_left;
        if (data.perk_eraser_left !== undefined) this.perkEraserLeft = data.perk_eraser_left;

        if (data.type === 'cooldown_error') {
            showMessage(__('err_sync_limit'), 'warning');
        }

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') {
            this.updatePerkBadges();
        }
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
            
            const isPremiumLocked = response.locked_requires_downgrade || (response.data && response.data.locked_requires_downgrade);
            if (isPremiumLocked) {
                this.isPremiumBlocked = true;
                this.isPrivateBlocked = true;
                this.setRoleUI('blocked');
                return;
            }

            if (response.success && response.data) {
                this.isPremiumBlocked = false;
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
        const premBadge = document.querySelector('[data-ref="premium-status-badge"]');

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
            if (this.isPremiumBlocked) {
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
            }
        }
    },

    async handleAccessRequest(btn) {
        if (!this.canvasIntId) return;

        if (window.dialogSystem) {
            const res = await window.dialogSystem.show('joinCanvasTerms');
            if (!res.confirmed || !res.data.modal_join_terms) {
                if (res.confirmed) showMessage(window.__('err_accept_terms'), 'warning');
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

    handleNuclearWarning(data) {
        if (!this.nuclearWarnings) this.nuclearWarnings = [];
        const perkId = data.perk || 'bomba_atomica_1';
        
        const perkConfig = typeof PerksRegistry !== 'undefined' ? PerksRegistry.get(perkId) : null;
        const durationSecs = parseInt(data.duration || perkConfig?.warning_seconds || 3, 10);
        
        let container = document.querySelector('[data-ref="badges-left"]');
        if (!container) {
            container = document.createElement('div');
            container.className = 'canvas-badges-left';
            container.setAttribute('data-ref', 'badges-left');
            document.body.appendChild(container);
        }

        const existingBadge = container.querySelector(`[data-warning-perk="${perkId}"]`);
        if (existingBadge) {
            return;
        }

        const badge = document.createElement('div');
        badge.className = 'component-badge';
        badge.setAttribute('data-warning-perk', perkId);
        badge.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
        badge.style.color = '#ffffff';
        badge.style.border = '1px solid var(--color-error, #ef4444)';
        badge.style.animation = 'pulse 1s infinite';

        const details = typeof PerksRegistry !== 'undefined' && typeof PerksRegistry.getWarningDetails === 'function' 
            ? PerksRegistry.getWarningDetails(perkId) 
            : { icon: 'crisis_alert', text: 'Ataque de Perk' };

        let remaining = durationSecs;
        badge.style.display = 'flex';
        badge.innerHTML = `<span class="material-symbols-rounded">${details.icon}</span><span class="component-text-bold">${details.text} (${remaining}s)</span>`;
        container.appendChild(badge);

        const timerId = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                badge.innerHTML = `<span class="material-symbols-rounded">${details.icon}</span><span class="component-text-bold">${details.text} (${remaining}s)</span>`;
            } else {
                clearInterval(timerId);
                badge.remove();
            }
        }, 1000);
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
        badge.innerHTML = `<span class="material-symbols-rounded">aspect_ratio</span><span class="component-text-bold">${labelText}: ${oldSizeStr} ➔ ${newSizeStr}</span>`;

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
        badge.innerHTML = `<span class="material-symbols-rounded">restart_alt</span><span class="component-text-bold">Lienzo vaciado</span>`;

        container.appendChild(badge);
        setTimeout(() => {
            badge.style.opacity = '0';
            badge.style.transition = 'opacity 0.3s ease';
            setTimeout(() => badge.remove(), 300);
        }, 3500);
    },

    _drawTimelapsePixel(data) {
        if (!data) return;

        if (data.type === 'canvas_resize') {
            this.handleExpansionBadge(data);

            const newW = parseInt(data.w, 10);
            const newH = parseInt(data.h, 10);

            if (!isNaN(newW) && !isNaN(newH) && (newW !== this.boardWidth || newH !== this.boardHeight)) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.boardWidth;
                tempCanvas.height = this.boardHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(this.offscreenCanvas, 0, 0);

                this.boardWidth = newW;
                this.boardHeight = newH;
                this.offscreenCanvas.width = newW;
                this.offscreenCanvas.height = newH;

                this.offscreenCtx.fillStyle = '#FFFFFF';
                this.offscreenCtx.fillRect(0, 0, newW, newH);
                this.offscreenCtx.drawImage(tempCanvas, 0, 0);

                if (typeof this.centerBoard === 'function') this.centerBoard();
                if (typeof this.requestRender === 'function') this.requestRender();
            }
            return;
        }

        if (data.type === 'canvas_reset') {
            this.handleResetBadge();

            this.offscreenCtx.fillStyle = '#FFFFFF';
            this.offscreenCtx.fillRect(0, 0, this.boardWidth, this.boardHeight);
            if (typeof this.requestRender === 'function') this.requestRender();
            return;
        }

        if (data.type === 'bomb_pixel') {
            const x = parseInt(data.x, 10);
            const y = parseInt(data.y, 10);
            const r = parseInt(data.r, 10);
            const perkId = data.perk || 'bomba_pixel_1';
            
            this.handleNuclearWarning(data);

            if (!isNaN(x) && !isNaN(y) && !isNaN(r)) {
                this.offscreenCtx.save();
                this.offscreenCtx.beginPath();
                this.offscreenCtx.arc(x + 0.5, y + 0.5, r, 0, 2 * Math.PI);
                this.offscreenCtx.clip();
                this.offscreenCtx.fillStyle = '#FFFFFF';
                this.offscreenCtx.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);
                this.offscreenCtx.restore();

                if (typeof this.triggerExplosionEffect === 'function') {
                    this.triggerExplosionEffect(x, y, r, perkId);
                }
            }
            return;
        }

        if (data.type === 'template_plazmar') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.offscreenCtx.save();
                const x = parseInt(data.x, 10);
                const y = parseInt(data.y, 10);
                const w = parseInt(data.w, 10);
                const h = parseInt(data.h, 10);
                const angle = parseFloat(data.angle || 0);
                
                this.offscreenCtx.translate(x + w/2, y + h/2);
                this.offscreenCtx.rotate(angle * Math.PI / 180);
                this.offscreenCtx.drawImage(img, -w/2, -h/2, w, h);
                this.offscreenCtx.restore();
                if (typeof this.requestRender === 'function') this.requestRender();
            };
            img.src = data.image_url;
            return;
        }

        const pX = parseInt(data.x, 10);
        const pY = parseInt(data.y, 10);
        if (isNaN(pX) || isNaN(pY)) return;

        const rawColor = data.c !== undefined ? data.c : data.color;

        if (rawColor === 'transparent' || rawColor === 'none' || rawColor === 255 || rawColor === '255') {
            this.offscreenCtx.clearRect(pX, pY, 1, 1);
        } else if (typeof rawColor === 'string' && rawColor.startsWith('#')) {
            this.offscreenCtx.fillStyle = rawColor;
            this.offscreenCtx.clearRect(pX, pY, 1, 1);
            this.offscreenCtx.fillRect(pX, pY, 1, 1);
        } else {
            const cIdx = parseInt(rawColor, 10);
            if (!isNaN(cIdx)) {
                const paletteObj = typeof getPaletteById === 'function' ? getPaletteById(this.canvasPaletteId) : null;
                let hexColor = '#000000';
                if (paletteObj && paletteObj.colors && paletteObj.colors[cIdx]) {
                    hexColor = paletteObj.colors[cIdx].hex;
                } else if (window.APP_PALETTES && window.APP_PALETTES['default'] && window.APP_PALETTES['default'].colors && window.APP_PALETTES['default'].colors[cIdx]) {
                    hexColor = window.APP_PALETTES['default'].colors[cIdx].hex || window.APP_PALETTES['default'].colors[cIdx];
                } else {
                    hexColor = '#FFFFFF';
                }
                
                this.offscreenCtx.fillStyle = hexColor;
                this.offscreenCtx.clearRect(pX, pY, 1, 1);
                this.offscreenCtx.fillRect(pX, pY, 1, 1);
            }
        }
    }
};