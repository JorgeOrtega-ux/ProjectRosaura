<?php
// api/route-map.php

use App\Core\System\RateLimitConstants as RL;

return [
    // --- RUTAS DE AUTENTICACIÓN ---
    'auth.register.step1' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_step1',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_REGISTER_STEP1, 'max' => RL::MAX_5, 'time' => RL::TIME_60, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.register.step2' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_step2',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_REGISTER_STEP2, 'max' => RL::MAX_5, 'time' => RL::TIME_60, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.register.verify' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_verify',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_REGISTER_VERIFY, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.register.resend_code' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_resend_code',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_RESEND_CODE, 'max' => RL::MAX_3, 'time' => RL::TIME_30, 'identifier' => RL::ID_IP]]
    ],
    'auth.login' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'login',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_LOGIN, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.login.verify_2fa' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'login_verify_2fa',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_LOGIN_2FA, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP]]
    ],
    'auth.cancel_account_deletion' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'cancel_account_deletion',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_CANCEL_DELETION, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP]]
    ],
    
    // --- RUTAS MULTI-SESIÓN ---
    'auth.switch_account' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'switch_account',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_SWITCH_ACCOUNT, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_IP]]
    ],
    'auth.logout' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'logout',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_LOGOUT, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'auth.logout_all' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'logout_all',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_LOGOUT_ALL, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP]]
    ],
    'auth.forgot_password' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'forgot_password',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_FORGOT_PASSWORD, 'max' => RL::MAX_3, 'time' => RL::TIME_30, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.reset_password' => [
        'controller' => 'App\Api\Controllers\AuthController', 'action' => 'reset_password',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_RESET_PASSWORD, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],

    // --- RUTAS DE CONFIGURACIÓN / PERFIL ---
    'settings.update_avatar' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_avatar',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_AVATAR, 'max' => RL::MAX_5, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.delete_avatar' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'delete_avatar',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_DELETE_AVATAR, 'max' => RL::MAX_5, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.update_username' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_username',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_USERNAME, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.request_email_code' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'request_email_code',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_REQ_EMAIL_CODE, 'max' => RL::MAX_3, 'time' => RL::TIME_30, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.resend_email_code' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'resend_email_code',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_RES_EMAIL_CODE, 'max' => RL::MAX_3, 'time' => RL::TIME_30, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.verify_email_code' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'verify_email_code',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_VERIFY_EMAIL_CODE, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.update_email' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_email',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_EMAIL, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.update_preferences' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_preferences',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_PREFS, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.verify_current_password' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'verify_current_password',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_VERIFY_PASSWORD, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.update_password' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_password',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_PASSWORD, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.delete_account' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'delete_account',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_DELETE_ACCOUNT, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    
    // --- RUTAS 2FA ---
    'settings.2fa_generate' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'generate_2fa',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_2FA_GENERATE, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.2fa_enable' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'enable_2fa',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_2FA_ENABLE, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.2fa_disable' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'disable_2fa',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_2FA_DISABLE, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.2fa_regenerate_recovery' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'regenerate_recovery_codes',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_2FA_REGEN_CODES, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],

    // --- RUTAS DISPOSITIVOS ---
    'settings.get_devices' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'get_devices',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_DEV_GET, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.revoke_device' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'revoke_device',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_DEV_REVOKE, 'max' => RL::MAX_15, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.revoke_all_devices' => [
        'controller' => 'App\Api\Controllers\SettingsController', 'action' => 'revoke_all_devices',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_DEV_REVOKE_ALL, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],

    // --- RUTAS ADMINISTRADOR ---
    'admin.get_dashboard_metrics' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_dashboard_metrics',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'adm_dashboard_metrics', 'max' => RL::MAX_60, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_user' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_user',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_USER, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_avatar' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_avatar',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_AVATAR, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.delete_avatar' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'delete_avatar',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_DELETE_AVATAR, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_username' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_username',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_USERNAME, 'max' => RL::MAX_15, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_email' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_email',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_EMAIL, 'max' => RL::MAX_15, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_preference' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_preference',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_PREF, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_role' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_ROLE, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    
    'admin.delete_users' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'delete_users',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_DELETE_USER, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    
    'admin.update_suspension' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_suspension',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_STATUS, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_moderation_kardex' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_moderation_kardex',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_MOD_KARDEX, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],

    // --- RUTAS DE GESTIÓN DE ROLES Y PERMISOS ---
    'admin.get_roles' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_roles',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_ROLES, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.create_role' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'create_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_CREATE_ROLE, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.edit_role' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'edit_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_EDIT_ROLE, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.delete_role' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'delete_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_DELETE_ROLE, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_permissions' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_permissions',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_PERMISSIONS, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_role_permissions' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_role_permissions',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_ROLE_PERMS, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_role_permissions' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_role_permissions',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_ROLE_PERMS, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    
    // --- RUTAS DE CONFIGURACIÓN DEL SERVIDOR ---
    'admin.get_server_config' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_server_config',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_SERVER_CFG, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_server_config' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_server_config',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_SERVER_CFG, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    // --- RUTAS DE MANTENIMIENTO DEL SERVIDOR ---
    'admin.maintenance_flush_sessions' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'flush_sessions',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_FLUSH_SESSIONS, 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.maintenance_clear_cache' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'clear_cache',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_REDIS_DELETE, 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.maintenance_reset_rate_limits' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'reset_rate_limits',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_REDIS_DELETE, 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.toggle_panic_mode' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'toggle_panic_mode',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_TOGGLE_PANIC, 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    // --- RUTAS DE COPIAS DE SEGURIDAD ---
    'admin.create_backup' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'create_backup',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_CREATE_BACKUP, 'max' => RL::MAX_1, 'time' => RL::TIME_10, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.backup_status' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'backup_status',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_BACKUP_STATUS, 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.restore_backup' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'restore_backup',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_RESTORE_BACKUP, 'max' => RL::MAX_1, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_backup_schema' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_backup_schema',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_BACKUP_SCHEMA, 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.create_custom_backup' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'create_custom_backup',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_CREATE_CUSTOM_BACKUP, 'max' => RL::MAX_1, 'time' => RL::TIME_10, 'identifier' => RL::ID_USER_ID]]
    ],

    // --- RUTAS DE LOGS ---
    'admin.read_logs' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'read_logs',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_READ_LOGS, 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.check_worker_status' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'check_worker_status',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_CHECK_WORKER, 'max' => RL::MAX_60, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    
    // --- RUTA PARA CARGAR DICCIONARIOS EN SPA ---
    'admin.get_translations' => [
        'controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_admin_translations',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_TRANSLATIONS, 'max' => RL::MAX_60, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    
    // --- NUEVA RUTA DE TELEMETRÍA (Tracker Frontend) ---
    'telemetry.collect' => [
        'controller' => 'App\Api\Controllers\TelemetryController', 'action' => 'collect',
        'middleware' => [] // Sin rate limit estricto. Es asíncrono y en "batches". Dejamos Telemetry fuera de aquí para evitar que mida su propio tiempo de ejecución (loop lógico).
    ],
];
?>