<?php
// includes/views/app/design.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="design-wrapper">
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('lbl_design_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    <button class="component-button component-button--icon component-button--h40 btn-color-indicator" style="--active-color: #000000;" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="Paleta de colores" data-position="bottom">
                        <span class="material-symbols-rounded">palette</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-templates" data-tooltip="Plantillas" data-position="bottom">
                        <span class="material-symbols-rounded">photo_library</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="component-bottom">
            <canvas data-ref="design-canvas" class="design-canvas-surface"></canvas>
            
            <div class="component-badge component-badge--absolute-tl">
                <span class="material-symbols-rounded">my_location</span>
                <span data-ref="coords-text">- , -</span>
            </div>
            
            <div class="design-action-pill">
                <button class="component-button component-button--dark component-button--h45 disabled-interactive" data-action="placePixels" data-ref="pixel-action-btn">
                    <span class="material-symbols-rounded">touch_app</span>
                    <span data-ref="pixel-action-text"><?php echo __('btn_select_pixels'); ?></span>
                </button>
            </div>
        </div>
    </div>

    <?php require_once __DIR__ . '/../../modules/moduleDesignTools.php'; ?>

</div>