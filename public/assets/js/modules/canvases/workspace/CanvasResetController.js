// public/assets/js/modules/canvases/workspace/CanvasResetController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { CalendarSystem } from '../../../core/components/CalendarSystem.js';

class CanvasResetController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.isInitialized = false;
        
        this.wrapper = null;
        this.toggleActive = null;
        this.optionsContainer = null;
        this.inputDateTime = null;
        this.checkSnapshot = null;
        
        this.inputTimer = null;
        this.textTimer = null;
        this.iconTimer = null;

        this.calendar = null;

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleToggleChangeBound = this.handleToggleChange.bind(this);
    }

    init() {
        if (this.isInitialized) {
            this.destroy();
        }
        
        this.wrapper = document.querySelector('[data-ref="canvas-resets-wrapper"]');
        if (!this.wrapper) return;

        this.abortController = new AbortController();
        
        this.toggleActive = this.wrapper.querySelector('[data-ref="reset_is_active"]');
        this.optionsContainer = this.wrapper.querySelector('[data-ref="reset_options_container"]');
        this.inputDateTime = this.wrapper.querySelector('[data-ref="next_reset_at"]');
        this.checkSnapshot = this.wrapper.querySelector('[data-ref="take_snapshot"]');
        
        this.inputTimer = this.wrapper.querySelector('[data-ref="timer_action"]');
        this.textTimer = this.wrapper.querySelector('[data-ref="text-timer"]');
        this.iconTimer = this.wrapper.querySelector('[data-ref="icon-timer"]');

        this.calendar = new CalendarSystem('.component-module[data-module="moduleCalendarDate"]');
        this.calendar.init();

        this.setupCalendarCallbacks(this.inputDateTime ? this.inputDateTime.value : '');

        if (this.toggleActive) {
            this.updateOptionsContainerState(this.toggleActive.checked);
        }

        this.bindEvents();
        this.isInitialized = true;
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.calendar) this.calendar.destroy();
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('change', this.handleToggleChangeBound);
        this.isInitialized = false;
    }

    setupCalendarCallbacks(initialDateStr) {
        this.calendar.setup(initialDateStr, (isoString, displayString) => {
            if (this.inputDateTime) this.inputDateTime.value = isoString;
            const textRef = this.wrapper.querySelector('[data-ref="reset-date-text"]');
            if (textRef) textRef.textContent = displayString;
        }, () => {
            if (this.inputDateTime) this.inputDateTime.value = '';
            const textRef = this.wrapper.querySelector('[data-ref="reset-date-text"]');
            if (textRef) textRef.textContent = __('lbl_select_date');
        });
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('change', this.handleToggleChangeBound);
    }

    handleGlobalClick(e) {
        const btnSave = e.target.closest('[data-action="saveSettings"]');
        if (btnSave) {
            e.preventDefault();
            this.saveSettings(btnSave);
            return;
        }

        const btnResetNow = e.target.closest('[data-action="resetNow"]');
        if (btnResetNow) {
            e.preventDefault();
            this.confirmResetNow(btnResetNow);
            return;
        }

        const dropdownItem = e.target.closest('[data-action="selectTimerAction"]');
        if (dropdownItem) {
            e.preventDefault();
            this.selectTimerValue(dropdownItem);
            
            const module = dropdownItem.closest('.component-module--dropdown');
            if (module) {
                module.classList.remove('active');
                module.classList.add('disabled');
            }
        }

        const btnDropdown = e.target.closest('[data-action="toggleDropdown"]');
        if (btnDropdown) {
            e.preventDefault();
            this.toggleDropdown(btnDropdown);
            return;
        }

        if (!btnDropdown && !e.target.closest('.component-menu') && !e.target.closest('.component-calendar')) {
            const activeDropdowns = this.wrapper.querySelectorAll('.component-module--dropdown.active');
            activeDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            });
        }
    }

    toggleDropdown(btn) {
        const targetId = btn.getAttribute('data-target');
        const dropdown = this.wrapper.querySelector(`[data-module="${targetId}"]`);
        
        if (dropdown) {
            const isActive = dropdown.classList.contains('active');
            
            this.wrapper.querySelectorAll('.component-module--dropdown').forEach(d => {
                d.classList.remove('active');
                d.classList.add('disabled');
            });
            
            if (!isActive) {
                dropdown.classList.remove('disabled');
                dropdown.classList.add('active');
            }
        }
    }

    handleToggleChange(e) {
        const toggleBtn = e.target.closest('[data-action="toggleActive"]');
        if (toggleBtn) {
            this.updateOptionsContainerState(toggleBtn.checked);
        }
    }

    selectTimerValue(element) {
        const value = element.getAttribute('data-value');
        const label = element.getAttribute('data-label');
        const icon = element.getAttribute('data-icon');

        if (this.textTimer) this.textTimer.textContent = label;
        if (this.iconTimer) this.iconTimer.textContent = icon;
        if (this.inputTimer) this.inputTimer.value = value;

        const parentList = element.closest('.component-menu-list');
        if (parentList) {
            parentList.querySelectorAll('.component-menu-link').forEach(item => {
                item.classList.remove('active');
            });
        }
        element.classList.add('active');
    }

    updateOptionsContainerState(isActive) {
        if (!this.optionsContainer) return;
        
        if (isActive) {
            this.optionsContainer.classList.remove('disabled-interactive');
        } else {
            this.optionsContainer.classList.add('disabled-interactive');
        }
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

    async saveSettings(btnSave) {
        const canvasId = this.wrapper.getAttribute('data-canvas-id');
        const isActive = this.toggleActive ? this.toggleActive.checked : false;
        const localTimeStr = this.inputDateTime ? this.inputDateTime.value : '';

        if (isActive && !localTimeStr) {
            showMessage(__('err_reset_date_required'), 'warning');
            return;
        }

        const utcNextReset = this.localInputFormatToUtcString(localTimeStr);

        const payload = {
            id: canvasId,
            is_active: isActive,
            next_reset_at: utcNextReset,
            take_snapshot: this.checkSnapshot ? this.checkSnapshot.checked : false,
            timer_action: this.inputTimer ? this.inputTimer.value : 'restart'
        };

        setButtonLoading(btnSave);

        const result = await this.api.post(ApiRoutes.Canvases.UpdateResetSettings, payload, this.abortController.signal);

        if (result.aborted) return;
        
        restoreButton(btnSave);

        if (result.success) {
            showMessage(result.message, 'success');
        } else {
            showMessage(result.message, 'error');
        }
    }

    async confirmResetNow(btnResetNow) {
        const result = await window.dialogSystem.show('confirmResetNow', {});
        if (result.confirmed) {
            this.executeResetNow(btnResetNow);
        }
    }

    async executeResetNow(btn) {
        const canvasId = this.wrapper.getAttribute('data-canvas-id');
        
        setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Canvases.ResetNow, { id: canvasId }, this.abortController.signal);

        if (result.aborted) return;
        
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
        } else {
            showMessage(result.message, 'error');
        }
    }
}

export { CanvasResetController };
