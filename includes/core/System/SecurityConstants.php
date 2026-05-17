<?php
// includes/core/System/SecurityConstants.php

namespace App\Core\System;

class SecurityConstants {
    // Jerarquías y Roles
    public const WEIGHT_SUPER_ADMIN = 100;
    public const WEIGHT_CRITICAL_ROLE_MIN = 80; // NUEVO: Peso mínimo para asignar permisos críticos
    public const DEFAULT_USER_ROLE_ID = 1;
    public const MAX_SYSTEM_ROLE_ID = 4; // NUEVO: Límite de IDs para roles inmutables del sistema
    
    // Fallbacks Visuales / Diseño de Roles (NUEVOS)
    public const DEFAULT_ROLE_NAME = 'User';
    public const DEFAULT_ROLE_COLOR = '{"type":"solid","colors":["#808080"]}';
    
    // Criptografía y Tokens
    public const TOKEN_LENGTH_BYTES = 32;
}
?>