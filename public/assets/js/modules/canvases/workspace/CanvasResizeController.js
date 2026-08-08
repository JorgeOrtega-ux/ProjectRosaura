import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton, localInputFormatToUtcString } from '../../../core/utils/uiUtils.js';
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
        if (this.isInitialized) {
            this.destroy();
        }

        this.abortController = new AbortController();
        
        this.wrapper = document.querySelector('[data-ref="canvas-resize-wrapper"]');
        if (!this.wrapper) return;

        this.isInitialized = true;

        this.optionsContainer = this.wrapper.querySelector('[data-ref="resize_options_container"]');
        this.currentSize = this.wrapper.getAttribute('data-current-size');
        this.canvasId = this.wrapper.getAttribute('data-canvas-id');

        this.initCalendar();

        const toggle = this.wrapper.querySelector('[data-ref="toggleScheduledResize"]');
        if (toggle) {
            this.updateOptionsContainerState(toggle.checked);
        }

        this.bindEvents();
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
        this.calendar.disablePastDates = true;
        this.calendar.init();

        const inputDateTime = this.wrapper.querySelector('[data-ref="next_resize_at"]');
        const initialDate = inputDateTime ? inputDateTime.value : '';
        
        this.calendar.setup(initialDate, (isoString, displayString) => {
            if (inputDateTime) inputDateTime.value = isoString;
            const textRef = this.wrapper.querySelector('[data-ref="resize-date-text"]');
            if (textRef) textRef.textContent = displayString;
        }, () => {
            if (inputDateTime) inputDateTime.value = '';
            const textRef = this.wrapper.querySelector('[data-ref="resize-date-text"]');
            if (textRef) textRef.textContent = __('lbl_select_date');
        });

        if (initialDate) {
            const dateObj = new Date(initialDate);
            if (!isNaN(dateObj.getTime())) {
                const displayString = this.calendar.getFormattedDisplayDate(dateObj);
                const textRef = this.wrapper.querySelector('[data-ref="resize-date-text"]');
                if (textRef) textRef.textContent = displayString;
            }
        }
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
            this.optionsContainer.classList.remove('disabled-interaction');
        } else {
            this.optionsContainer.classList.add('disabled-interaction');
        }
    }


    handleGlobalClick(e) {
        const btnOpenCalendar = e.target.closest('[data-action="openCalendarModal"]');
        if (btnOpenCalendar) {
            e.preventDefault();
            const targetId = btnOpenCalendar.getAttribute('data-target');
            if (targetId === 'moduleCalendarDateResize' && this.calendar) {
                const inputDateTime = this.wrapper.querySelector('[data-ref="next_resize_at"]');
                const initialDate = inputDateTime ? inputDateTime.value : '';
                this.calendar.openModal(initialDate);
            }
            return;
        }

        const dropdownTrigger = e.target.closest('[data-action="toggleDropdown"]');
        const sizeScheduledItem = e.target.closest('[data-type="size_scheduled"]');
        const sizeInstantItem = e.target.closest('[data-type="size_instant"]');
        
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

        if (sizeScheduledItem) {
            e.preventDefault();
            if (!sizeScheduledItem.classList.contains('disabled-interaction') && sizeScheduledItem.getAttribute('data-action') === 'selectValue') {
                this.handleSizeSelect(sizeScheduledItem, 'scheduled');
            }
        }

        if (sizeInstantItem) {
            e.preventDefault();
            if (!sizeInstantItem.classList.contains('disabled-interaction') && sizeInstantItem.getAttribute('data-action') === 'selectValue') {
                this.handleSizeSelect(sizeInstantItem, 'instant');
            }
        }


        if (applyNowBtn && !applyNowBtn.classList.contains('disabled-interaction')) {
            e.preventDefault();
            this.confirmResizeNow(applyNowBtn);
        }

        if (saveScheduledBtn && !saveScheduledBtn.classList.contains('disabled-interaction')) {
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

    handleSizeSelect(btn, context) {
        if (!btn || btn.classList.contains('disabled-interaction') || btn.getAttribute('data-action') !== 'selectValue') {
            return;
        }

        const moduleName = context === 'scheduled' ? 'dropdownSizeScheduled' : 'dropdownSizeInstant';
        const dropdown = this.wrapper.querySelector(`[data-module="${moduleName}"]`);
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }

        const value = btn.getAttribute('data-value');
        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');
        
        const textRef = this.wrapper.querySelector(
            context === 'scheduled' ? '[data-ref="text-size-scheduled"]' : '[data-ref="text-size-instant"]'
        );
        const iconRef = this.wrapper.querySelector(
            context === 'scheduled' ? '[data-ref="scheduled-resize-icon"]' : '[data-ref="instant-resize-icon"]'
        );
        
        if (textRef) textRef.textContent = label;
        if (iconRef) iconRef.textContent = icon;
        
        const type = context === 'scheduled' ? 'size_scheduled' : 'size_instant';
        const links = this.wrapper.querySelectorAll(`.component-menu-link[data-type="${type}"]`);
        links.forEach(l => l.classList.remove('active'));
        btn.classList.add('active');

        this.updateShrinkWarning(value, context);
    }

    updateShrinkWarning(newSize, context) {
        const ref = context === 'scheduled' ? '[data-ref="resize-scheduled-shrink-warning"]' : '[data-ref="resize-shrink-warning"]';
        const warning = this.wrapper.querySelector(ref);
        if (!warning || !this.currentSize) return;

        const currWidth = parseInt(this.currentSize.toString().split('x')[0], 10);
        const nextWidth = parseInt(newSize.toString().split('x')[0], 10);

        if (nextWidth < currWidth) {
            warning.classList.add('active');
        } else {
            warning.classList.remove('active');
        }
    }



    getSelectedSize(type) {
        const activeLink = this.wrapper.querySelector(`.component-menu-link[data-type="${type}"].active`);
        if (activeLink) {
            return activeLink.getAttribute('data-value');
        }
        const textRef = this.wrapper.querySelector(
            type === 'size_scheduled' ? '[data-ref="text-size-scheduled"]' : '[data-ref="text-size-instant"]'
        );
        return textRef ? textRef.textContent.trim() : null;
    }

    async confirmResizeNow(btn) {
        const newSize = this.getSelectedSize('size_instant');
        if (!newSize) return;

        if (newSize === this.currentSize) {
            showMessage(__('err_size_already_applied'), 'info');
            return;
        }

        const activeLink = this.wrapper.querySelector('.component-menu-link[data-type="size_instant"].active');
        const sizeLabel = activeLink ? activeLink.getAttribute('data-label') : newSize;

        const result = await window.modalSystem.show('confirmResizeNow', { sizeLabel });
        if (result.confirmed) {
            this.applyResizeNow(btn, newSize);
        }
    }

    async applyResizeNow(btn, newSize) {
        if (!this.canvasId || !newSize) return;

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
        const targetSize = this.getSelectedSize('size_scheduled') || '64x64';

        let nextResizeAt = null;
        
        if (isActive) {
            const inputDateTime = this.wrapper.querySelector('[data-ref="next_resize_at"]');
            const localTimeStr = inputDateTime ? inputDateTime.value : '';
            
            if (!localTimeStr) {
                showMessage(__('err_resize_date_required'), 'error');
                return;
            }

            const date = new Date(localTimeStr);
            const now = new Date();
            const minFuture = new Date(now.getTime() + 5 * 60 * 1000);
            if (isNaN(date.getTime()) || date < minFuture) {
                showMessage(__('err_date_minimum_5_minutes'), 'error');
                return;
            }

            nextResizeAt = localInputFormatToUtcString(localTimeStr);
        }

        const payload = {
            id: this.canvasId,
            is_active: isActive,
            next_resize_at: nextResizeAt,
            target_size: targetSize
        };

        setButtonLoading(btn);
        
        const result = await this.api.post(ApiRoutes.Canvases.UpdateResizeSettings, payload, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
        } else {
            showMessage(result.message, 'error');
        }
    }
}

export { CanvasResizeController };
