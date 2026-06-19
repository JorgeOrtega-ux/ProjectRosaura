// public/assets/js/modules/canvases/CanvasesController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class CanvasesController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        
        this.formState = {
            name: '',
            description: '',
            size: '64',
            privacy: 'private',
            limit: 10
        };

        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        this.setupDefaultValues();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    setupDefaultValues() {
        const timestampName = `Canvas_${Date.now()}`;
        this.formState.name = timestampName;

        const displayEl = document.querySelector('[data-ref="display-canvasname"]');
        const inputEl = document.querySelector('[data-ref="input-canvasname"]');

        if (displayEl) displayEl.textContent = timestampName;
        if (inputEl) {
            inputEl.value = timestampName;
            inputEl.setAttribute('data-original-value', timestampName);
        }
    }

    handleClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        if (action === 'toggleDropdown') {
            this.toggleDropdown(actionBtn);
        } else if (action === 'selectValue') {
            this.selectDropdownValue(actionBtn);
        } else if (action === 'adjustLimit') {
            this.adjustParticipantLimit(actionBtn);
        } else if (action === 'toggleEditState') {
            this.toggleEditState(actionBtn);
        } else if (action === 'saveCanvasName') {
            this.saveCanvasName();
        } else if (action === 'createCanvas') {
            e.preventDefault();
            this.submitCanvas(actionBtn);
        }
    }

    toggleEditState(btn) {
        const viewState = document.querySelector('[data-state="canvasname-view"]');
        const editState = document.querySelector('[data-state="canvasname-edit"]');
        const inputEl = document.querySelector('[data-ref="input-canvasname"]');

        if (viewState && editState) {
            if (viewState.classList.contains('active')) {
                viewState.classList.remove('active');
                viewState.classList.add('disabled');
                editState.classList.remove('disabled');
                editState.classList.add('active');
                if (inputEl) inputEl.focus();
            } else {
                editState.classList.remove('active');
                editState.classList.add('disabled');
                viewState.classList.remove('disabled');
                viewState.classList.add('active');
                if (inputEl) inputEl.value = inputEl.getAttribute('data-original-value');
            }
        }
    }

    saveCanvasName() {
        const inputEl = document.querySelector('[data-ref="input-canvasname"]');
        const displayEl = document.querySelector('[data-ref="display-canvasname"]');
        
        if (inputEl && displayEl) {
            const newName = inputEl.value.trim();
            if (newName !== '') {
                displayEl.textContent = newName;
                inputEl.setAttribute('data-original-value', newName);
                this.formState.name = newName;
            }
        }
        
        const btnCancel = document.querySelector('[data-action="toggleEditState"]');
        if (btnCancel) this.toggleEditState(btnCancel);
    }

    toggleDropdown(triggerBtn) {
        const targetId = triggerBtn.getAttribute('data-target');
        const targetDropdown = document.querySelector(`[data-module="${targetId}"]`);
        
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            if (el !== targetDropdown) {
                el.classList.remove('active');
                el.classList.add('disabled');
            }
        });

        if (targetDropdown) {
            if (targetDropdown.classList.contains('disabled')) {
                targetDropdown.classList.remove('disabled');
                targetDropdown.classList.add('active');
            } else {
                targetDropdown.classList.remove('active');
                targetDropdown.classList.add('disabled');
            }
        }
    }

    selectDropdownValue(optionBtn) {
        const type = optionBtn.getAttribute('data-type');
        const value = optionBtn.getAttribute('data-value');
        const label = optionBtn.getAttribute('data-label');
        const icon = optionBtn.getAttribute('data-icon');

        this.formState[type] = value;

        const menu = optionBtn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
            optionBtn.classList.add('active');
        }

        const dropdownWrapper = optionBtn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('.component-dropdown-text');
            if (triggerText) triggerText.textContent = __(label);

            if (icon) {
                const triggerIcon = dropdownWrapper.querySelector('.component-dropdown-trigger .material-symbols-rounded:first-child');
                if (triggerIcon) triggerIcon.textContent = icon;
            }

            const module = dropdownWrapper.querySelector('.component-module--dropdown');
            if (module) {
                module.classList.remove('active');
                module.classList.add('disabled');
            }
        }
    }

    adjustParticipantLimit(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min'), 10) || 10;
        const max = parseInt(btn.getAttribute('data-max'), 10) || 50000;
        
        const centerElement = document.querySelector('[data-ref="val_limit"]');
        if (!centerElement) return;

        let currentVal = parseInt(centerElement.getAttribute('data-val'), 10) || min;
        let newVal = currentVal + step;
        
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        this.formState.limit = newVal;
        centerElement.setAttribute('data-val', newVal);
        centerElement.textContent = newVal;
    }

    async submitCanvas(btn) {
        const inputDesc = document.querySelector('[data-ref="input-canvas-desc"]');
        this.formState.description = inputDesc ? inputDesc.value.trim() : '';

        setButtonLoading(btn);

        const res = await this.api.post(ApiRoutes.Canvases.Create, this.formState, this.abortController.signal);
        if (res.aborted) return;

        restoreButton(btn);

        if (res.success) {
            showMessage(__('msg_canvas_created'), 'success');
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/canvases/${res.data.uuid}`);
            }
        } else {
            showMessage(res.message, 'error');
        }
    }
}

export { CanvasesController };