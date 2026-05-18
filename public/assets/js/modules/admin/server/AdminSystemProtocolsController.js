// public/assets/js/modules/admin/server/AdminSystemProtocolsController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { DialogSystem } from '../../../core/components/DialogSystem.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminSystemProtocolsController {
    
    constructor() {
        this.api = new ApiService();
        this.dialog = new DialogSystem(); 
        this.abortController = null;
        
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        
        if (this.dialog) {
            this.dialog.destroy();
        }

        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    handleClick(e) {
        // Tolerante con ambas rutas en caso de migraciones
        if (!window.location.pathname.includes('/admin/system/protocols') && !window.location.pathname.includes('/admin/protocols')) return;

        const btnFlush = e.target.closest('[data-action="flushSessions"]');
        if (btnFlush) this.handleFlushSessions(btnFlush);

        const btnCache = e.target.closest('[data-action="clearCache"]');
        if (btnCache) this.handleClearCache(btnCache);

        const btnLimits = e.target.closest('[data-action="resetRateLimits"]');
        if (btnLimits) this.handleResetRateLimits(btnLimits);

        const btnPanic = e.target.closest('[data-action="togglePanicMode"]');
        if (btnPanic) this.handleTogglePanicMode(btnPanic);
    }

    async executeMaintenanceAction(apiRoute, dialogConfig, successMessageCallback, btnElement, extraPayload = {}) {
        const result = await this.dialog.show('warning', {
            title: dialogConfig.title,
            message: dialogConfig.message,
            inputs: [
                {
                    id: 'admin_password',
                    type: 'password',
                    placeholder: window.__ ? __('admin_password_placeholder') : 'Contraseña de Administrador',
                    required: true
                }
            ],
            confirmText: window.__ ? __('admin_btn_execute') : 'Ejecutar',
            cancelText: window.__ ? __('admin_btn_cancel') : 'Cancelar',
            dangerBtn: dialogConfig.dangerBtn || false
        });

        if (result.confirmed) {
            const password = result.data.admin_password;
            
            if (!password) {
                showMessage(window.__ ? __('admin_error_password_required') : 'La contraseña es obligatoria', 'error');
                return false; 
            }

            if (btnElement) setButtonLoading(btnElement);

            try {
                // Combinamos la contraseña con los datos adicionales (ej: is_active)
                const payload = { password: password, ...extraPayload };
                const response = await this.api.post(apiRoute, payload, this.abortController.signal);
                
                if (response && response.aborted) return true;

                if (response && response.success) {
                    showMessage(successMessageCallback(response), 'success');
                    
                    // Si la acción era el modo pánico, recargamos para reflejar el estado en toda la UI
                    if (apiRoute === ApiRoutes.Admin?.TogglePanicMode) {
                        setTimeout(() => window.location.reload(), 1500);
                    }
                    
                    return true; 
                } else {
                    showMessage((response && response.message) || (window.__ ? __('admin_error_execution') : 'Error al ejecutar la acción'), 'error');
                    return false; 
                }
            } catch (error) {
                console.error('Action Error:', error);
                showMessage(window.__ ? __('admin_error_server_connection') : 'Error de conexión con el servidor.', 'error');
                return false;
            } finally {
                if (btnElement) restoreButton(btnElement);
            }
        }
    }

    async handleTogglePanicMode(btn) {
        // Se asume que el botón tiene un data-status renderizado desde PHP ("active" o "inactive")
        const isActivating = btn.dataset.status !== 'active';
        
        // DOBLE CHECK 1: Advertencia Crítica sin contraseña
        const firstCheck = await this.dialog.show('warning', {
            title: isActivating 
                ? (window.__ ? __('admin_panic_title_activate') : 'ACTIVAR MODO PÁNICO') 
                : (window.__ ? __('admin_panic_title_deactivate') : 'DESACTIVAR MODO PÁNICO'),
            message: isActivating 
                ? (window.__ ? __('admin_panic_msg_activate') : 'ADVERTENCIA CRÍTICA: Estás a punto de activar el Protocolo de Defensa. Esto restringirá el acceso y funciones. ¿Estás absolutamente seguro?')
                : (window.__ ? __('admin_panic_msg_deactivate') : 'Estás a punto de desactivar el Protocolo de Defensa y restaurar la normalidad. ¿Continuar?'),
            confirmText: window.__ ? __('admin_btn_confirm_sure') : 'Sí, estoy seguro',
            cancelText: window.__ ? __('admin_btn_cancel') : 'Cancelar',
            dangerBtn: isActivating
        });

        if (!firstCheck.confirmed) return;

        // DOBLE CHECK 2: Sudo-Mode (Verificación de Contraseña)
        this.executeMaintenanceAction(
            ApiRoutes.Admin?.TogglePanicMode || '/api/admin/toggle-panic-mode',
            {
                title: window.__ ? __('admin_panic_verify_title') : 'Confirmación de Identidad',
                message: window.__ ? __('admin_panic_verify_msg') : 'Ingresa tu contraseña de SuperAdministrador para ejecutar esta directiva crítica.',
                dangerBtn: isActivating
            },
            (res) => res.is_active 
                ? (window.__ ? __('admin_panic_success_activated') : 'Modo Pánico ACTIVADO. El sistema está en contención.') 
                : (window.__ ? __('admin_panic_success_deactivated') : 'Modo Pánico DESACTIVADO. Sistema normalizado.'),
            btn,
            { is_active: isActivating } // Se envía el boolean deseado a la API
        );
    }

    handleFlushSessions(btn) {
        this.executeMaintenanceAction(
            ApiRoutes.Admin?.MaintenanceFlushSessions || '/api/admin/maintenance/flush-sessions',
            {
                title: window.__ ? __('admin_maintenance_flush_title') : 'Cierre de Sesiones Global',
                message: window.__ ? __('admin_maintenance_flush_msg') : 'Esta acción cerrará TODAS las sesiones activas en el sistema, exceptuando la tuya. Ingresa tu contraseña.',
                dangerBtn: true
            },
            (res) => (window.__ ? __('admin_maintenance_flush_success') : 'Acción completada. Sesiones cerradas: ') + (res.deleted_count || 0),
            btn
        );
    }

    handleClearCache(btn) {
        this.executeMaintenanceAction(
            ApiRoutes.Admin?.MaintenanceClearCache || '/api/admin/maintenance/clear-cache',
            {
                title: window.__ ? __('admin_maintenance_cache_title') : 'Limpiar Caché del Sistema',
                message: window.__ ? __('admin_maintenance_cache_msg') : 'Se borrará el almacenamiento temporal de datos (roles, permisos, idiomas). Ingresa tu contraseña.',
                dangerBtn: false
            },
            (res) => (window.__ ? __('admin_maintenance_cache_success') : 'Caché limpiada. Elementos: ') + (res.deleted_count || 0),
            btn
        );
    }

    handleResetRateLimits(btn) {
        this.executeMaintenanceAction(
            ApiRoutes.Admin?.MaintenanceResetRateLimits || '/api/admin/maintenance/reset-rate-limits',
            {
                title: window.__ ? __('admin_maintenance_limits_title') : 'Restablecer Rate Limits',
                message: window.__ ? __('admin_maintenance_limits_msg') : 'Se eliminarán todos los bloqueos temporales por intentos fallidos de todos los usuarios e IPs.',
                dangerBtn: false
            },
            (res) => (window.__ ? __('admin_maintenance_limits_success') : 'Límites restablecidos. Bloqueos removidos: ') + (res.deleted_count || 0),
            btn
        );
    }
}

export { AdminSystemProtocolsController };