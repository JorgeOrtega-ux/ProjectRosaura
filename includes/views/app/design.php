<?php

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\Helpers\Utils;
use PDO;

$canvasIntId = 0; 
$canvasName = '';
$canvasSize = '64'; 
$canvasPalette = 'default'; 
$canvasPrivacy = 'private'; 
$canvasApproval = '0'; 
$canvasAllowChat = '0';
$canvasAllowPurchases = '1';
$canvasCooldownBatch = '5';
$canvasCooldownSeconds = '10';
$resetActive = '0';
$nextResetAt = '';
$timerAction = 'restart';
$resizeActive = '0';
$nextResizeAt = '';
$resizeTargetSize = '64';
$resizeTimerAction = 'restart';

$canvasUuid = $_GET['id'] ?? '';
$isSnapshot = isset($_GET['snapshot']);

if (!empty($canvasUuid)) {
    try {
        $dbManager = new DatabaseManager();
        $db = $dbManager->getConnection(DB::CONN_CANVASES);
        $sql = "SELECT c.id, c.name, c.size, c.palette_id, c.privacy, c.requires_approval, c.is_locked, 
                       c.cooldown_pixels_batch, c.cooldown_seconds, c.owner_id, c.created_at, c.max_participants, c.allow_chat, c.allow_purchases,
                       r.is_active as reset_active, r.next_reset_at,
                       rs.is_active as resize_active, rs.next_resize_at, rs.target_size
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
            $canvasSize = strtolower($canvas['size'] ?? '64');
            $canvasPalette = $canvas['palette_id'] ?? 'default';
            $canvasPrivacy = $canvas['privacy'] ?? 'private';
            $canvasApproval = $canvas['requires_approval'] ?? '0';
            $canvasAllowChat = $canvas['allow_chat'] ?? '0';
            $canvasAllowPurchases = $canvas['allow_purchases'] ?? '1';
            
            $canvasCooldownBatch = $canvas['cooldown_pixels_batch'] ?? '5';
            $canvasCooldownSeconds = $canvas['cooldown_seconds'] ?? '10';

            $resetActive = $canvas['reset_active'] ?? '0';
            $nextResetAt = $canvas['next_reset_at'] ?? '';

            $resizeActive = $canvas['resize_active'] ?? '0';
            $nextResizeAt = $canvas['next_resize_at'] ?? '';
            $resizeTargetSize = $canvas['target_size'] ?? '64';
            $isMember = false;
            $userRole = 'spectator';
            $userId = null;
            $isOwner = false;
            global $sessionManager;
            $session = $sessionManager ?? null;
            if ($session && method_exists($session, 'isLoggedIn') && $session->isLoggedIn()) {
                $userId = $session->getActiveAccountId();
                if (isset($canvas['owner_id']) && (int)$canvas['owner_id'] === (int)$userId) {
                    $isOwner = true;
                    $isMember = true;
                    $userRole = 'admin';
                }
                $memberSql = "SELECT r.name as role FROM canvas_user_roles cur JOIN canvas_roles r ON cur.role_id = r.id WHERE cur.canvas_id = :cid AND cur.user_id = :uid LIMIT 1";
                $mStmt = $db->prepare($memberSql);
                $mStmt->execute([':cid' => $canvasIntId, ':uid' => $userId]);
                if ($mRow = $mStmt->fetch(PDO::FETCH_ASSOC)) {
                    $isMember = true;
                    if (!$isOwner) {
                        $userRole = 'editor';
                    }
                }
            }
            $isBlockedInit = ($canvasPrivacy === 'private' && !$isMember);
            $isSpectatorInit = ($userRole === 'spectator');
            $isPremiumBlockedInit = isset($canvas['is_locked']) ? (bool)$canvas['is_locked'] : false;

            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
            $canvasInitialZoom = $allSizes[$canvasSize]['initial_zoom'] ?? 0.5;
            
            $isChatRestricted = false;
            $chatRestrictionType = null;
            $chatRestrictionEnd = null;
            if ($userId) {
                $restSql = "SELECT suspension_type, end_date FROM canvas_chat_restrictions WHERE canvas_id = :cid AND user_id = :uid LIMIT 1";
                $restStmt = $db->prepare($restSql);
                $restStmt->execute([':cid' => $canvasIntId, ':uid' => $userId]);
                if ($restRow = $restStmt->fetch(PDO::FETCH_ASSOC)) {
                    $isChatRestricted = true;
                    $chatRestrictionType = $restRow['suspension_type'];
                    $chatRestrictionEnd = $restRow['end_date'];
                }
            }
        }

        $canInjectTemplate = false;
        if ($session && method_exists($session, 'getPermissions')) {
            $perms = $session->getPermissions();
            if (empty($perms) && isset($_SESSION['user_permissions'])) {
                $perms = $_SESSION['user_permissions'];
            } elseif (empty($perms) && isset($_SESSION['permissions'])) {
                $perms = $_SESSION['permissions'];
            }
            if (is_array($perms)) {
                $canInjectTemplate = in_array(\App\Core\System\PermissionsConstants::INJECT_TEMPLATE, $perms) || in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $perms);
            }
        }
    } catch (Exception $e) {
        \App\Core\System\Logger::error('err_design_view_load', ['exception' => $e->getMessage()]);
    }
}
?>
<div class="view-content">
    
    <?php 
    echo Utils::renderTurnstile('canvas_design'); 
    ?>

    <div class="component-wrapper component-wrapper--full no-padding" 
         data-ref="design-wrapper" 
         data-canvas-id="<?php echo htmlspecialchars($canvasIntId); ?>"
         data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>"
         data-size="<?php echo htmlspecialchars($canvasSize); ?>" 
         data-initial-zoom="<?php echo htmlspecialchars($canvasInitialZoom ?? '0.5'); ?>"
         data-palette="<?php echo htmlspecialchars($canvasPalette); ?>"
         data-privacy="<?php echo htmlspecialchars($canvasPrivacy); ?>"
         data-is-owner="<?php echo (isset($isOwner) && $isOwner) ? '1' : '0'; ?>"
         data-is-blocked="<?php echo isset($isBlockedInit) && $isBlockedInit ? '1' : '0'; ?>"
         data-premium-blocked="<?php echo isset($isPremiumBlockedInit) && $isPremiumBlockedInit ? '1' : '0'; ?>"
         data-is-spectator="<?php echo isset($isSpectatorInit) && $isSpectatorInit ? '1' : '0'; ?>"
         data-approval="<?php echo htmlspecialchars($canvasApproval); ?>"
         data-allow-chat="<?php echo htmlspecialchars($canvasAllowChat); ?>"
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
                        <span class="material-symbols-rounded">history</span> <?php echo __('lbl_historical_mode'); ?>
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
                $showSpectatorControls = ($isBlockedInit || $isSpectatorInit || $isPremiumBlockedInit);
                $showDesignTools = !$showSpectatorControls;
                ?>
                <div class="component-actions <?php echo $showSpectatorControls ? 'active' : 'disabled'; ?>" data-ref="spectator-controls">
                    
                    <div class="component-badge component-badge--warning <?php echo $isBlockedInit && !isset($isPremiumBlockedInit) ? 'disabled' : ''; ?>" data-ref="spectator-status-badge" data-tooltip="<?php echo __('tooltip_spectator'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">visibility</span>
                        <span><?php echo __('lbl_spectator'); ?></span>
                    </div>

                    <div class="component-badge component-badge--danger <?php echo (isset($isPremiumBlockedInit) && $isPremiumBlockedInit) ? '' : 'disabled'; ?>" data-ref="premium-status-badge" data-position="bottom">
                        <span class="material-symbols-rounded">warning</span>
                        <span><?php echo __('lbl_requires_subscription'); ?></span>
                    </div>
                    
                    <div class="component-badge component-badge--danger <?php echo (!$isBlockedInit || (isset($isPremiumBlockedInit) && $isPremiumBlockedInit)) ? 'disabled' : ''; ?>" data-ref="private-status-badge" data-tooltip="<?php echo __('tooltip_not_member'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">lock</span>
                        <span><?php echo __('lbl_private_canvas'); ?></span>
                    </div>
                    
                    <button class="component-button component-button--h34 <?php echo ($canvasApproval || $isPremiumBlockedInit) ? 'disabled' : ''; ?>" data-action="joinCanvasDirectly" data-ref="btn-join-direct">
                        <?php echo __('btn_join'); ?>
                    </button>
                    
                    <button class="component-button component-button--h34 component-button--dark <?php echo (!$canvasApproval || $isPremiumBlockedInit) ? 'disabled' : ''; ?>" data-action="requestCanvasAccess" data-ref="btn-request-access">
                        <span class="material-symbols-rounded">front_hand</span>
                        <?php echo __('btn_request_access'); ?>
                    </button>
                </div>

                <div class="component-actions <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="design-tools-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="openJoinLiveModal" data-tooltip="<?php echo __('tooltip_join_live'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">sensors</span>
                    </button>
                    
                    <div class="component-divider-vertical" data-ref="main-actions-divider"></div>

                    <button class="component-button component-button--icon component-button--h40 disabled" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-live" data-ref="btn-start-live" data-tooltip="<?php echo __('tooltip_stream_live'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">stream</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 disabled" data-action="toggleTemplateLock" data-ref="btn-template-lock" data-tooltip="<?php echo __('tooltip_toggle_lock'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">lock_open</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 disabled" data-action="rotateTemplate" data-ref="btn-template-rotate" data-tooltip="<?php echo __('tooltip_rotate_template'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">rotate_right</span>
                    </button>
                    <?php if (isset($canInjectTemplate) && $canInjectTemplate): ?>
                    <button class="component-button component-button--icon component-button--h40 component-button--warning disabled" data-action="injectTemplate" data-ref="btn-template-inject" data-tooltip="<?php echo __('tooltip_inject_template'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">brush</span>
                    </button>
                    <?php endif; ?>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger disabled" data-action="deleteTemplate" data-ref="btn-template-delete" data-tooltip="<?php echo __('tooltip_remove_template'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <div class="component-divider-vertical disabled" data-ref="template-actions-divider"></div>
                    
                    <button class="component-button component-button--icon component-button--h40 component-color-indicator" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="<?php echo __('tooltip_color_palette'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">palette</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-templates" data-tooltip="<?php echo __('tooltip_templates'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">photo_library</span>
                    </button>
                    
                    <?php if ($canvasAllowPurchases == '1'): ?>
                    <div class="component-divider-vertical" data-ref="advantages-actions-divider"></div>
                    <button class="component-button component-button--icon component-button--h40" data-action="togglePerksInventory" data-tooltip="<?php echo __('tooltip_active_advantages'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">stars</span>
                    </button>
                    <?php endif; ?>

                    <?php if (isset($isOwner) && $isOwner): ?>
                    <div class="component-divider-vertical" data-ref="owner-eraser-actions-divider"></div>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="toggleOwnerEraser" data-ref="btn-owner-eraser" data-tooltip="Borrador de Zona (Solo Dueño)" data-position="bottom">
                        <span class="material-symbols-rounded">cleaning_services</span>
                    </button>
                    <?php endif; ?>
                    
                    <?php if ($canvasAllowChat == '1'): ?>
                    <div class="component-divider-vertical" data-ref="chat-actions-divider"></div>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleMenuInModule" data-module-target="moduleLiveChat" data-menu-target="menu-chat" data-tooltip="<?php echo __('tooltip_live_chat'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">chat</span>
                    </button>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <div class="component-bottom">
            <canvas data-ref="design-canvas" class="component-canvas-surface <?php echo (isset($isBlockedInit) && $isBlockedInit) ? 'component-canvas-blocked disabled-interaction' : ''; ?>"></canvas>

            <div class="canvas-badges-left" data-ref="badges-left">
                
                <div class="component-badge" data-badge-id="coords">
                    <span class="material-symbols-rounded">my_location</span>
                    <span>- , -</span>
                </div>

                <?php if (isset($isPremiumBlockedInit) && $isPremiumBlockedInit): ?>
                <div class="component-badge" data-badge-id="lock-premium">
                    <span class="material-symbols-rounded">warning</span>
                    <span><?php echo __('badge_subscription_expired'); ?></span>
                </div>
                <?php elseif (isset($isBlockedInit) && $isBlockedInit): ?>
                <div class="component-badge" data-badge-id="lock-private">
                    <span class="material-symbols-rounded">lock</span>
                    <span><?php echo __('badge_member_required'); ?></span>
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
            <div class="component-action-pill <?php echo ($isBlockedInit || $isSpectatorInit || $isPremiumBlockedInit) ? 'disabled' : ''; ?>">
                <button class="component-button component-button--dark component-button--h45 disabled-interaction" data-action="placePixels" data-ref="pixel-action-btn">
                    <span class="material-symbols-rounded">touch_app</span>
                    <span data-ref="pixel-action-text"><?php echo __('btn_select_pixels'); ?></span>
                </button>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <?php if (!$isSnapshot): ?>
        <?php require_once __DIR__ . '/../../modules/moduleDesignTools.php'; ?>
        <?php if ($canvasAllowChat == '1'): ?>
            <?php require_once __DIR__ . '/../../modules/moduleLiveChat.php'; ?>
        <?php endif; ?>
    <?php endif; ?>

</div>