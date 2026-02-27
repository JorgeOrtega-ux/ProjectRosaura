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
                <div class="component-calendar-title" id="calendar-title">Mes Año</div>
                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>
            </div>

            <div class="component-calendar-weekdays">
                <span>Do</span><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span>
            </div>

            <div class="component-calendar-days" id="calendar-days">
                </div>

            <div class="component-calendar-time">
                <div class="component-input-group component-input-group--h34" style="width: 70px;">
                    <input type="number" id="calendar-hours" class="component-input-field component-input-field--simple" placeholder="HH" min="0" max="23" value="00">
                </div>
                <span>:</span>
                <div class="component-input-group component-input-group--h34" style="width: 70px;">
                    <input type="number" id="calendar-minutes" class="component-input-field component-input-field--simple" placeholder="MM" min="0" max="59" value="00">
                </div>
            </div>

            <div class="component-calendar-actions">
                <button type="button" class="component-button component-button--h30" data-action="calendarClear">Limpiar</button>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="component-button component-button--h30" data-action="calendarCancel">Cancelar</button>
                    <button type="button" class="component-button component-button--h30 component-button--dark" data-action="calendarConfirm">Aceptar</button>
                </div>
            </div>

        </div>

    </div>
</div>