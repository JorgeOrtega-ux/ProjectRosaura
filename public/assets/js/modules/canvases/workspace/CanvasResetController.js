// public/assets/js/modules/canvases/CanvasResetController.js

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
        if (this.isInitialized) return;
        
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

        this.calendar.setup(null, (isoString, displayString) => {
            if (this.inputDateTime) this.inputDateTime.value = isoString;
            const textRef = this.wrapper.querySelector('[data-ref="reset-date-text"]');
            if (textRef) textRef.textContent = displayString;
        }, () => {
            if (this.inputDateTime) this.inputDateTime.value = '';
            const textRef = this.wrapper.querySelector('[data-ref="reset-date-text"]');
            if (textRef) textRef.textContent = __('lbl_select_date');
        });

        this.bindEvents();
        this.loadCurrentSettings();

        this.isInitialized = true;
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.calendar) this.calendar.destroy();
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('change', this.handleToggleChangeBound);
        this.isInitialized = false;
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
            if (module) module.classList.add('disabled');
        }

        const btnDropdown = e.target.closest('[data-action="toggleDropdown"]');
        if (btnDropdown) {
            e.preventDefault();
            this.toggleDropdown(btnDropdown);
            return;
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
            this.optionsContainer.style.opacity = '1';
        } else {
            this.optionsContainer.classList.add('disabled-interactive');
            this.optionsContainer.style.opacity = '0.4';
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

    async loadCurrentSettings() {
        const canvasId = this.wrapper.getAttribute('data-canvas-id');
        if (!canvasId) return;

        const result = await this.api.post(ApiRoutes.Canvases.GetResetSettings, { id: canvasId }, this.abortController.signal);

        if (result.aborted) return;

        if (result.success && result.data) {
            const data = result.data;
            
            if (this.toggleActive) {
                this.toggleActive.checked = data.is_active;
                this.updateOptionsContainerState(data.is_active);
            }

            if (data.next_reset_at && this.inputDateTime) {
                const localStr = this.utcStringToLocalInputFormat(data.next_reset_at);
                this.inputDateTime.value = localStr;
                
                this.calendar.setup(localStr, (isoString, displayString) => {
                    if (this.inputDateTime) this.inputDateTime.value = isoString;
                    const textRef = this.wrapper.querySelector('[data-ref="reset-date-text"]');
                    if (textRef) textRef.textContent = displayString;
                }, () => {
                    if (this.inputDateTime) this.inputDateTime.value = '';
                    const textRef = this.wrapper.querySelector('[data-ref="reset-date-text"]');
                    if (textRef) textRef.textContent = __('lbl_select_date');
                });

                const textRef = this.wrapper.querySelector('[data-ref="reset-date-text"]');
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

            if (this.checkSnapshot) {
                this.checkSnapshot.checked = data.take_snapshot;
            }
            
            if (data.timer_action) {
                const item = this.wrapper.querySelector(`[data-action="selectTimerAction"][data-value="${data.timer_action}"]`);
                if (item) this.selectTimerValue(item);
            }
        }
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
            showMessage(result.message || __('msg_save_success'), 'success');
        } else {
            showMessage(result.message || __('err_save_failed'), 'error');
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
            showMessage(result.message || __('msg_reset_now_success'), 'success');
        } else {
            showMessage(result.message || __('err_reset_now_failed'), 'error');
        }
    }
}

export { CanvasResetController };