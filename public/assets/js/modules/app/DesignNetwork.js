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
        });

        this.wsManager.connect(this.canvasIntId);
    },

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