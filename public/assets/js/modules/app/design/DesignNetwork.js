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
            });

            this.wsManager.on('qos_evicted', (reason) => {
                showMessage(reason, 'warning');
            });

            this.wsManager.on('message', (data) => {
                if (data.type === 'pixel') {
                    const p = { x: parseInt(data.x, 10), y: parseInt(data.y, 10), color: data.color };
                    if (this.renderWorker) {
                        this.renderWorker.postMessage({ type: 'PUSH_PIXELS', payload: { pixels: [p] } });
                    } else {
                        if (!this.pixelQueue) this.pixelQueue = [];
                        this.pixelQueue.push(p);
                        this.requestRender();
                    }
                } 
                else if (data.type === 'batch_pixels' || data.type === 'batch_protect_pixels' || data.type === 'batch_erase_pixels') {
                    if (Array.isArray(data.pixels) && data.pixels.length > 0) {
                        const len = data.pixels.length;
                        const pixels = new Array(len);
                        const batchColor = data.color;
                        for (let i = 0; i < len; i++) {
                            const p = data.pixels[i];
                            pixels[i] = {
                                x: typeof p.x === 'number' ? p.x : parseInt(p.x, 10),
                                y: typeof p.y === 'number' ? p.y : parseInt(p.y, 10),
                                color: p.color || batchColor
                            };
                        }
                        if (this.renderWorker) {
                            this.renderWorker.postMessage({ type: 'PUSH_PIXELS', payload: { pixels } });
                        } else {
                            if (!this.pixelQueue) this.pixelQueue = [];
                            this.pixelQueue.push(...pixels);
                            this.requestRender();
                        }
                    }
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

                    if (this.renderWorker) {
                        this.renderWorker.postMessage({ type: 'BOMB_PIXEL', payload: { cX, cY, r, perkId } });
                    } else {
                        if (this.offscreenCtx) {
                            for (let y = cY - r; y <= cY + r; y++) {
                                const dy = y - cY;
                                const dx = Math.floor(Math.sqrt(r * r - dy * dy));
                                const startX = cX - dx;
                                const endX = cX + dx;
                                const width = endX - startX + 1;
                                this.offscreenCtx.clearRect(startX, y, width, 1);
                            }
                        }
                        this.requestRender();
                    }
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
                        if (!this.pixelQueue) this.pixelQueue = [];
                        this.pixelQueue.push({
                            x: parseInt(data.x, 10),
                            y: parseInt(data.y, 10),
                            color: data.color
                        });
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
                else if (data.type === 'canvas_locked_inject') {
                    this.handleCanvasLockedInject(data);
                }
                else if (data.type === 'canvas_inject_completed') {
                    this.handleCanvasInjectCompleted(data);
                }
                else if (data.type === 'canvas_inject_error') {
                    this.handleCanvasInjectError(data);
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
                else if (data.type === 'canvas_locked_clear') {
                    this.handleCanvasLockedClear(data);
                }
                else if (data.type === 'canvas_clear_completed') {
                    this.handleCanvasClearCompleted(data);
                }
                else if (data.type === 'clear_area') {
                    this.handleClearAreaEvent(data);
                }
            });

            this.wsManager.connect(this.canvasIntId, wsTicket);

            this.wsManager.handleReconnect = async () => {
                if (this.wsManager.reconnectAttempts < this.wsManager.maxReconnectAttempts) {
                    const baseDelayCalc = this.wsManager.baseDelay * Math.pow(2, this.wsManager.reconnectAttempts);
                    const jitter = Math.floor(Math.random() * 2000); // 0 to 2 seconds of random jitter
                    const delay = baseDelayCalc + jitter;
                    
                    if (this.wsReconnectTimeout) clearTimeout(this.wsReconnectTimeout);
                    this.wsReconnectTimeout = setTimeout(async () => {
                        if (this._destroyed || (this.wsManager && this.wsManager.isIntentionalDisconnect)) return;
                        
                        this.wsManager.reconnectAttempts++;
                        let newToken = null;
                        if (!uid) {
                            try { newToken = await this.getTurnstileToken(); } catch(e){}
                        }
                        
                        const p = { canvas_id: this.canvasIntId };
                        if (newToken) p['cf-turnstile-response'] = newToken;

                        const res = await this.api.post(route, p, this.abortController.signal);
                        if (res.aborted || this._destroyed || (this.wsManager && this.wsManager.isIntentionalDisconnect)) return;
                        
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

    handleCanvasLockedInject(data) {
        this.isInjectLocked = true;

        if (this.canvas) {
            this.canvas.classList.add('component-canvas-blur');
        }

        this.updateLockBadges();

        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();

        if (this.lastInjectedTemplate) {
            showMessage(__('info_stamping_template'), 'warning');
        }

        if (this.injectTimeout) clearTimeout(this.injectTimeout);
        this.injectTimeout = setTimeout(() => {
            if (this.isInjectLocked) {
                this.isInjectLocked = false;
                if (this.canvas) {
                    this.canvas.classList.remove('component-canvas-blur');
                }
                this.updateLockBadges();
                showMessage(__('err_server_timeout'), 'error');
            }
        }, 60000);
    },

    async handleCanvasInjectCompleted(data) {
        if (this.injectTimeout) clearTimeout(this.injectTimeout);

        this.activeTemplateId = null;
        if (typeof this.updateTemplateUI === 'function') {
            this.updateTemplateUI();
        }

        const isOwner = !!this.lastInjectedTemplate;
        let tempCoords = null;

        if (isOwner) {
            tempCoords = this.lastInjectedTemplate;
        } else if (data.x !== undefined && data.y !== undefined && data.w && data.h && data.image_url) {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                const loadPromise = new Promise((resolve) => {
                    img.onload = () => resolve(img);
                    img.onerror = () => {
                        if (img.crossOrigin) {
                            img.crossOrigin = null;
                            img.src = data.image_url;
                        } else {
                            resolve(null);
                        }
                    };
                });
                img.src = data.image_url;
                await loadPromise;
                const bitmap = await createImageBitmap(img);
                tempCoords = {
                    x: parseInt(data.x, 10),
                    y: parseInt(data.y, 10),
                    w: parseInt(data.w, 10),
                    h: parseInt(data.h, 10),
                    imageBitmap: bitmap
                };
            } catch (e) {
            }
        }

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
            if (response.aborted) return;

            if (response.success && response.data) {
                if (tempCoords && this.renderWorker) {
                    const payload = {
                        templateCoords: {
                            x: tempCoords.x,
                            y: tempCoords.y,
                            w: tempCoords.w,
                            h: tempCoords.h
                        },
                        imageBitmap: tempCoords.imageBitmap
                    };
                    const transfers = tempCoords.imageBitmap ? [tempCoords.imageBitmap] : [];
                    this.renderWorker.postMessage({
                        type: 'TRIGGER_INJECT_ANIMATION',
                        payload: payload
                    }, transfers);
                }

                if (typeof this.initCanvasData === 'function') {
                    this.initCanvasData(response.data, true);
                } else if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
                
                this.lastInjectedTemplate = null;
            }
        } catch (error) {
        }

        this.isInjectLocked = false;

        if (this.canvas && !this.isPrivateBlocked) {
            this.canvas.classList.remove('component-canvas-blur');
        }

        this.updateLockBadges();
        this.requestRender();

        if (isOwner) {
            showMessage(__('msg_template_stamped'), 'success');
        }
    },

    handleCanvasInjectError(data) {
        if (this.injectTimeout) clearTimeout(this.injectTimeout);

        this.isInjectLocked = false;

        if (this.canvas) {
            this.canvas.classList.remove('component-canvas-blur');
        }

        this.updateLockBadges();
        showMessage(data.error || __('err_stamp_failed'), 'error');
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
            btnOpenJoinLive.classList.remove('disabled-interaction', 'disabled');
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
                btnOpenJoinLive.classList.remove('disabled-interaction', 'disabled');
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

        this.isCooldownSynced = true;
        if (data.balance !== undefined) this.cooldownBalance = data.balance;
        if (data.max_batch !== undefined) this.cooldownMax = data.max_batch;
        if (data.cooldown_sec !== undefined) this.cooldownSec = data.cooldown_sec;
        if (data.next_replenish_in !== undefined) {
            this.cooldownNextIn = data.next_replenish_in;
            this.lastSyncTime = Date.now();
        }

        if (data.type === 'cooldown_error') {
            showMessage(__('err_sync_limit'), 'warning');
        }

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') {
            this.updatePerkBadges();
        }
    },

    triggerRefresh() {
        if (typeof this.onNeedsRefresh === 'function') {
            this.onNeedsRefresh();
        }
    },

    setLastInjectedTemplate(template) {
        this.lastInjectedTemplate = template;
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

    async checkCanvasAccess() {
        if (!this.canvasIntId || this.canvasIntId === '0') return;

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
            if (response.aborted) return;
            
            const isPremiumLocked = response.locked_requires_downgrade || (response.data && response.data.locked_requires_downgrade);
            if (isPremiumLocked && response.data) {
                this.isPremiumBlocked = true;
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
                btn.classList.add('disabled-interaction');
                btn.innerHTML = `<span class="material-symbols-rounded">hourglass_empty</span> ${__('btn_pending')}`;
            }
        } else {
            showMessage(response.message, 'error');
        }
    },



    handleBombWarning(data) {
        const cx = parseInt(data.x || 0, 10);
        const cy = parseInt(data.y || 0, 10);
        const perkId = data.perk || 'bomba_atomica_1';
        
        const perkConfig = typeof PerksRegistry !== 'undefined' ? PerksRegistry.get(perkId) : null;
        let durationSecs = parseInt(data.duration || perkConfig?.warning_seconds || 3, 10);
        if (isNaN(durationSecs) || durationSecs <= 0) durationSecs = 3;

        let r = data.radius || data.r;
        if (!r && typeof PerksRegistry !== 'undefined') {
            r = PerksRegistry.getExplosionRadius(perkId, this.boardWidth, this.boardHeight);
        }
        r = parseInt(r || 10, 10);
        if (isNaN(r) || r <= 0) r = 10;

        const targetKey = `${cx}_${cy}_${perkId}`;
        const now = Date.now();

        if (!this.nuclearWarnings) this.nuclearWarnings = [];
        const existing = this.nuclearWarnings.find(w => w.key === targetKey && now < w.endTime);
        if (existing) {
            return;
        }

        const durationMs = durationSecs * 1000;

        const warningObj = {
            key: targetKey,
            x: cx,
            y: cy,
            radius: r,
            startTime: now,
            endTime: now + durationMs,
            perkId: perkId
        };
        this.nuclearWarnings.push(warningObj);

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'BOMB_WARNING',
                payload: { key: targetKey, x: cx, y: cy, radius: r, durationMs: durationMs }
            });
        }

        const animateWarning = () => {
            const currentNow = Date.now();
            if (this.nuclearWarnings && this.nuclearWarnings.some(w => w === warningObj)) {
                this.requestRender();
                if (currentNow < warningObj.endTime) {
                    requestAnimationFrame(animateWarning);
                }
            }
        };
        requestAnimationFrame(animateWarning);

        // UI Badge flotante en la izquierda
        let container = document.querySelector('[data-ref="badges-left"]');
        if (!container) {
            container = document.createElement('div');
            container.className = 'canvas-badges-left';
            container.setAttribute('data-ref', 'badges-left');
            document.body.appendChild(container);
        }

        const existingBadge = container.querySelector(`[data-warning-perk="${perkId}"]`);
        if (!existingBadge) {
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
            badge.innerHTML = `<span class="material-symbols-rounded">${details.icon}</span><span >${details.text} (${remaining}s)</span>`;
            container.appendChild(badge);

            const timerId = setInterval(() => {
                remaining--;
                if (remaining > 0) {
                    badge.innerHTML = `<span class="material-symbols-rounded">${details.icon}</span><span >${details.text} (${remaining}s)</span>`;
                } else {
                    clearInterval(timerId);
                    badge.remove();
                }
            }, 1000);
        }
    },

    handleNuclearWarning(data) {
        return this.handleBombWarning(data);
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

    handleClearAreaEvent(data) {
        const x1 = parseInt(data.x1, 10);
        const y1 = parseInt(data.y1, 10);
        const x2 = parseInt(data.x2, 10);
        const y2 = parseInt(data.y2, 10);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;

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

        this.requestRender();
    }
};