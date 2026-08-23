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

            <?php if (!$isOnlineModeActive): 
                $offlineTools = \App\Core\System\OfflineToolsConfig::getTools();
            ?>
            <div class="canvas-design-toolbar-vertical <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="offline-tools-vertical">
                <?php foreach ($offlineTools as $tool): 
                    $tooltipText = __($tool['name_key']) . (!empty($tool['shortcut']) ? " [{$tool['shortcut']}]" : '');
                    $actionAttr = 'data-action="' . htmlspecialchars($tool['action']) . '"';
                    if (!empty($tool['module_target'])) {
                        $actionAttr .= ' data-module-target="' . htmlspecialchars($tool['module_target']) . '"';
                    }
                    if (!empty($tool['menu_target'])) {
                        $actionAttr .= ' data-menu-target="' . htmlspecialchars($tool['menu_target']) . '"';
                    }
                    $refAttr = !empty($tool['ref']) ? ' data-ref="' . htmlspecialchars($tool['ref']) . '"' : '';
                ?>
                <button class="component-button component-button--icon component-button--h32" <?php echo $actionAttr; ?><?php echo $refAttr; ?> data-tooltip="<?php echo htmlspecialchars($tooltipText); ?>" data-position="right">
                    <span class="material-symbols-rounded"><?php echo htmlspecialchars($tool['icon']); ?></span>
                </button>
                <?php endforeach; ?>
            </div>

            <div class="canvas-design-subtoolbar-vertical disabled" data-ref="offline-subtoolbar-vertical">
                <?php foreach ($offlineTools as $tool): 
                    if (empty($tool['subtoolbar'])) continue;
                    $sub = $tool['subtoolbar'];
                    $subId = $sub['id'];
                ?>
                <div class="canvas-design-subtoolbar-group disabled" data-subtoolbar="<?php echo htmlspecialchars($subId); ?>">
                    <?php if (!empty($sub['options'])): ?>
                        <?php foreach ($sub['options'] as $opt): 
                            $isActive = ($opt['id'] === ($sub['default'] ?? ''));
                            $optRef = !empty($opt['ref']) ? ' data-ref="' . htmlspecialchars($opt['ref']) . '"' : '';
                            $dataValAttr = htmlspecialchars($sub['data_attr']) . '="' . htmlspecialchars($opt['id']) . '"';
                            $optTooltip = !empty($opt['name_key']) ? __($opt['name_key']) : '';
                        ?>
                        <button class="component-button component-button--icon component-button--h32 <?php echo $isActive ? 'active' : ''; ?>" data-action="<?php echo htmlspecialchars($sub['action']); ?>" <?php echo $dataValAttr; ?><?php echo $optRef; ?> data-tooltip="<?php echo htmlspecialchars($optTooltip); ?>" data-position="right">
                            <span class="material-symbols-rounded"><?php echo htmlspecialchars($opt['icon']); ?></span>
                        </button>
                        <?php endforeach; ?>
                    <?php elseif (!empty($sub['is_sizes']) && !empty($sub['tiers']['medium'])): ?>
                        <?php foreach ($sub['tiers']['medium'] as $sizeVal): 
                            $isActive = ($sizeVal === ($sub['default'] ?? 0));
                            $dataValAttr = htmlspecialchars($sub['data_attr']) . '="' . htmlspecialchars($sizeVal) . '"';
                        ?>
                        <button class="component-button component-button--icon component-button--h32 <?php echo $isActive ? 'active' : ''; ?>" data-action="<?php echo htmlspecialchars($sub['action']); ?>" <?php echo $dataValAttr; ?> data-tooltip="<?php echo "Radio {$sizeVal} px"; ?>" data-position="right">
                            <?php echo htmlspecialchars($sizeVal); ?>
                        </button>
                        <?php endforeach; ?>
                    <?php elseif (!empty($sub['is_levels']) && !empty($sub['tiers']['medium'])): ?>
                        <?php foreach ($sub['tiers']['medium'] as $lvlVal): 
                            $isActive = ($lvlVal === ($sub['default'] ?? 0));
                            $dataValAttr = htmlspecialchars($sub['data_attr']) . '="' . htmlspecialchars($lvlVal) . '"';
                            $lvlTooltip = ($lvlVal === 0) ? (__('lbl_grid_off') ?: 'Desactivar cuadrícula') : "{$lvlVal}x{$lvlVal} px";
                        ?>
                        <button class="component-button component-button--icon component-button--h32 <?php echo $isActive ? 'active' : ''; ?>" data-action="<?php echo htmlspecialchars($sub['action']); ?>" <?php echo $dataValAttr; ?> data-tooltip="<?php echo htmlspecialchars($lvlTooltip); ?>" data-position="right">
                            <?php if ($lvlVal === 0): ?>
                                <span class="material-symbols-rounded">grid_off</span>
                            <?php else: ?>
                                <?php echo htmlspecialchars($lvlVal); ?>
                            <?php endif; ?>
                        </button>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>

            <div class="canvas-design-sizes-subtoolbar-vertical disabled" data-ref="brush-size-toolbar">
                <?php foreach ($offlineTools as $tool): 
                    if (empty($tool['sizes'])) continue;
                    $sz = $tool['sizes'];
                    $szId = $sz['id'];
                    $defaultSizes = $sz['tiers']['medium'] ?? [];
                    $defaultVal = $sz['default'] ?? 1;
                ?>
                <div class="canvas-design-sizes-group disabled" data-sizes-for="<?php echo htmlspecialchars($szId); ?>">
                    <?php foreach ($defaultSizes as $sVal): 
                        $isActive = ($sVal === $defaultVal);
                    ?>
                    <button class="component-button component-button--icon component-button--h32 <?php echo $isActive ? 'active' : ''; ?>" data-action="<?php echo htmlspecialchars($sz['action']); ?>" data-size="<?php echo htmlspecialchars($sVal); ?>" data-tooltip="<?php echo "{$sVal}x{$sVal} px"; ?>" data-position="right">
                        <?php echo htmlspecialchars($sVal); ?>
                    </button>
                    <?php endforeach; ?>
                </div>
                <?php endforeach; ?>
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

            <div class="component-badge component-badge--dark component-badge--toolbar component-canvas-floating-text disabled" data-ref="canvas-floating-text">
                <div class="component-canvas-floating-text__handle" data-action="dragFloatingText" data-tooltip="<?php echo __('tooltip_drag'); ?>" data-position="top">
                    <span class="material-symbols-rounded">drag_indicator</span>
                </div>
                <input class="component-canvas-floating-text__input" data-ref="floating-text-input" type="text" placeholder="<?php echo __('placeholder_text_input'); ?>" maxlength="60" />
                <button class="component-button component-button--icon component-button--h24" data-action="cyclePixelFont" data-ref="btn-text-font" data-tooltip="<?php echo __('lbl_font_family'); ?>" data-position="top">
                    <span class="material-symbols-rounded">font_download</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="cyclePixelTextScale" data-ref="btn-text-scale" data-tooltip="<?php echo __('lbl_text_scale'); ?> (1x)" data-position="top">
                    <span data-ref="text-scale-label" class="component-font-scale-tag">1x</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="togglePixelTextOutline" data-ref="btn-text-outline" data-tooltip="<?php echo __('lbl_text_outline'); ?>" data-position="top">
                    <span class="material-symbols-rounded">border_outer</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="togglePixelTextShadow" data-ref="btn-text-shadow" data-tooltip="<?php echo __('lbl_text_shadow'); ?>" data-position="top">
                    <span class="material-symbols-rounded">shadow</span>
                </button>
                <button class="component-button component-button--icon component-button--h24 component-button--success" data-action="commitPixelText" data-ref="btn-commit-pixel-text" data-tooltip="<?php echo __('lbl_stamp_text'); ?> [Enter]" data-position="top">
                    <span class="material-symbols-rounded">check</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="cancelPixelText" data-ref="btn-cancel-pixel-text" data-tooltip="<?php echo __('lbl_cancel_text'); ?> [Esc]" data-position="top">
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