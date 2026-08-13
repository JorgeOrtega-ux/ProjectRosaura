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
        this.selectedHours = '00';
        this.selectedMinutes = '00';

        if (!window.calendarInstances) {
            window.calendarInstances = {};
        }
        if (containerSelector && typeof containerSelector === 'string') {
            let moduleId = null;
            const match = containerSelector.match(/data-module=["']([^"']+)["']/);
            if (match) {
                moduleId = match[1];
            } else if (containerSelector.includes('moduleCalendarDateResize')) {
                moduleId = 'moduleCalendarDateResize';
            } else if (containerSelector.includes('moduleCalendarDate')) {
                moduleId = 'moduleCalendarDate';
            } else if (containerSelector.includes('inviteModuleCalendar')) {
                moduleId = 'inviteModuleCalendar';
            } else if (containerSelector.includes('adminModuleCalendar')) {
                moduleId = 'adminModuleCalendar';
            } else if (containerSelector.includes('sanctionModuleCalendar')) {
                moduleId = 'sanctionModuleCalendar';
            }
            if (moduleId) {
                window.calendarInstances[moduleId] = this;
            }
        }
        
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
                return document.querySelector(this.containerSelector) || null;
            }
            if (this.containerSelector instanceof HTMLElement || (typeof this.containerSelector === 'object' && this.containerSelector.querySelector)) {
                return this.containerSelector;
            }
        }
        return null;
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

        // Make sure this is mapped in window.calendarInstances
        const container = this.getContainer();
        if (container) {
            let moduleId = container.getAttribute('data-module');
            if (!moduleId) {
                const modEl = container.querySelector('[data-module]');
                if (modEl) moduleId = modEl.getAttribute('data-module');
            }
            if (moduleId) {
                if (!window.calendarInstances) window.calendarInstances = {};
                window.calendarInstances[moduleId] = this;
            }
        }

        if (initialDateStr) {
            const sanitizedDateStr = String(initialDateStr).replace(' ', 'T');
            let dateObj;
            if (sanitizedDateStr.includes('Z') || /[-+]\d{2}:?\d{2}$/.test(sanitizedDateStr)) {
                dateObj = new Date(sanitizedDateStr);
            } else {
                const parts = sanitizedDateStr.split('T');
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
                this.selectedHours = String(dateObj.getHours()).padStart(2, '0');
                this.selectedMinutes = String(dateObj.getMinutes()).padStart(2, '0');

                const hInput = container ? container.querySelector('[data-ref="calendar-hours"]') : null;
                const mInput = container ? container.querySelector('[data-ref="calendar-minutes"]') : null;
                if (hInput) hInput.value = this.selectedHours;
                if (mInput) mInput.value = this.selectedMinutes;
            } else {
                this.selectedDate = null;
                this.currentDate = new Date();
                this.selectedHours = '00';
                this.selectedMinutes = '00';
                const hInput = container ? container.querySelector('[data-ref="calendar-hours"]') : null;
                const mInput = container ? container.querySelector('[data-ref="calendar-minutes"]') : null;
                if (hInput) hInput.value = '00';
                if (mInput) mInput.value = '00';
            }
        } else {
            this.selectedDate = null;
            this.currentDate = new Date();
            this.selectedHours = '00';
            this.selectedMinutes = '00';
            
            const hInput = container ? container.querySelector('[data-ref="calendar-hours"]') : null;
            const mInput = container ? container.querySelector('[data-ref="calendar-minutes"]') : null;
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
        if (!container) return;
        
        if (!container.contains(e.target)) {
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
        if (!container || !container.contains(e.target)) return;

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
        if (!container) return;
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
        const hInput = container ? container.querySelector('[data-ref="calendar-hours"]') : null;
        const mInput = container ? container.querySelector('[data-ref="calendar-minutes"]') : null;
        
        const h = hInput ? hInput.value.padStart(2, '0') : (this.selectedHours || '00');
        const m = mInput ? mInput.value.padStart(2, '0') : (this.selectedMinutes || '00');
        
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
        const daysContainer = container ? container.querySelector('[data-ref="calendar-days"]') : null;
        if (daysContainer && window.appInstance) {
            const module = daysContainer.closest('.component-module');
            if (module) window.appInstance.closeModule(module);
        }
    }

    async openModal(initialVal = null, onConfirmCallback = null, onClearCallback = null) {
        const confirmCb = onConfirmCallback || this.onConfirm;
        const clearCb = onClearCallback || this.onClear;

        let hours = this.selectedHours || '00';
        let minutes = this.selectedMinutes || '00';
        let isoDate = '';
        let dateDisplay = '';

        const checkVal = initialVal || (this.selectedDate ? this.getFormattedDisplayDate(this.selectedDate, hours, minutes) : null);
        
        if (initialVal) {
            const sanitized = String(initialVal).replace(' ', 'T');
            const parts = sanitized.split('T');
            if (parts[0]) {
                const dateParts = parts[0].split('-');
                if (dateParts.length === 3) {
                    isoDate = parts[0];
                }
            }
            if (parts[1]) {
                const timeParts = parts[1].split(':');
                hours = (timeParts[0] || '00').padStart(2, '0');
                minutes = (timeParts[1] || '00').padStart(2, '0');
            }
        } else if (this.selectedDate) {
            isoDate = `${this.selectedDate.getFullYear()}-${String(this.selectedDate.getMonth() + 1).padStart(2, '0')}-${String(this.selectedDate.getDate()).padStart(2, '0')}`;
        }

        if (this.selectedDate) {
            dateDisplay = this.getFormattedDisplayDate(this.selectedDate, hours, minutes).split(',')[0];
        } else if (isoDate) {
            const ymd = isoDate.split('-');
            const tempDateObj = new Date(parseInt(ymd[0], 10), parseInt(ymd[1], 10) - 1, parseInt(ymd[2], 10));
            dateDisplay = this.getFormattedDisplayDate(tempDateObj, hours, minutes).split(',')[0];
        }

        let title = window.__('calendar_modal_title');
        let desc = window.__('calendar_modal_desc');

        if (this.containerSelector && typeof this.containerSelector === 'string') {
            if (this.containerSelector.includes('Resize') || this.containerSelector.includes('resize')) {
                title = window.__('calendar_modal_title_resize');
                desc = window.__('calendar_modal_desc_resize');
            } else if (this.containerSelector.includes('Reset') || this.containerSelector.includes('moduleCalendarDate')) {
                title = window.__('calendar_modal_title_reset');
                desc = window.__('calendar_modal_desc_reset');
            } else if (this.containerSelector.includes('invite')) {
                title = window.__('calendar_modal_title_invite');
                desc = window.__('calendar_modal_desc_invite');
            } else if (this.containerSelector.includes('admin')) {
                title = window.__('calendar_modal_title_admin');
                desc = window.__('calendar_modal_desc_admin');
            }
        }

        const res = await window.modalSystem.show('calendarModal', {
            title: title,
            description: desc,
            dateDisplay: dateDisplay || window.__('lbl_select_date'),
            hours: hours,
            minutes: minutes,
            isoDate: isoDate
        });

        if (res && res.confirmed) {
            const data = res.data || {};
            if (data.isoString) {
                const parts = data.isoString.split('T');
                const dateParts = parts[0].split('-');
                this.selectedDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
                this.selectedHours = data.isoString.split('T')[1].split(':')[0];
                this.selectedMinutes = data.isoString.split('T')[1].split(':')[1];

                if (confirmCb) {
                    confirmCb(data.isoString, data.displayString);
                }
            } else {
                this.selectedDate = null;
                this.selectedHours = '00';
                this.selectedMinutes = '00';
                if (clearCb) {
                    clearCb();
                }
            }
        }
    }
}