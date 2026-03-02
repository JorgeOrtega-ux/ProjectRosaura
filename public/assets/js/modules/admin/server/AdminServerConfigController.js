// public/assets/js/modules/admin/server/AdminServerConfigController.js
import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminServerConfigController {
    constructor() {
        this.api = new ApiService();
        this.initialState = null;
        this.state = {};
    }

    init() {
        this.bindEvents();
        if (window.location.pathname.includes('/admin/server-config')) {
            this.loadData();
        }
    }

    bindEvents() {
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/server-config')) {
                this.loadData();
            }
        });

        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/server-config')) return;

            const btnAdjust = e.target.closest('[data-action="adjustConfig"]');
            if (btnAdjust) this.handleAdjustment(btnAdjust);

            const btnSave = e.target.closest('[data-action="submitServerConfig"]');
            if (btnSave) this.submitConfig(btnSave);

            const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
            if (togglePassBtn) {
                const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
                if (inputField && inputField.id === 'admin_config_password') {
                    if (inputField.type === 'password') {
                        inputField.type = 'text';
                        togglePassBtn.textContent = 'visibility';
                    } else {
                        inputField.type = 'password';
                        togglePassBtn.textContent = 'visibility_off';
                    }
                }
            }
        });

        // Evento 'change' para leer el estado del Switch del Modo Mantenimiento
        document.addEventListener('change', (e) => {
            if (!window.location.pathname.includes('/admin/server-config')) return;
            
            if (e.target && e.target.getAttribute('data-action') === 'toggleMaintenance') {
                this.state['maintenance_mode'] = e.target.checked ? 1 : 0;
                this.checkForChanges();
            }
        });
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else alert(msg);
    }

    setButtonLoading(btn) {
        if (btn.disabled) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;
    }

    restoreButton(btn) {
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }

    async loadData() {
        const loader = document.getElementById('admin-config-loader');
        const passInput = document.getElementById('admin_config_password');
        if (passInput) passInput.value = '';

        const res = await this.api.post(ApiRoutes.Admin.GetServerConfig);

        if (res.success) {
            this.state = { ...res.config };
            this.initialState = JSON.parse(JSON.stringify(this.state));
            
            this.renderValues();
            this.checkForChanges();

            if (loader) loader.classList.add('disabled');
            document.querySelectorAll('.admin-config-group').forEach(el => el.classList.remove('disabled'));
        } else {
            this.showMessage(res.message, 'error');
        }
    }

    renderValues() {
        for (const key in this.state) {
            const el = document.getElementById(`val_${key}`);
            if (el) {
                el.textContent = this.state[key];
                el.setAttribute('data-val', this.state[key]);
            }
        }

        // Renderizar el estado visual del Switch del Mantenimiento
        const maintenanceSwitch = document.getElementById('toggle_maintenance_mode');
        if (maintenanceSwitch && this.state.maintenance_mode !== undefined) {
            maintenanceSwitch.checked = (parseInt(this.state.maintenance_mode) === 1);
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

        const passArea = document.getElementById('admin-config-password-area');
        const btnSave = document.getElementById('btn-save-config');

        if (hasChanges) {
            if (passArea) passArea.classList.remove('disabled');
            if (btnSave) btnSave.classList.remove('disabled-interaction');
        } else {
            if (passArea) passArea.classList.add('disabled');
            if (btnSave) btnSave.classList.add('disabled-interaction');
        }
    }

    async submitConfig(btn) {
        const passInput = document.getElementById('admin_config_password');
        const password = passInput ? passInput.value.trim() : '';

        if (!password) {
            this.showMessage('Debes ingresar tu contraseña de administrador para guardar los cambios.', 'error');
            return;
        }

        this.setButtonLoading(btn);

        const payload = {
            config: this.state,
            password: password
        };

        const result = await this.api.post(ApiRoutes.Admin.UpdateServerConfig, payload);

        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            this.loadData(); 
        } else {
            this.showMessage(result.message, 'error');
        }
    }
}