<?php

declare(strict_types=1);

/**
 * ==============================================================================
 * ProjectRosaura - Centralized Subscription Plans Configuration
 * ==============================================================================
 * 
 * Este archivo centraliza la definición completa de los planes y suscripciones.
 * Los precios y límites se gestionan directamente en este archivo (OPcache en RAM).
 * Los IDs de precios de Stripe se mapean a variables de entorno (.env).
 */

return [
    'tiers' => [
        0 => [
            'id' => 1,
            'tier_level' => 0,
            'uuid' => '23bfb9b0-4f5d-4f1a-b6ef-9f9e2b17f5a1',
            'name' => 'Basic',
            'is_active' => 1,
            'is_popular' => 0,
            'price_monthly' => 0.00,
            'price_yearly' => 0.00,
            'stripe_env_monthly' => null,
            'stripe_env_yearly' => null,
            'color' => [
                'type' => 'solid',
                'colors' => [
                    ['hex' => '#808080', 'percentage' => 100]
                ]
            ],
            // Límites del plan
            'max_canvases' => 1,
            'max_storage_mb' => 20,
            'max_snapshots_per_canvas' => 10,
            'max_members_per_canvas' => 10,
            'max_custom_palettes' => 0,
            'max_template_tokens' => 0,
            'max_upload_mb' => 10,
            'max_pixels_per_batch' => 5,
            // Características (Features)
            'feat_advanced_roles' => 0,
            'feat_chat_restriction' => 0,
            'feat_custom_palettes' => 0,
            'feat_unlimited_exports' => 0,
            'feat_inject_templates' => 0,
            'feat_live_share' => 0,
            'feat_no_ads' => 0,
            'feat_export_timelapse' => 0,
        ],
        1 => [
            'id' => 2,
            'tier_level' => 1,
            'uuid' => '49bfa810-7b2c-4e81-a9f4-123456789abc',
            'name' => 'Plus',
            'is_active' => 1,
            'is_popular' => 0,
            'price_monthly' => 4.99,
            'price_yearly' => 49.99,
            'stripe_env_monthly' => 'STRIPE_PRICE_PLUS_MONTHLY',
            'stripe_env_yearly' => 'STRIPE_PRICE_PLUS_YEARLY',
            'color' => [
                'type' => 'solid',
                'colors' => [
                    ['hex' => '#28a745', 'percentage' => 100]
                ]
            ],
            // Límites del plan
            'max_canvases' => 3,
            'max_storage_mb' => 200,
            'max_snapshots_per_canvas' => 25,
            'max_members_per_canvas' => 100,
            'max_custom_palettes' => 0,
            'max_template_tokens' => 0,
            'max_upload_mb' => 25,
            'max_pixels_per_batch' => 25,
            // Características (Features)
            'feat_advanced_roles' => 0,
            'feat_chat_restriction' => 0,
            'feat_custom_palettes' => 0,
            'feat_unlimited_exports' => 0,
            'feat_inject_templates' => 0,
            'feat_live_share' => 0,
            'feat_no_ads' => 1,
            'feat_export_timelapse' => 1,
        ],
        2 => [
            'id' => 3,
            'tier_level' => 2,
            'uuid' => '1c9f2231-5f21-4d9a-b851-9f9f2f111222',
            'name' => 'Pro',
            'is_active' => 1,
            'is_popular' => 1,
            'price_monthly' => 9.99,
            'price_yearly' => 99.99,
            'stripe_env_monthly' => 'STRIPE_PRICE_PRO_MONTHLY',
            'stripe_env_yearly' => 'STRIPE_PRICE_PRO_YEARLY',
            'color' => [
                'type' => 'solid',
                'colors' => [
                    ['hex' => '#fd7e14', 'percentage' => 100]
                ]
            ],
            // Límites del plan
            'max_canvases' => 10,
            'max_storage_mb' => 1000,
            'max_snapshots_per_canvas' => 100,
            'max_members_per_canvas' => 2500,
            'max_custom_palettes' => 5,
            'max_template_tokens' => 0,
            'max_upload_mb' => 50,
            'max_pixels_per_batch' => 50,
            // Características (Features)
            'feat_advanced_roles' => 1,
            'feat_chat_restriction' => 1,
            'feat_custom_palettes' => 1,
            'feat_unlimited_exports' => 0,
            'feat_inject_templates' => 0,
            'feat_live_share' => 1,
            'feat_no_ads' => 1,
            'feat_export_timelapse' => 1,
        ],
        3 => [
            'id' => 4,
            'tier_level' => 3,
            'uuid' => '87cf9a91-4c12-4d2c-a222-7f8f9a92231c',
            'name' => 'Ultra',
            'is_active' => 1,
            'is_popular' => 0,
            'price_monthly' => 19.99,
            'price_yearly' => 199.99,
            'stripe_env_monthly' => 'STRIPE_PRICE_ULTRA_MONTHLY',
            'stripe_env_yearly' => 'STRIPE_PRICE_ULTRA_YEARLY',
            'color' => [
                'type' => 'gradient',
                'angle' => 295,
                'colors' => [
                    ['hex' => '#E92D18', 'percentage' => 28],
                    ['hex' => '#306EE2', 'percentage' => 29],
                    ['hex' => '#249A41', 'percentage' => 28],
                    ['hex' => '#CD9308', 'percentage' => 15]
                ]
            ],
            // Límites del plan
            'max_canvases' => 50,
            'max_storage_mb' => 5000,
            'max_snapshots_per_canvas' => -1, // Ilimitado
            'max_members_per_canvas' => 50000,
            'max_custom_palettes' => 25,
            'max_template_tokens' => 250,
            'max_upload_mb' => 100,
            'max_pixels_per_batch' => 100,
            // Características (Features)
            'feat_advanced_roles' => 1,
            'feat_chat_restriction' => 1,
            'feat_custom_palettes' => 1,
            'feat_unlimited_exports' => 1,
            'feat_inject_templates' => 1,
            'feat_live_share' => 1,
            'feat_no_ads' => 1,
            'feat_export_timelapse' => 1,
        ],
    ]
];
