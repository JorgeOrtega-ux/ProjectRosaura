<?php

namespace App\Core\System;

class StorePackagesConfig {

    /**
     * Devuelve los metadatos visuales para un monto de monedas.
     */
    public static function getCoinVisualMetadata(int $amount): array {
        if ($amount >= 10000) {
            return [
                'icon' => 'workspace_premium',
                'icon_color' => '#8b5cf6',
                'border_color' => '#8b5cf6',
                'badge_color' => '#8b5cf6',
            ];
        }
        if ($amount >= 5000) {
            return [
                'icon' => 'diamond',
                'icon_color' => null,
                'border_color' => null,
                'badge_color' => 'var(--color-success)',
            ];
        }
        return [
            'icon' => 'monetization_on',
            'icon_color' => null,
            'border_color' => null,
            'badge_color' => null,
        ];
    }

    /**
     * Devuelve los metadatos visuales para un Perk ID.
     */
    public static function getPerkVisualMetadata(string $perkId): array {
        $visuals = [
            StoreConstants::PERK_PIXEL_MISSILE => ['icon' => 'rocket_launch'],
            StoreConstants::PERK_PIXEL_BOMB => ['icon' => 'bomb'],
            StoreConstants::PERK_CLUSTER_BOMB => ['icon' => 'scatter_plot'],
            StoreConstants::PERK_ATOMIC_BOMB => ['icon' => 'crisis_alert'],
            StoreConstants::PERK_METEOR_SHOWER => ['icon' => 'storm'],
            StoreConstants::PERK_ORBITAL_CANNON => ['icon' => 'satellite_alt'],
            StoreConstants::PERK_BLACK_HOLE => ['icon' => 'cyclone'],
            StoreConstants::PERK_MINES => ['icon' => 'radar'],
            StoreConstants::PERK_SUPERNOVA_BLAST => ['icon' => 'wb_sunny'],
            StoreConstants::PERK_ION_STRIKE => ['icon' => 'change_history'],
        ];

        return $visuals[$perkId] ?? ['icon' => 'shield'];
    }

    private static ?array $coinPackagesCache = null;
    private static ?array $contentPackagesCache = null;

    public static function resetCache(): void {
        self::$coinPackagesCache = null;
        self::$contentPackagesCache = null;
    }

