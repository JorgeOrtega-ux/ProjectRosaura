<?php
// includes/core/System/SubscriptionPlanConstants.php

namespace App\Core\System;

class SubscriptionPlanConstants {
    // Definición de Niveles
    public const TIER_BASIC = 0;
    public const TIER_PRO = 1;
    public const TIER_ADVANCED = 2;

    /**
     * Retorna todas las limitantes y características según el nivel del usuario.
     * @param int $tier El nivel de suscripción del usuario.
     * @return array
     */
    public static function getTierLimits(int $tier): array {
        switch ($tier) {
            case self::TIER_ADVANCED:
                return [
                    'name' => 'Advanced',
                    'max_canvases' => -1, // -1 significa ilimitado
                    'max_snapshots_per_canvas' => -1, // Ilimitado
                    'max_storage_mb' => 5120, // 5GB
                    'max_members_per_canvas' => 50,
                    'advanced_roles' => true,
                    'live_templates' => true,
                    'premium_tools' => true,
                    'high_res_export' => true,
                    'custom_palettes' => true
                ];

            case self::TIER_PRO:
                return [
                    'name' => 'Pro',
                    'max_canvases' => 5,
                    'max_snapshots_per_canvas' => 5,
                    'max_storage_mb' => 500, // 500MB
                    'max_members_per_canvas' => 5,
                    'advanced_roles' => false,
                    'live_templates' => true,
                    'premium_tools' => true,
                    'high_res_export' => true,
                    'custom_palettes' => true
                ];

            case self::TIER_BASIC:
            default:
                return [
                    'name' => 'Basic',
                    'max_canvases' => 1,
                    'max_snapshots_per_canvas' => 1,
                    'max_storage_mb' => 1,
                    'max_members_per_canvas' => 1,
                    'advanced_roles' => false,
                    'live_templates' => false,
                    'premium_tools' => false,
                    'high_res_export' => false,
                    'custom_palettes' => false
                ];
        }
    }

    /**
     * Verifica si un nivel específico tiene acceso a una característica booleana.
     */
    public static function hasFeature(int $tier, string $featureKey): bool {
        $limits = self::getTierLimits($tier);
        return isset($limits[$featureKey]) && $limits[$featureKey] === true;
    }
}
?>