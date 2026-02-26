<?php
// includes/config/routes.php

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
    
    // --- RUTAS DE CONFIGURACIÓN ---
    '/settings' => ['view' => 'settings/index.php'],
    '/settings/guest' => ['view' => 'settings/guest.php', 'guest_only' => true],

    // --- RUTAS PROTEGIDAS (Requieren autenticación) ---
    '/settings/your-profile' => ['view' => 'settings/your-profile.php', 'auth' => true],
    '/settings/security' => ['view' => 'settings/security.php', 'auth' => true],
    '/settings/accessibility' => ['view' => 'settings/accessibility.php', 'auth' => true],
    '/settings/change-password' => ['view' => 'settings/change-password.php', 'auth' => true],
    '/settings/2fa' => ['view' => 'settings/2fa.php', 'auth' => true],
    
    // NUEVAS RUTAS
    '/settings/2fa/recovery-codes' => ['view' => 'settings/2fa-recovery-codes.php', 'auth' => true],
    '/settings/2fa/deactivate' => ['view' => 'settings/2fa-deactivate.php', 'auth' => true],

    '/settings/devices' => ['view' => 'settings/devices.php', 'auth' => true],
    '/settings/delete-account' => ['view' => 'settings/delete-account.php', 'auth' => true],

    // --- RUTAS DE ADMINISTRADOR (Requieren autenticación + Roles específicos + 2FA) ---
    '/admin' => ['view' => 'admin/dashboard.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/dashboard' => ['view' => 'admin/dashboard.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/manage-users' => ['view' => 'admin/manage-users.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/backups' => ['view' => 'admin/backups.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/server-config' => ['view' => 'admin/server-config.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true]
];
?>