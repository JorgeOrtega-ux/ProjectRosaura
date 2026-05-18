<?php
// includes/core/System/RateLimitConstants.php

namespace App\Core\System;

class RateLimitConstants {
    // Identificadores de Rastreo
    public const ID_IP = 'ip';
    public const ID_USER_ID = 'user_id';
    public const ID_IP_AND_EMAIL = 'ip_and_email';
    public const ID_GUEST = 'guest'; // Añadido para el Middleware

    // Llaves (Keys) de Rutas - Autenticación
    public const KEY_AUTH_REGISTER_STEP1 = 'register_attempts';
    public const KEY_AUTH_REGISTER_STEP2 = 'register_step2_attempts';
    public const KEY_AUTH_REGISTER_VERIFY = 'register_verify_attempts';
    public const KEY_AUTH_RESEND_CODE = 'resend_code_attempts';
    public const KEY_AUTH_LOGIN = 'login_attempts';
    public const KEY_AUTH_LOGIN_2FA = 'login_2fa_attempts';
    public const KEY_AUTH_CANCEL_DELETION = 'cancel_deletion_attempts';
    public const KEY_AUTH_SWITCH_ACCOUNT = 'switch_account_attempts';
    public const KEY_AUTH_LOGOUT = 'logout_attempts';
    public const KEY_AUTH_LOGOUT_ALL = 'logout_all_attempts';
    public const KEY_AUTH_FORGOT_PASSWORD = 'forgot_password_attempts';
    public const KEY_AUTH_RESET_PASSWORD = 'reset_password_attempts';

    // Llaves (Keys) de Rutas - Configuración y Perfil
    public const KEY_SET_UPDATE_AVATAR = 'update_avatar_attempts';
    public const KEY_SET_DELETE_AVATAR = 'delete_avatar_attempts';
    public const KEY_SET_UPDATE_USERNAME = 'update_username_attempts';
    public const KEY_SET_REQ_EMAIL_CODE = 'request_email_code_attempts';
    public const KEY_SET_RES_EMAIL_CODE = 'resend_email_code_attempts';
    public const KEY_SET_VERIFY_EMAIL_CODE = 'verify_email_code_attempts';
    public const KEY_SET_UPDATE_EMAIL = 'update_email_attempts';
    public const KEY_SET_UPDATE_PREFS = 'update_prefs_attempts';
    public const KEY_SET_VERIFY_PASSWORD = 'verify_current_password_attempts';
    public const KEY_SET_UPDATE_PASSWORD = 'update_password_attempts';
    public const KEY_SET_DELETE_ACCOUNT = 'delete_account_attempts';

    // Llaves (Keys) de Rutas - 2FA y Dispositivos
    public const KEY_2FA_GENERATE = 'generate_2fa_attempts';
    public const KEY_2FA_ENABLE = 'enable_2fa_attempts';
    public const KEY_2FA_DISABLE = 'disable_2fa_attempts';
    public const KEY_2FA_REGEN_CODES = 'regen_codes_attempts';
    public const KEY_DEV_GET = 'get_devices_attempts';
    public const KEY_DEV_REVOKE = 'revoke_device_attempts';
    public const KEY_DEV_REVOKE_ALL = 'revoke_all_devices_attempts';

