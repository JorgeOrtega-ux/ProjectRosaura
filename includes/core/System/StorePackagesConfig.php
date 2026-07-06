<?php
// includes/core/System/StorePackagesConfig.php

namespace App\Core\System;

class StorePackagesConfig {
    
    /**
     * Retorna los paquetes de monedas disponibles en la tienda.
     * @return array
     */
    public static function getCoinPackages(): array {
        return [
            1000 => [
                'id' => 'coins_1000',
                'name' => '1,000 Monedas',
                'amount' => 1000,
                'description' => 'Paquete básico de monedas.',
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
                'name' => '2,750 Monedas',
                'amount' => 2750,
                'description' => '2,000 + 750 de bonificación',
                'price_usd' => 2.49,
                'bonus_text' => 'BONUS +750',
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
                'name' => '5,750 Monedas',
                'amount' => 5750,
                'description' => '4,500 + 1,250 de bonificación',
                'price_usd' => 4.99,
                'bonus_text' => 'BONUS +1,250',
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
                'name' => '13,250 Monedas',
                'amount' => 13250,
                'description' => '10,000 + 3,250 de bonificación',
                'price_usd' => 9.99,
                'bonus_text' => 'BONUS +3,250',
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

    /**
     * Retorna los paquetes de contenido/perks disponibles en la tienda.
     * @return array
     */
    public static function getContentPackages(): array {
        return [
            'no_cooldown_10s' => [
                'id' => 'no_cooldown_10s',
                'name' => 'Sin Cooldown (10s)',
                'description' => 'Elimina tu tiempo de espera por 10 segundos en un lienzo oficial. Una vez activo, el tiempo no podrá pausarse.',
                'price_coins' => 1500,
                'icon' => 'timer_off',
                'is_single_use' => true,
            ],
            'pixel_protection_25' => [
                'id' => 'pixel_protection_25',
                'name' => 'Protección de Píxel',
                'description' => 'Otorga protección contra sobrescritura para un máximo de 25 píxeles en un lienzo oficial.',
                'price_coins' => 3000,
                'icon' => 'security',
                'is_single_use' => true,
            ]
        ];
    }
}
?>
