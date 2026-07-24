<?php
use App\Api\Services\Canvas\CanvasViewService;
use App\Core\System\SubscriptionPlanConstants;

$canvasService = new CanvasViewService();
$resizeData = $canvasService->getWorkspaceResizeData($_GET['uuid'] ?? null);

if (!empty($resizeData['error'])) {
    echo "<div class='view-content'><p>" . htmlspecialchars($resizeData['error']) . "</p></div>";
    return;
}

extract($resizeData);

$currWidth = (int)explode('x', $currentSizeRaw)[0];
$instantWidth = (int)explode('x', $instantSize)[0];
$showShrinkWarning = $instantWidth < $currWidth;

$scheduledWidth = (int)explode('x', $scheduledSize)[0];
$showScheduledShrinkWarning = $scheduledWidth < $currWidth;
$isOfficial = ($canvas['owner_id'] === null);
?>

<div class="view-content" data-ref="canvas-resize-wrapper" data-canvas-id="<?php echo htmlspecialchars((string)$canvasId); ?>" data-current-size="<?php echo htmlspecialchars($currentSizeRaw); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <div>
                <h1 class="component-top-title"><?php echo __('canvas_resize_title'); ?></h1>
            </div>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--primary component-button--h40" data-action="saveScheduledResize">
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
                <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
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
                                    <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSizeInstant">
                                        <span class="material-symbols-rounded" data-ref="instant-resize-icon"><?php echo htmlspecialchars($instantMeta['icon']); ?></span>
                                        <span class="component-dropdown-text" data-ref="text-size-instant"><?php echo htmlspecialchars($instantMeta['label']); ?></span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>

                                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSizeInstant">
                                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list component-menu-list--scrollable">
                                                <?php foreach ($sizesList as $val => $data): 
                                                    $requiredTier = $data['tier'] ?? 0;
                                                    $isAllowed = $isOfficial ? $canManageOfficial : ($ownerTier >= $requiredTier);
                                                    $disabledClass = $isAllowed ? '' : 'disabled-interaction';
                                                    $action = $isAllowed ? 'selectValue' : '';
                                                    $tierName = SubscriptionPlanConstants::getTierName($requiredTier);
                                                    $lockIcon = $isAllowed ? '' : '<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ' . htmlspecialchars($tierName) . '</span>';
                                                    $activeClass = ((string)$instantSize === (string)$val && $isAllowed) ? 'active' : '';
                                                ?>
                                                <div class="component-menu-link <?php echo $activeClass; ?> <?php echo $disabledClass; ?>"
                                                     data-action="<?php echo $action; ?>"
                                                     data-type="size_instant"
                                                     data-value="<?php echo htmlspecialchars((string)$val); ?>"
                                                     data-label="<?php echo htmlspecialchars($data['label']); ?>"
                                                     data-icon="<?php echo htmlspecialchars($data['icon']); ?>"
                                                     <?php if(!$isAllowed) echo 'title="' . __('tooltip_upgrade_required') . '"'; ?>>
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

                        <div class="component-group-item component-group-item--wrap">
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
                <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
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

                        <div class="component-group-item component-group-item--wrap">
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
                                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSizeScheduled">
                                            <span class="material-symbols-rounded" data-ref="scheduled-resize-icon"><?php echo htmlspecialchars($scheduledMeta['icon']); ?></span>
                                            <span class="component-dropdown-text" data-ref="text-size-scheduled"><?php echo htmlspecialchars($scheduledMeta['label']); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>

                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSizeScheduled">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <?php foreach ($sizesList as $val => $data): 
                                                        $requiredTier = $data['tier'] ?? 0;
                                                        $isAllowed = $isOfficial ? $canManageOfficial : ($ownerTier >= $requiredTier);
                                                        $disabledClass = $isAllowed ? '' : 'disabled-interaction';
                                                        $action = $isAllowed ? 'selectValue' : '';
                                                        $tierName = SubscriptionPlanConstants::getTierName($requiredTier);
                                                     $lockIcon = $isAllowed ? '' : '<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ' . htmlspecialchars($tierName) . '</span>';
                                                        $activeClass = ((string)$scheduledSize === (string)$val && $isAllowed) ? 'active' : '';
                                                    ?>
                                                    <div class="component-menu-link <?php echo $activeClass; ?> <?php echo $disabledClass; ?>"
                                                         data-action="<?php echo $action; ?>"
                                                         data-type="size_scheduled"
                                                         data-value="<?php echo htmlspecialchars((string)$val); ?>"
                                                         data-label="<?php echo htmlspecialchars($data['label']); ?>"
                                                         data-icon="<?php echo htmlspecialchars($data['icon']); ?>"
                                                         <?php if(!$isAllowed) echo 'title="' . __('tooltip_upgrade_required') . '"'; ?>>
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
                                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="moduleCalendarDateResize">
                                            <span class="material-symbols-rounded">calendar_month</span>
                                            <span class="component-dropdown-text" data-ref="resize-date-text"><?php echo htmlspecialchars($resizeDateDisplay); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        
                                        <input type="hidden" data-ref="next_resize_at" value="<?php echo htmlspecialchars($resizeDateLocal); ?>">

                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleCalendarDateResize">
                                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                
                                                <div data-ref="resizeCalendarWrapper" class="component-calendar">
                                                    <div class="component-calendar-header">
                                                        <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                                            <span class="material-symbols-rounded">chevron_left</span>
                                                        </button>
                                                        <div class="component-calendar-title" data-ref="calendar-title"></div>
                                                        <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                                            <span class="material-symbols-rounded">chevron_right</span>
                                                        </button>
                                                    </div>

                                                    <div class="component-calendar-weekdays">
                                                        <span><?php echo __('cal_su'); ?></span>
                                                        <span><?php echo __('cal_mo'); ?></span>
                                                        <span><?php echo __('cal_tu'); ?></span>
                                                        <span><?php echo __('cal_we'); ?></span>
                                                        <span><?php echo __('cal_th'); ?></span>
                                                        <span><?php echo __('cal_fr'); ?></span>
                                                        <span><?php echo __('cal_sa'); ?></span>
                                                    </div>

                                                    <div class="component-calendar-days" data-ref="calendar-days"></div>

                                                    <div class="component-calendar-time">
                                                        <div class="component-input-group component-input-group--h34">
                                                            <input type="number" data-ref="calendar-hours" class="component-input-field component-input-field--simple" placeholder="<?php echo __('cal_placeholder_hh'); ?>" min="0" max="23" value="00">
                                                        </div>
                                                        <span>:</span>
                                                        <div class="component-input-group component-input-group--h34">
                                                            <input type="number" data-ref="calendar-minutes" class="component-input-field component-input-field--simple" placeholder="<?php echo __('cal_placeholder_mm'); ?>" min="0" max="59" value="00">
                                                        </div>
                                                    </div>

                                                    <div class="component-calendar-actions">
                                                        <button type="button" class="component-button component-button--h30" data-action="calendarClear"><?php echo __('btn_clear'); ?></button>
                                                        <div>
                                                            <button type="button" class="component-button component-button--h30" data-action="calendarCancel"><?php echo __('btn_cancel'); ?></button>
                                                            <button type="button" class="component-button component-button--h30 component-button--dark" data-action="calendarConfirm"><?php echo __('btn_accept'); ?></button>
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
                </div>
            </div>

        </div>
    </div>
</div>
