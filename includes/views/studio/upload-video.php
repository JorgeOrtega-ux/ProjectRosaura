<?php
// includes/views/studio/upload-video.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="component-upload-area" id="videoDropZone">
                    <div class="component-upload-content">
                        <div class="component-upload-icon-wrapper">
                            <span class="material-symbols-rounded component-upload-icon">upload</span>
                        </div>
                        <h2 class="component-upload-title" data-i18n="studio_drag_drop">Arrastra y suelta archivos de video para subirlos</h2>
                        <p class="component-upload-subtitle" data-i18n="studio_private_until_publish">Tus videos serán privados hasta que los publiques.</p>
                        
                        <input type="file" id="videoFileInput" multiple accept="video/*">
                        <button class="component-upload-button" type="button" onclick="document.getElementById('videoFileInput').click();" data-i18n="studio_select_files">Seleccionar archivos</button>
                        
                        <div id="uploadProgressContainer">
                            <div>
                                <div id="uploadProgressBar"></div>
                            </div>
                            <p data-i18n="studio_uploading_network">Subiendo archivos...</p>
                        </div>
                    </div>
                    
                    <div class="component-upload-footer">
                        <p class="component-upload-terms">
                            Si envías tus videos a YouTube, aceptas las <a href="#" class="component-upload-terms-link">Condiciones del Servicio</a> y los <a href="#" class="component-upload-terms-link">Lineamientos de la Comunidad</a> de YouTube.<br>
                            Asegúrate de no infringir los derechos de autor o de privacidad de otras personas. <a href="#" class="component-upload-terms-link">Más información</a>
                        </p>
                    </div>
                </div>

                <div id="uploadTagsSection">
                    <div class="component-card--grouped">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content component-card__content--full">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Etiquetas (Modelos y Categorías)</h2>
                                    <p class="component-card__description">Configura las etiquetas base para los videos que vas a subir.</p>
                                </div>
                            </div>
                        </div>

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Modelos</h2>
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

            </div>

        </div>
    </div>
</div>