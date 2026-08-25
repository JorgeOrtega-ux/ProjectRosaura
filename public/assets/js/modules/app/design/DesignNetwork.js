import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { WebSocketManager } from '../../../core/api/WebSocketManager.js';
import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { CanvasSyncChannel } from '../../../core/services/CanvasSyncChannel.js';

export const DesignNetwork = {
    initSyncChannel() {
        if (typeof this._syncUnsubscribe === 'function') {
            this._syncUnsubscribe();
            this._syncUnsubscribe = null;
        }

        this._syncUnsubscribe = CanvasSyncChannel.subscribe((data) => {
            if (!data || !data.type) return;

            const targetId = data.canvasId || data.id;
            const targetUuid = data.canvasUuid || data.uuid;

            const isCurrentCanvas = (
                (targetId && (String(targetId) === String(this.canvasIntId) || String(targetId) === String(this.canvasId))) ||
                (targetUuid && String(targetUuid) === String(this.canvasId))
            );

            if (!isCurrentCanvas) return;

            if (data.type === 'canvas_resize_completed') {
                this.handleCanvasLockedResize(data);
                setTimeout(() => {
                    this.handleCanvasResizeCompleted(data);
                }, 350);
            } else if (data.type === 'canvas_clear_completed' || data.type === 'canvas_reset') {
                this.handleCanvasLockedClear(data);
                setTimeout(() => {
                    this.handleCanvasClearCompleted(data);
                }, 350);
            } else if (data.type === 'canvas_resize_settings_updated') {
                this.handleResizeSettingsUpdated(data);
            } else if (data.type === 'canvas_reset_settings_updated') {
                this.handleResetSettingsUpdated(data);
            } else if (data.type === 'canvas_mode_changed') {
                if (typeof this.handleCanvasModeChanged === 'function') {
                    this.handleCanvasModeChanged(data);
                }
            } else if (data.type === 'local_offline_stroke') {
                if (this.isOfflineMode && data.pixels && data.pixels.length > 0) {
                    if (this.renderWorker) {
                        const pixelsToPush = data.pixels.map(p => ({
                            x: p.x,
                            y: p.y,
                            color: data.color
                        }));
                        this.renderWorker.postMessage({ type: 'PUSH_PIXELS', payload: { pixels: pixelsToPush } });
                    } else if (this.offscreenCtx) {
                        data.pixels.forEach(p => {
                            this.offscreenCtx.fillStyle = data.color;
                            this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                            this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                        });
                        this.requestRender();
                    }
                }
            }
        });
    },

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
            const route = ApiRoutes.Canvases.GetWsTicket;
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
                this.wsManager.send({ type: 'init', userId: uid, version: '2.0.3' });
                if (this.liveShareCode) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });

                    // Restore owner template overlay after page reload
                    const restoreData = this._restoredLiveShareData;
                    if (restoreData && restoreData.img_url && this.liveShareStatus === 'owner') {
                        const imgUrl = restoreData.img_url;
                        // Avoid adding duplicate template entries
                        const alreadyLoaded = this.templates && this.templates.find(t => t.id === imgUrl);
                        if (!alreadyLoaded) {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = async () => {
                                const loadBitmap = async (src) => {
                                    if (typeof createImageBitmap === 'function') {
                                        try { return await createImageBitmap(src); } catch (e) {}
                                    }
                                    return null;
                                };
                                const imageBitmap = await loadBitmap(img);
                                if (!this.templates) this.templates = [];
                                this.templates.push({
                                    id: imgUrl,
                                    img,
                                    imageBitmap,
                                    src: imgUrl,
                                    x: parseInt(restoreData.x) || 0,
                                    y: parseInt(restoreData.y) || 0,
                                    w: parseInt(restoreData.w) || img.width,
                                    h: parseInt(restoreData.h) || img.height,
                                    opacity: parseFloat(restoreData.opacity) ?? 0.5,
                                    angle: parseFloat(restoreData.angle) || 0,
                                    locked: false,
                                });
                                this.activeTemplateId = imgUrl;
                                this.liveTemplateId = imgUrl;
                                this._restoredLiveShareData = null;
                                if (typeof this.updateTemplateUI === 'function') this.updateTemplateUI();
                                this.requestRender();
                            };
                            img.onerror = () => {
                                if (img.crossOrigin) { img.crossOrigin = null; img.src = imgUrl; }
                            };
                            img.src = imgUrl;
                        }
                    }
                }
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
                            const pLen = pixels.length;
                            for (let i = 0; i < pLen; i++) {
                                this.pixelQueue.push(pixels[i]);
                            }
                            this.requestRender();
                        }
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
                else if (data.type === 'version_mismatch') {
                    this.wsManager.disconnect();
                    showMessage(data.message || __('err_version_mismatch'), 'error');
                    setTimeout(() => {
                        window.location.reload();
                    }, 4000);
                }
                else if (data.type === 'init_protected_areas') {
                    this.protectedAreas = data.areas || [];
                    this.protectedPixels = new Set();
                    this.ownerProtectedPixels = new Set();
                    this.myProtectedPixels = new Set();
                    this.myProtectedExpiries = {};
                    
                    const w = this.boardWidth || 64;
                    const currentUserId = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
                    
                    for (const area of this.protectedAreas) {
                        for (let y = area.y1; y <= area.y2; y++) {
                            for (let x = area.x1; x <= area.x2; x++) {
                                const offset = (y * w) + x;
                                this.protectedPixels.add(offset);
                                
                                if (!area.protected_by) {
                                    // Zona del owner: permanente
                                    this.ownerProtectedPixels.add(offset);
                                } else if (currentUserId && String(area.protected_by) === String(currentUserId)) {
                                    // Zona propia del usuario: usar expires_at real del servidor
                                    this.myProtectedPixels.add(offset);
                                    if (area.expires_at) {
                                        this.myProtectedExpiries[offset] = area.expires_at;
                                    }
                                } else {
                                    // Zona protegida por otro usuario
                                    this.ownerProtectedPixels.add(offset);
                                }
                            }
                        }
                    }
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                    if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
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
                    if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
                }
                else if (data.type === 'pixel_protection_success') {
                    if (typeof showMessage === 'function') showMessage(window.__('msg_zone_protected_24h'), 'success');
                    if (!this.myProtectedPixels) this.myProtectedPixels = new Set();
                    if (!this.myProtectedExpiries) this.myProtectedExpiries = {};
                    if (Array.isArray(data.offsets) && Array.isArray(data.expiries)) {
                        data.offsets.forEach((off, idx) => {
                            this.myProtectedPixels.add(off);
                            this.myProtectedExpiries[off] = data.expiries[idx];
                        });
                    }

                    if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                }
                else if (data.type === 'init_my_mines') {
                    this.myMines = new Set(data.offsets);
                    if (typeof this.syncMinesToWorker === 'function') this.syncMinesToWorker();
                }
                else if (data.type === 'mines_placed_success') {
                    if (typeof showMessage === 'function') showMessage(window.__('msg_mines_placed_success'), 'success');
                    if (!this.myMines) this.myMines = new Set();
                    if (Array.isArray(data.offsets)) {
                        data.offsets.forEach(off => this.myMines.add(off));
                    }

                    if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
                    if (typeof this.syncMinesToWorker === 'function') this.syncMinesToWorker();
                }
                else if (data.type === 'mines_placed_error') {
                    if (typeof showMessage === 'function') showMessage(data.message || window.__('err_server'), 'error');
                }
                else if (data.type === 'mine_detonated') {
                    if (this.myMines) {
                        this.myMines.delete(data.offset);
                    }
                    if (typeof this.syncMinesToWorker === 'function') this.syncMinesToWorker();
                    if (typeof showMessage === 'function') showMessage(window.__('msg_mine_detonated'), 'info');
                }
                else if (data.type === 'pixel_protected_error') {
                    const msg = data.message ? (typeof window.__ === 'function' ? window.__(data.message) : data.message) : (typeof window.__ === 'function' ? window.__('err_pixel_protected') : 'err_pixel_protected');

                    if (!this.lastProtectedToastTime || (Date.now() - this.lastProtectedToastTime > 2000)) {
                        if (typeof showMessage === 'function') showMessage(msg, 'warning');
                        this.lastProtectedToastTime = Date.now();
                    }

                    // Limpiar badges de preparación activos y restaurar interactividad
                    const badgesLeft = document.querySelector('[data-ref="badges-left"]');
                    if (badgesLeft) {
                        const preparingBadges = badgesLeft.querySelectorAll('[data-preparing-key]');
                        preparingBadges.forEach(b => b.remove());
                    }

                    if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();

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
                else if (data.type === 'lagged_desync') {
                    console.warn('[DesignNetwork] WebSocket lagged and lost sync. Re-fetching chunks...');
                    if (this.renderWorker) {
                        this.renderWorker.postMessage({ type: 'RESET_BUFFER' });
                    }
                    if (this.loadedChunks) {
                        this.loadedChunks.clear();
                    }
                    if (typeof this.checkCanvasAccess === 'function') {
                        this.checkCanvasAccess();
                    }
                }
                else if (data.type === 'canvas_freeze_changed') {
                    this.isFrozen = data.frozen;
                    this.updateFreezeUI();
                }
                else if (data.type === 'area_protection_changed') {
                    if (!this.protectedPixels) this.protectedPixels = new Set();
                    if (!this.ownerProtectedPixels) this.ownerProtectedPixels = new Set();
                    if (!this.protectedAreas) this.protectedAreas = [];
                    const protect = data.protect;

                    const minX = data.x1;
                    const maxX = data.x2;
                    const minY = data.y1;
                    const maxY = data.y2;
                    const w = data.width || this.boardWidth || 64;

                    // Update this.protectedAreas list
                    if (protect) {
                        const exists = this.protectedAreas.some(a => a.x1 === minX && a.y1 === minY && a.x2 === maxX && a.y2 === maxY);
                        if (!exists) {
                            this.protectedAreas.push({
                                x1: minX,
                                y1: minY,
                                x2: maxX,
                                y2: maxY,
                                protected_by: data.by_perk ? (window.activeUserId || null) : null
                            });
                        }
                    } else {
                        this.protectedAreas = this.protectedAreas.filter(a => !(a.x1 === minX && a.y1 === minY && a.x2 === maxX && a.y2 === maxY));
                    }

                    if (data.offsets && Array.isArray(data.offsets)) {
                        for (const offset of data.offsets) {
                            if (protect) {
                                this.protectedPixels.add(offset);
                                this.ownerProtectedPixels.add(offset);
                            } else {
                                this.protectedPixels.delete(offset);
                                this.ownerProtectedPixels.delete(offset);
                            }
                        }
                    } else {
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
                    }
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                    if (typeof showMessage === 'function') {
                        const actWord = protect ? 'protegida' : 'desprotegida';
                        if (data.is_owner) {
                            showMessage(`Zona administrativamente ${actWord} por el dueño.`, 'info');
                        } else {
                            showMessage(`Zona ${actWord} por ventaja de protección.`, 'info');
                        }
                    }
                    this.requestRender();
                }
                else if (data.type === 'pixel_unprotected_circle') {
                    const cx = parseInt(data.x, 10);
                    const cy = parseInt(data.y, 10);
                    const r = parseInt(data.r, 10);
                    if (this.protectedPixels) {
                        const w = this.boardWidth || 64;
                        const rSq = r * r;
                        for (let y = cy - r; y <= cy + r; y++) {
                            const dy = y - cy;
                            const maxDx = Math.floor(Math.sqrt(Math.max(0, rSq - dy * dy)));
                            for (let x = cx - maxDx; x <= cx + maxDx; x++) {
                                const off = y * w + x;
                                this.protectedPixels.delete(off);
                                if (this.ownerProtectedPixels) this.ownerProtectedPixels.delete(off);
                            }
                        }
                    }
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                    this.requestRender();
                }
                else if (data.type === 'pixel_unprotected_broadcast') {
                    if (Array.isArray(data.offsets) && this.protectedPixels) {
                        data.offsets.forEach(off => {
                            this.protectedPixels.delete(off);
                            if (this.ownerProtectedPixels) this.ownerProtectedPixels.delete(off);
                        });
                    }
                    if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
                    this.requestRender();
                }
                else if (data.type === 'canvas_frozen_error') {
                    showMessage(data.message || 'El lienzo está congelado por el administrador', 'warning');
                }
                else if (data.type === 'owner_ratelimit_error') {
                    const secs = (data.cooldown_ms / 1000).toFixed(1);
                    let toolName = 'Herramienta de dueño';
                    const tool = data.tool || 'clear';
                    if (tool === 'freeze') toolName = 'Congelación de lienzo';
                    else if (tool === 'protect') toolName = 'Protección de zona';
                    else if (tool === 'clear') toolName = 'Borrador';
                    
                    if (!this.ownerCooldowns) this.ownerCooldowns = {};
                    this.ownerCooldowns[tool] = Date.now() + data.cooldown_ms;
                    if (typeof this.startOwnerCooldownTimer === 'function') this.startOwnerCooldownTimer();
                    if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();

                    showMessage(`${toolName} en cooldown. Espera ${secs} segundos.`, 'warning');
                }
                else if (data.type === 'init_owner_cooldowns') {
                    if (!this.ownerCooldowns) this.ownerCooldowns = {};
                    const now = Date.now();
                    for (const [tool, ttl_ms] of Object.entries(data.cooldowns || {})) {
                        this.ownerCooldowns[tool] = now + ttl_ms;
                    }
                    if (typeof this.startOwnerCooldownTimer === 'function') this.startOwnerCooldownTimer();
                    if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
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
                else if (data.type === 'chat_reaction_updated') {
                    document.dispatchEvent(new CustomEvent('canvas:chat_reaction_updated', { detail: data.data }));
                }
                else if (data.type === 'chat_cleared') {
                    document.dispatchEvent(new CustomEvent('canvas:chat_cleared', { detail: data }));
                }
                else if (data.type === 'chat_slowmode_changed') {
                    document.dispatchEvent(new CustomEvent('canvas:chat_slowmode_changed', { detail: data }));
                }
                else if (data.type === 'chat_whisper') {
                    document.dispatchEvent(new CustomEvent('canvas:chat_whisper', { detail: data.data || data }));
                }
                else if (data.type === 'live_image_updated') {
                    this.handleLiveImageUpdate(data);
                }
                else if (data.type === 'live_session_ended') {
                    this.handleLiveSessionEnded(data);
                }
                else if (data.type === 'live_share_count') {
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
                else if (data.type === 'canvas_mode_changed') {
                    this.handleCanvasModeChanged(data);
                }
            });

            this.wsManager.connect(this.canvasIntId, wsTicket);

            this.wsManager.handleReconnect = async () => {
                if (this._isReconnecting) return;
                if (this.wsManager.reconnectAttempts < this.wsManager.maxReconnectAttempts) {
                    const baseDelayCalc = this.wsManager.baseDelay * Math.pow(2, this.wsManager.reconnectAttempts);
                    const jitter = Math.floor(Math.random() * 2000); // 0 to 2 seconds of random jitter
                    const delay = baseDelayCalc + jitter;
                    
                    if (this.wsReconnectTimeout) clearTimeout(this.wsReconnectTimeout);
                    this.wsReconnectTimeout = setTimeout(async () => {
                        if (this._destroyed || (this.wsManager && this.wsManager.isIntentionalDisconnect)) return;
                        if (this._isReconnecting) return;
                        this._isReconnecting = true;
                        
                        try {
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
                        } finally {
                            this._isReconnecting = false;
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
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        if (data.is_active) {
            this.resizeActive = true;
            this.nextResizeAt = data.next_resize_at;
            this.resizeTargetSize = data.target_size;

            if (wrapper) {
                wrapper.setAttribute('data-resize-active', '1');
                wrapper.setAttribute('data-resize-at', data.next_resize_at || '');
                if (data.target_size) wrapper.setAttribute('data-resize-target', data.target_size);
            }
            
            if (typeof this.startResizeTimer === 'function') {
                this.startResizeTimer();
            }
        } else {
            this.resizeActive = false;
            this.nextResizeAt = null;

            if (wrapper) {
                wrapper.setAttribute('data-resize-active', '0');
                wrapper.setAttribute('data-resize-at', '');
            }
            
            if (this.resizeTimerInterval) {
                clearInterval(this.resizeTimerInterval);
                this.resizeTimerInterval = null;
            }
            
            this.removeCanvasBadge('resize-timer', 'right'); 
        }
    },

    handleResetSettingsUpdated(data) {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        if (data.is_active) {
            this.resetActive = true;
            this.nextResetAt = data.next_reset_at;

            if (wrapper) {
                wrapper.setAttribute('data-reset-active', '1');
                wrapper.setAttribute('data-reset-at', data.next_reset_at || '');
            }
            
            if (typeof this.startResetTimer === 'function') {
                this.startResetTimer();
            }
        } else {
            this.resetActive = false;
            this.nextResetAt = null;

            if (wrapper) {
                wrapper.setAttribute('data-reset-active', '0');
                wrapper.setAttribute('data-reset-at', '');
            }
            
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

                const role = response.data.role || 'spectator';
                this.applyCanvasRoleState(role, response.data);

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

        showMessage(window.__('msg_zone_cleared_success'), 'success');
    },

    async startLiveShare() {
        try {
            const route = ApiRoutes.Canvases.CreateLiveShare;
            const tpl = this.activeTemplateId ? this.templates.find(t => t.id === this.activeTemplateId) : null;
            
            const response = await this.api.post(route, { 
                canvas_id: this.canvasIntId,
                img_url: tpl ? tpl.img.src : '',
                x: tpl ? tpl.x : 0,
                y: tpl ? tpl.y : 0,
                w: tpl ? tpl.w : 100,
                h: tpl ? tpl.h : 100,
                opacity: tpl ? 0.5 : 0,
                angle: tpl ? (tpl.angle || 0) : 0
            }, this.abortController.signal);
            
            if (response.aborted) return false;

            if (response.success && response.data?.code) {
                this.liveShareStatus = 'owner';
                this.liveShareCode = response.data.code;
                this.liveTemplateId = this.activeTemplateId;
                this.liveShareCountVal = 1;
                
                if (tpl) {
                    tpl.opacity = 0.5;
                }
                
                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });
                }

                let badge = document.querySelector('[data-badge-id="live-share-badge"]');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'component-badge';
                    badge.setAttribute('data-badge-id', 'live-share-badge');
                    badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso (1 en línea)</span>';
                    const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                    if (badgesContainer) badgesContainer.appendChild(badge);
                } else {
                    badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso (1 en línea)</span>';
                }

                showMessage(__('msg_broadcasting').replace(':code', this.liveShareCode), 'success');
                return true;
            } else {
                showMessage(response.message || __('err_live_code_gen'), 'error');
                return false;
            }
        } catch (error) {
            console.error('[DesignNetwork] Error starting live share:', error);
            showMessage(__('err_server_live_start'), 'error');
            return false;
        }
    },

    async stopLiveShare() {
        if (this.liveShareStatus !== 'owner') return false;
        
        try {
            const route = ApiRoutes.Canvases.StopLiveShare;
            await this.api.post(route, { canvas_id: this.canvasIntId }, this.abortController.signal);
        } catch (e) {
            console.error('[DesignNetwork] Error calling stopLiveShare API:', e);
        }

        if (this.wsManager && this.liveShareCode) {
            this.wsManager.send({ type: 'end_live_share', code: this.liveShareCode });
        }

        this.liveShareStatus = 'none';
        this.liveShareCode = null;
        this.liveTemplateId = null;
        this.liveShareCountVal = null;

        const badge = document.querySelector('[data-badge-id="live-share-badge"]');
        if (badge) badge.remove();

        const codeBadge = document.querySelector('[data-badge-id="live-share-code-badge"]');
        if (codeBadge) codeBadge.remove();

        const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
        if (btnOpenJoinLive) {
            btnOpenJoinLive.classList.remove('disabled-interaction', 'disabled');
            btnOpenJoinLive.removeAttribute('title');
        }

        const btnToggleLive = document.querySelector('[data-action="toggleLiveBroadcast"]');
        if (btnToggleLive) {
            btnToggleLive.classList.remove('component-color-indicator');
            btnToggleLive.style.removeProperty('--active-color');
        }

        showMessage(__('msg_broadcast_stopped'), 'info');
        return true;
    },

    async joinLiveImageSession(code) {
        if (!code) return false;
        
        const btn = document.querySelector('[data-action="submitJoinLive"]');
        if (btn) setButtonLoading(btn);

        try {
            const route = ApiRoutes.Canvases.JoinLiveShare;
            
            const response = await this.api.post(route, { 
                code: code,
                canvas_id: this.canvasIntId 
            }, this.abortController.signal);
            
            if (response.aborted) return false;

            if (response.success && response.data) {
                this.liveShareStatus = 'spectator';
                this.liveShareCode = code;
                this.liveShareCountVal = null;
                
                const liveId = `live_tpl_${code}`;
                this.liveTemplateId = liveId;

                let tpl = this.templates.find(t => t.id === liveId);
                if (!tpl) {
                    if (response.data.empty || !response.data.img_url) {
                        this.activeTemplateId = liveId;
                        let badge = document.querySelector('[data-badge-id="live-share-badge"]');
                        const countText = this.liveShareCountVal ? ` (${this.liveShareCountVal} en línea)` : '';
                        if (!badge) {
                            badge = document.createElement('div');
                            badge.className = 'component-badge';
                            badge.setAttribute('data-badge-id', 'live-share-badge');
                            badge.innerHTML = `<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso${countText}</span>`;
                            const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                            if (badgesContainer) badgesContainer.appendChild(badge);
                        } else {
                            badge.innerHTML = `<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso${countText}</span>`;
                        }
                    } else {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        
                        await new Promise((resolve) => {
                            img.onload = () => {
                                this.templates.push({
                                    id: liveId,
                                    img: img,
                                    x: response.data.x !== undefined && response.data.x !== null ? parseInt(response.data.x) : 0,
                                    y: response.data.y !== undefined && response.data.y !== null ? parseInt(response.data.y) : 0,
                                    w: response.data.w !== undefined && response.data.w !== null ? parseInt(response.data.w) : img.width,
                                    h: response.data.h !== undefined && response.data.h !== null ? parseInt(response.data.h) : img.height,
                                    opacity: response.data.empty ? 0 : (response.data.opacity !== undefined && response.data.opacity !== null ? parseFloat(response.data.opacity) : 0.5),
                                    angle: response.data.angle !== undefined && response.data.angle !== null ? parseFloat(response.data.angle) : 0,
                                    locked: true, 
                                    url: img.src
                                });
                                this.activeTemplateId = liveId;
                                
                                let badge = document.querySelector('[data-badge-id="live-share-badge"]');
                                const countText = this.liveShareCountVal ? ` (${this.liveShareCountVal} en línea)` : '';
                                if (!badge) {
                                    badge = document.createElement('div');
                                    badge.className = 'component-badge';
                                    badge.setAttribute('data-badge-id', 'live-share-badge');
                                    badge.innerHTML = `<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso${countText}</span>`;
                                    const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                                    if (badgesContainer) badgesContainer.appendChild(badge);
                                } else {
                                    badge.innerHTML = `<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso${countText}</span>`;
                                }
                                
                                resolve();
                            };
                            img.onerror = () => {
                                if (img.crossOrigin) {
                                    img.crossOrigin = null;
                                    img.src = response.data.img_url;
                                } else {
                                    showMessage(__('err_load_live_img'), 'error');
                                    resolve();
                                }
                            };
                            img.src = response.data.img_url;
                        });
                    }
                } else {
                    let badge = document.querySelector('[data-badge-id="live-share-badge"]');
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.className = 'component-badge';
                        badge.setAttribute('data-badge-id', 'live-share-badge');
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
    
    leaveLiveImageSession() {
        if (this.liveShareStatus !== 'spectator') return false;
        
        if (this.wsManager && this.liveShareCode) {
            this.wsManager.send({ type: 'leave_live_share', code: this.liveShareCode });
        }

        if (this.liveTemplateId) {
            this.templates = this.templates.filter(t => t.id !== this.liveTemplateId);
            if (this.activeTemplateId === this.liveTemplateId) {
                this.activeTemplateId = null;
            }
        }

        this.liveShareStatus = 'none';
        this.liveShareCode = null;
        this.liveTemplateId = null;
        this.liveShareCountVal = null;

        const badge = document.querySelector('[data-badge-id="live-share-badge"]');
        if (badge) badge.remove();

        const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
        if (btnOpenJoinLive) {
            btnOpenJoinLive.classList.remove('component-color-indicator');
            btnOpenJoinLive.style.removeProperty('--active-color');
            btnOpenJoinLive.setAttribute('data-tooltip', (typeof window.__ === 'function' ? window.__('tooltip_join_live', []) : 'Unirse a transmisión') + ' [J]');
            const icon = btnOpenJoinLive.querySelector('.material-symbols-rounded');
            if (icon) icon.textContent = 'sensors';
        }

        if (typeof this.updateTemplateUI === 'function') this.updateTemplateUI();
        this.requestRender();

        const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
        showMessage(__('msg_left_live_share', [], 'Has abandonado la transmisión'), 'info');
        return true;
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
            img_url: tpl.url || tpl.src || (tpl.img ? tpl.img.src : null),
            x: tpl.x,
            y: tpl.y,
            w: tpl.w,
            h: tpl.h,
            opacity: 0.5,
            angle: tpl.angle || 0
        });
    },

    async handleLiveImageUpdate(data) {
        if (this.liveShareStatus === 'spectator' && this.liveShareCode === data.code) {
            let tpl = this.templates.find(t => t.id === this.liveTemplateId);
            if (data.empty) {
                if (tpl) {
                    tpl.opacity = 0; // Hide the template if the owner deleted it but kept the session open
                    this.requestRender();
                }
                return;
            }

            if (!tpl) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        tpl = {
                            id: this.liveTemplateId,
                            img: img,
                            x: data.x !== undefined && data.x !== null ? parseInt(data.x) : 0,
                            y: data.y !== undefined && data.y !== null ? parseInt(data.y) : 0,
                            w: data.w !== undefined && data.w !== null ? parseInt(data.w) : img.width,
                            h: data.h !== undefined && data.h !== null ? parseInt(data.h) : img.height,
                            opacity: data.opacity !== undefined && data.opacity !== null ? parseFloat(data.opacity) : 0.5,
                            angle: data.angle !== undefined && data.angle !== null ? parseFloat(data.angle) : 0,
                            locked: true,
                            url: img.src
                        };
                        this.templates.push(tpl);
                        this.activeTemplateId = this.liveTemplateId;
                        resolve();
                    };
                    img.onerror = () => {
                        if (img.crossOrigin) {
                            img.crossOrigin = null;
                            img.src = data.img_url;
                        } else {
                            resolve();
                        }
                    };
                    img.src = data.img_url;
                });
                this.requestRender();
                return;
            }

            if (data.img_url && tpl.url !== data.img_url) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise((resolve) => {
                    img.onload = () => {
                        tpl.img = img;
                        tpl.url = img.src;
                        tpl.x = data.x !== undefined && data.x !== null ? parseInt(data.x) : tpl.x;
                        tpl.y = data.y !== undefined && data.y !== null ? parseInt(data.y) : tpl.y;
                        tpl.w = data.w !== undefined && data.w !== null ? parseInt(data.w) : tpl.w;
                        tpl.h = data.h !== undefined && data.h !== null ? parseInt(data.h) : tpl.h;
                        tpl.opacity = data.opacity !== undefined && data.opacity !== null ? parseFloat(data.opacity) : 0.5;
                        tpl.angle = data.angle !== undefined && data.angle !== null ? parseFloat(data.angle) : 0;
                        
                        if (tpl.imageBitmap) {
                            tpl.imageBitmap.close();
                        }
                        tpl.imageBitmap = null;
                        tpl._bitmapSentToWorker = false;
                        resolve();
                    };
                    img.onerror = () => {
                        if (img.crossOrigin) {
                            img.crossOrigin = null;
                            img.src = data.img_url;
                        } else {
                            resolve();
                        }
                    };
                    img.src = data.img_url;
                });
                this.requestRender();
                return;
            }

            tpl.x = data.x !== undefined && data.x !== null ? parseInt(data.x) : tpl.x;
            tpl.y = data.y !== undefined && data.y !== null ? parseInt(data.y) : tpl.y;
            tpl.w = data.w !== undefined && data.w !== null ? parseInt(data.w) : tpl.w;
            tpl.h = data.h !== undefined && data.h !== null ? parseInt(data.h) : tpl.h;
            tpl.opacity = data.opacity !== undefined && data.opacity !== null ? parseFloat(data.opacity) : 0.5;
            tpl.angle = data.angle !== undefined && data.angle !== null ? parseFloat(data.angle) : 0;
            this.requestRender();
        }
    },

    handleLiveSessionEnded(data) {
        if (this.liveShareStatus === 'spectator' && this.liveShareCode === data.code) {
            showMessage(__('info_live_ended'), 'info');
            this.liveShareStatus = 'none';
            this.liveShareCode = null;
            this.liveShareCountVal = null;
            
            const badge = document.querySelector('[data-badge-id="live-share-badge"]');
            if (badge) badge.remove();

            const codeBadge = document.querySelector('[data-badge-id="live-share-code-badge"]');
            if (codeBadge) codeBadge.remove();

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
                btnOpenJoinLive.classList.remove('disabled-interaction', 'disabled', 'component-color-indicator');
                btnOpenJoinLive.style.removeProperty('--active-color');
                btnOpenJoinLive.removeAttribute('title');
                btnOpenJoinLive.setAttribute('data-tooltip', (typeof window.__ === 'function' ? window.__('tooltip_join_live', []) : 'Unirse a transmisión') + ' [J]');
                const icon = btnOpenJoinLive.querySelector('.material-symbols-rounded');
                if (icon) icon.textContent = 'sensors';
            }

            this.requestRender();
        }
    },

    handleLiveShareCount(data) {
        if (this.liveShareCode === data.code) {
            this.liveShareCountVal = data.count;
            const badge = document.querySelector('[data-badge-id="live-share-badge"]');
            if (badge) {
                badge.innerHTML = `<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso (${data.count} en línea)</span>`;
            }
        }
    },

    handleCooldownSync(data) {
        if (data.type === 'init_cooldown' && data.node_id) {
            console.log(`[Network] Connected to WebSocket server: ${data.node_id}`);
        }

        this.isCooldownSynced = true;
        if (data.balance !== undefined) this.cooldownBalance = Number(data.balance);
        if (data.max_batch !== undefined) this.cooldownMax = Number(data.max_batch);
        if (data.cooldown_sec !== undefined) this.cooldownSec = Number(data.cooldown_sec);
        if (data.next_replenish_in !== undefined) {
            this.cooldownNextIn = Number(data.next_replenish_in);
            this.lastSyncTime = Date.now();
        }

        if (data.type === 'cooldown_error') {
            showMessage(__('err_sync_limit'), 'warning');
        }

        this.updateSelectionUI();
        if (typeof this.updateOwnerBadges === 'function') {
            this.updateOwnerBadges();
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
            let response;
            if (window.__INITIAL_CANVAS_DATA__ && window.__INITIAL_CANVAS_DATA__.data && String(window.__INITIAL_CANVAS_DATA__.data.id) === String(this.canvasIntId)) {
                response = window.__INITIAL_CANVAS_DATA__;
                window.__INITIAL_CANVAS_DATA__ = null; // Clean up memory
            } else {
                response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId }, this.abortController.signal);
            }
            if (response.aborted) return;
            
            const isPremiumLocked = response.locked_requires_downgrade || (response.data && response.data.locked_requires_downgrade);
            if (isPremiumLocked) {
                this.applyCanvasRoleState('premium_locked', response.data || null);
                if (response.data) {
                    if (typeof this.initCanvasData === 'function') {
                        this.initCanvasData(response.data);
                    } else if (response.data.state_base64) {
                        this.hydrateCanvasState(response.data.state_base64);
                    }
                }
                return;
            }

            if (response.success && response.data) {
                const role = response.data.role || 'spectator';
                this.applyCanvasRoleState(role, response.data);

                if (typeof this.initCanvasData === 'function') {
                    this.initCanvasData(response.data);
                } else if (response.data.state_base64) {
                    this.hydrateCanvasState(response.data.state_base64);
                }
            } else {
                if (this.canvasPrivacy === 'private') {
                    this.applyCanvasRoleState('blocked', null);
                } else {
                    this.applyCanvasRoleState('spectator', null);
                }
            }
        } catch (error) {
            this.applyCanvasRoleState(this.canvasPrivacy === 'private' ? 'blocked' : 'spectator', null);
        }
    },

    applyCanvasRoleState(role, data = null) {
        const prevSpectator = this.isSpectator;
        const isPremiumLocked = !!(data?.locked_requires_downgrade || this.isSubscriptionLocked);
        
        if (isPremiumLocked) {
            this.isSubscriptionLocked = true;
            this.isSpectator = true;
            this.isPrivateBlocked = (role === 'blocked');
            this.canvasRole = 'premium_locked';
        } else if (role === 'blocked') {
            this.isSubscriptionLocked = false;
            this.isSpectator = true;
            this.isPrivateBlocked = true;
            this.canvasRole = 'blocked';
        } else if (role === 'editor' || role === 'admin' || role === 'owner') {
            this.isSubscriptionLocked = false;
            this.isSpectator = false;
            this.isPrivateBlocked = false;
            this.isOwner = (role === 'admin' || role === 'owner' || !!data?.is_owner);
            this.canvasRole = role;
        } else {
            this.isSubscriptionLocked = false;
            this.isSpectator = true;
            this.isPrivateBlocked = (this.canvasPrivacy === 'private' && !data?.is_member);
            this.canvasRole = 'spectator';
        }

        // Reconciliar elementos de interfaz
        this.setRoleUI(this.canvasRole, data);

        // Notificar y sincronizar con el Web Worker de Renderizado
        if (typeof this.requestRender === 'function') {
            this.requestRender();
        }

        // Si el usuario transitó de espectador a miembro autorizado:
        if (prevSpectator && !this.isSpectator) {
            // 1. Handshake WebSocket inmediato con credenciales del usuario para sincronizar cooldown y balance
            if (this.wsManager) {
                const uid = window.activeUserId || '';
                this.wsManager.send({ type: 'init', userId: uid, version: '2.0.3' });
            }


            // 3. Reconciliar selección e interfaz
            this.updateSelectionUI();
            if (typeof this.updateOwnerBadges === 'function') {
                this.updateOwnerBadges();
            }
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
        const btnOwnerTools = document.querySelector('[data-ref="btn-owner-tools"]');

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
        } else if (role === 'spectator') {
            if (this.canvas) {
                this.canvas.classList.remove('component-canvas-blocked');
                this.canvas.classList.remove('disabled-interaction');
            }

            if (specControls) {
                specControls.classList.remove('disabled');
                specControls.classList.add('active');
            }
            if (designTools) {
                designTools.classList.remove('active');
                designTools.classList.add('disabled');
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
        } else if (role === 'editor' || role === 'admin' || role === 'owner') {
            if (this.canvas) {
                this.canvas.classList.remove('component-canvas-blocked');
                this.canvas.classList.remove('disabled-interaction');
            }

            if (specControls) {
                specControls.classList.remove('active');
                specControls.classList.add('disabled');
            }
            if (designTools) {
                designTools.classList.remove('disabled');
                designTools.classList.add('active');
            }
            if (actionPill) actionPill.classList.remove('disabled');
            if (cooldownBadge) cooldownBadge.classList.remove('disabled');
            if (specBadge) specBadge.classList.add('disabled');
            if (privBadge) privBadge.classList.add('disabled');
            if (premBadge) premBadge.classList.add('disabled');

            if (btnOwnerTools) {
                if (this.isOwner) {
                    btnOwnerTools.classList.remove('disabled');
                } else {
                    btnOwnerTools.classList.add('disabled');
                }
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
            
            if (response.joined || (response.message && response.message.toLowerCase().includes('unido'))) {
                // Sincronización instantánea a miembro en tiempo real
                this.applyCanvasRoleState('editor', { is_member: true });
                this.checkCanvasAccess();
            } else {
                btn.classList.add('disabled-interaction');
                btn.innerHTML = `<span class="material-symbols-rounded">hourglass_empty</span> ${__('btn_pending')}`;
            }
        } else {
            showMessage(response.message, 'error');
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
    },

    updateFreezeUI() {
        if (typeof this.updateLockBadges === 'function') {
            this.updateLockBadges();
        }
        if (typeof this.updateOwnerBadges === 'function') {
            this.updateOwnerBadges();
        }
        this.requestRender();
    },

    handleCanvasModeChanged(data) {
        if (!data) return;
        const newMode = data.mode || (data.is_online_active ? 'online' : 'offline');
        if (newMode === 'offline') {
            if (!this.isOwner) {
                showMessage(window.__('msg_canvas_mode_deactivated_by_owner'), 'info');
                if (this.wsManager) {
                    this.wsManager.disconnect();
                }
                setTimeout(() => {
                    window.location.href = (window.AppBasePath || '') + '/';
                }, 2000);
            } else {
                if (!this._isChangingMode) {
                    showMessage(window.__('msg_canvas_offline_deactivated'), 'info');
                    setTimeout(() => window.location.reload(), 600);
                }
            }
        } else if (newMode === 'online') {
            if (!this._isChangingMode) {
                showMessage(window.__('msg_canvas_online_activated'), 'success');
                setTimeout(() => window.location.reload(), 600);
            }
        }
    },

    async toggleOnlineMode(action = 'activate', btnElement = null) {
        const btn = btnElement || document.querySelector('[data-action="toggleOnlineMode"]');
        if (btn) setButtonLoading(btn);
        this._isChangingMode = true;

        try {
            if (this.isOfflineMode && this._offlineDirty && typeof this.saveOfflineCanvasState === 'function') {
                await this.saveOfflineCanvasState(true);
            }

            const route = action === 'activate' ? ApiRoutes.Canvases.ActivateOnline : ApiRoutes.Canvases.DeactivateOnline;
            const minWait = new Promise(r => setTimeout(r, 450));
            const [resp] = await Promise.all([
                this.api.post(route, { canvas_id: this.canvasIntId }),
                minWait
            ]);

            if (resp && resp.success) {
                const successMsg = resp.message || (action === 'activate' 
                    ? window.__('msg_canvas_online_activated')
                    : window.__('msg_canvas_offline_deactivated'));
                showMessage(successMsg, 'success');
                setTimeout(() => window.location.reload(), 500);
            } else {
                if (btn) restoreButton(btn);
                this._isChangingMode = false;
                showMessage(resp?.message || window.__('err_occurred'), 'error');
            }
        } catch (e) {
            if (btn) restoreButton(btn);
            this._isChangingMode = false;
            showMessage(window.__('err_occurred'), 'error');
        }
    },

    async manualSaveOffline(btnElement = null) {
        const btn = btnElement || document.querySelector('[data-action="manualSaveOffline"]');
        if (btn) setButtonLoading(btn);

        const minWait = new Promise(r => setTimeout(r, 450));
        const [success] = await Promise.all([
            this.saveOfflineCanvasState(true),
            minWait
        ]);

        if (btn) {
            restoreButton(btn);
            if (success) {
                showMessage(window.__('msg_state_saved'), 'success');
            } else {
                showMessage(window.__('err_occurred'), 'error');
            }
        }
    },

    async saveOfflineCanvasState(immediate = false) {
        if (!this.isOfflineMode || !this.canvasIntId) {
            return false;
        }

        this._offlineDirty = true;

        if (this._offlineSavePromise) {
            if (!immediate) {
                this._offlineHasPendingChanges = true;
                return this._offlineSavePromise;
            }
            try { await this._offlineSavePromise; } catch (e) {}
            if (!this._offlineDirty) return true;
        }

        const performSave = async () => {
            if (!this._offlineDirty && !this._offlineHasPendingChanges) return true;
            this._offlineDirty = false;
            this._offlineHasPendingChanges = false;
            this._offlineSaving = true;

            try {
                let base64Data = null;
                let layersData = null;
                if (this.renderWorker) {
                    const exported = await new Promise((resolve) => {
                        let timeoutId = null;
                        const handler = (e) => {
                            if (e.data?.type === 'OFFLINE_STATE_EXPORTED') {
                                if (timeoutId) clearTimeout(timeoutId);
                                this.renderWorker.removeEventListener('message', handler);
                                resolve(e.data.payload);
                            }
                        };
                        this.renderWorker.addEventListener('message', handler);
                        this.renderWorker.postMessage({ type: 'EXPORT_OFFLINE_STATE' });
                        timeoutId = setTimeout(() => {
                            this.renderWorker.removeEventListener('message', handler);
                            resolve(null);
                        }, 3000);
                    });
                    base64Data = exported?.base64 || null;
                    layersData = exported?.layersData || null;

                    if (layersData && this.canvasIntId) {
                        try {
                            localStorage.setItem(`rosaura_layers_${this.canvasIntId}`, JSON.stringify(layersData));
                        } catch (e) {}
                    }
                } else if (this.offscreenCtx) {
                    const imgData = this.offscreenCtx.getImageData(0, 0, this.boardWidth, this.boardHeight);
                    const bytes = imgData.data;
                    const len = bytes.byteLength;
                    let binaryStr = '';
                    const chunkSize = 0x8000;
                    for (let i = 0; i < len; i += chunkSize) {
                        binaryStr += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
                    }
                    base64Data = btoa(binaryStr);
                }

                if (base64Data) {
                    const resp = await this.api.post(ApiRoutes.Canvases.SaveOfflineState, {
                        canvas_id: this.canvasIntId,
                        state_base64: base64Data
                    });
                    if (resp && resp.success) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            } catch (err) {
                return false;
            } finally {
                this._offlineSaving = false;
                this._offlineSavePromise = null;
                if (this._offlineHasPendingChanges) {
                    this._offlineHasPendingChanges = false;
                    this.saveOfflineCanvasState(false);
                }
            }
        };

        if (immediate) {
            if (this._offlineSaveTimeout) clearTimeout(this._offlineSaveTimeout);
            this._offlineSavePromise = performSave();
            return await this._offlineSavePromise;
        }

        if (this._offlineSaveTimeout) clearTimeout(this._offlineSaveTimeout);
        this._offlineSaveTimeout = setTimeout(() => {
            this._offlineSavePromise = performSave();
        }, 1200);
        return true;
    }
};