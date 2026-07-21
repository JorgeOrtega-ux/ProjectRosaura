<?php

use App\Core\System\RateLimitConstants as RL;

return [
    
    'auth.register.step1' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'register_step1',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_REGISTER_STEP1, 'max' => RL::MAX_5, 'time' => RL::TIME_60, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.register.step2' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'register_step2',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_REGISTER_STEP2, 'max' => RL::MAX_5, 'time' => RL::TIME_60, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.register.verify' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'register_verify',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_REGISTER_VERIFY, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.register.resend_code' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'register_resend_code',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_RESEND_CODE, 'max' => RL::MAX_3, 'time' => RL::TIME_30, 'identifier' => RL::ID_IP]]
    ],
    'auth.google' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'google_login',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'auth_google_login', 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP]]
    ],
    'auth.login' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'login',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_LOGIN, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.login.verify_2fa' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'login_verify_2fa',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_LOGIN_2FA, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP]]
    ],
    'auth.cancel_account_deletion' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'cancel_account_deletion',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_CANCEL_DELETION, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP]]
    ],

    'auth.switch_account' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'switch_account',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_SWITCH_ACCOUNT, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_IP]]
    ],
    'auth.logout' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'logout',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_LOGOUT, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'auth.logout_all' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'logout_all',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_LOGOUT_ALL, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP]]
    ],
    'auth.forgot_password' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'forgot_password',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_FORGOT_PASSWORD, 'max' => RL::MAX_3, 'time' => RL::TIME_30, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],
    'auth.reset_password' => [
        'controller' => 'App\Api\Controllers\Auth\AuthController',
        'action' => 'reset_password',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_AUTH_RESET_PASSWORD, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_IP_AND_EMAIL]]
    ],

    'settings.update_avatar' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'update_avatar',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_AVATAR, 'max' => RL::MAX_5, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.delete_avatar' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'delete_avatar',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_DELETE_AVATAR, 'max' => RL::MAX_5, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.update_username' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'update_username',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_USERNAME, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.request_email_code' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'request_email_code',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_REQ_EMAIL_CODE, 'max' => RL::MAX_3, 'time' => RL::TIME_30, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.resend_email_code' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'resend_email_code',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_RES_EMAIL_CODE, 'max' => RL::MAX_3, 'time' => RL::TIME_30, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.verify_email_code' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'verify_email_code',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_VERIFY_EMAIL_CODE, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.update_email' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'update_email',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_EMAIL, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.update_preferences' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'update_preferences',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_PREFS, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.set_flag' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'set_flag',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'set_set_flag', 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.verify_current_password' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'verify_current_password',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_VERIFY_PASSWORD, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.update_password' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'update_password',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_UPDATE_PASSWORD, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.delete_account' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'delete_account',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_SET_DELETE_ACCOUNT, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],

    'settings.2fa_generate' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'generate_2fa',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_2FA_GENERATE, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.2fa_enable' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'enable_2fa',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_2FA_ENABLE, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.2fa_disable' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'disable_2fa',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_2FA_DISABLE, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.2fa_regenerate_recovery' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'regenerate_recovery_codes',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_2FA_REGEN_CODES, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],

    'settings.get_devices' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'get_devices',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_DEV_GET, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.revoke_device' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'revoke_device',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_DEV_REVOKE, 'max' => RL::MAX_15, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.revoke_all_devices' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'revoke_all_devices',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_DEV_REVOKE_ALL, 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.link_google' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'link_google',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'settings_link_google', 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'settings.unlink_google' => [
        'controller' => 'App\Api\Controllers\Settings\SettingsController',
        'action' => 'unlink_google',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'settings_unlink_google', 'max' => RL::MAX_5, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_messages' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'getMessages',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'adm_get_messages', 'max' => 60, 'time' => 1, 'identifier' => 'user_id']]
    ],
    'admin.update_message_visibility' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'updateMessageVisibility',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'adm_upd_msg', 'max' => 30, 'time' => 1, 'identifier' => 'user_id']]
    ],
    'admin.get_message_reports' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'getMessageReports',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'adm_get_msg_rep', 'max' => 60, 'time' => 1, 'identifier' => 'user_id']]
    ],
    'admin.update_report_status' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'updateReportStatus',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'adm_upd_rep_st', 'max' => 30, 'time' => 1, 'identifier' => 'user_id']]
    ],

    'admin.get_dashboard_metrics' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_dashboard_metrics',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'adm_dashboard_metrics', 'max' => RL::MAX_60, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_user' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_user',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_USER, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_avatar' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'update_avatar',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_AVATAR, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.delete_avatar' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'delete_avatar',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_DELETE_AVATAR, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_username' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'update_username',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_USERNAME, 'max' => RL::MAX_15, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_email' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'update_email',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_EMAIL, 'max' => RL::MAX_15, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_preference' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'update_preference',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_PREF, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_role' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'update_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_ROLE, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'admin.delete_users' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'delete_users',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_DELETE_USER, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'admin.update_suspension' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'update_suspension',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_STATUS, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_moderation_kardex' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_moderation_kardex',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_MOD_KARDEX, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],

    'admin.get_roles' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_roles',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_ROLES, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.create_role' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'create_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_CREATE_ROLE, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.edit_role' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'edit_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_EDIT_ROLE, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.delete_role' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'delete_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_DELETE_ROLE, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_permissions' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_permissions',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_PERMISSIONS, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_role_permissions' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_role_permissions',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_ROLE_PERMS, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_role_permissions' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'update_role_permissions',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_ROLE_PERMS, 'max' => RL::MAX_20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'admin.get_server_config' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_server_config',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_SERVER_CFG, 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.update_server_config' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'update_server_config',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_UPDATE_SERVER_CFG, 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'admin.create_backup' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'create_backup',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_CREATE_BACKUP, 'max' => RL::MAX_1, 'time' => RL::TIME_10, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.backup_status' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'backup_status',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_BACKUP_STATUS, 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.restore_backup' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'restore_backup',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_RESTORE_BACKUP, 'max' => RL::MAX_1, 'time' => RL::TIME_15, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.get_backup_schema' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_backup_schema',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_BACKUP_SCHEMA, 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.create_custom_backup' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'create_custom_backup',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_CREATE_CUSTOM_BACKUP, 'max' => RL::MAX_1, 'time' => RL::TIME_10, 'identifier' => RL::ID_USER_ID]]
    ],

    'admin.read_logs' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'read_logs',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_READ_LOGS, 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'admin.check_worker_status' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'check_worker_status',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_CHECK_WORKER, 'max' => RL::MAX_60, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],

    'admin.get_translations' => [
        'controller' => 'App\Api\Controllers\Admin\AdminController',
        'action' => 'get_admin_translations',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => RL::KEY_ADM_GET_TRANSLATIONS, 'max' => RL::MAX_60, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],

    'chat.history' => [
        'controller' => 'App\Api\Controllers\Chat\ChatController',
        'action' => 'history',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'chat_history', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],
    'chat.send' => [
        'controller' => 'App\Api\Controllers\Chat\ChatController',
        'action' => 'send',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'chat_send', 'max' => 20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'chat.delete' => [
        'controller' => 'App\Api\Controllers\Chat\ChatController',
        'action' => 'delete',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'chat_delete', 'max' => 20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'chat.report' => [
        'controller' => 'App\Api\Controllers\Chat\ChatController',
        'action' => 'report',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'chat_report', 'max' => 10, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'chat.attachment' => [
        'controller' => 'App\Api\Controllers\Chat\ChatController',
        'action' => 'attachment',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'chat_attachment', 'max' => 60, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],

    'canvases.get_ws_ticket' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'get_ws_ticket',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_ws_ticket', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_IP]]
    ],

    'canvases.get_custom_palettes' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAssetController',
        'action' => 'get_custom_palettes',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_c_palettes', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.create_custom_palette' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAssetController',
        'action' => 'create_custom_palette',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_create_c_palette', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.delete_custom_palette' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAssetController',
        'action' => 'delete_custom_palette',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_del_c_palette', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.get_home_feed' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'get_home_feed',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_home', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],

    'canvases.get_public' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'get_public',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_public', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],

    'canvases.get_mine' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'get_mine',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_mine', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.get_official' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'get_official',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_official', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],

    'canvases.get' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'get',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.create' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'create',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_create', 'max' => RL::MAX_5, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.update' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'update',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_update', 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.delete' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'delete',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_delete', 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.downgrade' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasCoreController',
        'action' => 'downgrade',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_downgrade', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.leave' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'leave',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_leave', 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.resize' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'resize',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_resize', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.get_resize_settings' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'get_resize_settings',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_resize', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.update_resize_settings' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'update_resize_settings',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_upd_resize', 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.toggle_favorite' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAssetController',
        'action' => 'toggle_favorite',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_toggle_fav', 'max' => 20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'search.query' => [
        'controller' => 'App\Api\Controllers\Search\SearchController',
        'action' => 'search',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'search_query', 'max' => 60, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],

    'canvases.assign_member_role' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'assign_member_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_assign_role', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.get_roles' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'get_roles',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_roles', 'max' => 20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.get_permissions' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'get_permissions',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_perms', 'max' => 20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.create_role' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'create_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_create_role', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.update_role' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'update_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_update_role', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.delete_role' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'delete_role',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_delete_role', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.remove_member' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'remove_member',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_remove_member', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.generate_invite' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'generate_invite',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_gen_invite', 'max' => 20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.list_invites' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'list_invites',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_list_invites', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.revoke_invite' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'revoke_invite',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_revoke_invite', 'max' => 20, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.join_via_invite' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'join_via_invite',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_join_invite', 'max' => 20, 'time' => RL::TIME_5, 'identifier' => RL::ID_IP]]
    ],

    'canvases.get_reset_settings' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'get_reset_settings',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_reset', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.update_reset_settings' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'update_reset_settings',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_upd_reset', 'max' => RL::MAX_10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.reset_now' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'reset_now',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_reset_now', 'max' => RL::MAX_5, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.create_snapshot' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasSettingsController',
        'action' => 'create_snapshot',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_create_snap', 'max' => RL::MAX_5, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.request_access' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'request_access',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_req_access', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.approve_request' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'approve_request',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_approve', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.reject_request' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'reject_request',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_reject', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.get_pending_requests' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'get_pending_requests',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_reqs', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.get_snapshots_gallery' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasMediaController',
        'action' => 'get_snapshots_gallery',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_snapshots', 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],

    'canvases.get_snapshot_detail' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasMediaController',
        'action' => 'get_snapshot_detail',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_snap_detail', 'max' => RL::MAX_30, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],
    'canvases.toggle_snapshot_like' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasMediaController',
        'action' => 'toggle_snapshot_like',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_toggle_snap_like', 'max' => 20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.toggle_snapshot_privacy' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasMediaController',
        'action' => 'toggle_snapshot_privacy',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_toggle_snap_privacy', 'max' => 20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.delete_snapshot' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasMediaController',
        'action' => 'delete_snapshot',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_delete_snapshot', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.upload_template' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAssetController',
        'action' => 'upload_template',
        
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_upload_tpl', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.get_templates' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAssetController',
        'action' => 'get_templates',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get_tpl', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.delete_template' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAssetController',
        'action' => 'delete_template',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_del_tpl', 'max' => 20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.plazmar_imagen' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAssetController',
        'action' => 'plazmar_imagen',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_plazmar', 'max' => 5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvas.update_chat_restriction' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasChatRestrictionController',
        'action' => 'updateRestriction',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_update_chat_res', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'canvases.create_live_share' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'create_live_share',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_create_live', 'max' => 10, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'canvases.join_live_share' => [
        'controller' => 'App\Api\Controllers\Canvas\CanvasAccessController',
        'action' => 'join_live_share',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_join_live', 'max' => 30, 'time' => RL::TIME_1, 'identifier' => RL::ID_IP]]
    ],


    'telemetry.collect' => [
        'controller' => 'App\Api\Controllers\Telemetry\TelemetryController',
        'action' => 'collect',
        'middleware' => [] 
    ],

    'stripe.create_checkout' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'create_checkout',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_checkout', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.preview_upgrade' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'preview_upgrade',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_preview', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.update_subscription' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'update_subscription',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_update_sub', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.get_payment_history' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'get_payment_history',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_history', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.download_receipt' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'download_receipt',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_dl_receipt', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.get_subscription_status' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'get_subscription_status',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_status', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.create_setup_session' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'create_setup_session',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_setup', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.get_payment_methods' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'get_payment_methods',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_methods', 'max' => RL::MAX_20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.toggle_auto_renewal' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'toggle_auto_renewal',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_toggle_renewal', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'stripe.delete_payment_method' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'delete_payment_method',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_delete_pm', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],

    'stripe.create_coin_checkout' => [
        'controller' => 'App\Api\Controllers\Stripe\StripeController',
        'action' => 'create_coin_checkout',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'stripe_coin_checkout', 'max' => RL::MAX_5, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'store.buy_perk' => [
        'controller' => 'App\Api\Controllers\Store\StoreController',
        'action' => 'buy_perk',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'store_buy_perk', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ],
    'store.get_balance' => [
        'controller' => 'App\Api\Controllers\Store\StoreController',
        'action' => 'get_balance',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'store_get_balance', 'max' => 20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'store.get_my_perks' => [
        'controller' => 'App\Api\Controllers\Store\StoreController',
        'action' => 'get_my_perks',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'store_get_perks', 'max' => 20, 'time' => RL::TIME_1, 'identifier' => RL::ID_USER_ID]]
    ],
    'store.activate_perk' => [
        'controller' => 'App\Api\Controllers\Store\StoreController',
        'action' => 'activate_perk',
        'middleware' => [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'store_activate_perk', 'max' => 10, 'time' => RL::TIME_5, 'identifier' => RL::ID_USER_ID]]
    ]
];
?>