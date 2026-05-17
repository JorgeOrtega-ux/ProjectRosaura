// public/assets/js/modules/admin/server/AdminServerConfigController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminServerConfigController {
    constructor() {
        this.api = new ApiService();
        this.initialState = null;
        this.state = {};
        this.abortController = null;

        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        
        this.bindEvents();
        if (window.location.pathname.includes('/admin/server-config')) {
            this.loadData();
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }

        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
        document.removeEventListener('input', this.handleInputBound);
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
        document.addEventListener('input', this.handleInputBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/server-config')) {
            this.loadData();
        }
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/server-config')) return;

        const btnAdjust = e.target.closest('[data-action="adjustConfig"]');
        if (btnAdjust) this.handleAdjustment(btnAdjust);

        const btnSave = e.target.closest('[data-action="submitServerConfig"]');
        if (btnSave) this.submitConfig(btnSave);
    }

    handleChange(e) {
        if (!window.location.pathname.includes('/admin/server-config')) return;
        
        if (e.target && e.target.getAttribute('data-action') === 'toggleMaintenance') {
            this.state['maintenance_mode'] = e.target.checked ? 1 : 0;
            this.checkForChanges();
        }

        if (e.target && e.target.getAttribute('data-action') === 'toggleAllowRegistrations') {
            this.state['allow_registrations'] = e.target.checked ? 1 : 0;
            this.checkForChanges();
        }
    }

    handleInput(e) {
        if (!window.location.pathname.includes('/admin/server-config')) return;
        
        if (e.target && e.target.getAttribute('data-action') === 'updateTextConfig') {
            const field = e.target.getAttribute('data-field');
            if (field) {
                this.state[field] = e.target.value;
                this.checkForChanges();
            }
        }
    }

    loadData() {
        // En lugar de usar contenedores o bloques JSON, reconstruimos 
        // la información vital para el DOM dinámico leyendo el HTML que el SSR nos dejó
        const state = {};
        
        // 1. Textos numéricos (controles incrementales/decrementales)
        document.querySelectorAll('[data-ref^="val_"]').forEach(el => {
            const key = el.getAttribute('data-ref').replace('val_', '');
            state[key] = Number(el.getAttribute('data-val'));
        });

        // 2. Inputs de texto puro
        document.querySelectorAll('input[data-action="updateTextConfig"]').forEach(input => {
            const key = input.getAttribute('data-field');
            if (key) {
                state[key] = input.value;
            }
        });

        // 3. Toggles de configuración binaria
        const maintenanceSwitch = document.querySelector('[data-ref="toggle_maintenance_mode"]');
        if (maintenanceSwitch) {
            state['maintenance_mode'] = maintenanceSwitch.checked ? 1 : 0;
        }

        const registrationsSwitch = document.querySelector('[data-ref="toggle_allow_registrations"]');
        if (registrationsSwitch) {
            state['allow_registrations'] = registrationsSwitch.checked ? 1 : 0;
        }

        this.state = state;
        this.initialState = JSON.parse(JSON.stringify(this.state));

        // Por si se re-hidrata después de la primera carga
        this.renderValues();
        this.checkForChanges();
        
        // Retiramos la clase disable para revelar los contenedores
        const groups = document.querySelectorAll('[data-ref="admin-config-group"]');
        groups.forEach(el => el.classList.remove('disabled'));
    }

    renderValues() {
        for (const key in this.state) {
            const el = document.querySelector(`[data-ref="val_${key}"]`);
            if (el) {
                el.textContent = this.state[key];
                el.setAttribute('data-val', this.state[key]);
            }

            const inputEl = document.querySelector(`[data-ref="input_${key}"]`);
            if (inputEl) {
                inputEl.value = (this.state[key] !== null && this.state[key] !== undefined) ? this.state[key] : '';
            }
        }

        const maintenanceSwitch = document.querySelector('[data-ref="toggle_maintenance_mode"]');
        if (maintenanceSwitch && this.state.maintenance_mode !== undefined) {
            maintenanceSwitch.checked = (parseInt(this.state.maintenance_mode) === 1);
        }

        const registrationsSwitch = document.querySelector('[data-ref="toggle_allow_registrations"]');
        if (registrationsSwitch && this.state.allow_registrations !== undefined) {
            registrationsSwitch.checked = (parseInt(this.state.allow_registrations) === 1);
        }
    }

    handleAdjustment(btn) {
        const targetField = btn.getAttribute('data-field');
        const step = parseInt(btn.getAttribute('data-step')) || 1;
        const min = parseInt(btn.getAttribute('data-min')) || 0;
        const max = parseInt(btn.getAttribute('data-max')) || 999999;

        if (this.state[targetField] !== undefined) {
            let currentVal = parseInt(this.state[targetField]);
            let newVal = currentVal + step;
            
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;

            this.state[targetField] = newVal;
            this.renderValues();
            this.checkForChanges();
        }
    }

    checkForChanges() {
        if (!this.initialState) return;

        let hasChanges = false;
        for (const key in this.state) {
            if (this.state[key] !== this.initialState[key]) {
                hasChanges = true;
                break;
            }
        }

        const btnSave = document.querySelector('[data-ref="btn-save-config"]');

        if (hasChanges) {
            if (btnSave) btnSave.classList.remove('disabled-interaction');
        } else {
            if (btnSave) btnSave.classList.add('disabled-interaction');
        }
    }

    async submitConfig(btn) {
        // Invocamos el diálogo de verificación antes de proceder
        const resultDialog = await window.dialogSystem.show('verifyPasswordDialog', {
            title: __('admin_verify_identity_title'),
            desc: __('admin_verify_identity_desc_config'),
            confirmText: __('btn_save_config')
        });

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['dialog_verify_password'] ? resultDialog.data['dialog_verify_password'].trim() : '';

        if (!password) {
            showMessage(__('err_admin_password_required'), 'error');
            return;
        }

        setButtonLoading(btn);

        const payload = {
            config: this.state,
            password: password
        };

        const result = await this.api.post(ApiRoutes.Admin.UpdateServerConfig, payload, this.abortController.signal);

        if (result.aborted) return;

        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
            // Re-sincronizamos el estado actual como punto de partida 
            this.initialState = JSON.parse(JSON.stringify(this.state));
            this.checkForChanges(); 
        } else {
            showMessage(result.message, 'error');
        }
    }
}

export { AdminServerConfigController };