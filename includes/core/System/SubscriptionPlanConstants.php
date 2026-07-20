<?php

namespace App\Core\System;

class SubscriptionPlanConstants {
    public const TIER_PLUS = 0;
    public const TIER_BASIC = 0; // Alias de compatibilidad

    public const TIER_PRO = 1;

    public const TIER_ULTRA = 2;
    public const TIER_ADVANCED = 2; // Alias de compatibilidad (mapeado al antiguo nivel 2/Ultra)

    public static function getTierLimits(int $tier): array {
        switch ($tier) {
            case self::TIER_ULTRA:
            case 3: // Manejo defensivo por si algún registro viejo tenía 3
                return [
                    'name' => 'Ultra',
                    'max_canvases' => 20,
                    'max_snapshots_per_canvas' => -1,
                    'max_storage_mb' => 2048,
                    'max_members_per_canvas' => 50000,
                    'advanced_roles' => true,
                    'live_templates' => true,
                    'extended_palettes' => true,
                    'custom_palettes' => true,
                    'max_custom_palettes' => 15,
                    'allow_live_chat' => true
                ];

            case self::TIER_PRO:
                return [
                    'name' => 'Pro',
                    'max_canvases' => 5,
                    'max_snapshots_per_canvas' => 100,
                    'max_storage_mb' => 500,
                    'max_members_per_canvas' => 1000,
                    'advanced_roles' => false,
                    'live_templates' => true,
                    'extended_palettes' => true,
                    'custom_palettes' => false,
                    'max_custom_palettes' => 0,
                    'allow_live_chat' => false
                ];

            case self::TIER_PLUS:
            default:
                return [
                    'name' => 'Plus',
                    'max_canvases' => 1,
                    'max_snapshots_per_canvas' => 0,
                    'max_storage_mb' => 50,
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
            self::TIER_PLUS => [
                'monthly' => 0.00,
                'yearly' => 0.00
            ],
            self::TIER_PRO => [
                'monthly' => 9.99,
                'yearly' => 95.99
            ],
            self::TIER_ULTRA => [
                'monthly' => 19.99,
                'yearly' => 191.99
            ]
        ];
    }
}
?>