<?php
// includes/views/studio/edit-video.php
$userUuid = $_GET['uuid'] ?? '';
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                    <h1 style="font-size: 20px; font-weight: 500;">Editar Detalles del Video</h1>
                </div>
                
                <div class="component-view-top-right" style="display: flex; gap: 8px;">
                    <button type="button" class="component-button component-button--h36" onclick="window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/manage-content/<?php echo htmlspecialchars($userUuid); ?>' }}));">
                        <span class="material-symbols-rounded">arrow_back</span>
                        <span>Volver</span>
                    </button>
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
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Título del video (obligatorio)</h2>
                                        <div class="component-input-group component-input-group--h34" style="margin-top: 8px;">
                                            <input type="text" id="videoTitleInput" class="component-input-field component-input-field--simple" placeholder="Ingresa un título que destaque">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped" style="margin-top: 24px;">
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

                        <div class="component-card--grouped" style="margin-top: 24px;">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Etiquetas / Tags</h2>
                                        <p class="component-card__description" style="margin-bottom: 12px;">Agrega modelos y categorías a tu video para facilitar la búsqueda.</p>
                                        
                                        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                                            <div style="flex: 1; min-width: 250px; position: relative;">
                                                <button type="button" class="component-button component-button--full" id="btnSelectModels">
                                                    <span class="material-symbols-rounded">person_add</span> Asignar Modelos
                                                </button>
                                                <div id="selectedModelsContainer" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;"></div>
                                                <?php 
                                                    $selectorId = 'modelsSelectorMenu';
                                                    $placeholder = 'Buscar modelos...';
                                                    include __DIR__ . '/../../modules/moduleTagsSelector.php'; 
                                                ?>
                                            </div>

                                            <div style="flex: 1; min-width: 250px; position: relative;">
                                                <button type="button" class="component-button component-button--full" id="btnSelectCategories">
                                                    <span class="material-symbols-rounded">category</span> Asignar Categorías
                                                </button>
                                                <div id="selectedCategoriesContainer" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;"></div>
                                                <?php 
                                                    $selectorId = 'categoriesSelectorMenu';
                                                    $placeholder = 'Buscar categorías...';
                                                    include __DIR__ . '/../../modules/moduleTagsSelector.php'; 
                                                ?>
                                            </div>
                                        </div>

                                        <input type="hidden" id="hiddenModelsArray" name="models" value="[]">
                                        <input type="hidden" id="hiddenCategoriesArray" name="categories" value="[]">

                                    </div>
                                </div>
                            </div>
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