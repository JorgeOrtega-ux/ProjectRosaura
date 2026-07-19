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
                'price_usd' => 0.99,
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
                'price_usd' => 2.49,
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
                'price_usd' => 4.99,
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
                'price_usd' => 9.99,
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
            'no_cooldown_10s' => [
                'id' => 'no_cooldown_10s',
                'name' => __('store_content_no_cooldown_10s_name'),
                'description' => __('store_content_no_cooldown_10s_desc'),
                'price_coins' => 1500,
                'icon' => 'timer_off',
                'is_single_use' => true,
            ],
            'pixel_protection_25' => [
                'id' => 'pixel_protection_25',
                'name' => __('store_content_pixel_protection_25_name'),
                'description' => __('store_content_pixel_protection_25_desc'),
                'price_coins' => 3000,
                'icon' => 'security',
                'is_single_use' => true,
            ],
            'elite_eraser_25' => [
                'id' => 'elite_eraser_25',
                'name' => __('store_content_elite_eraser_25_name'),
                'description' => __('store_content_elite_eraser_25_desc'),
                'price_coins' => 5000,
                'icon' => 'ink_eraser',
                'is_single_use' => true,
            ],
            'pixel_misil_1' => [
                'id' => 'pixel_misil_1',
                'name' => __('store_content_pixel_misil_1_name'),
                'description' => __('store_content_pixel_misil_1_desc'),
                'price_coins' => 2000,
                'icon' => 'rocket_launch',
                'is_single_use' => true,
            ],
            'bomba_pixel_1' => [
                'id' => 'bomba_pixel_1',
                'name' => __('store_content_bomba_pixel_1_name'),
                'description' => __('store_content_bomba_pixel_1_desc'),
                'price_coins' => 5000,
                'icon' => 'bomb',
                'is_single_use' => true,
            ],
            'bomba_atomica_1' => [
                'id' => 'bomba_atomica_1',
                'name' => __('store_content_bomba_atomica_1_name'),
                'description' => __('store_content_bomba_atomica_1_desc'),
                'price_coins' => 25000,
                'icon' => 'warning',
                'is_single_use' => true,
            ]
        ];
    }
}
?>
