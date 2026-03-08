<?php
// includes/views/studio/uploading.php
?>
<div class="view-content">

    <div class="component-wrapper disabled" id="uploading-empty-state">
        <div class="component-empty-state">
            <span class="material-symbols-rounded component-empty-state-icon">upload_file</span>
            <p class="component-empty-state-text" data-i18n="studio_no_uploading">No tienes contenido subiéndose en estos momentos.</p>
            <button type="button" class="component-button component-button--dark component-button--h40" data-nav="<?php echo APP_URL; ?>/studio/upload">
                <span class="material-symbols-rounded">upload</span>
                <span data-i18n="studio_upload_btn">Subir videos</span>
            </button>
        </div>
    </div>

    <div class="component-wrapper component-wrapper--full no-padding" id="uploading-active-state">
        
        <div class="component-view-layout">
            <div class="component-view-top">
                <div class="component-view-top-left studio-badge-container" id="badgesContainer">
                </div>
                <div class="component-view-top-right">
                    <button type="button" class="component-button component-button--danger component-button--h36" id="btnCancelVideo" data-action="cancelVideo">
                        <span class="material-symbols-rounded">delete</span>
                        <span data-i18n="studio_cancel">Cancelar</span>
                    </button>
                    <button type="button" class="component-button component-button--dark component-button--h36 disabled" id="btnPublishVideo" data-action="publishVideo" disabled>
                        <span class="material-symbols-rounded">publish</span>
                        <span data-i18n="studio_publish">Publicar</span>
                    </button>
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="studio-uploading-wrapper">
                    
                    <div class="studio-uploading-details">
                        
                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="title-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title" data-i18n="studio_title_req">Título del video (obligatorio)</h2>
                                            <span class="component-display-value" data-ref="display-title">Cargando...</span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title" data-i18n="btn_edit">Editar</button>
                                    </div>
                                </div>

                                <div class="disabled component-state-box" data-state="title-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title" data-i18n="studio_title_req">Título del video (obligatorio)</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" id="videoTitleInput" data-ref="input-title" class="component-input-field component-input-field--simple" placeholder="Ingresa un título que destaque">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title" data-i18n="btn_cancel">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveTitle" data-i18n="btn_save">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title" data-i18n="studio_desc">Descripción</h2>
                                        <p class="component-card__description" data-i18n="studio_desc_hint">Cuenta a los espectadores de qué trata tu video.</p>
                                        <div class="component-card__form-area">
                                            <textarea id="videoDescriptionInput" class="component-input-field" data-ref="inp_video_description" placeholder="Añade tu descripción aquí..." maxlength="1000" rows="5"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Visibilidad</h2>
                                        <p class="component-card__description">Elige quién puede ver tu video.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleVisibility">
                                            <span class="material-symbols-rounded" id="visibilityIcon">public</span>
                                            <span class="component-dropdown-text" id="visibilityText">Público</span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleVisibility" id="visibilitySelectorMenu">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    
                                                    <div class="component-menu-link active" data-action="selectVisibility" data-value="public" data-icon="public" data-text="Público">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                                        <div class="component-menu-link-text">
                                                            <span>Público</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="component-menu-link" data-action="selectVisibility" data-value="unlisted" data-icon="link" data-text="No listado">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">link</span></div>
                                                        <div class="component-menu-link-text">
                                                            <span>No listado</span>
                                                        </div>
                                                    </div>

                                                    <div class="component-menu-link" data-action="selectVisibility" data-value="private" data-icon="lock" data-text="Privado">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                                        <div class="component-menu-link-text">
                                                            <span>Privado</span>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                        
                                        <select id="videoVisibilitySelect">
                                            <option value="public" selected>public</option>
                                            <option value="unlisted">unlisted</option>
                                            <option value="private">private</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Etiquetas / Tags</h2>
                                        <p class="component-card__description">Agrega modelos y categorías a tu video para facilitar la búsqueda.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Modelos</h2>
                                        <p class="component-card__description">Asigna actores o modelos a tu video.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTagsModels" data-type="modelo">
                                            <span class="material-symbols-rounded">person_add</span>
                                            <span class="component-dropdown-text">Seleccionar Modelos</span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <?php 
                                            $selectorId = 'modelsSelectorMenu';
                                            $placeholder = 'Buscar modelos...';
                                            $moduleName = 'moduleTagsModels';
                                            include __DIR__ . '/../../modules/moduleTagsSelector.php'; 
                                        ?>
                                    </div>
                                </div>
                            </div>

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Categorías</h2>
                                        <p class="component-card__description">Asigna categorías a tu video.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTagsCategories" data-type="category">
                                            <span class="material-symbols-rounded">category</span>
                                            <span class="component-dropdown-text">Seleccionar Categorías</span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <?php 
                                            $selectorId = 'categoriesSelectorMenu';
                                            $placeholder = 'Buscar categorías...';
                                            $moduleName = 'moduleTagsCategories';
                                            include __DIR__ . '/../../modules/moduleTagsSelector.php'; 
                                        ?>
                                    </div>
                                </div>
                            </div>

                            <input type="hidden" id="hiddenModelsArray" name="models" value="[]">
                            <input type="hidden" id="hiddenCategoriesArray" name="categories" value="[]">
                        </div>

                    </div>

                    <div class="studio-uploading-preview">
                        <div class="studio-video-card">
                            <div class="studio-video-card__player">
                                <span class="material-symbols-rounded">play_circle</span>
                            </div>
                            <div class="studio-video-card__info">
                                <div class="studio-video-card__meta-group">
                                    <span class="meta-label" data-i18n="studio_video_link">Enlace del video</span>
                                    <span class="meta-value" data-i18n="studio_link_pending">Se generará al publicar</span>
                                </div>
                                <div class="studio-video-card__meta-group">
                                    <span class="meta-label" data-i18n="studio_file_name">Nombre del archivo</span>
                                    <span class="meta-value" id="previewOriginalFilename">Cargando...</span>
                                </div>
                            </div>
                        </div>

                        <div class="component-thumbnail-section">
                            <h3 class="meta-label">Miniatura</h3>
                            <p class="meta-label">Selecciona o sube una imagen que muestre el contenido de tu video.</p>
                            
                            <div>
                                <input type="file" id="thumbnailInput" class="disabled" accept="image/png, image/jpeg, image/webp">
                                <button type="button" class="component-button component-button--full component-button--h40" onclick="document.getElementById('thumbnailInput').click();">
                                    <span class="material-symbols-rounded">add_photo_alternate</span>
                                    <span data-i18n="studio_upload_thumb">Subir</span>
                                </button>
                                
                                <button type="button" id="btnGenerateThumbnails" class="component-button component-button--full component-button--h40">
                                    <span class="material-symbols-rounded">auto_awesome</span>
                                    <span>Generar opciones</span>
                                </button>
                            </div>

                            <input type="hidden" id="selectedGeneratedThumbnail" name="selected_generated_thumbnail" value="">

                            <div class="component-thumbnail-grid" id="generatedThumbnailsContainer">
                                </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>

    </div>
</div>