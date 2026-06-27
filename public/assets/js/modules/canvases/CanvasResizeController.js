// public/assets/js/modules/canvases/CanvasResizeController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';
import { CalendarSystem } from '../../core/components/CalendarSystem.js';

class CanvasResizeController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false;
        
        this.currentSize = null;
        this.canvasId = null;
        this.calendar = null;

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleToggleChangeBound = this.handleToggleChange.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        
        const container = document.getElementById('resizeCanvasContainer');
        if (container) {
            this.currentSize = parseInt(container.getAttribute('data-current-size'));
            this.canvasId = container.getAttribute('data-canvas-id');
        }

        this.detectTimezone();
        this.initCalendar();
        this.bindEvents();
        
        if (this.canvasId) {
            this.loadSettings();
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        
        const toggle = document.getElementById('toggleScheduledResize');
        if (toggle) toggle.removeEventListener('change', this.handleToggleChangeBound);

        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
        
        this.currentSize = null;
        this.canvasId = null;
        this.isInitialized = false;
    }

    detectTimezone() {
        const indicator = document.getElementById('localTimezoneIndicatorResize');
        if (indicator) {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            indicator.textContent = `Tu zona: ${tz}`;
        }
    }

    initCalendar() {
        // En lugar de buscar un ID, buscamos el contenedor generado por el módulo PHP
        const wrapper = document.querySelector('[data-module="moduleCalendarDateResize"]');
        if (wrapper) {
            this.calendar = new CalendarSystem(wrapper, {
                minDate: new Date(),
                placeholder: 'Selecciona fecha y hora'
            });
        }
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        
        const toggle = document.getElementById('toggleScheduledResize');
        if (toggle) {
            toggle.addEventListener('change', this.handleToggleChangeBound);
        }
    }

    handleToggleChange(e) {
        const isActive = e.target.checked;
        const dateBlock = document.getElementById('scheduledResizeDateBlock');
        const timerBlock = document.getElementById('scheduledResizeTimerBlock');

        if (isActive) {
            dateBlock.style.opacity = '1';
            dateBlock.classList.remove('disabled-interactive');
            timerBlock.style.opacity = '1';
            timerBlock.classList.remove('disabled-interactive');
        } else {
            dateBlock.style.opacity = '0.4';
            dateBlock.classList.add('disabled-interactive');
            timerBlock.style.opacity = '0.4';
            timerBlock.classList.add('disabled-interactive');
        }
    }

    async loadSettings() {
        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.GetResizeSettings ? ApiRoutes.Canvases.GetResizeSettings : 'canvases.get_resize_settings';
        const result = await this.api.post(route, { id: this.canvasId }, this.abortController.signal);
        
        if (result.aborted) return;

        if (result.success && result.data) {
            const data = result.data;
            
            // Set Size
            const sizeLink = document.querySelector(`.component-menu-link[data-type="size"][data-value="${data.target_size}"]`);
            if (sizeLink) this.handleResizeSelect(sizeLink, false);
            
            // Set Toggle
            const toggle = document.getElementById('toggleScheduledResize');
            if (toggle) {
                toggle.checked = data.is_active;
                this.handleToggleChange({ target: toggle });
            }

            // Set Date
            if (data.next_resize_at && this.calendar) {
                const utcDate = new Date(data.next_resize_at.replace(' ', 'T') + 'Z');
                this.calendar.setDate(utcDate);
                
                // Actualizar texto del Trigger
                const textRef = document.querySelector('[data-ref="resize-date-text"]');
                if (textRef) {
                    const d = utcDate;
                    textRef.textContent = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                }
            }

            // Set Timer Action
            const actionLink = document.querySelector(`.component-menu-link[data-type="timer_action"][data-value="${data.timer_action || 'restart'}"]`);
            if (actionLink) this.handleTimerActionSelect(actionLink);
        }
    }

    handleGlobalClick(e) {
        const dropdownTrigger = e.target.closest('[data-action="toggleDropdown"]');
        const resizeDropdownItem = e.target.closest('[data-type="size"]');
        const timerActionItem = e.target.closest('[data-type="timer_action"]');
        
        const applyNowBtn = e.target.closest('[data-action="applyResizeNow"]');
        const saveScheduledBtn = e.target.closest('[data-action="saveScheduledResize"]');
        
        // Botones internos del calendario (asegurando que pertenezcan a ESTE calendario)
        const calendarConfirmBtn = e.target.closest('[data-action="calendarConfirm"]');
        const calendarCancelBtn = e.target.closest('[data-action="calendarCancel"]');

        if (dropdownTrigger) {
            const module = document.querySelector(`[data-module="${dropdownTrigger.getAttribute('data-target')}"]`);
            if (module) {
                if (module.classList.contains('disabled')) {
                    module.classList.remove('disabled');
                    module.classList.add('active');
                } else {
                    module.classList.remove('active');
                    module.classList.add('disabled');
                }
            }
        }

        // Clic en Confirmar Calendario
        if (calendarConfirmBtn && calendarConfirmBtn.closest('[data-module="moduleCalendarDateResize"]')) {
            if (this.calendar) {
                const selectedDate = this.calendar.getDate();
                if (selectedDate) {
                    const textRef = document.querySelector('[data-ref="resize-date-text"]');
                    if (textRef) {
                        const d = selectedDate;
                        textRef.textContent = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                    }
                }
            }
            const dropdown = document.querySelector('[data-module="moduleCalendarDateResize"]');
            if (dropdown) {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            }
        }

        // Clic en Cancelar Calendario
        if (calendarCancelBtn && calendarCancelBtn.closest('[data-module="moduleCalendarDateResize"]')) {
            const dropdown = document.querySelector('[data-module="moduleCalendarDateResize"]');
            if (dropdown) {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            }
        }

        if (resizeDropdownItem) {
            this.handleResizeSelect(resizeDropdownItem, true);
        }

        if (timerActionItem) {
            this.handleTimerActionSelect(timerActionItem);
        }

        if (applyNowBtn && !applyNowBtn.classList.contains('disabled-interactive')) {
            this.applyResizeNow(applyNowBtn);
        }

        if (saveScheduledBtn && !saveScheduledBtn.classList.contains('disabled-interactive')) {
            this.saveScheduledResize(saveScheduledBtn);
        }
        
        // Cierre general de dropdowns si se clickea fuera
        if (!dropdownTrigger && !e.target.closest('.component-menu')) {
            const activeDropdowns = document.querySelectorAll('.component-module--dropdown.active');
            activeDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            });
        }
    }

    handleResizeSelect(btn, updateWarning = true) {
        const dropdown = document.querySelector('[data-module="dropdownSizeResize"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }

        const value = parseInt(btn.getAttribute('data-value'));
        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');
        
        const textRef = document.querySelector('[data-ref="text-size-resize"]');
        const iconRef = document.querySelector('[data-ref="resize-icon"]');
        
        if (textRef) textRef.textContent = label;
        if (iconRef) iconRef.textContent = icon;
        
        const links = document.querySelectorAll('.component-menu-link[data-type="size"]');
        links.forEach(l => l.classList.remove('active'));
        btn.classList.add('active');

        if (updateWarning) {
            const warning = document.querySelector('[data-ref="resize-warning"]');
            if (warning && this.currentSize) {
                if (value < this.currentSize) {
                    warning.style.display = 'flex';
                } else {
                    warning.style.display = 'none';
                }
            }
        }
    }

    handleTimerActionSelect(btn) {
        const dropdown = document.querySelector('[data-module="dropdownResizeTimerAction"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }

        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');
        
        const textRef = document.querySelector('[data-ref="text-resize-timer-action"]');
        const iconRef = document.querySelector('[data-ref="resize-timer-icon"]');
        
        if (textRef) textRef.textContent = label;
        if (iconRef) iconRef.textContent = icon;
        
        const links = document.querySelectorAll('.component-menu-link[data-type="timer_action"]');
        links.forEach(l => l.classList.remove('active'));
        btn.classList.add('active');
    }

    async applyResizeNow(btn) {
        if (!this.canvasId) return;
        
        const textRef = document.querySelector('[data-ref="text-size-resize"]');
        if (!textRef) return;
        
        const newSize = parseInt(textRef.textContent.split('x')[0]);
        if (isNaN(newSize)) return;

        if (newSize === this.currentSize) {
            showMessage("El lienzo ya tiene esta resolución aplicada.", "info");
            return;
        }

        setButtonLoading(btn);

        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.Resize ? ApiRoutes.Canvases.Resize : 'canvases.resize';
        const result = await this.api.post(route, { id: this.canvasId, size: newSize }, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message || "Proceso de redimensión iniciado exitosamente.", 'success');
            setTimeout(() => {
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${this.basePath}/canvases/manage`, { forceReload: true });
                } else {
                    window.location.href = `${this.basePath}/canvases/manage`;
                }
            }, 1000);
        } else {
            showMessage(result.message || "Error al aplicar la expansión.", 'error');
        }
    }

    async saveScheduledResize(btn) {
        if (!this.canvasId) return;

        const toggle = document.getElementById('toggleScheduledResize');
        const isActive = toggle ? toggle.checked : false;

        const textRef = document.querySelector('[data-ref="text-size-resize"]');
        const targetSize = textRef ? parseInt(textRef.textContent.split('x')[0]) : 64;

        let nextResizeAt = null;
        if (isActive) {
            const date = this.calendar ? this.calendar.getDate() : null;
            if (!date) {
                showMessage("Debes seleccionar una fecha y hora para la expansión.", "error");
                return;
            }

            if (date <= new Date()) {
                showMessage("La fecha debe ser en el futuro.", "error");
                return;
            }

            nextResizeAt = date.toISOString().slice(0, 19).replace('T', ' ');
        }

        const actionLink = document.querySelector('.component-menu-link[data-type="timer_action"].active');
        const timerAction = actionLink ? actionLink.getAttribute('data-value') : 'restart';

        const payload = {
            id: this.canvasId,
            is_active: isActive,
            next_resize_at: nextResizeAt,
            target_size: targetSize.toString(),
            timer_action: timerAction
        };

        setButtonLoading(btn);
        
        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.UpdateResizeSettings ? ApiRoutes.Canvases.UpdateResizeSettings : 'canvases.update_resize_settings';
        const result = await this.api.post(route, payload, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message || "Programación guardada exitosamente.", "success");
        } else {
            showMessage(result.message || "Error al guardar la programación.", "error");
        }
    }
}

export { CanvasResizeController };