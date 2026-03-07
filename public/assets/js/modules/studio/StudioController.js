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

    getAuthToken() { return 'mi_token_super_secreto_y_seguro_2026'; }

    getUserId() {
        if (window.AppRouteTitles) {
            const routes = Object.keys(window.AppRouteTitles);
            const panelRoute = routes.find(r => r.startsWith('/studio/management-panel/'));
            if (panelRoute) return panelRoute.replace('/studio/management-panel/', '');
        }
        const match = window.location.pathname.match(/\/studio\/(?:manage-content|management-panel|edit)\/([a-f0-9\-]{36})/);
        if (match) return match[1];
        return '0';
    }

    generateRequestId() {
        return Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    }

    onMessage(type, callback) { this.callbacks[type] = callback; }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
        this.isConnecting = true;
        try {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => {
                this.isConnecting = false;
                const authPayload = { type: "auth", token: this.getAuthToken(), userId: this.getUserId(), requestId: this.generateRequestId() };
                this.ws.send(JSON.stringify(authPayload));
            };
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.status === "error" && (data.code === "AUTH_FAILED" || data.code === "AUTH_TIMEOUT")) {
                        this.disconnect(); return;
                    }
                    if (data.type === 'progress' || data.type === 'completed' || data.type === 'failed') {
                        if (this.callbacks['progressUpdate']) this.callbacks['progressUpdate'](data);
                    }
                } catch (error) { console.error('[WS] Error parseando mensaje', error); }
            };
            this.ws.onclose = () => { this.isConnecting = false; this.ws = null; };
            this.ws.onerror = () => { this.isConnecting = false; };
        } catch (error) { console.error('[WS] Error iniciando conexión', error); }
    }

    disconnect() {
        if (this.ws) { this.ws.close(1000, "Navegación fuera de Studio"); this.ws = null; }
    }

    handleRouteUpdate(event) {
        const { cleanUrl } = event.detail;
        if (!cleanUrl.includes('/studio')) this.disconnect();
        else this.connect();
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

        // --- SISTEMA DE TAGS ---
        this.selectedModels = [];
        this.selectedCategories = [];
        
        this.init();
    }

    init() {
        this.manager.connect();
        this.manager.onMessage('progressUpdate', this.handleWsProgress.bind(this));
        
        const path = window.location.pathname;
        if (path.includes('/studio/uploading')) this.initUploadingView();
        else if (path.includes('/studio/upload')) this.initUploadView();
        else if (path.includes('/studio/manage-content')) this.initManageContentView();
        else if (path.includes('/studio/edit/')) this.initEditView(); 

        this.attachEvents();
    }

    initUploadView() {}

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
            let base = window.AppBasePath || '';
            if (!base.startsWith('http')) base = window.location.origin + (base.startsWith('/') ? '' : '/') + base;
            if (base.endsWith('/')) base = base.slice(0, -1);
            let cleanPath = thumbUrl.replace(/^\//, '');
            let baseNoSlash = (window.AppBasePath || '').replace(/^\//, '');
            if (baseNoSlash && cleanPath.startsWith(baseNoSlash + '/')) cleanPath = cleanPath.substring(baseNoSlash.length + 1);
            if (!cleanPath.startsWith('public/')) cleanPath = 'public/' + cleanPath;
            thumbUrl = base + '/' + cleanPath;
        }
        
        const thumbHtml = thumbUrl ? `<img src="${thumbUrl}" class="table-video-thumb" alt="Miniatura">` : `<div class="table-video-thumb empty"><span class="material-symbols-rounded">video_file</span></div>`;
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
        document.querySelectorAll('#manageContentTableBody tr').forEach(row => row.classList.remove('component-table-row--selected'));
        const row = document.getElementById(`video-row-${id}`);
        if (row) row.classList.add('component-table-row--selected');

        const editBtn = document.getElementById('btnEditSelectedVideo');
        if (editBtn) {
            editBtn.removeAttribute('disabled');
            editBtn.classList.remove('disabled');
            editBtn.onclick = () => {
                const video = this.currentVideos.get(String(id));
                if (video) {
                    if (video.status === 'processing' || video.status === 'queued') window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/uploading' }}));
                    else {
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
                const preCheckRes = await this.api.post(routeName, { pre_check: true, total_size: file.size });
                if (preCheckRes.status !== 'success') {
                    alert(`No se puede subir "${file.name}": ${preCheckRes.message}`);
                    return; 
                }
            } catch (error) {
                console.error(error); alert(`Error verificando permisos para "${file.name}".`); return;
            }
        }
        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        const uploadProgressBar = document.getElementById('uploadProgressBar');
        if(uploadProgressContainer) uploadProgressContainer.style.display = 'block';

        const uploadTagsSection = document.getElementById('uploadTagsSection');
        if(uploadTagsSection) uploadTagsSection.style.display = 'block';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const result = await this.api.uploadFileInChunks(
                    routeName, file, 'video', { total_size: file.size },
                    (percent) => { if(uploadProgressBar) uploadProgressBar.style.width = `${percent}%`; }
                );
                if (result.status !== 'success') alert(`Error subiendo ${file.name}: ${result.message}`);
            } catch (error) { console.error(error); }
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
            videos.forEach(v => { this.currentVideos.set(String(v.id), { ...v, id: String(v.id) }); });
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

            this.selectedModels = [];
            this.selectedCategories = [];
            if (video.tags && Array.isArray(video.tags)) {
                video.tags.forEach(tag => {
                    const isNew = tag.is_official === 0 || tag.is_official === "0";
                    if (tag.type === 'modelo') this.selectedModels.push({...tag, isNew: isNew});
                    else if (tag.type === 'category') this.selectedCategories.push({...tag, isNew: isNew});
                });
            }
            this.renderSelectedTags('modelo');
            this.renderSelectedTags('category');
            
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

                    const modelsIds = this.selectedModels.map(t => t.isNew ? t.name : parseInt(t.id));
                    const categoriesIds = this.selectedCategories.map(t => t.isNew ? t.name : parseInt(t.id));

                    let hasError = false;
                    const updateRoute = ApiRoutes.Studio?.UpdateTitle || 'studio.update_title';
                    const updateRes = await this.api.post(updateRoute, {
                        video_id: this.selectedVideoId,
                        title: newTitle,
                        description: newDesc,
                        models: modelsIds,
                        categories: categoriesIds
                    });

                    if (updateRes.status === 'success') {
                        video.title = newTitle;
                        video.description = newDesc;
                    } else {
                        alert("Error guardando datos: " + updateRes.message);
                        hasError = true;
                    }

                    if (!hasError && video.draftThumbnailType) {
                        const formData = new FormData();
                        formData.append('video_id', this.selectedVideoId);

                        if (video.draftThumbnailType === 'file') formData.append('thumbnail', video.draftThumbnailData);
                        else if (video.draftThumbnailType === 'generated') formData.append('generated_path', video.draftThumbnailData);

                        const thumbRoute = ApiRoutes.Studio?.UploadThumbnail || 'studio.upload_thumbnail';
                        try {
                            const thumbRes = await this.api.postForm(thumbRoute, formData);
                            if (thumbRes.status === 'success') {
                                video.draftThumbnailType = null;
                            } else {
                                alert("Textos guardados, pero error con la miniatura: " + thumbRes.message);
                            }
                        } catch (error) { console.error(error); }
                    }
                    
                    if(!hasError) alert('Los cambios se han guardado con éxito.');
                    
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

            badge.innerHTML = `<span class="name">${video.original_filename}</span><span class="status" id="badge-status-${video.id}">${statusText}</span>`;
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
        if(thumbGrid) { thumbGrid.innerHTML = ''; thumbGrid.style.display = 'none'; }

        this.selectedModels = [];
        this.selectedCategories = [];
        if (video.tags && Array.isArray(video.tags)) {
            video.tags.forEach(tag => {
                const isNew = tag.is_official === 0 || tag.is_official === "0";
                if (tag.type === 'modelo') this.selectedModels.push({...tag, isNew: isNew});
                else if (tag.type === 'category') this.selectedCategories.push({...tag, isNew: isNew});
            });
        }
        this.renderSelectedTags('modelo');
        this.renderSelectedTags('category');

        this.validatePublishButton();
    }

    // --- LÓGICA DE ETIQUETAS Y BÚSQUEDA ---
    async toggleTagsMenu(menu, type) {
        const isClosing = menu.classList.contains('active');
        
        document.querySelectorAll('.component-module[id$="SelectorMenu"]').forEach(m => {
            if (m !== menu) {
                m.classList.remove('active');
                m.classList.add('disabled');
            }
        });

        if (isClosing) {
            menu.classList.remove('active');
            menu.classList.add('disabled');
            return;
        }

        menu.classList.remove('disabled');
        menu.classList.add('active');
        
        const list = menu.querySelector('.tag-results-list');
        const input = menu.querySelector('.tag-search-input');
        if (input) input.value = ''; 
        
        list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary);"><span class="material-symbols-rounded">sync</span> Cargando...</div>';

        try {
            const res = type === 'modelo' ? await this.api.fetchModels() : await this.api.fetchCategories();
            
            if (res.status === 'success') {
                list.innerHTML = '';
                const currentSelection = type === 'modelo' ? this.selectedModels : this.selectedCategories;
                const currentIds = currentSelection.map(t => t.isNew ? t.name : parseInt(t.id));

                if (res.data.length === 0) {
                    list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">No hay opciones oficiales. Escribe para crear una local.</div>';
                    return;
                }

                res.data.forEach(tag => {
                    const isActive = currentIds.includes(parseInt(tag.id));

                    const item = document.createElement('div');
                    item.className = `component-menu-link tag-option-link ${isActive ? 'active' : ''}`;
                    item.setAttribute('data-id', tag.id);
                    item.setAttribute('data-name', tag.name);
                    item.setAttribute('data-type', tag.type);
                    item.setAttribute('data-is-new', 'false');

                    let icon = tag.type === 'modelo' ? 'person' : 'category';
                    item.innerHTML = `
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">${icon}</span></div>
                        <div class="component-menu-link-text"><span>${tag.name}</span></div>
                    `;
                    list.appendChild(item);
                });
            } else {
                list.innerHTML = `<div style="padding: 16px; color: red;">Error: ${res.message}</div>`;
            }
        } catch (error) {
            list.innerHTML = '<div style="padding: 16px; color: red;">Error de red</div>';
        }
    }

    addTag(id, name, type, isNew = false) {
        const arr = type === 'modelo' ? this.selectedModels : this.selectedCategories;
        
        if (!arr.find(t => t.name.toLowerCase() === name.toLowerCase())) {
            arr.push({ id, name, type, isNew });
            this.renderSelectedTags(type);
            
            const menuId = type === 'modelo' ? 'modelsSelectorMenu' : 'categoriesSelectorMenu';
            const menu = document.getElementById(menuId);
            
            if (menu) {
                const input = menu.querySelector('.tag-search-input');
                if (input) {
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            
            const option = document.querySelector(`#${menuId} .tag-option-link[data-id="${id}"]`);
            if (option) option.classList.add('active');
            
            this.validatePublishButton();
        }
    }

    removeTag(id, type) {
        if (type === 'modelo') {
            this.selectedModels = this.selectedModels.filter(t => String(t.id) !== String(id));
        } else {
            this.selectedCategories = this.selectedCategories.filter(t => String(t.id) !== String(id));
        }
        
        this.renderSelectedTags(type);
        this.validatePublishButton();

        const menuId = type === 'modelo' ? 'modelsSelectorMenu' : 'categoriesSelectorMenu';
        const option = document.querySelector(`#${menuId} .tag-option-link[data-id="${id}"]`);
        if (option) option.classList.remove('active');
    }

    renderSelectedTags(type) {
        const arr = type === 'modelo' ? this.selectedModels : this.selectedCategories;
        const hiddenId = type === 'modelo' ? 'hiddenModelsArray' : 'hiddenCategoriesArray';
        const wrapperId = type === 'modelo' ? 'modelsTagsWrapper' : 'categoriesTagsWrapper';
        const containerId = type === 'modelo' ? 'selectedModelsContainer' : 'selectedCategoriesContainer';
        const triggerAttr = type === 'modelo' ? 'modelsSelectorMenu' : 'categoriesSelectorMenu';

        const hiddenInput = document.getElementById(hiddenId);
        if (!hiddenInput) return;

        let wrapper = document.getElementById(wrapperId);

        // Si el arreglo está vacío, removemos el contenedor del DOM
        if (arr.length === 0) {
            if (wrapper) wrapper.remove();
            hiddenInput.value = '[]';
            return;
        }

        // Si hay elementos pero el contenedor no existe, lo creamos
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = wrapperId;
            wrapper.style.cssText = "padding: 0 16px 16px 16px; width: 100%;";
            
            const innerContainer = document.createElement('div');
            innerContainer.id = containerId;
            innerContainer.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px;";
            
            wrapper.appendChild(innerContainer);
            
            // Buscar en dónde montarlo (al final del padre del trigger)
            const triggerEl = document.querySelector(`[data-target="${triggerAttr}"]`);
            if (triggerEl) {
                const parentGroup = triggerEl.closest('.component-group-item');
                if (parentGroup) parentGroup.appendChild(wrapper);
            }
        }

        const container = document.getElementById(containerId);
        if (!container) return; 

        container.innerHTML = '';
        arr.forEach(tag => {
            const pill = document.createElement('div');
            pill.className = 'tag-pill';
            
            const iconHtml = tag.isNew 
                ? '<span class="material-symbols-rounded" style="font-size: 14px; margin-right: 4px; color: var(--accent-color);" title="Etiqueta local (Sólo para este video)">push_pin</span>' 
                : '';
                
            pill.innerHTML = `
                ${iconHtml}
                <span class="tag-pill-text">${tag.name}</span>
                <span class="material-symbols-rounded tag-pill-remove" data-id="${tag.id}" data-type="${type}">close</span>
            `;

            if (tag.isNew) {
                pill.style.border = '1px dashed var(--border-color)';
                pill.style.backgroundColor = 'transparent';
            }

            container.appendChild(pill);
        });

        hiddenInput.value = JSON.stringify(arr.map(t => t.isNew ? t.name : parseInt(t.id)));
    }
    // ----------------------------------------

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
            let baseUrl = window.AppBasePath || '';
            if (!baseUrl.startsWith('http')) baseUrl = window.location.origin + (baseUrl.startsWith('/') ? '' : '/') + baseUrl;
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
            console.error(error); alert("Error al cargar las miniaturas."); grid.style.display = 'none';
        } finally {
            btn.innerHTML = originalBtnText; btn.disabled = false;
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
                let base = window.AppBasePath || '';
                if (!base.startsWith('http')) base = window.location.origin + (base.startsWith('/') ? '' : '/') + base;
                if (base.endsWith('/')) base = base.slice(0, -1);
                let cleanPath = thumbnailPath.replace(/^\//, '');
                let baseNoSlash = (window.AppBasePath || '').replace(/^\//, '');
                if (baseNoSlash && cleanPath.startsWith(baseNoSlash + '/')) cleanPath = cleanPath.substring(baseNoSlash.length + 1);
                if (!cleanPath.startsWith('public/')) cleanPath = 'public/' + cleanPath;
                finalUrl = base + '/' + cleanPath;
            }

            if (finalUrl.includes('?cb=')) finalUrl = finalUrl.split('?cb=')[0];

            container.style.backgroundImage = 'none';
            container.style.backgroundColor = 'transparent';
            container.style.position = 'relative';
            
            container.innerHTML = `
                <img id="dynamicThumbPreview" src="${finalUrl}" 
                     alt="Miniatura" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit; position: absolute; top: 0; left: 0;" 
                     onerror="if(!this.dataset.retried) { this.dataset.retried = 'true'; this.src = this.src.replace('/public/storage/', '/storage/'); } else { this.style.display='none'; this.nextElementSibling.style.display='block'; }">
                <span class="material-symbols-rounded" style="color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; z-index: 2; text-shadow: 0 2px 5px rgba(0,0,0,0.7);">play_circle</span>
            `;

            if (!isBlob && !finalUrl.includes('/generated/')) {
                const fetchImage = async (url) => {
                    try {
                        const response = await fetch(url, { cache: 'reload' });
                        if (response.ok) {
                            const blob = await response.blob();
                            const img = document.getElementById('dynamicThumbPreview');
                            if (img) img.src = URL.createObjectURL(blob); 
                        } else if (url.includes('/public/storage/')) {
                            fetchImage(url.replace('/public/storage/', '/storage/'));
                        }
                    } catch (e) { console.warn("Cache visual error:", e); }
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
        let matchedKey = null; let videoObj = null;

        if (this.currentVideos.has(wsVideoIdStr)) {
            matchedKey = wsVideoIdStr; videoObj = this.currentVideos.get(wsVideoIdStr);
        } else {
            for (const [key, v] of this.currentVideos.entries()) {
                if (String(v.uuid) === wsUuidStr || String(v.id) === wsUuidStr || String(v.id) === wsVideoIdStr) {
                    matchedKey = key; videoObj = v; break;
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

            if (this.selectedVideoId === matchedKey) this.validatePublishButton();

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
                viewState.style.display = 'none'; viewState.classList.remove('active'); viewState.classList.add('disabled');
                editState.style.display = 'flex'; editState.classList.remove('disabled'); editState.classList.add('active');
            } else {
                editState.style.display = 'none'; editState.classList.remove('active'); editState.classList.add('disabled');
                viewState.style.display = 'flex'; viewState.classList.remove('disabled'); viewState.classList.add('active');
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
        } else alert("El título no puede estar vacío.");
    }

    async saveDescriptionField() {
        if (!this.selectedVideoId) return;
        const descInput = document.getElementById('videoDescriptionInput');
        if (!descInput) return;
        const video = this.currentVideos.get(this.selectedVideoId);
        if (video) video.draftDescription = descInput.value.trim();
    }

    attachEvents() {
        if (window.AppStudioEventsBound) return;
        window.AppStudioEventsBound = true;

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('tag-search-input')) {
                const term = e.target.value.toLowerCase().trim();
                const menu = e.target.closest('.component-menu');
                const list = menu.querySelector('.tag-results-list');
                
                if(list) {
                    let exactMatch = false;
                    
                    list.querySelectorAll('.tag-option-link:not(.tag-create-link)').forEach(item => {
                        const name = item.getAttribute('data-name').toLowerCase();
                        const isMatch = name.includes(term);
                        item.style.display = isMatch ? 'flex' : 'none';
                        if (name === term) exactMatch = true;
                    });

                    const existingCreateBtn = list.querySelector('.tag-create-link');
                    if (existingCreateBtn) existingCreateBtn.remove();

                    if (term.length > 0 && !exactMatch) {
                        const isModels = e.target.closest('#modelsSelectorMenu') !== null;
                        const type = isModels ? 'modelo' : 'category';
                        const originalTerm = e.target.value.trim();
                        
                        const createBtn = document.createElement('div');
                        createBtn.className = 'component-menu-link tag-option-link tag-create-link';
                        createBtn.setAttribute('data-id', 'new_' + Date.now()); 
                        createBtn.setAttribute('data-name', originalTerm);
                        createBtn.setAttribute('data-type', type);
                        createBtn.setAttribute('data-is-new', 'true');
                        
                        createBtn.innerHTML = `
                            <div class="component-menu-link-icon" style="color: var(--accent-color);"><span class="material-symbols-rounded">add_box</span></div>
                            <div class="component-menu-link-text">
                                <span style="display:block; line-height:1.2;">Crear "<b>${originalTerm}</b>"</span>
                                <span style="font-size: 11px; color: var(--text-secondary);">Etiqueta local (sólo para este video)</span>
                            </div>
                        `;
                        list.appendChild(createBtn);
                    }
                }
            }
        });

        document.addEventListener('click', (e) => {
            const controller = window.currentStudioController;
            if (!controller) return;

            const toggleTagsBtn = e.target.closest('[data-action="toggleStudioTags"]');
            if (toggleTagsBtn) {
                const targetId = toggleTagsBtn.getAttribute('data-target');
                const type = toggleTagsBtn.getAttribute('data-type');
                const menu = document.getElementById(targetId);
                if (menu) controller.toggleTagsMenu(menu, type);
                return; 
            }

            // Click en tag desde el menú
            const tagOption = e.target.closest('.tag-option-link');
            if (tagOption) {
                const id = tagOption.getAttribute('data-id');
                const name = tagOption.getAttribute('data-name');
                const type = tagOption.getAttribute('data-type');
                const isNew = tagOption.getAttribute('data-is-new') === 'true';
                
                // Si ya estaba activo, lo eliminamos; si no, lo agregamos.
                if (tagOption.classList.contains('active')) {
                    controller.removeTag(id, type);
                } else {
                    controller.addTag(id, name, type, isNew);
                }
                return;
            }

            // Clic en la "X" del pill para remover un tag seleccionado
            const removePill = e.target.closest('.tag-pill-remove');
            if (removePill) {
                const id = removePill.getAttribute('data-id');
                const type = removePill.getAttribute('data-type');
                controller.removeTag(id, type);
                return;
            }

            const btnGen = e.target.closest('#btnGenerateThumbnails');
            if (btnGen) { controller.generateThumbnails(); return; }

            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            const action = btn.getAttribute('data-action');
            const target = btn.getAttribute('data-target');

            if (action === 'toggleEditState') {
                const currentState = document.querySelector(`[data-state="${target}-edit"]`).style.display !== 'none';
                controller.setEditState(target, !currentState);
            }
            if (action === 'saveTitle') controller.saveTitleField();
            if (action === 'publishVideo') controller.publishVideo();
            if (action === 'cancelVideo') {
                if (confirm("¿Estás seguro de que deseas cancelar la subida/procesamiento de este video? Se eliminará permanentemente.")) {
                    controller.cancelVideo();
                }
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target && e.target.id === 'videoDescriptionInput') {
                const controller = window.currentStudioController;
                if (controller && !window.location.pathname.includes('/studio/edit/')) controller.saveDescriptionField();
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

            if (e.target && e.target.id === 'videoFileInput') controller.handleFilesSelection(e.target.files);
        });

        document.addEventListener('dragover', (e) => { const dropZone = e.target.closest('#videoDropZone'); if (dropZone) { e.preventDefault(); dropZone.classList.add('dragover'); }});
        document.addEventListener('dragleave', (e) => { const dropZone = e.target.closest('#videoDropZone'); if (dropZone) dropZone.classList.remove('dragover');});
        document.addEventListener('drop', (e) => {
            const dropZone = e.target.closest('#videoDropZone');
            if (dropZone) {
                e.preventDefault(); dropZone.classList.remove('dragover');
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
        
        const modelsArr = document.getElementById('hiddenModelsArray') ? document.getElementById('hiddenModelsArray').value : '[]';
        const categoriesArr = document.getElementById('hiddenCategoriesArray') ? document.getElementById('hiddenCategoriesArray').value : '[]';
        formData.append('models', modelsArr);
        formData.append('categories', categoriesArr);

        if (video.draftThumbnailType === 'file') formData.append('thumbnail', video.draftThumbnailData);
        else if (video.draftThumbnailType === 'generated') formData.append('generated_path', video.draftThumbnailData);

        const routeName = ApiRoutes.Studio?.PublishVideo || 'studio.publish_video';
        try {
            const res = await this.api.postForm(routeName, formData);
            if (res.status === 'success') {
                alert("¡Video publicado con éxito!");
                this.currentVideos.delete(this.selectedVideoId);
                this.renderBadges();
                if (this.currentVideos.size > 0) this.selectVideo(this.currentVideos.keys().next().value);
                else window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/manage-content' }}));
            } else {
                alert("Error al publicar: " + res.message);
                if (btn) { btn.removeAttribute('disabled'); btn.classList.remove('disabled'); btn.innerHTML = '<span class="material-symbols-rounded">publish</span><span data-i18n="studio_publish">Publicar</span>'; }
            }
        } catch (error) {
            console.error(error); alert("Error de conexión al publicar.");
            if (btn) { btn.removeAttribute('disabled'); btn.classList.remove('disabled'); btn.innerHTML = '<span class="material-symbols-rounded">publish</span><span data-i18n="studio_publish">Publicar</span>'; }
        }
    }

    async cancelVideo() {
        if (!this.selectedVideoId) return;
        const btn = document.getElementById('btnCancelVideo');
        if (btn) { btn.classList.add('disabled'); btn.setAttribute('disabled', 'true'); }

        const routeName = ApiRoutes.Studio?.CancelUpload || 'studio.cancel_upload';
        const res = await this.api.post(routeName, { video_id: this.selectedVideoId });

        if (res.status === 'success') {
            this.currentVideos.delete(this.selectedVideoId);
            this.renderBadges();
            if (this.currentVideos.size > 0) this.selectVideo(this.currentVideos.keys().next().value);
            else window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/upload' }}));
        } else {
            alert("Error al cancelar el video: " + res.message);
            if (btn) { btn.classList.remove('disabled'); btn.removeAttribute('disabled'); }
        }
    }
}