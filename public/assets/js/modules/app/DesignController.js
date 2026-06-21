// public/assets/js/modules/app/DesignController.js
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';
import { WebSocketManager } from '../../core/api/WebSocketManager.js';

/**
 * Función helper local para obtener una paleta por su ID. 
 * Lee desde la variable global inyectada por PHP (window.APP_PALETTES).
 * Si el ID no existe (o es nulo), retorna la paleta 'default' por seguridad.
 * @param {string} paletteId 
 * @returns {object} Objeto de la paleta
 */
function getPaletteById(paletteId) {
    if (!window.APP_PALETTES) {
        console.error("Error Crítico: window.APP_PALETTES no está definido. Asegúrate de inyectar palettes.json desde PHP en el layout.");
        return { colors: ['#000000'] }; // Fallback de emergencia extrema
    }
    return window.APP_PALETTES[paletteId] || window.APP_PALETTES['default'];
}

class DesignController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.wsManager = null;
        
        const urlParams = new URLSearchParams(window.location.search);
        this.canvasId = urlParams.get('id');

        this.canvas = null;
        this.ctx = null;
        this.boardWidth = 2000;
        this.boardHeight = 1000;
        this.canvasPaletteId = 'default';
        
        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.hoveredPixel = null;
        
        this.selectedPixels = new Set();
        this.isSelecting = false;
        this.selectionMode = 'add';
        this.btnPlacePixels = null;
        this.txtPlacePixels = null;
        
        this.coordsText = null;
        this.btnColorPalette = null;
        this.fileInput = null;

        this.templates = [];
        this.activeTemplateId = null;
        this.templateInteraction = null;

        this.currentColor = '#000000';

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        this.needsRender = false;
        this.animationFrameId = null;
        
        this.isSpectator = false;
        this.isPrivateBlocked = false;
        this.canvasIntId = null;
        this.canvasPrivacy = 'private';
        this.canvasApproval = false;

        // Propiedad para el motor del timelapse
        this.timelapseActive = false;

        // Propiedades de Reinicio Programado
        this.resetActive = false;
        this.nextResetAt = null;
        this.timerAction = 'restart';
        this.resetTimerInterval = null;
        this.isResetLocked = false; // Bloquea la UI mientras se limpia todo en Backend

        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleMouseDownBound = this.handleMouseDown.bind(this);
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleMouseUpBound = this.handleMouseUp.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleFileUploadBound = this.handleFileUpload.bind(this);
        this.renderBound = this.render.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        
        this.canvas = document.querySelector('[data-ref="design-canvas"]');
        this.btnPlacePixels = document.querySelector('[data-ref="pixel-action-btn"]');
        this.txtPlacePixels = document.querySelector('[data-ref="pixel-action-text"]');
        this.coordsText = document.querySelector('[data-ref="coords-text"]');
        this.btnColorPalette = document.querySelector('[data-ref="btn-color-palette"]');
        this.fileInput = document.querySelector('[data-ref="template-file-input"]');
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.canvas.style.imageRendering = 'pixelated';
        }

        this.bindEvents();
        this.loadCanvasConfig();
        this.checkCanvasAccess();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.wsManager) this.wsManager.disconnect();
        
        document.removeEventListener('wheel', this.handleWheelBound, { passive: false });
        document.removeEventListener('mousedown', this.handleMouseDownBound);
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('mouseup', this.handleMouseUpBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('click', this.handleClickBound);
        window.removeEventListener('resize', this.handleResizeBound);
        
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handleFileUploadBound);
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        if (this.resetTimerInterval) {
            clearInterval(this.resetTimerInterval);
        }
    }

    initWebSocket() {
        if (!this.canvasIntId) return;

        this.wsManager = new WebSocketManager();
        
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
            else if (data.type === 'canvas_locked') {
                this.handleCanvasLocked(data);
            } 
            else if (data.type === 'canvas_cleared') {
                this.handleCanvasCleared(data);
            }
        });

        this.wsManager.connect(this.canvasIntId);
    }

    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('click', this.handleClickBound);
        window.addEventListener('resize', this.handleResizeBound);

        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileUploadBound);
        }
    }

    loadCanvasConfig() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        
        if (wrapper) {
            this.canvasIntId = wrapper.getAttribute('data-canvas-id');
            this.canvasPrivacy = wrapper.getAttribute('data-privacy') || 'private';
            this.canvasApproval = wrapper.getAttribute('data-approval') === '1';

            // Configuración de Reinicios
            this.resetActive = wrapper.getAttribute('data-reset-active') === '1';
            this.nextResetAt = wrapper.getAttribute('data-reset-at');
            this.timerAction = wrapper.getAttribute('data-timer-action') || 'restart';

            const sizeStr = wrapper.getAttribute('data-size');
            if (sizeStr) {
                this.boardWidth = parseInt(sizeStr, 10);
                this.boardHeight = parseInt(sizeStr, 10);
            }
            
            this.canvasPaletteId = wrapper.getAttribute('data-palette') || 'default';
            
            this.setupCanvas();
            this.centerBoard();
            this.renderColorPalette(this.canvasPaletteId);

            if (this.resetActive && this.nextResetAt) {
                this.startResetTimer();
            }

            this.initWebSocket();
        } else {
            this.setupCanvas();
            this.centerBoard();
            this.renderColorPalette('default');
        }
    }

    // ==========================================
    // LÓGICA DE REINICIOS PROGRAMADOS
    // ==========================================

    startResetTimer() {
        if (this.resetTimerInterval) clearInterval(this.resetTimerInterval);
        
        const badge = document.querySelector('[data-ref="reset-timer-badge"]');
        const text = document.querySelector('[data-ref="reset-timer-text"]');
        if (!badge || !text) return;
        
        if (this.timerAction === 'none') {
            badge.classList.add('disabled');
            return;
        }
        
        badge.classList.remove('disabled');
        
        // Parsear UTC de manera estricta para asegurar que funcione en todas las zonas horarias
        const targetMs = new Date(this.nextResetAt.replace(' ', 'T') + 'Z').getTime();
        
        const updateTimer = () => {
            const nowMs = Date.now();
            const diffMs = targetMs - nowMs;
            
            if (diffMs <= 0) {
                text.textContent = '00:00:00';
                badge.classList.remove('danger');
                if (this.timerAction === 'stop') {
                    clearInterval(this.resetTimerInterval);
                }
                return;
            }
            
            const totalSecs = Math.floor(diffMs / 1000);
            const hours = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
            const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
            const secs = String(totalSecs % 60).padStart(2, '0');
            
            text.textContent = `${hours}:${mins}:${secs}`;
            
            if (totalSecs <= 60) {
                badge.classList.add('danger');
            } else {
                badge.classList.remove('danger');
            }
        };
        
        updateTimer();
        this.resetTimerInterval = setInterval(updateTimer, 1000);
    }

    handleCanvasLocked(data) {
        this.isResetLocked = true;
        const overlay = document.querySelector('[data-ref="reset-locked-overlay"]');
        if (overlay) overlay.classList.remove('disabled');
        
        // Limpiamos selecciones actuales para evitar bugs
        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();
    }
    
    handleCanvasCleared(data) {
        // El servidor borró la base de datos, nosotros borramos el frontend
        this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();
        
        this.isResetLocked = false;
        const overlay = document.querySelector('[data-ref="reset-locked-overlay"]');
        if (overlay) overlay.classList.add('disabled');
        
        // Si el WS envía la nueva fecha, reiniciamos el ciclo
        if (data.next_reset_at) {
            this.nextResetAt = data.next_reset_at;
            this.startResetTimer();
        }
    }

    hydrateCanvasState(base64String) {
        try {
            const binaryString = atob(base64String);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const imageData = this.offscreenCtx.createImageData(this.boardWidth, this.boardHeight);
            const paletteColors = getPaletteById(this.canvasPaletteId).colors;
            
            for (let i = 0; i < bytes.length; i++) {
                const colorIndex = bytes[i];
                const dataIdx = i * 4;

                if (colorIndex === 255) {
                    imageData.data[dataIdx] = 0;     
                    imageData.data[dataIdx + 1] = 0; 
                    imageData.data[dataIdx + 2] = 0; 
                    imageData.data[dataIdx + 3] = 0; 
                } else {
                    const hex = paletteColors[colorIndex] || '#FFFFFF'; 
                    
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    
                    imageData.data[dataIdx] = r;
                    imageData.data[dataIdx + 1] = g;
                    imageData.data[dataIdx + 2] = b;
                    imageData.data[dataIdx + 3] = 255; 
                }
            }
            
            this.offscreenCtx.putImageData(imageData, 0, 0);
            this.requestRender();

        } catch (e) {
            console.error("Error hidratando el canvas base64", e);
        }
    }

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
    }

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
    }

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
    }

    // ==========================================
    // MOTOR DE TIMELAPSE CON REPRODUCCIÓN EN VIVO
    // ==========================================
    async startTimelapse() {
        if (!this.canvasIntId || this.timelapseActive || this.isResetLocked) return;
        this.timelapseActive = true;
        
        // Determinar la ruta dinámica configurada en tu route-map, sino fallback.
        const route = ApiRoutes.Canvases?.GetTimelapse || 'canvas/get_timelapse';

        // Poner lienzo totalmente transparente para arrancar el Timelapse
        this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();

        try {
            // Utilizamos el nuevo método de Stream
            const response = await this.api.stream(route, { id: this.canvasIntId }, this.abortController.signal);
            
            if (!response.success) {
                showMessage(response.message || 'Error al cargar timelapse.', 'error');
                this.timelapseActive = false;
                this.checkCanvasAccess(); // Fallback, recargar el lienzo actual
                return;
            }

            const reader = response.reader;
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            // Consumir el stream en chunks según van llegando desde PHP (X-Sendfile o readfile)
            while (true) {
                // Si justo entra un reinicio, abortamos todo y detenemos el timelapse
                if (this.isResetLocked) break;

                const { done, value } = await reader.read();
                if (done) break;

                // Decodificar los bytes y agregarlos al buffer de texto
                buffer += decoder.decode(value, { stream: true });
                
                // Dividir el buffer por saltos de línea (JSON Lines)
                let lines = buffer.split('\n');
                
                // Extraer el último fragmento, ya que puede estar cortado a la mitad por la red
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
                
                // Renderizar lote progresivamente y darle respiro al navegador para pintar el Canvas
                this.requestRender();
                await new Promise(resolve => requestAnimationFrame(resolve)); 
            }
            
            // Si quedó algo en el buffer al finalizar la descarga completa
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
    }

    _drawTimelapsePixel(data) {
        // En Redis inyectamos (u, x, y, c) en string para comprimir
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

   renderColorPalette(paletteId) {
        const palette = getPaletteById(paletteId);
        if (!palette || !palette.colors) return;

        let container = document.querySelector('[data-ref="color-palette-grid"]');
        if (!container) return; 

        container.innerHTML = '';

        this.currentColor = palette.colors[0];
        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
        }

        palette.colors.forEach((hex, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `component-color-btn ${index === 0 ? 'active' : ''}`;
            btn.setAttribute('data-action', 'selectColor');
            btn.setAttribute('data-color', hex);
            
            btn.style.backgroundColor = hex;
            btn.style.setProperty('--color-val', hex); 
            btn.title = hex;

            container.appendChild(btn);
        });

        this.requestRender();
    }

    setupCanvas() {
        this.updateCanvasDimensions();

        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.boardWidth;
        this.offscreenCanvas.height = this.boardHeight;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
    }

    updateCanvasDimensions() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    centerBoard() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.boardWidth;
        const scaleY = rect.height / this.boardHeight;
        this.transform.scale = Math.min(scaleX, scaleY) * 0.9; 
        
        this.transform.x = (rect.width - (this.boardWidth * this.transform.scale)) / 2;
        this.transform.y = (rect.height - (this.boardHeight * this.transform.scale)) / 2;
    }

    limitBounds() {
        if (!this.canvas) return;
        
        const scaledWidth = this.boardWidth * this.transform.scale;
        const scaledHeight = this.boardHeight * this.transform.scale;
        
        const safeMarginX = Math.min(100, scaledWidth / 2);
        const safeMarginY = Math.min(100, scaledHeight / 2);

        const minX = safeMarginX - scaledWidth;
        const maxX = (this.canvas.width / (window.devicePixelRatio || 1)) - safeMarginX;
        
        const minY = safeMarginY - scaledHeight;
        const maxY = (this.canvas.height / (window.devicePixelRatio || 1)) - safeMarginY;

        this.transform.x = Math.min(Math.max(this.transform.x, minX), maxX);
        this.transform.y = Math.min(Math.max(this.transform.y, minY), maxY);
    }

    handleFileUpload(e) {
        if (this.isSpectator || this.timelapseActive || this.isResetLocked) return;
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const id = 'tpl_' + Date.now();
                
                const targetW = this.boardWidth * 0.5;
                const targetH = this.boardHeight * 0.5;
                const scale = Math.min(targetW / img.width, targetH / img.height);
                
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                
                const x = Math.round((this.boardWidth - w) / 2);
                const y = Math.round((this.boardHeight - h) / 2);

                this.templates.push({
                    id, img,
                    src: event.target.result,
                    x, y, w, h,
                    locked: false,
                    opacity: 0.5 
                });

                this.renderTemplateList();
                this.toggleTemplate(id); 
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        this.fileInput.value = ''; 
    }

    renderTemplateList() {
        const container = document.querySelector('[data-ref="template-list"]');
        if (!container) return;

        container.innerHTML = '';
        this.templates.forEach(tpl => {
            const card = document.createElement('div');
            card.className = `component-template-card ${this.activeTemplateId === tpl.id ? 'active' : ''}`;
            card.setAttribute('data-action', 'selectTemplate');
            card.setAttribute('data-id', tpl.id);

            const img = document.createElement('img');
            img.src = tpl.src;
            img.alt = __('alt_template');
            card.appendChild(img);

            const actions = document.createElement('div');
            actions.className = 'component-template-actions';

            const btnLock = document.createElement('button');
            btnLock.className = 'component-template-action-btn';
            btnLock.setAttribute('data-action', 'toggleTemplateLock');
            btnLock.setAttribute('title', tpl.locked ? __('title_unlock_move') : __('title_lock_paint'));

            const iconLock = document.createElement('span');
            iconLock.className = 'material-symbols-rounded';
            iconLock.textContent = tpl.locked ? 'lock' : 'lock_open';
            btnLock.appendChild(iconLock);

            const btnDel = document.createElement('button');
            btnDel.className = 'component-template-action-btn';
            btnDel.setAttribute('data-action', 'deleteTemplate');
            btnDel.setAttribute('title', __('title_delete'));

            const iconDel = document.createElement('span');
            iconDel.className = 'material-symbols-rounded';
            iconDel.textContent = 'delete';
            btnDel.appendChild(iconDel);

            actions.appendChild(btnLock);
            actions.appendChild(btnDel);

            card.appendChild(actions);
            container.appendChild(card);
        });
    }

    toggleTemplate(id) {
        if (this.activeTemplateId === id) {
            this.activeTemplateId = null;
        } else {
            this.activeTemplateId = id;
        }
        this.renderTemplateList();
        this.requestRender();
    }

    toggleLockTemplate(id) {
        const tpl = this.templates.find(t => t.id === id);
        if (tpl) {
            tpl.locked = !tpl.locked;
            this.renderTemplateList();
            this.requestRender();
        }
    }

    deleteTemplate(id) {
        this.templates = this.templates.filter(t => t.id !== id);
        if (this.activeTemplateId === id) this.activeTemplateId = null;
        this.renderTemplateList();
        this.requestRender();
    }

    getExactBoardCoords(clientX, clientY) {
        if (!this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        return {
            x: (mouseX - this.transform.x) / this.transform.scale,
            y: (mouseY - this.transform.y) / this.transform.scale
        };
    }

    checkTemplateHit(ex, ey) {
        if (!this.activeTemplateId) return null;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (!tpl || tpl.locked) return null; 

        const handleSize = 16 / this.transform.scale;
        const hs = handleSize / 2;

        const corners = [
            { id: 'resize-tl', x: tpl.x, y: tpl.y },
            { id: 'resize-tr', x: tpl.x + tpl.w, y: tpl.y },
            { id: 'resize-bl', x: tpl.x, y: tpl.y + tpl.h },
            { id: 'resize-br', x: tpl.x + tpl.w, y: tpl.y + tpl.h }
        ];

        for (const c of corners) {
            if (ex >= c.x - hs && ex <= c.x + hs && ey >= c.y - hs && ey <= c.y + hs) {
                return c.id;
            }
        }

        if (ex >= tpl.x && ex <= tpl.x + tpl.w && ey >= tpl.y && ey <= tpl.y + tpl.h) {
            return 'move';
        }

        return null;
    }

    handleClick(e) {
        const btnPlayTimelapse = e.target.closest('[data-action="playTimelapse"]');
        if (btnPlayTimelapse) {
            e.preventDefault();
            this.startTimelapse();
            return;
        }

        const btnJoin = e.target.closest('[data-action="joinCanvasDirectly"]');
        const btnReqAccess = e.target.closest('[data-action="requestCanvasAccess"]');
        const btnReqOverlay = e.target.closest('[data-action="requestAccessFromOverlay"]');

        if (btnJoin || btnReqAccess || btnReqOverlay) {
            e.preventDefault();
            this.handleAccessRequest(btnJoin || btnReqAccess || btnReqOverlay);
            return;
        }

        // Si es espectador o el lienzo está bloqueado, evitamos interacción
        if (this.isSpectator || this.timelapseActive || this.isResetLocked) return; 

        const btnUpload = e.target.closest('[data-action="triggerTemplateUpload"]');
        if (btnUpload && this.fileInput) {
            e.preventDefault();
            this.fileInput.click();
            return;
        }

        const cardTemplate = e.target.closest('[data-action="selectTemplate"]');
        if (cardTemplate && !e.target.closest('.component-template-action-btn')) {
            const id = cardTemplate.getAttribute('data-id');
            this.toggleTemplate(id);
            return;
        }

        const btnLock = e.target.closest('[data-action="toggleTemplateLock"]');
        if (btnLock) {
            e.stopPropagation();
            const id = btnLock.closest('.component-template-card').getAttribute('data-id');
            this.toggleLockTemplate(id);
            return;
        }

        const btnDelete = e.target.closest('[data-action="deleteTemplate"]');
        if (btnDelete) {
            e.stopPropagation();
            const id = btnDelete.closest('.component-template-card').getAttribute('data-id');
            this.deleteTemplate(id);
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
    }

    handleKeyDown(e) {
        if (e.key === 'Escape' && this.selectedPixels.size > 0) {
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
        }
    }

    handleWheel(e) {
        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;
        
        e.preventDefault(); 
        
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

        this.limitBounds();
        this.calculateHoverPixel(e.clientX, e.clientY);
        this.requestRender();
    }

    handleMouseDown(e) {
        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;

        if (e.shiftKey || e.button === 1 || this.isSpectator || this.timelapseActive || this.isResetLocked) {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.classList.add('cursor-grabbing');
            return;
        }

        const exact = this.getExactBoardCoords(e.clientX, e.clientY);
        if (exact) {
            const hit = this.checkTemplateHit(exact.x, exact.y);
            if (hit) {
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
                this.selectedPixels.add(key);
            }
            this.isSelecting = true;
            this.updateSelectionUI();
            this.requestRender();
        }
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.transform.x += dx;
            this.transform.y += dy;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            
            this.limitBounds();
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
            this.requestRender();
            return; 
        }

        if (this.isSelecting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                const key = `${coords.x},${coords.y}`;
                const sizeBefore = this.selectedPixels.size;
                
                if (this.selectionMode === 'add') {
                    this.selectedPixels.add(key);
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
                hit = this.checkTemplateHit(exact.x, exact.y);
            }
            
            if (hit) {
                if (hit === 'move') this.canvas.style.cursor = 'move';
                else if (hit === 'resize-tl' || hit === 'resize-br') this.canvas.style.cursor = 'nwse-resize';
                else if (hit === 'resize-tr' || hit === 'resize-bl') this.canvas.style.cursor = 'nesw-resize';
                
                if (this.hoveredPixel !== null) {
                    this.hoveredPixel = null;
                    if (this.coordsText) this.coordsText.textContent = '- , -';
                    this.requestRender();
                }
                return;
            } else {
                this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'default';
            }
            
            this.calculateHoverPixel(e.clientX, e.clientY);
        } else if (this.hoveredPixel !== null) {
            this.hoveredPixel = null;
            if (this.coordsText) this.coordsText.textContent = '- , -';
            this.requestRender();
        }
    }

    handleMouseUp(e) {
        if (this.templateInteraction) {
            this.templateInteraction = null;
            this.requestRender();
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.classList.remove('cursor-grabbing');
        }
        
        if (this.isSelecting) {
            this.isSelecting = false;
        }

        this.calculateHoverPixel(e.clientX, e.clientY);
        this.requestRender();
    }

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
    }

    calculateHoverPixel(clientX, clientY) {
        const newHover = this.getBoardCoords(clientX, clientY);
        const currentHoverStr = this.hoveredPixel ? `${this.hoveredPixel.x},${this.hoveredPixel.y}` : 'null';
        const newHoverStr = newHover ? `${newHover.x},${newHover.y}` : 'null';

        if (currentHoverStr !== newHoverStr) {
            this.hoveredPixel = newHover;
            this.requestRender();
        }

        if (this.coordsText) {
            if (newHover) {
                this.coordsText.textContent = `${newHover.x} , ${newHover.y}`;
            } else {
                this.coordsText.textContent = '- , -';
            }
        }
    }

    updateSelectionUI() {
        if (!this.btnPlacePixels || !this.txtPlacePixels) return;

        if (this.selectedPixels.size > 0) {
            this.btnPlacePixels.classList.remove('disabled-interactive');
            this.txtPlacePixels.textContent = __('btn_place_pixels');
        } else {
            this.btnPlacePixels.classList.add('disabled-interactive');
            this.txtPlacePixels.textContent = __('btn_select_pixels');
        }
    }

    placePixels() {
        if (this.selectedPixels.size === 0 || this.isSpectator || this.timelapseActive || this.isResetLocked) return;

        const paletteObj = getPaletteById(this.canvasPaletteId);
        let colorIndex = 0;
        if (paletteObj && paletteObj.colors) {
            const idx = paletteObj.colors.indexOf(this.currentColor);
            if (idx !== -1) colorIndex = idx;
        }

        this.selectedPixels.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            this.offscreenCtx.fillStyle = this.currentColor;
            this.offscreenCtx.clearRect(x, y, 1, 1);
            this.offscreenCtx.fillRect(x, y, 1, 1);
            
            if (this.wsManager) {
                this.wsManager.send({
                    type: 'pixel',
                    x: x,
                    y: y,
                    color: colorIndex,
                    width: this.boardWidth,
                    userId: window.activeUserId || null 
                });
            }
        });

        this.selectedPixels.clear();
        this.updateSelectionUI();
        this.requestRender();
        
        showMessage(__('msg_pixels_placed'), 'success');
    }

    handleResize() {
        this.updateCanvasDimensions();
        this.limitBounds();
        this.requestRender();
    }

    isDarkMode() {
        const html = document.documentElement;
        const body = document.body;
        return html.classList.contains('dark-theme') || 
               html.classList.contains('dark') || 
               html.getAttribute('data-theme') === 'dark' ||
               body.classList.contains('dark-theme') || 
               body.classList.contains('dark') || 
               body.getAttribute('data-theme') === 'dark';
    }

    requestRender() {
        if (!this.needsRender) {
            this.needsRender = true;
            this.animationFrameId = requestAnimationFrame(this.renderBound);
        }
    }

    render() {
        this.needsRender = false;
        if (!this.ctx || !this.canvas) return;

        const isDark = this.isDarkMode();
        const bgColor = isDark ? '#0e0e11' : '#f5f5fa'; 
        const gridColor = 'rgba(0, 0, 0, 0.15)'; 
        const activeColor = this.currentColor; 

        this.ctx.fillStyle = bgColor; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr);
        
        this.ctx.translate(this.transform.x, this.transform.y);
        this.ctx.scale(this.transform.scale, this.transform.scale);
        
        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);

        if (this.activeTemplateId && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            if (tpl) {
                this.ctx.save();
                this.ctx.globalAlpha = tpl.opacity;
                this.ctx.drawImage(tpl.img, tpl.x, tpl.y, tpl.w, tpl.h);
                this.ctx.restore();

                if (!tpl.locked) {
                    this.ctx.save();
                    this.ctx.strokeStyle = '#2196F3';
                    this.ctx.lineWidth = 2 / this.transform.scale;
                    this.ctx.strokeRect(tpl.x, tpl.y, tpl.w, tpl.h);

                    const hs = 10 / this.transform.scale;
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.strokeStyle = '#2196F3';
                    this.ctx.lineWidth = 1.5 / this.transform.scale;

                    const drawHandle = (hx, hy) => {
                        this.ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
                        this.ctx.strokeRect(hx - hs/2, hy - hs/2, hs, hs);
                    };

                    drawHandle(tpl.x, tpl.y);
                    drawHandle(tpl.x + tpl.w, tpl.y);
                    drawHandle(tpl.x, tpl.y + tpl.h);
                    drawHandle(tpl.x + tpl.w, tpl.y + tpl.h);

                    this.ctx.restore();
                }
            }
        }

        if (this.transform.scale > 4) {
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.strokeStyle = gridColor; 
            this.ctx.beginPath();
            
            const rect = this.canvas.getBoundingClientRect();
            
            const startX = Math.max(0, Math.floor(-this.transform.x / this.transform.scale));
            const startY = Math.max(0, Math.floor(-this.transform.y / this.transform.scale));
            const endX = Math.min(this.boardWidth, Math.ceil((rect.width - this.transform.x) / this.transform.scale));
            const endY = Math.min(this.boardHeight, Math.ceil((rect.height - this.transform.y) / this.transform.scale));

            for (let x = startX; x <= endX; x++) {
                this.ctx.moveTo(x, startY);
                this.ctx.lineTo(x, endY);
            }
            for (let y = startY; y <= endY; y++) {
                this.ctx.moveTo(startX, y);
                this.ctx.lineTo(endX, y);
            }
            this.ctx.stroke();
        }

        this.ctx.drawImage(this.offscreenCanvas, 0, 0);

        const renderSet = new Set(this.selectedPixels);

        if (this.hoveredPixel && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
            const hoverKey = `${this.hoveredPixel.x},${this.hoveredPixel.y}`;
            if (!renderSet.has(hoverKey)) {
                renderSet.add(hoverKey);
            }
        }

        if (renderSet.size > 0 && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
            this.ctx.strokeStyle = activeColor; 
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.beginPath();
            
            renderSet.forEach(key => {
                const [x, y] = key.split(',').map(Number);
                
                const hasTop = renderSet.has(`${x},${y-1}`);
                const hasBottom = renderSet.has(`${x},${y+1}`);
                const hasLeft = renderSet.has(`${x-1},${y}`);
                const hasRight = renderSet.has(`${x+1},${y}`);
                
                if (!hasTop) { this.ctx.moveTo(x, y); this.ctx.lineTo(x + 1, y); }
                if (!hasBottom) { this.ctx.moveTo(x, y + 1); this.ctx.lineTo(x + 1, y + 1); }
                if (!hasLeft) { this.ctx.moveTo(x, y); this.ctx.lineTo(x, y + 1); }
                if (!hasRight) { this.ctx.moveTo(x + 1, y); this.ctx.lineTo(x + 1, y + 1); }
            });
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
}

export { DesignController };