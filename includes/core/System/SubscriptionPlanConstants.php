<?php

namespace App\Core\System;

class SubscriptionPlanConstants {
    public const TIER_FREE = 0;
    public const TIER_BASIC = 0; // Alias de compatibilidad

    public const TIER_PLUS = 1;
    public const TIER_PRO = 2;
    public const TIER_ULTRA = 3;
    public const TIER_ADVANCED = 3; // Alias de compatibilidad

    private static $tierLimitsCache = [];

    public static function getTierLimits(int $tier): array {
        if (isset(self::$tierLimitsCache[$tier])) {
            return self::$tierLimitsCache[$tier];
        }

        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->prepare("SELECT features, name FROM subscription_tiers WHERE tier_level = ?");
            $stmt->execute([$tier]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                $features = json_decode($row['features'], true) ?? [];
                $features['name'] = $row['name'];
                self::$tierLimitsCache[$tier] = $features;
                return $features;
            }
        } catch (\Exception $e) {
            // Silently fallback on error
        }

        $default = [
            'name' => 'Free',
            'max_canvases' => 1,
            'max_snapshots_per_canvas' => 10,
            'max_storage_mb' => 20,
            'max_members_per_canvas' => 10,
            'advanced_roles' => false,
            'live_templates' => false,
            'extended_palettes' => false,
            'custom_palettes' => false,
            'max_custom_palettes' => 0,
            'allow_live_chat' => false
        ];
        self::$tierLimitsCache[$tier] = $default;
        return $default;
    }

    public static function hasFeature(int $tier, string $featureKey): bool {
        $limits = self::getTierLimits($tier);
        return isset($limits[$featureKey]) && $limits[$featureKey] === true;
    }

    public static function getTierPrices(): array {
        return [
            self::TIER_FREE => [
                'monthly' => 0.00,
                'yearly' => 0.00
            ],
            self::TIER_PLUS => [
                'monthly' => 3.99,
                'yearly' => 39.99
            ],
            self::TIER_PRO => [
                'monthly' => 8.99,
                'yearly' => 89.99
            ],
            self::TIER_ULTRA => [
                'monthly' => 19.99,
                'yearly' => 199.99
            ]
        ];
    }
}
?>