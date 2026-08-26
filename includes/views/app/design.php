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

$isLocal = !empty($isLocalCanvas) || (isset($canvasUuid) && strpos($canvasUuid, 'local_') === 0);
if ($isLocal) {
    $isBlockedInit = false;
    $isSpectatorInit = false;
    $isSubscriptionLockedInit = false;
    $isOwner = true;
    $isMember = true;
}
?>
<script>window.__CANVAS_VIEW_START__ = performance.now();</script>
<div class="view-content">
    
    <?php 
    echo \App\Core\Helpers\Utils::renderTurnstile('canvas_design'); 
    ?>

    <div class="component-wrapper component-wrapper--full no-padding" 
         data-ref="design-wrapper" 
         data-canvas-id="<?php echo htmlspecialchars($canvasIntId); ?>"
         data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>"
         data-canvas-name="<?php echo htmlspecialchars($canvasName); ?>"
         data-size="<?php echo htmlspecialchars($canvasSize); ?>" 
         data-mode="<?php echo htmlspecialchars($canvasMode ?? 'offline'); ?>"
         data-online-active="<?php echo !empty($isOnlineActive) ? '1' : '0'; ?>"
         data-user-tier="<?php echo (int)($userTier ?? 0); ?>"
         data-initial-zoom="<?php echo htmlspecialchars($canvasInitialZoom ?? '0.5'); ?>"
         data-palette="<?php echo htmlspecialchars($canvasPalette); ?>"
         data-privacy="<?php echo htmlspecialchars($canvasPrivacy); ?>"
         data-is-owner="<?php echo ($isLocal || (isset($isOwner) && $isOwner)) ? '1' : '0'; ?>"
         data-is-local="<?php echo $isLocal ? '1' : '0'; ?>"
         data-is-blocked="<?php echo (!$isLocal && isset($isBlockedInit) && $isBlockedInit) ? '1' : '0'; ?>"
         data-subscription-locked="<?php echo (!$isLocal && isset($isSubscriptionLockedInit) && $isSubscriptionLockedInit) ? '1' : '0'; ?>"
         data-is-spectator="<?php echo (!$isLocal && isset($isSpectatorInit) && $isSpectatorInit) ? '1' : '0'; ?>"
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
                <?php if ($isLocal): ?>
                <div class="component-actions active" data-ref="local-canvas-actions">
                    <button type="button" class="component-button component-button--h34" data-action="syncLocalCanvasToCloud" data-uuid="<?php echo htmlspecialchars($canvasUuid); ?>" data-tooltip="<?php echo __('btn_sync_cloud'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded component-icon--20 component-text-accent">cloud_upload</span>
                        <span><?php echo __('btn_sync_cloud'); ?></span>
                    </button>
                </div>
                <?php else: ?>
                <?php 
                if (!isset($isBlockedInit)) {
                    $isBlockedInit = ($canvasPrivacy === 'private');
                    $isSpectatorInit = true;
                }
                $showSpectatorControls = ($isBlockedInit || $isSpectatorInit || $isSubscriptionLockedInit);
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
            <!-- Unified Top Property Bar & Actions -->
            <div class="component-property-bar-wrapper" data-ref="canvas-top-property-bar-wrapper">
                <button type="button" class="component-tag-nav-btn component-tag-nav-btn--left disabled" data-action="scrollCanvasToolbarLeft" data-tooltip="<?php echo __('btn_scroll_left'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">chevron_left</span>
                </button>

                <div class="component-property-bar <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="canvas-top-property-bar">
                <div class="component-property-bar__context">
                    <!-- Tool settings icon shortcut -->
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="openToolSettings" data-ref="prop-btn-tool-settings" data-tooltip="<?php echo __('tooltip_tool_settings'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded msr-tune">tune</span>
                    </button>

                    <!-- Context: Brush -->
                    <div class="component-property-bar__group active" data-tool-context="offline_brush">
                        <div class="component-property-bar__btn-group">
                            <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="setBrushShape" data-brush-shape="square" data-tooltip="<?php echo __('tooltip_brush_square'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-square">square</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setBrushShape" data-brush-shape="circle" data-tooltip="<?php echo __('tooltip_brush_circle'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-circle">circle</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setBrushShape" data-brush-shape="slash" data-tooltip="<?php echo __('tooltip_brush_slash'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-edit">edit</span>
                            </button>
                        </div>

                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="togglePixelPerfect" data-ref="prop-btn-pixel-perfect" data-tooltip="<?php echo __('tooltip_pixel_perfect'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded msr-auto_fix_high">auto_fix_high</span>
                        </button>

                        <div class="component-property-bar__btn-group">
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleOfflineMirrorAxis" data-axis="x" data-ref="prop-mirror-x" data-tooltip="<?php echo __('tooltip_mirror_x'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-flip">flip</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleOfflineMirrorAxis" data-axis="y" data-ref="prop-mirror-y" data-tooltip="<?php echo __('tooltip_mirror_y'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-swap_vert">swap_vert</span>
                            </button>
                        </div>
                    </div>

                    <!-- Context: Eraser -->
                    <div class="component-property-bar__group disabled" data-tool-context="offline_eraser">
                        <div class="component-property-bar__btn-group">
                            <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="setOfflineEraserMode" data-eraser-mode="box" data-tooltip="<?php echo __('lbl_box'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-check_box_outline_blank">check_box_outline_blank</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setOfflineEraserMode" data-eraser-mode="brush" data-tooltip="<?php echo __('lbl_brush'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-brush">brush</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setOfflineEraserMode" data-eraser-mode="color" data-tooltip="<?php echo __('lbl_color'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-colorize">colorize</span>
                            </button>
                        </div>
                    </div>

                    <!-- Context: Quick Shapes -->
                    <div class="component-property-bar__group disabled" data-tool-context="offline_quick_shapes">
                        <div class="component-property-bar__btn-group">
                            <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="setQuickShapeType" data-shape-type="line" data-tooltip="<?php echo __('tooltip_shape_line'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-show_chart">show_chart</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setQuickShapeType" data-shape-type="rectangle" data-tooltip="<?php echo __('tooltip_shape_rectangle'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-rectangle">rectangle</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setQuickShapeType" data-shape-type="circle" data-tooltip="<?php echo __('tooltip_shape_circle'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-circle">circle</span>
                            </button>
                        </div>
                        <button type="button" class="component-button component-button--icon component-button--h32 property-bar-btn--toggle" data-action="toggleQuickShapeFill" data-ref="prop-shape-fill" data-tooltip="<?php echo __('tooltip_shape_mode_fill'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded msr-format_paint">format_paint</span>
                        </button>
                    </div>

                    <!-- Context: Move & Selection -->
                    <div class="component-property-bar__group disabled" data-tool-context="offline_moving_area">
                        <div class="component-property-bar__btn-group">
                            <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="setSelectionMode" data-selection-mode="box" data-tooltip="<?php echo __('lbl_box'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-crop_free">crop_free</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setSelectionMode" data-selection-mode="lasso" data-tooltip="<?php echo __('lbl_lasso'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-gesture">gesture</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setSelectionMode" data-selection-mode="wand" data-tooltip="<?php echo __('lbl_wand'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-auto_awesome">auto_awesome</span>
                            </button>
                        </div>
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="clearSelection" data-tooltip="<?php echo __('tooltip_deselect'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded msr-close">close</span>
                        </button>
                    </div>

                    <!-- Context: Bucket -->
                    <div class="component-property-bar__group disabled" data-tool-context="offline_bucket">
                        <div class="component-property-bar__btn-group">
                            <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="setOfflineBucketMode" data-bucket-mode="flood" data-tooltip="<?php echo __('lbl_flood'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-format_color_fill">format_color_fill</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setOfflineBucketMode" data-bucket-mode="swap" data-tooltip="<?php echo __('lbl_swap_color'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-find_replace">find_replace</span>
                            </button>
                        </div>
                    </div>

                    <!-- Context: Spray -->
                    <div class="component-property-bar__group disabled" data-tool-context="offline_spray">
                        <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="openToolSettings" data-tooltip="<?php echo __('lbl_radius'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded msr-grain">grain</span>
                        </button>
                    </div>

                    <!-- Context: Dither -->
                    <div class="component-property-bar__group disabled" data-tool-context="offline_dither">
                        <div class="component-property-bar__btn-group">
                            <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="setDitherPattern" data-dither-pattern="checker_50" data-tooltip="<?php echo __('lbl_dither_checker'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-texture">texture</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setDitherPattern" data-dither-pattern="dots_25" data-tooltip="<?php echo __('lbl_dither_dots25'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-grain">grain</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setDitherPattern" data-dither-pattern="dots_75" data-tooltip="<?php echo __('lbl_dither_dots75'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-blur_on">blur_on</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setDitherPattern" data-dither-pattern="diag_lines" data-tooltip="<?php echo __('lbl_dither_diag'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-reorder">reorder</span>
                            </button>
                        </div>
                    </div>

                    <!-- Context: Shading -->
                    <div class="component-property-bar__group disabled" data-tool-context="offline_shading">
                        <div class="component-property-bar__btn-group">
                            <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="setShadingMode" data-shading-mode="shadow" data-tooltip="<?php echo __('lbl_shading_shadow'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-dark_mode">dark_mode</span>
                            </button>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="setShadingMode" data-shading-mode="highlight" data-tooltip="<?php echo __('lbl_shading_highlight'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded msr-light_mode">light_mode</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="component-property-bar__divider"></div>

                <div class="component-property-bar__actions" data-ref="design-tools-actions">
                    <?php if ($isOnlineModeActive): ?>
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="openJoinLiveModal" data-tooltip="<?php echo __('tooltip_join_live'); ?> [J]" data-position="bottom">
                        <span class="material-symbols-rounded msr-sensors">sensors</span>
                    </button>
                    <?php
                        $liveLock = \App\Core\System\SubscriptionFeatureConfig::getLockDetails($userTier ?? 0, 'feat_live_share', 'button');
                    ?>
                    <button type="button" class="component-button component-button--icon component-button--h32 <?php echo $liveLock['class']; ?>" data-action="toggleLiveBroadcast" data-ref="btn-start-live" data-tooltip="<?php echo __('tooltip_stream_live'); ?> [S]" data-position="bottom" <?php echo $liveLock['attributes']; ?>>
                        <span class="material-symbols-rounded msr-stream">stream</span>
                    </button>
                    <!-- Paleta de colores del lienzo -->
                    <button type="button" class="component-button component-button--icon component-button--h32 component-color-indicator" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="<?php echo __('tooltip_color_palette'); ?> [C]" data-position="bottom">
                        <span class="material-symbols-rounded msr-palette">palette</span>
                    </button>
                    <!-- Plantillas de lienzo -->
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-templates" data-tooltip="<?php echo __('tooltip_templates'); ?> [T]" data-position="bottom">
                        <span class="material-symbols-rounded msr-photo_library">photo_library</span>
                    </button>
                    <?php if (isset($isOwner) && $isOwner): ?>
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleOnlineMode" data-tooltip="<?php echo ($isOnlineModeActive ? __('tooltip_deactivate_online') : __('tooltip_activate_online')); ?>" data-position="bottom">
                        <span class="material-symbols-rounded msr-sensors <?php echo $isOnlineModeActive ? 'component-text-success' : ''; ?>"><?php echo $isOnlineModeActive ? 'sensors' : 'sensors_off'; ?></span>
                    </button>
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleOwnerTools" data-ref="btn-owner-tools" data-tooltip="<?php echo __('tooltip_owner_tools'); ?> [O]" data-position="bottom">
                        <span class="material-symbols-rounded msr-construction">construction</span>
                    </button>
                    <?php endif; ?>
                    <?php
                        $chatLock = ['class' => '', 'attributes' => ''];
                        if (isset($isOwner) && $isOwner) {
                            $chatLock = \App\Core\System\SubscriptionFeatureConfig::getLockDetails($userTier ?? 0, 'feat_chat_restriction', 'button');
                        }
                    ?>
                    <button type="button" class="component-button component-button--icon component-button--h32 <?php echo $chatLock['class']; ?>" data-action="toggleMenuInModule" data-module-target="moduleLiveChat" data-menu-target="menu-chat" data-tooltip="<?php echo __('tooltip_live_chat'); ?> [H]" data-position="bottom" <?php echo $chatLock['attributes']; ?>>
                        <span class="material-symbols-rounded msr-chat">chat</span>
                    </button>
                    <div class="component-property-bar__divider"></div>
                    <?php endif; ?>

                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleTileGrid" data-tooltip="<?php echo __('tooltip_tile_grid'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded msr-grid_on">grid_on</span>
                    </button>
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="undo" data-tooltip="<?php echo __('tooltip_undo'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded msr-undo">undo</span>
                    </button>
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="redo" data-tooltip="<?php echo __('tooltip_redo'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded msr-redo">redo</span>
                    </button>
                    <button type="button" class="component-button component-button--icon component-button--h32 property-bar-btn--sidebar-toggle" data-action="toggleUnifiedSidebar" data-ref="btn-top-sidebar-toggle" data-tooltip="<?php echo __('tooltip_toggle_sidebar'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded msr-view_sidebar">view_sidebar</span>
                    </button>
                </div>
                </div>

                <button type="button" class="component-tag-nav-btn component-tag-nav-btn--right disabled" data-action="scrollCanvasToolbarRight" data-tooltip="<?php echo __('btn_scroll_right'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>
            </div>


            <?php endif; ?>

            <div class="component-toolbar component-toolbar--vertical-right <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="workspace-tools-vertical-right">
                <?php if (!$isOnlineModeActive): ?>
                    <?php if (isset($isOwner) && $isOwner): ?>
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="manualSaveOffline" data-ref="btn-save-offline" data-tooltip="<?php echo __('tooltip_save_offline'); ?>" data-position="left">
                        <span class="material-symbols-rounded">save</span>
                    </button>
                    <?php endif; ?>

                    <button type="button" class="component-button component-button--icon component-button--h32 component-color-indicator" data-ref="btn-color-palette" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-colors" data-tooltip="<?php echo __('tooltip_color_palette'); ?> [C]" data-position="left">
                        <span class="material-symbols-rounded">palette</span>
                    </button>

                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="moduleDesignTools" data-menu-target="menu-templates" data-tooltip="<?php echo __('tooltip_templates'); ?> [T]" data-position="left">
                        <span class="material-symbols-rounded">photo_library</span>
                    </button>

                    <?php if (isset($isOwner) && $isOwner): ?>
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleOnlineMode" data-tooltip="<?php echo __('tooltip_activate_online'); ?>" data-position="left">
                        <span class="material-symbols-rounded">sensors</span>
                    </button>
                    <?php endif; ?>

                    <div class="component-property-bar__divider component-property-bar__divider--vertical"></div>

                    <button class="component-button component-button--icon component-button--h32" data-action="openToolSettings" data-ref="btn-sidebar-tool-settings" data-tooltip="<?php echo __('lbl_tool_settings'); ?>" data-position="left">
                        <span class="material-symbols-rounded">tune</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h32" data-action="openLayersTab" data-ref="btn-toggle-layers" data-tooltip="<?php echo __('tooltip_layers'); ?> [L]" data-position="left">
                        <span class="material-symbols-rounded">layers</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h32" data-action="openMinimapTab" data-tooltip="<?php echo __('lbl_minimap'); ?>" data-position="left">
                        <span class="material-symbols-rounded">explore</span>
                    </button>

                    <?php if (isset($isOwner) && $isOwner): ?>
                    <button class="component-button component-button--icon component-button--h32" data-action="openOfflineResizeModal" data-tooltip="<?php echo __('tooltip_resize_canvas'); ?>" data-position="left">
                        <span class="material-symbols-rounded">aspect_ratio</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="generateOfflineSnapshot" data-tooltip="<?php echo __('btn_create_captura'); ?>" data-position="left">
                        <span class="material-symbols-rounded">photo_camera</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="openOfflineResetModal" data-tooltip="<?php echo __('tooltip_manage_resets'); ?>" data-position="left">
                        <span class="material-symbols-rounded">restart_alt</span>
                    </button>
                    <?php endif; ?>
                <?php else: ?>
                    <?php if (isset($isOwner) && $isOwner): ?>
                    <button class="component-button component-button--icon component-button--h32" data-action="openOfflineResizeModal" data-tooltip="<?php echo __('tooltip_resize_canvas'); ?>" data-position="left">
                        <span class="material-symbols-rounded">aspect_ratio</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="generateOfflineSnapshot" data-tooltip="<?php echo __('btn_create_captura'); ?>" data-position="left">
                        <span class="material-symbols-rounded">photo_camera</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h32" data-action="openOfflineResetModal" data-tooltip="<?php echo __('tooltip_manage_resets'); ?>" data-position="left">
                        <span class="material-symbols-rounded">restart_alt</span>
                    </button>
                    <?php endif; ?>
                <?php endif; ?>
            </div>

            <!-- Unified Right Sidebar with Tabs (Capas, Minimapa, Herramienta) -->
            <?php if (!$isOnlineModeActive): ?>
            <div class="component-sidebar component-sidebar--right disabled" data-ref="canvas-right-unified-sidebar">
                <div class="component-sidebar__tabs" data-ref="sidebar-tabs" data-active-tab="layers">
                    <div class="component-sidebar__tabs-glider" data-ref="sidebar-tabs-glider"></div>
                    <button type="button" class="component-sidebar__tab-btn active" data-action="switchSidebarTab" data-tab="layers" data-tooltip="<?php echo __('tooltip_layers'); ?> [L]" data-position="bottom">
                        <span class="material-symbols-rounded msr-layers">layers</span>
                    </button>
                    <button type="button" class="component-sidebar__tab-btn" data-action="switchSidebarTab" data-tab="minimap" data-tooltip="<?php echo __('lbl_minimap'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded msr-explore">explore</span>
                    </button>
                    <button type="button" class="component-sidebar__tab-btn" data-action="switchSidebarTab" data-tab="tool" data-tooltip="<?php echo __('lbl_tool_settings'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded msr-tune">tune</span>
                    </button>
                </div>

                <div class="component-sidebar__body">
                    <!-- TAB 1: CAPAS -->
                    <div class="component-sidebar__tab-content active" data-sidebar-tab="layers">
                        <div class="component-layers-preview-container">
                            <div class="component-layers-preview-box">
                                <canvas class="component-layers-preview-canvas" data-ref="layer-preview-canvas" width="96" height="96"></canvas>
                                <div class="component-layers-preview-info">
                                    <span class="component-layers-preview-name" data-ref="layer-active-name"><?php echo __('lbl_default_layer_name'); ?> 1</span>
                                    <span class="component-layers-preview-dimensions" data-ref="layer-active-dimensions"><?php echo htmlspecialchars($canvasSize); ?> px</span>
                                </div>
                            </div>
                            
                            <!-- Opacity Control -->
                            <div class="component-tool-field">
                                <div class="component-tool-field__header">
                                    <span class="component-tool-field__label"><?php echo __('lbl_opacity'); ?></span>
                                    <span class="component-tool-field__val" data-ref="layer-opacity-val">100%</span>
                                </div>
                                <div class="component-tool-slider-box">
                                    <input type="range" class="component-range" min="0" max="100" value="100" data-action="setLayerOpacity" data-ref="layer-opacity-slider">
                                    <input type="number" class="component-tool-input-number" min="0" max="100" value="100" data-action="setLayerOpacityNumber" data-ref="layer-opacity-number">
                                </div>
                            </div>

                            <!-- Blend Mode -->
                            <div class="component-tool-field">
                                <span class="component-tool-field__label"><?php echo __('lbl_blend_mode'); ?></span>
                                <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleLayerBlendModes" data-ref="layer-blend-trigger">
                                        <span class="component-dropdown-text" data-ref="layer-blend-text">Normal</span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>
                                    <div class="component-module component-module--dropdown disabled" data-module="moduleLayerBlendModes" data-ref="layer-blend-dropdown">
                                        <div class="component-menu component-menu--w180 component-menu--h-auto component-menu--padding-xs">
                                            <ul class="component-menu-list">
                                                <li>
                                                    <button type="button" class="component-menu-link active" data-action="selectLayerBlendMode" data-blend="normal">
                                                        <span>Normal</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button type="button" class="component-menu-link" data-action="selectLayerBlendMode" data-blend="multiply">
                                                        <span>Multiplicar</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button type="button" class="component-menu-link" data-action="selectLayerBlendMode" data-blend="screen">
                                                        <span>Pantalla</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button type="button" class="component-menu-link" data-action="selectLayerBlendMode" data-blend="overlay">
                                                        <span>Superponer</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button type="button" class="component-menu-link" data-action="selectLayerBlendMode" data-blend="darken">
                                                        <span>Oscurecer</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button type="button" class="component-menu-link" data-action="selectLayerBlendMode" data-blend="lighten">
                                                        <span>Aclarar</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button type="button" class="component-menu-link" data-action="selectLayerBlendMode" data-blend="color-dodge">
                                                        <span>Sobreexponer</span>
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-layers-list-container" data-ref="layers-list-scroll"></div>

                        <div class="component-layers-actions-footer" data-ref="layers-actions-toolbar">
                            <div class="component-layers-actions-row">
                                <button class="component-button component-button--icon component-button--h32" data-action="addLayer" data-tooltip="<?php echo __('tooltip_add_layer'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-add">add</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h32" data-action="duplicateLayer" data-tooltip="<?php echo __('tooltip_duplicate_layer'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-content_copy">content_copy</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h32" data-action="moveLayerUp" data-tooltip="<?php echo __('tooltip_move_layer_up'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-arrow_upward">arrow_upward</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h32" data-action="moveLayerDown" data-tooltip="<?php echo __('tooltip_move_layer_down'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-arrow_downward">arrow_downward</span>
                                </button>
                                <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleAlphaLock" data-ref="btn-alpha-lock" data-tooltip="<?php echo __('lbl_alpha_lock_tooltip'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-lock_open">lock_open</span>
                                </button>
                            </div>
                            <div class="component-layers-actions-row">
                                <button class="component-button component-button--icon component-button--h32" data-action="openAutoOutlineModal" data-tooltip="<?php echo __('tooltip_auto_outline'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-border_outer">border_outer</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h32" data-action="mergeLayerUp" data-tooltip="<?php echo __('tooltip_merge_layer_up'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-vertical_align_top">vertical_align_top</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h32" data-action="mergeLayerDown" data-tooltip="<?php echo __('tooltip_merge_layer_down'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-vertical_align_bottom">vertical_align_bottom</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h32 component-button--danger" data-action="deleteLayer" data-tooltip="<?php echo __('tooltip_delete_layer'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-delete">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: MINIMAPA -->
                    <div class="component-sidebar__tab-content disabled" data-sidebar-tab="minimap">
                        <div class="component-minimap-panel">
                            <div class="component-minimap-canvas-wrapper">
                                <canvas class="component-minimap-canvas" data-ref="minimap-canvas" width="200" height="200"></canvas>
                                <div class="component-minimap-viewport-box" data-ref="minimap-viewport-box"></div>
                            </div>
                            <div class="component-minimap-controls">
                                <button type="button" class="component-button component-button--icon component-button--h32" data-action="zoomOutStep" data-tooltip="<?php echo __('lbl_zoom_out'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-remove">remove</span>
                                </button>
                                <button type="button" class="component-button component-button--h32" data-action="resetZoomFit" data-tooltip="<?php echo __('lbl_reset_zoom'); ?>" data-position="top">
                                    <span><?php echo __('lbl_fit_100'); ?></span>
                                </button>
                                <button type="button" class="component-button component-button--icon component-button--h32" data-action="zoomInStep" data-tooltip="<?php echo __('lbl_zoom_in'); ?>" data-position="top">
                                    <span class="material-symbols-rounded msr-add">add</span>
                                </button>
                            </div>
                            <div class="component-minimap-stats">
                                <div class="component-minimap-stat-item">
                                    <span class="material-symbols-rounded msr-aspect_ratio">aspect_ratio</span>
                                    <span data-ref="minimap-res-text"><?php echo htmlspecialchars($canvasSize); ?> px</span>
                                </div>
                                <div class="component-minimap-stat-item">
                                    <span class="material-symbols-rounded msr-my_location">my_location</span>
                                    <span data-ref="minimap-coords-text">0, 0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 3: HERRAMIENTA / AJUSTES -->
                    <div class="component-sidebar__tab-content disabled" data-sidebar-tab="tool">
                        <div class="component-tool-settings-panel">
                            <!-- Tool Meta Header -->
                            <div class="component-tool-settings-header">
                                <div class="component-tool-settings-badge">
                                    <span class="material-symbols-rounded" data-ref="sidebar-tool-icon">brush</span>
                                </div>
                                <div class="component-tool-settings-meta">
                                    <span class="component-tool-settings-title" data-ref="sidebar-tool-title"><?php echo __('lbl_brush_title'); ?></span>
                                    <span class="component-tool-settings-desc" data-ref="sidebar-tool-desc"><?php echo __('lbl_brush_desc'); ?></span>
                                </div>
                            </div>

                            <!-- Section: Brush -->
                            <div class="component-tool-settings-section" data-sidebar-tool-section="offline_brush">
                                <div class="component-tool-field">
                                    <div class="component-tool-field__header">
                                        <span class="component-tool-field__label"><?php echo __('lbl_size'); ?></span>
                                        <span class="component-tool-field__val" data-ref="sidebar-brush-size-val">1px</span>
                                    </div>
                                    <div class="component-tool-slider-box">
                                        <input type="range" class="component-range" min="1" max="32" value="1" data-action="setBrushSizeRange" data-ref="sidebar-brush-size-slider">
                                        <input type="number" class="component-tool-input-number" min="1" max="32" value="1" data-action="setBrushSizeNumber" data-ref="sidebar-brush-size-number">
                                    </div>
                                </div>

                                <div class="component-tool-field">
                                    <span class="component-tool-field__label"><?php echo __('lbl_stroke_shape'); ?></span>
                                    <div class="component-tool-segmented">
                                        <div class="component-tool-segmented-glider"></div>
                                        <button type="button" class="component-tool-segmented-btn active" data-action="setBrushShape" data-brush-shape="square" data-tooltip="<?php echo __('lbl_shape_square'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">square</span>
                                        </button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setBrushShape" data-brush-shape="circle" data-tooltip="<?php echo __('lbl_shape_round'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">circle</span>
                                        </button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setBrushShape" data-brush-shape="slash" data-tooltip="<?php echo __('lbl_shape_diagonal'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">edit</span>
                                        </button>
                                    </div>
                                </div>


                                <div class="component-tool-field">
                                    <div class="component-tool-field__header">
                                        <span class="component-tool-field__label"><?php echo __('lbl_stabilizer'); ?></span>
                                        <span class="component-tool-field__val" data-ref="sidebar-stabilizer-val">0%</span>
                                    </div>
                                    <div class="component-tool-slider-box">
                                        <input type="range" class="component-range" min="0" max="100" value="0" data-action="setStabilizerRange" data-ref="sidebar-stabilizer-slider">
                                        <input type="number" class="component-tool-input-number" min="0" max="100" value="0" data-action="setStabilizerNumber" data-ref="sidebar-stabilizer-number">
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Eraser -->
                            <div class="component-tool-settings-section disabled" data-sidebar-tool-section="offline_eraser">
                                <div class="component-tool-field">
                                    <span class="component-tool-field__label"><?php echo __('lbl_eraser_mode'); ?></span>
                                    <div class="component-tool-segmented">
                                        <div class="component-tool-segmented-glider"></div>
                                        <button type="button" class="component-tool-segmented-btn active" data-action="setOfflineEraserMode" data-eraser-mode="box" data-tooltip="<?php echo __('lbl_box'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">check_box_outline_blank</span>
                                        </button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setOfflineEraserMode" data-eraser-mode="brush" data-tooltip="<?php echo __('lbl_brush'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">brush</span>
                                        </button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setOfflineEraserMode" data-eraser-mode="color" data-tooltip="<?php echo __('lbl_color'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">colorize</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Quick Shapes -->
                            <div class="component-tool-settings-section disabled" data-sidebar-tool-section="offline_quick_shapes">
                                <div class="component-tool-field">
                                    <span class="component-tool-field__label"><?php echo __('lbl_shape_type'); ?></span>
                                    <div class="component-tool-segmented">
                                        <div class="component-tool-segmented-glider"></div>
                                        <button type="button" class="component-tool-segmented-btn active" data-action="setQuickShapeType" data-shape-type="line" data-tooltip="<?php echo __('shape_line'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">show_chart</span>
                                        </button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setQuickShapeType" data-shape-type="rectangle" data-tooltip="<?php echo __('shape_rectangle'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">rectangle</span>
                                        </button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setQuickShapeType" data-shape-type="circle" data-tooltip="<?php echo __('shape_circle'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">circle</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="component-tool-field">
                                    <div class="component-tool-field__toggle">
                                        <div class="component-tool-field__meta">
                                            <span class="component-tool-field__label"><?php echo __('lbl_shape_fill_auto'); ?></span>
                                            <div class="component-tool-field__sub"><?php echo __('lbl_shape_fill_desc'); ?></div>
                                        </div>
                                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleQuickShapeFill" data-ref="sidebar-shape-fill">
                                            <span class="material-symbols-rounded">format_paint</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Spray -->
                            <div class="component-tool-settings-section disabled" data-sidebar-tool-section="offline_spray">
                                <div class="component-tool-field">
                                    <div class="component-tool-field__header">
                                        <span class="component-tool-field__label"><?php echo __('lbl_spray_radius'); ?></span>
                                        <span class="component-tool-field__val" data-ref="sidebar-spray-val">5px</span>
                                    </div>
                                    <div class="component-tool-slider-box">
                                        <input type="range" class="component-range" min="2" max="35" value="5" data-action="setSpraySizeRange" data-ref="sidebar-spray-slider">
                                        <input type="number" class="component-tool-input-number" min="2" max="35" value="5" data-action="setSpraySizeNumber" data-ref="sidebar-spray-number">
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Dither -->
                            <div class="component-tool-settings-section disabled" data-sidebar-tool-section="offline_dither">
                                <div class="component-tool-field">
                                    <span class="component-tool-field__label"><?php echo __('lbl_dither_pattern'); ?></span>
                                    <div class="component-tool-segmented">
                                        <div class="component-tool-segmented-glider"></div>
                                        <button type="button" class="component-tool-segmented-btn active" data-action="setDitherPattern" data-dither-pattern="checker_50"><?php echo __('lbl_dither_checker'); ?></button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setDitherPattern" data-dither-pattern="dots_25"><?php echo __('lbl_dither_dots25'); ?></button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setDitherPattern" data-dither-pattern="dots_75"><?php echo __('lbl_dither_dots75'); ?></button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setDitherPattern" data-dither-pattern="diag_lines"><?php echo __('lbl_dither_lines'); ?></button>
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Shading -->
                            <div class="component-tool-settings-section disabled" data-sidebar-tool-section="offline_shading">
                                <div class="component-tool-field">
                                    <span class="component-tool-field__label"><?php echo __('lbl_shading_mode'); ?></span>
                                    <div class="component-tool-segmented">
                                        <div class="component-tool-segmented-glider"></div>
                                        <button type="button" class="component-tool-segmented-btn active" data-action="setShadingMode" data-shading-mode="shadow" data-tooltip="<?php echo __('lbl_shading_shadow'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">dark_mode</span>
                                        </button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setShadingMode" data-shading-mode="highlight" data-tooltip="<?php echo __('lbl_shading_highlight'); ?>" data-position="bottom">
                                            <span class="material-symbols-rounded">light_mode</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Moving Area -->
                            <div class="component-tool-settings-section disabled" data-sidebar-tool-section="offline_moving_area">
                                <div class="component-tool-field">
                                    <span class="component-tool-field__label"><?php echo __('lbl_selection_mode'); ?></span>
                                    <div class="component-tool-segmented">
                                        <div class="component-tool-segmented-glider"></div>
                                        <button type="button" class="component-tool-segmented-btn active" data-action="setSelectionMode" data-selection-mode="box"><?php echo __('lbl_selection_box'); ?></button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setSelectionMode" data-selection-mode="lasso"><?php echo __('lbl_selection_lasso'); ?></button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setSelectionMode" data-selection-mode="wand"><?php echo __('lbl_selection_wand'); ?></button>
                                    </div>
                                </div>
                                <button type="button" class="component-button component-button--h32 component-button--full" data-action="clearSelection">
                                    <span class="material-symbols-rounded">close</span>
                                    <span><?php echo __('tooltip_deselect'); ?></span>
                                </button>
                            </div>

                            <!-- Section: Bucket -->
                            <div class="component-tool-settings-section disabled" data-sidebar-tool-section="offline_bucket">
                                <div class="component-tool-field">
                                    <span class="component-tool-field__label"><?php echo __('lbl_fill_mode'); ?></span>
                                    <div class="component-tool-segmented">
                                        <div class="component-tool-segmented-glider"></div>
                                        <button type="button" class="component-tool-segmented-btn active" data-action="setOfflineBucketMode" data-bucket-mode="flood">
                                            <span class="material-symbols-rounded">format_color_fill</span>
                                            <span><?php echo __('lbl_flood_fill'); ?></span>
                                        </button>
                                        <button type="button" class="component-tool-segmented-btn" data-action="setOfflineBucketMode" data-bucket-mode="swap">
                                            <span class="material-symbols-rounded">find_replace</span>
                                            <span><?php echo __('lbl_replace_color'); ?></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <div class="component-badge component-badge--dark component-badge--toolbar" data-ref="template-floating-toolbar">
                <button class="component-button component-button--icon component-button--h24" data-action="toggleTemplateLock" data-ref="btn-template-lock" data-tooltip="<?php echo __('tooltip_toggle_lock'); ?> [U]" data-position="top">
                    <span class="material-symbols-rounded">lock_open</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="rotateTemplate" data-ref="btn-template-rotate" data-tooltip="<?php echo __('tooltip_rotate_template'); ?>" data-position="top">
                    <span class="material-symbols-rounded">rotate_right</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="flipTemplateH" data-ref="btn-template-flip-h" data-tooltip="<?php echo __('tooltip_flip_h'); ?>" data-position="top">
                    <span class="material-symbols-rounded">flip</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="flipTemplateV" data-ref="btn-template-flip-v" data-tooltip="<?php echo __('tooltip_flip_v'); ?>" data-position="top">
                    <span class="material-symbols-rounded icon-rotate-90">flip</span>
                </button>
                <?php
                    $injectLock = \App\Core\System\SubscriptionFeatureConfig::getLockDetails($userTier ?? 0, 'feat_inject_templates', 'button');
                ?>
                <button class="component-button component-button--icon component-button--h24 <?php echo $injectLock['class']; ?>" data-action="injectTemplate" data-ref="btn-template-inject" data-tooltip="<?php echo __('tooltip_inject_template'); ?>" data-position="top" <?php echo $injectLock['attributes']; ?>>
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
                <input class="component-canvas-floating-text__input" data-ref="floating-text-input" name="floating-text-input" type="text" placeholder="<?php echo __('placeholder_text_input'); ?>" maxlength="60" />
                <button class="component-button component-button--icon component-button--h24" data-action="cyclePixelFont" data-ref="btn-text-font" data-tooltip="<?php echo __('lbl_font_family'); ?>" data-position="top">
                    <span class="material-symbols-rounded">font_download</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="cyclePixelTextScale" data-ref="btn-text-scale" data-tooltip="<?php echo __('lbl_text_scale'); ?> (1x)" data-position="top">
                    <span class="component-font-scale-tag" data-ref="text-scale-label">1x</span>
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

            <div class="component-badge component-badge--dark component-badge--toolbar disabled" data-ref="eraser-floating-toolbar">
                <button class="component-button component-button--icon component-button--h24 component-button--danger" data-action="executeOwnerClearArea" data-ref="btn-confirm-clear-area" data-tooltip="<?php echo __('btn_clear_area'); ?> [Enter / Supr]" data-position="top">
                    <span class="material-symbols-rounded">delete</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="cancelOwnerEraser" data-ref="btn-cancel-clear-area" data-tooltip="<?php echo __('btn_cancel'); ?> [Esc]" data-position="top">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>

            <div class="component-badge component-badge--dark component-badge--toolbar disabled" data-ref="move-area-floating-toolbar">
                <button class="component-button component-button--icon component-button--h24 component-button--success" data-action="commitMoveArea" data-tooltip="<?php echo __('btn_confirm_move'); ?> [Enter]" data-position="top">
                    <span class="material-symbols-rounded">check</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="floatSelection" data-tooltip="<?php echo __('btn_transform_selection'); ?>" data-position="top">
                    <span class="material-symbols-rounded">open_with</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="copySelection" data-tooltip="<?php echo __('btn_copy'); ?> [Ctrl+C]" data-position="top">
                    <span class="material-symbols-rounded">content_copy</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="cutSelection" data-tooltip="<?php echo __('btn_cut'); ?> [Ctrl+X]" data-position="top">
                    <span class="material-symbols-rounded">content_cut</span>
                </button>
                <button class="component-button component-button--icon component-button--h24 component-button--danger" data-action="deleteSelection" data-tooltip="<?php echo __('btn_delete_selection'); ?> [Supr]" data-position="top">
                    <span class="material-symbols-rounded">delete</span>
                </button>
                <button class="component-button component-button--icon component-button--h24" data-action="cancelMoveArea" data-tooltip="<?php echo __('btn_cancel'); ?> [Esc]" data-position="top">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>

            <div class="component-canvas-badges component-canvas-badges--left" data-ref="badges-left">
                <div class="component-badge" data-badge-id="coords" data-tooltip="<?php echo __('tooltip_coords'); ?>" data-position="right">
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
            
            <div class="component-canvas-badges component-canvas-badges--right" data-ref="badges-right"></div>
        </div>

        <div class="component-canvas-bottom-dock" data-ref="canvas-bottom-dock">
            <?php if (!$isSnapshot): ?>
            <div class="component-action-pill <?php echo ($isBlockedInit || $isSpectatorInit || $isSubscriptionLockedInit || empty($isOnlineActive)) ? 'disabled' : ''; ?>" data-ref="canvas-action-pill">
                <button class="component-button component-button--h45 disabled-interaction" data-action="placePixels" data-ref="pixel-action-btn">
                    <span class="material-symbols-rounded">touch_app</span>
                    <span data-ref="pixel-action-text"><?php echo __('btn_select_pixels'); ?></span>
                </button>
            </div>
            <?php endif; ?>

            <!-- 1. Floating Horizontal Drawing Tools Toolbar -->
            <?php if (!$isOnlineModeActive): 
                $offlineTools = \App\Core\System\OfflineToolsConfig::getTools();
            ?>
            <div class="component-tools-wrapper component-tools-wrapper--horizontal" data-ref="canvas-horizontal-tools-wrapper">
                <button type="button" class="component-tag-nav-btn component-tag-nav-btn--left disabled" data-action="scrollToolsLeft" data-tooltip="<?php echo __('btn_scroll_left'); ?>" data-position="top">
                    <span class="material-symbols-rounded">chevron_left</span>
                </button>

                <div class="component-toolbar component-toolbar--horizontal <?php echo $showDesignTools ? 'active' : 'disabled'; ?>" data-ref="offline-tools-horizontal">
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
                    <button class="component-button component-button--icon component-button--h32" <?php echo $actionAttr; ?><?php echo $refAttr; ?> data-tooltip="<?php echo htmlspecialchars($tooltipText); ?>" data-position="top">
                        <span class="material-symbols-rounded"><?php echo htmlspecialchars($tool['icon']); ?></span>
                    </button>
                    <?php endforeach; ?>

                    <div class="component-property-bar__divider"></div>

                    <!-- Primary & Secondary Color Buttons (Uniform 32px round buttons) -->
                    <button type="button" class="component-button component-button--icon component-button--h32 component-color-slot-btn active" data-action="selectActiveColorSlot" data-slot="primary" data-ref="swatch-primary" data-tooltip="<?php echo __('tooltip_primary_color'); ?>" data-position="top">
                        <span class="component-color-slot-indicator" data-ref="swatch-primary-dot"></span>
                    </button>

                    <button type="button" class="component-button component-button--icon component-button--h32 component-color-slot-btn" data-action="selectActiveColorSlot" data-slot="secondary" data-ref="swatch-secondary" data-tooltip="<?php echo __('tooltip_secondary_color'); ?>" data-position="top">
                        <span class="component-color-slot-indicator" data-ref="swatch-secondary-dot"></span>
                    </button>

                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="swapPrimarySecondaryColors" data-tooltip="<?php echo __('tooltip_swap_colors'); ?>" data-position="top">
                        <span class="material-symbols-rounded">swap_horiz</span>
                    </button>

                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="resetDefaultColors" data-tooltip="<?php echo __('tooltip_reset_colors'); ?>" data-position="top">
                        <span class="material-symbols-rounded">contrast</span>
                    </button>
                </div>

                <button type="button" class="component-tag-nav-btn component-tag-nav-btn--right disabled" data-action="scrollToolsRight" data-tooltip="<?php echo __('btn_scroll_right'); ?>" data-position="top">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>
            </div>
            <?php endif; ?>

            <!-- 2. Layers / Animation Bottom Carousel -->
            <?php if (!$isOnlineModeActive): ?>
            <div class="component-layers-carousel disabled" data-ref="layers-bottom-carousel">
                <div class="component-layers-carousel__track" data-ref="layers-carousel-track"></div>
            </div>
            <?php endif; ?>

            <!-- 3. Canvas Footer -->
            <div class="component-canvas-footer" data-ref="canvas-design-footer">
                <div class="component-canvas-footer-left" data-ref="canvas-design-footer-left">
                    <?php if (!$isOnlineModeActive): ?>
                    <div class="component-canvas-footer-tabs" data-ref="footer-carousel-tabs" data-mode="layers">
                        <div class="component-canvas-footer-tabs-glider" data-ref="footer-tabs-glider"></div>
                        <button type="button" class="component-canvas-footer-tab-btn active" data-action="setCarouselModeLayers" data-tooltip="<?php echo __('tooltip_layers'); ?>" data-position="top">
                            <span class="material-symbols-rounded">layers</span>
                            <span class="component-canvas-footer-tab-text"><?php echo __('tooltip_layers'); ?></span>
                        </button>
                        <button type="button" class="component-canvas-footer-tab-btn" data-action="setCarouselModeTimeline" data-tooltip="<?php echo __('lbl_timeline'); ?>" data-position="top">
                            <span class="material-symbols-rounded">movie</span>
                            <span class="component-canvas-footer-tab-text"><?php echo __('lbl_timeline'); ?></span>
                        </button>
                    </div>
                    <?php endif; ?>
                </div>

                <div class="component-canvas-footer-right" data-ref="canvas-design-footer-right">
                    <!-- 1. Controles de Zoom -->
                    <div class="component-canvas-footer-group">
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="zoomOutStep" data-tooltip="<?php echo __('lbl_zoom_out'); ?>" data-position="top">
                            <span class="material-symbols-rounded">remove</span>
                        </button>
                        <div class="component-canvas-footer-slider-box">
                            <input type="range" class="component-range component-range--zoom" data-ref="footer-zoom-slider" min="0" max="1000" step="1" value="400" />
                        </div>
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="zoomInStep" data-tooltip="<?php echo __('lbl_zoom_in'); ?>" data-position="top">
                            <span class="material-symbols-rounded">add</span>
                        </button>
                        <button type="button" class="component-canvas-footer-zoom-tag" data-action="resetZoomFit" data-ref="footer-zoom-label" data-tooltip="<?php echo __('lbl_reset_zoom'); ?>" data-position="top">
                            --%
                        </button>
                    </div>

                    <?php if (!$isOnlineModeActive): ?>
                    <!-- 2. Controles de Capas (Modo Capas) -->
                    <div class="component-canvas-footer-group" data-ref="footer-layers-controls">
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleLayersCarousel" data-ref="btn-footer-toggle-layers" data-tooltip="<?php echo __('tooltip_layers'); ?> [L]" data-position="top">
                            <span class="material-symbols-rounded">layers</span>
                        </button>
                        <div class="component-canvas-footer-layers-badge" data-ref="footer-layers-count" data-tooltip="<?php echo __('lbl_active_layer_count'); ?>" data-position="top">
                            1/1
                        </div>
                    </div>

                    <!-- 3. Controles de Animación (Modo Timeline) -->
                    <div class="component-canvas-footer-group disabled" data-ref="footer-anim-controls">
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="togglePlayAnimation" data-ref="btn-anim-play" data-tooltip="<?php echo __('lbl_play_animation'); ?>" data-position="top">
                            <span class="material-symbols-rounded">play_arrow</span>
                        </button>
                        <button type="button" class="component-canvas-footer-zoom-tag" data-action="cycleAnimationFps" data-ref="anim-fps-label" data-tooltip="<?php echo __('lbl_anim_speed'); ?>" data-position="top">
                            12 FPS
                        </button>
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleOnionSkin" data-ref="btn-anim-onion" data-tooltip="<?php echo __('lbl_onion_skin'); ?>" data-position="top">
                            <span class="material-symbols-rounded">animation</span>
                        </button>
                        <div class="component-canvas-footer-layers-badge" data-ref="footer-frames-count" data-tooltip="<?php echo __('lbl_active_frame_count'); ?>" data-position="top">
                            1/1
                        </div>
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="openExportAnimationModal" data-ref="btn-anim-export" data-tooltip="<?php echo __('lbl_export_animation_btn'); ?>" data-position="top">
                            <span class="material-symbols-rounded">file_download</span>
                        </button>
                    </div>
                    <?php endif; ?>

                    <!-- 4. Botón de Información / Ayuda a la derecha del todo -->
                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="openShortcutsHelp" data-ref="btn-footer-help" data-tooltip="<?php echo __('tooltip_shortcuts'); ?>" data-position="top">
                        <span class="material-symbols-rounded">info</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <?php if (!$isSnapshot): ?>
        <?php require_once __DIR__ . '/../../modules/moduleDesignTools.php'; ?>
        <?php require_once __DIR__ . '/../../modules/moduleLiveChat.php'; ?>
    <?php endif; ?>

</div>