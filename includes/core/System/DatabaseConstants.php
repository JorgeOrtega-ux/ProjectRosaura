<?php
// includes/core/System/DatabaseConstants.php

namespace App\Core\System;

class DatabaseConstants {
    
    // ==========================================
    // 1. CONEXIONES
    // ==========================================
    public const CONN_IDENTITY = 'identity';

    // ==========================================
    // 2. NOMBRES DE TABLAS
    // ==========================================
    public const TBL_USERS               = 'users';
    public const TBL_ROLES               = 'roles';
    public const TBL_PERMISSIONS         = 'permissions';
    public const TBL_USER_ROLES          = 'user_roles';
    public const TBL_ROLE_PERMISSIONS    = 'role_permissions';
    public const TBL_USER_RESTRICTIONS   = 'user_restrictions';
    public const TBL_MODERATION_LOGS     = 'moderation_logs';
    public const TBL_PROFILE_CHANGES_LOG = 'profile_changes_log';
    public const TBL_USER_PREFERENCES    = 'user_preferences';
    public const TBL_AUTH_TOKENS         = 'auth_tokens';
    public const TBL_SERVER_CONFIG       = 'server_config';

    // ==========================================
    // 3. VALORES ENUM / ESTADOS FIJOS
    // ==========================================
    
    // Tabla: user_restrictions (suspension_type)
    public const SUSPENSION_TEMP = 'temporary';
    public const SUSPENSION_PERM = 'permanent';
    
    // Tabla: user_restrictions (deleted_by)
    public const DELETED_BY_USER  = 'user';
    public const DELETED_BY_ADMIN = 'admin';

    // Tabla: profile_changes_log (change_type)
    public const LOG_CHANGE_AVATAR   = 'avatar';
    public const LOG_CHANGE_USERNAME = 'username';
    public const LOG_CHANGE_EMAIL    = 'email';
    public const LOG_CHANGE_PASSWORD = 'password';
    public const LOG_CHANGE_2FA      = '2fa';

    // Tabla: user_preferences (theme)
    public const THEME_SYSTEM = 'system';
    public const THEME_LIGHT  = 'light';
    public const THEME_DARK   = 'dark';
    
    // Opciones permitidas para preferencias
    public const ALLOWED_PREF_KEYS = ['language', 'open_links_new_tab', 'theme', 'extended_alerts'];

    // Tipos de Códigos de Verificación (NUEVOS)
    public const VERIFY_TYPE_ACTIVATION = 'account_activation';
    public const VERIFY_TYPE_PASSWORD = 'password_reset';
}
?>