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
            ],
            'feat_custom_colors' => [
                'icon'            => 'color_lens',
                'title_key'       => 'plan_feat_custom_colors_title',
                'title_short_key' => 'plan_feat_custom_colors_short',
                'desc_key'        => 'plan_feat_custom_colors_desc'
            ]
        ];
    }
}
