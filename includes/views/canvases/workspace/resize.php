<?php
use App\Api\Services\Canvas\CanvasViewService;
use App\Core\System\SubscriptionPlanConstants;

$canvasService = new CanvasViewService();
$resizeData = $canvasService->getWorkspaceResizeData($_GET['uuid'] ?? null);

if (!empty($resizeData['error'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($resizeData);

$currWidth = (int)explode('x', $currentSizeRaw)[0];
$instantWidth = (int)explode('x', $instantSize)[0];
$showShrinkWarning = $instantWidth < $currWidth;

$scheduledWidth = (int)explode('x', $scheduledSize)[0];
$showScheduledShrinkWarning = $scheduledWidth < $currWidth;
$isOfficial = ($canvas['owner_id'] === null);
$currentCanvasTier = (int)($sizesList[$currentSizeRaw]['tier'] ?? 0);
?>

<div class="view-content" data-ref="canvas-resize-wrapper" data-canvas-id="<?php echo htmlspecialchars((string)$canvasId); ?>" data-current-size="<?php echo htmlspecialchars($currentSizeRaw); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('canvas_resize_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--h40" data-action="saveScheduledResize">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes'); ?>
            </button>
        </div>
    </div>

    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('canvas_resize_title'); ?></h1>
                <p class="component-page-description"><?php echo __('canvas_resize_desc'); ?></p>
            </div>

            <!-- ACCORDION 1: INSTANT RESIZE -->
            <div class="component-card--grouped component-accordion active">
                <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">flash_on</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('canvas_resize_now_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_resize_now_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content">

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_resize_instant_size_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('canvas_resize_instant_size_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start component-card__actions--column">
                                <div class="component-dropdown-wrapper">
                                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownSizeInstant">
                                        <span class="material-symbols-rounded" data-ref="instant-resize-icon"><?php echo htmlspecialchars($instantMeta['icon']); ?></span>
                                        <span class="component-dropdown-text" data-ref="text-size-instant"><?php echo htmlspecialchars($instantMeta['label']); ?></span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>

                                    <div class="component-module component-module--dropdown disabled" data-module="dropdownSizeInstant">
                                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list">
                                                <?php foreach ($sizesList as $val => $data): 
                                                    $requiredTier = $data['tier'] ?? 0;
                                                    $isTierAllowed = $isOfficial ? false : ($ownerTier >= $requiredTier);
                                                    $isUltraCapped = (!$isOfficial && $currentCanvasTier < 3 && $requiredTier >= 3 && ($tier3CanvasesCount ?? 0) >= ($maxTier3Canvases ?? 3));
                                                    $isAllowed = $isTierAllowed && !$isUltraCapped;
                                                    $disabledClass = $isAllowed ? '' : 'disabled-interaction';
                                                    $action = $isAllowed ? 'selectValue' : '';
                                                    $tierName = SubscriptionPlanConstants::getTierName($requiredTier);
                                                    
                                                    if ($isUltraCapped && $isTierAllowed) {
                                                        $lockIcon = '<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">block</span> ' . ($tier3CanvasesCount ?? 3) . '/' . ($maxTier3Canvases ?? 3) . ' Ultra</span>';
                                                        $titleAttr = 'title="' . htmlspecialchars(__('tooltip_ultra_limit_reached')) . '"';
                                                    } elseif (!$isTierAllowed) {
                                                        $lockIcon = '<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ' . htmlspecialchars($tierName) . '</span>';
                                                        $titleAttr = 'title="' . htmlspecialchars(__('tooltip_upgrade_required')) . '"';
                                                    } else {
                                                        $lockIcon = '';
                                                        $titleAttr = '';
                                                    }
                                                    $activeClass = ((string)$instantSize === (string)$val && $isAllowed) ? 'active' : '';
                                                ?>
                                                <div class="component-menu-link <?php echo $activeClass; ?> <?php echo $disabledClass; ?>"
                                                     data-action="<?php echo $action; ?>"
                                                     data-type="size_instant"
                                                     data-value="<?php echo htmlspecialchars((string)$val); ?>"
                                                     data-label="<?php echo htmlspecialchars($data['label']); ?>"
                                                     data-icon="<?php echo htmlspecialchars($data['icon']); ?>"
                                                     <?php echo $titleAttr; ?>>
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($data['icon']); ?></span></div>
                                                    <div class="component-menu-link-text">
                                                        <span><?php echo htmlspecialchars($data['label']); ?></span>
                                                    </div>
                                                    <?php echo $lockIcon; ?>
                                                </div>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="component-alert-error<?php echo $showShrinkWarning ? ' active' : ''; ?>" data-ref="resize-shrink-warning">
                                    <?php echo __('canvas_resize_warning_desc'); ?>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_resize_now_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('canvas_resize_now_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <button type="button" class="component-button component-button--danger component-button--h40" data-action="applyResizeNow">
                                    <span class="material-symbols-rounded">flash_on</span>
                                    <?php echo __('btn_apply_now'); ?>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- ACCORDION 2: PROGRAMMED RESIZE -->
            <div class="component-card--grouped component-accordion">
                <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">schedule</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('canvas_resize_active_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_resize_active_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content">

                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_resize_active_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('canvas_resize_active_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" data-ref="toggleScheduledResize" <?php echo $isResizeActive ? 'checked' : ''; ?>>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div data-ref="resize_options_container" class="<?php echo $isResizeActive ? '' : 'disabled-interaction'; ?>">
                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('canvas_resize_size_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('canvas_resize_size_scheduled_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start component-card__actions--column">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownSizeScheduled">
                                            <span class="material-symbols-rounded" data-ref="scheduled-resize-icon"><?php echo htmlspecialchars($scheduledMeta['icon']); ?></span>
                                            <span class="component-dropdown-text" data-ref="text-size-scheduled"><?php echo htmlspecialchars($scheduledMeta['label']); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>

                                        <div class="component-module component-module--dropdown disabled" data-module="dropdownSizeScheduled">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list">
                                                    <?php foreach ($sizesList as $val => $data): 
                                                        $requiredTier = $data['tier'] ?? 0;
                                                        $isTierAllowed = $isOfficial ? false : ($ownerTier >= $requiredTier);
                                                        $isUltraCapped = (!$isOfficial && $currentCanvasTier < 3 && $requiredTier >= 3 && ($tier3CanvasesCount ?? 0) >= ($maxTier3Canvases ?? 3));
                                                        $isAllowed = $isTierAllowed && !$isUltraCapped;
                                                        $disabledClass = $isAllowed ? '' : 'disabled-interaction';
                                                        $action = $isAllowed ? 'selectValue' : '';
                                                        $tierName = SubscriptionPlanConstants::getTierName($requiredTier);
                                                        
                                                        if ($isUltraCapped && $isTierAllowed) {
                                                            $lockIcon = '<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">block</span> ' . ($tier3CanvasesCount ?? 3) . '/' . ($maxTier3Canvases ?? 3) . ' Ultra</span>';
                                                            $titleAttr = 'title="' . htmlspecialchars(__('tooltip_ultra_limit_reached')) . '"';
                                                        } elseif (!$isTierAllowed) {
                                                            $lockIcon = '<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ' . htmlspecialchars($tierName) . '</span>';
                                                            $titleAttr = 'title="' . htmlspecialchars(__('tooltip_upgrade_required')) . '"';
                                                        } else {
                                                            $lockIcon = '';
                                                            $titleAttr = '';
                                                        }
                                                        $activeClass = ((string)$scheduledSize === (string)$val && $isAllowed) ? 'active' : '';
                                                    ?>
                                                    <div class="component-menu-link <?php echo $activeClass; ?> <?php echo $disabledClass; ?>"
                                                         data-action="<?php echo $action; ?>"
                                                         data-type="size_scheduled"
                                                         data-value="<?php echo htmlspecialchars((string)$val); ?>"
                                                         data-label="<?php echo htmlspecialchars($data['label']); ?>"
                                                         data-icon="<?php echo htmlspecialchars($data['icon']); ?>"
                                                         <?php echo $titleAttr; ?>>
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($data['icon']); ?></span></div>
                                                        <div class="component-menu-link-text">
                                                            <span><?php echo htmlspecialchars($data['label']); ?></span>
                                                        </div>
                                                        <?php echo $lockIcon; ?>
                                                    </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="component-alert-error<?php echo $showScheduledShrinkWarning ? ' active' : ''; ?>" data-ref="resize-scheduled-shrink-warning">
                                        <?php echo __('canvas_resize_warning_desc'); ?>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('canvas_resize_date_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('canvas_resize_date_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="openCalendarModal" data-target="moduleCalendarDateResize">
                                            <span class="material-symbols-rounded">calendar_month</span>
                                            <span class="component-dropdown-text" data-ref="resize-date-text"><?php echo htmlspecialchars($resizeDateDisplay); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        
                                        <div data-ref="next_resize_at" data-value="<?php echo htmlspecialchars($resizeDateLocal); ?>"></div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>

        </div>
    </div>
</div>
