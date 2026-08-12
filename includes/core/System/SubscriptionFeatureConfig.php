<?php

namespace App\Core\System;

/**
 * Configurador Central de Ventajas (Features) de Suscripciones.

 * y se mapea su representación visual (icono, traducciones).
 */
class SubscriptionFeatureConfig {

    /**
     * Devuelve el catálogo completo de features disponibles.
     * @return array
     */
    public static function getAvailableFeatures(): array {
        return [
            'feat_advanced_roles' => [
                'icon'            => 'admin_panel_settings',
                'title_key'       => 'plan_feat_advanced_roles_title',
                'title_short_key' => 'plan_feat_advanced_roles_short',
                'desc_key'        => 'plan_feat_advanced_roles_desc'
            ],
            'feat_chat_restriction' => [
                'icon'            => 'speaker_notes_off',
                'title_key'       => 'plan_feat_chat_restriction_title',
                'title_short_key' => 'plan_feat_chat_restriction_short',
                'desc_key'        => 'plan_feat_chat_restriction_desc'
            ],
            'feat_custom_palettes' => [
                'icon'            => 'palette',
                'title_key'       => 'plan_feat_custom_palettes_title',
                'title_short_key' => 'plan_feat_custom_palettes_short',
                'desc_key'        => 'plan_feat_custom_palettes_desc'
            ],
            'feat_unlimited_exports' => [
                'icon'            => 'download',
                'title_key'       => 'plan_feat_unlimited_exports_title',
                'title_short_key' => 'plan_feat_unlimited_exports_short',
                'desc_key'        => 'plan_feat_unlimited_exports_desc'
            ],
            'feat_inject_templates' => [
                'icon'            => 'brush',
                'title_key'       => 'plan_feat_inject_templates_title',
                'title_short_key' => 'plan_feat_inject_templates_short',
                'desc_key'        => 'plan_feat_inject_templates_desc'
            ],
            'feat_live_share' => [
                'icon'            => 'stream',
                'title_key'       => 'plan_feat_live_share_title',
                'title_short_key' => 'plan_feat_live_share_short',
                'desc_key'        => 'plan_feat_live_share_desc'
            ]
        ];
    }

    /**
     * Genera la información de bloqueo (clase, atributos y badge html opcional) para una feature dada y un tier de usuario.
     * @param int $userTier El tier actual del usuario.
     * @param string $featureKey La clave de la feature (ej: 'feat_advanced_roles').
     * @param string $elementType El tipo de elemento visual ('button' o 'link').
     * @return array [
     *     'is_locked' => bool,
     *     'class' => string,     // Clases CSS a añadir
     *     'attributes' => string, // Atributos data-*
     *     'badge_html' => string  // HTML del badge con la estrella y nombre del tier
     * ]
     */
    public static function getLockDetails(int $userTier, string $featureKey, string $elementType = 'button'): array {
        $hasFeature = SubscriptionPlanConstants::hasFeature($userTier, $featureKey);
        
        if ($hasFeature) {
            return [
                'is_locked' => false,
                'class' => '',
                'attributes' => '',
                'badge_html' => ''
            ];
        }

        $requiredTierMin = SubscriptionPlanConstants::getLowestTierForFeature($featureKey);
        $requiredTierLevel = $requiredTierMin ? (int)$requiredTierMin['tier_level'] : 1;
        $requiredTierName = $requiredTierMin ? $requiredTierMin['name'] : 'Pro';

        $classes = 'premium-locked';
        if ($elementType === 'button') {
            $classes .= ' component-button--premium';
        }
        
        $attributes = ' data-requires-premium="true" data-required-tier="' . $requiredTierLevel . '"';

        $badgeHtml = '';
        if ($elementType === 'link') {
            $badgeHtml = ' <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ' . htmlspecialchars($requiredTierName) . '</span>';
        }

        return [
            'is_locked' => true,
            'class' => $classes,
            'attributes' => $attributes,
            'badge_html' => $badgeHtml
        ];
    }
}
