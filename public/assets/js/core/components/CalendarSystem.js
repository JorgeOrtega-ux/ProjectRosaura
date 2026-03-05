// public/assets/js/core/calendar-system.js

export class CalendarSystem {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.onConfirm = null;
        this.onClear = null;
        this.initialized = false;
        
        this.monthsStr = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        this.monthsShortStr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
    }

    /**
     * Configura y renderiza el calendario. Debe llamarse justo antes de abrir el menú desplegable.
     * @param {string} initialDateStr Fecha inicial en formato "YYYY-MM-DDTHH:mm" (opcional)
     * @param {function} onConfirmCallback Función que recibe (isoString, displayString)
     * @param {function} onClearCallback Función que se ejecuta al limpiar el calendario
     */
    setup(initialDateStr, onConfirmCallback, onClearCallback) {
        this.onConfirm = onConfirmCallback;
        this.onClear = onClearCallback;

        if (initialDateStr) {
            const parts = initialDateStr.split('T');
            const dateParts = parts[0].split('-');
            const timeParts = parts[1] ? parts[1].split(':') : ['00', '00'];
            
            this.selectedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            this.currentDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

            const hInput = document.querySelector('[data-ref="calendar-hours"]');
            const mInput = document.querySelector('[data-ref="calendar-minutes"]');
            if (hInput) hInput.value = timeParts[0];
            if (mInput) mInput.value = timeParts[1];
        } else {
            this.selectedDate = null;
            this.currentDate = new Date();
            
            const hInput = document.querySelector('[data-ref="calendar-hours"]');
            const mInput = document.querySelector('[data-ref="calendar-minutes"]');
            if (hInput) hInput.value = '00';
            if (mInput) mInput.value = '00';
        }

        this.render();
    }

    bindEvents() {
        // Eventos de click genéricos para el DOM del calendario
        document.addEventListener('click', (e) => {
            const btnPrev = e.target.closest('[data-action="calendarPrevMonth"]');
            const btnNext = e.target.closest('[data-action="calendarNextMonth"]');
            const btnDay = e.target.closest('[data-action="calendarSelectDay"]');
            const btnConfirm = e.target.closest('[data-action="calendarConfirm"]');
            const btnClear = e.target.closest('[data-action="calendarClear"]');
            const btnCancel = e.target.closest('[data-action="calendarCancel"]');

            if (btnPrev) this.changeMonth(-1);
            if (btnNext) this.changeMonth(1);
            if (btnDay) this.selectDay(btnDay);
            if (btnConfirm) this.confirm();
            if (btnClear) this.clear();
            if (btnCancel) this.cancel();
        });

        // Validaciones en blur de tiempo del calendario
        document.addEventListener('focusout', (e) => {
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
        });
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const title = document.querySelector('[data-ref="calendar-title"]');
        if (title) title.textContent = `${this.monthsStr[month]} ${year}`;
        
        const daysContainer = document.querySelector('[data-ref="calendar-days"]');
        if (!daysContainer) return;
        daysContainer.innerHTML = '';
        
        // Días grises del mes pasado
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            daysContainer.innerHTML += `<button type="button" class="component-calendar-day muted" disabled>${dayNum}</button>`;
        }
        
        // Días interactivos del mes actual
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
        
        // Días grises del próximo mes (para rellenar celdas)
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
        this.render(); // Re-renderiza para aplicar la clase active
    }

    confirm() {
        if (!this.selectedDate) {
            if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                window.appInstance.showToast('Selecciona un día en el calendario.', 'error');
            } else {
                alert('Selecciona un día en el calendario.');
            }
            return;
        }
        
        const hInput = document.querySelector('[data-ref="calendar-hours"]');
        const mInput = document.querySelector('[data-ref="calendar-minutes"]');
        
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
        const daysContainer = document.querySelector('[data-ref="calendar-days"]');
        if (daysContainer && window.appInstance) {
            // Encuentra el módulo contenedor dinámicamente y lo cierra
            const module = daysContainer.closest('.component-module');
            if (module) {
                window.appInstance.closeModule(module);
            }
        }
    }
}