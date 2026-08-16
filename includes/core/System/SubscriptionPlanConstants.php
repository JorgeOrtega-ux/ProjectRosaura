<?php

namespace App\Core\System;

class SubscriptionPlanConstants {
    public const ALL_FEATURES = [
        'feat_advanced_roles' => [
            'key' => 'feat_advanced_roles',
            'name' => 'Roles Avanzados',
            'desc' => 'Permite configurar roles personalizados en lienzos'
        ],
        'feat_chat_restriction' => [
            'key' => 'feat_chat_restriction',
            'name' => 'Acceso y Moderación de Chat',
            'desc' => 'Permite uso de chat en vivo y herramientas de moderación'
        ],
        'feat_custom_palettes' => [
            'key' => 'feat_custom_palettes',
            'name' => 'Paletas Personalizadas',
            'desc' => 'Permite crear y utilizar paletas de colores personalizadas'
        ],
        'feat_unlimited_exports' => [
            'key' => 'feat_unlimited_exports',
            'name' => 'Exportaciones Ilimitadas',
            'desc' => 'Exportación ilimitada de capturas e imágenes'
        ],
        'feat_inject_templates' => [
            'key' => 'feat_inject_templates',
            'name' => 'Inyección de Plantillas',
            'desc' => 'Inyección directa de plantillas avanzadas en lienzos'
        ],
        'feat_live_share' => [
            'key' => 'feat_live_share',
            'name' => 'Transmisión de Plantillas',
            'desc' => 'Permite transmitir y sincronizar lienzos en vivo'
        ],
        'feat_no_ads' => [
            'key' => 'feat_no_ads',
            'name' => 'Experiencia Sin Anuncios',
            'desc' => 'Navegación y uso de herramientas sin interrupciones publicitarias'
        ]
    ];

    private static $tierLimitsCache = [];
    private static $allTiersCache = null;
    private static $tierPricesCache = null;
    private static $maxTierCache = null;

    public static function resetCache(): void {
        self::$tierLimitsCache = [];
        self::$allTiersCache = null;
        self::$tierPricesCache = null;
        self::$maxTierCache = null;
    }

    public static function getTierLimits(int $tier): array {
        if (isset(self::$tierLimitsCache[$tier])) {
            return self::$tierLimitsCache[$tier];
        }

        if ($tier >= 99) {
            $tier = self::getMaxTierLevel();
        }

        $allTiers = self::getAllTiers();
        foreach ($allTiers as $row) {
            if ((int)$row['tier_level'] === $tier) {
                $limits = [
                    'name' => $row['name'],
                    'max_canvases' => (int)$row['max_canvases'],
                    'max_storage_mb' => (int)$row['max_storage_mb'],
                    'max_snapshots_per_canvas' => (int)$row['max_snapshots_per_canvas'],
                    'max_members_per_canvas' => (int)$row['max_members_per_canvas'],
                    'max_custom_palettes' => (int)$row['max_custom_palettes'],
                    'feat_advanced_roles' => (bool)$row['feat_advanced_roles'],
                    'feat_chat_restriction' => (bool)$row['feat_chat_restriction'],
                    'feat_custom_palettes' => (bool)$row['feat_custom_palettes'],
                    'feat_priority_rendering' => (bool)($row['feat_priority_rendering'] ?? false),
                    'feat_unlimited_exports' => (bool)$row['feat_unlimited_exports'],
                    'feat_inject_templates' => (bool)($row['feat_inject_templates'] ?? false),
                    'feat_live_share' => (bool)($row['feat_live_share'] ?? false),
                    'feat_no_ads' => (bool)($row['feat_no_ads'] ?? false),
                    'max_template_tokens' => (int)($row['max_template_tokens'] ?? 0),
                    'max_upload_mb' => (int)($row['max_upload_mb'] ?? 10),
                    'max_pixels_per_batch' => (int)($row['max_pixels_per_batch'] ?? 5),
                    'allow_live_chat' => (bool)$row['feat_chat_restriction'],
                    'custom_palettes' => (bool)$row['feat_custom_palettes'],
                    'no_ads' => (bool)($row['feat_no_ads'] ?? false)
                ];
                
                self::$tierLimitsCache[$tier] = $limits;
                return $limits;
            }
        }

        $default = [
            'name' => 'Free',
            'max_canvases' => 1,
            'max_snapshots_per_canvas' => 10,
            'max_storage_mb' => 20,
            'max_upload_mb' => 10,
            'max_members_per_canvas' => 10,
            'max_custom_palettes' => 0,
            'feat_advanced_roles' => false,
            'feat_chat_restriction' => false,
            'feat_custom_palettes' => false,
            'feat_unlimited_exports' => false,
            'feat_inject_templates' => false,
            'feat_live_share' => false,
            'feat_no_ads' => false,
            'max_template_tokens' => 0,
            'max_pixels_per_batch' => 5,
            'allow_live_chat' => false,
            'custom_palettes' => false,
            'no_ads' => false
        ];
        self::$tierLimitsCache[$tier] = $default;
        return $default;
    }

