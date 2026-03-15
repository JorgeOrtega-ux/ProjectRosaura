import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { StudioTagsManager } from '../managers/StudioTagsManager.js';
import { StudioThumbnailManager } from '../managers/StudioThumbnailManager.js';

export class StudioUploadController {
    constructor(api, state) {
        this.api = api;
        this.state = state;
        
        this.handleDocumentChangeBound = this.handleDocumentChange.bind(this);
        this.handleDocumentDragOverBound = this.handleDocumentDragOver.bind(this);
        this.handleDocumentDragLeaveBound = this.handleDocumentDragLeave.bind(this);
        this.handleDocumentDropBound = this.handleDocumentDrop.bind(this);
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.handleDocumentInputBound = this.handleDocumentInput.bind(this); 
        this.updateUploadBadgesBound = this.updateUploadBadges.bind(this);

        const path = window.location.pathname;
        if (path.includes('/studio/uploading')) {
            this.initUploadingView();
            this.tagsManager = new StudioTagsManager(this.api, this.state, () => {
                this.handleTagsChanged();
            });
            this.thumbnailManager = new StudioThumbnailManager(this.api, this.state, () => {
                console.log("Miniatura actualizada en el estado.");
            });
        }
        
        this.attachEvents();
        window.addEventListener('studioVideoProgress', this.updateUploadBadgesBound);
    }

    destroy() {
        document.removeEventListener('change', this.handleDocumentChangeBound);
        document.removeEventListener('dragover', this.handleDocumentDragOverBound);
        document.removeEventListener('dragleave', this.handleDocumentDragLeaveBound);
        document.removeEventListener('drop', this.handleDocumentDropBound);
        document.removeEventListener('click', this.handleDocumentClickBound);
        document.removeEventListener('input', this.handleDocumentInputBound); 
        window.removeEventListener('studioVideoProgress', this.updateUploadBadgesBound);
        
        if (this.tagsManager && typeof this.tagsManager.destroy === 'function') {
            this.tagsManager.destroy();
        }
        if (this.thumbnailManager && typeof this.thumbnailManager.destroy === 'function') {
            this.thumbnailManager.destroy();
        }
    }

    getRoute(path) {
        return ((window.AppBasePath || '') + path).replace(/\/+/g, '/');
    }

