import { showMessage } from '../utils/uiUtils.js';

export class CalendarSystem {
    constructor(containerSelector = null) {
        this.containerSelector = containerSelector;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.onConfirm = null;
        this.onClear = null;
        this.initialized = false;
        this.disablePastDates = false;
        
        this.monthsStr = [
            __('month_january'), __('month_february'), __('month_march'), __('month_april'),
            __('month_may'), __('month_june'), __('month_july'), __('month_august'),
            __('month_september'), __('month_october'), __('month_november'), __('month_december')
        ];
        this.monthsShortStr = [
            __('month_short_jan'), __('month_short_feb'), __('month_short_mar'), __('month_short_apr'),
            __('month_short_may'), __('month_short_jun'), __('month_short_jul'), __('month_short_aug'),
            __('month_short_sep'), __('month_short_oct'), __('month_short_nov'), __('month_short_dec')
        ];

        this.handleClickBound = this.handleClick.bind(this);
        this.handleFocusOutBound = this.handleFocusOut.bind(this);
    }

    getContainer() {
        if (this.containerSelector) {
            if (typeof this.containerSelector === 'string') {
                return document.querySelector(this.containerSelector) || document;
            }
            if (this.containerSelector instanceof HTMLElement || (typeof this.containerSelector === 'object' && this.containerSelector.querySelector)) {
                return this.containerSelector;
            }
        }
        return document;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
    }

    destroy() {
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('focusout', this.handleFocusOutBound);
        this.initialized = false;
    }

    setup(initialDateStr, onConfirmCallback, onClearCallback) {
        this.onConfirm = onConfirmCallback;
        this.onClear = onClearCallback;

        if (initialDateStr) {
            let dateObj;
            if (initialDateStr.includes('Z') || /[-+]\d{2}:?\d{2}$/.test(initialDateStr)) {
                dateObj = new Date(initialDateStr);
            } else {
                const parts = initialDateStr.split('T');
                const dateParts = parts[0].split('-');
                const timeParts = parts[1] ? parts[1].split(':') : ['00', '00'];
                dateObj = new Date(
                    parseInt(dateParts[0], 10),
                    parseInt(dateParts[1], 10) - 1,
                    parseInt(dateParts[2], 10),
                    parseInt(timeParts[0], 10),
                    parseInt(timeParts[1], 10)
                );
            }

            if (!isNaN(dateObj.getTime())) {
                this.selectedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                this.currentDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

                const container = this.getContainer();
                const hInput = container.querySelector('[data-ref="calendar-hours"]');
                const mInput = container.querySelector('[data-ref="calendar-minutes"]');
                if (hInput) hInput.value = String(dateObj.getHours()).padStart(2, '0');
                if (mInput) mInput.value = String(dateObj.getMinutes()).padStart(2, '0');
            } else {
                this.selectedDate = null;
                this.currentDate = new Date();
                const container = this.getContainer();
                const hInput = container.querySelector('[data-ref="calendar-hours"]');
                const mInput = container.querySelector('[data-ref="calendar-minutes"]');
                if (hInput) hInput.value = '00';
                if (mInput) mInput.value = '00';
            }
        } else {
            this.selectedDate = null;
            this.currentDate = new Date();
            
            const container = this.getContainer();
            const hInput = container.querySelector('[data-ref="calendar-hours"]');
            const mInput = container.querySelector('[data-ref="calendar-minutes"]');
            if (hInput) hInput.value = '00';
            if (mInput) mInput.value = '00';
        }

        this.render();
    }

    bindEvents() {
        
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('focusout', this.handleFocusOutBound);
    }

    handleClick(e) {
        const container = this.getContainer();
        
        if (container !== document && !container.contains(e.target)) {
            return;
        }

        const btnPrev = e.target.closest('[data-action="calendarPrevMonth"]');
        const btnNext = e.target.closest('[data-action="calendarNextMonth"]');
        const btnDay = e.target.closest('[data-action="calendarSelectDay"]');
        const btnConfirm = e.target.closest('[data-action="calendarConfirm"]');
        const btnClear = e.target.closest('[data-action="calendarClear"]');
        const btnCancel = e.target.closest('[data-action="calendarCancel"]');

        if (btnPrev && container.contains(btnPrev)) this.changeMonth(-1);
        if (btnNext && container.contains(btnNext)) this.changeMonth(1);
        if (btnDay && container.contains(btnDay)) this.selectDay(btnDay);
        if (btnConfirm && container.contains(btnConfirm)) this.confirm();
        if (btnClear && container.contains(btnClear)) this.clear();
        if (btnCancel && container.contains(btnCancel)) this.cancel();
    }

