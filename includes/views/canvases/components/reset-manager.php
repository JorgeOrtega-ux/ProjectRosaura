<?php
// includes/views/canvases/components/reset-manager.php
if (session_status() === PHP_SESSION_NONE) session_start();

$canvasId = isset($_GET['id']) ? (int)$_GET['id'] : null;
if (!$canvasId) {
    echo "<div class='view-content'><p>" . __('err_invalid_canvas_id') . "</p></div>";
    return;
}
$appUrl = defined('APP_URL') ? APP_URL : '';
?>
<div class="view-content" data-ref="canvas-resets-wrapper" data-canvas-id="<?php echo $canvasId; ?>">
    
    <div class="component-top">
        <div class="component-top-left" style="display: flex; align-items: center; gap: 16px;">
            <a href="<?php echo $appUrl; ?>/canvases/manage" class="component-button component-button--icon component-button--h40" data-nav>
                <span class="material-symbols-rounded">arrow_back</span>
            </a>
            <div>
                <h1 class="component-top-title"><?php echo __('canvas_resets_title'); ?></h1>
            </div>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--primary component-button--h40" data-action="saveSettings">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes'); ?>
            </button>
        </div>
    </div>

    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('canvas_resets_title'); ?></h1>
                <p class="component-page-description"><?php echo __('canvas_resets_desc'); ?></p>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('canvas_reset_active_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_reset_active_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" data-ref="reset_is_active" data-action="toggleActive">
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div data-ref="reset_options_container" class="disabled-interactive" style="transition: opacity 0.3s ease; opacity: 0.4;">
                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_reset_date_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_reset_date_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="moduleCalendarDate">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="component-dropdown-text" data-ref="reset-date-text"><?php echo __('lbl_select_date') ?? 'Seleccionar fecha'; ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                
                                <input type="hidden" data-ref="next_reset_at" value="">

                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleCalendarDate">
                                    <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        
                                        <div class="component-calendar">
                                            <div class="component-calendar-header">
                                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                                    <span class="material-symbols-rounded">chevron_left</span>
                                                </button>
                                                <div class="component-calendar-title" data-ref="calendar-title">...</div>
                                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                                    <span class="material-symbols-rounded">chevron_right</span>
                                                </button>
                                            </div>

                                            <div class="component-calendar-weekdays">
                                                <span><?php echo __('cal_su') ?? 'Do'; ?></span>
                                                <span><?php echo __('cal_mo') ?? 'Lu'; ?></span>
                                                <span><?php echo __('cal_tu') ?? 'Ma'; ?></span>
                                                <span><?php echo __('cal_we') ?? 'Mi'; ?></span>
                                                <span><?php echo __('cal_th') ?? 'Ju'; ?></span>
                                                <span><?php echo __('cal_fr') ?? 'Vi'; ?></span>
                                                <span><?php echo __('cal_sa') ?? 'Sa'; ?></span>
                                            </div>

                                            <div class="component-calendar-days" data-ref="calendar-days"></div>

                                            <div class="component-calendar-time">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="number" data-ref="calendar-hours" class="component-input-field component-input-field--simple" placeholder="<?php echo __('cal_placeholder_hh') ?? 'HH'; ?>" min="0" max="23" value="00">
                                                </div>
                                                <span>:</span>
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="number" data-ref="calendar-minutes" class="component-input-field component-input-field--simple" placeholder="<?php echo __('cal_placeholder_mm') ?? 'MM'; ?>" min="0" max="59" value="00">
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

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_reset_snapshot_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_reset_snapshot_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="take_snapshot" checked>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_reset_timer_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_reset_timer_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="moduleTimerAction">
                                    <span class="material-symbols-rounded" data-ref="icon-timer">timer</span>
                                    <span class="component-dropdown-text" data-ref="text-timer"><?php echo __('canvas_reset_timer_restart'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                
                                <input type="hidden" data-ref="timer_action" value="restart">

                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleTimerAction">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            
                                            <div class="component-menu-link active" data-action="selectTimerAction" data-value="restart" data-label="<?php echo __('canvas_reset_timer_restart'); ?>" data-icon="timer">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_reset_timer_restart'); ?></span></div>
                                            </div>
                                            
                                            <div class="component-menu-link" data-action="selectTimerAction" data-value="stop" data-label="<?php echo __('canvas_reset_timer_stop'); ?>" data-icon="stop_circle">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">stop_circle</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_reset_timer_stop'); ?></span></div>
                                            </div>
                                            
                                            <div class="component-menu-link" data-action="selectTimerAction" data-value="none" data-label="<?php echo __('canvas_reset_timer_hide'); ?>" data-icon="visibility_off">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">visibility_off</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_reset_timer_hide'); ?></span></div>
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