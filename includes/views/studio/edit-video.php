<?php
// includes/views/studio/edit-video.php
$userUuid = $_GET['uuid'] ?? '';
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
                
                <div class="component-view-top-right">
                    <button type="button" class="component-button component-button--dark component-button--h36" id="btnSaveChanges">
                        <span class="material-symbols-rounded">save</span>
                        <span>Guardar cambios</span>
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
                                            <h2 class="component-card__title">Título del video (obligatorio)</h2>
                                            <span class="component-display-value" data-ref="display-title">Cargando...</span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title">Editar</button>
                                    </div>
                                </div>

                                <div class="disabled component-state-box" data-state="title-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Título del video (obligatorio)</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" id="videoTitleInput" data-ref="input-title" class="component-input-field component-input-field--simple" placeholder="Ingresa un título que destaque">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveTitle">Guardar</button>
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
                                        <h2 class="component-card__title">Descripción</h2>
                                        <p class="component-card__description">Cuenta a los espectadores de qué trata tu video.</p>
                                        <div class="component-card__form-area">
                                            <textarea id="videoDescriptionInput" class="component-input-field" placeholder="Añade tu descripción aquí..." maxlength="1000" rows="5"></textarea>
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
                                                            <span style="display:block; line-height:1.2;">Público</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="component-menu-link" data-action="selectVisibility" data-value="unlisted" data-icon="link" data-text="No listado">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">link</span></div>
                                                        <div class="component-menu-link-text">
                                                            <span style="display:block; line-height:1.2;">No listado</span>
                                                        </div>
                                                    </div>

                                                    <div class="component-menu-link" data-action="selectVisibility" data-value="private" data-icon="lock" data-text="Privado">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                                        <div class="component-menu-link-text">
                                                            <span style="display:block; line-height:1.2;">Privado</span>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                        
                                        <select id="videoVisibilitySelect" style="display: none;">
                                            <option value="public" selected>public</option>
                                            <option value="unlisted">unlisted</option>
                                            <option value="private">private</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped" style="margin-top: 24px;">
                            <div class="component-group-item component-group-item--stacked" style="border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05));">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Etiquetas / Tags</h2>
                                        <p class="component-card__description" style="margin-bottom: 0;">Agrega modelos y categorías a tu video para facilitar la búsqueda.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="component-group-item component-group-item--stacked" style="border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05));">
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
                            <div class="studio-video-card__player" style="background-color: var(--background-secondary, #2a2a2a); border-radius: 8px; overflow: hidden; position: relative;">
                                <span class="material-symbols-rounded" style="color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px;">play_circle</span>
                            </div>
                        </div>

                        <div class="component-thumbnail-section" style="margin-top: 16px;">
                            <h3 class="meta-label" style="margin-bottom: 8px; font-weight: 500;">Miniatura</h3>
                            <p class="meta-label" style="margin-bottom: 12px; font-size: 11px;">Selecciona o sube una imagen que muestre el contenido de tu video.</p>
                            
                            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                                <input type="file" id="thumbnailInput" accept="image/png, image/jpeg, image/webp" style="display: none;">
                                <button type="button" class="component-button component-button--full component-button--h40" onclick="document.getElementById('thumbnailInput').click();">
                                    <span class="material-symbols-rounded">add_photo_alternate</span>
                                    <span>Subir / Cambiar</span>
                                </button>
                                
                                <button type="button" id="btnGenerateThumbnails" class="component-button component-button--full component-button--h40">
                                    <span class="material-symbols-rounded">auto_awesome</span>
                                    <span>Generar opciones</span>
                                </button>
                            </div>

                            <input type="hidden" id="selectedGeneratedThumbnail" name="selected_generated_thumbnail" value="">

                            <div class="component-thumbnail-grid" id="generatedThumbnailsContainer" style="display: none;">
                            </div>
                        </div>

                    </div>

                </div>
            </div>

        </div>
    </div>
</div>