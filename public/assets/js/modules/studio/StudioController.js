// public/assets/js/modules/studio/StudioController.js
import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

class StudioWebSocketManager {
    constructor() {
        this.ws = null;
        this.isConnecting = false;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const portOrPath = window.location.protocol === 'https:' ? '/studio-ws/' : ':8765';
        this.wsUrl = `${protocol}//${host}${portOrPath}`;
        
        this.callbacks = {};
        window.addEventListener('viewLoaded', this.handleRouteUpdate.bind(this));
    }

    getAuthToken() {
        return 'mi_token_super_secreto_y_seguro_2026'; 
    }

    getUserId() {
        // Asumiendo que guardaste el user ID en algún lugar global como meta tag
        const meta = document.querySelector('meta[name="user-id"]');
        return meta ? meta.getAttribute('content') : '0';
    }

    generateRequestId() {
        return Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    }

    onMessage(type, callback) {
        this.callbacks[type] = callback;
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.isConnecting = true;
        console.log(`[WS] Conectando a ${this.wsUrl}...`);
        
        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                this.isConnecting = false;
                console.log('[WS] Conectado');
                
                const authPayload = {
                    type: "auth",
                    token: this.getAuthToken(),
                    userId: this.getUserId(),
                    requestId: this.generateRequestId()
                };
                
                this.ws.send(JSON.stringify(authPayload));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.status === "error" && (data.code === "AUTH_FAILED" || data.code === "AUTH_TIMEOUT")) {
                        this.disconnect();
                        return;
                    }

                    // Si es un evento de progreso que viene desde Python/Redis
                    if (data.type === 'progress' || data.type === 'completed' || data.type === 'failed') {
                        if (this.callbacks['progressUpdate']) {
                            this.callbacks['progressUpdate'](data);
                        }
                    }
                } catch (error) {
                    console.error('[WS] Error parseando mensaje', error);
                }
            };

            this.ws.onclose = () => {
                this.isConnecting = false;
                this.ws = null;
                console.log('[WS] Desconectado');
            };

            this.ws.onerror = () => {
                this.isConnecting = false;
            };
        } catch (error) {
            console.error('[WS] Error iniciando conexión', error);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, "Navegación fuera de Studio");
            this.ws = null;
        }
    }

    handleRouteUpdate(event) {
        const { cleanUrl } = event.detail;
        if (!cleanUrl.includes('/studio')) {
            this.disconnect();
        } else {
            this.connect();
        }
    }
}

export class StudioController {
    constructor() {
        if (window.AppStudioWSManager) {
            this.manager = window.AppStudioWSManager;
        } else {
            this.manager = new StudioWebSocketManager();
            window.AppStudioWSManager = this.manager;
        }
        
        this.api = new ApiService();
        this.currentVideos = new Map(); // Para rastrear estado de videos en UI
        this.selectedVideoId = null; // Video seleccionado en /uploading
        
        this.init();
    }

    init() {
        this.manager.connect();
        this.manager.onMessage('progressUpdate', this.handleWsProgress.bind(this));
        
        // Determinar en qué vista estamos
        const path = window.location.pathname;
        if (path.includes('/studio/uploading')) {
            this.initUploadingView();
        } else if (path.includes('/studio/upload')) {
            this.initUploadView();
        }

        this.attachEvents();
    }

