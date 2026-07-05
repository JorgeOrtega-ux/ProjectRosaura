<?php
// includes/views/app/design.php

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\Helpers\Utils;
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

if (!empty($canvasUuid)) {
    try {
        $dbManager = new DatabaseManager();
        $db = $dbManager->getConnection(DB::CONN_CANVASES);

        // Traemos información de reinicios y redimensiones
        $sql = "SELECT c.id, c.name, c.size, c.palette_id, c.privacy, c.requires_approval, 
                       c.cooldown_pixels_batch, c.cooldown_seconds, c.owner_id,
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

            // Comprobar rol real del usuario para la UI inicial (evita el parpadeo "Lienzo Privado")
            $isMember = false;
            $userRole = 'spectator';
            $userId = null;
            global $sessionManager; // o tomarlo del scope actual
            $session = $sessionManager ?? null;
            if ($session && method_exists($session, 'isLoggedIn') && $session->isLoggedIn()) {
                $userId = $session->getActiveAccountId();
                $memberSql = "SELECT role FROM canvas_members WHERE canvas_id = :cid AND user_id = :uid LIMIT 1";
                $mStmt = $db->prepare($memberSql);
                $mStmt->execute([':cid' => $canvasIntId, ':uid' => $userId]);
                if ($mRow = $mStmt->fetch(PDO::FETCH_ASSOC)) {
                    $isMember = true;
                    $userRole = $mRow['role'];
                } else {
                    $ownerSql = "SELECT owner_id FROM canvases WHERE id = :cid LIMIT 1";
                    $oStmt = $db->prepare($ownerSql);
                    $oStmt->execute([':cid' => $canvasIntId]);
                    if ($oRow = $oStmt->fetch(PDO::FETCH_ASSOC)) {
                        if ($oRow['owner_id'] == $userId) {
                            $isMember = true;
                            $userRole = 'admin';
                        }
                    }
                }
            }
            $isBlockedInit = ($canvasPrivacy === 'private' && !$isMember);
            $isSpectatorInit = ($userRole === 'spectator');
            // CHECK PREMIUM EXPIRED STATE
            $isPremiumBlockedInit = false;
            try {
                if (isset($canvas['owner_id']) && $canvas['owner_id']) {
                    $uStmt = $db->prepare("SELECT subscription_tier FROM users WHERE id = :uid LIMIT 1");
                    $uStmt->execute([':uid' => $canvas['owner_id']]);
                    $ownerTier = $uStmt->fetchColumn();
                    if ($ownerTier === false) $ownerTier = 0;
                    
                    $planLimits = \App\Core\System\SubscriptionPlanConstants::getTierLimits((int)$ownerTier);
                    $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
                    
                    // Check max canvases
                    if ($planLimits['max_canvases'] !== -1) {
                        $olderStmt = $db->prepare("SELECT COUNT(*) FROM canvases WHERE owner_id = :uid AND id < :cid");
                        $olderStmt->execute([':uid' => $canvas['owner_id'], ':cid' => $canvasIntId]);
                        $olderCount = (int)$olderStmt->fetchColumn();
                        
                        if ($olderCount >= $planLimits['max_canvases']) {
                            $isPremiumBlockedInit = true;
                        }
                    }
                    
                    // Check palette
                    if (!$isPremiumBlockedInit && $canvasPalette !== 'default' && empty($planLimits['custom_palettes'])) {
                        $isPremiumBlockedInit = true;
                    }
                    
                    // Check size
                    if (!$isPremiumBlockedInit) {
                        $requiredTier = $allSizes[$canvasSize]['tier'] ?? 0;
                        if ($ownerTier < $requiredTier) {
                            $isPremiumBlockedInit = true;
                        }
                    }
                    
                    if ($isPremiumBlockedInit) {
                        $isBlockedInit = true; // Forzar bloqueo de interacciones
                    }
                }
            } catch (\Throwable $e) {}
        }
    } catch (\Exception $e) {
        error_log("Error al cargar el lienzo en la vista de diseño: " . $e->getMessage());
    }
}
?>
<div class="view-content">
    
    <?php 
    // Utilizamos el render seguro de Utils para no tener un div con ID hardcodeado que de error de doble init.
    echo Utils::renderTurnstile('canvas_design'); 
    ?>

    <div class="component-wrapper component-wrapper--full no-padding" 
         data-ref="design-wrapper" 
         data-canvas-id="<?php echo htmlspecialchars($canvasIntId); ?>"
         data-size="<?php echo htmlspecialchars($canvasSize); ?>" 
         data-palette="<?php echo htmlspecialchars($canvasPalette); ?>"
         data-privacy="<?php echo htmlspecialchars($canvasPrivacy); ?>"
         data-is-blocked="<?php echo isset($isBlockedInit) && $isBlockedInit ? '1' : '0'; ?>"
         data-premium-blocked="<?php echo isset($isPremiumBlockedInit) && $isPremiumBlockedInit ? '1' : '0'; ?>"
         data-is-spectator="<?php echo isset($isSpectatorInit) && $isSpectatorInit ? '1' : '0'; ?>"
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
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('lbl_design_title'); ?></h1>
                
                <?php if (!empty($canvasName)): ?>
                    <h1 class="component-top-title">
                        <?php echo htmlspecialchars($canvasName); ?>
                    </h1>
                <?php endif; ?>

                <?php if ($isSnapshot): ?>
                    <span class="component-badge component-badge--warning">
                        <span class="material-symbols-rounded">history</span> Modo Histórico
                    </span>
                <?php endif; ?>
            </div>
            
            <div class="component-top-right">
                
                <?php if (!$isSnapshot): ?>
                <?php 
                if (!isset($isBlockedInit)) {
                    $isBlockedInit = ($canvasPrivacy === 'private');
                    $isSpectatorInit = true;
                }
                $showSpectatorControls = ($isBlockedInit || $isSpectatorInit);
                $showDesignTools = !$showSpectatorControls;
                ?>
                <div class="component-actions <?php echo $showSpectatorControls ? 'active' : 'disabled'; ?>" data-ref="spectator-controls">
                    
                    <div class="component-badge component-badge--warning <?php echo $isBlockedInit && !isset($isPremiumBlockedInit) ? 'disabled' : ''; ?>" data-ref="spectator-status-badge" data-tooltip="<?php echo __('tooltip_spectator') ?? 'Solo puedes observar'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded">visibility</span>
                        <span><?php echo __('lbl_spectator') ?? 'Modo Espectador'; ?></span>
                    </div>

                    <?php if (isset($isPremiumBlockedInit) && $isPremiumBlockedInit): ?>
                    <div class="component-badge component-badge--danger" data-position="bottom">
                        <span class="material-symbols-rounded">warning</span>
                        <span>Requiere atención Premium</span>
                    </div>
                    <?php else: ?>
                    <div class="component-badge component-badge--danger <?php echo (!$isBlockedInit || (isset($isPremiumBlockedInit) && $isPremiumBlockedInit)) ? 'disabled' : ''; ?>" data-ref="private-status-badge" data-tooltip="No eres miembro" data-position="bottom">
                        <span class="material-symbols-rounded">lock</span>
                        <span>Lienzo Privado</span>
                    </div>
                    
                    <button class="component-button component-button--h34 <?php echo ($canvasPrivacy === 'private' && $canvasApproval) || (isset($isPremiumBlockedInit) && $isPremiumBlockedInit) ? 'disabled' : ''; ?>" data-action="joinCanvasDirectly" data-ref="btn-join-direct">
                        <?php echo __('btn_join') ?? 'Unirse'; ?>
                    </button>
                    
                    <button class="component-button component-button--h34 component-button--dark <?php echo ($canvasPrivacy === 'private' && !$canvasApproval) || (isset($isPremiumBlockedInit) && $isPremiumBlockedInit) ? 'disabled' : ''; ?>" data-action="requestCanvasAccess" data-ref="btn-request-access">
                        <span class="material-symbols-rounded">front_hand</span>
                        <?php echo __('btn_request_access') ?? 'Solicitar Acceso'; ?>
                    </button>
                    <?php endif; ?>
                </div>

                <div class="component-actions <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="design-tools-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="openJoinLiveModal" data-tooltip="Unirse a sesión en vivo" data-position="bottom">
                        <span class="material-symbols-rounded">sensors</span>
                    </button>
                    
                    <div class="component-divider-vertical" data-ref="main-actions-divider"></div>

                    <button class="component-button component-button--icon component-button--h40 disabled" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-live" data-ref="btn-start-live" data-tooltip="Transmitir Plantilla en Vivo" data-position="bottom">
                        <span class="material-symbols-rounded">stream</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 disabled" data-action="toggleTemplateLock" data-ref="btn-template-lock" data-tooltip="Bloquear / Desbloquear Plantilla" data-position="bottom">
                        <span class="material-symbols-rounded">lock_open</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger disabled" data-action="deleteTemplate" data-ref="btn-template-delete" data-tooltip="Quitar Plantilla" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <div class="component-divider-vertical disabled" data-ref="template-actions-divider"></div>
                    
                    <button class="component-button component-button--icon component-button--h40 component-color-indicator" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="Paleta de colores" data-position="bottom" style="--active-color: #000000;">
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
            <canvas data-ref="design-canvas" class="component-canvas-surface <?php echo (isset($isBlockedInit) && $isBlockedInit) ? 'component-canvas-blocked disabled-interactive' : ''; ?>"></canvas>
            
            <div class="canvas-badges-left" data-ref="badges-left">
                <div class="component-badge" data-badge-id="coords">
                    <span class="material-symbols-rounded">my_location</span>
                    <span>- , -</span>
                </div>

                <?php if (isset($isPremiumBlockedInit) && $isPremiumBlockedInit): ?>
                <div class="component-badge" data-badge-id="lock-premium">
                    <span class="material-symbols-rounded" style="color:var(--color-warning);">warning</span>
                    <span>Requiere atención (Premium Expirado)</span>
                </div>
                <?php elseif (isset($isBlockedInit) && $isBlockedInit): ?>
                <div class="component-badge" data-badge-id="lock-private">
                    <span class="material-symbols-rounded">lock</span>
                    <span><?php echo __('badge_member_required') ?? 'Requiere ser miembro'; ?></span>
                </div>
                <?php endif; ?>

                <?php if (!$isSnapshot): ?>
                <div class="component-badge" data-ref="cooldown-badge">
                    <span class="material-symbols-rounded">bolt</span>
                    <span data-ref="cooldown-counter">--/--</span>
                    
                    <span>|</span>
                    
                    <span class="material-symbols-rounded">timer</span>
                    <span data-ref="cooldown-timer">0s</span>
                </div>
                <?php endif; ?>
            </div>
            
            <div class="canvas-badges-right" data-ref="badges-right"></div>
            
            <?php if (!$isSnapshot): ?>
            <div class="component-action-pill <?php echo (isset($isBlockedInit) && $isBlockedInit) ? 'disabled' : ''; ?>">
                <button class="component-button component-button--dark component-button--h45 disabled-interactive" data-action="placePixels" data-ref="pixel-action-btn">
                    <span class="material-symbols-rounded">touch_app</span>
                    <span data-ref="pixel-action-text"><?php echo __('btn_select_pixels'); ?></span>
                </button>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <?php if (!$isSnapshot): ?>
        <?php require_once __DIR__ . '/../../modules/moduleDesignTools.php'; ?>
    <?php endif; ?>

</div>