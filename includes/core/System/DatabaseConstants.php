<?php

namespace App\Core\System;

class DatabaseConstants {
    public const CONN_IDENTITY  = 'identity';
    public const CONN_TELEMETRY = 'telemetry'; 
    public const CONN_CANVASES  = 'canvases';
    public const CONN_MONETIZATION = 'monetization';
    public const TBL_AD_MONETIZATION_SETTINGS = 'ad_monetization_settings';
    public const TBL_AD_CUSTOM_CAMPAIGNS = 'ad_custom_campaigns';
    public const TBL_AD_IMPRESSIONS_DAILY = 'ad_impressions_daily';
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
    public const TBL_TELEMETRY_API_LATENCY   = 'api_latency';
    public const TBL_TELEMETRY_PAGEVIEWS     = 'pageviews';
    public const TBL_TELEMETRY_CANVAS        = 'canvas_interactions';
    public const TBL_TELEMETRY_AUTH_EVENTS   = 'auth_events';
    public const TBL_USER_FLAGS             = 'user_flags';
    public const TBL_CANVASES                   = 'canvases';
    public const TBL_CANVAS_MEMBERS             = 'canvas_members';
    public const TBL_CANVAS_SNAPSHOTS_HISTORY   = 'canvas_snapshots_history';
    public const TBL_CANVAS_FAVORITES           = 'canvas_favorites';
    public const TBL_CANVAS_ACCESS_REQUESTS     = 'canvas_access_requests';
    public const TBL_CANVAS_USER_ROLES          = 'canvas_user_roles';
    public const TBL_CANVAS_ROLES               = 'canvas_roles';
    public const TBL_CANVAS_ROLE_PERMISSIONS    = 'canvas_role_permissions';
    public const TBL_CANVAS_PERMISSIONS         = 'canvas_permissions';
    public const TBL_USER_TEMPLATES             = 'user_templates';
    public const TBL_CANVAS_SNAPSHOTS           = 'canvas_snapshots';
    public const TBL_CANVAS_RESET_SETTINGS      = 'canvas_reset_settings';
    public const TBL_CANVAS_SNAPSHOTS_LIKES     = 'canvas_snapshots_likes';
    public const TBL_CANVAS_INVITES             = 'canvas_invites';
    public const TBL_CANVAS_RESIZE_SETTINGS     = 'canvas_resize_settings';
    public const TBL_CANVAS_CHAT_MESSAGES       = 'canvas_chat_messages';
    public const TBL_CANVAS_CHAT_REPORTS        = 'canvas_chat_reports';
    public const TBL_CANVAS_RECENT_COLORS       = 'canvas_recent_colors';
    public const TBL_SUBSCRIPTIONS              = 'subscriptions';
    public const TBL_PAYMENT_HISTORY            = 'payment_history';
    public const SUSPENSION_TEMP = 'temporary';
    public const SUSPENSION_PERM = 'permanent';
    public const DELETED_BY_USER  = 'user';
    public const DELETED_BY_ADMIN = 'admin';
    public const LOG_CHANGE_AVATAR   = 'avatar';
    public const LOG_CHANGE_USERNAME = 'username';
    public const LOG_CHANGE_EMAIL    = 'email';
    public const LOG_CHANGE_PASSWORD = 'password';
    public const LOG_CHANGE_2FA      = '2fa';
    public const THEME_SYSTEM = 'system';
    public const THEME_LIGHT  = 'light';
    public const THEME_DARK   = 'dark';
    public const ALLOWED_PREF_KEYS = ['language', 'open_links_new_tab', 'theme', 'extended_alerts', 'allow_telemetry', 'accepted_store_terms', 'accepted_content_store_terms'];
    public const VERIFY_TYPE_ACTIVATION = 'account_activation';
    public const VERIFY_TYPE_PASSWORD = 'password_reset';
    public const PRIVACY_PUBLIC   = 'public';
    public const PRIVACY_PRIVATE  = 'private';
    public const PRIVACY_UNLISTED = 'unlisted';
}
?>