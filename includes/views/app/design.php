<?php
// includes/views/app/design.php

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$canvasIntId = 0; 
$canvasName = '';
$canvasSize = '64'; 
$canvasPalette = 'default'; 
$canvasPrivacy = 'private'; 
$canvasApproval = '0'; 
$canvasUuid = $_GET['id'] ?? '';

if (!empty($canvasUuid)) {
    try {
        $dbManager = new DatabaseManager();
        $db = $dbManager->getConnection(DB::CONN_CANVASES);

        $sql = "SELECT id, name, size, palette_id, privacy, requires_approval FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':uuid' => $canvasUuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($canvas) {
            $canvasIntId = (int)$canvas['id'];
            $canvasName = $canvas['name'];
            $canvasSize = $canvas['size'] ?? '64';
            $canvasPalette = $canvas['palette_id'] ?? 'default';
            $canvasPrivacy = $canvas['privacy'] ?? 'private';
            $canvasApproval = $canvas['requires_approval'] ?? '0';
        }
    } catch (\Exception $e) {
        error_log("Error al cargar el lienzo en la vista de diseño: " . $e->getMessage());
    }
}
?>
<div class="view-content" style="position: relative;">
    
    <div class="component-fullscreen-overlay disabled" data-ref="private-blocked-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; background-color: var(--surface-primary); display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <div class="component-empty-state">
            <span class="material-symbols-rounded component-empty-state-icon" style="font-size: 64px;">lock</span>
            <h2 style="margin-top: 16px; font-size: 1.5rem; font-weight: 600;"><?php echo __('canvas_private_title') ?? 'Lienzo Privado'; ?></h2>
            <p class="component-empty-state-text" style="max-width: 400px; text-align: center; margin-top: 8px;">
                <?php echo __('canvas_private_desc') ?? 'Este lienzo es privado y requiere aprobación para entrar. Solicita acceso al propietario para poder visualizarlo y participar.'; ?>
            </p>
            <div style="margin-top: 24px; display: flex; gap: 12px;">
                <button class="component-button component-button--dark component-button--h45" data-action="requestAccessFromOverlay">
                    <span class="material-symbols-rounded">front_hand</span>
                    <?php echo __('btn_request_access') ?? 'Solicitar Acceso'; ?>
                </button>
                <a href="/explore" class="component-button component-button--h45">
                    <?php echo __('btn_go_explore') ?? 'Volver a Explorar'; ?>
                </a>
            </div>
        </div>
    </div>

    <div class="component-wrapper component-wrapper--full no-padding" 
         data-ref="design-wrapper" 
         data-canvas-id="<?php echo htmlspecialchars($canvasIntId); ?>"
         data-size="<?php echo htmlspecialchars($canvasSize); ?>" 
         data-palette="<?php echo htmlspecialchars($canvasPalette); ?>"
         data-privacy="<?php echo htmlspecialchars($canvasPrivacy); ?>"
         data-approval="<?php echo htmlspecialchars($canvasApproval); ?>">
         
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
            
            <div class="component-top-right" style="display: flex; align-items: center;">
                
                <div class="component-actions disabled" data-ref="spectator-controls" style="display: none; align-items: center; gap: 12px; margin-right: 16px; padding-right: 16px; border-right: 1px solid var(--border-color);">
                    <div class="component-badge component-badge--warning" style="margin: 0;" data-tooltip="<?php echo __('tooltip_spectator') ?? 'Solo puedes observar'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded">visibility</span>
                        <span><?php echo __('lbl_spectator') ?? 'Modo Espectador'; ?></span>
                    </div>
                    
                    <button class="component-button component-button--h34" data-action="joinCanvasDirectly" data-ref="btn-join-direct" style="display: none;">
                        <?php echo __('btn_join') ?? 'Unirse'; ?>
                    </button>
                    
                    <button class="component-button component-button--h34 component-button--dark" data-action="requestCanvasAccess" data-ref="btn-request-access" style="display: none;">
                        <span class="material-symbols-rounded" style="font-size: 18px;">front_hand</span>
                        <?php echo __('btn_request_access') ?? 'Solicitar Acceso'; ?>
                    </button>
                </div>

                <div class="component-actions active" data-ref="design-tools-actions">
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