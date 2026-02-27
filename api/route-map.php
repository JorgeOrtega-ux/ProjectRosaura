<?php
// api/route-map.php

return [
    // --- RUTAS DE AUTENTICACIÓN ---
    'auth.register.step1'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_step1'],
    'auth.register.step2'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_step2'],
    'auth.register.verify' => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_verify'],
    'auth.register.resend_code' => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_resend_code'],
    'auth.login'           => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'login'],
    'auth.login.verify_2fa'=> ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'login_verify_2fa'],
    'auth.logout'          => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'logout'],
    'auth.forgot_password' => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'forgot_password'],
    'auth.reset_password'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'reset_password'],

    // --- RUTAS DE CONFIGURACIÓN / PERFIL ---
    'settings.update_avatar'      => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_avatar'],
    'settings.delete_avatar'      => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'delete_avatar'],
    'settings.update_username'    => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_username'],
    'settings.request_email_code' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'request_email_code'],
    'settings.resend_email_code'  => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'resend_email_code'],
    'settings.verify_email_code'  => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'verify_email_code'],
    'settings.update_email'       => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_email'],
    
    // --- RUTAS PREFERENCIAS ---
    'settings.update_preferences' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_preferences'],
    
    // --- RUTAS SEGURIDAD ---
    'settings.verify_current_password' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'verify_current_password'],
    'settings.update_password'         => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_password'],
    'settings.delete_account'          => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'delete_account'],
    
    // --- NUEVAS RUTAS 2FA ---
    'settings.2fa_generate' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'generate_2fa'],
    'settings.2fa_enable'   => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'enable_2fa'],
    'settings.2fa_disable'  => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'disable_2fa'],
    'settings.2fa_regenerate_recovery' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'regenerate_recovery_codes'],

    // --- RUTAS DISPOSITIVOS ---
    'settings.get_devices'       => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'get_devices'],
    'settings.revoke_device'     => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'revoke_device'],
    'settings.revoke_all_devices'=> ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'revoke_all_devices'],

    // --- RUTAS ADMINISTRADOR (Gestión de cuentas directas) ---
    'admin.get_user'          => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_user'],
    'admin.update_avatar'     => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_avatar'],
    'admin.delete_avatar'     => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'delete_avatar'],
    'admin.update_username'   => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_username'],
    'admin.update_email'      => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_email'],
    'admin.update_preference' => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_preference'],
];
?>