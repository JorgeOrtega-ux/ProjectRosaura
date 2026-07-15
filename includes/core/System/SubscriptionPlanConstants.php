<?php

namespace App\Core\System;

class SubscriptionPlanConstants {
    public const TIER_BASIC = 0;
    public const TIER_PRO = 1;
    public const TIER_ADVANCED = 2;
    public static function getTierLimits(int $tier): array {
        switch ($tier) {
            case self::TIER_ADVANCED:
                return [
                    'name' => 'Advanced',
                    'max_canvases' => 10,
                    'max_snapshots_per_canvas' => -1,
                    'max_storage_mb' => 1024,
                    'max_members_per_canvas' => 10000,
                    'advanced_roles' => true,
                    'live_templates' => true,
                    'extended_palettes' => true,
                    'custom_palettes' => true,
                    'max_custom_palettes' => 5,
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

            case self::TIER_BASIC:
            default:
                return [
                    'name' => 'Basic',
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
}
?>