    async handleFilesSelection(files) {
        // [BLINDAJE FRONTEND] Doble check antes de enviar archivos a RAM
        const hasPermission = window.appInstance ? window.appInstance.canUploadVideos : true;
        if (!hasPermission) {
            alert("Acceso denegado: No tienes permisos para subir videos.");
            return;
        }

        if (!files || files.length === 0) return;
        
        const routeName = ApiRoutes.Studio?.UploadVideo || 'studio.upload_video';
        const originalLanguage = 'es-419'; 

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

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const result = await this.api.uploadFileInChunks(
                    routeName, file, 'video', { total_size: file.size, original_language: originalLanguage },
                    (percent) => { if(uploadProgressBar) uploadProgressBar.style.width = `${percent}%`; }
                );
                if (result.status !== 'success') alert(`Error subiendo ${file.name}: ${result.message}`);
            } catch (error) { console.error(error); }
        }
        window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: this.getRoute('/studio/uploading') }}));
    }

    async initUploadingView() {
        const routeName = ApiRoutes.Studio?.GetActiveUploads || 'studio.get_active_uploads';
        const response = await this.api.post(routeName);
        if (response.status === 'success') {
            const videos = response.data;
            if (videos.length === 0) {
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: this.getRoute('/studio/upload') }}));
                return;
            }
            this.state.clear();
            videos.forEach(v => { this.state.setVideo(v.id, { ...v, id: String(v.id) }); });
            this.renderBadges();
            this.selectVideo(String(videos[0].id));
        }
    }

    renderBadges() {
        const container = document.getElementById('badgesContainer');
        if (!container) return;
        container.innerHTML = '';
        this.state.currentVideos.forEach(video => {
            const badge = document.createElement('div');
            badge.className = `studio-badge ${this.state.selectedVideoId === video.id ? 'active' : ''}`;
            badge.setAttribute('data-id', video.id);
            badge.onclick = () => this.selectVideo(String(video.id));

            let statusText = video.status === 'queued' ? 'En cola' : 
                             video.status === 'processing' ? `${video.processing_progress}%` : 
                             video.status === 'processed' ? '100% OK' : 'Error';

            badge.innerHTML = `<span class="name">${video.original_filename}</span><span class="status" id="badge-status-${video.id}">${statusText}</span>`;
            container.appendChild(badge);
        });
    }

    validateButtons() {
        const video = this.state.getVideo(this.state.selectedVideoId);
        const publishBtn = document.getElementById('btnPublishVideo');
        const genBtn = document.getElementById('btnGenerateThumbnails');

        if (!video) return;

        const isProcessed = (video.status === 'processed' || video.status === 'published');

        if (publishBtn) {
            if (isProcessed) {
                publishBtn.classList.remove('disabled', 'disabled-interactive');
                publishBtn.removeAttribute('disabled');
            } else {
                publishBtn.classList.remove('disabled'); 
                publishBtn.classList.add('disabled-interactive');
                publishBtn.setAttribute('disabled', 'true');
            }
        }

        if (genBtn) {
            if (isProcessed) {
                genBtn.classList.remove('disabled', 'disabled-interactive');
                genBtn.removeAttribute('disabled');
            } else {
                genBtn.classList.remove('disabled'); 
                genBtn.classList.add('disabled-interactive');
                genBtn.setAttribute('disabled', 'true');
            }
        }
    }

    syncVisibilityUI(value) {
        const visibilityIcon = document.getElementById('visibilityIcon');
        const visibilityText = document.getElementById('visibilityText');

        const menuLinks = document.querySelectorAll('#visibilitySelectorMenu .component-menu-link');
        let matched = false;
        menuLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-value') === value) {
                link.classList.add('active');
                if (visibilityIcon) visibilityIcon.textContent = link.getAttribute('data-icon');
                if (visibilityText) visibilityText.textContent = link.getAttribute('data-text');
                matched = true;
            }
        });

        if (!matched && value === 'public') {
            if (visibilityIcon) visibilityIcon.textContent = 'public';
            if (visibilityText) visibilityText.textContent = 'Público';
        }
    }

    syncCommentsUI(value) {
        const commentsIcon = document.getElementById('commentsIcon');
        const commentsText = document.getElementById('commentsText');

        const menuLinks = document.querySelectorAll('#commentsSelectorMenu .component-menu-link');
        let matched = false;
        menuLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-value') === value) {
                link.classList.add('active');
                if (commentsIcon) commentsIcon.textContent = link.getAttribute('data-icon');
                if (commentsText) commentsText.textContent = link.getAttribute('data-text');
                matched = true;
            }
        });

        if (!matched && value === '1') {
            if (commentsIcon) commentsIcon.textContent = 'chat';
            if (commentsText) commentsText.textContent = 'Activados';
        }
    }

    selectVideo(id) {
        this.state.selectedVideoId = String(id);
        this.renderBadges(); 
        
        const video = this.state.getVideo(this.state.selectedVideoId);
        if (!video) return;

        let localizedTitles = {};
        if (video.localized_titles) {
            try {
                localizedTitles = typeof video.localized_titles === 'string' ? JSON.parse(video.localized_titles) : video.localized_titles;
            } catch (e) {
                console.error("Error parseando localized_titles", e);
            }
        }

        const displayTitleOriginal = document.querySelector('[data-ref="display-title-original"]');
        if(displayTitleOriginal) displayTitleOriginal.textContent = video.title || video.original_filename || '';

        const inputTitleOriginal = document.getElementById('videoTitleInput_original');
        if(inputTitleOriginal) inputTitleOriginal.value = video.title || video.original_filename || '';

        document.querySelectorAll('.localized-title-input').forEach(input => {
            const lang = input.id.replace('videoTitleInput_', '');
            const displayEl = document.querySelector(`[data-ref="display-title-${lang}"]`);
            if (localizedTitles[lang]) {
                input.value = localizedTitles[lang];
                if (displayEl) displayEl.textContent = localizedTitles[lang];
            } else {
                input.value = '';
                if (displayEl) displayEl.textContent = 'Sin traducción';
            }
        });

        const previewOriginalFilename = document.getElementById('previewOriginalFilename');
        if(previewOriginalFilename) previewOriginalFilename.textContent = video.original_filename;

        const descInput = document.getElementById('videoDescriptionInput');
        if (descInput) descInput.value = video.description || '';

        const langInput = document.getElementById('videoOriginalLanguageInput');
        const langTriggerText = document.getElementById('selectedOriginalLangText');
        if (langInput && video.original_language) {
            langInput.value = video.original_language;
            const menuLinks = document.querySelectorAll('#originalLanguageSelectorMenu .component-menu-link');
            menuLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-value') === video.original_language) {
                    link.classList.add('active');
                    if (langTriggerText) langTriggerText.textContent = link.getAttribute('data-text');
                }
            });
        }

        this.syncVisibilityUI(video.visibility || 'public');
        
        const allowCommentsValue = (video.allow_comments !== undefined) ? String(video.allow_comments) : '1';
        const commentsInput = document.getElementById('videoAllowCommentsInput');
        if (commentsInput) commentsInput.value = allowCommentsValue;
        this.syncCommentsUI(allowCommentsValue);

        const cancelBtn = document.getElementById('btnCancelVideo');
        if (cancelBtn) {
            cancelBtn.classList.remove('disabled', 'disabled-interactive');
            cancelBtn.removeAttribute('disabled');
        }

        if (this.thumbnailManager && typeof this.thumbnailManager.resetUI === 'function') {
            this.thumbnailManager.resetUI();
        }

        this.validateButtons();
        
        if (this.tagsManager) {
            this.tagsManager.setInitialTags(video.tags || []);
            video.modelsIds = this.tagsManager.getModelsIds();
            video.categoriesIds = this.tagsManager.getCategoriesIds();
            video.customTags = this.tagsManager.getCustomTags();
        }

        if (this.thumbnailManager) {
            if (video.draftThumbnailPreview) {
                this.thumbnailManager.updateThumbnailPreview(video.draftThumbnailPreview);
            } else if (video.thumbnail_path) {
                this.thumbnailManager.updateThumbnailPreview(video.thumbnail_path);
            } else {
                this.thumbnailManager.updateThumbnailPreview(null);
            }
        }
    }
    
    handleTagsChanged() {
        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) {
            video.modelsIds = this.tagsManager.getModelsIds();
            video.categoriesIds = this.tagsManager.getCategoriesIds();
            video.customTags = this.tagsManager.getCustomTags();
        }
    }

    updateUploadBadges(e) {
        const data = e.detail;
        const videoId = data.video_id || data.id || data.matchedKey;
        const statusSpan = document.getElementById(`badge-status-${videoId}`);
        
        if (statusSpan) {
            if (data.status === 'processing' || data.type === 'progress') {
                const prog = data.progress || data.processing_progress || 0;
                statusSpan.textContent = `${prog}%`;
            } else if (data.status === 'processed' || data.type === 'completed') {
                statusSpan.textContent = '100% OK';
                if (this.state.selectedVideoId === String(videoId)) {
                    const video = this.state.getVideo(videoId);
                    if(video) video.status = 'processed';
                    this.validateButtons();
                }
            } else if (data.status === 'failed' || data.type === 'failed') {
                statusSpan.textContent = 'Error';
                if (this.state.selectedVideoId === String(videoId)) {
                    const video = this.state.getVideo(videoId);
                    if(video) video.status = 'failed';
                    this.validateButtons();
                }
            }
        }
    }

    handleDocumentInput(e) {
        if (!this.state.selectedVideoId) return;

        if (e.target && e.target.id === 'videoDescriptionInput') {
            const video = this.state.getVideo(this.state.selectedVideoId);
            if (video) video.description = e.target.value;
        }

        if (e.target && e.target.id === 'videoTitleInput_original') {
            const video = this.state.getVideo(this.state.selectedVideoId);
            if (video) {
                video.title = e.target.value;
                const displayTitle = document.querySelector('[data-ref="display-title-original"]');
                if (displayTitle) displayTitle.textContent = e.target.value || video.original_filename || '';
            }
        }
    }

    handleDocumentChange(e) {
        if (e.target && e.target.id === 'videoFileInput') this.handleFilesSelection(e.target.files);
    }

    handleDocumentDragOver(e) {
        const dropZone = e.target.closest('#videoDropZone'); 
        if (dropZone) { e.preventDefault(); dropZone.classList.add('dragover'); }
    }

    handleDocumentDragLeave(e) {
        const dropZone = e.target.closest('#videoDropZone'); 
        if (dropZone) dropZone.classList.remove('dragover');
    }

    handleDocumentDrop(e) {
        const dropZone = e.target.closest('#videoDropZone');
        if (dropZone) {
            e.preventDefault(); dropZone.classList.remove('dragover');
            this.handleFilesSelection(e.dataTransfer.files);
        }
    }

    handleSelectTitleLanguage(btn) {
        const lang = btn.getAttribute('data-value');
        const text = btn.getAttribute('data-text');

        const triggerText = document.getElementById('selectedTitleLangText');
        if (triggerText) triggerText.textContent = text;

        const menuLinks = document.querySelectorAll('#titleLanguageSelectorMenu .component-menu-link');
        menuLinks.forEach(link => link.classList.remove('active'));
        btn.classList.add('active');

        const allTitleBoxes = document.querySelectorAll('.title-card-box');
        allTitleBoxes.forEach(box => {
            if (box.getAttribute('data-lang') === lang) {
                box.style.display = 'block';
            } else {
                box.style.display = 'none';
            }
        });

        const module = btn.closest('.component-module');
        if (module && window.appInstance) {
            window.appInstance.closeModule(module);
        } else if (module) {
            module.classList.remove('active');
            module.classList.add('disabled');
        }
    }

    handleSelectOriginalLanguage(btn) {
        const lang = btn.getAttribute('data-value');
        const text = btn.getAttribute('data-text');

        const triggerText = document.getElementById('selectedOriginalLangText');
        if (triggerText) triggerText.textContent = text;

        const hiddenInput = document.getElementById('videoOriginalLanguageInput');
        if (hiddenInput) hiddenInput.value = lang;

        const menuLinks = document.querySelectorAll('#originalLanguageSelectorMenu .component-menu-link');
        menuLinks.forEach(link => link.classList.remove('active'));
        btn.classList.add('active');

        if (this.state.selectedVideoId) {
            const video = this.state.getVideo(this.state.selectedVideoId);
            if (video) video.original_language = lang;
        }

        const module = btn.closest('.component-module');
        if (module && window.appInstance) {
            window.appInstance.closeModule(module);
        } else if (module) {
            module.classList.remove('active');
            module.classList.add('disabled');
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

    handleDocumentClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');

        if (action === 'cancelVideo') {
            e.preventDefault();
            e.stopImmediatePropagation(); 
            this.handleCancelVideo();
        } else if (action === 'selectVisibility') {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handleSelectVisibility(btn);
        } else if (action === 'selectComments') {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handleSelectComments(btn);
        } else if (action === 'selectTitleLanguage') {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handleSelectTitleLanguage(btn);
        } else if (action === 'selectOriginalLanguage') {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handleSelectOriginalLanguage(btn);
        } else if (action === 'saveTitle') {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handleSaveTitle(btn);
        } else if (action === 'toggleEditState') {
            e.preventDefault();
            e.stopImmediatePropagation();
            const target = btn.getAttribute('data-target');
            if (target && target.startsWith('title-')) {
                const isViewBox = btn.closest(`[data-state="${target}-view"]`) !== null;
                this.setEditState(target, isViewBox);
            }
        } else if (action === 'publishVideo') {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handlePublishVideo(btn);
        }
    }

    handleCancelVideo() {
        if (!this.state.selectedVideoId) return;
        
        if (!confirm('¿Estás seguro de que deseas cancelar la subida de este video?')) {
            return;
        }

        const btn = document.getElementById('btnCancelVideo');
        if (btn) { 
            btn.classList.remove('disabled');
            btn.classList.add('disabled-interactive'); 
            btn.setAttribute('disabled', 'true'); 
        }

        const routeName = ApiRoutes.Studio?.CancelUpload || 'studio.cancel_upload';
        this.api.post(routeName, { video_id: this.state.selectedVideoId }).then(res => {
            
            if (btn) { 
                btn.classList.remove('disabled-interactive'); 
                btn.removeAttribute('disabled'); 
            }

            if (res.status === 'success') {
                this.state.deleteVideo(this.state.selectedVideoId);
                
                if (this.state.currentVideos.size === 0) {
                    window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: this.getRoute('/studio/upload') }}));
                } else {
                    const firstId = this.state.currentVideos.keys().next().value;
                    this.selectVideo(firstId);
                }
            } else {
                alert("Error al cancelar el video: " + res.message);
            }
        }).catch(err => {
            console.error(err);
            alert("Error al comunicarse con el servidor.");
            if (btn) { btn.classList.remove('disabled-interactive'); btn.removeAttribute('disabled'); }
        });
    }

    handleSelectVisibility(btn) {
        const value = btn.getAttribute('data-value');
        
        this.syncVisibilityUI(value);

        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) {
            video.visibility = value;
        }

        if (window.appInstance) {
            const module = btn.closest('.component-module');
            if (module) window.appInstance.closeModule(module);
        }
    }
    
    handleSelectComments(btn) {
        const value = btn.getAttribute('data-value');
        
        this.syncCommentsUI(value);
        
        const hiddenInput = document.getElementById('videoAllowCommentsInput');
        if (hiddenInput) hiddenInput.value = value;

        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) {
            video.allow_comments = value;
        }

        if (window.appInstance) {
            const module = btn.closest('.component-module');
            if (module) window.appInstance.closeModule(module);
        }
    }

    handleSaveTitle(btn) {
        const lang = btn.getAttribute('data-lang');
        const inputTitle = document.getElementById(`videoTitleInput_${lang}`);
        if (!inputTitle) return;
        
        const newTitle = inputTitle.value.trim();

        if (lang === 'original' && newTitle === '') {
            alert("El título original no puede estar vacío.");
            return;
        }

        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) {
            if (lang === 'original') {
                video.title = newTitle;
            } else {
                if (!video.localized_titles) video.localized_titles = {};
                if (typeof video.localized_titles === 'string') {
                    video.localized_titles = JSON.parse(video.localized_titles);
                }
                video.localized_titles[lang] = newTitle;
            }
        }

        const displayTitle = document.querySelector(`[data-ref="display-title-${lang}"]`);
        if (displayTitle) {
            displayTitle.textContent = newTitle.length > 0 ? newTitle : 'Sin traducción';
        }

        this.setEditState(`title-${lang}`, false);
    }

    async handlePublishVideo(btn) {
        if (!this.state.selectedVideoId) return;
        const video = this.state.getVideo(this.state.selectedVideoId);
        if (!video) return;

        if (btn.classList.contains('disabled-interactive')) return;

        const titleOriginalInput = document.getElementById('videoTitleInput_original');
        const title = titleOriginalInput ? titleOriginalInput.value.trim() : video.title;
        const description = document.getElementById('videoDescriptionInput')?.value.trim() || '';
        const visibility = video.visibility || 'public';
        const langInput = document.getElementById('videoOriginalLanguageInput');
        const originalLanguage = langInput ? langInput.value : (video.original_language || 'es-419');
        const commentsInput = document.getElementById('videoAllowCommentsInput');
        const allowComments = commentsInput ? (commentsInput.value === '1') : true;
        
        if (!title) {
            alert("El título original es obligatorio para publicar.");
            return;
        }

        if (!video.draftThumbnailType && !video.thumbnail_path) {
            alert("Debes seleccionar o subir una miniatura antes de publicar.");
            return;
        }

        const updatedLocalizedTitles = {};
        document.querySelectorAll('.localized-title-input').forEach(input => {
            const lang = input.id.replace('videoTitleInput_', '');
            const val = input.value.trim();
            if (val.length > 0) {
                updatedLocalizedTitles[lang] = val;
            }
        });

        let models = video.modelsIds;
        let categories = video.categoriesIds;
        let tags = video.customTags;

        if (models === undefined && Array.isArray(video.tags)) {
            models = video.tags.filter(t => t.type === 'modelo').map(t => t.id);
        }
        if (categories === undefined && Array.isArray(video.tags)) {
            categories = video.tags.filter(t => t.type === 'category').map(t => t.id);
        }
        if (tags === undefined && Array.isArray(video.tags)) {
            tags = video.tags.filter(t => t.type === 'custom' || typeof t === 'string').map(t => typeof t === 'string' ? t : t.name);
        }

        models = models || [];
        categories = categories || [];
        tags = tags || [];

        const formData = new FormData();
        formData.append('video_id', video.id);
        formData.append('title', title);
        formData.append('localized_titles', JSON.stringify(updatedLocalizedTitles));
        formData.append('description', description);
        formData.append('visibility', visibility);
        formData.append('original_language', originalLanguage);
        formData.append('allow_comments', allowComments);
        formData.append('models', JSON.stringify(models));
        formData.append('categories', JSON.stringify(categories));
        formData.append('tags', JSON.stringify(tags));

        if (video.draftThumbnailType === 'file' && video.draftThumbnailData) {
            formData.append('thumbnail', video.draftThumbnailData);
        } else if (video.draftThumbnailType === 'generated' && video.draftThumbnailData) {
            formData.append('generated_path', video.draftThumbnailData);
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-rounded">sync</span><span>Publicando...</span>';
        btn.setAttribute('disabled', 'true');
        btn.classList.remove('disabled');
        btn.classList.add('disabled-interactive');

        try {
            const routeName = ApiRoutes.Studio?.PublishVideo || 'studio.publish_video';
            const response = await this.api.postForm(routeName, formData);
            
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled', 'disabled-interactive');
            btn.innerHTML = originalText;

            if (response.status === 'success') {
                this.state.deleteVideo(this.state.selectedVideoId);
                
                if (this.state.currentVideos.size === 0) {
                    window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: this.getRoute('/studio/manage-content') }}));
                } else {
                    const firstId = this.state.currentVideos.keys().next().value;
                    this.selectVideo(firstId);
                }
            } else {
                alert("Error al publicar: " + response.message);
            }
        } catch (error) {
            console.error("Error al publicar el video:", error);
            alert("Ocurrió un error al intentar publicar el video.");
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled', 'disabled-interactive');
            btn.innerHTML = originalText;
        }
    }

    attachEvents() {
        // [BLINDAJE FRONTEND] No inyectar eventos de interfaz si el usuario no tiene permisos
        const hasPermission = window.appInstance ? window.appInstance.canUploadVideos : true;
        if (!hasPermission) {
            console.warn("[StudioUploadController] Eventos bloqueados: Usuario sin permisos.");
            return;
        }

        document.addEventListener('change', this.handleDocumentChangeBound);
        document.addEventListener('dragover', this.handleDocumentDragOverBound);
        document.addEventListener('dragleave', this.handleDocumentDragLeaveBound);
        document.addEventListener('drop', this.handleDocumentDropBound);
        document.addEventListener('click', this.handleDocumentClickBound);
        document.addEventListener('input', this.handleDocumentInputBound); 
    }
}