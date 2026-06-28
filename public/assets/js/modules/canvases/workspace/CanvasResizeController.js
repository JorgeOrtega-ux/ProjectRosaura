// public/assets/js/modules/canvases/CanvasResizeController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { CalendarSystem } from '../../../core/components/CalendarSystem.js';

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
            indicator.textContent = __('lbl_your_timezone') + ': ' + tz;
        }
    }

    initCalendar() {
        this.calendar = new CalendarSystem('[data-module="moduleCalendarDateResize"]');
        this.calendar.init();

        const inputDateTime = document.querySelector('[data-ref="next_resize_at"]');
        
        this.calendar.setup(null, (isoString, displayString) => {
            if (inputDateTime) inputDateTime.value = isoString;
            const textRef = document.querySelector('[data-ref="resize-date-text"]');
            if (textRef) textRef.textContent = displayString;
        }, () => {
            if (inputDateTime) inputDateTime.value = '';
            const textRef = document.querySelector('[data-ref="resize-date-text"]');
            if (textRef) textRef.textContent = __('lbl_select_date');
        });
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

    utcStringToLocalInputFormat(utcString) {
        if (!utcString) return '';
        const dateObj = new Date(utcString.replace(' ', 'T') + 'Z');
        if (isNaN(dateObj.getTime())) return '';

        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    localInputFormatToUtcString(localString) {
        if (!localString) return null;
        const dateObj = new Date(localString);
        if (isNaN(dateObj.getTime())) return null;

        const yyyy = dateObj.getUTCFullYear();
        const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getUTCDate()).padStart(2, '0');
        const hh = String(dateObj.getUTCHours()).padStart(2, '0');
        const min = String(dateObj.getUTCMinutes()).padStart(2, '0');
        const ss = '00';

        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }

    async loadSettings() {
        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.GetResizeSettings ? ApiRoutes.Canvases.GetResizeSettings : 'canvases.get_resize_settings';
        const result = await this.api.post(route, { id: this.canvasId }, this.abortController.signal);
        
        if (result.aborted) return;

        if (result.success && result.data) {
            const data = result.data;
            
            const sizeLink = document.querySelector(`.component-menu-link[data-type="size"][data-value="${data.target_size}"]`);
            if (sizeLink) this.handleResizeSelect(sizeLink, false);
            
            const toggle = document.getElementById('toggleScheduledResize');
            if (toggle) {
                toggle.checked = data.is_active;
                this.handleToggleChange({ target: toggle });
            }

            if (data.next_resize_at && this.calendar) {
                const localStr = this.utcStringToLocalInputFormat(data.next_resize_at);
                const inputDateTime = document.querySelector('[data-ref="next_resize_at"]');
                if (inputDateTime) inputDateTime.value = localStr;
                
                this.calendar.setup(localStr, (isoString, displayString) => {
                    if (inputDateTime) inputDateTime.value = isoString;
                    const textRef = document.querySelector('[data-ref="resize-date-text"]');
                    if (textRef) textRef.textContent = displayString;
                }, () => {
                    if (inputDateTime) inputDateTime.value = '';
                    const textRef = document.querySelector('[data-ref="resize-date-text"]');
                    if (textRef) textRef.textContent = __('lbl_select_date');
                });
                
                const textRef = document.querySelector('[data-ref="resize-date-text"]');
                if (textRef) {
                    const dateObj = new Date(localStr);
                    if (!isNaN(dateObj.getTime())) {
                        const mStr = this.calendar.monthsShortStr[dateObj.getMonth()];
                        const h = String(dateObj.getHours()).padStart(2, '0');
                        const min = String(dateObj.getMinutes()).padStart(2, '0');
                        textRef.textContent = `${dateObj.getDate()} de ${mStr} ${dateObj.getFullYear()}, ${h}:${min}`;
                    }
                }
            }

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
        
        if (dropdownTrigger) {
            const module = document.querySelector(`[data-module="${dropdownTrigger.getAttribute('data-target')}"]`);
            if (module) {
                if (module.classList.contains('disabled')) {
                    document.querySelectorAll('.component-module--dropdown.active').forEach(d => {
                        d.classList.remove('active');
                        d.classList.add('disabled');
                    });
                    module.classList.remove('disabled');
                    module.classList.add('active');
                } else {
                    module.classList.remove('active');
                    module.classList.add('disabled');
                }
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
        
        if (!dropdownTrigger && !e.target.closest('.component-menu') && !e.target.closest('.component-calendar')) {
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
            showMessage(__('info_size_already_applied'), "info");
            return;
        }

        setButtonLoading(btn);

        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.Resize ? ApiRoutes.Canvases.Resize : 'canvases.resize';
        const result = await this.api.post(route, { id: this.canvasId, size: newSize }, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message || __('msg_resize_started'), 'success');
            setTimeout(() => {
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${this.basePath}/canvases/manage`, { forceReload: true });
                } else {
                    window.location.href = `${this.basePath}/canvases/manage`;
                }
            }, 1000);
        } else {
            showMessage(result.message || __('err_resize_apply'), 'error');
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
            const inputDateTime = document.querySelector('[data-ref="next_resize_at"]');
            const localTimeStr = inputDateTime ? inputDateTime.value : '';
            
            if (!localTimeStr) {
                showMessage(__('err_resize_date_required'), "error");
                return;
            }

            const date = new Date(localTimeStr);
            if (date <= new Date()) {
                showMessage(__('err_date_future'), "error");
                return;
            }

            nextResizeAt = this.localInputFormatToUtcString(localTimeStr);
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
            showMessage(result.message || __('msg_schedule_saved'), "success");
        } else {
            showMessage(result.message || __('err_schedule_save'), "error");
        }
    }
}

export { CanvasResizeController };