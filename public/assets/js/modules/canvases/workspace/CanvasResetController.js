import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { CalendarSystem } from '../../../core/components/CalendarSystem.js';
import { showMessage, setButtonLoading, restoreButton, localInputFormatToUtcString, closeDropdown } from '../../../core/utils/uiUtils.js';

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

        this.calendar = new CalendarSystem('.component-module[data-module="moduleCalendarDate"]');
        this.calendar.disablePastDates = true;
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

        if (initialDateStr) {
            const dateObj = new Date(initialDateStr);
            if (!isNaN(dateObj.getTime())) {
                const displayString = this.calendar.getFormattedDisplayDate(dateObj);
                const textRef = this.wrapper.querySelector('[data-ref="reset-date-text"]');
                if (textRef) textRef.textContent = displayString;
            }
        }
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

        const btnCreateSnapshot = e.target.closest('[data-action="createSnapshot"]');
        if (btnCreateSnapshot) {
            e.preventDefault();
            this.executeCreateSnapshot(btnCreateSnapshot);
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

        const btnOpenCalendar = e.target.closest('[data-action="openCalendarModal"]');
        if (btnOpenCalendar) {
            e.preventDefault();
            const targetId = btnOpenCalendar.getAttribute('data-target');
            if (targetId === 'moduleCalendarDate' && this.calendar) {
                const initialDate = this.inputDateTime ? this.inputDateTime.value : '';
                this.calendar.openModal(initialDate);
            }
            return;
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

        closeDropdown(element.closest('.component-module--dropdown'));
    }

    updateOptionsContainerState(isActive) {
        if (!this.optionsContainer) return;
        
        if (isActive) {
            this.optionsContainer.classList.remove('disabled-interaction');
        } else {
            this.optionsContainer.classList.add('disabled-interaction');
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

        if (isActive) {
            const date = new Date(localTimeStr);
            const now = new Date();
            const minFuture = new Date(now.getTime() + 5 * 60 * 1000);
            if (isNaN(date.getTime()) || date < minFuture) {
                showMessage(__('err_date_minimum_5_minutes'), 'error');
                return;
            }
        }

        const utcNextReset = localInputFormatToUtcString(localTimeStr);

        const payload = {
            id: canvasId,
            is_active: isActive,
            next_reset_at: utcNextReset,
            take_snapshot: this.checkSnapshot ? this.checkSnapshot.checked : false
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
        const result = await window.modalSystem.show('confirmResetNow', {});
        if (result.confirmed) {
            this.executeResetNow(btnResetNow);
        }
    }

    async executeResetNow(btn) {
        const performReset = async () => {
            const canvasId = this.wrapper.getAttribute('data-canvas-id');
            const checkSnapshotNow = this.wrapper.querySelector('[data-ref="take_snapshot_now"]');
            const takeSnapshot = checkSnapshotNow ? checkSnapshotNow.checked : false;
            
            setButtonLoading(btn);

            const result = await this.api.post(ApiRoutes.Canvases.ResetNow, { id: canvasId, take_snapshot: takeSnapshot }, this.abortController.signal);

            if (result.aborted) return;
            
            restoreButton(btn);

            if (result.success) {
                showMessage(result.message, 'success');
            } else {
                showMessage(result.message, 'error');
            }
        };

        await performReset();
    }

    async executeCreateSnapshot(btn) {
        const performSnapshot = async () => {
            const canvasId = this.wrapper.getAttribute('data-canvas-id');
            setButtonLoading(btn);

            const result = await this.api.post(ApiRoutes.Canvases.CreateSnapshot, { id: canvasId }, this.abortController.signal);

            if (result.aborted) return;
            
            restoreButton(btn);

            if (result.success) {
                showMessage(result.message, 'success');
            } else {
                showMessage(result.message, 'error');
            }
        };

        await performSnapshot();
    }
}

export { CanvasResetController };
