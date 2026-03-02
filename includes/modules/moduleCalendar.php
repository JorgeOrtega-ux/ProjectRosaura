<?php
// includes/modules/moduleCalendar.php
?>
<div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleCalendar">
    <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-calendar">
            
            <div class="component-calendar-header">
                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                    <span class="material-symbols-rounded">chevron_left</span>
                </button>
                <div class="component-calendar-title" id="calendar-title"><?php echo __('calendar_month_year'); ?></div>
                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>
            </div>

            <div class="component-calendar-weekdays">
                <span><?php echo __('cal_su'); ?></span><span><?php echo __('cal_mo'); ?></span><span><?php echo __('cal_tu'); ?></span><span><?php echo __('cal_we'); ?></span><span><?php echo __('cal_th'); ?></span><span><?php echo __('cal_fr'); ?></span><span><?php echo __('cal_sa'); ?></span>
            </div>

            <div class="component-calendar-days" id="calendar-days">
            </div>

            <div class="component-calendar-time">
                <div class="component-input-group component-input-group--h34">
                    <input type="number" id="calendar-hours" class="component-input-field component-input-field--simple" placeholder="HH" min="0" max="23" value="00">
                </div>
                <span>:</span>
                <div class="component-input-group component-input-group--h34">
                    <input type="number" id="calendar-minutes" class="component-input-field component-input-field--simple" placeholder="MM" min="0" max="59" value="00">
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