// public/assets/js/core/router/RouteModulesMap.js

/**
 * Mapeo de Rutas a Módulos JS (Lazy Loading)
 * Las llaves son las rutas limpias (sin dominio, sin basePath y sin parámetros ?id=1)
 * Los paths de importación son relativos a la ubicación de AppInit.js
 */
export const RouteModulesMap = {
    // ---- MÓDULOS PÚBLICOS / HOME ----
    // ---- MÓDULOS DE AUTENTICACIÓN ----
    '/login': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/login/two-factor': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/register': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/register/aditional-data': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/register/verification-account': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/forgot-password': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/reset-password': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    
    // ---- MÓDULOS DE POLÍTICAS DEL SITIO ----
    '/site-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-article' },
    '/site-policy/terms-conditions': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-article' },
    '/site-policy/privacy-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-article' },
    '/site-policy/cookies-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-article' },
    '/site-policy/legal-notice': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-article' },
    '/site-policy/refund-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-article' },

    // ---- MÓDULOS DE CONFIGURACIÓN (SETTINGS) ----
    '/settings': { path: './modules/settings/ProfileController.js', className: 'ProfileController', skeletonType: 'layout-settings-profile' },
    '/settings/your-profile': { path: './modules/settings/ProfileController.js', className: 'ProfileController', skeletonType: 'layout-settings-profile' },
    '/settings/security': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-settings-generic' },
    '/settings/change-password': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-form-constrained' },
    '/settings/billing': { path: './modules/settings/BillingController.js', className: 'BillingController', skeletonType: 'layout-dashboard' },
    '/settings/purchase-history': { path: './modules/settings/PurchaseHistoryController.js', className: 'PurchaseHistoryController', skeletonType: 'layout-table' },
    '/settings/2fa': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-settings-generic' },
    '/settings/2fa/recovery-codes': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-list' },
    '/settings/2fa/deactivate': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-form-constrained' },
    '/settings/devices': { path: './modules/settings/DevicesController.js', className: 'DevicesController', skeletonType: 'layout-table' },
    '/settings/delete-account': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-form-constrained' },
    
    // ---- MÓDULOS DE ADMINISTRACIÓN DE USUARIOS Y ROLES ----
    '/admin': { path: './modules/admin/AdminDashboardController.js', className: 'AdminDashboardController', requiresAdminLang: true, skeletonType: 'layout-dashboard' },
    '/admin/dashboard': { path: './modules/admin/AdminDashboardController.js', className: 'AdminDashboardController', requiresAdminLang: true, skeletonType: 'layout-dashboard' },
    '/admin/manage-users': { path: './modules/admin/users/AdminUsersController.js', className: 'AdminUsersController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/manage-roles': { path: './modules/admin/roles/AdminRolesController.js', className: 'AdminRolesController', requiresAdminLang: true, skeletonType: 'layout-table' }, 
    
    '/admin/roles/create': { path: './modules/admin/roles/AdminRoleBuilderController.js', className: 'AdminRoleBuilderController', requiresAdminLang: true, skeletonType: 'layout-form-full' },
    '/admin/roles/edit': { path: './modules/admin/roles/AdminRoleBuilderController.js', className: 'AdminRoleBuilderController', requiresAdminLang: true, skeletonType: 'layout-form-full' },
    '/admin/roles/permissions': { path: './modules/admin/roles/AdminRolePermissionsController.js', className: 'AdminRolePermissionsController', requiresAdminLang: true, skeletonType: 'layout-form-full' },

    '/admin/edit-user': { path: './modules/admin/users/AdminUserEditController.js', className: 'AdminUserEditController', requiresAdminLang: true, skeletonType: 'layout-form-constrained' },
    '/admin/edit-user-role': { path: './modules/admin/users/AdminUserRoleEditController.js', className: 'AdminUserRoleEditController', requiresAdminLang: true, skeletonType: 'layout-form-constrained' },
    '/admin/edit-status': { path: './modules/admin/users/AdminStatusEditController.js', className: 'AdminStatusEditController', requiresAdminLang: true, skeletonType: 'layout-form-constrained' },
    '/admin/user-history': { path: './modules/admin/users/AdminUserHistoryController.js', className: 'AdminUserHistoryController', requiresAdminLang: true, skeletonType: 'layout-list' },

    // ---- MÓDULOS DE SISTEMA / SERVIDOR ----
    '/admin/server-config': { path: './modules/admin/server/AdminServerConfigController.js', className: 'AdminServerConfigController', requiresAdminLang: true, skeletonType: 'layout-admin-actions' },
    '/admin/protocols': { path: './modules/admin/server/AdminSystemProtocolsController.js', className: 'AdminSystemProtocolsController', requiresAdminLang: true, skeletonType: 'layout-admin-actions' },
    
    // ---- MÓDULOS DE BACKUPS ----
    '/admin/backups': { path: './modules/admin/backups/AdminBackupsController.js', className: 'AdminBackupsController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/backups/automation': { path: './modules/admin/backups/AdminBackupsAutomationController.js', className: 'AdminBackupsAutomationController', requiresAdminLang: true, skeletonType: 'layout-form-constrained' },
    '/admin/backups/create': { path: './modules/admin/backups/AdminBackupsCreateController.js', className: 'AdminBackupsCreateController', requiresAdminLang: true, skeletonType: 'layout-form-constrained' },
    '/admin/backups/restore': { path: './modules/admin/backups/AdminBackupsRestoreController.js', className: 'AdminBackupsRestoreController', requiresAdminLang: true, skeletonType: 'layout-form-constrained' },

    // ---- MÓDULOS DE LOGS ----
    '/admin/logs': { path: './modules/admin/logs/AdminLogsController.js', className: 'AdminLogsController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/logs/viewer': { path: './modules/admin/logs/AdminLogsViewerController.js', className: 'AdminLogsViewerController', requiresAdminLang: true, skeletonType: 'layout-list' }
};