    // ==========================================
    // LOGICA DE /studio/upload
    // ==========================================
    initUploadView() {
        const dropZone = document.getElementById('videoDropZone');
        const fileInput = document.getElementById('videoFileInput');
        
        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFilesSelection(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFilesSelection(e.target.files);
        });
    }

    async handleFilesSelection(files) {
        if (!files || files.length === 0) return;

        // Mostrar UI de carga de red si existe
        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        const uploadProgressBar = document.getElementById('uploadProgressBar');
        if(uploadProgressContainer) uploadProgressContainer.style.display = 'block';

        // Subir uno por uno a PHP
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Subida por red (XHR)
                const result = await this.api.uploadFileWithProgress(
                    ApiRoutes.Studio.UploadVideo, 
                    file, 
                    'video', 
                    {}, 
                    (percent) => {
                        if(uploadProgressBar) uploadProgressBar.style.width = `${percent}%`;
                    }
                );
                
                if (result.status === 'success') {
                    console.log(`Video encolado: ${result.data.uuid}`);
                } else {
                    alert(`Error subiendo ${file.name}: ${result.message}`);
                }
            } catch (error) {
                console.error(error);
            }
        }

        // Una vez subidos todos al temporal, redirigir a uploading
        window.history.pushState({}, '', (window.AppBasePath || '') + '/studio/uploading');
        window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/uploading' }}));
    }

    // ==========================================
    // LOGICA DE /studio/uploading
    // ==========================================
    async initUploadingView() {
        // Obtener estado actual de videos desde el backend
        const response = await this.api.post(ApiRoutes.Studio.GetActiveUploads);
        if (response.status === 'success') {
            const videos = response.data;
            if (videos.length === 0) {
                // Si no hay videos, regresar a upload
                window.history.pushState({}, '', (window.AppBasePath || '') + '/studio/upload');
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/upload' }}));
                return;
            }

            videos.forEach(v => {
                this.currentVideos.set(v.id, {
                    ...v,
                    thumbnailSubida: v.thumbnail_path ? true : false,
                    tituloValido: v.title ? true : false
                });
            });

            this.renderBadges();
            
            // Seleccionar el primer video por defecto
            this.selectVideo(videos[0].id);
        }
    }

    renderBadges() {
        const container = document.getElementById('badgesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        this.currentVideos.forEach(video => {
            const badge = document.createElement('div');
            badge.className = `video-badge ${this.selectedVideoId === video.id ? 'active' : ''}`;
            badge.setAttribute('data-id', video.id);
            badge.onclick = () => this.selectVideo(video.id);

            let statusText = video.status === 'queued' ? 'En cola' : 
                             video.status === 'processing' ? `${video.processing_progress}%` : 
                             video.status === 'processed' ? '100% OK' : 'Error';

            badge.innerHTML = `
                <span class="name">${video.original_filename}</span>
                <span class="status" id="badge-status-${video.id}">${statusText}</span>
            `;
            container.appendChild(badge);
        });
    }

    selectVideo(id) {
        this.selectedVideoId = id;
        this.renderBadges(); // Para actualizar clase active
        
        const video = this.currentVideos.get(id);
        if (!video) return;

        // Rellenar formulario
        const titleInput = document.getElementById('videoTitleInput');
        if(titleInput) titleInput.value = video.title || video.original_filename;
        
        this.validatePublishButton();
    }

    handleWsProgress(data) {
        // data.video_id, data.progress, data.status
        if (this.currentVideos.has(data.video_id)) {
            const video = this.currentVideos.get(data.video_id);
            video.status = data.status;
            video.processing_progress = data.progress;
            
            // Actualizar UI del Badge
            const statusSpan = document.getElementById(`badge-status-${data.video_id}`);
            if (statusSpan) {
                if (data.status === 'processing') statusSpan.textContent = `${data.progress}%`;
                else if (data.status === 'processed') statusSpan.textContent = '100% OK';
                else if (data.status === 'failed') statusSpan.textContent = 'Error';
            }

            // Si es el video actual seleccionado, validar botón publicar
            if (this.selectedVideoId === data.video_id) {
                this.validatePublishButton();
            }
        }
    }

    attachEvents() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            const action = btn.getAttribute('data-action');
            if (action === 'publishVideo') {
                this.publishVideo();
            }
        });

        // Evento para subir miniatura
        const thumbInput = document.getElementById('thumbnailInput');
        if (thumbInput) {
            thumbInput.addEventListener('change', async (e) => {
                if (!e.target.files.length || !this.selectedVideoId) return;
                
                const formData = new FormData();
                formData.append('thumbnail', e.target.files[0]);
                formData.append('video_id', this.selectedVideoId);

                const res = await this.api.postForm(ApiRoutes.Studio.UploadThumbnail, formData);
                if(res.status === 'success') {
                    const video = this.currentVideos.get(this.selectedVideoId);
                    video.thumbnailSubida = true;
                    video.thumbnail_path = res.data.thumbnail_path;
                    this.validatePublishButton();
                    alert("Miniatura subida con éxito");
                }
            });
        }

        // Evento para guardar título al salir del input (blur) o teclear
        const titleInput = document.getElementById('videoTitleInput');
        if (titleInput) {
            titleInput.addEventListener('blur', async (e) => {
                if (!this.selectedVideoId) return;
                const newTitle = e.target.value.trim();
                
                if (newTitle.length > 0) {
                    const res = await this.api.post(ApiRoutes.Studio.UpdateTitle, {
                        video_id: this.selectedVideoId,
                        title: newTitle
                    });
                    
                    if(res.status === 'success') {
                        const video = this.currentVideos.get(this.selectedVideoId);
                        video.title = newTitle;
                        video.tituloValido = true;
                        this.validatePublishButton();
                    }
                }
            });
        }
    }

    validatePublishButton() {
        const btn = document.getElementById('btnPublishVideo');
        if (!btn || !this.selectedVideoId) return;

        const video = this.currentVideos.get(this.selectedVideoId);
        
        // Reglas de validación
        const isProcessed = video.status === 'processed';
        const hasTitle = document.getElementById('videoTitleInput').value.trim().length > 0;
        const hasThumb = video.thumbnailSubida === true;

        if (isProcessed && hasTitle && hasThumb) {
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
        } else {
            btn.setAttribute('disabled', 'true');
            btn.classList.add('disabled');
        }
    }

    async publishVideo() {
        if (!this.selectedVideoId) return;
        
        const res = await this.api.post(ApiRoutes.Studio.PublishVideo, {
            video_id: this.selectedVideoId
        });

        if (res.status === 'success') {
            alert("¡Video publicado con éxito!");
            // Quitar de la lista local
            this.currentVideos.delete(this.selectedVideoId);
            this.renderBadges();
            
            // Si quedan videos, seleccionar el primero, sino redirigir
            if (this.currentVideos.size > 0) {
                this.selectVideo(this.currentVideos.keys().next().value);
            } else {
                window.history.pushState({}, '', (window.AppBasePath || '') + '/studio/manage-content');
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/manage-content' }}));
            }
        } else {
            alert(res.message);
        }
    }
}