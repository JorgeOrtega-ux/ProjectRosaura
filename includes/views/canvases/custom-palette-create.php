<?php
if (session_status() === PHP_SESSION_NONE) session_start();

$userPermissions = $_SESSION['user_permissions'] ?? [];

$rawName = '';
$translatedName = __('canvas_palette_new', 'Mi Nueva Paleta');
?>

<div class="view-content" data-ref="customPaletteBuilderView">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('canvas_create_custom_palette', 'Crear Paleta Personalizada'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--primary component-button--h40" data-action="savePaletteData">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save', 'Guardar'); ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-preview-ring" data-ref="paletteLivePreviewRing">
                                <div class="component-preview-ring__inner">
                                    <span class="material-symbols-rounded">palette</span>
                                </div>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_palette_preview_title', 'Previsualización de la Paleta'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_palette_preview_desc', 'Así se verán los colores distribuidos de tu nueva paleta.'); ?></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stateful">
                        <div class="active component-state-box" data-state="palette-name-view" data-ref="paletteNameView">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_palette_name', 'Nombre de la Paleta'); ?></h2>
                                    <span class="component-display-value" data-ref="display-palette-name">
                                        <?php echo htmlspecialchars($translatedName); ?>
                                    </span>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--stretch">
                                <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="palette-name"><?php echo __('btn_edit', 'Editar'); ?></button>
                            </div>
                        </div>

                        <div class="disabled component-state-box" data-state="palette-name-edit" data-ref="paletteNameEdit">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_palette_name', 'Nombre de la Paleta'); ?></h2>
                                    <div class="component-edit-row">
                                        <div class="component-input-group component-input-group--h34">
                                            <input type="text" data-ref="paletteNameInput" class="component-input-field component-input-field--simple" placeholder="<?php echo __('ph_palette_name', 'Nombre de la paleta (ej. Mi Paleta)'); ?>" value="<?php echo htmlspecialchars($translatedName); ?>">
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="palette-name"><?php echo __('btn_cancel', 'Cancelar'); ?></button>
                                            <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyPaletteName"><?php echo __('btn_save', 'Guardar'); ?></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div data-ref="colorsMasterContainer" class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">palette</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_palette_colors_title', 'Colores de la Paleta'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_palette_colors_desc', 'Añade entre 4 y 36 colores. Configura el tono de cada uno de manera individual.'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end" data-ref="btnAddColorWrapper">
                            <button type="button" class="component-button component-button--h36" data-ref="btnAddColor" data-action="addColor">
                                <?php echo __('btn_add_color', 'Agregar color'); ?>
                            </button>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div data-ref="paletteColorsContainer" class="component-color-list">
                                            </div>

                </div>

            </div>
        </div>
    </div>
</div>
