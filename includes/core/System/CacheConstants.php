<?php
// includes/core/System/CacheConstants.php

namespace App\Core\System;

class CacheConstants {
    // Prefijos de Infraestructura en Redis
    public const PREFIX_RATE_LIMIT = 'rate_limit:';
    public const PREFIX_USER_SESSIONS = 'idx:user_sessions:';
    public const PREFIX_PHPSESSID = 'PHPSESSID:';

    // Prefijos de Invalidación Pasiva
    public const PREFIX_FORCE_REAUTH_USER = 'force_reauth:user:';
    public const PREFIX_FORCE_REAUTH_ROLE = 'force_reauth:role:';
    public const PREFIX_FORCE_REAUTH_DEVICE = 'force_reauth:selector:';

    // Prefijos Estructurales de RBAC (Activos)
    public const PREFIX_ROLES_ALL = 'rbac:roles_all';
    public const PREFIX_ROLE_BY_ID = 'rbac:role:id:';
    public const PREFIX_ROLE_BY_NAME = 'rbac:role:name:';
    public const PREFIX_ALL_PERMISSIONS = 'rbac:perms_all';
    public const PREFIX_ROLE_PERMS = 'rbac:role_perms:';
    public const PREFIX_USER_ROLES = 'rbac:user_roles:';
    public const PREFIX_USER_PERMS = 'rbac:user_perms:';
    public const PREFIX_USER_HIGHEST_ROLE = 'rbac:user_highest_role:';
    
    // Prefijos y Colas de Jobs
    public const PREFIX_BACKUP_JOB = 'backup_job:';
    public const PREFIX_LOCK_BACKUP = 'lock:backup_in_progress';
    public const QUEUE_BACKUP = 'backup_queue';
    public const QUEUE_ACCOUNT_DELETION = 'queue:account_deletion';
    
    // Colas y Llaves para Lienzos / Workers
    public const PENDING_SNAPSHOTS_SET = 'canvases:pending_snapshots';
    public const PREFIX_CANVAS_NEXT_RESET = 'canvas:next_reset:';
    public const PREFIX_CANVAS_RESET_LOCK = 'canvas:reset_lock:';
    public const PREFIX_CANVAS_NEXT_RESIZE = 'canvas:next_resize:';
    
    // --- NUEVO: PREFIJO PARA LIVE SHARE ---
    public const PREFIX_LIVE_SHARE = 'live_share:';

    // --- NUEVO: PREFIJOS PARA LIENZOS OFICIALES Y UBICACIONES ---
    public const KEY_OFFICIAL_CANVASES = 'canvases:official_list';
    public const PREFIX_LOCATIONS = 'locations:';
    
    // Colas de Telemetría
    public const QUEUE_TELEMETRY_API_LATENCY = 'api_latency';
    public const QUEUE_TELEMETRY_PAGEVIEWS   = 'pageviews';
    public const QUEUE_TELEMETRY_CANVAS      = 'canvas_interactions';
    public const QUEUE_TELEMETRY_AUTH        = 'auth_events';

    // Estados del Sistema
    public const KEY_SYSTEM_RESTORING = 'system_status:restoring';
    public const KEY_SYSTEM_PANIC_MODE = 'system_status:panic_mode';

    // Configuración Global
    public const KEY_SERVER_CONFIG = 'system:server_config';

    // Patrones de Limpieza / Mantenimiento
    public const PATTERN_CACHE = 'cache:*';
    public const PATTERN_PR_CACHE = 'PR_cache:*';

    // Tiempos de vida (TTL en segundos)
    public const TTL_ONE_DAY = 86400;
    public const TTL_ONE_WEEK = 604800;
}
?>