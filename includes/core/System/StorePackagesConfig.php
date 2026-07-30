<?php

namespace App\Core\System;

class StorePackagesConfig {
    public static function getCoinPackages(): array {
        return [
            1000 => [
                'id' => 'coins_1000',
                'name' => __('store_coins_1000_name'),
                'amount' => 1000,
                'description' => __('store_coins_1000_desc'),
                'price_usd' => 2.99,
                'bonus_text' => null,
                'icon' => 'monetization_on',
                'icon_color' => null,
                'border_color' => null,
                'badge_color' => null,
                'is_featured' => false,
                'stripe_env_key' => 'STRIPE_PRICE_COINS_1000',
                'default_price_id' => 'price_1Tq2JyE4dfTcnyKKhgS3IK9l',
            ],
            2750 => [
                'id' => 'coins_2750',
                'name' => __('store_coins_2750_name'),
                'amount' => 2750,
                'description' => __('store_coins_2750_desc'),
                'price_usd' => 6.99,
                'bonus_text' => __('store_coins_2750_bonus'),
                'icon' => 'monetization_on',
                'icon_color' => null,
                'border_color' => null,
                'badge_color' => null,
                'is_featured' => true,
                'stripe_env_key' => 'STRIPE_PRICE_COINS_2750',
                'default_price_id' => 'price_1Tq2KME4dfTcnyKK8LBoUUWT',
            ],
            5750 => [
                'id' => 'coins_5750',
                'name' => __('store_coins_5750_name'),
                'amount' => 5750,
                'description' => __('store_coins_5750_desc'),
                'price_usd' => 12.99,
                'bonus_text' => __('store_coins_5750_bonus'),
                'icon' => 'diamond',
                'icon_color' => null,
                'border_color' => null,
                'badge_color' => 'var(--color-success)',
                'is_featured' => true,
                'stripe_env_key' => 'STRIPE_PRICE_COINS_5750',
                'default_price_id' => 'price_1Tq2KdE4dfTcnyKKY9DebxeP',
            ],
            13250 => [
                'id' => 'coins_13250',
                'name' => __('store_coins_13250_name'),
                'amount' => 13250,
                'description' => __('store_coins_13250_desc'),
                'price_usd' => 24.99,
                'bonus_text' => __('store_coins_13250_bonus'),
                'icon' => 'workspace_premium',
                'icon_color' => '#8b5cf6',
                'border_color' => '#8b5cf6',
                'badge_color' => '#8b5cf6',
                'is_featured' => true,
                'stripe_env_key' => 'STRIPE_PRICE_COINS_13250',
                'default_price_id' => 'price_1Tq2L5E4dfTcnyKKa5FoxTj4',
            ]
        ];
    }
    public static function getContentPackages(): array {
        return [
            'proteccion_pixeles_1' => [
                'id' => 'proteccion_pixeles_1',
                'name' => __('store_content_proteccion_pixeles_1_name'),
                'description' => __('store_content_proteccion_pixeles_1_desc'),
                'price_coins' => 2000,
                'icon' => 'shield',
                'is_single_use' => true,
            ],
            'pixel_misil_1' => [
                'id' => 'pixel_misil_1',
                'name' => __('store_content_pixel_misil_1_name'),
                'description' => __('store_content_pixel_misil_1_desc'),
                'price_coins' => 500,
                'icon' => 'rocket_launch',
                'is_single_use' => true,
            ],
            'bomba_pixel_1' => [
                'id' => 'bomba_pixel_1',
                'name' => __('store_content_bomba_pixel_1_name'),
                'description' => __('store_content_bomba_pixel_1_desc'),
                'price_coins' => 1000,
                'icon' => 'bomb',
                'is_single_use' => true,
            ],
            'bomba_racimo_1' => [
                'id' => 'bomba_racimo_1',
                'name' => __('store_content_bomba_racimo_1_name'),
                'description' => __('store_content_bomba_racimo_1_desc'),
                'price_coins' => 2500,
                'icon' => 'scatter_plot',
                'is_single_use' => true,
            ],
            'bomba_atomica_1' => [
                'id' => 'bomba_atomica_1',
                'name' => __('store_content_bomba_atomica_1_name'),
                'description' => __('store_content_bomba_atomica_1_desc'),
                'price_coins' => 5000,
                'icon' => 'crisis_alert',
                'is_single_use' => true,
            ],
            'lluvia_meteoritos_1' => [
                'id' => 'lluvia_meteoritos_1',
                'name' => __('store_content_lluvia_meteoritos_1_name'),
                'description' => __('store_content_lluvia_meteoritos_1_desc'),
                'price_coins' => 10000,
                'icon' => 'storm',
                'is_single_use' => true,
            ]
        ];
    }
}
?>
