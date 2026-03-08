import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { StudioTagsManager } from '../managers/StudioTagsManager.js';
import { StudioThumbnailManager } from '../managers/StudioThumbnailManager.js';

export class StudioUploadController {
    constructor(api, state) {
        this.api = api;
        this.state = state;
        
        // Bindear eventos a "this" para poder eliminarlos en destroy() y prevenir memoria duplicada
        this.handleDocumentChangeBound = this.handleDocumentChange.bind(this);
        this.handleDocumentDragOverBound = this.handleDocumentDragOver.bind(this);
        this.handleDocumentDragLeaveBound = this.handleDocumentDragLeave.bind(this);
        this.handleDocumentDropBound = this.handleDocumentDrop.bind(this);
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.updateUploadBadgesBound = this.updateUploadBadges.bind(this);

        const path = window.location.pathname;
        if (path.includes('/studio/uploading')) {
            this.initUploadingView();
            // Instanciar el manejador de etiquetas para la vista de subida
            this.tagsManager = new StudioTagsManager(this.api, this.state, () => {
                this.handleTagsChanged();
            });
            // Instanciar el manejador de miniaturas
            this.thumbnailManager = new StudioThumbnailManager(this.api, this.state, () => {
                console.log("Miniatura actualizada en el estado.");
            });
        }
        
        this.attachEvents();
        window.addEventListener('studioVideoProgress', this.updateUploadBadgesBound);
    }