    public static function getCoinPackages(): array {
        if (self::$coinPackagesCache !== null) {
            return self::$coinPackagesCache;
        }

        try {
            $redis = (new \App\Config\Database\RedisCache())->getClient();
            if ($redis && !defined('SYSTEM_DEGRADED')) {
                $cached = $redis->get(CacheConstants::KEY_STORE_COIN_PACKAGES);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded) && !empty($decoded)) {
                        self::$coinPackagesCache = $decoded;
                        return $decoded;
                    }
                }
            }
        } catch (\Throwable $e) {}

        $packages = [];
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT uuid, amount, bonus_amount, price_usd, stripe_price_id, is_popular FROM store_coin_packages WHERE is_active = 1 ORDER BY amount ASC");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $amount = (int)$row['amount'];
                $bonusAmount = (int)($row['bonus_amount'] ?? 0);
                $baseAmount = $amount - $bonusAmount;
                
                $meta = self::getCoinVisualMetadata($amount);

                $packages[$amount] = [
                    'id' => $row['uuid'],
                    'name' => __('store_coins_title_format', ['amount' => number_format($amount)]),
                    'amount' => $amount,
                    'bonus_amount' => $bonusAmount,
                    'description' => $bonusAmount > 0 
                        ? __('store_coins_desc_bonus_format', ['base' => number_format($baseAmount), 'bonus' => number_format($bonusAmount)])
                        : __('store_coins_desc_format'),
                    'price_usd' => (float)$row['price_usd'],
                    'bonus_text' => $bonusAmount > 0 
                        ? __('store_coins_bonus_format', ['bonus' => number_format($bonusAmount)])
                        : null,
                    'icon' => $meta['icon'],
                    'icon_color' => $meta['icon_color'],
                    'border_color' => $meta['border_color'],
                    'badge_color' => $meta['badge_color'],
                    'is_featured' => (bool)$row['is_popular'],
                    'stripe_env_key' => null,
                    'default_price_id' => $row['stripe_price_id'],
                ];
            }

            if (!empty($packages)) {
                try {
                    $redis = (new \App\Config\Database\RedisCache())->getClient();
                    if ($redis && !defined('SYSTEM_DEGRADED')) {
                        $redis->setex(CacheConstants::KEY_STORE_COIN_PACKAGES, CacheConstants::TTL_ONE_WEEK, json_encode($packages));
                    }
                } catch (\Throwable $e) {}
            }
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Failed to load coin packages from DB: " . $e->getMessage());
        }

        if (empty($packages)) {
            // Fallback en caso de error de BBDD
            $packages = [
                1000 => [
                    'id' => StoreConstants::COINS_1000,
                    'name' => __('store_coins_1000_name'),
                    'amount' => 1000,
                    'bonus_amount' => 0,
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

        self::$coinPackagesCache = $packages;
        return $packages;
    }

    public static function getContentPackages(): array {
        if (self::$contentPackagesCache !== null) {
            return self::$contentPackagesCache;
        }

        try {
            $redis = (new \App\Config\Database\RedisCache())->getClient();
            if ($redis && !defined('SYSTEM_DEGRADED')) {
                $cached = $redis->get(CacheConstants::KEY_STORE_PERK_PACKAGES);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded) && !empty($decoded)) {
                        self::$contentPackagesCache = $decoded;
                        return $decoded;
                    }
                }
            }
        } catch (\Throwable $e) {}

        $packages = [];
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT uuid, perk_id, price_coins, is_single_use FROM store_perk_packages WHERE is_active = 1 ORDER BY price_coins ASC");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $perkId = $row['perk_id'];
                $meta = self::getPerkVisualMetadata($perkId);
                
                $packages[$perkId] = [
                    'id' => $perkId,
                    'uuid' => $row['uuid'],
                    'name' => __("store_content_{$perkId}_name") ?: $perkId,
                    'description' => __("store_content_{$perkId}_desc") ?: "",
                    'price_coins' => (int)$row['price_coins'],
                    'icon' => $meta['icon'],
                    'is_single_use' => (bool)$row['is_single_use'],
                ];
            }

            if (!empty($packages)) {
                try {
                    $redis = (new \App\Config\Database\RedisCache())->getClient();
                    if ($redis && !defined('SYSTEM_DEGRADED')) {
                        $redis->setex(CacheConstants::KEY_STORE_PERK_PACKAGES, CacheConstants::TTL_ONE_WEEK, json_encode($packages));
                    }
                } catch (\Throwable $e) {}
            }
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Failed to load perk packages from DB: " . $e->getMessage());
        }

        if (empty($packages)) {
            return [
                StoreConstants::PERK_PIXEL_MISSILE => [
                    'id' => StoreConstants::PERK_PIXEL_MISSILE,
                    'uuid' => 'e0000000-0000-0000-0000-000000000002',
                    'name' => __('store_content_pixel_missile_1_name'),
                    'description' => __('store_content_pixel_missile_1_desc'),
                    'price_coins' => 500,
                    'icon' => 'rocket_launch',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_PIXEL_BOMB => [
                    'id' => StoreConstants::PERK_PIXEL_BOMB,
                    'uuid' => 'e0000000-0000-0000-0000-000000000003',
                    'name' => __('store_content_pixel_bomb_1_name'),
                    'description' => __('store_content_pixel_bomb_1_desc'),
                    'price_coins' => 1000,
                    'icon' => 'bomb',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_CLUSTER_BOMB => [
                    'id' => StoreConstants::PERK_CLUSTER_BOMB,
                    'uuid' => 'e0000000-0000-0000-0000-000000000004',
                    'name' => __('store_content_cluster_bomb_1_name'),
                    'description' => __('store_content_cluster_bomb_1_desc'),
                    'price_coins' => 2500,
                    'icon' => 'scatter_plot',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_ATOMIC_BOMB => [
                    'id' => StoreConstants::PERK_ATOMIC_BOMB,
                    'uuid' => 'e0000000-0000-0000-0000-000000000005',
                    'name' => __('store_content_atomic_bomb_1_name'),
                    'description' => __('store_content_atomic_bomb_1_desc'),
                    'price_coins' => 5000,
                    'icon' => 'crisis_alert',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_METEOR_SHOWER => [
                    'id' => StoreConstants::PERK_METEOR_SHOWER,
                    'uuid' => 'e0000000-0000-0000-0000-000000000006',
                    'name' => __('store_content_meteor_shower_1_name'),
                    'description' => __('store_content_meteor_shower_1_desc'),
                    'price_coins' => 10000,
                    'icon' => 'storm',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_ORBITAL_CANNON => [
                    'id' => StoreConstants::PERK_ORBITAL_CANNON,
                    'uuid' => 'e0000000-0000-0000-0000-000000000007',
                    'name' => __('store_content_orbital_cannon_1_name'),
                    'description' => __('store_content_orbital_cannon_1_desc'),
                    'price_coins' => 15000,
                    'icon' => 'satellite_alt',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_BLACK_HOLE => [
                    'id' => StoreConstants::PERK_BLACK_HOLE,
                    'uuid' => 'e0000000-0000-0000-0000-000000000008',
                    'name' => __('store_content_black_hole_1_name'),
                    'description' => __('store_content_black_hole_1_desc'),
                    'price_coins' => 20000,
                    'icon' => 'cyclone',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_MINES => [
                    'id' => StoreConstants::PERK_MINES,
                    'uuid' => 'e0000000-0000-0000-0000-000000000009',
                    'name' => __('store_content_mines_1_name'),
                    'description' => __('store_content_mines_1_desc'),
                    'price_coins' => 1500,
                    'icon' => 'radar',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_SUPERNOVA_BLAST => [
                    'id' => StoreConstants::PERK_SUPERNOVA_BLAST,
                    'uuid' => 'e0000000-0000-0000-0000-000000000010',
                    'name' => __('store_content_supernova_blast_name'),
                    'description' => __('store_content_supernova_blast_desc'),
                    'price_coins' => 12000,
                    'icon' => 'wb_sunny',
                    'is_single_use' => true,
                ],
                StoreConstants::PERK_ION_STRIKE => [
                    'id' => StoreConstants::PERK_ION_STRIKE,
                    'uuid' => 'e0000000-0000-0000-0000-000000000011',
                    'name' => __('store_content_ion_strike_name'),
                    'description' => __('store_content_ion_strike_desc'),
                    'price_coins' => 8000,
                    'icon' => 'change_history',
                    'is_single_use' => true,
                ]
            ];
        }

        return $packages;
    }
}

?>
