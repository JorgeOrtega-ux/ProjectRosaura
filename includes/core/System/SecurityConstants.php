<?php

namespace App\Core\System;

class SecurityConstants {
    public const WEIGHT_SUPER_ADMIN = 100;
    public const WEIGHT_CRITICAL_ROLE_MIN = 80;
    public const DEFAULT_USER_ROLE_ID = 1;
    public const MAX_SYSTEM_ROLE_ID = 4;
    public const DEFAULT_ROLE_NAME = 'User';
    public const DEFAULT_ROLE_COLOR = '{"type":"solid","colors":["#808080"]}';
    public const TOKEN_LENGTH_BYTES = 32;
    public const RISKY_ASNS = [
        'Amazon.com',
        'Amazon Technologies Inc.',
        'DigitalOcean, LLC',
        'Hetzner Online GmbH',
        'OVH SAS',
        'Linode',
        'Vultr Holdings, LLC',
        'Google Cloud',
        'Microsoft Corporation'
    ];
}
?>