    // Limpieza al cambiar de vista
    destroy() {
        document.removeEventListener('change', this.handleDocumentChangeBound);
        document.removeEventListener('dragover', this.handleDocumentDragOverBound);
        document.removeEventListener('dragleave', this.handleDocumentDragLeaveBound);
        document.removeEventListener('drop', this.handleDocumentDropBound);
        document.removeEventListener('click', this.handleDocumentClickBound);
        window.removeEventListener('studioVideoProgress', this.updateUploadBadgesBound);
        
        if (this.tagsManager && typeof this.tagsManager.destroy === 'function') {
            this.tagsManager.destroy();
        }
        if (this.thumbnailManager && typeof this.thumbnailManager.destroy === 'function') {
            this.thumbnailManager.destroy();
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

    selectVideo(id) {
        this.state.selectedVideoId = String(id);
        this.renderBadges(); 
        
        const video = this.state.getVideo(this.state.selectedVideoId);
        if (!video) return;

        const displayTitle = document.querySelector('[data-ref="display-title"]');
        if(displayTitle) displayTitle.textContent = video.title || video.original_filename || '';

        const inputTitle = document.querySelector('[data-ref="input-title"]');
        if(inputTitle) inputTitle.value = video.title || video.original_filename || '';

        const previewOriginalFilename = document.getElementById('previewOriginalFilename');
        if(previewOriginalFilename) previewOriginalFilename.textContent = video.original_filename;

        const cancelBtn = document.getElementById('btnCancelVideo');
        if (cancelBtn) {
            cancelBtn.classList.remove('disabled');
            cancelBtn.removeAttribute('disabled');
        }

        // Habilitar botón de publicar si el video ya se procesó
        const publishBtn = document.getElementById('btnPublishVideo');
        if (publishBtn) {
            if (video.status === 'processed') {
                publishBtn.classList.remove('disabled');
                publishBtn.removeAttribute('disabled');
            } else {
                publishBtn.classList.add('disabled');
                publishBtn.setAttribute('disabled', 'true');
            }
        }
        
        if (this.tagsManager) {
            this.tagsManager.setInitialTags(video.tags || []);
        }

        // Restaurar preview de la miniatura si se cambia entre pestañas de videos
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
        }
    }

    updateUploadBadges(e) {
        const data = e.detail;
        const matchedKey = data.matchedKey;
        const statusSpan = document.getElementById(`badge-status-${matchedKey}`);
        if (statusSpan) {
            if (data.status === 'processing') {
                statusSpan.textContent = `${data.progress}%`;
            } else if (data.status === 'processed') {
                statusSpan.textContent = '100% OK';
                // Si el video actual se acaba de procesar, habilitar botón de publicar en vivo
                if (this.state.selectedVideoId === String(matchedKey)) {
                    const publishBtn = document.getElementById('btnPublishVideo');
                    if (publishBtn) {
                        publishBtn.classList.remove('disabled');
                        publishBtn.removeAttribute('disabled');
                    }
                    const video = this.state.getVideo(matchedKey);
                    if(video) video.status = 'processed';
                }
            } else if (data.status === 'failed') {
                statusSpan.textContent = 'Error';
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
        } else if (action === 'saveTitle') {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handleSaveTitle(btn);
        } else if (action === 'publishVideo') {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handlePublishVideo(btn);
        }
        
        // NOTA: No interceptamos 'toggleEditState' aquí. Dejamos que tu script global 
        // lo atrape y aplique los cambios de CSS a los paneles.
    }

    handleCancelVideo() {
        if (!this.state.selectedVideoId) return;
        
        if (!confirm('¿Estás seguro de que deseas cancelar la subida de este video?')) {
            return;
        }

        const routeName = ApiRoutes.Studio?.CancelUpload || 'studio.cancel_upload';
        this.api.post(routeName, { video_id: this.state.selectedVideoId }).then(res => {
            if (res.status === 'success') {
                this.state.deleteVideo(this.state.selectedVideoId);
                
                if (this.state.currentVideos.size === 0) {
                    window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/upload' }}));
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
        });
    }

    handleSelectVisibility(btn) {
        const value = btn.getAttribute('data-value');
        const icon = btn.getAttribute('data-icon');
        const text = btn.getAttribute('data-text');

        const visibilityIcon = document.getElementById('visibilityIcon');
        const visibilityText = document.getElementById('visibilityText');
        const visibilitySelect = document.getElementById('videoVisibilitySelect');

        if (visibilityIcon) visibilityIcon.textContent = icon;
        if (visibilityText) visibilityText.textContent = text;
        if (visibilitySelect) visibilitySelect.value = value;

        const menuLinks = btn.closest('.component-menu-list').querySelectorAll('.component-menu-link');
        menuLinks.forEach(link => link.classList.remove('active'));
        btn.classList.add('active');

        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) {
            video.visibility = value;
        }

        if (window.appInstance) {
            const module = btn.closest('.component-module');
            if (module) window.appInstance.closeModule(module);
        }
    }

    handleSaveTitle(btn) {
        const inputTitle = document.getElementById('videoTitleInput');
        if (!inputTitle) return;
        
        const newTitle = inputTitle.value.trim();

        if (newTitle === '') {
            alert("El título no puede estar vacío.");
            return;
        }

        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) {
            video.title = newTitle;
        }

        const displayTitle = document.querySelector('[data-ref="display-title"]');
        if (displayTitle) {
            displayTitle.textContent = newTitle;
        }

        // Clic simulado al botón cancelar para que tu script global lo intercepte y cierre el menú de edición
        const cancelBtn = btn.previousElementSibling;
        if (cancelBtn && cancelBtn.getAttribute('data-action') === 'toggleEditState') {
            cancelBtn.click();
        }
    }

    async handlePublishVideo(btn) {
        if (!this.state.selectedVideoId) return;
        const video = this.state.getVideo(this.state.selectedVideoId);
        if (!video) return;

        // Recopilar datos de publicación
        const title = document.querySelector('[data-ref="input-title"]')?.value.trim() || video.title;
        const description = document.getElementById('videoDescriptionInput')?.value.trim() || '';
        const visibility = document.getElementById('videoVisibilitySelect')?.value || video.visibility || 'public';
        
        if (!title) {
            alert("El título es obligatorio para publicar.");
            return;
        }

        if (!video.draftThumbnailType && !video.thumbnail_path) {
            alert("Debes seleccionar o subir una miniatura antes de publicar.");
            return;
        }

        const models = video.modelsIds || [];
        const categories = video.categoriesIds || [];

        // Construir FormData
        const formData = new FormData();
        formData.append('video_id', video.id);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('visibility', visibility);
        formData.append('models', JSON.stringify(models));
        formData.append('categories', JSON.stringify(categories));

        if (video.draftThumbnailType === 'file' && video.draftThumbnailData) {
            formData.append('thumbnail', video.draftThumbnailData);
        } else if (video.draftThumbnailType === 'generated' && video.draftThumbnailData) {
            formData.append('generated_path', video.draftThumbnailData);
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-rounded">sync</span><span>Publicando...</span>';
        btn.disabled = true;

        try {
            const routeName = ApiRoutes.Studio?.PublishVideo || 'studio.publish_video';
            const response = await this.api.post(routeName, formData);
            
            if (response.status === 'success') {
                this.state.deleteVideo(this.state.selectedVideoId);
                if (this.state.currentVideos.size === 0) {
                    window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/content' }}));
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
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    attachEvents() {
        document.addEventListener('change', this.handleDocumentChangeBound);
        document.addEventListener('dragover', this.handleDocumentDragOverBound);
        document.addEventListener('dragleave', this.handleDocumentDragLeaveBound);
        document.addEventListener('drop', this.handleDocumentDropBound);
        document.addEventListener('click', this.handleDocumentClickBound);
    }
}