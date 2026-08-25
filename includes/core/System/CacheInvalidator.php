<?php

namespace App\Core\System;

class CacheInvalidator {

    private $redis;

    public function __construct($redis) {
        $this->redis = $redis;
    }

    private function deleteByPattern(string $pattern): void {
        if (!$this->redis) return;
        try {
            if (class_exists('\\Predis\\Collection\\Iterator\\Keyspace')) {
                $batch = [];
                foreach (new \Predis\Collection\Iterator\Keyspace($this->redis, $pattern) as $key) {
                    $batch[] = $key;
                    if (count($batch) >= 100) {
                        $this->redis->del($batch);
                        $batch = [];
                    }
                }
                if (!empty($batch)) {
                    $this->redis->del($batch);
                }
            } else {
                $cursor = '0';
                do {
                    $result = $this->redis->scan($cursor, ['MATCH' => $pattern, 'COUNT' => 100]);
                    $cursor = (string)$result[0];
                    $keys = $result[1];
                    if (!empty($keys)) {
                        $this->redis->del($keys);
                    }
                } while ($cursor !== '0' && $cursor !== '');
            }
        } catch (\Throwable $e) {}
    }

    public function user(int $userId, ?string $uuid = null): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_TEMPLATE_TOKENS . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_PREFS . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_FLAGS . $userId);

            if ($uuid) {
                $this->redis->del(CacheConstants::PREFIX_USER_PROFILE . $uuid);
            }

            $this->redis->del(CacheConstants::PREFIX_USER_ROLES . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_PERMS . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_HIGHEST_ROLE . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_STORAGE . $userId);
        } catch (\Throwable $e) {}
    }

    public function userPrefs(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PREFS . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_FLAGS . $userId);
        } catch (\Throwable $e) {}
    }

    public function userSubscription(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_SUBSCRIPTION . $userId);
        } catch (\Throwable $e) {}
    }

    public function userRoles(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_ROLES . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_PERMS . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_HIGHEST_ROLE . $userId);
        } catch (\Throwable $e) {}
    }

    public function canvas(int $canvasId, ?string $canvasUuid = null): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_DETAIL . $canvasId);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_RESET_SETTINGS . $canvasId);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_RESIZE_SETTINGS . $canvasId);
            $this->redis->del("canvas:{$canvasId}:config");
            $this->redis->del("canvas:{$canvasId}:layers");

            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_DETAIL . 'uuid:*');
            $this->deleteByPattern("canvas:view_data:{$canvasId}:*");
            $this->deleteByPattern("canvas:layout_preload:{$canvasId}:*");
            if ($canvasUuid) {
                $this->deleteByPattern("canvas:view_data:{$canvasUuid}:*");
                $this->deleteByPattern("canvas:layout_preload:{$canvasUuid}:*");
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_SNAPSHOTS_GALLERY . "{$canvasUuid}:*");
            }
            $this->deleteByPattern("canvas:view_data:*");
            $this->deleteByPattern("canvas:layout_preload:*");

            $metaPattern = CacheConstants::PREFIX_CANVAS_META . $canvasId . CacheConstants::SUFFIX_CANVAS_META_USER . '*';
            $this->deleteByPattern($metaPattern);

            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_PUBLIC_PAGE . '*');
            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_HOME_FEED . '*');
            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_DASHBOARD . '*');
            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_MANAGE . '*');
        } catch (\Throwable $e) {}
    }

    public function canvasSnapshots(string $canvasUuid, ?int $canvasId = null): void {
        if (!$this->redis) return;
        try {
            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_SNAPSHOTS_GALLERY . "{$canvasUuid}:*");
            if ($canvasId) {
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_SNAPSHOTS . "{$canvasId}:*");
            }
        } catch (\Throwable $e) {}
    }

    public function canvasTeam(?int $canvasId = null, ?string $canvasUuid = null): void {
        if (!$this->redis) return;
        try {
            if ($canvasUuid) {
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_TEAM_MEMBERS . "{$canvasUuid}:*");
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_TEAM_REQUESTS . "{$canvasUuid}:*");
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_TEAM_INVITES . "{$canvasUuid}:*");
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_TEAM_ROLES . "{$canvasUuid}:*");
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_TEAM_SANCTIONS . "{$canvasUuid}:*");
            }
            if ($canvasId) {
                $this->canvasRoles($canvasId);
            }
        } catch (\Throwable $e) {}
    }

    public function canvasSanctions(int $canvasId, ?string $canvasUuid = null): void {
        if (!$this->redis) return;
        try {
            if ($canvasUuid) {
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_TEAM_SANCTIONS . "{$canvasUuid}:*");
            }
            $this->deleteByPattern(sprintf(CacheConstants::PREFIX_CANVAS_BANNED, $canvasId, '*'));
            $this->deleteByPattern(sprintf(CacheConstants::PREFIX_CHAT_RESTRICTED, $canvasId, '*'));
        } catch (\Throwable $e) {}
    }

    public function canvasRoles(?int $canvasId = null): void {
        if (!$this->redis) return;
        try {
            if ($canvasId !== null && $canvasId > 0) {
                $this->redis->del(CacheConstants::PREFIX_CANVAS_ROLES_LIST . $canvasId);
            } else {
                $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_ROLES_LIST . '*');
            }
            $this->redis->del(CacheConstants::PREFIX_CANVAS_ROLES_LIST . 'global');
            $this->redis->del(CacheConstants::KEY_CANVAS_PERMS_ALL);
        } catch (\Throwable $e) {}
    }

    public function userCanvasList(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_COUNT . $userId);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_OWNER_LIST . $userId);

            for ($t = 0; $t <= 3; $t++) {
                $this->redis->del(CacheConstants::PREFIX_CANVAS_TIER_COUNT . "{$userId}:{$t}");
            }

            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_DASHBOARD . "u{$userId}:*");
            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_MANAGE . "u{$userId}:*");
            $this->deleteByPattern(CacheConstants::PREFIX_CANVAS_HOME_FEED . '*');
        } catch (\Throwable $e) {}
    }

    public function canvasMember(int $canvasId, int $userId): void {
        if (!$this->redis) return;
        try {
            $metaKey = CacheConstants::PREFIX_CANVAS_META . $canvasId . CacheConstants::SUFFIX_CANVAS_META_USER . $userId;
            $this->redis->del($metaKey);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_MEMBER_ROLES . "{$canvasId}:{$userId}");

            $weightKey = CacheConstants::PREFIX_CANVAS_WEIGHT . $userId . CacheConstants::INFIX_CANVAS_WEIGHT . $canvasId;
            $this->redis->del($weightKey);

            $perms = [
                'place_pixels', 'manage_settings', 'manage_members', 'manage_roles',
                'assign_roles', 'view_history', 'manage_resets', 'manage_sanctions',
                'manage_invites', 'create_snapshots',
            ];
            foreach ($perms as $p) {
                $this->redis->del(CacheConstants::PREFIX_CANVAS_PERMISSION . "{$canvasId}:{$userId}:" . md5($p));
            }

            $this->userCanvasList($userId);
            $this->canvasTeam($canvasId);
        } catch (\Throwable $e) {}
    }

    public function serverConfig(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::KEY_SERVER_CONFIG);
        } catch (\Throwable $e) {}
    }

    public function userPaymentHistory(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PAYMENT_HISTORY . $userId);
        } catch (\Throwable $e) {}
    }

    public function globalRoles(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_ROLES_ALL);
            $this->redis->del(CacheConstants::PREFIX_ALL_PERMISSIONS);
            $this->deleteByPattern('rbac:*');
        } catch (\Throwable $e) {}
    }

    public function globalRole(int $roleId, ?string $roleName = null): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_ROLE_BY_ID . $roleId);
            $this->redis->del(CacheConstants::PREFIX_ROLE_PERMS . $roleId);
            $this->redis->del(CacheConstants::PREFIX_ROLES_ALL);
            $this->redis->del(CacheConstants::PREFIX_ALL_PERMISSIONS);
            if ($roleName !== null) {
                $this->redis->del(CacheConstants::PREFIX_ROLE_BY_NAME . $roleName);
            }
            $this->deleteByPattern('rbac:*');
        } catch (\Throwable $e) {}
    }

    public function globalPermissions(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_ALL_PERMISSIONS);
            $this->redis->del(CacheConstants::PREFIX_ROLES_ALL);
            $this->deleteByPattern('rbac:*');
        } catch (\Throwable $e) {}
    }

    public function allUsers(): void {
        if (!$this->redis) return;
        try {
            $this->deleteByPattern('user:*');
            $this->deleteByPattern('rbac:*');
        } catch (\Throwable $e) {}
    }

    public function userStorage(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_STORAGE . $userId);
        } catch (\Throwable $e) {}
    }

    public function userPalettes(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PALETTE . $userId);
        } catch (\Throwable $e) {}
    }

    public function subscriptionTiers(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::KEY_SUBSCRIPTION_TIERS_ALL);
            $this->deleteByPattern('subscription:tiers:*');
            if (class_exists(SubscriptionPlanConstants::class)) {
                SubscriptionPlanConstants::resetCache();
            }
        } catch (\Throwable $e) {}
    }

    public function advertisements(): void {
        if (!$this->redis) return;
        try {
            $this->deleteByPattern('ads:*');
        } catch (\Throwable $e) {}
    }

    public function advertisementProvider(string $providerUuid): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_ADS_PROVIDER_DETAILS . $providerUuid);
            $this->deleteByPattern(CacheConstants::PREFIX_ADS_PROVIDER_ADS . $providerUuid . '*');
            $this->deleteByPattern(CacheConstants::PREFIX_ADS_PROVIDERS_LIST . '*');
            $this->deleteByPattern(CacheConstants::PREFIX_ADS_METRICS_REPORT . '*');
            $this->deleteByPattern(CacheConstants::PREFIX_ADS_ACTIVE_PUBLIC . '*');
        } catch (\Throwable $e) {}
    }

    public function advertisement(string $adUuid, ?string $providerUuid = null): void {
        if (!$this->redis) return;
        try {
            $this->deleteByPattern(CacheConstants::PREFIX_ADS_INDIVIDUAL_REPORT . $adUuid . '*');
            $this->deleteByPattern(CacheConstants::PREFIX_ADS_GLOBAL_REPORT . '*');
            $this->deleteByPattern(CacheConstants::PREFIX_ADS_ACTIVE_PUBLIC . '*');
            if ($providerUuid) {
                $this->redis->del(CacheConstants::PREFIX_ADS_PROVIDER_DETAILS . $providerUuid);
                $this->deleteByPattern(CacheConstants::PREFIX_ADS_PROVIDER_ADS . $providerUuid . '*');
            } else {
                $this->deleteByPattern(CacheConstants::PREFIX_ADS_PROVIDER_ADS . '*');
                $this->deleteByPattern(CacheConstants::PREFIX_ADS_PROVIDER_DETAILS . '*');
            }
            $this->deleteByPattern(CacheConstants::PREFIX_ADS_PROVIDERS_LIST . '*');
        } catch (\Throwable $e) {}
    }
}

