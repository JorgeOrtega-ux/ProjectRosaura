// public/assets/js/core/router/RouteModulesMap.js

export const RouteModulesMap = {
    // ---- MÓDULOS PÚBLICOS / HOME ----
    '/': { path: './modules/app/home/HomeController.js', className: 'HomeController', skeletonType: 'layout-grid' },
    '/home': { path: './modules/app/home/HomeController.js', className: 'HomeController', skeletonType: 'layout-grid' },
    '/explore': { path: './modules/app/home/HomeController.js', className: 'HomeController', skeletonType: 'layout-grid' },
    
    '/search': { path: './modules/app/search/SearchController.js', className: 'SearchController', skeletonType: 'layout-basic' },
    
    '/premium': { path: './modules/app/premium/PremiumController.js', className: 'PremiumController', skeletonType: 'layout-basic' },

    '/design': { path: './modules/app/design/DesignController.js', className: 'DesignController', skeletonType: 'layout-basic' },
    
    // ---- MÓDULOS DE TIENDA ----
    '/store/coins': { path: './modules/store/StoreController.js', className: 'StoreController', skeletonType: 'layout-grid' },
    '/store/content': { path: './modules/store/StoreController.js', className: 'StoreController', skeletonType: 'layout-grid' },
    
    // ---- MÓDULOS DE AUTENTICACIÓN ----
    '/login': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-basic' },
    '/login/two-factor': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-basic' },
    '/register': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-basic' },
    '/register/aditional-data': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-basic' },
    '/register/verification-account': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-basic' },
    '/forgot-password': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-basic' },
    '/reset-password': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-basic' },
    
    // ---- MÓDULOS DE POLÍTICAS DEL SITIO ----
    '/site-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-basic' },
    '/site-policy/terms-conditions': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-basic' },
    '/site-policy/privacy-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-basic' },
    '/site-policy/cookies-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-basic' },
    '/site-policy/legal-notice': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-basic' },
    '/site-policy/refund-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-basic' },

    // ---- MÓDULOS DE CONFIGURACIÓN (SETTINGS) ----
    '/settings': { path: './modules/settings/ProfileController.js', className: 'ProfileController', skeletonType: 'layout-basic' },
    '/settings/your-profile': { path: './modules/settings/ProfileController.js', className: 'ProfileController', skeletonType: 'layout-basic' },
    '/settings/security': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-basic' },
    '/settings/change-password': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-basic' },
    '/settings/subscription': { path: './modules/settings/SubscriptionController.js', className: 'SubscriptionController', skeletonType: 'layout-basic' },
    '/settings/billing': { path: './modules/settings/BillingController.js', className: 'BillingController', skeletonType: 'layout-grid' },
    '/settings/purchase-history': { path: './modules/settings/PurchaseHistoryController.js', className: 'PurchaseHistoryController', skeletonType: 'layout-basic' },
    '/settings/2fa': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-basic' },
    '/settings/2fa/recovery-codes': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-basic' },
    '/settings/2fa/deactivate': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-basic' },
    '/settings/devices': { path: './modules/settings/DevicesController.js', className: 'DevicesController', skeletonType: 'layout-basic' },
    '/settings/delete-account': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-basic' },
    
    // ---- MÓDULOS DE ADMINISTRACIÓN DE USUARIOS Y ROLES ----
    '/admin': { path: './modules/admin/AdminDashboardController.js', className: 'AdminDashboardController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/dashboard': { path: './modules/admin/AdminDashboardController.js', className: 'AdminDashboardController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/manage-users': { path: './modules/admin/users/AdminUsersController.js', className: 'AdminUsersController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/manage-roles': { path: './modules/admin/roles/AdminRolesController.js', className: 'AdminRolesController', requiresAdminLang: true, skeletonType: 'layout-basic' }, 
    
    '/admin/roles/create': { path: './modules/admin/roles/AdminRoleBuilderController.js', className: 'AdminRoleBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/roles/edit': { path: './modules/admin/roles/AdminRoleBuilderController.js', className: 'AdminRoleBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/roles/permissions': { path: './modules/admin/roles/AdminRolePermissionsController.js', className: 'AdminRolePermissionsController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/admin/edit-user': { path: './modules/admin/users/AdminUserEditController.js', className: 'AdminUserEditController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/edit-user-role': { path: './modules/admin/users/AdminUserRoleEditController.js', className: 'AdminUserRoleEditController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/edit-status': { path: './modules/admin/users/AdminStatusEditController.js', className: 'AdminStatusEditController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/user-history': { path: './modules/admin/users/AdminUserHistoryController.js', className: 'AdminUserHistoryController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    // ---- MÓDULOS DE SISTEMA / SERVIDOR ----
    '/admin/server-config': { path: './modules/admin/server/AdminServerConfigController.js', className: 'AdminServerConfigController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    
    // ---- MÓDULOS DE BACKUPS ----
    '/admin/backups': { path: './modules/admin/backups/AdminBackupsController.js', className: 'AdminBackupsController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/backups/automation': { path: './modules/admin/backups/AdminBackupsAutomationController.js', className: 'AdminBackupsAutomationController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/backups/create': { path: './modules/admin/backups/AdminBackupsCreateController.js', className: 'AdminBackupsCreateController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/backups/restore': { path: './modules/admin/backups/AdminBackupsRestoreController.js', className: 'AdminBackupsRestoreController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    // ---- MÓDULOS DE SISTEMA DE LOGS ----
    '/admin/logs': { path: './modules/admin/logs/AdminLogsController.js', className: 'AdminLogsController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/logs/viewer': { path: './modules/admin/logs/AdminLogsViewerController.js', className: 'AdminLogsViewerController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    // ---- MÓDULOS DE GESTIÓN DE LIENZOS ----
    '/canvases/create': { path: './modules/canvases/core/CanvasesCreateController.js', className: 'CanvasesCreateController', skeletonType: 'layout-basic' },
    '/canvases/manage': { path: './modules/canvases/core/CanvasesManageController.js', className: 'CanvasesManageController', skeletonType: 'layout-basic' },
    
    // 🚨 MUY IMPORTANTE: La ruta que tiene "/role/:id" DEBE IR ARRIBA de la general
    '/canvases/members/:uuid/role/:id': { path: './modules/canvases/team/CanvasMemberRoleController.js', className: 'CanvasMemberRoleController', skeletonType: 'layout-basic' },
    
    '/canvases/manage/requests/:uuid': { path: './modules/canvases/team/CanvasRequestsController.js', className: 'CanvasRequestsController', skeletonType: 'layout-basic' },
    '/canvases/manage/resets/:uuid': { path: './modules/canvases/workspace/CanvasResetController.js', className: 'CanvasResetController', skeletonType: 'layout-basic' },
    '/canvases/edit/:uuid': { path: './modules/canvases/workspace/CanvasEditController.js', className: 'CanvasEditController', skeletonType: 'layout-basic' },
    
    '/canvases/manage/roles/:uuid': { path: './modules/canvases/team/CanvasRolesController.js', className: 'CanvasRolesController', skeletonType: 'layout-basic' },
    '/canvases/manage/role-builder/:uuid': { path: './modules/canvases/team/CanvasRoleBuilderController.js', className: 'CanvasRoleBuilderController', skeletonType: 'layout-basic' },
    '/canvases/manage/chat-restriction/:uuid/:user_uuid': { path: './modules/canvases/workspace/CanvasChatRestrictionController.js', className: 'CanvasChatRestrictionController', skeletonType: 'layout-basic' },
    '/canvases/manage/role-permissions/:uuid': { path: './modules/canvases/team/CanvasRolePermissionsController.js', className: 'CanvasRolePermissionsController', skeletonType: 'layout-basic' },
    
    // 👇 La ruta general de members se evalúa DESPUÉS
    '/canvases/members/:uuid': { path: './modules/canvases/team/CanvasMembersController.js', className: 'CanvasMembersController', skeletonType: 'layout-basic' },
    
    '/canvases/manage/invites/:uuid': { path: './modules/canvases/team/CanvasInvitesController.js', className: 'CanvasInvitesController', skeletonType: 'layout-basic' },
    '/canvases/manage/invites/generate/:uuid': { path: './modules/canvases/team/CanvasInvitesGenerateController.js', className: 'CanvasInvitesGenerateController', skeletonType: 'layout-basic' },
    
    '/canvases/manage/resize/:uuid': { path: './modules/canvases/workspace/CanvasResizeController.js', className: 'CanvasResizeController', skeletonType: 'layout-basic' },
    
    '/canvases/join': { path: './modules/canvases/core/CanvasesJoinController.js', className: 'CanvasesJoinController', skeletonType: 'layout-basic' },
    '/canvases/palettes/create': { path: './modules/canvases/palettes/CustomPaletteCreateController.js', className: 'CustomPaletteCreateController', skeletonType: 'layout-basic' },
    
    // ---- NUEVO MÓDULO GALERÍA PÚBLICA DE SNAPSHOTS ----
    '/design/s/:uuid': { path: './modules/canvases/history/CanvasSnapshotsGalleryController.js', className: 'CanvasSnapshotsGalleryController', skeletonType: 'layout-grid' },

    // ---- NUEVO VISOR INDIVIDUAL DE SNAPSHOT ----
    '/snapshot/view/:id': { path: './modules/canvases/history/SnapshotViewerController.js', className: 'SnapshotViewerController', skeletonType: 'layout-grid' }
};

