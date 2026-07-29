<?php

namespace App\Core\System;

/**
 * Configurador Central de Ventajas (Features) de Suscripciones.
 * Aquí se definen todos los booleanos (switches) posibles para un plan,
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
                'icon'      => 'admin_panel_settings',
                'title_key' => 'plan_feat_advanced_roles_title',
                'desc_key'  => 'plan_feat_advanced_roles_desc'
            ],
            'feat_chat_restriction' => [
                'icon'      => 'speaker_notes_off',
                'title_key' => 'plan_feat_chat_restriction_title',
                'desc_key'  => 'plan_feat_chat_restriction_desc'
            ],
            'feat_custom_palettes' => [
                'icon'      => 'palette',
                'title_key' => 'plan_feat_custom_palettes_title',
                'desc_key'  => 'plan_feat_custom_palettes_desc'
            ],
            'feat_unlimited_exports' => [
                'icon'      => 'download',
                'title_key' => 'plan_feat_unlimited_exports_title',
                'desc_key'  => 'plan_feat_unlimited_exports_desc'
            ],
            'feat_inject_templates' => [
                'icon'      => 'brush',
                'title_key' => 'plan_feat_inject_templates_title',
                'desc_key'  => 'plan_feat_inject_templates_desc'
            ]
        ];
    }
}
