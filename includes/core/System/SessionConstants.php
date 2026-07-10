<?php

namespace App\Core\System;

class SessionConstants {
    public const MAX_CONCURRENT_ACCOUNTS = 3;
    public const KEY_ACTIVE_ACCOUNT = 'active_account';
    public const KEY_LINKED_ACCOUNTS = 'accounts';
    public const KEY_CSRF_TOKEN = 'csrf_token';
    public const KEY_REG_FLOWS = 'reg_flows';
    public const KEY_PENDING_DELETION = 'pending_deletion';
    public const KEY_PENDING_2FA = 'pending_2fa';
    public const KEY_LAST_ACCESSED = 'last_accessed';
    public const KEY_SESSION_CREATED_AT = 'session_created_at';
    public const ROOT_KEYS = [
        'user_id', 'user_uuid', 'user_name', 'user_email', 'user_roles', 
        'user_role_weight', 'user_role_name', 'user_role_color', 
        'user_permissions', 'user_pic', 'user_prefs', 'user_2fa'
    ];
}
?>