    handleFocusOut(e) {
        const container = this.getContainer();
        if (container !== document && !container.contains(e.target)) return;

        if (e.target.getAttribute('data-ref') === 'calendar-hours') {
            let val = parseInt(e.target.value) || 0;
            if (val < 0) val = 0;
            if (val > 23) val = 23;
            e.target.value = String(val).padStart(2, '0');
        }
        if (e.target.getAttribute('data-ref') === 'calendar-minutes') {
            let val = parseInt(e.target.value) || 0;
            if (val < 0) val = 0;
            if (val > 59) val = 59;
            e.target.value = String(val).padStart(2, '0');
        }
    }

    render() {
        const container = this.getContainer();
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const title = container.querySelector('[data-ref="calendar-title"]');
        if (title) title.textContent = `${this.monthsStr[month]} ${year}`;
        
        const daysContainer = container.querySelector('[data-ref="calendar-days"]');
        if (!daysContainer) return;
        daysContainer.innerHTML = '';
        
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            daysContainer.innerHTML += `<button type="button" class="component-calendar-day muted" disabled>${dayNum}</button>`;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= daysInMonth; i++) {
            let isSelected = false;
            if (this.selectedDate && 
                this.selectedDate.getDate() === i && 
                this.selectedDate.getMonth() === month && 
                this.selectedDate.getFullYear() === year) {
                isSelected = true;
            }

            let isPast = false;
            if (this.disablePastDates) {
                const cellDate = new Date(year, month, i);
                if (cellDate < today) {
                    isPast = true;
                }
            }

            let cls = isSelected ? 'component-calendar-day active' : 'component-calendar-day';
            let attrs = '';
            if (isPast) {
                cls += ' muted';
                attrs = ' disabled';
            }
            daysContainer.innerHTML += `<button type="button" class="${cls}" data-action="calendarSelectDay" data-day="${i}"${attrs}>${i}</button>`;
        }
        
        const totalCells = firstDay + daysInMonth;
        const nextDays = Math.ceil(totalCells / 7) * 7 - totalCells;
        for (let i = 1; i <= nextDays; i++) {
            daysContainer.innerHTML += `<button type="button" class="component-calendar-day muted" disabled>${i}</button>`;
        }
    }

    changeMonth(dir) {
        this.currentDate.setMonth(this.currentDate.getMonth() + dir);
        this.render();
    }

    selectDay(btn) {
        const day = parseInt(btn.getAttribute('data-day'));
        this.selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        this.render();
    }

    getFormattedDisplayDate(dateObj, h = null, m = null) {
        if (!dateObj || isNaN(dateObj.getTime())) return '';
        const d = dateObj.getDate();
        const mStr = this.monthsShortStr[dateObj.getMonth()];
        const y = dateObj.getFullYear();
        const hrs = h !== null ? String(h).padStart(2, '0') : String(dateObj.getHours()).padStart(2, '0');
        const mins = m !== null ? String(m).padStart(2, '0') : String(dateObj.getMinutes()).padStart(2, '0');
        return `${d} de ${mStr} ${y}, ${hrs}:${mins}`;
    }

    confirm() {
        if (!this.selectedDate) {
            showMessage(window.__('err_select_day'), 'error');
            return;
        }
        
        const container = this.getContainer();
        const hInput = container.querySelector('[data-ref="calendar-hours"]');
        const mInput = container.querySelector('[data-ref="calendar-minutes"]');
        
        const h = hInput ? hInput.value.padStart(2, '0') : '00';
        const m = mInput ? mInput.value.padStart(2, '0') : '00';
        
        const y = this.selectedDate.getFullYear();
        const mo = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(this.selectedDate.getDate()).padStart(2, '0');
        
        // Validar si la fecha seleccionada con hora es al menos 5 minutos al futuro si disablePastDates está activo
        if (this.disablePastDates) {
            const selectedDateTime = new Date(y, this.selectedDate.getMonth(), parseInt(d, 10), parseInt(h, 10), parseInt(m, 10));
            const now = new Date();
            const minFuture = new Date(now.getTime() + 5 * 60 * 1000);
            if (selectedDateTime < minFuture) {
                showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha programada debe tener un margen mínimo de 5 minutos al futuro.', 'error');
                return;
            }
        }

        const isoString = `${y}-${mo}-${d}T${h}:${m}`;
        const displayString = this.getFormattedDisplayDate(this.selectedDate, h, m);
        
        if (this.onConfirm) this.onConfirm(isoString, displayString);
        this.closeModule();
    }

    clear() {
        this.selectedDate = null;
        this.render();
        if (this.onClear) this.onClear();
        this.closeModule();
    }

    cancel() {
        this.closeModule();
    }

    closeModule() {
        const container = this.getContainer();
        const daysContainer = container.querySelector('[data-ref="calendar-days"]');
        if (daysContainer && window.appInstance) {
            const module = daysContainer.closest('.component-module');
            if (module) window.appInstance.closeModule(module);
        }
    }
}