    // Llaves (Keys) de Rutas - Administrador y Mantenimiento
    public const KEY_ADM_READ_DATA = 'admin_read_data'; // Unifica lecturas generales
    public const KEY_ADM_READ_LOGS = 'admin_read_logs'; 
    public const KEY_ADM_GET_USER = 'admin_get_user';
    public const KEY_ADM_EDIT_AVATAR = 'admin_edit_avatar'; // NUEVA
    public const KEY_ADM_UPDATE_AVATAR = 'admin_update_avatar';
    public const KEY_ADM_DELETE_AVATAR = 'admin_delete_avatar';
    public const KEY_ADM_EDIT_USERNAME = 'admin_edit_username'; // NUEVA
    public const KEY_ADM_UPDATE_USERNAME = 'admin_update_username';
    public const KEY_ADM_EDIT_EMAIL = 'admin_edit_email'; // NUEVA
    public const KEY_ADM_UPDATE_EMAIL = 'admin_update_email';
    public const KEY_ADM_EDIT_PREFS = 'admin_edit_prefs'; // NUEVA
    public const KEY_ADM_UPDATE_PREF = 'admin_update_preference';
    public const KEY_ADM_EDIT_ROLE = 'admin_edit_role'; // NUEVA
    public const KEY_ADM_UPDATE_ROLE = 'admin_update_role';
    public const KEY_ADM_DELETE_USER = 'admin_delete_user';
    public const KEY_ADM_EDIT_STATUS = 'admin_edit_status'; // NUEVA
    public const KEY_ADM_UPDATE_STATUS = 'admin_update_status';
    public const KEY_ADM_PASSWORD_VERIFY = 'admin_password_verify'; // NUEVA
    public const KEY_ADM_GET_MOD_KARDEX = 'admin_get_mod_kardex';
    public const KEY_ADM_GET_ROLES = 'admin_get_roles';
    public const KEY_ADM_CREATE_ROLE = 'admin_create_role';
    public const KEY_ADM_DELETE_ROLE = 'admin_delete_role';
    public const KEY_ADM_GET_PERMISSIONS = 'admin_get_permissions';
    public const KEY_ADM_GET_ROLE_PERMS = 'admin_get_role_permissions';
    public const KEY_ADM_UPDATE_ROLE_PERMS = 'admin_update_role_permissions';
    public const KEY_ADM_GET_SERVER_CFG = 'admin_get_server_config';
    public const KEY_ADM_UPDATE_SERVER_CFG = 'admin_update_server_config';
    public const KEY_ADM_FLUSH_SESSIONS = 'admin_flush_redis_sessions';
    public const KEY_ADM_REDIS_DELETE = 'admin_redis_delete';
    public const KEY_ADM_TOGGLE_PANIC = 'admin_toggle_panic';
    public const KEY_ADM_BACKUP_CREATE = 'admin_backup_create'; // NUEVA
    public const KEY_ADM_CREATE_BACKUP = 'admin_create_backup';
    public const KEY_ADM_BACKUP_STATUS = 'admin_backup_status';
    public const KEY_ADM_BACKUP_RESTORE = 'admin_backup_restore'; // NUEVA
    public const KEY_ADM_RESTORE_BACKUP = 'admin_restore_backup';
    public const KEY_ADM_GET_BACKUP_SCHEMA = 'admin_get_backup_schema';
    public const KEY_ADM_CREATE_CUSTOM_BACKUP = 'admin_create_custom_backup';
    public const KEY_ADM_CHECK_WORKER = 'admin_check_worker';
    public const KEY_ADM_GET_TRANSLATIONS = 'admin_get_translations';
    
    public const KEY_DEFAULT_RATE_LIMIT = 'default_rate_limit';

    // Políticas: Valores Máximos (Attempts)
    public const MAX_1 = 1;
    public const MAX_3 = 3;
    public const MAX_5 = 5;
    public const MAX_10 = 10;
    public const MAX_15 = 15;
    public const MAX_20 = 20;
    public const MAX_30 = 30;
    public const MAX_60 = 60;
    
    // Políticas: Tiempos de Bloqueo (Minutos o Segundos según el dominio, aquí minutos)
    public const TIME_1 = 1;
    public const TIME_5 = 5;
    public const TIME_10 = 10;
    public const TIME_15 = 15;
    public const TIME_30 = 30;
    public const TIME_60 = 60;

    // Fallbacks
    public const DEFAULT_MAX_ATTEMPTS = 5;
    public const DEFAULT_DECAY_MINUTES = 15;
}
?>