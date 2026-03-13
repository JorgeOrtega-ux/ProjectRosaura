import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { StudioState } from '../StudioState.js';
import { StudioTagsManager } from '../managers/StudioTagsManager.js';
import { StudioThumbnailManager } from '../managers/StudioThumbnailManager.js';

export class StudioEditController {
    constructor(api = null, state = null) {
        this.api = api || new ApiService();
        this.state = state || new StudioState();
        
        this.tagsManager = new StudioTagsManager(this.api, this.state, this.validatePublishButton.bind(this));
        this.thumbnailManager = new StudioThumbnailManager(this.api, this.state, this.validatePublishButton.bind(this));

        this.eventsAttached = false;
        
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.handleDocumentFocusOutBound = this.handleDocumentFocusOut.bind(this);
        this.handleVideoProgressBound = this.handleVideoProgress.bind(this);
        
        if (api && state) {
            this.init();
        }
    }

    destroy() {
        document.removeEventListener('click', this.handleDocumentClickBound);
        document.removeEventListener('focusout', this.handleDocumentFocusOutBound);
        
        if (this.eventsAttached) {
            window.removeEventListener('studioVideoProgress', this.handleVideoProgressBound);
        }

        if (this.tagsManager && typeof this.tagsManager.destroy === 'function') {
            this.tagsManager.destroy();
        }
        if (this.thumbnailManager && typeof this.thumbnailManager.destroy === 'function') {
            this.thumbnailManager.destroy();
        }
    }

