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
        if (window.AppRouteTitles) {
            const routes = Object.keys(window.AppRouteTitles);
            const panelRoute = routes.find(r => r.startsWith('/studio/management-panel/'));
            
            if (panelRoute) {
                const extractedId = panelRoute.replace('/studio/management-panel/', '');
                return extractedId;
            }
        }
        return '0';
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
        
        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                this.isConnecting = false;
                
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
                
                if (result.status !== 'success') {
                    alert(`Error subiendo ${file.name}: ${result.message}`);
                }
            } catch (error) {
                console.error(error);
            }
        }

        window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/uploading' }}));
    }

    async initUploadingView() {
        const response = await this.api.post(ApiRoutes.Studio.GetActiveUploads);
        if (response.status === 'success') {
            const videos = response.data;
            if (videos.length === 0) {
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/upload' }}));
                return;
            }

            videos.forEach(v => {
                this.currentVideos.set(String(v.id), {
                    ...v,
                    id: String(v.id), 
                    thumbnailSubida: v.thumbnail_path ? true : false,
                    tituloValido: v.title && v.title.trim() !== '' ? true : false
                });
            });

            this.renderBadges();
            this.selectVideo(String(videos[0].id));
        }
    }

    renderBadges() {
        const container = document.getElementById('badgesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        this.currentVideos.forEach(video => {
            const badge = document.createElement('div');
            badge.className = `studio-badge ${this.selectedVideoId === video.id ? 'active' : ''}`;
            badge.setAttribute('data-id', video.id);
            
            badge.onclick = () => this.selectVideo(String(video.id));

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
        this.selectedVideoId = String(id);
        this.renderBadges(); 
        
        const video = this.currentVideos.get(this.selectedVideoId);
        if (!video) return;

        const displayTitle = document.querySelector('[data-ref="display-title"]');
        const titleInput = document.getElementById('videoTitleInput');
        const descInput = document.getElementById('videoDescriptionInput');
        
        const currentTitle = video.title || video.original_filename;
        
        if(displayTitle) displayTitle.textContent = currentTitle;
        if(titleInput) titleInput.value = currentTitle;
        if(descInput) descInput.value = video.description || '';

        this.setEditState('title', false);

        const previewOriginalFilename = document.getElementById('previewOriginalFilename');
        if(previewOriginalFilename) previewOriginalFilename.textContent = video.original_filename;
        
        this.updateThumbnailPreview(video.thumbnail_path);
        this.validatePublishButton();
    }

    updateThumbnailPreview(thumbnailPath) {
        const container = document.querySelector('.studio-video-card__player');
        if (container) {
            if (thumbnailPath) {
                container.style.backgroundImage = `url(${thumbnailPath})`;
                container.style.backgroundSize = 'cover';
                container.style.backgroundPosition = 'center';
                container.style.backgroundColor = 'transparent';
                container.innerHTML = ''; 
            } else {
                container.style.backgroundImage = 'none';
                container.style.backgroundColor = 'var(--background-secondary, #2a2a2a)';
                container.innerHTML = '<span class="material-symbols-rounded" style="color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px;">play_circle</span>';
            }
        }
    }

    handleWsProgress(data) {
        const wsVideoIdStr = String(data.video_id);
        const wsUuidStr = String(data.uuid);
        
        let matchedKey = null;
        let videoObj = null;

        if (this.currentVideos.has(wsVideoIdStr)) {
            matchedKey = wsVideoIdStr;
            videoObj = this.currentVideos.get(wsVideoIdStr);
        } else {
            for (const [key, v] of this.currentVideos.entries()) {
                if (String(v.uuid) === wsUuidStr || String(v.id) === wsUuidStr || String(v.id) === wsVideoIdStr) {
                    matchedKey = key;
                    videoObj = v;
                    break;
                }
            }
        }

        if (videoObj && matchedKey) {
            videoObj.status = data.status;
            videoObj.processing_progress = data.progress || 100;
            
            const statusSpan = document.getElementById(`badge-status-${matchedKey}`);
            if (statusSpan) {
                if (data.status === 'processing') statusSpan.textContent = `${data.progress}%`;
                else if (data.status === 'processed') statusSpan.textContent = '100% OK';
                else if (data.status === 'failed') statusSpan.textContent = 'Error';
            }

            if (this.selectedVideoId === matchedKey) {
                this.validatePublishButton();
            }
        } else {
            console.log(`[WS] Progreso recibido pero vista aún cargando... (ID: ${wsVideoIdStr})`);
        }
    }

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
        const descInput = document.getElementById('videoDescriptionInput');
        const displayEl = document.querySelector('[data-ref="display-title"]');
        if (!inputEl) return;

        const newTitle = inputEl.value.trim();
        const newDesc = descInput ? descInput.value.trim() : '';
        
        if (newTitle.length > 0) {
            const res = await this.api.post(ApiRoutes.Studio.UpdateTitle, {
                video_id: this.selectedVideoId,
                title: newTitle,
                description: newDesc
            });
            
            if(res.status === 'success') {
                const video = this.currentVideos.get(this.selectedVideoId);
                if (video) {
                    video.title = newTitle;
                    video.description = newDesc;
                    video.tituloValido = true;
                    if (displayEl) displayEl.textContent = newTitle;
                    this.setEditState('title', false);
                    this.validatePublishButton();
                }
            } else {
                alert("Error guardando datos: " + res.message);
            }
        } else {
            alert("El título no puede estar vacío.");
        }
    }

    async saveDescriptionField() {
        if (!this.selectedVideoId) return;
        const descInput = document.getElementById('videoDescriptionInput');
        const titleInput = document.getElementById('videoTitleInput');
        if (!descInput) return;

        const newDesc = descInput.value.trim();
        const video = this.currentVideos.get(this.selectedVideoId);
        const currentTitle = video ? video.title : (titleInput ? titleInput.value.trim() : '');

        if (!currentTitle) return;

        const res = await this.api.post(ApiRoutes.Studio.UpdateTitle, {
            video_id: this.selectedVideoId,
            title: currentTitle,
            description: newDesc
        });

        if (res.status === 'success' && video) {
            video.description = newDesc;
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

            if (action === 'toggleEditState') {
                const currentState = document.querySelector(`[data-state="${target}-edit"]`).style.display !== 'none';
                controller.setEditState(target, !currentState);
            }

            if (action === 'saveTitle') {
                controller.saveTitleField();
            }

            if (action === 'publishVideo') {
                controller.publishVideo();
            }

            if (action === 'cancelVideo') {
                if (confirm("¿Estás seguro de que deseas cancelar la subida/procesamiento de este video? Se eliminará permanentemente.")) {
                    controller.cancelVideo();
                }
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target && e.target.id === 'videoDescriptionInput') {
                const controller = window.currentStudioController;
                if (controller) controller.saveDescriptionField();
            }
        });

        document.addEventListener('change', async (e) => {
            const controller = window.currentStudioController;
            if (!controller) return;

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
                        controller.updateThumbnailPreview(video.thumbnail_path); 
                    }
                } else {
                    alert("Error subiendo miniatura: " + res.message);
                }
            }

            if (e.target && e.target.id === 'videoFileInput') {
                controller.handleFilesSelection(e.target.files);
            }
        });

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
        const hasTitle = (video.title && video.title.trim().length > 0); 
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
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/manage-content' }}));
            }
        } else {
            alert(res.message);
        }
    }

    async cancelVideo() {
        if (!this.selectedVideoId) return;
        
        const btn = document.getElementById('btnCancelVideo');
        if (btn) btn.classList.add('disabled');

        const res = await this.api.post(ApiRoutes.Studio.CancelUpload, {
            video_id: this.selectedVideoId
        });

        if (res.status === 'success') {
            this.currentVideos.delete(this.selectedVideoId);
            this.renderBadges();
            
            if (this.currentVideos.size > 0) {
                this.selectVideo(this.currentVideos.keys().next().value);
            } else {
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/upload' }}));
            }
        } else {
            alert("Error al cancelar el video: " + res.message);
            if (btn) btn.classList.remove('disabled');
        }
    }
}