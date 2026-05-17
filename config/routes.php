<?php
// config/routes.php

return [
    '/' => ['view' => 'app/home.php'],
    '/explore' => ['view' => 'app/explore.php'],
    
    // --- RUTAS DE AUTENTICACIÓN (Solo invitados) ---
    '/login' => ['view' => 'auth/login.php', 'guest_only' => true],
    '/login/two-factor' => ['view' => 'auth/login.php', 'guest_only' => true],
    '/register' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/register/aditional-data' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/register/verification-account' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/forgot-password' => ['view' => 'auth/forgot-password.php', 'guest_only' => true],
    '/reset-password' => ['view' => 'auth/reset-password.php', 'guest_only' => true],
    
    // --- RUTAS DE SISTEMA PÚBLICAS (Manejo de estados) ---
    '/account-suspended' => ['view' => 'system/message.php'],
    '/account-deleted' => ['view' => 'system/message.php'],
    
    // --- RUTAS DE CONFIGURACIÓN ---
    '/settings' => ['view' => 'settings/index.php'],
    '/settings/guest' => ['view' => 'settings/preferences/guest.php', 'guest_only' => true],

    // --- RUTAS PROTEGIDAS (Requieren autenticación, sin validación de permisos RBAC) ---
    '/settings/your-profile' => ['view' => 'settings/profile/your-profile.php', 'auth' => true],
    '/settings/security' => ['view' => 'settings/security/security.php', 'auth' => true],
    '/settings/accessibility' => ['view' => 'settings/preferences/accessibility.php', 'auth' => true],
    '/settings/billing' => ['view' => 'settings/billing/billing.php', 'auth' => true],
    '/settings/purchase-history' => ['view' => 'settings/billing/purchase-history.php', 'auth' => true],
    '/settings/change-password' => ['view' => 'settings/security/change-password.php', 'auth' => true],
    '/settings/2fa' => ['view' => 'settings/security/2fa.php', 'auth' => true],
    '/settings/2fa/recovery-codes' => ['view' => 'settings/security/2fa-recovery-codes.php', 'auth' => true],
    '/settings/2fa/deactivate' => ['view' => 'settings/security/2fa-deactivate.php', 'auth' => true],
    '/settings/devices' => ['view' => 'settings/security/devices.php', 'auth' => true],
    '/settings/delete-account' => ['view' => 'settings/profile/delete-account.php', 'auth' => true],

    // --- RUTAS DE ADMINISTRADOR (Con validación granular de permisos) ---
    '/admin' => ['view' => 'admin/dashboard.php', 'auth' => true, 'permissions' => ['access_admin_panel'], 'requires_2fa' => false],
    '/admin/dashboard' => ['view' => 'admin/dashboard.php', 'auth' => true, 'permissions' => ['access_admin_panel'], 'requires_2fa' => false],
    
    '/admin/manage-users' => ['view' => 'admin/users/manage-users.php', 'auth' => true, 'permissions' => ['view_users'], 'requires_2fa' => false],
    '/admin/edit-user' => ['view' => 'admin/users/edit-user.php', 'auth' => true, 'permissions' => ['edit_users'], 'requires_2fa' => false],
    '/admin/edit-status' => ['view' => 'admin/users/edit-status.php', 'auth' => true, 'permissions' => ['moderate_users'], 'requires_2fa' => false],
    '/admin/user-history' => ['view' => 'admin/users/user-history.php', 'auth' => true, 'permissions' => ['view_kardex'], 'requires_2fa' => false],
    '/admin/edit-user-role' => ['view' => 'admin/users/edit-user-role.php', 'auth' => true, 'permissions' => ['assign_roles'], 'requires_2fa' => false],

    '/admin/manage-roles' => ['view' => 'admin/roles/manage-roles.php', 'auth' => true, 'permissions' => ['view_roles'], 'requires_2fa' => false],
    '/admin/roles/create' => ['view' => 'admin/roles/role-builder.php', 'auth' => true, 'permissions' => ['manage_roles_structure'], 'requires_2fa' => false],
    '/admin/roles/edit' => ['view' => 'admin/roles/role-builder.php', 'auth' => true, 'permissions' => ['manage_roles_structure'], 'requires_2fa' => false],
    '/admin/roles/permissions' => ['view' => 'admin/roles/role-permissions.php', 'auth' => true, 'permissions' => ['manage_roles_structure'], 'requires_2fa' => false],

    '/admin/backups' => ['view' => 'admin/backups/backups.php', 'auth' => true, 'permissions' => ['create_backups', 'restore_backups'], 'requires_2fa' => false],
    '/admin/backups/automation' => ['view' => 'admin/backups/backups-automation.php', 'auth' => true, 'permissions' => ['create_backups'], 'requires_2fa' => false],
    '/admin/backups/create' => ['view' => 'admin/backups/backups-create.php', 'auth' => true, 'permissions' => ['create_backups'], 'requires_2fa' => false],
    '/admin/backups/restore' => ['view' => 'admin/backups/backups-restore.php', 'auth' => true, 'permissions' => ['restore_backups'], 'requires_2fa' => false],
    
    '/admin/server-config' => ['view' => 'admin/system/server-config.php', 'auth' => true, 'permissions' => ['manage_server_config'], 'requires_2fa' => false],
    
    // --- MANTENIMIENTO DEL SERVIDOR (NUEVO) ---
    '/admin/server/maintenance' => ['view' => 'admin/system/maintenance.php', 'auth' => true, 'permissions' => ['perform_system_maintenance'], 'requires_2fa' => false],
    
    '/admin/logs' => ['view' => 'admin/logs/logs.php', 'auth' => true, 'permissions' => ['view_logs'], 'requires_2fa' => false],
    '/admin/logs/viewer' => ['view' => 'admin/logs/logs-viewer.php', 'auth' => true, 'permissions' => ['view_logs'], 'requires_2fa' => false]
];
?>