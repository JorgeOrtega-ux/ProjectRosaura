<?php

namespace App\Core\System;

class CanvasConstants {
    public const VALID_TAGS = ['all', 'art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 'community', 'nature', 'scifi', 'fantasy', 'music', 'sports', 'popculture'];
    
    public const RESERVED_ROLES = ['owner', 'propietario', 'superadmin', 'superadministrador'];
    
    public const LOCK_REASON_SIZE = 'size';
    public const LOCK_REASON_PALETTE = 'palette';
    public const LOCK_REASON_MEMBERS = 'members';

    public const PRIVACY_PRIVATE = 'private';
    public const PRIVACY_PUBLIC = 'public';
    public const PRIVACY_UNLISTED = 'unlisted';

    public const MIN_DIMENSION = 10;
    public const MAX_DIMENSION = 2000;
    public const DEFAULT_MAX_MEMBERS = 10;
}
