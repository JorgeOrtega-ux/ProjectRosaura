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
                return panelRoute.replace('/studio/management-panel/', '');
            }
        }
        
        const match = window.location.pathname.match(/\/studio\/(?:manage-content|management-panel|edit)\/([a-f0-9\-]{36})/);
        if (match) return match[1];
        
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
        this.selectedManageVideoId = null; 
        
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
        } else if (path.includes('/studio/manage-content')) {
            this.initManageContentView();
        } else if (path.includes('/studio/edit/')) {
            this.initEditView(); 
        }

        this.attachEvents();
    }

    initUploadView() {
    }

    async initManageContentView() {
        const routeName = ApiRoutes.Studio?.GetAllVideos || 'studio.get_all_videos';
        const response = await this.api.post(routeName);
        
        const tbody = document.getElementById('manageContentTableBody');
        const template = document.getElementById('emptyTableTemplate');
        
        if (!tbody) return;
        
        if (response.status === 'success') {
            const videos = response.data;
            if (videos.length === 0) {
                if (template) tbody.innerHTML = template.innerHTML;
                return;
            }
            
            tbody.innerHTML = '';
            this.currentVideos.clear();
            
            videos.forEach(v => {
                this.currentVideos.set(String(v.id), v);
                const tr = this.createVideoRow(v);
                tbody.appendChild(tr);
            });
        } else {
            if (template) tbody.innerHTML = template.innerHTML;
        }
    }

    createVideoRow(video) {
        const tr = document.createElement('tr');
        tr.id = `video-row-${video.id}`;
        
        tr.onclick = () => this.selectManageContentVideo(video.id);

        let statusBadge = '';
        switch(video.status) {
            case 'queued': statusBadge = '<span class="status-badge status-queued">En cola</span>'; break;
            case 'processing': statusBadge = `<span class="status-badge status-processing">Procesando ${video.processing_progress || 0}%</span>`; break;
            case 'processed': statusBadge = '<span class="status-badge status-processed">Procesado / Borrador</span>'; break;
            case 'published': statusBadge = '<span class="status-badge status-published">Publicado</span>'; break;
            case 'failed': statusBadge = '<span class="status-badge status-failed">Error</span>'; break;
            default: statusBadge = `<span class="status-badge">${video.status}</span>`;
        }
        
        let thumbUrl = video.thumbnail_path ? video.thumbnail_path : '';
        if (thumbUrl && !thumbUrl.startsWith('http')) {
            let base = window.AppBasePath || window.location.origin;
            if (base.endsWith('/')) base = base.slice(0, -1);
            let cleanPath = thumbUrl.replace(/^\//, '');
            if (!cleanPath.startsWith('public/')) cleanPath = 'public/' + cleanPath;
            thumbUrl = base + '/' + cleanPath;
        }
        
        const thumbHtml = thumbUrl 
            ? `<img src="${thumbUrl}" class="table-video-thumb" alt="Miniatura">` 
            : `<div class="table-video-thumb empty"><span class="material-symbols-rounded">video_file</span></div>`;
            
        const title = video.title || video.original_filename || 'Sin título';
        const date = video.created_at ? new Date(video.created_at).toLocaleDateString() : '-';

        tr.innerHTML = `
            <td>
                <div class="table-video-info">
                    ${thumbHtml}
                    <div class="table-video-details">
                        <span class="table-video-title">${title}</span>
                        <span class="table-video-desc">${video.description ? video.description.substring(0, 30) + '...' : 'Sin descripción'}</span>
                    </div>
                </div>
            </td>
            <td>${statusBadge}</td>
            <td>Ninguna</td>
            <td>${date}</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
        `;
        
        return tr;
    }

    selectManageContentVideo(id) {
        this.selectedManageVideoId = id;
        
        document.querySelectorAll('#manageContentTableBody tr').forEach(row => {
            row.classList.remove('component-table-row--selected');
        });
        
        const row = document.getElementById(`video-row-${id}`);
        if (row) row.classList.add('component-table-row--selected');

        const editBtn = document.getElementById('btnEditSelectedVideo');
        if (editBtn) {
            editBtn.removeAttribute('disabled');
            editBtn.classList.remove('disabled');
            
            editBtn.onclick = () => {
                const video = this.currentVideos.get(String(id));
                if (video) {
                    if (video.status === 'processing' || video.status === 'queued') {
                        window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/uploading' }}));
                    } else {
                        let base = window.AppBasePath || '';
                        let userUuid = this.manager.getUserId();
                        window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: `${base}/studio/edit/${userUuid}/${video.uuid}` }}));
                    }
                }
            };
        }
    }

    async handleFilesSelection(files) {
        if (!files || files.length === 0) return;

        const routeName = ApiRoutes.Studio?.UploadVideo || 'studio.upload_video';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const preCheckRes = await this.api.post(routeName, {
                    pre_check: true,
                    total_size: file.size
                });
                
                if (preCheckRes.status !== 'success') {
                    alert(`No se puede subir "${file.name}": ${preCheckRes.message}`);
                    return; 
                }
            } catch (error) {
                console.error(error);
                alert(`Error verificando permisos para "${file.name}".`);
                return;
            }
        }

        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        const uploadProgressBar = document.getElementById('uploadProgressBar');
        if(uploadProgressContainer) uploadProgressContainer.style.display = 'block';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const result = await this.api.uploadFileInChunks(
                    routeName, 
                    file, 
                    'video', 
                    { total_size: file.size },
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
        const routeName = ApiRoutes.Studio?.GetActiveUploads || 'studio.get_active_uploads';
        const response = await this.api.post(routeName);
        
        if (response.status === 'success') {
            const videos = response.data;
            if (videos.length === 0) {
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/upload' }}));
                return;
            }

            this.currentVideos.clear();

            videos.forEach(v => {
                this.currentVideos.set(String(v.id), {
                    ...v,
                    id: String(v.id)
                });
            });

            this.renderBadges();
            this.selectVideo(String(videos[0].id));
        }
    }

    async initEditView() {
        const pathParts = window.location.pathname.split('/');
        const uuid = pathParts[pathParts.length - 1]; 
        if (!uuid) return;

        const routeName = ApiRoutes.Studio?.GetVideo || 'studio.get_video';
        const res = await this.api.post(routeName, { uuid: uuid });
        
        if (res.status === 'success') {
            const video = res.data;
            this.selectedVideoId = String(video.id);
            this.currentVideos.set(this.selectedVideoId, video);
            
            const titleInput = document.getElementById('videoTitleInput');
            const descInput = document.getElementById('videoDescriptionInput');
            
            if (titleInput) titleInput.value = video.title || video.original_filename || '';
            if (descInput) descInput.value = video.description || '';
            
            this.updateThumbnailPreview(video.thumbnail_path);
            
            const btnSave = document.getElementById('btnSaveChanges');
            if (btnSave) {
                btnSave.onclick = async () => {
                    btnSave.disabled = true;
                    btnSave.innerHTML = '<span class="material-symbols-rounded">sync</span> <span>Guardando...</span>';
                    
                    const newTitle = titleInput ? titleInput.value.trim() : '';
                    const newDesc = descInput ? descInput.value.trim() : '';
                    
                    if (newTitle.length === 0) {
                        alert("El título no puede estar vacío.");
                        btnSave.disabled = false;
                        btnSave.innerHTML = '<span class="material-symbols-rounded">save</span> <span>Guardar cambios</span>';
                        return;
                    }

                    const updateRoute = ApiRoutes.Studio?.UpdateTitle || 'studio.update_title';
                    const updateRes = await this.api.post(updateRoute, {
                        video_id: this.selectedVideoId,
                        title: newTitle,
                        description: newDesc
                    });

                    if (updateRes.status === 'success') {
                        video.title = newTitle;
                        video.description = newDesc;
                        alert('Los cambios se han guardado con éxito.');
                    } else {
                        alert("Error guardando datos: " + updateRes.message);
                    }
                    
                    btnSave.disabled = false;
                    btnSave.innerHTML = '<span class="material-symbols-rounded">save</span> <span>Guardar cambios</span>';
                };
            }
        } else {
            alert('No se pudo encontrar la información del video.');
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

        if (video.draftTitle === undefined) video.draftTitle = video.title || video.original_filename || '';
        if (video.draftDescription === undefined) video.draftDescription = video.description || '';
        if (video.draftThumbnailPreview === undefined) video.draftThumbnailPreview = video.thumbnail_path;

        const displayTitle = document.querySelector('[data-ref="display-title"]');
        const titleInput = document.getElementById('videoTitleInput');
        const descInput = document.getElementById('videoDescriptionInput');
        
        if(displayTitle) displayTitle.textContent = video.draftTitle;
        if(titleInput) titleInput.value = video.draftTitle;
        if(descInput) descInput.value = video.draftDescription;

        this.setEditState('title', false);

        const previewOriginalFilename = document.getElementById('previewOriginalFilename');
        if(previewOriginalFilename) previewOriginalFilename.textContent = video.original_filename;
        
        this.updateThumbnailPreview(video.draftThumbnailPreview);

        const cancelBtn = document.getElementById('btnCancelVideo');
        if (cancelBtn) {
            cancelBtn.classList.remove('disabled');
            cancelBtn.removeAttribute('disabled');
        }

        const thumbGrid = document.getElementById('generatedThumbnailsContainer');
        if(thumbGrid) {
            thumbGrid.innerHTML = '';
            thumbGrid.style.display = 'none';
        }

        this.validatePublishButton();
    }

    async generateThumbnails() {
        if (!this.selectedVideoId) return;
        const videoData = this.currentVideos.get(this.selectedVideoId);
        
        if (!videoData || (videoData.status !== 'processed' && videoData.status !== 'published')) {
            alert("El video debe terminar de procesarse al 100% para poder generar sus miniaturas.");
            return;
        }

        const btn = document.getElementById('btnGenerateThumbnails');
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-rounded">sync</span><span>Cargando opciones...</span>';
        btn.disabled = true;

        const grid = document.getElementById('generatedThumbnailsContainer');
        grid.style.display = 'grid';
        grid.innerHTML = '';

        try {
            await new Promise(r => setTimeout(r, 600));

            const uuid = videoData.uuid;
            let baseUrl = window.AppBasePath || window.location.origin;
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

            for (let i = 1; i <= 6; i++) {
                const thumbUrl = `${baseUrl}/public/storage/thumbnails/generated/${uuid}/thumb_${i}.jpg`;
                const relativePath = `/storage/thumbnails/generated/${uuid}/thumb_${i}.jpg`;
                
                const item = document.createElement('div');
                item.className = 'component-thumbnail-item';
                item.innerHTML = `<img src="${thumbUrl}" alt="Opción ${i}" onerror="this.parentElement.style.display='none'">`;
                
                item.onclick = () => this.selectGeneratedThumbnail(item, thumbUrl, relativePath);
                grid.appendChild(item);
            }

        } catch (error) {
            console.error(error);
            alert("Error al cargar las miniaturas.");
            grid.style.display = 'none';
        } finally {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    }

    async selectGeneratedThumbnail(itemElement, fullUrl, relativePath) {
        document.querySelectorAll('.component-thumbnail-item').forEach(el => el.classList.remove('component-thumbnail-selected'));
        itemElement.classList.add('component-thumbnail-selected');
        
        const hiddenInput = document.getElementById('selectedGeneratedThumbnail');
        if (hiddenInput) hiddenInput.value = relativePath;

        const video = this.currentVideos.get(this.selectedVideoId);
        if (video) {
            video.draftThumbnailType = 'generated';
            video.draftThumbnailData = relativePath;
            video.draftThumbnailPreview = fullUrl;
            
            this.updateThumbnailPreview(fullUrl);
            this.validatePublishButton();
        }
    }

    updateThumbnailPreview(thumbnailPath) {
        const container = document.querySelector('.studio-video-card__player');
        if (!container) return;

        if (thumbnailPath) {
            let finalUrl = thumbnailPath;
            let isBlob = finalUrl.startsWith('blob:') || finalUrl.startsWith('data:');
            
            if (!isBlob && !finalUrl.startsWith('http')) {
                let cleanPath = thumbnailPath.replace(/^\//, '');
                if (!cleanPath.startsWith('public/')) {
                    cleanPath = 'public/' + cleanPath;
                }
                let base = window.AppBasePath || window.location.origin;
                if (base.endsWith('/')) base = base.slice(0, -1);
                finalUrl = base + '/' + cleanPath;
            }

            // Eliminar cb residual si quedó atrapado en el estado
            if (finalUrl.includes('?cb=')) finalUrl = finalUrl.split('?cb=')[0];

            container.style.backgroundImage = 'none';
            container.style.backgroundColor = 'transparent';
            container.style.position = 'relative';
            
            // Asignamos imagen inmediata (sin parámetros en la URL)
            container.innerHTML = `
                <img id="dynamicThumbPreview" src="${finalUrl}" 
                     alt="Miniatura" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit; position: absolute; top: 0; left: 0;" 
                     onerror="if(!this.dataset.retried) { this.dataset.retried = 'true'; this.src = this.src.replace('/public/storage/', '/storage/'); } else { this.style.display='none'; this.nextElementSibling.style.display='block'; }">
                <span class="material-symbols-rounded" style="color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; z-index: 2; text-shadow: 0 2px 5px rgba(0,0,0,0.7);">play_circle</span>
            `;

            // Bypass de caché "silencioso": usamos Fetch para forzar recarga en vez de ensuciar la URL con ?cb=
            if (!isBlob && !finalUrl.includes('/generated/')) {
                const fetchImage = async (url) => {
                    try {
                        const response = await fetch(url, { cache: 'reload' });
                        if (response.ok) {
                            const blob = await response.blob();
                            const img = document.getElementById('dynamicThumbPreview');
                            if (img) img.src = URL.createObjectURL(blob); // Renderizamos blob limpio
                        } else if (url.includes('/public/storage/')) {
                            // Fallback de ruta segura si public/ no era el destino correcto
                            fetchImage(url.replace('/public/storage/', '/storage/'));
                        }
                    } catch (e) {
                        console.warn("No se pudo saltar el caché visual (modo estricto de red):", e);
                    }
                };
                fetchImage(finalUrl);
            }
        } else {
            container.style.backgroundImage = 'none';
            container.style.backgroundColor = 'var(--background-secondary, #2a2a2a)';
            container.innerHTML = '<span class="material-symbols-rounded" style="color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px;">play_circle</span>';
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

            const row = document.getElementById(`video-row-${matchedKey}`);
            if (row && row.children[1]) {
                const statusCell = row.children[1];
                if (data.status === 'processing') statusCell.innerHTML = `<span class="status-badge status-processing">Procesando ${data.progress || 0}%</span>`;
                else if (data.status === 'processed') statusCell.innerHTML = '<span class="status-badge status-processed">Procesado / Borrador</span>';
                else if (data.status === 'failed') statusCell.innerHTML = '<span class="status-badge status-failed">Error</span>';
                else if (data.status === 'published') statusCell.innerHTML = '<span class="status-badge status-published">Publicado</span>';
            }
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
            const video = this.currentVideos.get(this.selectedVideoId);
            if (video) {
                video.draftTitle = newTitle;
                video.draftDescription = newDesc;
                if (displayEl) displayEl.textContent = newTitle;
                this.setEditState('title', false);
                this.validatePublishButton();
            }
        } else {
            alert("El título no puede estar vacío.");
        }
    }

    async saveDescriptionField() {
        if (!this.selectedVideoId) return;
        const descInput = document.getElementById('videoDescriptionInput');
        if (!descInput) return;

        const newDesc = descInput.value.trim();
        const video = this.currentVideos.get(this.selectedVideoId);
        if (video) {
            video.draftDescription = newDesc;
        }
    }

    attachEvents() {
        if (window.AppStudioEventsBound) return;
        window.AppStudioEventsBound = true;

        document.addEventListener('click', (e) => {
            const controller = window.currentStudioController;
            if (!controller) return;

            const btnGen = e.target.closest('#btnGenerateThumbnails');
            if (btnGen) {
                controller.generateThumbnails();
                return;
            }

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
                if (controller && !window.location.pathname.includes('/studio/edit/')) {
                    controller.saveDescriptionField();
                }
            }
        });

        document.addEventListener('change', async (e) => {
            const controller = window.currentStudioController;
            if (!controller) return;

            if (e.target && e.target.id === 'thumbnailInput') {
                if (!e.target.files.length || !controller.selectedVideoId) return;
                
                const file = e.target.files[0];
                const localPreviewUrl = URL.createObjectURL(file);
                
                const video = controller.currentVideos.get(controller.selectedVideoId);
                if (video) {
                    video.draftThumbnailType = 'file';
                    video.draftThumbnailData = file;
                    video.draftThumbnailPreview = localPreviewUrl;
                    
                    controller.updateThumbnailPreview(localPreviewUrl);
                    controller.validatePublishButton();
                }
                
                e.target.value = ''; 
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
        const btnGen = document.getElementById('btnGenerateThumbnails');

        if (!this.selectedVideoId) {
            if(btn) { btn.setAttribute('disabled', 'true'); btn.classList.add('disabled'); }
            if(btnGen) { btnGen.setAttribute('disabled', 'true'); btnGen.classList.add('disabled'); }
            return;
        }

        const video = this.currentVideos.get(this.selectedVideoId);
        if (!video) return;
        
        const isProcessed = video.status === 'processed';
        const isPublished = video.status === 'published';
        const hasTitle = (video.draftTitle && video.draftTitle.trim().length > 0); 
        const hasThumb = (video.draftThumbnailType !== undefined && video.draftThumbnailData) || video.thumbnail_path;

        if (isProcessed && hasTitle && hasThumb) {
            if(btn) { btn.removeAttribute('disabled'); btn.classList.remove('disabled'); }
        } else {
            if(btn) { btn.setAttribute('disabled', 'true'); btn.classList.add('disabled'); }
        }

        if (isProcessed || isPublished) {
            if(btnGen) { btnGen.removeAttribute('disabled'); btnGen.classList.remove('disabled'); }
        } else {
            if(btnGen) { btnGen.setAttribute('disabled', 'true'); btnGen.classList.add('disabled'); }
        }
    }

    async publishVideo() {
        if (!this.selectedVideoId) return;
        const video = this.currentVideos.get(this.selectedVideoId);
        if (!video) return;

        const btn = document.getElementById('btnPublishVideo');
        if (btn) {
            btn.setAttribute('disabled', 'true');
            btn.classList.add('disabled');
            btn.innerHTML = '<span class="material-symbols-rounded">sync</span><span>Publicando...</span>';
        }

        const formData = new FormData();
        formData.append('video_id', this.selectedVideoId);
        formData.append('title', video.draftTitle);
        formData.append('description', video.draftDescription || '');

        if (video.draftThumbnailType === 'file') {
            formData.append('thumbnail', video.draftThumbnailData);
        } else if (video.draftThumbnailType === 'generated') {
            formData.append('generated_path', video.draftThumbnailData);
        }

        const routeName = ApiRoutes.Studio?.PublishVideo || 'studio.publish_video';
        
        try {
            const res = await this.api.postForm(routeName, formData);

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
                alert("Error al publicar: " + res.message);
                if (btn) {
                    btn.removeAttribute('disabled');
                    btn.classList.remove('disabled');
                    btn.innerHTML = '<span class="material-symbols-rounded">publish</span><span data-i18n="studio_publish">Publicar</span>';
                }
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al publicar.");
            if (btn) {
                btn.removeAttribute('disabled');
                btn.classList.remove('disabled');
                btn.innerHTML = '<span class="material-symbols-rounded">publish</span><span data-i18n="studio_publish">Publicar</span>';
            }
        }
    }

    async cancelVideo() {
        if (!this.selectedVideoId) return;
        
        const btn = document.getElementById('btnCancelVideo');
        if (btn) {
            btn.classList.add('disabled');
            btn.setAttribute('disabled', 'true');
        }

        const routeName = ApiRoutes.Studio?.CancelUpload || 'studio.cancel_upload';
        const res = await this.api.post(routeName, {
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
            if (btn) {
                btn.classList.remove('disabled');
                btn.removeAttribute('disabled');
            }
        }
    }
}