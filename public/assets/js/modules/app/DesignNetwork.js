// public/assets/js/modules/app/DesignNetwork.js
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';
import { WebSocketManager } from '../../core/api/WebSocketManager.js';
import { getPaletteById } from './DesignPaletteUtils.js';

export const DesignNetwork = {
    // --- LÓGICA DE TICKETS Y WEBSOCKET ---
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
                        setTimeout(() => window.turnstile.reset(wrapper), 1000); // Resetear por si se requiere después
                    },
                    'error-callback': function() {
                        reject(new Error('Fallo en validación Turnstile.'));
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

        // Si es invitado, obtener validación de Turnstile primero
        if (!uid) {
            try {
                turnstileToken = await this.getTurnstileToken();
            } catch (e) {
                showMessage('Validación de seguridad fallida. Recarga la página.', 'error');
                return;
            }
        }

        try {
            // Reclamar el Ticket HTTP
            const route = ApiRoutes.Canvases?.GetWsTicket || 'canvases.get_ws_ticket';
            const payload = { canvas_id: this.canvasIntId };
            if (turnstileToken) {
                payload['cf-turnstile-response'] = turnstileToken;
            }

            const response = await this.api.post(route, payload);
            if (!response.success || !response.data?.ticket) {
                showMessage(response.message || 'No se pudo obtener acceso en vivo.', 'error');
                return;
            }

            const wsTicket = response.data.ticket;

            this.wsManager = new WebSocketManager();
            
            this.wsManager.on('open', () => {
                this.wsManager.send({ type: 'init', userId: uid });
            });

            this.wsManager.on('qos_evicted', (reason) => {
                showMessage(reason || 'Servidor lleno. Se ha dado prioridad a usuarios registrados.', 'warning');
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
                // --- LISTENERS LIVE SHARE ---
                else if (data.type === 'live_image_updated') {
                    this.handleLiveImageUpdate(data);
                }
                else if (data.type === 'live_session_ended') {
                    this.handleLiveSessionEnded(data);
                }
            });

            // Conectar enviando el ticket
            this.wsManager.connect(this.canvasIntId, wsTicket);

            // Reemplazar lógica de reconexión para forzar la petición de un NUEVO ticket
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

                        const res = await this.api.post(route, p);
                        if (res.success && res.data?.ticket) {
                            this.wsManager.connect(this.canvasIntId, res.data.ticket);
                        } else {
                            this.wsManager.handleReconnect();
                        }
                    }, delay);
                } else {
                    showMessage('Desconectado del servidor tras múltiples intentos.', 'error');
                }
            };

        } catch (error) {
            showMessage('Fallo de conexión al inicializar WebSocket.', 'error');
        }
    },

    // --- MÉTODOS DE LIVE SHARE ---
    
    async startLiveShare() {
        if (!this.activeTemplateId) {
            showMessage('Selecciona una plantilla primero', 'warning');
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
            });

            if (response.success && response.data?.code) {
                this.liveShareStatus = 'owner';
                this.liveShareCode = response.data.code;
                this.liveTemplateId = this.activeTemplateId;
                
                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });
                }

                if (btn) btn.style.display = 'none';
                if (this.uiLiveControls) this.uiLiveControls.style.display = 'flex';
                if (this.uiLiveCode) this.uiLiveCode.textContent = this.liveShareCode;
                
                if (this.uiLiveInputX) this.uiLiveInputX.value = tpl.x;
                if (this.uiLiveInputY) this.uiLiveInputY.value = tpl.y;
                if (this.uiLiveInputOpacity) this.uiLiveInputOpacity.value = tpl.opacity || 1;

                showMessage(`Transmitiendo plantilla: ${this.liveShareCode}`, 'success');
            } else {
                showMessage('Error al generar código en vivo.', 'error');
            }
        } catch (error) {
            showMessage('Error de servidor al iniciar transmisión.', 'error');
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
        if (btn) btn.style.display = 'block';
        if (this.uiLiveControls) this.uiLiveControls.style.display = 'none';

        showMessage('Transmisión detenida.', 'info');
    },

    async joinLiveImageSession(code) {
        if (!code) return;
        
        const btn = document.querySelector('[data-action="joinLiveShare"]');
        if (btn) setButtonLoading(btn);

        try {
            const route = ApiRoutes.Canvases?.JoinLiveShare || 'canvases.join_live_share';
            
            // CORRECCIÓN: Se envía explícitamente el canvas actual en el que se intenta proyectar
            const response = await this.api.post(route, { 
                code: code,
                canvas_id: this.canvasIntId 
            });

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

                showMessage(`Unido a la transmisión: ${code}`, 'success');
                this.requestRender();

            } else {
                showMessage(response.message || 'Código inválido o sesión terminada.', 'error');
            }
        } catch (error) {
            showMessage('Error al unirse a la sesión.', 'error');
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
            showMessage('La sesión en vivo ha sido finalizada por el dueño.', 'info');
            this.liveShareStatus = 'none';
            this.liveShareCode = null;
            
            this.templates = this.templates.filter(t => t.id !== this.liveTemplateId);
            this.activeTemplateId = null;
            this.liveTemplateId = null;
            
            this.requestRender();
        }
    },
    // -----------------------------

    handleCooldownSync(data) {
        // Guardia estricta: Si es espectador, no sincronizamos ni encendemos UI
        if (this.isSpectator) {
            return;
        }

        this.cooldownBalance = data.balance;
        this.cooldownMax = data.max_batch;
        this.cooldownSec = data.cooldown_sec;
        this.cooldownNextIn = data.next_replenish_in;
        this.lastSyncTime = Date.now();
        
        if (data.type === 'cooldown_error') {
            showMessage('Error de sincronización o límite alcanzado. Estado revertido.', 'warning');
        }
        
        this.updateSelectionUI();
    },

    handleCanvasLocked(data) {
        this.isResetLocked = true;
        const overlay = document.querySelector('[data-ref="reset-locked-overlay"]');
        if (overlay) overlay.classList.remove('disabled');
        
        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();
    },
    
    handleCanvasCleared(data) {
        this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();
        
        this.isResetLocked = false;
        const overlay = document.querySelector('[data-ref="reset-locked-overlay"]');
        if (overlay) overlay.classList.add('disabled');
        
        showMessage('El lienzo ha sido limpiado en este momento.', 'info');
        
        if (data.next_reset_at) {
            this.nextResetAt = data.next_reset_at;
            this.startResetTimer();
        }
    },

    async checkCanvasAccess() {
        if (!this.canvasIntId || this.canvasIntId === '0') return;

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasIntId });
            
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
        const overlayBlocked = document.querySelector('[data-ref="private-blocked-overlay"]');
        const specControls = document.querySelector('[data-ref="spectator-controls"]');
        const designTools = document.querySelector('[data-ref="design-tools-actions"]');
        
        const actionPill = document.querySelector('.component-action-pill'); 
        
        const btnJoin = document.querySelector('[data-ref="btn-join-direct"]');
        const btnRequest = document.querySelector('[data-ref="btn-request-access"]');

        if (role === 'blocked') {
            if (overlayBlocked) overlayBlocked.classList.remove('disabled');
        } else {
            if (overlayBlocked) overlayBlocked.classList.add('disabled');
        }

        if (role === 'spectator') {
            if (specControls) {
                specControls.classList.remove('disabled');
                specControls.classList.add('active');
                specControls.style.display = 'flex';
            }
            if (designTools) {
                designTools.classList.replace('active', 'disabled');
                designTools.style.display = 'none'; 
            }
            if (actionPill) {
                actionPill.style.display = 'none'; 
            }
            
            if (this.canvasApproval) {
                if (btnJoin) btnJoin.style.display = 'none';
                if (btnRequest) btnRequest.style.display = 'block';
            } else {
                if (btnJoin) btnJoin.style.display = 'block';
                if (btnRequest) btnRequest.style.display = 'none';
            }
        } 
        else if (role === 'editor' || role === 'admin') {
            if (specControls) {
                specControls.classList.add('disabled');
                specControls.classList.remove('active');
                specControls.style.display = 'none';
            }
            if (designTools) {
                designTools.classList.replace('disabled', 'active');
                designTools.style.display = 'flex'; 
            }
            if (actionPill) {
                actionPill.style.display = 'block'; 
            }
        }
    },

    async handleAccessRequest(btn) {
        if (!this.canvasIntId) return;
        setButtonLoading(btn);

        const response = await this.api.post(ApiRoutes.Canvases.RequestAccess, { canvas_id: this.canvasIntId });
        restoreButton(btn);

        if (response.success) {
            showMessage(response.message, 'success');
            
            if (response.message.toLowerCase().includes('unido')) {
                setTimeout(() => window.location.reload(), 1000);
            } else {
                btn.classList.add('disabled-interactive');
                btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Pendiente';
            }
        } else {
            showMessage(response.message, 'error');
        }
    },

    async startTimelapse() {
        if (!this.canvasIntId || this.timelapseActive || this.isResetLocked) return;
        this.timelapseActive = true;
        
        const route = ApiRoutes.Canvases?.GetTimelapse || 'canvas/get_timelapse';

        this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();

        try {
            const response = await this.api.stream(route, { id: this.canvasIntId }, this.abortController.signal);
            
            if (!response.success) {
                showMessage(response.message || 'Error al cargar timelapse.', 'error');
                this.timelapseActive = false;
                this.checkCanvasAccess(); 
                return;
            }

            const reader = response.reader;
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                if (this.isResetLocked) break;

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
            
            if (buffer.trim() && !this.isResetLocked) {
                try {
                    const event = JSON.parse(buffer);
                    this._drawTimelapsePixel(event);
                    this.requestRender();
                } catch(e) {}
            }

            if (!this.isResetLocked) showMessage('Timelapse finalizado.', 'success');

        } catch (err) {
            if (err.name !== 'AbortError') {
                showMessage('Error reproduciendo el timelapse.', 'error');
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