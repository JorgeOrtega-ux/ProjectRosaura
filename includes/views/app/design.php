<?php
// includes/views/app/design.php

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$canvasName = '';
$canvasUuid = $_GET['id'] ?? '';

if (!empty($canvasUuid)) {
    try {
        // Inicializamos la conexión para obtener los detalles del lienzo actual de forma segura
        $dbManager = new DatabaseManager();
        $db = $dbManager->getConnection(DB::CONN_CANVASES);

        $sql = "SELECT name FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':uuid' => $canvasUuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($canvas) {
            $canvasName = $canvas['name'];
        }
    } catch (\Exception $e) {
        error_log("Error al cargar el nombre del lienzo en la vista de diseño: " . $e->getMessage());
    }
}
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="design-wrapper">
        <div class="component-top">
            <div class="component-top-left" style="display: flex; align-items: center; gap: 12px;">
                <h1 class="component-top-title"><?php echo __('lbl_design_title'); ?></h1>
                
                <?php if (!empty($canvasName)): ?>
                    <span style="opacity: 0.3; font-size: 1.5rem; font-weight: 300; user-select: none;">/</span>
                    <h1 class="component-top-title" style="opacity: 0.7; font-weight: 400;">
                        <?php echo htmlspecialchars($canvasName); ?>
                    </h1>
                <?php endif; ?>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    <button class="component-button component-button--icon component-button--h40 component-color-indicator" style="--active-color: #000000;" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="Paleta de colores" data-position="bottom">
                        <span class="material-symbols-rounded">palette</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-templates" data-tooltip="Plantillas" data-position="bottom">
                        <span class="material-symbols-rounded">photo_library</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="component-bottom">
            <canvas data-ref="design-canvas" class="component-canvas-surface"></canvas>
            
            <div class="component-badge component-badge--absolute-tl">
                <span class="material-symbols-rounded">my_location</span>
                <span data-ref="coords-text">- , -</span>
            </div>
            
            <div class="component-action-pill">
                <button class="component-button component-button--dark component-button--h45 disabled-interactive" data-action="placePixels" data-ref="pixel-action-btn">
                    <span class="material-symbols-rounded">touch_app</span>
                    <span data-ref="pixel-action-text"><?php echo __('btn_select_pixels'); ?></span>
                </button>
            </div>
        </div>
    </div>

    <?php require_once __DIR__ . '/../../modules/moduleDesignTools.php'; ?>

</div>