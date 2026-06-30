// public/assets/js/modules/canvases/workspace/CanvasResizeController.js

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
        
        this.wrapper = null;
        this.optionsContainer = null;
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
        
        this.wrapper = document.querySelector('[data-ref="canvas-resize-wrapper"]');
        if (!this.wrapper) return;

        this.optionsContainer = this.wrapper.querySelector('[data-ref="resize_options_container"]');
        this.currentSize = this.wrapper.getAttribute('data-current-size');
        this.canvasId = this.wrapper.getAttribute('data-canvas-id');

        this.initCalendar();
        this.bindEvents();
        
        if (this.canvasId) {
            this.loadSettings();
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('change', this.handleToggleChangeBound);

        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
        
        this.wrapper = null;
        this.optionsContainer = null;
        this.currentSize = null;
        this.canvasId = null;
        this.isInitialized = false;
    }

    initCalendar() {
        this.calendar = new CalendarSystem('[data-module="moduleCalendarDateResize"]');
        this.calendar.init();

        const inputDateTime = this.wrapper.querySelector('[data-ref="next_resize_at"]');
        
        this.calendar.setup(null, (isoString, displayString) => {
            if (inputDateTime) inputDateTime.value = isoString;
            const textRef = this.wrapper.querySelector('[data-ref="resize-date-text"]');
            if (textRef) textRef.textContent = displayString;
        }, () => {
            if (inputDateTime) inputDateTime.value = '';
            const textRef = this.wrapper.querySelector('[data-ref="resize-date-text"]');
            if (textRef) textRef.textContent = __('lbl_select_date');
        });
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('change', this.handleToggleChangeBound);
    }

    handleToggleChange(e) {
        const toggleBtn = e.target.closest('[data-ref="toggleScheduledResize"]');
        if (toggleBtn) {
            this.updateOptionsContainerState(toggleBtn.checked);
        }
    }

    updateOptionsContainerState(isActive) {
        if (!this.optionsContainer) return;
        
        if (isActive) {
            this.optionsContainer.classList.remove('disabled-interactive');
        } else {
            this.optionsContainer.classList.add('disabled-interactive');
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
        const result = await this.api.post(ApiRoutes.Canvases.GetResizeSettings, { id: this.canvasId }, this.abortController.signal);
        
        if (result.aborted) return;

        if (result.success && result.data) {
            const data = result.data;
            
            const sizeLink = this.wrapper.querySelector(`.component-menu-link[data-type="size"][data-value="${data.target_size}"]`);
            if (sizeLink) this.handleResizeSelect(sizeLink, false);
            
            const toggle = this.wrapper.querySelector('[data-ref="toggleScheduledResize"]');
            if (toggle) {
                toggle.checked = data.is_active;
                this.updateOptionsContainerState(data.is_active);
            }

            if (data.next_resize_at && this.calendar) {
                const localStr = this.utcStringToLocalInputFormat(data.next_resize_at);
                const inputDateTime = this.wrapper.querySelector('[data-ref="next_resize_at"]');
                
                this.calendar.setup(localStr, (isoString, displayString) => {
                    if (inputDateTime) inputDateTime.value = isoString;
                    const textRef = this.wrapper.querySelector('[data-ref="resize-date-text"]');
                    if (textRef) textRef.textContent = displayString;
                }, () => {
                    if (inputDateTime) inputDateTime.value = '';
                    const textRef = this.wrapper.querySelector('[data-ref="resize-date-text"]');
                    if (textRef) textRef.textContent = __('lbl_select_date');
                });
            }

            const actionLink = this.wrapper.querySelector(`.component-menu-link[data-type="timer_action"][data-value="${data.timer_action || 'restart'}"]`);
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
            e.preventDefault();
            const targetId = dropdownTrigger.getAttribute('data-target');
            const module = this.wrapper.querySelector(`[data-module="${targetId}"]`);
            if (module) {
                const isActive = module.classList.contains('active');
                
                this.wrapper.querySelectorAll('.component-module--dropdown').forEach(d => {
                    d.classList.remove('active');
                    d.classList.add('disabled');
                });
                
                if (!isActive) {
                    module.classList.remove('disabled');
                    module.classList.add('active');
                }
            }
            return;
        }

        if (resizeDropdownItem) {
            e.preventDefault();
            this.handleResizeSelect(resizeDropdownItem, true);
        }

        if (timerActionItem) {
            e.preventDefault();
            this.handleTimerActionSelect(timerActionItem);
        }

        if (applyNowBtn && !applyNowBtn.classList.contains('disabled-interactive')) {
            e.preventDefault();
            this.applyResizeNow(applyNowBtn);
        }

        if (saveScheduledBtn && !saveScheduledBtn.classList.contains('disabled-interactive')) {
            e.preventDefault();
            this.saveScheduledResize(saveScheduledBtn);
        }
        
        if (!dropdownTrigger && !e.target.closest('.component-menu') && !e.target.closest('.component-calendar')) {
            const activeDropdowns = this.wrapper.querySelectorAll('.component-module--dropdown.active');
            activeDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            });
        }
    }

    handleResizeSelect(btn, updateWarning = true) {
        const dropdown = this.wrapper.querySelector('[data-module="dropdownSizeResize"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }

        const value = btn.getAttribute('data-value');
        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');
        
        const textRef = this.wrapper.querySelector('[data-ref="text-size-resize"]');
        const iconRef = this.wrapper.querySelector('[data-ref="resize-icon"]');
        
        if (textRef) textRef.textContent = label;
        if (iconRef) iconRef.textContent = icon;
        
        const links = this.wrapper.querySelectorAll('.component-menu-link[data-type="size"]');
        links.forEach(l => l.classList.remove('active'));
        btn.classList.add('active');

        if (updateWarning) {
            const warning = this.wrapper.querySelector('[data-ref="resize-warning"]');
            if (warning && this.currentSize) {
                const currWidth = parseInt(this.currentSize.toString().split('x')[0]);
                const nextWidth = parseInt(value.toString().split('x')[0]);
                
                if (nextWidth < currWidth) {
                    warning.classList.remove('d-none');
                } else {
                    warning.classList.add('d-none');
                }
            }
        }
    }

    handleTimerActionSelect(btn) {
        const dropdown = this.wrapper.querySelector('[data-module="dropdownResizeTimerAction"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }

        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');
        
        const textRef = this.wrapper.querySelector('[data-ref="text-resize-timer-action"]');
        const iconRef = this.wrapper.querySelector('[data-ref="resize-timer-icon"]');
        
        if (textRef) textRef.textContent = label;
        if (iconRef) iconRef.textContent = icon;
        
        const links = this.wrapper.querySelectorAll('.component-menu-link[data-type="timer_action"]');
        links.forEach(l => l.classList.remove('active'));
        btn.classList.add('active');
    }

    async applyResizeNow(btn) {
        if (!this.canvasId) return;
        
        const activeLink = this.wrapper.querySelector('.component-menu-link[data-type="size"].active');
        let newSize;
        
        if (activeLink) {
            newSize = activeLink.getAttribute('data-value');
            if (/^\d+$/.test(newSize)) newSize = parseInt(newSize);
        } else {
            const textRef = this.wrapper.querySelector('[data-ref="text-size-resize"]');
            if (!textRef) return;
            newSize = textRef.textContent.includes('x') ? textRef.textContent.split('x')[0] : textRef.textContent;
            newSize = parseInt(newSize);
        }

        if (newSize.toString() === this.currentSize.toString()) {
            showMessage(__('err_size_already_applied'), "info");
            return;
        }

        setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Canvases.Resize, { id: this.canvasId, size: newSize }, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
            setTimeout(() => {
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${this.basePath}/canvases/manage`, { forceReload: true });
                }
            }, 1000);
        } else {
            showMessage(result.message, 'error');
        }
    }

    async saveScheduledResize(btn) {
        if (!this.canvasId) return;

        const toggle = this.wrapper.querySelector('[data-ref="toggleScheduledResize"]');
        const isActive = toggle ? toggle.checked : false;

        const activeLink = this.wrapper.querySelector('.component-menu-link[data-type="size"].active');
        let targetSize = 64;
        
        if (activeLink) {
            targetSize = activeLink.getAttribute('data-value');
        } else {
            const textRef = this.wrapper.querySelector('[data-ref="text-size-resize"]');
            if (textRef) {
                targetSize = textRef.textContent.includes('x') ? textRef.textContent.split('x')[0] : textRef.textContent;
            }
        }

        let nextResizeAt = null;
        
        if (isActive) {
            const inputDateTime = this.wrapper.querySelector('[data-ref="next_resize_at"]');
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

        const actionLink = this.wrapper.querySelector('.component-menu-link[data-type="timer_action"].active');
        const timerAction = actionLink ? actionLink.getAttribute('data-value') : 'restart';

        const payload = {
            id: this.canvasId,
            is_active: isActive,
            next_resize_at: nextResizeAt,
            target_size: targetSize.toString(),
            timer_action: timerAction
        };

        setButtonLoading(btn);
        
        const result = await this.api.post(ApiRoutes.Canvases.UpdateResizeSettings, payload, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, "success");
        } else {
            showMessage(result.message, "error");
        }
    }
}

export { CanvasResizeController };