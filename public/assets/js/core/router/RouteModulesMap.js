export const RouteModulesMap = {
    
    '/': { path: './modules/app/home/HomeController.js', className: 'HomeController', skeletonType: 'layout-grid' },
    '/home': { path: './modules/app/home/HomeController.js', className: 'HomeController', skeletonType: 'layout-grid' },
        
    '/search': { path: './modules/app/search/SearchController.js', className: 'SearchController', skeletonType: 'layout-grid' },
    
    '/upgrade': { path: './modules/app/upgrade/UpgradeController.js', className: 'UpgradeController', skeletonType: 'layout-basic' },
    '/premium': { path: './modules/app/upgrade/UpgradeController.js', className: 'UpgradeController', skeletonType: 'layout-basic' },

    '/design': { path: './modules/app/design/DesignController.js', className: 'DesignController', skeletonType: 'layout-design' },
    
    '/canvases/c/v/:canvas/:msg/:idx': { path: './modules/app/canvases/ChatViewerController.js', className: 'ChatViewerController', skeletonType: 'layout-basic' },

    '/store/coins': { path: './modules/store/StoreController.js', className: 'StoreController', skeletonType: 'layout-table' },
    '/store/content': { path: './modules/store/StoreController.js', className: 'StoreController', skeletonType: 'layout-table' },

    '/login': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/login/two-factor': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/register': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/register/aditional-data': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/register/verification-account': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/forgot-password': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },
    '/reset-password': { path: './modules/auth/AuthController.js', className: 'AuthController', skeletonType: 'layout-auth' },

    '/site-policy/manage-cookies': { path: './modules/site-policy/ManageCookiesController.js', className: 'ManageCookiesController', skeletonType: 'layout-policy' },
    '/site-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-policy' },
    '/site-policy/terms-conditions': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-policy' },
    '/site-policy/privacy-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-policy' },
    '/site-policy/cookies-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-policy' },
    '/site-policy/legal-notice': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-policy' },
    '/site-policy/refund-policy': { path: './modules/site-policy/SitePolicyController.js', className: 'SitePolicyController', skeletonType: 'layout-policy' },

    '/settings': { path: './modules/settings/ProfileController.js', className: 'ProfileController', skeletonType: 'layout-basic' },
    '/settings/your-account': { path: './modules/settings/ProfileController.js', className: 'ProfileController', skeletonType: 'layout-basic' },
    '/settings/security': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-basic' },
    '/settings/change-password': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-basic' },
    '/settings/subscription': { path: './modules/settings/BillingController.js', className: 'BillingController', skeletonType: 'layout-basic' },
    '/settings/billing': { path: './modules/settings/BillingController.js', className: 'BillingController', skeletonType: 'layout-basic' },
    '/settings/purchase-history': { path: './modules/settings/PurchaseHistoryController.js', className: 'PurchaseHistoryController', skeletonType: 'layout-table' },
    '/settings/2fa': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-basic' },
    '/settings/2fa/recovery-codes': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-basic' },
    '/settings/2fa/deactivate': { path: './modules/settings/TwoFactorController.js', className: 'TwoFactorController', skeletonType: 'layout-basic' },
    '/settings/delete-account': { path: './modules/settings/SecurityController.js', className: 'SecurityController', skeletonType: 'layout-basic' },

    '/admin': { path: './modules/admin/AdminDashboardController.js', className: 'AdminDashboardController', requiresAdminLang: true, skeletonType: 'layout-dashboard' },
    '/admin/dashboard': { path: './modules/admin/AdminDashboardController.js', className: 'AdminDashboardController', requiresAdminLang: true, skeletonType: 'layout-dashboard' },
    '/admin/messages': { path: './modules/admin/messages/AdminMessagesController.js', className: 'AdminMessagesController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/messages/visibility/:uuid': { path: './modules/admin/messages/AdminMessagesVisibilityController.js', className: 'AdminMessagesVisibilityController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/messages/reports/:uuid': { path: './modules/admin/messages/AdminMessagesReportsController.js', className: 'AdminMessagesReportsController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/users': { path: './modules/admin/users/AdminUsersController.js', className: 'AdminUsersController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/roles': { path: './modules/admin/roles/AdminRolesController.js', className: 'AdminRolesController', requiresAdminLang: true, skeletonType: 'layout-table' }, 
    '/admin/role-create': { path: './modules/admin/roles/AdminRoleBuilderController.js', className: 'AdminRoleBuilderController', requiresAdminLang: true, skeletonType: 'layout-list' }, 
    '/admin/role-edit': { path: './modules/admin/roles/AdminRoleBuilderController.js', className: 'AdminRoleBuilderController', requiresAdminLang: true, skeletonType: 'layout-list' }, 
    '/admin/role-permissions': { path: './modules/admin/roles/AdminRolePermissionsController.js', className: 'AdminRolePermissionsController', requiresAdminLang: true, skeletonType: 'layout-list' }, 
    '/admin/subscriptions': { path: './modules/admin/subscriptions/AdminSubscriptionsController.js', className: 'AdminSubscriptionsController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/subscription-create': { path: './modules/admin/subscriptions/AdminSubscriptionBuilderController.js', className: 'AdminSubscriptionBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/subscription-edit/:uuid': { path: './modules/admin/subscriptions/AdminSubscriptionBuilderController.js', className: 'AdminSubscriptionBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/admin/store-packages': { path: './modules/admin/store/AdminPackagesController.js', className: 'AdminPackagesController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/store-package-create': { path: './modules/admin/store/AdminPackageBuilderController.js', className: 'AdminPackageBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/store-package-edit/:uuid': { path: './modules/admin/store/AdminPackageBuilderController.js', className: 'AdminPackageBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/admin/store-perks': { path: './modules/admin/store/AdminPerksController.js', className: 'AdminPerksController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/store-perk-create': { path: './modules/admin/store/AdminPerkBuilderController.js', className: 'AdminPerkBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/store-perk-edit/:uuid': { path: './modules/admin/store/AdminPerkBuilderController.js', className: 'AdminPerkBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/admin/role-edit/:uuid': { path: './modules/admin/roles/AdminRoleBuilderController.js', className: 'AdminRoleBuilderController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/role-permissions/:uuid': { path: './modules/admin/roles/AdminRolePermissionsController.js', className: 'AdminRolePermissionsController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/admin/user-profile/:uuid': { path: './modules/admin/users/AdminUserEditController.js', className: 'AdminUserEditController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/user-roles/:uuid': { path: './modules/admin/users/AdminUserRoleEditController.js', className: 'AdminUserRoleEditController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/user-moderation/:uuid': { path: './modules/admin/users/AdminStatusEditController.js', className: 'AdminStatusEditController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/user-activity/:uuid': { path: './modules/admin/users/AdminUserHistoryController.js', className: 'AdminUserHistoryController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/admin/system-settings': { path: './modules/admin/server/AdminServerConfigController.js', className: 'AdminServerConfigController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/admin/backups': { path: './modules/admin/backups/AdminBackupsController.js', className: 'AdminBackupsController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/backup-schedule': { path: './modules/admin/backups/AdminBackupsAutomationController.js', className: 'AdminBackupsAutomationController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/backup-create': { path: './modules/admin/backups/AdminBackupsCreateController.js', className: 'AdminBackupsCreateController', requiresAdminLang: true, skeletonType: 'layout-basic' },
    '/admin/backup-restore/:uuid': { path: './modules/admin/backups/AdminBackupsRestoreController.js', className: 'AdminBackupsRestoreController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/admin/logs': { path: './modules/admin/logs/AdminLogsController.js', className: 'AdminLogsController', requiresAdminLang: true, skeletonType: 'layout-table' },
    '/admin/logs/viewer': { path: './modules/admin/logs/AdminLogsViewerController.js', className: 'AdminLogsViewerController', requiresAdminLang: true, skeletonType: 'layout-basic' },

    '/canvases/create': { path: './modules/canvases/core/CanvasesCreateController.js', className: 'CanvasesCreateController', skeletonType: 'layout-basic' },
    '/canvases/manage': { path: './modules/canvases/core/CanvasesManageController.js', className: 'CanvasesManageController', skeletonType: 'layout-table' },

    '/canvases/members/:uuid/role/:id': { path: './modules/canvases/team/CanvasMemberRoleController.js', className: 'CanvasMemberRoleController', skeletonType: 'layout-basic' },
    
    '/canvases/manage/requests/:uuid': { path: './modules/canvases/team/CanvasRequestsController.js', className: 'CanvasRequestsController', skeletonType: 'layout-basic' },
    '/canvases/manage/resets/:uuid': { path: './modules/canvases/workspace/CanvasResetController.js', className: 'CanvasResetController', skeletonType: 'layout-basic' },
    '/canvases/edit/:uuid': { path: './modules/canvases/workspace/CanvasEditController.js', className: 'CanvasEditController', skeletonType: 'layout-basic' },
    
    '/canvases/manage/roles/:uuid': { path: './modules/canvases/team/CanvasRolesController.js', className: 'CanvasRolesController', skeletonType: 'layout-basic' },
    '/canvases/manage/role-builder/:uuid': { path: './modules/canvases/team/CanvasRoleBuilderController.js', className: 'CanvasRoleBuilderController', skeletonType: 'layout-basic' },
    '/canvases/manage/sanctions/:uuid': { path: './modules/canvases/team/CanvasSanctionsController.js', className: 'CanvasSanctionsController', skeletonType: 'layout-table' },
    '/canvases/manage/role-permissions/:uuid': { path: './modules/canvases/team/CanvasRolePermissionsController.js', className: 'CanvasRolePermissionsController', skeletonType: 'layout-basic' },

    '/canvases/members/:uuid': { path: './modules/canvases/team/CanvasMembersController.js', className: 'CanvasMembersController', skeletonType: 'layout-table' },
    
    '/canvases/manage/invites/:uuid': { path: './modules/canvases/team/CanvasInvitesController.js', className: 'CanvasInvitesController', skeletonType: 'layout-table' },
    '/canvases/manage/invites/generate/:uuid': { path: './modules/canvases/team/CanvasInvitesGenerateController.js', className: 'CanvasInvitesGenerateController', skeletonType: 'layout-basic' },
    
    '/canvases/manage/resize/:uuid': { path: './modules/canvases/workspace/CanvasResizeController.js', className: 'CanvasResizeController', skeletonType: 'layout-basic' },
    
    '/canvases/join': { path: './modules/canvases/core/CanvasesJoinController.js', className: 'CanvasesJoinController', skeletonType: 'layout-basic' },
    '/canvases/palettes/create': { path: './modules/canvases/palettes/CustomPaletteCreateController.js', className: 'CustomPaletteCreateController', skeletonType: 'layout-basic' },

    '/design/s/:uuid': { path: './modules/canvases/history/CanvasSnapshotsGalleryController.js', className: 'CanvasSnapshotsGalleryController', skeletonType: 'layout-grid' },

    '/snapshot/view/:id': { path: './modules/canvases/history/SnapshotViewerController.js', className: 'SnapshotViewerController', skeletonType: 'layout-grid' }
};


