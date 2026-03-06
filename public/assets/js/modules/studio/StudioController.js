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
        
        window.currentStudioController = this;

        this.api = new ApiService();
        this.currentVideos = new Map();
        this.selectedVideoId = null;
        
        this.init();
    }

    init() {
        this.manager.connect();
        this.manager.onMessage('progressUpdate', this.handleWsProgress.bind(this));
        
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
        // Delegado en attachEvents
    }

    async handleFilesSelection(files) {
        if (!files || files.length === 0) return;

        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        const uploadProgressBar = document.getElementById('uploadProgressBar');
        if(uploadProgressContainer) uploadProgressContainer.style.display = 'block';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
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

        window.history.pushState({}, '', (window.AppBasePath || '') + '/studio/uploading');
        window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/uploading' }}));
    }

    // ==========================================
    // LOGICA DE /studio/uploading
    // ==========================================
    async initUploadingView() {
        const response = await this.api.post(ApiRoutes.Studio.GetActiveUploads);
        if (response.status === 'success') {
            const videos = response.data;
            if (videos.length === 0) {
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
        this.renderBadges(); 
        
        const video = this.currentVideos.get(id);
        if (!video) return;

        // Actualizar el Título en la vista de lectura
        const displayTitle = document.querySelector('[data-ref="display-title"]');
        const titleInput = document.getElementById('videoTitleInput');
        
        const currentTitle = video.title || video.original_filename;
        
        if(displayTitle) displayTitle.textContent = currentTitle;
        if(titleInput) titleInput.value = currentTitle;

        // Asegurarnos de que estamos en modo "lectura" y no "edición"
        this.setEditState('title', false);

        // Actualizar nombre de archivo en la tarjeta derecha
        const previewOriginalFilename = document.getElementById('previewOriginalFilename');
        if(previewOriginalFilename) previewOriginalFilename.textContent = video.original_filename;
        
        this.validatePublishButton();
    }

    handleWsProgress(data) {
        if (this.currentVideos.has(data.video_id)) {
            const video = this.currentVideos.get(data.video_id);
            video.status = data.status;
            video.processing_progress = data.progress;
            
            const statusSpan = document.getElementById(`badge-status-${data.video_id}`);
            if (statusSpan) {
                if (data.status === 'processing') statusSpan.textContent = `${data.progress}%`;
                else if (data.status === 'processed') statusSpan.textContent = '100% OK';
                else if (data.status === 'failed') statusSpan.textContent = 'Error';
            }

            if (this.selectedVideoId === data.video_id) {
                this.validatePublishButton();
            }
        }
    }

    // --- MANEJO DE VISTAS LECTURA/EDICIÓN ---
    setEditState(target, isEditing) {
        const viewState = document.querySelector(`[data-state="${target}-view"]`);
        const editState = document.querySelector(`[data-state="${target}-edit"]`);

        if (viewState && editState) {
            if (isEditing) {
                viewState.style.display = 'none';
                viewState.classList.remove('active');
                viewState.classList.add('disabled');

                editState.style.display = 'flex';
                editState.classList.remove('disabled');
                editState.classList.add('active');
            } else {
                editState.style.display = 'none';
                editState.classList.remove('active');
                editState.classList.add('disabled');

                viewState.style.display = 'flex';
                viewState.classList.remove('disabled');
                viewState.classList.add('active');
            }
        }
    }

    async saveTitleField() {
        if (!this.selectedVideoId) return;
        
        const inputEl = document.getElementById('videoTitleInput');
        const displayEl = document.querySelector('[data-ref="display-title"]');
        if (!inputEl) return;

        const newTitle = inputEl.value.trim();
        
        if (newTitle.length > 0) {
            const res = await this.api.post(ApiRoutes.Studio.UpdateTitle, {
                video_id: this.selectedVideoId,
                title: newTitle
            });
            
            if(res.status === 'success') {
                const video = this.currentVideos.get(this.selectedVideoId);
                if (video) {
                    video.title = newTitle;
                    video.tituloValido = true;
                    if (displayEl) displayEl.textContent = newTitle;
                    this.setEditState('title', false); // Volver a modo lectura
                    this.validatePublishButton();
                }
            } else {
                alert("Error guardando el título: " + res.message);
            }
        } else {
            alert("El título no puede estar vacío.");
        }
    }

    attachEvents() {
        if (window.AppStudioEventsBound) return;
        window.AppStudioEventsBound = true;

        document.addEventListener('click', (e) => {
            const controller = window.currentStudioController;
            if (!controller) return;

            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            const action = btn.getAttribute('data-action');
            const target = btn.getAttribute('data-target');

            // Toggle Edit View
            if (action === 'toggleEditState') {
                const currentState = document.querySelector(`[data-state="${target}-edit"]`).style.display !== 'none';
                controller.setEditState(target, !currentState);
            }

            // Save Title explicitly
            if (action === 'saveTitle') {
                controller.saveTitleField();
            }

            // Publish Video
            if (action === 'publishVideo') {
                controller.publishVideo();
            }
        });

        // Changes delegados (Inputs de Archivos)
        document.addEventListener('change', async (e) => {
            const controller = window.currentStudioController;
            if (!controller) return;

            // Thumbnail
            if (e.target && e.target.id === 'thumbnailInput') {
                if (!e.target.files.length || !controller.selectedVideoId) return;
                
                const formData = new FormData();
                formData.append('thumbnail', e.target.files[0]);
                formData.append('video_id', controller.selectedVideoId);

                const res = await controller.api.postForm(ApiRoutes.Studio.UploadThumbnail, formData);
                if(res.status === 'success') {
                    const video = controller.currentVideos.get(controller.selectedVideoId);
                    if (video) {
                        video.thumbnailSubida = true;
                        video.thumbnail_path = res.data.thumbnail_path;
                        controller.validatePublishButton();
                    }
                    console.log("Miniatura subida con éxito");
                } else {
                    alert("Error subiendo miniatura: " + res.message);
                }
            }

            // Video Upload Input
            if (e.target && e.target.id === 'videoFileInput') {
                controller.handleFilesSelection(e.target.files);
            }
        });

        // Drag & Drop delegados
        document.addEventListener('dragover', (e) => {
            const dropZone = e.target.closest('#videoDropZone');
            if (dropZone) {
                e.preventDefault();
                dropZone.classList.add('dragover');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const dropZone = e.target.closest('#videoDropZone');
            if (dropZone) {
                dropZone.classList.remove('dragover');
            }
        });

        document.addEventListener('drop', (e) => {
            const dropZone = e.target.closest('#videoDropZone');
            if (dropZone) {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                const controller = window.currentStudioController;
                if(controller) controller.handleFilesSelection(e.dataTransfer.files);
            }
        });
    }

    validatePublishButton() {
        const btn = document.getElementById('btnPublishVideo');
        if (!btn || !this.selectedVideoId) return;

        const video = this.currentVideos.get(this.selectedVideoId);
        if (!video) return;
        
        const isProcessed = video.status === 'processed';
        const hasTitle = (video.title && video.title.trim().length > 0) || (video.original_filename && video.original_filename.trim().length > 0);
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
            this.currentVideos.delete(this.selectedVideoId);
            this.renderBadges();
            
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