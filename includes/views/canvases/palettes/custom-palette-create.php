<?php
if (session_status() === PHP_SESSION_NONE) session_start();

$userPermissions = $_SESSION['user_permissions'] ?? [];
$translatedName = __('canvas_palette_new');
?>

<div class="view-content" data-ref="customPaletteBuilderView">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="custom-palette-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvas_create_custom_palette'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <!-- Acciones de Selección Múltiple -->
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="editSelectedColor" data-position="bottom" data-ref="btn-edit-color" data-tooltip="<?php echo __('tooltip_edit_color'); ?>">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedColors" data-position="bottom" data-ref="btn-delete-color" data-tooltip="<?php echo __('tooltip_delete_color'); ?>">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
                
                <!-- Acciones Predeterminadas -->
                <div class="component-actions active" data-ref="header-default-actions">
                    <div class="component-search component-search--w260" data-ref="paletteNameWrapper">
                        <div class="component-search-icon">
                            <span class="material-symbols-rounded">palette</span>
                        </div>
                        <div class="component-search-input">
                            <input type="text" data-ref="paletteNameInput" placeholder="<?php echo htmlspecialchars($translatedName); ?>" value="<?php echo htmlspecialchars($translatedName); ?>" autocomplete="off">
                        </div>
                    </div>

                    <button class="component-button component-button--icon component-button--h40" data-action="searchColor" data-position="bottom" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_color_placeholder'); ?>">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="openAddColorModal" data-position="bottom" data-ref="btn-add-color" data-tooltip="<?php echo __('btn_add_color'); ?>">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="savePaletteData" data-position="bottom" data-ref="btn-save-palette" data-tooltip="<?php echo __('btn_save'); ?>">
                        <span class="material-symbols-rounded">save</span>
                    </button>
                </div>
                
            </div>

            <!-- Barra de Búsqueda -->
            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="color-search-input" placeholder="<?php echo __('search_color_placeholder'); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th><?php echo __('table_header_sample'); ?></th>
                            <th><?php echo __('table_header_hex'); ?></th>
                            <th><?php echo __('table_header_rgb'); ?></th>
                            <th><?php echo __('table_header_hsl'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="paletteTableBody">
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>
