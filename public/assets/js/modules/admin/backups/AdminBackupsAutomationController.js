// public/assets/js/modules/admin/backups/AdminBackupsAutomationController.js
import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminBackupsAutomationController {
    constructor() {
        this.api = new ApiService();
        this.initialState = null;
        this.state = {};

        this.freqMap = {
            0: 'Modo prueba (10 segundos)',
            1: 'Cada 1 hora',
            3: 'Cada 3 horas',
            6: 'Cada 6 horas',
            12: 'Cada 12 horas',
            24: 'Cada 1 día (24 hrs)',
            48: 'Cada 2 días (48 hrs)',
            168: 'Cada 1 semana (168 hrs)',
            720: 'Cada 1 mes (720 hrs)'
        };
    }

    init() {
        this.bindEvents();
        if (window.location.pathname.includes('/admin/backups/automation')) {
            this.loadCurrentConfig();
        }
    }

    bindEvents() {
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/backups/automation')) {
                this.loadCurrentConfig();
            }
        });

        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/backups/automation')) return;

            // Abrir dropdown
            const btnToggleModule = e.target.closest('[data-action="adminToggleModule"]');
            if (btnToggleModule && !btnToggleModule.classList.contains('disabled-interaction')) {
                const target = btnToggleModule.getAttribute('data-target');
                if (window.appInstance) window.appInstance.toggleModule(target);
            }

            // Seleccionar opción del dropdown
            const btnSetDropdown = e.target.closest('[data-action="adminSetDropdown"]');
            if (btnSetDropdown) {
                const key = btnSetDropdown.getAttribute('data-key');
                const val = parseInt(btnSetDropdown.getAttribute('data-value'));
                
                this.state[key] = val;
                
                const module = btnSetDropdown.closest('.component-module');
                if (module && window.appInstance) window.appInstance.closeModule(module);
                
                this.renderValues();
                this.checkForChanges();
            }

            // Control inline (Solo para la retención ahora)
            const btnAdjust = e.target.closest('[data-action="adjustAutoConfig"]');
            if (btnAdjust) this.handleAdjustment(btnAdjust);

            // Guardar
            const btnSave = e.target.closest('[data-action="submitAutoBackupConfig"]');
            if (btnSave) this.handleSave(btnSave);

            // Contraseña
            const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
            if (togglePassBtn) {
                const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
                if (inputField && inputField.id === 'admin_auto_password') {
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

        // Toggle Switch Principal
        document.addEventListener('change', (e) => {
            if (!window.location.pathname.includes('/admin/backups/automation')) return;

            if (e.target && e.target.id === 'toggle-auto-backup') {
                this.state.auto_backup_enabled = e.target.checked ? 1 : 0;
                this.renderVisibility();
                this.checkForChanges();
            }
        });
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else {
            alert(msg);
        }
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

    async loadCurrentConfig() {
        const loader = document.getElementById('admin-auto-loader');
        const form = document.getElementById('admin-auto-form');
        const passInput = document.getElementById('admin_auto_password');
        
        if (passInput) passInput.value = '';

        try {
            const response = await this.api.post(ApiRoutes.Admin.GetServerConfig);
            
            if (response.success && response.config) {
                this.state = {
                    auto_backup_enabled: parseInt(response.config.auto_backup_enabled) || 0,
                    auto_backup_frequency_hours: parseInt(response.config.auto_backup_frequency_hours) || 24,
                    auto_backup_retention_count: parseInt(response.config.auto_backup_retention_count) || 5
                };
                
                this.initialState = JSON.parse(JSON.stringify(this.state));

                this.renderValues();
                this.renderVisibility();
                this.checkForChanges();

                if (loader) loader.classList.add('disabled');
                if (form) form.classList.remove('disabled');
            } else {
                this.showMessage(response.message || 'No se pudo cargar la configuración.', 'error');
            }
        } catch (error) {
            console.error(error);
            this.showMessage('Problema de conexión con el servidor.', 'error');
        }
    }

    renderValues() {
        const toggle = document.getElementById('toggle-auto-backup');
        if (toggle) toggle.checked = this.state.auto_backup_enabled === 1;

        // Render Dropdown Text (Frecuencia)
        const freqText = document.querySelector('[data-ref="admin-autoFreq-text"]');
        if (freqText) {
            freqText.textContent = this.freqMap[this.state.auto_backup_frequency_hours] || `Cada ${this.state.auto_backup_frequency_hours} horas`;
        }

        // Marcar la clase 'active' en el item del dropdown correspondiente
        document.querySelectorAll('[data-action="adminSetDropdown"][data-key="auto_backup_frequency_hours"]').forEach(el => {
            el.classList.toggle('active', parseInt(el.getAttribute('data-value')) === this.state.auto_backup_frequency_hours);
        });

        // Render Inline Control (Retención)
        const elRet = document.getElementById('val_auto_backup_retention_count');
        if (elRet) {
            elRet.textContent = this.state.auto_backup_retention_count;
            elRet.setAttribute('data-val', this.state.auto_backup_retention_count);
        }
    }

    renderVisibility() {
        const wrapperOptions = document.getElementById('wrapper-auto-options');
        if (wrapperOptions) {
            if (this.state.auto_backup_enabled === 1) {
                wrapperOptions.classList.remove('disabled');
            } else {
                wrapperOptions.classList.add('disabled');
            }
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

        const passArea = document.getElementById('admin-auto-password-area');
        const btnSave = document.getElementById('btn-save-auto-backup');

        if (hasChanges) {
            if (passArea) passArea.classList.remove('disabled');
            if (btnSave) btnSave.classList.remove('disabled-interaction');
        } else {
            if (passArea) passArea.classList.add('disabled');
            if (btnSave) btnSave.classList.add('disabled-interaction');
        }
    }

    async handleSave(btn) {
        const passInput = document.getElementById('admin_auto_password');
        const password = passInput ? passInput.value.trim() : '';

        if (!password) {
            this.showMessage('Debes ingresar tu contraseña de administrador para guardar los cambios.', 'warning');
            return;
        }

        this.setButtonLoading(btn);

        try {
            const reqData = {
                password: password,
                config: {
                    auto_backup_enabled: this.state.auto_backup_enabled,
                    auto_backup_frequency_hours: this.state.auto_backup_frequency_hours,
                    auto_backup_retention_count: this.state.auto_backup_retention_count
                }
            };

            const response = await this.api.post(ApiRoutes.Admin.UpdateServerConfig, reqData);
            
            this.restoreButton(btn);

            if (response.success) {
                this.showMessage('Configuración de automatización guardada exitosamente.', 'success');
                this.loadCurrentConfig(); 
            } else {
                this.showMessage(response.message, 'error');
            }

        } catch (error) {
            console.error(error);
            this.restoreButton(btn);
            this.showMessage('No se pudo guardar la configuración debido a un error de red.', 'error');
        }
    }
}