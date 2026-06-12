// public/assets/js/core/components/CalendarSystem.js
import { showMessage } from '../utils/uiUtils.js';

export class CalendarSystem {
    constructor(containerSelector = null) {
        this.containerSelector = containerSelector;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.onConfirm = null;
        this.onClear = null;
        this.initialized = false;
        
        this.monthsStr = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        this.monthsShortStr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // REGLA 1: Bindings obligatorios
        this.handleClickBound = this.handleClick.bind(this);
        this.handleFocusOutBound = this.handleFocusOut.bind(this);
    }

    getContainer() {
        if (this.containerSelector) {
            return document.querySelector(this.containerSelector) || document;
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
            const parts = initialDateStr.split('T');
            const dateParts = parts[0].split('-');
            const timeParts = parts[1] ? parts[1].split(':') : ['00', '00'];
            
            this.selectedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            this.currentDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

            const container = this.getContainer();
            const hInput = container.querySelector('[data-ref="calendar-hours"]');
            const mInput = container.querySelector('[data-ref="calendar-minutes"]');
            if (hInput) hInput.value = timeParts[0];
            if (mInput) mInput.value = timeParts[1];
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
        // REGLA 3: Delegación Global Pura
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('focusout', this.handleFocusOutBound);
    }

    handleClick(e) {
        const container = this.getContainer();
        // Ignorar clicks que no provengan de la instancia específica de este calendario
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
        
        for (let i = 1; i <= daysInMonth; i++) {
            let isSelected = false;
            if (this.selectedDate && 
                this.selectedDate.getDate() === i && 
                this.selectedDate.getMonth() === month && 
                this.selectedDate.getFullYear() === year) {
                isSelected = true;
            }
            const cls = isSelected ? 'component-calendar-day active' : 'component-calendar-day';
            daysContainer.innerHTML += `<button type="button" class="${cls}" data-action="calendarSelectDay" data-day="${i}">${i}</button>`;
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

    confirm() {
        if (!this.selectedDate) {
            // REGLA 5: Sin native alerts
            showMessage('Selecciona un día en el calendario.', 'error');
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
        
        const isoString = `${y}-${mo}-${d}T${h}:${m}`;
        const displayString = `${this.selectedDate.getDate()} de ${this.monthsShortStr[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}, ${h}:${m}`;
        
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