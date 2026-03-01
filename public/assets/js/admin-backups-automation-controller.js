// public/assets/js/admin-backups-automation-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class AdminBackupsAutomationController {
    constructor() {
        this.api = new ApiService();
        this.toggleAuto = null;
        this.inputFreq = null;
        this.inputRetention = null;
        this.btnSave = null;
        this.wrapperOptions = null;
    }

    init() {
        // Escuchar la navegación SPA
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/backups/automation')) {
                this.setupView();
            }
        });

        // Ejecutar si se carga la página directamente (F5)
        if (window.location.pathname.includes('/admin/backups/automation')) {
            this.setupView();
        }
    }

    setupView() {
        this.bindElements();
        this.loadCurrentConfig();
        this.bindEvents();
    }

    bindElements() {
        this.toggleAuto = document.getElementById('toggle-auto-backup');
        this.inputFreq = document.getElementById('input-auto-freq');
        this.inputRetention = document.getElementById('input-auto-retention');
        this.btnSave = document.getElementById('btn-save-auto-backup');
        this.wrapperOptions = document.getElementById('wrapper-auto-options');
    }

    bindEvents() {
        if (this.toggleAuto) {
            // Usamos onchange para evitar múltiples listeners si se recarga la vista
            this.toggleAuto.onchange = () => {
                if (this.toggleAuto.checked) {
                    this.wrapperOptions.classList.remove('disabled');
                } else {
                    this.wrapperOptions.classList.add('disabled');
                }
            };
        }

        if (this.btnSave) {
            this.btnSave.onclick = () => this.handleSave();
        }
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else {
            alert(msg);
        }
    }

    async loadCurrentConfig() {
        try {
            // Usamos el método post apuntando a la ruta GetServerConfig
            const response = await this.api.post(ApiRoutes.Admin.GetServerConfig);
            
            if (response.success && response.config) {
                const config = response.config;
                
                this.toggleAuto.checked = config.auto_backup_enabled == 1;
                this.inputFreq.value = config.auto_backup_frequency_hours;
                this.inputRetention.value = config.auto_backup_retention_count;

                if (!this.toggleAuto.checked) {
                    this.wrapperOptions.classList.add('disabled');
                } else {
                    this.wrapperOptions.classList.remove('disabled');
                }
            } else {
                this.showMessage(response.message || 'No se pudo cargar la configuración.', 'error');
            }
        } catch (error) {
            console.error(error);
            this.showMessage('Problema de conexión con el servidor.', 'error');
        }
    }

    async handleSave() {
        const isEnabled = this.toggleAuto.checked ? 1 : 0;
        const freq = parseInt(this.inputFreq.value);
        const retention = parseInt(this.inputRetention.value);

        if (isEnabled && (isNaN(freq) || freq < 1)) {
            this.showMessage('La frecuencia debe ser de al menos 1 hora.', 'warning');
            return;
        }

        if (isEnabled && (isNaN(retention) || retention < 1)) {
            this.showMessage('La retención mínima es de 1 copia.', 'warning');
            return;
        }

        // Solicitamos la contraseña para autorizar el cambio (Seguridad)
        const password = prompt('Por favor, ingresa tu contraseña de administrador para guardar esta configuración:');
        
        if (!password) {
            this.showMessage('La contraseña es obligatoria para guardar cambios.', 'warning');
            return;
        }

        try {
            this.btnSave.disabled = true;
            const originalText = this.btnSave.innerHTML;
            this.btnSave.innerHTML = '<div class="component-spinner"></div>';

            const reqData = {
                password: password,
                config: {
                    auto_backup_enabled: isEnabled,
                    auto_backup_frequency_hours: freq,
                    auto_backup_retention_count: retention
                }
            };

            // Usamos el método post apuntando a UpdateServerConfig
            const response = await this.api.post(ApiRoutes.Admin.UpdateServerConfig, reqData);
            
            if (response.success) {
                this.showMessage(response.message, 'success');
            } else {
                this.showMessage(response.message, 'error');
            }
            
            this.btnSave.innerHTML = originalText;
            this.btnSave.disabled = false;

        } catch (error) {
            console.error(error);
            this.btnSave.disabled = false;
            this.showMessage('No se pudo guardar la configuración debido a un error de red.', 'error');
        }
    }
}