<?php
// includes/views/app/design.php

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\Helpers\EnvLoader;
use PDO;

$canvasIntId = 0; 
$canvasName = '';
$canvasSize = '64'; 
$canvasPalette = 'default'; 
$canvasPrivacy = 'private'; 
$canvasApproval = '0'; 

// Variables para el Cooldown
$canvasCooldownBatch = '5';
$canvasCooldownSeconds = '10';

// Variables para reinicios
$resetActive = '0';
$nextResetAt = '';
$timerAction = 'restart';

// Variables para expansiones (resize)
$resizeActive = '0';
$nextResizeAt = '';
$resizeTargetSize = '64';
$resizeTimerAction = 'restart';

$canvasUuid = $_GET['id'] ?? '';
$isSnapshot = isset($_GET['snapshot']); // Bandera para saber si es historial

// Cargar la clave pública de Turnstile para invitados
$turnstileSiteKey = EnvLoader::get('TURNSTILE_SITE_KEY', '');

if (!empty($canvasUuid)) {
    try {
        $dbManager = new DatabaseManager();
        $db = $dbManager->getConnection(DB::CONN_CANVASES);

        // Traemos información de reinicios y redimensiones
        $sql = "SELECT c.id, c.name, c.size, c.palette_id, c.privacy, c.requires_approval, 
                       c.cooldown_pixels_batch, c.cooldown_seconds,
                       r.is_active as reset_active, r.next_reset_at, r.timer_action as reset_timer_action,
                       rs.is_active as resize_active, rs.next_resize_at, rs.target_size, rs.timer_action as resize_timer_action
                FROM " . DB::TBL_CANVASES . " c
                LEFT JOIN canvas_reset_settings r ON c.id = r.canvas_id
                LEFT JOIN canvas_resize_settings rs ON c.id = rs.canvas_id
                WHERE c.uuid = :uuid LIMIT 1";
        
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
            
            $canvasCooldownBatch = $canvas['cooldown_pixels_batch'] ?? '5';
            $canvasCooldownSeconds = $canvas['cooldown_seconds'] ?? '10';

            $resetActive = $canvas['reset_active'] ?? '0';
            $nextResetAt = $canvas['next_reset_at'] ?? '';
            $timerAction = $canvas['reset_timer_action'] ?? 'restart';

            $resizeActive = $canvas['resize_active'] ?? '0';
            $nextResizeAt = $canvas['next_resize_at'] ?? '';
            $resizeTargetSize = $canvas['target_size'] ?? '64';
            $resizeTimerAction = $canvas['resize_timer_action'] ?? 'restart';
        }
    } catch (\Exception $e) {
        error_log("Error al cargar el lienzo en la vista de diseño: " . $e->getMessage());
    }
}
?>
<div class="view-content">
    
    <div id="cf-turnstile-wrapper" style="display: none;" data-sitekey="<?php echo htmlspecialchars($turnstileSiteKey); ?>"></div>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>

    <div class="component-wrapper component-wrapper--full no-padding" 
         data-ref="design-wrapper" 
         data-canvas-id="<?php echo htmlspecialchars($canvasIntId); ?>"
         data-size="<?php echo htmlspecialchars($canvasSize); ?>" 
         data-palette="<?php echo htmlspecialchars($canvasPalette); ?>"
         data-privacy="<?php echo htmlspecialchars($canvasPrivacy); ?>"
         data-approval="<?php echo htmlspecialchars($canvasApproval); ?>"
         data-cooldown-batch="<?php echo htmlspecialchars($canvasCooldownBatch); ?>"
         data-cooldown-seconds="<?php echo htmlspecialchars($canvasCooldownSeconds); ?>"
         data-reset-active="<?php echo htmlspecialchars($resetActive); ?>"
         data-reset-at="<?php echo htmlspecialchars($nextResetAt); ?>"
         data-timer-action="<?php echo htmlspecialchars($timerAction); ?>"
         data-resize-active="<?php echo htmlspecialchars($resizeActive); ?>"
         data-resize-at="<?php echo htmlspecialchars($nextResizeAt); ?>"
         data-resize-target="<?php echo htmlspecialchars($resizeTargetSize); ?>"
         data-resize-timer-action="<?php echo htmlspecialchars($resizeTimerAction); ?>">
         
        <div class="component-top">
            <div class="component-top-left" style="display: flex; align-items: center; gap: 12px;">
                <h1 class="component-top-title"><?php echo __('lbl_design_title'); ?></h1>
                
                <?php if (!empty($canvasName)): ?>
                    <span style="opacity: 0.3; font-size: 1.5rem; font-weight: 300; user-select: none;">/</span>
                    <h1 class="component-top-title" style="opacity: 0.7; font-weight: 400;">
                        <?php echo htmlspecialchars($canvasName); ?>
                    </h1>
                <?php endif; ?>

                <?php if ($isSnapshot): ?>
                    <span class="component-badge component-badge--warning" style="margin-left: 12px;">
                        <span class="material-symbols-rounded">history</span> Modo Histórico
                    </span>
                <?php endif; ?>
            </div>
            
            <div class="component-top-right" style="display: flex; align-items: center;">
                
                <?php if (!$isSnapshot): ?>
                <div class="component-actions disabled" data-ref="spectator-controls" style="display: none; align-items: center; gap: 12px; margin-right: 16px; padding-right: 16px; border-right: 1px solid var(--border-color);">
                    
                    <div class="component-badge component-badge--warning" data-ref="spectator-status-badge" style="margin: 0; display: none;" data-tooltip="<?php echo __('tooltip_spectator') ?? 'Solo puedes observar'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded">visibility</span>
                        <span><?php echo __('lbl_spectator') ?? 'Modo Espectador'; ?></span>
                    </div>

                    <div class="component-badge component-badge--danger" data-ref="private-status-badge" style="margin: 0; display: none;" data-tooltip="No eres miembro" data-position="bottom">
                        <span class="material-symbols-rounded">lock</span>
                        <span>Lienzo Privado</span>
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
                    <button class="component-button component-button--icon component-button--h40 disabled" data-action="toggleTemplateLock" data-ref="btn-template-lock" data-tooltip="Bloquear / Desbloquear Plantilla" data-position="bottom">
                        <span class="material-symbols-rounded">lock_open</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger disabled" data-action="deleteTemplate" data-ref="btn-template-delete" data-tooltip="Quitar Plantilla" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <div class="component-divider-vertical disabled" data-ref="template-actions-divider"></div>
                    
                    <button class="component-button component-button--icon component-button--h40 component-color-indicator" style="--active-color: #000000;" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="Paleta de colores" data-position="bottom">
                        <span class="material-symbols-rounded">palette</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-templates" data-tooltip="Plantillas" data-position="bottom">
                        <span class="material-symbols-rounded">photo_library</span>
                    </button>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <div class="component-bottom">
            <canvas data-ref="design-canvas" class="component-canvas-surface"></canvas>
            
            <div class="canvas-badges-left" data-ref="badges-left"></div>
            <div class="canvas-badges-right" data-ref="badges-right"></div>
            
            <?php if (!$isSnapshot): ?>
            <div class="component-action-pill">
                <button class="component-button component-button--dark component-button--h45 disabled-interactive" data-action="placePixels" data-ref="pixel-action-btn" style="padding-right: 8px;">
                    <span class="material-symbols-rounded">touch_app</span>
                    <span data-ref="pixel-action-text" style="margin-right: 4px;"><?php echo __('btn_select_pixels'); ?></span>
                    
                    <div class="component-cooldown-badge" data-ref="cooldown-badge" style="display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; margin-left: 8px; font-variant-numeric: tabular-nums; min-width: max-content;">
                        <span data-ref="cooldown-counter">--/--</span>
                        <span class="material-symbols-rounded" style="font-size: 14px; opacity: 0.7;">timer</span>
                        <span data-ref="cooldown-timer">0s</span>
                    </div>
                </button>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <?php if (!$isSnapshot): ?>
        <?php require_once __DIR__ . '/../../modules/moduleDesignTools.php'; ?>
    <?php endif; ?>

</div>