<?php // includes/views/canvases/create.php ?>
<div class="view-content" data-ref="canvas-create-wrapper">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('canvas_create_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--icon component-button--h40" data-action="createCanvas" data-tooltip="<?php echo __('btn_create_canvas'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">add_box</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-card--grouped">

                    <div class="component-group-item component-group-item--stateful">
                        
                        <div class="active component-state-box" data-state="canvasname-view">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_name_title'); ?></h2>
                                    <span class="component-display-value" data-ref="display-canvasname"><?php echo __('lbl_loading'); ?></span>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--stretch">
                                <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="canvasname"><?php echo __('btn_edit'); ?></button>
                            </div>
                        </div>

                        <div class="disabled component-state-box" data-state="canvasname-edit">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_name_title'); ?></h2>
                                    <div class="component-edit-row">
                                        <div class="component-input-group component-input-group--h34">
                                            <input type="text" data-ref="input-canvasname" class="component-input-field component-input-field--simple" value="" data-original-value="" placeholder="<?php echo __('ph_canvas_name'); ?>">
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="canvasname"><?php echo __('btn_cancel'); ?></button>
                                            <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveCanvasName"><?php echo __('btn_save'); ?></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_desc_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_desc_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-input-group component-input-group--h34">
                                <input type="text" data-ref="input-canvas-desc" class="component-input-field component-input-field--simple" placeholder="<?php echo __('ph_canvas_desc'); ?>">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_size_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_size_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSize">
                                    <span class="material-symbols-rounded">crop_square</span>
                                    <span class="component-dropdown-text" data-ref="text-size">64x64</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSize">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link active" data-action="selectValue" data-type="size" data-value="64" data-label="64x64" data-icon="crop_square">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">crop_square</span></div>
                                                <div class="component-menu-link-text"><span>64x64</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectValue" data-type="size" data-value="128" data-label="128x128" data-icon="aspect_ratio">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">aspect_ratio</span></div>
                                                <div class="component-menu-link-text"><span>128x128</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectValue" data-type="size" data-value="264" data-label="264x264" data-icon="grid_4x4">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">grid_4x4</span></div>
                                                <div class="component-menu-link-text"><span>264x264</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectValue" data-type="size" data-value="512" data-label="512x512" data-icon="grid_on">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">grid_on</span></div>
                                                <div class="component-menu-link-text"><span>512x512</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_privacy_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_privacy_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownPrivacy">
                                    <span class="material-symbols-rounded">lock</span>
                                    <span class="component-dropdown-text" data-ref="text-privacy"><?php echo __('canvas_privacy_private'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownPrivacy">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link" data-action="selectValue" data-type="privacy" data-value="public" data-label="canvas_privacy_public" data-icon="public">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_privacy_public'); ?></span></div>
                                            </div>
                                            <div class="component-menu-link active" data-action="selectValue" data-type="privacy" data-value="private" data-label="canvas_privacy_private" data-icon="lock">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_privacy_private'); ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_approval_title') ?? 'Aprobación de acceso'; ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_approval_desc') ?? 'Si se activa, los usuarios deberán enviar una solicitud que tú aprobarás antes de que puedan unirse y pintar.'; ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownApproval">
                                    <span class="material-symbols-rounded" data-ref="icon-approval">no_accounts</span>
                                    <span class="component-dropdown-text" data-ref="text-approval"><?php echo __('canvas_approval_false') ?? 'No requiere aprobación'; ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownApproval">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link active" data-action="selectValue" data-type="requires_approval" data-value="false" data-label="No requiere aprobación" data-icon="no_accounts">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">no_accounts</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_approval_false') ?? 'No requiere aprobación'; ?></span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectValue" data-type="requires_approval" data-value="true" data-label="Requiere aprobación" data-icon="front_hand">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">front_hand</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_approval_true') ?? 'Requiere aprobación'; ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_palette_title') ?? 'Paleta de Colores'; ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_palette_desc') ?? 'Elige la paleta de colores disponible para este lienzo.'; ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownPalette">
                                    <span class="material-symbols-rounded" data-ref="icon-palette">palette</span>
                                    <span class="component-dropdown-text" data-ref="text-palette"><?php echo __('lbl_loading'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownPalette">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable" data-ref="palette-selector-container">
                                            </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_cooldown_batch_title') ?? 'Píxeles por lote (Capacidad)'; ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_cooldown_batch_desc') ?? 'Cantidad máxima de píxeles que un usuario puede acumular para colocar sin tener que esperar.'; ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-input-group component-input-group--h34" style="width: 120px;">
                                <input type="number" data-ref="val_cooldown_batch" class="component-input-field component-input-field--simple" value="5" min="1" max="100" style="text-align: center;">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_cooldown_seconds_title') ?? 'Tiempo de recarga (Segundos)'; ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_cooldown_seconds_desc') ?? 'Segundos que debe esperar el usuario para regenerar 1 píxel gastado (Pon 0 para infinito).'; ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-input-group component-input-group--h34" style="width: 120px;">
                                <input type="number" data-ref="val_cooldown_seconds" class="component-input-field component-input-field--simple" value="10" min="0" max="3600" style="text-align: center;">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_limit_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_limit_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLimit" data-step="-50" data-min="10">
                                        <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLimit" data-step="-10" data-min="10">
                                        <span class="material-symbols-rounded">chevron_left</span>
                                    </button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_limit" data-val="10">10</div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLimit" data-step="10" data-max="50000">
                                        <span class="material-symbols-rounded">chevron_right</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLimit" data-step="50" data-max="50000">
                                        <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </div>
</div>