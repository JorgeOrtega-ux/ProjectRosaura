<?php

namespace App\Core\System;

class ModerationConstants {
    // Tipos de acciones de moderación (logAction)
    public const ACTION_SUSPENDED = 'suspended';
    public const ACTION_UNSUSPENDED = 'unsuspended';
    public const ACTION_ROLE_CHANGED = 'role_changed';
    public const ACTION_DELETED = 'deleted';
    
    // Tipos de cambios en el perfil (profile change logs)
    public const ACTION_PROFILE_AVATAR = 'profile_avatar';
    public const ACTION_PROFILE_USERNAME = 'profile_username';
    public const ACTION_PROFILE_EMAIL = 'profile_email';
    public const ACTION_PROFILE_PREFERENCES = 'profile_preferences';
}
