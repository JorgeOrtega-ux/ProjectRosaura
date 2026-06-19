<?php

return [
    '/' => ['view' => 'app/home.php'],
    '/explore' => ['view' => 'app/explore.php'],
    '/design' => ['view' => 'app/design.php'],
    
    '/login' => ['view' => 'auth/login.php', 'guest_only' => true],
    '/login/two-factor' => ['view' => 'auth/login.php', 'guest_only' => true],
    '/register' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/register/aditional-data' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/register/verification-account' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/forgot-password' => ['view' => 'auth/forgot-password.php', 'guest_only' => true],
    '/reset-password' => ['view' => 'auth/reset-password.php', 'guest_only' => true],
    
    '/account-suspended' => ['view' => 'system/message.php'],
    '/account-deleted' => ['view' => 'system/message.php'],

    '/site-policy' => ['view' => 'site-policy/site-policy.php'],
    '/site-policy/terms-conditions' => ['view' => 'site-policy/terms-conditions.php'],
    '/site-policy/privacy-policy' => ['view' => 'site-policy/privacy-policy.php'],
    '/site-policy/cookies-policy' => ['view' => 'site-policy/cookies-policy.php'],
    '/site-policy/legal-notice' => ['view' => 'site-policy/legal-notice.php'],
    '/site-policy/refund-policy' => ['view' => 'site-policy/refund-policy.php'],
    
    '/settings' => ['view' => 'settings/index.php'],
    '/settings/guest' => ['view' => 'settings/preferences/guest.php', 'guest_only' => true],

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

    // --- NUEVAS RUTAS DE LIENZOS ---
    '/canvases/create' => ['view' => 'canvases/create.php', 'auth' => true, 'permissions' => ['create_canvas'], 'requires_2fa' => false],
    '/canvases/manage' => ['view' => 'canvases/manage.php', 'auth' => true, 'permissions' => ['manage_canvases'], 'requires_2fa' => false],
    '/canvases/join' => ['view' => 'canvases/join.php', 'auth' => true, 'permissions' => ['join_canvas'], 'requires_2fa' => false],
    '/canvases/edit' => ['view' => 'canvases/edit.php', 'auth' => true, 'permissions' => ['manage_canvases'], 'requires_2fa' => false],

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
    
    '/admin/logs' => ['view' => 'admin/logs/logs.php', 'auth' => true, 'permissions' => ['view_logs'], 'requires_2fa' => false],
    '/admin/logs/viewer' => ['view' => 'admin/logs/logs-viewer.php', 'auth' => true, 'permissions' => ['view_logs'], 'requires_2fa' => false]
];
?>