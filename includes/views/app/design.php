<?php
use App\Api\Services\App\AppViewService;
use App\Core\Helpers\Utils;

$viewService = new AppViewService();
$designData = $viewService->getCanvasDesignData($_GET['id'] ?? '', isset($_GET['snapshot']));

if (!empty($designData['isNotFound']) || empty($designData['canvasIntId'])) {
    global $systemMessageType;
    $systemMessageType = '404';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

if (!empty($designData['isBanned'])) {
    global $systemMessageType;
    $systemMessageType = 'canvas_banned';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($designData);
?>
<script>window.__CANVAS_VIEW_START__ = performance.now();</script>
<div class="view-content">
    
    <?php 
    echo Utils::renderTurnstile('canvas_design'); 
    ?>

    <div class="component-wrapper component-wrapper--full no-padding" 
         data-ref="design-wrapper" 
         data-canvas-id="<?php echo htmlspecialchars($canvasIntId); ?>"
         data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>"
         data-canvas-name="<?php echo htmlspecialchars($canvasName); ?>"
         data-size="<?php echo htmlspecialchars($canvasSize); ?>" 
         data-mode="<?php echo htmlspecialchars($canvasMode ?? 'offline'); ?>"
         data-online-active="<?php echo !empty($isOnlineActive) ? '1' : '0'; ?>"
         data-initial-zoom="<?php echo htmlspecialchars($canvasInitialZoom ?? '0.5'); ?>"
         data-palette="<?php echo htmlspecialchars($canvasPalette); ?>"
         data-privacy="<?php echo htmlspecialchars($canvasPrivacy); ?>"
         data-is-owner="<?php echo (isset($isOwner) && $isOwner) ? '1' : '0'; ?>"
         data-is-blocked="<?php echo isset($isBlockedInit) && $isBlockedInit ? '1' : '0'; ?>"
         data-subscription-locked="<?php echo isset($isSubscriptionLockedInit) && $isSubscriptionLockedInit ? '1' : '0'; ?>"
         data-is-spectator="<?php echo isset($isSpectatorInit) && $isSpectatorInit ? '1' : '0'; ?>"
         data-approval="<?php echo htmlspecialchars($canvasApproval); ?>"
         data-allow-chat="<?php echo htmlspecialchars($canvasAllowChat); ?>"
         data-has-live-chat="<?php echo $hasLiveChat ? '1' : '0'; ?>"
         data-lowest-chat-tier="<?php echo htmlspecialchars($lowestChatTier); ?>"
         data-owner-username="<?php echo htmlspecialchars($ownerUsername); ?>"
         data-members-count="<?php echo htmlspecialchars($membersCount); ?>"
         data-created-at="<?php echo htmlspecialchars($canvasCreatedAt); ?>"
         data-allow-custom-colors="<?php echo htmlspecialchars($canvasAllowCustomColors); ?>"
         data-cooldown-batch="<?php echo htmlspecialchars($canvasCooldownBatch); ?>"
         data-cooldown-seconds="<?php echo htmlspecialchars($canvasCooldownSeconds); ?>"
         data-reset-active="<?php echo htmlspecialchars($resetActive); ?>"
         data-reset-at="<?php echo htmlspecialchars($nextResetAt); ?>"
         data-timer-action="<?php echo htmlspecialchars($timerAction); ?>"
         data-resize-active="<?php echo htmlspecialchars($resizeActive); ?>"
         data-resize-at="<?php echo htmlspecialchars($nextResizeAt); ?>"
         data-resize-target="<?php echo htmlspecialchars($resizeTargetSize); ?>"
         data-resize-timer-action="<?php echo htmlspecialchars($resizeTimerAction); ?>"
         data-active-live-share-code="<?php echo htmlspecialchars($activeLiveShareCode ?? ''); ?>"
         data-active-live-share-data="<?php echo htmlspecialchars(json_encode($activeLiveShareData ?? null)); ?>">
         
        <div class="component-top">
            <div class="component-top-left">
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
                    
                    <?php if (isset($_SESSION['active_account']) && $_SESSION['active_account']): ?>
                    <button class="component-button component-button--h34 <?php echo ($canvasApproval || $isSubscriptionLockedInit) ? 'disabled' : ''; ?>" data-action="joinCanvasDirectly" data-ref="btn-join-direct">
                        <span class="material-symbols-rounded">group_add</span>
                        <?php echo __('btn_join'); ?>
                    </button>
                    
                    <button class="component-button component-button--h34 <?php echo (!$canvasApproval || $isSubscriptionLockedInit) ? 'disabled' : ''; ?>" data-action="requestCanvasAccess" data-ref="btn-request-access">
                        <span class="material-symbols-rounded">front_hand</span>
                        <?php echo __('btn_request_access'); ?>
                    </button>
                    <?php else: ?>
                    <div class="component-badge component-badge--warning" data-nav="<?php echo APP_URL; ?>/login">
                        <span class="material-symbols-rounded">login</span>
                        <span><?php echo __('lbl_login_to_join'); ?></span>
                    </div>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <div class="component-bottom">
            <canvas data-ref="design-canvas" class="component-canvas-surface <?php echo (isset($isBlockedInit) && $isBlockedInit) ? 'component-canvas-blocked disabled-interaction' : ''; ?>"></canvas>

            <?php if (!$isSnapshot): ?>
            <?php
                $liveTierMin = \App\Core\System\SubscriptionPlanConstants::getLowestTierForFeature('live_share');
                $liveTierLevel = $liveTierMin ? (int)$liveTierMin['tier_level'] : 1;
                $isOnlineModeActive = !empty($isOnlineActive);
            ?>
            <div class="canvas-design-toolbar <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="design-tools-actions">
                <?php if ($isOnlineModeActive): ?>
                <button class="component-button component-button--icon component-button--h32" data-action="openJoinLiveModal" data-tooltip="<?php echo __('tooltip_join_live'); ?> [J]" data-position="bottom">
                    <span class="material-symbols-rounded">sensors</span>
                </button>

                <?php
                    $liveLock = \App\Core\System\SubscriptionFeatureConfig::getLockDetails($userTier ?? 0, 'feat_live_share', 'button');
                ?>
                <button class="component-button component-button--icon component-button--h32 <?php echo $liveLock['class']; ?>" data-action="toggleLiveBroadcast" data-ref="btn-start-live" data-tooltip="<?php echo __('tooltip_stream_live'); ?> [S]" data-position="bottom" <?php echo $liveLock['attributes']; ?>>
                    <span class="material-symbols-rounded">stream</span>
                </button>
                <?php endif; ?>

                <button class="component-button component-button--icon component-button--h32 component-color-indicator" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="<?php echo __('tooltip_color_palette'); ?> [C]" data-position="bottom">
                    <span class="material-symbols-rounded">palette</span>
                </button>

                <button class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-templates" data-tooltip="<?php echo __('tooltip_templates'); ?> [T]" data-position="bottom">
                    <span class="material-symbols-rounded">photo_library</span>
                </button>

                <?php if (isset($isOwner) && $isOwner): ?>
                <?php if (!$isOnlineModeActive): ?>
                <button class="component-button component-button--icon component-button--h32" data-action="manualSaveOffline" data-ref="btn-save-offline" data-tooltip="<?php echo __('tooltip_save_offline'); ?> [Ctrl+S]" data-position="bottom">
                    <span class="material-symbols-rounded">save</span>
                </button>
                <?php endif; ?>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleOnlineMode" data-tooltip="<?php echo ($isOnlineModeActive ? __('tooltip_deactivate_online') : __('tooltip_activate_online')); ?>" data-position="bottom">
                    <span class="material-symbols-rounded <?php echo $isOnlineModeActive ? 'component-text-success' : ''; ?>"><?php echo $isOnlineModeActive ? 'sensors' : 'sensors_off'; ?></span>
                </button>
                <?php if ($isOnlineModeActive): ?>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleOwnerTools" data-ref="btn-owner-tools" data-tooltip="<?php echo __('tooltip_owner_tools'); ?> [O]" data-position="bottom">
                    <span class="material-symbols-rounded">construction</span>
                </button>
                <?php endif; ?>
                <?php endif; ?>

                <?php if ($isOnlineModeActive): ?>
                <?php
                    $chatLock = ['class' => '', 'attributes' => ''];
                    if (isset($isOwner) && $isOwner) {
                        $chatLock = \App\Core\System\SubscriptionFeatureConfig::getLockDetails($userTier ?? 0, 'feat_chat_restriction', 'button');
                    }
                ?>
                <button class="component-button component-button--icon component-button--h32 <?php echo $chatLock['class']; ?>" data-action="toggleMenuInModule" data-module-target="moduleLiveChat" data-menu-target="menu-chat" data-tooltip="<?php echo __('tooltip_live_chat'); ?> [H]" data-position="bottom" <?php echo $chatLock['attributes']; ?>>
                    <span class="material-symbols-rounded">chat</span>
                </button>
                <?php endif; ?>
            </div>

            <?php if (!$isOnlineModeActive): ?>
            <div class="canvas-design-toolbar-vertical <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="offline-tools-vertical">
                <button class="component-button component-button--icon component-button--h32" data-action="toggleOfflineMirror" data-ref="btn-offline-mirror" data-tooltip="<?php echo __('tooltip_mirror_mode'); ?> [X]" data-position="right">
                    <span class="material-symbols-rounded">flip</span>
                </button>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleOfflineMoveArea" data-ref="btn-offline-move-area" data-tooltip="<?php echo __('tooltip_move_area'); ?> [M]" data-position="right">
                    <span class="material-symbols-rounded">crop_free</span>
                </button>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleOfflineBucket" data-ref="btn-offline-bucket" data-tooltip="<?php echo __('tooltip_bucket'); ?> [G]" data-position="right">
                    <span class="material-symbols-rounded">format_color_fill</span>
                </button>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleOfflineSpray" data-ref="btn-offline-spray" data-tooltip="<?php echo __('tooltip_spray'); ?> [A]" data-position="right">
                    <span class="material-symbols-rounded">grain</span>
                </button>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleOfflineEraser" data-ref="btn-offline-eraser" data-tooltip="<?php echo __('tooltip_eraser'); ?> [E]" data-position="right">
                    <span class="material-symbols-rounded">cleaning_services</span>
                </button>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleOfflineDither" data-ref="btn-offline-dither" data-tooltip="<?php echo __('tooltip_dither'); ?> [D]" data-position="right">
                    <span class="material-symbols-rounded">texture</span>
                </button>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-shapes" data-ref="btn-offline-shapes" data-tooltip="<?php echo __('tooltip_shapes'); ?> [V]" data-position="right">
                    <span class="material-symbols-rounded">shapes</span>
                </button>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-text" data-ref="btn-offline-text" data-tooltip="<?php echo __('tooltip_text_tool'); ?> [Y]" data-position="right">
                    <span class="material-symbols-rounded">title</span>
                </button>
                <button class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-stickers" data-ref="btn-offline-stickers" data-tooltip="<?php echo __('tooltip_stickers'); ?> [F]" data-position="right">
                    <span class="material-symbols-rounded">category</span>
                </button>
            </div>

            <div class="canvas-design-subtoolbar-vertical disabled" data-ref="offline-subtoolbar-vertical">
                <div class="canvas-design-subtoolbar-group disabled" data-subtoolbar="eraser">
                    <button class="component-button component-button--icon component-button--h32 active" data-action="setOfflineEraserMode" data-eraser-mode="box" data-ref="btn-eraser-mode-box" data-tooltip="<?php echo __('tooltip_eraser_box'); ?>" data-position="right">
                        <span class="material-symbols-rounded">highlight_alt</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setOfflineEraserMode" data-eraser-mode="brush" data-ref="btn-eraser-mode-brush" data-tooltip="<?php echo __('tooltip_eraser_brush'); ?>" data-position="right">
                        <span class="material-symbols-rounded">draw</span>
                    </button>
                </div>

                <div class="canvas-design-subtoolbar-group disabled" data-subtoolbar="spray">
                    <button class="component-button component-button--icon component-button--h32" data-action="setSpraySize" data-size="2" data-tooltip="Radio 2 px" data-position="right">2</button>
                    <button class="component-button component-button--icon component-button--h32 active" data-action="setSpraySize" data-size="5" data-tooltip="Radio 5 px" data-position="right">5</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setSpraySize" data-size="10" data-tooltip="Radio 10 px" data-position="right">10</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setSpraySize" data-size="20" data-tooltip="Radio 20 px" data-position="right">20</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setSpraySize" data-size="35" data-tooltip="Radio 35 px" data-position="right">35</button>
                </div>

                <div class="canvas-design-subtoolbar-group disabled" data-subtoolbar="dither">
                    <button class="component-button component-button--icon component-button--h32 active" data-action="setDitherPattern" data-dither-pattern="checker_50" data-tooltip="<?php echo __('tooltip_dither_checker'); ?>" data-position="right">
                        <span class="material-symbols-rounded">grid_view</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setDitherPattern" data-dither-pattern="dots_25" data-tooltip="<?php echo __('tooltip_dither_dots25'); ?>" data-position="right">
                        <span class="material-symbols-rounded">blur_on</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setDitherPattern" data-dither-pattern="dots_75" data-tooltip="<?php echo __('tooltip_dither_dots75'); ?>" data-position="right">
                        <span class="material-symbols-rounded">gradient</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setDitherPattern" data-dither-pattern="diag_lines" data-tooltip="<?php echo __('tooltip_dither_diag'); ?>" data-position="right">
                        <span class="material-symbols-rounded">line_axis</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setDitherPattern" data-dither-pattern="h_lines" data-tooltip="<?php echo __('tooltip_dither_hlines'); ?>" data-position="right">
                        <span class="material-symbols-rounded">reorder</span>
                    </button>
                </div>
            </div>

            <div class="canvas-design-sizes-subtoolbar-vertical disabled" data-ref="brush-size-toolbar">
                <div class="canvas-design-sizes-group active" data-sizes-for="eraser">
                    <button class="component-button component-button--icon component-button--h32 active" data-action="setBrushEraserSize" data-size="1" data-tooltip="1x1 px" data-position="right">1</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setBrushEraserSize" data-size="5" data-tooltip="5x5 px" data-position="right">5</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setBrushEraserSize" data-size="10" data-tooltip="10x10 px" data-position="right">10</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setBrushEraserSize" data-size="25" data-tooltip="25x25 px" data-position="right">25</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setBrushEraserSize" data-size="50" data-tooltip="50x50 px" data-position="right">50</button>
                </div>
                <div class="canvas-design-sizes-group disabled" data-sizes-for="dither">
                    <button class="component-button component-button--icon component-button--h32 active" data-action="setDitherSize" data-size="1" data-tooltip="1x1 px" data-position="right">1</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setDitherSize" data-size="3" data-tooltip="3x3 px" data-position="right">3</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setDitherSize" data-size="5" data-tooltip="5x5 px" data-position="right">5</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setDitherSize" data-size="10" data-tooltip="10x10 px" data-position="right">10</button>
                    <button class="component-button component-button--icon component-button--h32" data-action="setDitherSize" data-size="20" data-tooltip="20x20 px" data-position="right">20</button>
                </div>
            </div>
            <?php endif; ?>
            <?php endif; ?>

            <div class="component-badge component-badge--dark component-badge--toolbar" data-ref="template-floating-toolbar">
                <button class="component-button component-button--icon component-button--h24" data-action="toggleTemplateLock" data-ref="btn-template-lock" data-tooltip="<?php echo __('tooltip_toggle_lock'); ?> [U]" data-position="top">
                    <span class="material-symbols-rounded">lock_open</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="rotateTemplate" data-ref="btn-template-rotate" data-tooltip="<?php echo __('tooltip_rotate_template'); ?> [R]" data-position="top">
                    <span class="material-symbols-rounded">rotate_right</span>
                </button>
                <?php
                    $injectLock = \App\Core\System\SubscriptionFeatureConfig::getLockDetails($userTier ?? 0, 'feat_inject_templates', 'button');
                ?>
                <button class="component-button component-button--icon component-button--h24 <?php echo $injectLock['class']; ?>" data-action="injectTemplate" data-ref="btn-template-inject" data-tooltip="<?php echo __('tooltip_inject_template'); ?> [B]" data-position="top" <?php echo $injectLock['attributes']; ?>>
                    <span class="material-symbols-rounded">brush</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="deleteTemplate" data-ref="btn-template-delete" data-tooltip="<?php echo __('tooltip_remove_template'); ?> [Supr]" data-position="top">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>

            <div class="component-canvas-floating-text disabled" data-ref="canvas-floating-text">
                <div class="component-canvas-floating-text__handle" data-action="dragFloatingText">
                    <span class="material-symbols-rounded">drag_indicator</span>
                </div>
                <input class="component-canvas-floating-text__input" data-ref="floating-text-input" type="text" placeholder="<?php echo __('placeholder_text_input'); ?>" maxlength="60" />
                <button class="component-button component-button--icon component-button--h24 component-button--success" data-action="commitPixelText" data-tooltip="<?php echo __('lbl_stamp_text'); ?> [Enter]" data-position="top">
                    <span class="material-symbols-rounded">check</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="cancelPixelText" data-tooltip="<?php echo __('lbl_cancel_text'); ?> [Esc]" data-position="top">
                    <span class="material-symbols-rounded">close</span>
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

                <div class="component-badge component-badge--danger <?php echo (isset($isSubscriptionLockedInit) && $isSubscriptionLockedInit) ? '' : 'disabled'; ?>" data-ref="premium-status-badge" data-position="top">
                    <span class="material-symbols-rounded">warning</span>
                    <span><?php echo __('lbl_requires_subscription'); ?></span>
                </div>

                <div class="component-badge component-badge--danger <?php echo (!$isBlockedInit || (isset($isSubscriptionLockedInit) && $isSubscriptionLockedInit)) ? 'disabled' : ''; ?>" data-ref="private-status-badge" data-tooltip="<?php echo __('tooltip_not_member'); ?>" data-position="top">
                    <span class="material-symbols-rounded">lock</span>
                    <span><?php echo __('lbl_private_canvas'); ?></span>
                </div>

                <?php if (!$isSnapshot && !empty($isOnlineActive)): ?>
                <div class="component-badge <?php echo ($isBlockedInit || $isSpectatorInit || $isSubscriptionLockedInit) ? 'disabled' : ''; ?>" data-ref="cooldown-badge">
                    <span class="material-symbols-rounded">bolt</span>
                    <span data-ref="cooldown-counter"><?php echo htmlspecialchars($canvasBatchLimit ?? '5'); ?>/<?php echo htmlspecialchars($canvasBatchLimit ?? '5'); ?></span>
                    
                    <span>|</span>
                    
                    <span class="material-symbols-rounded">timer</span>
                    <span data-ref="cooldown-timer">0s</span>
                </div>
                <?php endif; ?>
            </div>
            
            <div class="canvas-badges-right" data-ref="badges-right"></div>
            
            <?php if (!$isSnapshot): ?>
            <div class="component-action-pill <?php echo ($isBlockedInit || $isSpectatorInit || $isSubscriptionLockedInit) ? 'disabled' : ''; ?>">
                <button class="component-button component-button--h45 disabled-interaction" data-action="placePixels" data-ref="pixel-action-btn">
                    <span class="material-symbols-rounded">touch_app</span>
                    <span data-ref="pixel-action-text"><?php echo __('btn_select_pixels'); ?></span>
                </button>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <?php if (!$isSnapshot): ?>
        <?php require_once __DIR__ . '/../../modules/moduleDesignTools.php'; ?>
        <?php require_once __DIR__ . '/../../modules/moduleLiveChat.php'; ?>
    <?php endif; ?>

</div>