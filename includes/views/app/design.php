<?php
use App\Api\Services\App\AppViewService;
use App\Core\Helpers\Utils;

$viewService = new AppViewService();
$designData = $viewService->getCanvasDesignData($_GET['id'] ?? '', isset($_GET['snapshot']));

if ($designData['isBanned']) {
    echo "<div class='view-content'><p style='padding: 40px; text-align: center; color: var(--text-danger); font-weight: 500;'>".__('err_user_banned_from_canvas')."</p></div>";
    return;
}

extract($designData);
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
         data-subscription-locked="<?php echo isset($isSubscriptionLockedInit) && $isSubscriptionLockedInit ? '1' : '0'; ?>"
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
                $showSpectatorControls = ($isBlockedInit || $isSpectatorInit || $isSubscriptionLockedInit);
                $showDesignTools = !$showSpectatorControls;
                ?>
                <div class="component-actions <?php echo $showSpectatorControls ? 'active' : 'disabled'; ?>" data-ref="spectator-controls">
                    
                    <div class="component-badge component-badge--danger <?php echo (isset($isSubscriptionLockedInit) && $isSubscriptionLockedInit) ? '' : 'disabled'; ?>" data-ref="premium-status-badge" data-position="bottom">
                        <span class="material-symbols-rounded">warning</span>
                        <span><?php echo __('lbl_requires_subscription'); ?></span>
                    </div>
                    
                    <div class="component-badge component-badge--danger <?php echo (!$isBlockedInit || (isset($isSubscriptionLockedInit) && $isSubscriptionLockedInit)) ? 'disabled' : ''; ?>" data-ref="private-status-badge" data-tooltip="<?php echo __('tooltip_not_member'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">lock</span>
                        <span><?php echo __('lbl_private_canvas'); ?></span>
                    </div>
                    
                    <?php if (isset($_SESSION['active_account']) && $_SESSION['active_account']): ?>
                    <button class="component-button component-button--h34 <?php echo ($canvasApproval || $isSubscriptionLockedInit) ? 'disabled' : ''; ?>" data-action="joinCanvasDirectly" data-ref="btn-join-direct">
                        <span class="material-symbols-rounded">group_add</span>
                        <?php echo __('btn_join'); ?>
                    </button>
                    
                    <button class="component-button component-button--h34 component-button--dark <?php echo (!$canvasApproval || $isSubscriptionLockedInit) ? 'disabled' : ''; ?>" data-action="requestCanvasAccess" data-ref="btn-request-access">
                        <span class="material-symbols-rounded">front_hand</span>
                        <?php echo __('btn_request_access'); ?>
                    </button>
                    <?php else: ?>
                    <div class="component-badge component-badge--warning" style="cursor: pointer;" data-nav="<?php echo APP_URL; ?>/login">
                        <span class="material-symbols-rounded">login</span>
                        <span><?php echo __('lbl_login_to_join'); ?></span>
                    </div>
                    <?php endif; ?>
                </div>

                <div class="component-actions <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="design-tools-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="openJoinLiveModal" data-tooltip="<?php echo __('tooltip_join_live'); ?> [J]" data-position="bottom">
                        <span class="material-symbols-rounded">sensors</span>
                    </button>
                    
                    <div class="component-divider-vertical" data-ref="main-actions-divider"></div>

                    <button class="component-button component-button--icon component-button--h40 <?php echo (!isset($canLiveShare) || !$canLiveShare) ? 'component-button--premium premium-locked' : ''; ?>" data-action="toggleLiveBroadcast" data-ref="btn-start-live" data-tooltip="<?php echo __('tooltip_stream_live'); ?> [S]" data-position="bottom">
                        <span class="material-symbols-rounded">stream</span>
                    </button>
                    
                    <button class="component-button component-button--icon component-button--h40 component-color-indicator" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="<?php echo __('tooltip_color_palette'); ?> [C]" data-position="bottom">
                        <span class="material-symbols-rounded">palette</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-templates" data-tooltip="<?php echo __('tooltip_templates'); ?> [T]" data-position="bottom">
                        <span class="material-symbols-rounded">photo_library</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 component-button--warning disabled" data-action="unlockTemplateTop" data-ref="btn-top-unlock-template" data-tooltip="Desfijar Plantilla [U]" data-position="bottom" style="display: none;">
                        <span class="material-symbols-rounded">lock_open</span>
                    </button>
                    
                    <?php if ($canvasAllowPurchases == '1'): ?>
                    <div class="component-divider-vertical" data-ref="advantages-actions-divider"></div>
                    <button class="component-button component-button--icon component-button--h40" data-action="togglePerksInventory" data-tooltip="<?php echo __('tooltip_active_advantages'); ?> [P]" data-position="bottom">
                        <span class="material-symbols-rounded">stars</span>
                    </button>
                    <?php endif; ?>

                    <?php if (isset($isOwner) && $isOwner): ?>
                    <div class="component-divider-vertical" data-ref="owner-tools-actions-divider"></div>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleOwnerTools" data-ref="btn-owner-tools" data-tooltip="<?php echo __('tooltip_owner_tools', 'Herramientas de Dueño'); ?> [O]" data-position="bottom">
                        <span class="material-symbols-rounded">construction</span>
                    </button>
                    <?php endif; ?>
                    
                    <?php if ($canvasAllowChat == '1'): ?>
                    <div class="component-divider-vertical" data-ref="chat-actions-divider"></div>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleMenuInModule" data-module-target="moduleLiveChat" data-menu-target="menu-chat" data-tooltip="<?php echo __('tooltip_live_chat'); ?> [H]" data-position="bottom">
                        <span class="material-symbols-rounded">chat</span>
                    </button>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <div class="component-bottom">
            <canvas data-ref="design-canvas" class="component-canvas-surface <?php echo (isset($isBlockedInit) && $isBlockedInit) ? 'component-canvas-blocked disabled-interaction' : ''; ?>"></canvas>

            <div class="component-badge component-badge--dark component-badge--toolbar" data-ref="template-floating-toolbar" style="display: none;">
                <button class="component-button component-button--icon component-button--h24" data-action="toggleTemplateLock" data-ref="btn-template-lock" data-tooltip="<?php echo __('tooltip_toggle_lock'); ?> [U]" data-position="top">
                    <span class="material-symbols-rounded">lock_open</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="rotateTemplate" data-ref="btn-template-rotate" data-tooltip="<?php echo __('tooltip_rotate_template'); ?> [R]" data-position="top">
                    <span class="material-symbols-rounded">rotate_right</span>
                </button>
                <button class="component-button component-button--icon component-button--h24 <?php echo (!isset($canInjectTemplate) || !$canInjectTemplate) ? 'component-button--premium premium-locked' : ''; ?>" data-action="injectTemplate" data-ref="btn-template-inject" data-tooltip="<?php echo __('tooltip_inject_template'); ?> [B]" data-position="top">
                    <span class="material-symbols-rounded">brush</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="deleteTemplate" data-ref="btn-template-delete" data-tooltip="<?php echo __('tooltip_remove_template'); ?> [Supr]" data-position="top">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>

            <div class="canvas-badges-left" data-ref="badges-left">
                
                <div class="component-badge" data-badge-id="coords">
                    <span class="material-symbols-rounded">my_location</span>
                    <span>- , -</span>
                </div>

                <div class="component-badge component-badge--warning <?php echo !$isSpectatorInit ? 'disabled' : ''; ?>" data-ref="spectator-status-badge" data-tooltip="<?php echo __('tooltip_spectator'); ?>" data-position="top">
                    <span class="material-symbols-rounded">visibility</span>
                    <span><?php echo __('lbl_spectator'); ?></span>
                </div>

                <?php if (isset($isSubscriptionLockedInit) && $isSubscriptionLockedInit): ?>
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
                <div class="component-badge <?php echo ($isBlockedInit || $isSpectatorInit || $isSubscriptionLockedInit) ? 'disabled' : ''; ?>" data-ref="cooldown-badge">
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
            <div class="component-action-pill <?php echo ($isBlockedInit || $isSpectatorInit || $isSubscriptionLockedInit) ? 'disabled' : ''; ?>">
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