    init() {
        this.initEditView();
        if (!this.eventsAttached) {
            this.attachEvents();
            window.addEventListener('studioVideoProgress', this.handleVideoProgressBound);
            this.eventsAttached = true;
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
            this.state.selectedVideoId = String(video.id);
            this.state.setVideo(this.state.selectedVideoId, video);
            
            this.initDraftState(video);

            const titleInputOriginal = document.getElementById('videoTitleInput_original');
            const displayTitleOriginal = document.querySelector('[data-ref="display-title-original"]');
            if (titleInputOriginal) titleInputOriginal.value = video.draftTitle;
            if (displayTitleOriginal) displayTitleOriginal.textContent = video.draftTitle;

            const langSelect = document.getElementById('videoOriginalLanguageSelect');
            if (langSelect && video.original_language) {
                langSelect.value = video.original_language;
            }

            let localizedTitles = {};
            if (video.localized_titles) {
                try {
                    localizedTitles = typeof video.localized_titles === 'string' ? JSON.parse(video.localized_titles) : video.localized_titles;
                } catch (e) {
                    console.error("Error parseando localized_titles", e);
                }
            }
            video.draftLocalizedTitles = localizedTitles;

            const localizedInputs = document.querySelectorAll('.localized-title-input');
            localizedInputs.forEach(input => {
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

            const descInput = document.getElementById('videoDescriptionInput');
            if (descInput) descInput.value = video.draftDescription;
            
            this.syncVisibilityUI(video.draftVisibility);
            this.thumbnailManager.updateThumbnailPreview(video.draftThumbnailPreview);
            this.tagsManager.setInitialTags(video.tags);
            
            this.setEditState('title-original', false);
            this.validatePublishButton();
            
            const btnSave = document.getElementById('btnSaveChanges');
            if (btnSave) {
                btnSave.onclick = async () => {
                    btnSave.disabled = true;
                    btnSave.innerHTML = '<span class="material-symbols-rounded">sync</span> <span>Guardando...</span>';
                    
                    const newTitleOriginal = titleInputOriginal ? titleInputOriginal.value.trim() : '';
                    const newDesc = descInput ? descInput.value.trim() : '';
                    const newVisibility = video.draftVisibility || 'public';
                    const newOriginalLanguage = langSelect ? langSelect.value : (video.original_language || 'es-419');
                    
                    if (newTitleOriginal.length === 0) {
                        alert("El título original no puede estar vacío.");
                        btnSave.disabled = false;
                        btnSave.innerHTML = '<span class="material-symbols-rounded">save</span> <span>Guardar cambios</span>';
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

                    const modelsIds = this.tagsManager.getModelsIds();
                    const categoriesIds = this.tagsManager.getCategoriesIds();
                    const customTagsArr = this.tagsManager.getCustomTags();

                    let hasError = false;
                    const updateRoute = ApiRoutes.Studio?.UpdateTitle || 'studio.update_title';
                    const updateRes = await this.api.post(updateRoute, {
                        video_id: this.state.selectedVideoId,
                        title: newTitleOriginal,
                        localized_titles: JSON.stringify(updatedLocalizedTitles),
                        description: newDesc,
                        visibility: newVisibility,
                        original_language: newOriginalLanguage,
                        models: modelsIds,
                        categories: categoriesIds,
                        tags: customTagsArr
                    });

                    if (updateRes.status === 'success') {
                        video.title = newTitleOriginal;
                        video.localized_titles = JSON.stringify(updatedLocalizedTitles);
                        video.description = newDesc;
                        video.visibility = newVisibility;
                        video.original_language = newOriginalLanguage;
                    } else {
                        alert("Error guardando datos: " + updateRes.message);
                        hasError = true;
                    }

                    if (!hasError && video.draftThumbnailType) {
                        const formData = new FormData();
                        formData.append('video_id', this.state.selectedVideoId);

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

    initDraftState(video) {
        if (video.draftTitle === undefined) video.draftTitle = video.title || video.original_filename || '';
        if (video.draftDescription === undefined) video.draftDescription = video.description || '';
        if (video.draftVisibility === undefined) video.draftVisibility = video.visibility || 'public';
        if (video.draftThumbnailPreview === undefined) video.draftThumbnailPreview = video.thumbnail_path;
        if (video.draftLocalizedTitles === undefined) video.draftLocalizedTitles = {};
    }

    syncVisibilityUI(value) {
        const menu = document.getElementById('visibilitySelectorMenu');
        if (!menu) return;

        menu.querySelectorAll('.component-menu-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-value') === value) {
                link.classList.add('active');
                
                const icon = link.getAttribute('data-icon');
                const text = link.getAttribute('data-text');
                
                const triggerIcon = document.getElementById('visibilityIcon');
                const triggerText = document.getElementById('visibilityText');
                
                if (triggerIcon) triggerIcon.textContent = icon;
                if (triggerText) triggerText.textContent = text;
            }
        });
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

    async saveTitleField(lang) {
        if (!this.state.selectedVideoId) return;
        const inputEl = document.getElementById(`videoTitleInput_${lang}`);
        const displayEl = document.querySelector(`[data-ref="display-title-${lang}"]`);
        if (!inputEl) return;

        const newTitle = inputEl.value.trim();
        
        if (lang === 'original' && newTitle.length === 0) {
            alert("El título original no puede estar vacío.");
            return;
        }

        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) {
            if (lang === 'original') {
                video.draftTitle = newTitle;
            } else {
                if (!video.draftLocalizedTitles) video.draftLocalizedTitles = {};
                video.draftLocalizedTitles[lang] = newTitle;
            }
            
            if (displayEl) {
                displayEl.textContent = newTitle.length > 0 ? newTitle : 'Sin traducción';
            }
            this.setEditState(`title-${lang}`, false);
            this.validatePublishButton();
        }
    }

    async saveDescriptionField() {
        if (!this.state.selectedVideoId) return;
        const descInput = document.getElementById('videoDescriptionInput');
        if (!descInput) return;
        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) video.draftDescription = descInput.value.trim();
    }

    handleVideoProgress(e) {
        const data = e.detail;
        const videoId = data.video_id || data.id || data.matchedKey;
        
        if (String(videoId) === String(this.state.selectedVideoId)) {
            const video = this.state.getVideo(this.state.selectedVideoId);
            if (video) {
                if (data.status === 'processed' || data.type === 'completed') {
                    video.status = 'processed';
                } else if (data.status === 'failed' || data.type === 'failed') {
                    video.status = 'failed';
                }
            }
            this.validatePublishButton();
        }
    }

    validatePublishButton() {
        const btn = document.getElementById('btnPublishVideo');
        const btnGen = document.getElementById('btnGenerateThumbnails');

        if (!this.state.selectedVideoId) {
            if(btn) { btn.setAttribute('disabled', 'true'); btn.classList.add('disabled', 'disabled-interactive'); }
            if(btnGen) { btnGen.setAttribute('disabled', 'true'); btnGen.classList.add('disabled', 'disabled-interactive'); }
            return;
        }

        const video = this.state.getVideo(this.state.selectedVideoId);
        if (!video) return;
        
        const isProcessed = video.status === 'processed' || video.status === 'published';
        const hasTitle = (video.draftTitle && video.draftTitle.trim().length > 0); 
        const hasThumb = (video.draftThumbnailType !== undefined && video.draftThumbnailData) || video.thumbnail_path;

        if (isProcessed && hasTitle && hasThumb) {
            if(btn) { btn.removeAttribute('disabled'); btn.classList.remove('disabled', 'disabled-interactive'); }
        } else {
            if(btn) { btn.setAttribute('disabled', 'true'); btn.classList.add('disabled', 'disabled-interactive'); }
        }

        if (isProcessed) {
            if(btnGen) { btnGen.removeAttribute('disabled'); btnGen.classList.remove('disabled', 'disabled-interactive'); }
        } else {
            if(btnGen) { btnGen.setAttribute('disabled', 'true'); btnGen.classList.add('disabled', 'disabled-interactive'); }
        }
    }

    async publishVideo() {
        if (!this.state.selectedVideoId) return;
        const video = this.state.getVideo(this.state.selectedVideoId);
        if (!video) return;

        const btn = document.getElementById('btnPublishVideo');
        if (btn) {
            if (btn.classList.contains('disabled-interactive')) return;
            btn.setAttribute('disabled', 'true');
            btn.classList.add('disabled', 'disabled-interactive');
            btn.innerHTML = '<span class="material-symbols-rounded">sync</span><span>Publicando...</span>';
        }

        const updatedLocalizedTitles = {};
        document.querySelectorAll('.localized-title-input').forEach(input => {
            const lang = input.id.replace('videoTitleInput_', '');
            const val = input.value.trim();
            if (val.length > 0) {
                updatedLocalizedTitles[lang] = val;
            }
        });

        const langSelect = document.getElementById('videoOriginalLanguageSelect');
        const originalLanguage = langSelect ? langSelect.value : (video.original_language || 'es-419');

        const formData = new FormData();
        formData.append('video_id', this.state.selectedVideoId);
        formData.append('title', video.draftTitle);
        formData.append('localized_titles', JSON.stringify(updatedLocalizedTitles));
        formData.append('description', video.draftDescription || '');
        formData.append('visibility', video.draftVisibility || 'public');
        formData.append('original_language', originalLanguage);
        
        const modelsArr = document.getElementById('hiddenModelsArray') ? document.getElementById('hiddenModelsArray').value : '[]';
        const categoriesArr = document.getElementById('hiddenCategoriesArray') ? document.getElementById('hiddenCategoriesArray').value : '[]';
        const customTagsArr = document.getElementById('hiddenTagsArray') ? document.getElementById('hiddenTagsArray').value : '[]';
        
        formData.append('models', modelsArr);
        formData.append('categories', categoriesArr);
        formData.append('tags', customTagsArr);

        if (video.draftThumbnailType === 'file') formData.append('thumbnail', video.draftThumbnailData);
        else if (video.draftThumbnailType === 'generated') formData.append('generated_path', video.draftThumbnailData);

        const routeName = ApiRoutes.Studio?.PublishVideo || 'studio.publish_video';
        try {
            const res = await this.api.postForm(routeName, formData);
            if (res.status === 'success') {
                alert("¡Video publicado con éxito!");
                this.state.deleteVideo(this.state.selectedVideoId);
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/manage-content' }}));
            } else {
                alert("Error al publicar: " + res.message);
                if (btn) { btn.removeAttribute('disabled'); btn.classList.remove('disabled', 'disabled-interactive'); btn.innerHTML = '<span class="material-symbols-rounded">publish</span><span data-i18n="studio_publish">Publicar</span>'; }
            }
        } catch (error) {
            console.error(error); alert("Error de conexión al publicar.");
            if (btn) { btn.removeAttribute('disabled'); btn.classList.remove('disabled', 'disabled-interactive'); btn.innerHTML = '<span class="material-symbols-rounded">publish</span><span data-i18n="studio_publish">Publicar</span>'; }
        }
    }

    async cancelVideo() {
        if (!this.state.selectedVideoId) return;
        const btn = document.getElementById('btnCancelVideo');
        if (btn) { btn.classList.add('disabled', 'disabled-interactive'); btn.setAttribute('disabled', 'true'); }

        const routeName = ApiRoutes.Studio?.CancelUpload || 'studio.cancel_upload';
        const res = await this.api.post(routeName, { video_id: this.state.selectedVideoId });

        if (res.status === 'success') {
            this.state.deleteVideo(this.state.selectedVideoId);
            window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/upload' }}));
        } else {
            alert("Error al cancelar el video: " + res.message);
            if (btn) { btn.classList.remove('disabled', 'disabled-interactive'); btn.removeAttribute('disabled'); }
        }
    }

    attachEvents() {
        document.addEventListener('click', this.handleDocumentClickBound);
        document.addEventListener('focusout', this.handleDocumentFocusOutBound);
    }

    handleDocumentClick(e) {
        const selectVisOption = e.target.closest('[data-action="selectVisibility"]');
        if (selectVisOption) {
            const value = selectVisOption.getAttribute('data-value');
            this.syncVisibilityUI(value);
            
            if (this.state.selectedVideoId) {
                const video = this.state.getVideo(this.state.selectedVideoId);
                if (video) video.draftVisibility = value;
            }
            
            const menu = selectVisOption.closest('.component-module');
            if (menu) { menu.classList.remove('active'); menu.classList.add('disabled'); }
            return;
        }

        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');

        if (action === 'selectTitleLanguage') this.handleSelectTitleLanguage(btn);
        if (action === 'saveTitle') {
            const lang = btn.getAttribute('data-lang');
            this.saveTitleField(lang);
        }
        if (action === 'toggleEditState') {
            const target = btn.getAttribute('data-target');
            if (target && target.startsWith('title-')) {
                const isViewBox = btn.closest(`[data-state="${target}-view"]`) !== null;
                this.setEditState(target, isViewBox);
            }
        }
        if (action === 'publishVideo') this.publishVideo();
        if (action === 'cancelVideo') {
            if (confirm("¿Estás seguro de que deseas cancelar la subida/procesamiento de este video? Se eliminará permanentemente.")) {
                this.cancelVideo();
            }
        }
    }

    handleDocumentFocusOut(e) {
        if (e.target && e.target.id === 'videoDescriptionInput') {
            this.saveDescriptionField();
        }
    }
}