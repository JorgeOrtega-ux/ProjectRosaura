<?php

namespace App\Core\System;

class SubscriptionPlanConstants {
    private static $tierLimitsCache = [];

    public static function getTierLimits(int $tier): array {
        if (isset(self::$tierLimitsCache[$tier])) {
            return self::$tierLimitsCache[$tier];
        }

        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->prepare("SELECT features, name FROM subscription_tiers WHERE tier_level = ?");
            $stmt->execute([$tier]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                $features = json_decode($row['features'], true) ?? [];
                
                // Compatibility for old code that assumes limits are in the root of features array
                $limits = $features['limits'] ?? $features;
                $limits['name'] = $row['name'];
                
                self::$tierLimitsCache[$tier] = $limits;
                return $limits;
            }
        } catch (\Exception $e) {
            // Silently fallback on error
        }

        $default = [
            'name' => 'Free',
            'max_canvases' => 1,
            'max_snapshots_per_canvas' => 10,
            'max_storage_mb' => 20,
            'max_members_per_canvas' => 10
        ];
        self::$tierLimitsCache[$tier] = $default;
        return $default;
    }

    public static function hasFeature(int $tier, string $featureKey): bool {
        $limits = self::getTierLimits($tier);
        return isset($limits[$featureKey]) && $limits[$featureKey] === true;
    }

    public static function getTierPrices(): array {
        $prices = [];
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT tier_level, features FROM subscription_tiers");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $features = json_decode($row['features'], true) ?? [];
                $prices[(int)$row['tier_level']] = [
                    'monthly' => (float)($features['price_monthly'] ?? 0),
                    'yearly'  => (float)($features['price_yearly'] ?? 0)
                ];
            }
        } catch (\Exception $e) {
            // Silently fallback on error
        }
        return $prices;
    }

    public static function getAllTiers(): array {
        $tiers = [];
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT * FROM subscription_tiers ORDER BY tier_level ASC");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $row['features'] = json_decode($row['features'], true) ?? [];
                $row['color'] = json_decode($row['color'], true) ?? [];
                $tiers[] = $row;
            }
        } catch (\Exception $e) {
            // Silently fallback on error
        }
        return $tiers;
    }
}
?>