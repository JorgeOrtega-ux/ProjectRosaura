<?php

namespace App\Core\System;

class CacheConstants {
    public const PREFIX_RATE_LIMIT = 'rate_limit:';
    public const PREFIX_USER_SESSIONS = 'idx:user_sessions:';
    public const PREFIX_PHPSESSID = 'PHPSESSID:';
    public const PREFIX_FORCE_REAUTH_USER = 'force_reauth:user:';
    public const PREFIX_FORCE_REAUTH_ROLE = 'force_reauth:role:';
    public const PREFIX_FORCE_REAUTH_DEVICE = 'force_reauth:selector:';
    public const PREFIX_ROLES_ALL = 'rbac:roles_all';
    public const PREFIX_ROLE_BY_ID = 'rbac:role:id:';
    public const PREFIX_ROLE_BY_NAME = 'rbac:role:name:';
    public const PREFIX_ALL_PERMISSIONS = 'rbac:perms_all';
    public const PREFIX_ROLE_PERMS = 'rbac:role_perms:';
    public const PREFIX_USER_ROLES = 'rbac:user_roles:';
    public const PREFIX_USER_PERMS = 'rbac:user_perms:';
    public const PREFIX_USER_HIGHEST_ROLE = 'rbac:user_highest_role:';
    public const PREFIX_BACKUP_JOB = 'backup_job:';
    public const PREFIX_LOCK_BACKUP = 'lock:backup_in_progress';
    public const QUEUE_BACKUP = 'backup_queue';
    public const QUEUE_ACCOUNT_DELETION = 'queue:account_deletion';
    public const PENDING_SNAPSHOTS_SET = 'canvases:pending_snapshots';
    public const PREFIX_CANVAS_NEXT_RESET = 'canvas:next_reset:';
    public const PREFIX_CANVAS_RESET_LOCK = 'canvas:reset_lock:';
    public const PREFIX_CANVAS_NEXT_RESIZE = 'canvas:next_resize:';
    public const PREFIX_LIVE_SHARE = 'live_share:';
    public const KEY_OFFICIAL_CANVASES = 'canvases:official_list';
    public const PREFIX_LOCATIONS = 'locations:';
    public const QUEUE_TELEMETRY_API_LATENCY = 'api_latency';
    public const QUEUE_TELEMETRY_PAGEVIEWS   = 'pageviews';
    public const QUEUE_TELEMETRY_CANVAS      = 'canvas_interactions';
    public const QUEUE_TELEMETRY_AUTH        = 'auth_events';
    public const KEY_SYSTEM_RESTORING = 'system_status:restoring';
    public const KEY_SYSTEM_PANIC_MODE = 'system_status:panic_mode';
    public const KEY_SERVER_CONFIG = 'system:server_config';
    public const PREFIX_CHAT_CANVAS_RECENT = 'chat:canvas:recent:';
    public const PREFIX_CANVAS_PUBLIC_PAGE = 'canvases:public:page:';
    public const PREFIX_CANVAS_OFFICIAL_PAGE = 'canvases:official:page:';
    public const PREFIX_CANVAS_HOME_FEED = 'canvases:home:feed:';
    public const PREFIX_CANVAS_DETAIL = 'canvas:id:';
    public const PREFIX_USER_PROFILE = 'user:profile:';
    public const PREFIX_STORE_COINS = 'store:user:coins:';
    public const PREFIX_USER_TEMPLATE_TOKENS = 'user:template_tokens:';
    public const PATTERN_CACHE = 'cache:*';
    public const PATTERN_PR_CACHE = 'PR_cache:*';
    public const TTL_ONE_MIN = 60;
    public const TTL_FIVE_MINS = 300;
    public const TTL_ONE_HOUR = 3600;
    public const TTL_ONE_DAY = 86400;
    public const TTL_ONE_WEEK = 604800;
}
?>