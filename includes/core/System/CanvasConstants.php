<?php

namespace App\Core\System;

class CanvasConstants {
    public const VALID_TAGS = ['all', 'fun', 'tension', 'action', 'strategy', 'roleplay', 'casual', 'romance', 'horror', 'scifi', 'fantasy'];
    
    public const RESERVED_ROLES = ['owner', 'propietario', 'superadmin', 'superadministrador'];
    
    public const LOCK_REASON_SIZE = 'size';
    public const LOCK_REASON_PALETTE = 'palette';
    public const LOCK_REASON_MEMBERS = 'members';

    public const PRIVACY_PRIVATE = 'private';
    public const PRIVACY_PUBLIC = 'public';
    public const PRIVACY_UNLISTED = 'unlisted';

    public const SCOPE_PERSONAL = 'personal';
    public const SCOPE_GLOBAL = 'global';
    public const SCOPE_COUNTRY = 'country';
    public const SCOPE_STATE = 'state';
    public const SCOPE_MUNICIPALITY = 'municipality';
    public const SCOPE_ORGANIZATION = 'organization';
}
