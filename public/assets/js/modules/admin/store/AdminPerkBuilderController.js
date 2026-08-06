import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminPerkBuilderController {
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
            window.spaRouter.navigate(`${this.basePath}/admin/store-perks`);
        } else {
            window.location.href = `${this.basePath}/admin/store-perks`;
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

    async savePerk(btn) {
        const wrapper = document.querySelector('[data-ref="admin-store-perk-wrapper"]');
        if (!wrapper) return;

        const uuid = wrapper.getAttribute('data-perk-uuid') || '';
        
        const perkIdInput = document.querySelector('[data-ref="input-perk-id"]');
        const perkId = perkIdInput ? perkIdInput.value.trim() : '';

        const nameInput = document.querySelector('[data-ref="input-perk-name"]');
        const name = nameInput ? nameInput.value.trim() : '';
        
        if (!perkId) {
            showMessage("El Identificador de Backend (Perk ID) es obligatorio.", "warning");
            return;
        }

        if (!name) {
            showMessage("El nombre o clave de traducción es obligatorio.", "warning");
            return;
        }

        const priceVal = document.querySelector('[data-ref="val_perkPrice"]')?.dataset.value;

        const data = {
            uuid: uuid,
            perk_id: perkId,
            name: name,
            price_coins: priceVal !== undefined ? parseInt(priceVal, 10) : 1000,
            description: document.querySelector('[data-ref="input-perk-desc"]')?.value || '',
            icon: document.querySelector('[data-ref="input-perk-icon"]')?.value || 'shield',
            is_active: document.querySelector('[data-ref="toggle-active"]')?.checked ? 1 : 0
        };

        setButtonLoading(btn);
        try {
            const response = await this.api.post(ApiRoutes.SaveStorePerk, data, this.abortController?.signal);
            if (response.success) {
                showMessage(response.message, 'success');
                setTimeout(() => {
                    this.goBack();
                }, 1000);
            } else {
                showMessage(response.message || 'Error al guardar la ventaja', 'error');
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

export { AdminPerkBuilderController };
