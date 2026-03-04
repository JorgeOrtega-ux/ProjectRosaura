// public/assets/js/core/router/RouteModulesMap.js

/**
 * Mapeo de Rutas a Módulos JS (Lazy Loading)
 * Las llaves son las rutas limpias (sin dominio, sin basePath y sin parámetros ?id=1)
 * Los paths de importación son relativos a la ubicación de AppInit.js
 */
export const RouteModulesMap = {
    // ---- MÓDULOS DE AUTENTICACIÓN ----
    '/login': { path: './modules/auth/AuthController.js', className: 'AuthController' },
    '/register': { path: './modules/auth/AuthController.js', className: 'AuthController' },
    '/forgot-password': { path: './modules/auth/AuthController.js', className: 'AuthController' },
    '/reset-password': { path: './modules/auth/AuthController.js', className: 'AuthController' },
    
    // ---- MÓDULOS DE CONFIGURACIÓN (SETTINGS) ----
    '/settings/your-profile': { path: './modules/settings/ProfileController.js', className: 'ProfileController' },
    '/settings/security': { path: './modules/settings/SecurityController.js', className: 'SecurityController' },
    '/settings/2fa': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController' },
    '/settings/devices': { path: './modules/settings/DevicesController.js', className: 'DevicesController' },

    // ---- MÓDULOS DE ADMINISTRACIÓN DE USUARIOS ----
    '/admin/manage-users': { path: './modules/admin/users/AdminUsersController.js', className: 'AdminUsersController' },
    '/admin/edit-user': { path: './modules/admin/users/AdminUserEditController.js', className: 'AdminUserEditController' },
    '/admin/edit-role': { path: './modules/admin/users/AdminRoleEditController.js', className: 'AdminRoleEditController' },
    '/admin/edit-status': { path: './modules/admin/users/AdminStatusEditController.js', className: 'AdminStatusEditController' },

    // ---- MÓDULOS DE SISTEMA / SERVIDOR ----
    '/admin/server-config': { path: './modules/admin/server/AdminServerConfigController.js', className: 'AdminServerConfigController' },
    
    // ---- MÓDULOS DE BACKUPS ----
    '/admin/backups': { path: './modules/admin/backups/AdminBackupsController.js', className: 'AdminBackupsController' },
    '/admin/backups-automation': { path: './modules/admin/backups/AdminBackupsAutomationController.js', className: 'AdminBackupsAutomationController' },

    // ---- MÓDULOS DE LOGS ----
    '/admin/logs': { path: './modules/admin/logs/AdminLogsController.js', className: 'AdminLogsController' },
    '/admin/logs-viewer': { path: './modules/admin/logs/AdminLogsViewerController.js', className: 'AdminLogsViewerController' }
};