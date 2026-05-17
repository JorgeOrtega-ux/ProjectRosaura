// public/assets/js/modules/admin/server/AdminSystemMaintenanceController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { DialogSystem } from '../../../core/components/DialogSystem.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminSystemMaintenanceController {
    
    constructor() {
        this.api = new ApiService();
        // FIX 1: Instanciamos el DialogSystem en lugar de llamarlo estáticamente
        this.dialog = new DialogSystem(); 
        this.abortController = null;
        
        // Binding del contexto para los listeners globales
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
        
        // Limpiamos el modal si el controlador se destruye
        if (this.dialog) {
            this.dialog.destroy();
        }

        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    handleClick(e) {
        // Validación tolerante para soportar ambas rutas (/system/ o /server/)
        if (!window.location.pathname.includes('/admin/system/maintenance') && !window.location.pathname.includes('/admin/server/maintenance')) return;

        const btnFlush = e.target.closest('[data-action="flushSessions"]');
        if (btnFlush) this.handleFlushSessions(btnFlush);

        const btnCache = e.target.closest('[data-action="clearCache"]');
        if (btnCache) this.handleClearCache(btnCache);

        const btnLimits = e.target.closest('[data-action="resetRateLimits"]');
        if (btnLimits) this.handleResetRateLimits(btnLimits);
    }

    async executeMaintenanceAction(apiRoute, dialogConfig, successMessageCallback, btnElement) {
        // FIX 2: Usar async/await con la nueva estructura de Promesas del DialogSystem
        // Pasamos 'warning' como nombre de la plantilla según el type que usabas antes
        const result = await this.dialog.show('warning', {
            title: dialogConfig.title,
            message: dialogConfig.message,
            inputs: [
                {
                    id: 'admin_password',
                    type: 'password',
                    placeholder: 'Contraseña de Administrador',
                    required: true
                }
            ],
            confirmText: 'Ejecutar',
            cancelText: 'Cancelar',
            dangerBtn: dialogConfig.dangerBtn || false
        });

        // Si el usuario confirmó el diálogo
        if (result.confirmed) {
            const password = result.data.admin_password;
            
            if (!password) {
                showMessage('La contraseña es obligatoria', 'error');
                return false; 
            }

            if (btnElement) setButtonLoading(btnElement);

            try {
                const response = await this.api.post(apiRoute, { password: password }, this.abortController.signal);
                
                if (response && response.aborted) return true; // Si fue abortado, cerramos silenciosamente

                if (response && response.success) {
                    showMessage(successMessageCallback(response), 'success');
                    return true; 
                } else {
                    showMessage((response && response.message) || 'Error al ejecutar la acción', 'error');
                    return false; 
                }
            } catch (error) {
                console.error('Maintenance Action Error:', error);
                showMessage('Ocurrió un error inesperado al conectar con el servidor.', 'error');
                return false;
            } finally {
                if (btnElement) restoreButton(btnElement);
            }
        }
    }

    handleFlushSessions(btn) {
        this.executeMaintenanceAction(
            ApiRoutes.Admin?.MaintenanceFlushSessions || '/api/admin/maintenance/flush-sessions',
            {
                title: 'Cierre de Sesiones Global',
                message: 'Esta acción cerrará TODAS las sesiones activas en el sistema, exceptuando la tuya. Los usuarios deberán volver a iniciar sesión. Ingresa tu contraseña para confirmar.',
                dangerBtn: true
            },
            (res) => `Acción completada. Se cerraron ${res.deleted_count || 0} sesiones activas.`,
            btn
        );
    }

    handleClearCache(btn) {
        this.executeMaintenanceAction(
            ApiRoutes.Admin?.MaintenanceClearCache || '/api/admin/maintenance/clear-cache',
            {
                title: 'Limpiar Caché del Sistema',
                message: 'Se borrará el almacenamiento temporal de datos (roles, permisos, idiomas). El sistema se reconstruirá en las próximas peticiones. Ingresa tu contraseña.',
                dangerBtn: false
            },
            (res) => `Caché limpiada exitosamente. Elementos removidos: ${res.deleted_count || 0}.`,
            btn
        );
    }

    handleResetRateLimits(btn) {
        this.executeMaintenanceAction(
            ApiRoutes.Admin?.MaintenanceResetRateLimits || '/api/admin/maintenance/reset-rate-limits',
            {
                title: 'Restablecer Rate Limits',
                message: 'Se eliminarán todos los bloqueos temporales por intentos fallidos (login, registros, spam) de todos los usuarios e IPs. Ingresa tu contraseña.',
                dangerBtn: false
            },
            (res) => `Límites restablecidos. Bloqueos removidos: ${res.deleted_count || 0}.`,
            btn
        );
    }
}

export { AdminSystemMaintenanceController };