    public static function hasFeature(int $tier, string $featureKey): bool {
        if ($featureKey === 'allow_live_chat') {
            $featureKey = 'chat_restriction';
        }
        if ($featureKey === 'live_templates') {
            $featureKey = 'live_share';
        }
        $limits = self::getTierLimits($tier);
        if (isset($limits[$featureKey])) {
            return $limits[$featureKey] === true;
        }
        $prefixedKey = 'feat_' . $featureKey;
        if (isset($limits[$prefixedKey])) {
            return $limits[$prefixedKey] === true;
        }
        return false;
    }

    public static function getTierPrices(): array {
        if (self::$tierPricesCache !== null) {
            return self::$tierPricesCache;
        }
        $tiers = self::getAllTiers();
        $prices = [];
        foreach ($tiers as $row) {
            $prices[(int)$row['tier_level']] = [
                'monthly' => (float)$row['price_monthly'],
                'yearly'  => (float)$row['price_yearly']
            ];
        }
        self::$tierPricesCache = $prices;
        return $prices;
    }

    public static function getMaxTierLevel(): int {
        if (self::$maxTierCache !== null) {
            return self::$maxTierCache;
        }
        $tiers = self::getAllTiers();
        $max = 0;
        foreach ($tiers as $t) {
            if (isset($t['is_active']) && (int)$t['is_active'] === 1) {
                $level = (int)$t['tier_level'];
                if ($level > $max) {
                    $max = $level;
                }
            }
        }
        self::$maxTierCache = $max ?: 3;
        return self::$maxTierCache;
    }

    public static function getAllTiers(): array {
        if (self::$allTiersCache !== null) {
            return self::$allTiersCache;
        }

        try {
            $redis = (new \App\Config\Database\RedisCache())->getClient();
            if ($redis && !defined('SYSTEM_DEGRADED')) {
                $cached = $redis->get(CacheConstants::KEY_SUBSCRIPTION_TIERS_ALL);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        self::$allTiersCache = $decoded;
                        return $decoded;
                    }
                }
            }
        } catch (\Throwable $e) {}

        $tiers = [];
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT * FROM subscription_tiers ORDER BY tier_level ASC");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $row['color'] = is_string($row['color'] ?? null) ? (json_decode($row['color'], true) ?? []) : ($row['color'] ?? []);
                $tiers[] = $row;
            }

            if (!empty($tiers)) {
                try {
                    $redis = (new \App\Config\Database\RedisCache())->getClient();
                    if ($redis && !defined('SYSTEM_DEGRADED')) {
                        $redis->setex(CacheConstants::KEY_SUBSCRIPTION_TIERS_ALL, CacheConstants::TTL_ONE_WEEK, json_encode($tiers));
                    }
                } catch (\Throwable $e) {}
            }
        } catch (\Exception $e) {
            // Silently fallback on error
        }

        self::$allTiersCache = $tiers;
        return $tiers;
    }

    public static function getTierName(int $tierLevel): string {
        $limits = self::getTierLimits($tierLevel);
        if (!empty($limits['name'])) {
            return $limits['name'];
        }
        $allTiers = self::getAllTiers();
        foreach ($allTiers as $t) {
            if ((int)$t['tier_level'] === $tierLevel) {
                return $t['name'];
            }
        }
        return '';
    }

    public static function getLowestTierForFeature(string $featureKey): ?array {
        if ($featureKey === 'allow_live_chat') {
            $featureKey = 'feat_chat_restriction';
        }
        if (strpos($featureKey, 'feat_') !== 0 && !in_array($featureKey, ['custom_palettes', 'allow_live_chat'])) {
            $featureKey = 'feat_' . $featureKey;
        }

        $allTiers = self::getAllTiers();
        foreach ($allTiers as $t) {
            if (isset($t['is_active']) && (int)$t['is_active'] === 0) {
                continue;
            }
            $hasFeat = false;
            if (isset($t[$featureKey]) && ((bool)$t[$featureKey] === true || (int)$t[$featureKey] === 1)) {
                $hasFeat = true;
            }
            if (!$hasFeat && strpos($featureKey, 'feat_') === 0) {
                $rawKey = substr($featureKey, 5);
                if (isset($t[$rawKey]) && ((bool)$t[$rawKey] === true || (int)$t[$rawKey] === 1)) {
                    $hasFeat = true;
                }
            }
            if ($hasFeat) {
                return $t;
            }
        }
        return null;
    }

    public static function getLowestTierNameForFeature(string $featureKey): string {
        $lowest = self::getLowestTierForFeature($featureKey);
        if ($lowest && !empty($lowest['name'])) {
            return $lowest['name'];
        }
        return '';
    }
}
?>