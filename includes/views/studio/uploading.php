<?php
// includes/views/studio/uploading.php

$supportedLangs = [
    'en-US' => 'English (United States)',
    'en-GB' => 'English (United Kingdom)',
    'fr-FR' => 'Français (France)',
    'de-DE' => 'Deutsch (Deutschland)',
    'it-IT' => 'Italiano (Italia)',
    'es-419' => 'Español (Latinoamérica)',
    'es-MX' => 'Español (México)',
    'es-ES' => 'Español (España)',
    'pt-BR' => 'Português (Brasil)',
    'pt-PT' => 'Português (Portugal)'
];
?>
<div class="view-content">

    <div class="component-wrapper disabled" id="uploading-empty-state">
        <div class="component-empty-state">
            <span class="material-symbols-rounded component-empty-state-icon">upload_file</span>
            <p class="component-empty-state-text"><?php echo __('studio_uploading_empty'); ?></p>
            <button type="button" class="component-button component-button--dark component-button--h40" data-nav="<?php echo APP_URL; ?>/studio/upload">
                <span class="material-symbols-rounded">upload</span>
                <span><?php echo __('studio_btn_upload_videos'); ?></span>
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
                        <span><?php echo __('studio_btn_cancel'); ?></span>
                    </button>
                    <button type="button" class="component-button component-button--dark component-button--h36 disabled" id="btnPublishVideo" data-action="publishVideo" disabled>
                        <span class="material-symbols-rounded">publish</span>
                        <span><?php echo __('studio_btn_publish'); ?></span>
                    </button>
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="studio-uploading-wrapper">
                    
                    <div class="studio-uploading-details">

                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Idioma Original del Video</h2>
                                        <p class="component-card__description">El idioma hablado en tu video o el principal de los textos.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleOriginalLanguage">
                                            <span class="material-symbols-rounded">translate</span>
                                            <span class="component-dropdown-text" id="selectedOriginalLangText">Español (Latinoamérica)</span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleOriginalLanguage" id="originalLanguageSelectorMenu">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <?php foreach($supportedLangs as $key => $label): ?>
                                                    <div class="component-menu-link <?php echo $key === 'es-419' ? 'active' : ''; ?>" data-action="selectOriginalLanguage" data-value="<?php echo $key; ?>" data-text="<?php echo $label; ?>">
                                                        <div class="component-menu-link-icon">
                                                            <span class="material-symbols-rounded">language</span>
                                                        </div>
                                                        <div class="component-menu-link-text">
                                                            <span><?php echo $label; ?></span>
                                                        </div>
                                                    </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <input type="hidden" id="videoOriginalLanguageInput" value="es-419">
                        
                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Seleccionar Idioma del Título</h2>
                                        <p class="component-card__description">Añade traducciones para el título de tu video.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTitleLanguage">
                                            <span class="material-symbols-rounded">language</span>
                                            <span class="component-dropdown-text" id="selectedTitleLangText">Título Original</span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleTitleLanguage" id="titleLanguageSelectorMenu">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <div class="component-menu-link active" data-action="selectTitleLanguage" data-value="original" data-text="Título Original">
                                                        <div class="component-menu-link-icon">
                                                            <span class="material-symbols-rounded">star</span>
                                                        </div>
                                                        <div class="component-menu-link-text">
                                                            <span>Título Original</span>
                                                        </div>
                                                    </div>
                                                    <?php foreach($supportedLangs as $key => $label): ?>
                                                    <div class="component-menu-link" data-action="selectTitleLanguage" data-value="<?php echo $key; ?>" data-text="<?php echo $label; ?>">
                                                        <div class="component-menu-link-icon">
                                                            <span class="material-symbols-rounded">language</span>
                                                        </div>
                                                        <div class="component-menu-link-text">
                                                            <span><?php echo $label; ?></span>
                                                        </div>
                                                    </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="titlesContainer">
                            <div class="component-card--grouped title-card-box" data-lang="original" style="display: block;">
                                <div class="component-group-item component-group-item--stateful">
                                    <div class="active component-state-box" data-state="title-view">
                                        <div class="component-card__content">
                                            <div class="component-card__text">
                                                <h2 class="component-card__title"><?php echo __('studio_video_title_req'); ?> (Original)</h2>
                                                <span class="component-display-value" data-ref="display-title-original"><?php echo __('studio_loading'); ?></span>
                                            </div>
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title-original"><?php echo __('studio_btn_edit'); ?></button>
                                        </div>
                                    </div>

                                    <div class="disabled component-state-box" data-state="title-edit">
                                        <div class="component-card__content">
                                            <div class="component-card__text">
                                                <h2 class="component-card__title"><?php echo __('studio_video_title_req'); ?> (Original)</h2>
                                                <div class="component-edit-row">
                                                    <div class="component-input-group component-input-group--h34">
                                                        <input type="text" id="videoTitleInput_original" data-ref="input-title-original" class="component-input-field component-input-field--simple" placeholder="<?php echo __('studio_video_title_placeholder'); ?>">
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--stretch">
                                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title-original"><?php echo __('studio_btn_cancel'); ?></button>
                                                        <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveTitle" data-lang="original"><?php echo __('studio_btn_save'); ?></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <?php foreach($supportedLangs as $key => $label): ?>
                            <div class="component-card--grouped title-card-box" data-lang="<?php echo $key; ?>" style="display: none;">
                                <div class="component-group-item component-group-item--stateful">
                                    <div class="active component-state-box" data-state="title-view">
                                        <div class="component-card__content">
                                            <div class="component-card__text">
                                                <h2 class="component-card__title">Título en <?php echo $label; ?></h2>
                                                <span class="component-display-value" data-ref="display-title-<?php echo $key; ?>">Sin traducción</span>
                                            </div>
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title-<?php echo $key; ?>"><?php echo __('studio_btn_edit'); ?></button>
                                        </div>
                                    </div>

                                    <div class="disabled component-state-box" data-state="title-edit">
                                        <div class="component-card__content">
                                            <div class="component-card__text">
                                                <h2 class="component-card__title">Título en <?php echo $label; ?></h2>
                                                <div class="component-edit-row">
                                                    <div class="component-input-group component-input-group--h34">
                                                        <input type="text" id="videoTitleInput_<?php echo $key; ?>" data-ref="input-title-<?php echo $key; ?>" class="component-input-field component-input-field--simple localized-title-input" placeholder="Añade la traducción aquí">
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--stretch">
                                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title-<?php echo $key; ?>"><?php echo __('studio_btn_cancel'); ?></button>
                                                        <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveTitle" data-lang="<?php echo $key; ?>"><?php echo __('studio_btn_save'); ?></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>

                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('studio_video_desc'); ?></h2>
                                        <p class="component-card__description"><?php echo __('studio_video_desc_hint'); ?></p>
                                        <div class="component-card__form-area">
                                            <textarea id="videoDescriptionInput" class="component-input-field" data-ref="inp_video_description" placeholder="<?php echo __('studio_video_desc_placeholder'); ?>" maxlength="1000" rows="5"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('studio_video_visibility'); ?></h2>
                                        <p class="component-card__description"><?php echo __('studio_video_visibility_hint'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleVisibility">
                                            <span class="material-symbols-rounded" id="visibilityIcon">public</span>
                                            <span class="component-dropdown-text" id="visibilityText"><?php echo __('studio_visibility_public'); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleVisibility" id="visibilitySelectorMenu">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    
                                                    <div class="component-menu-link active" data-action="selectVisibility" data-value="public" data-icon="public" data-text="<?php echo __('studio_visibility_public'); ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                                        <div class="component-menu-link-text">
                                                            <span><?php echo __('studio_visibility_public'); ?></span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="component-menu-link" data-action="selectVisibility" data-value="unlisted" data-icon="link" data-text="<?php echo __('studio_visibility_unlisted'); ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">link</span></div>
                                                        <div class="component-menu-link-text">
                                                            <span><?php echo __('studio_visibility_unlisted'); ?></span>
                                                        </div>
                                                    </div>

                                                    <div class="component-menu-link" data-action="selectVisibility" data-value="private" data-icon="lock" data-text="<?php echo __('studio_visibility_private'); ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                                        <div class="component-menu-link-text">
                                                            <span><?php echo __('studio_visibility_private'); ?></span>
                                                        </div>
                                                    </div>

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
                                        <h2 class="component-card__title"><?php echo __('studio_tags_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('studio_tags_hint'); ?></p>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('studio_models_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('studio_models_hint'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTagsModels" data-type="modelo">
                                            <span class="material-symbols-rounded">person_add</span>
                                            <span class="component-dropdown-text"><?php echo __('studio_select_models'); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <?php 
                                            $selectorId = 'modelsSelectorMenu';
                                            $placeholder = __('studio_search_models');
                                            $moduleName = 'moduleTagsModels';
                                            include __DIR__ . '/../../modules/moduleTagsSelector.php'; 
                                        ?>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('studio_categories_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('studio_categories_hint'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTagsCategories" data-type="category">
                                            <span class="material-symbols-rounded">category</span>
                                            <span class="component-dropdown-text"><?php echo __('studio_select_categories'); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <?php 
                                            $selectorId = 'categoriesSelectorMenu';
                                            $placeholder = __('studio_search_categories');
                                            $moduleName = 'moduleTagsCategories';
                                            include __DIR__ . '/../../modules/moduleTagsSelector.php'; 
                                        ?>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('studio_free_tags_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('studio_free_tags_hint'); ?></p>
                                        <div class="component-input-group component-input-group--h34" style="margin-top: 12px; max-width: 400px;">
                                            <input type="text" id="freeTagsInput" class="component-input-field component-input-field--simple" placeholder="<?php echo __('studio_free_tags_placeholder'); ?>">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <input type="hidden" id="hiddenModelsArray" name="models" value="[]">
                            <input type="hidden" id="hiddenCategoriesArray" name="categories" value="[]">
                            <input type="hidden" id="hiddenTagsArray" name="free_tags" value="[]">
                        </div>

                    </div>

                    <div class="studio-uploading-preview">
                        <div class="studio-video-card">
                            <div class="studio-video-card__player studio-video-card__player-preview">
                                <img id="dynamicThumbPreview" src="" alt="<?php echo __('studio_thumb_alt'); ?>" class="studio-video-card__player-img" onerror="if(!this.dataset.retried) { this.dataset.retried = 'true'; this.src = this.src.replace('/public/storage/', '/storage/'); } else { this.style.display='none'; this.nextElementSibling.style.display='block'; }">
                                <span class="material-symbols-rounded studio-video-card__player-icon">play_circle</span>
                            </div>
                            <div class="studio-video-card__info">
                                <div class="studio-video-card__meta-group">
                                    <span class="meta-label"><?php echo __('studio_video_link'); ?></span>
                                    <span class="meta-value"><?php echo __('studio_video_link_pending'); ?></span>
                                </div>
                                <div class="studio-video-card__meta-group">
                                    <span class="meta-label"><?php echo __('studio_video_filename'); ?></span>
                                    <span class="meta-value" id="previewOriginalFilename"><?php echo __('studio_loading'); ?></span>
                                </div>
                            </div>
                        </div>

                        <div class="component-thumbnail-section">
                            <h3 class="meta-label"><?php echo __('studio_thumb_title'); ?></h3>
                            <p class="meta-label"><?php echo __('studio_thumb_hint'); ?></p>
                            
                            <div class="component-thumbnail-actions">
                                <input type="file" id="thumbnailInput" class="disabled" accept="image/png, image/jpeg, image/webp">
                                <button type="button" class="component-button component-button--h40" onclick="document.getElementById('thumbnailInput').click();">
                                    <span class="material-symbols-rounded">add_photo_alternate</span>
                                    <span><?php echo __('studio_btn_upload'); ?></span>
                                </button>
                                
                                <button type="button" id="btnGenerateThumbnails" class="component-button component-button--h40">
                                    <span class="material-symbols-rounded">auto_awesome</span>
                                    <span><?php echo __('studio_thumb_generate'); ?></span>
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