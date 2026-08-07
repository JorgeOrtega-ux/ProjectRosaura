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
    }

    goBack() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/store-packages`);
        } else {
            window.location.href = `${this.basePath}/admin/store-packages`;
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
            display.textContent = newVal || 'Sin configurar';
            input.setAttribute('data-original-value', newVal);
        }

        editState.classList.remove('active');
        editState.classList.add('disabled');
        viewState.classList.remove('disabled');
        viewState.classList.add('active');
    }

    adjustConfig(btn) {
        const field = btn.dataset.field;
        const isDecimal = btn.dataset.decimal === 'true';
        const step = isDecimal ? parseFloat(btn.dataset.step) : parseInt(btn.dataset.step, 10);
        const min = btn.dataset.min !== undefined ? parseFloat(btn.dataset.min) : -999999;
        const max = btn.dataset.max !== undefined ? parseFloat(btn.dataset.max) : 999999;
        
        const center = document.querySelector(`[data-ref="val_${field}"]`);
        if (!center) return;
        
        let currentVal = isDecimal ? parseFloat(center.dataset.value || 0) : parseInt(center.dataset.value || 0, 10);
        let newVal = currentVal + step;
        
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;
        
        if (isDecimal) {
            newVal = Math.round(newVal * 100) / 100;
            center.dataset.value = newVal;
            center.textContent = newVal.toFixed(2);
        } else {
            center.dataset.value = newVal;
            center.textContent = newVal.toLocaleString();
        }
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

        const amountVal = document.querySelector('[data-ref="val_pkgAmount"]')?.dataset.value;
        const priceVal = document.querySelector('[data-ref="val_pkgPrice"]')?.dataset.value;

        const data = {
            uuid: uuid,
            name: name,
            amount: amountVal !== undefined ? parseInt(amountVal, 10) : 1000,
            price_usd: priceVal !== undefined ? parseFloat(priceVal) : 2.99,
            description: document.querySelector('[data-ref="input-pkg-desc"]')?.value || '',
            bonus_text: document.querySelector('[data-ref="input-pkg-bonus"]')?.value || '',
            stripe_price_id: document.querySelector('[data-ref="input-pkg-stripe"]')?.value || '',
            icon: document.querySelector('[data-ref="input-pkg-icon"]')?.value || 'monetization_on'
        };

        setButtonLoading(btn);
        try {
            const response = await this.api.post(ApiRoutes.Admin.SaveStorePackage, data, this.abortController?.signal);
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
                showMessage('Error de conexión: ' + error.message, 'error');
            }
        } finally {
            restoreButton(btn);
        }
    }
}

export { AdminPackageBuilderController };
