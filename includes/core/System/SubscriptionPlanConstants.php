<?php

namespace App\Core\System;

class SubscriptionPlanConstants {
    public const TIER_FREE = 0;
    public const TIER_BASIC = 0; // Alias de compatibilidad

    public const TIER_PLUS = 1;
    public const TIER_PRO = 2;
    public const TIER_ULTRA = 3;
    public const TIER_ADVANCED = 3; // Alias de compatibilidad

    public static function getTierLimits(int $tier): array {
        switch ($tier) {
            case self::TIER_ULTRA:
                return [
                    'name' => 'Ultra',
                    'max_canvases' => 50,
                    'max_snapshots_per_canvas' => -1,
                    'max_storage_mb' => 5000,
                    'max_members_per_canvas' => 50000,
                    'advanced_roles' => true,
                    'live_templates' => true,
                    'extended_palettes' => true,
                    'custom_palettes' => true,
                    'max_custom_palettes' => 25,
                    'allow_live_chat' => true
                ];

            case self::TIER_PRO:
                return [
                    'name' => 'Pro',
                    'max_canvases' => 10,
                    'max_snapshots_per_canvas' => 100,
                    'max_storage_mb' => 1000,
                    'max_members_per_canvas' => 2500,
                    'advanced_roles' => true,
                    'live_templates' => true,
                    'extended_palettes' => true,
                    'custom_palettes' => true,
                    'max_custom_palettes' => 5,
                    'allow_live_chat' => false
                ];

            case self::TIER_PLUS:
                return [
                    'name' => 'Plus',
                    'max_canvases' => 3,
                    'max_snapshots_per_canvas' => 25,
                    'max_storage_mb' => 200,
                    'max_members_per_canvas' => 100,
                    'advanced_roles' => false,
                    'live_templates' => true,
                    'extended_palettes' => true,
                    'custom_palettes' => false,
                    'max_custom_palettes' => 0,
                    'allow_live_chat' => false
                ];

            case self::TIER_FREE:
            default:
                return [
                    'name' => 'Free',
                    'max_canvases' => 1,
                    'max_snapshots_per_canvas' => 0,
                    'max_storage_mb' => 20,
                    'max_members_per_canvas' => 10,
                    'advanced_roles' => false,
                    'live_templates' => false,
                    'extended_palettes' => false,
                    'custom_palettes' => false,
                    'max_custom_palettes' => 0,
                    'allow_live_chat' => false
                ];
        }
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