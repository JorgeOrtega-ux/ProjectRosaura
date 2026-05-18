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
    
    // Prefijos y Colas de Jobs (NUEVOS)
    public const PREFIX_BACKUP_JOB = 'backup_job:';
    public const PREFIX_LOCK_BACKUP = 'lock:backup_in_progress';
    public const QUEUE_BACKUP = 'backup_queue';
    public const QUEUE_ACCOUNT_DELETION = 'queue:account_deletion';
    
    // Estados del Sistema (NUEVOS)
    public const KEY_SYSTEM_RESTORING = 'system_status:restoring';
    public const KEY_SYSTEM_PANIC_MODE = 'system_status:panic_mode';

    // Patrones de Limpieza / Mantenimiento (NUEVOS)
    public const PATTERN_CACHE = 'cache:*';
    public const PATTERN_PR_CACHE = 'PR_cache:*';

    // Tiempos de vida (TTL en segundos)
    public const TTL_ONE_DAY = 86400;
    public const TTL_ONE_WEEK = 604800;
}
?>