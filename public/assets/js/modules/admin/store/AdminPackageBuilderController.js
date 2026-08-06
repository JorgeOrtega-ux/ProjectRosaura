import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminPackageBuilderController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
    }

    destroy() {
        if (!this.isInitialized) return;
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        
        // Color inputs listeners
        const colorInputs = document.querySelectorAll('[data-ref^="input-pkg-"]');
        colorInputs.forEach(input => {
            if (input.getAttribute('data-ref').includes('-color')) {
                input.addEventListener('input', (e) => this.syncColorSwatch(e.target));
            }
        });
    }

    syncColorSwatch(input) {
        const refName = input.getAttribute('data-ref').replace('input-', 'swatch-');
        const swatch = document.querySelector(`[data-ref="${refName}"]`);
        if (swatch) {
            swatch.style.backgroundColor = input.value;
        }
    }

    handleGlobalClick(e) {
        const target = e.target;
        const actionBtn = target.closest('[data-action]');
        
        if (actionBtn) {
            const action = actionBtn.getAttribute('data-action');
            if (typeof this[action] === 'function') {
                e.preventDefault();
                this[action](actionBtn, e);
                return;
            }
        }

        const toggleBtn = target.closest('.component-toggle');
        if (toggleBtn) {
            toggleBtn.classList.toggle('active');
        }
    }

    goBack() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/store-packages`);
        } else {
            window.location.href = `${this.basePath}/admin/store-packages`;
        }
    }

    toggleAccordion(btn) {
        const header = btn.closest('.component-accordion-header');
        if (!header) return;
        const accordion = header.closest('.component-accordion');
        if (accordion) {
            accordion.classList.toggle('active');
        }
    }

    toggleEditState(btn) {
        const statefulGroup = btn.closest('.component-group-item--stateful');
        if (!statefulGroup) return;

        const viewState = statefulGroup.querySelector('.component-state-box[data-state$="-view"]');
        const editState = statefulGroup.querySelector('.component-state-box[data-state$="-edit"]');

        if (!viewState || !editState) return;

        if (viewState.classList.contains('active')) {
            viewState.classList.remove('active');
            viewState.classList.add('disabled');
            editState.classList.remove('disabled');
            editState.classList.add('active');

            const input = editState.querySelector('input');
            if (input) input.focus();
        } else {
            const input = editState.querySelector('input');
            if (input) {
                const originalVal = input.getAttribute('data-original-value');
                input.value = originalVal;
            }

            editState.classList.remove('active');
            editState.classList.add('disabled');
            viewState.classList.remove('disabled');
            viewState.classList.add('active');
        }
    }

    applyInlineSetting(btn) {
        const statefulGroup = btn.closest('.component-group-item--stateful');
        if (!statefulGroup) return;

        const editState = statefulGroup.querySelector('.component-state-box[data-state$="-edit"]');
        const viewState = statefulGroup.querySelector('.component-state-box[data-state$="-view"]');
        
        const input = editState.querySelector('input');
        const display = viewState.querySelector('.component-display-value');

        if (input && display) {
            const newVal = input.value.trim();
            if (newVal === '') {
                showMessage("Este campo no puede estar vacío.", "warning");
                return;
            }
            display.textContent = newVal;
            input.setAttribute('data-original-value', newVal);
        }

        editState.classList.remove('active');
        editState.classList.add('disabled');
        viewState.classList.remove('disabled');
        viewState.classList.add('active');
    }

    async savePackage(btn) {
        const wrapper = document.querySelector('[data-ref="admin-store-package-wrapper"]');
        if (!wrapper) return;

        const uuid = wrapper.getAttribute('data-package-uuid') || '';
        const nameInput = document.querySelector('[data-ref="input-pkg-name"]');
        const name = nameInput ? nameInput.value.trim() : '';
        
        if (!name) {
            showMessage("El nombre del paquete es obligatorio.", "warning");
            return;
        }

        const data = {
            uuid: uuid,
            name: name,
            amount: document.querySelector('[data-ref="input-pkg-amount"]')?.value || 0,
            price_usd: document.querySelector('[data-ref="input-pkg-price"]')?.value || 0,
            description: document.querySelector('[data-ref="input-pkg-description"]')?.value || '',
            bonus_text: document.querySelector('[data-ref="input-pkg-bonus"]')?.value || '',
            stripe_price_id: document.querySelector('[data-ref="input-pkg-stripe"]')?.value || '',
            icon: document.querySelector('[data-ref="input-pkg-icon"]')?.value || '',
            icon_color: document.querySelector('[data-ref="input-pkg-icon-color"]')?.value || '',
            border_color: document.querySelector('[data-ref="input-pkg-border-color"]')?.value || '',
            badge_color: document.querySelector('[data-ref="input-pkg-badge-color"]')?.value || '',
            is_active: document.querySelector('[data-ref="toggle-active"]')?.classList.contains('active') ? 1 : 0
        };

        setButtonLoading(btn);
        try {
            const response = await this.api.post(ApiRoutes.Admin.SaveStorePackage, data, { signal: this.abortController?.signal });
            if (response.success) {
                showMessage(response.message, 'success');
                setTimeout(() => {
                    this.goBack();
                }, 1000);
            } else {
                showMessage(response.message || 'Error al guardar el paquete', 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage('Error de conexión', 'error');
            }
        } finally {
            restoreButton(btn);
        }
    }
}

export { AdminPackageBuilderController };
