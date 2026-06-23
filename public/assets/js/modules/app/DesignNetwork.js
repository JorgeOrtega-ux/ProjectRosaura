// public/assets/js/modules/app/DesignNetwork.js
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';
import { WebSocketManager } from '../../core/api/WebSocketManager.js';
import { getPaletteById } from './DesignPaletteUtils.js';

export const DesignNetwork = {
    initWebSocket() {
        console.log('[DEBUG DesignNetwork] initWebSocket() llamado. CanvasIntId:', this.canvasIntId);
        if (!this.canvasIntId) {
            console.warn('[DEBUG DesignNetwork] initWebSocket abortado: no hay canvasIntId.');
            return;
        }

        this.wsManager = new WebSocketManager();
        
        this.wsManager.on('open', () => {
            const uid = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
            console.log(`[DEBUG DesignNetwork] Evento 'open' detectado. Enviando init con userId: ${uid}`);
            this.wsManager.send({ type: 'init', userId: uid });
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
                console.log(`[DEBUG DesignNetwork] Disparando handleCooldownSync por evento tipo: ${data.type}`);
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
            // ----------------------------
        });

        this.wsManager.connect(this.canvasIntId);
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
            // Reemplaza esto con tu ruta real en route-map.php
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
                
                // Entrar a la sala WebSocket
                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });
                }

                // UI
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
        
        // Avisar al servidor
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
            // Usamos la ruta oficial recién registrada
            const route = ApiRoutes.Canvases?.JoinLiveShare || 'canvases.join_live_share';
            
            // CORRECCIÓN AQUÍ: Usar .post y pasar el payload { code: code }
            const response = await this.api.post(route, { code: code });

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
                                locked: true, // Bloqueado para el espectador
                                url: img.src
                            });
                            this.activeTemplateId = liveId;
                            resolve();
                        };
                        img.onerror = resolve; 
                    });
                }

                // Entrar a la sala WebSocket
                if (this.wsManager) {
                    this.wsManager.send({ type: 'join_live_share', code: this.liveShareCode });
                }

                showMessage(`Unido a la transmisión: ${code}`, 'success');
                this.requestRender();

            } else {
                showMessage(response.message || 'Código inválido o sesión terminada.', 'error');
            }
        } catch (error) {
            console.error('[LiveShare Join Error]:', error);
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
                // Actualizar suavemente (DesignRender se encargará de pintarlo en el requestRender)
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
            
            // Opcional: Eliminar la plantilla cuando termine
            this.templates = this.templates.filter(t => t.id !== this.liveTemplateId);
            this.activeTemplateId = null;
            this.liveTemplateId = null;
            
            this.requestRender();
        }
    },
    // -----------------------------

    handleCooldownSync(data) {
        console.log(`[DEBUG DesignNetwork] handleCooldownSync ejecutado. Data entrante:`, data);
        this.cooldownBalance = data.balance;
        this.cooldownMax = data.max_batch;
        this.cooldownSec = data.cooldown_sec;
        this.cooldownNextIn = data.next_replenish_in;
        this.lastSyncTime = Date.now();
        
        console.log(`[DEBUG DesignNetwork] Estado interno actualizado -> Balance: ${this.cooldownBalance}/${this.cooldownMax}, Sig. recarga en: ${this.cooldownNextIn}s`);
        
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
        
        // Disparar la alerta visual en vivo para todos los clientes en la sesión
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
            if (designTools) designTools.classList.replace('active', 'disabled');
            
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
            if (designTools) designTools.classList.replace('disabled', 'active');
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
                        console.warn("Error parseando línea del timelapse:", e);
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
                console.error("Error reproduciendo el timelapse:", err);
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