import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage } from '../../../core/utils/uiUtils.js';
import { WebSocketManager } from '../../../core/api/WebSocketManager.js';

export const DesignNetworkConnection = {
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
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                }
                else if (data.type === 'init_my_protected_pixels') {
                    this.myProtectedPixels = new Set(data.offsets);
                    this.myProtectedExpiries = {};
                    if (Array.isArray(data.offsets) && Array.isArray(data.expiries)) {
                        data.offsets.forEach((off, idx) => {
                            this.myProtectedExpiries[off] = data.expiries[idx];
                        });
                    }
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                }
                else if (data.type === 'pixel_protected_broadcast') {
                    if (!this.protectedPixels) this.protectedPixels = new Set();
                    this.protectedPixels.add(data.offset);
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                }
                else if (data.type === 'pixel_unprotected_broadcast') {
                    if (!this.protectedPixels) this.protectedPixels = new Set();
                    if (!this.myProtectedPixels) this.myProtectedPixels = new Set();
                    if (!this.myProtectedExpiries) this.myProtectedExpiries = {};
                    if (Array.isArray(data.offsets)) {
                        data.offsets.forEach(off => {
                            this.protectedPixels.delete(off);
                            this.myProtectedPixels.delete(off);
                            delete this.myProtectedExpiries[off];
                        });
                    } else if (data.offset !== undefined) {
                        this.protectedPixels.delete(data.offset);
                        this.myProtectedPixels.delete(data.offset);
                        delete this.myProtectedExpiries[data.offset];
                    }
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                }
                else if (data.type === 'pixel_protection_success') {
                    if (typeof showMessage === 'function') showMessage('Zona protegida con éxito por 24 horas', 'success');
                    if (!this.myProtectedPixels) this.myProtectedPixels = new Set();
                    if (!this.myProtectedExpiries) this.myProtectedExpiries = {};
                    if (Array.isArray(data.offsets) && Array.isArray(data.expiries)) {
                        data.offsets.forEach((off, idx) => {
                            this.myProtectedPixels.add(off);
                            this.myProtectedExpiries[off] = data.expiries[idx];
                        });
                    }
                    if (typeof this.loadUserPerks === 'function') this.loadUserPerks();
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
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
                else if (data.type === 'canvas_freeze_changed') {
                    this.isFrozen = data.frozen;
                    this.updateFreezeUI();
                }
                else if (data.type === 'init_owner_protected_pixels') {
                    this.ownerProtectedPixels = new Set(data.offsets);
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                }
                else if (data.type === 'area_protection_changed') {
                    if (!this.protectedPixels) this.protectedPixels = new Set();
                    if (!this.ownerProtectedPixels) this.ownerProtectedPixels = new Set();
                    const w = data.width || this.boardWidth || 64;
                    const minX = data.x1;
                    const maxX = data.x2;
                    const minY = data.y1;
                    const maxY = data.y2;
                    const protect = data.protect;

                    for (let y = minY; y <= maxY; y++) {
                        for (let x = minX; x <= maxX; x++) {
                            const offset = (y * w) + x;
                            if (protect) {
                                this.protectedPixels.add(offset);
                                this.ownerProtectedPixels.add(offset);
                            } else {
                                this.protectedPixels.delete(offset);
                                this.ownerProtectedPixels.delete(offset);
                            }
                        }
                    }
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                    if (typeof showMessage === 'function') {
                        const actWord = protect ? 'protegida' : 'desprotegida';
                        showMessage(`Zona administrativamente ${actWord} por el dueño.`, 'info');
                    }
                    this.requestRender();
                }
                else if (data.type === 'canvas_frozen_error') {
                    showMessage(data.message || 'El lienzo está congelado por el administrador', 'warning');
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
                    console.log('[DesignNetwork] WebSocket event received: live_image_updated', data);
                    this.handleLiveImageUpdate(data);
                }
                else if (data.type === 'live_session_ended') {
                    console.log('[DesignNetwork] WebSocket event received: live_session_ended', data);
                    this.handleLiveSessionEnded(data);
                }
                else if (data.type === 'live_share_count') {
                    console.log('[DesignNetwork] WebSocket event received: live_share_count', data);
                    this.handleLiveShareCount(data);
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
    }
};
