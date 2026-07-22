<?php

namespace App\Core\System;

class SubscriptionPlanConstants {
    private static $tierLimitsCache = [];

    public static function getTierLimits(int $tier): array {
        if (isset(self::$tierLimitsCache[$tier])) {
            return self::$tierLimitsCache[$tier];
        }

        if ($tier >= 99) {
            $tier = self::getMaxTierLevel();
        }

        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->prepare("SELECT * FROM subscription_tiers WHERE tier_level = ?");
            $stmt->execute([$tier]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                $limits = [
                    'name' => $row['name'],
                    'max_canvases' => (int)$row['max_canvases'],
                    'max_storage_mb' => (int)$row['max_storage_mb'],
                    'max_snapshots_per_canvas' => (int)$row['max_snapshots_per_canvas'],
                    'max_members_per_canvas' => (int)$row['max_members_per_canvas'],
                    'max_custom_palettes' => (int)$row['max_custom_palettes'],
                    'feat_advanced_roles' => (bool)$row['feat_advanced_roles'],
                    'feat_chat_restriction' => (bool)$row['feat_chat_restriction'],
                    'feat_custom_palettes' => (bool)$row['feat_custom_palettes'],
                    'feat_priority_rendering' => (bool)$row['feat_priority_rendering'],
                    'feat_unlimited_exports' => (bool)$row['feat_unlimited_exports'],
                    'feat_beta_access' => (bool)$row['feat_beta_access'],
                    'allow_live_chat' => (bool)$row['feat_chat_restriction'],
                    'custom_palettes' => (bool)$row['feat_custom_palettes']
                ];
                
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
            'max_members_per_canvas' => 10,
            'max_custom_palettes' => 0,
            'feat_advanced_roles' => false,
            'feat_chat_restriction' => false,
            'feat_custom_palettes' => false,
            'feat_priority_rendering' => false,
            'feat_unlimited_exports' => false,
            'feat_beta_access' => false,
            'allow_live_chat' => false,
            'custom_palettes' => false
        ];
        self::$tierLimitsCache[$tier] = $default;
        return $default;
    }

    public static function hasFeature(int $tier, string $featureKey): bool {
        if ($featureKey === 'allow_live_chat') {
            $featureKey = 'chat_restriction';
        } elseif ($featureKey === 'live_templates' || $featureKey === 'live_sync') {
            $featureKey = 'beta_access';
        }
        $limits = self::getTierLimits($tier);
        if (isset($limits[$featureKey])) {
            return $limits[$featureKey] === true;
        }
        $prefixedKey = 'feat_' . $featureKey;
        if (isset($limits[$prefixedKey])) {
            return $limits[$prefixedKey] === true;
        }
        return false;
    }

    public static function getTierPrices(): array {
        $prices = [];
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT tier_level, price_monthly, price_yearly FROM subscription_tiers");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $prices[(int)$row['tier_level']] = [
                    'monthly' => (float)$row['price_monthly'],
                    'yearly'  => (float)$row['price_yearly']
                ];
            }
        } catch (\Exception $e) {
            // Silently fallback on error
        }
        return $prices;
    }

    public static function getMaxTierLevel(): int {
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT MAX(tier_level) FROM subscription_tiers WHERE is_active = 1");
            $max = $stmt->fetchColumn();
            if ($max !== false && $max !== null) {
                return (int)$max;
            }
        } catch (\Exception $e) {
            // Silently fallback on error
        }
        return 3;
    }

    public static function getAllTiers(): array {
        $tiers = [];
        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->query("SELECT * FROM subscription_tiers ORDER BY tier_level ASC");
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
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