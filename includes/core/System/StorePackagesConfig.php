<?php

namespace App\Core\System;

class StorePackagesConfig {
    public static function getCoinPackages(): array {
        $packages = [];
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT * FROM store_coin_packages WHERE is_active = 1 ORDER BY amount ASC");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $packages[(int)$row['amount']] = [
                    'id' => $row['uuid'],
                    'name' => __($row['name']) ?: $row['name'],
                    'amount' => (int)$row['amount'],
                    'description' => __($row['description']) ?: $row['description'],
                    'price_usd' => (float)$row['price_usd'],
                    'bonus_text' => $row['bonus_text'] ? (__($row['bonus_text']) ?: $row['bonus_text']) : null,
                    'icon' => $row['icon'] ?: 'monetization_on',
                    'icon_color' => $row['icon_color'],
                    'border_color' => $row['border_color'],
                    'badge_color' => $row['badge_color'],
                    'is_featured' => (bool)$row['is_popular'],
                    'stripe_env_key' => null,
                    'default_price_id' => $row['stripe_price_id'],
                ];
            }
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Failed to load coin packages from DB: " . $e->getMessage());
        }

        if (empty($packages)) {
            // Fallback en caso de error de BBDD
            return [
                1000 => [
                    'id' => StoreConstants::COINS_1000,
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
                ]
            ];
        }

        return $packages;
    }
    public static function getContentPackages(): array {
        return [
            StoreConstants::PERK_PIXEL_SHIELD => [
                'id' => StoreConstants::PERK_PIXEL_SHIELD,
                'name' => __('store_content_proteccion_pixeles_1_name'),
                'description' => __('store_content_proteccion_pixeles_1_desc'),
                'price_coins' => 2000,
                'icon' => 'shield',
                'is_single_use' => true,
            ],
            StoreConstants::PERK_PIXEL_MISSILE => [
                'id' => StoreConstants::PERK_PIXEL_MISSILE,
                'name' => __('store_content_pixel_misil_1_name'),
                'description' => __('store_content_pixel_misil_1_desc'),
                'price_coins' => 500,
                'icon' => 'rocket_launch',
                'is_single_use' => true,
            ],
            StoreConstants::PERK_PIXEL_BOMB => [
                'id' => StoreConstants::PERK_PIXEL_BOMB,
                'name' => __('store_content_bomba_pixel_1_name'),
                'description' => __('store_content_bomba_pixel_1_desc'),
                'price_coins' => 1000,
                'icon' => 'bomb',
                'is_single_use' => true,
            ],
            StoreConstants::PERK_CLUSTER_BOMB => [
                'id' => StoreConstants::PERK_CLUSTER_BOMB,
                'name' => __('store_content_bomba_racimo_1_name'),
                'description' => __('store_content_bomba_racimo_1_desc'),
                'price_coins' => 2500,
                'icon' => 'scatter_plot',
                'is_single_use' => true,
            ],
            StoreConstants::PERK_ATOMIC_BOMB => [
                'id' => StoreConstants::PERK_ATOMIC_BOMB,
                'name' => __('store_content_bomba_atomica_1_name'),
                'description' => __('store_content_bomba_atomica_1_desc'),
                'price_coins' => 5000,
                'icon' => 'crisis_alert',
                'is_single_use' => true,
            ],
            StoreConstants::PERK_METEOR_SHOWER => [
                'id' => StoreConstants::PERK_METEOR_SHOWER,
                'name' => __('store_content_lluvia_meteoritos_1_name'),
                'description' => __('store_content_lluvia_meteoritos_1_desc'),
                'price_coins' => 10000,
                'icon' => 'storm',
                'is_single_use' => true,
            ],
            StoreConstants::PERK_ORBITAL_CANNON => [
                'id' => StoreConstants::PERK_ORBITAL_CANNON,
                'name' => __('store_content_canon_orbital_1_name'),
                'description' => __('store_content_canon_orbital_1_desc'),
                'price_coins' => 15000,
                'icon' => 'satellite_alt',
                'is_single_use' => true,
            ],
            StoreConstants::PERK_BLACK_HOLE => [
                'id' => StoreConstants::PERK_BLACK_HOLE,
                'name' => __('store_content_agujero_negro_1_name'),
                'description' => __('store_content_agujero_negro_1_desc'),
                'price_coins' => 20000,
                'icon' => 'cyclone',
                'is_single_use' => true,
            ],
            StoreConstants::PERK_MINAS => [
                'id' => StoreConstants::PERK_MINAS,
                'name' => __('store_content_minas_1_name'),
                'description' => __('store_content_minas_1_desc'),
                'price_coins' => 1500,
                'icon' => 'radar',
                'is_single_use' => true,
            ]
        ];
    }
}
?>
