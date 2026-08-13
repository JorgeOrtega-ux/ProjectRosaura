<?php

namespace App\Core\System;

class CacheInvalidator {

    private $redis;

    public function __construct($redis) {
        $this->redis = $redis;
    }

    public function user(int $userId, ?string $uuid = null): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_TEMPLATE_TOKENS . $userId);

            if ($uuid) {
                $this->redis->del(CacheConstants::PREFIX_USER_PROFILE . $uuid);
            }

            $this->redis->del(CacheConstants::PREFIX_USER_ROLES . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_PERMS . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_HIGHEST_ROLE . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_STORAGE . $userId);
        } catch (\Throwable $e) {}
    }

    public function userPerks(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PERKS . CacheConstants::SUBKEY_PERKS_ALL . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_PERKS . CacheConstants::SUBKEY_PERKS_UNUSED . $userId);
        } catch (\Throwable $e) {}
    }

    public function userSubscription(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_SUBSCRIPTION . $userId);
        } catch (\Throwable $e) {}
    }

    public function canvas(int $canvasId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_DETAIL . $canvasId);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_RESET_SETTINGS . $canvasId);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_RESIZE_SETTINGS . $canvasId);
            $this->redis->del("canvas:{$canvasId}:config");
            $this->redis->del("canvas:{$canvasId}:state");

            $uuidKeys = $this->redis->keys(CacheConstants::PREFIX_CANVAS_DETAIL . 'uuid:*');
            if (!empty($uuidKeys)) {
                $this->redis->del($uuidKeys);
            }

            $viewKeys = $this->redis->keys("canvas:view_data:{$canvasId}:*");
            if (!empty($viewKeys)) {
                $this->redis->del($viewKeys);
            }
            $preloadKeys = $this->redis->keys("canvas:layout_preload:{$canvasId}:*");
            if (!empty($preloadKeys)) {
                $this->redis->del($preloadKeys);
            }

            $metaPattern = CacheConstants::PREFIX_CANVAS_META . $canvasId . CacheConstants::SUFFIX_CANVAS_META_USER . '*';
            $metaKeys = $this->redis->keys($metaPattern);
            if (!empty($metaKeys)) {
                $this->redis->del($metaKeys);
            }

            $pubKeys = $this->redis->keys(CacheConstants::PREFIX_CANVAS_PUBLIC_PAGE . '*');
            if (!empty($pubKeys)) {
                $this->redis->del($pubKeys);
            }

            $homeKeys = $this->redis->keys(CacheConstants::PREFIX_CANVAS_HOME_FEED . '*');
            if (!empty($homeKeys)) {
                $this->redis->del($homeKeys);
            }
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

            $dashKeys = $this->redis->keys(CacheConstants::PREFIX_CANVAS_DASHBOARD . "u{$userId}:*");
            if (!empty($dashKeys)) {
                $this->redis->del($dashKeys);
            }

            $keys = $this->redis->keys(CacheConstants::PREFIX_CANVAS_HOME_FEED . '*');
            if (!empty($keys)) {
                $this->redis->del($keys);
            }
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
        } catch (\Throwable $e) {}
    }

    public function serverConfig(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::KEY_SERVER_CONFIG);
        } catch (\Throwable $e) {}
    }

    public function userCoins(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_STORE_COINS . $userId);
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
        } catch (\Throwable $e) {}
    }

    public function globalPermissions(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_ALL_PERMISSIONS);
            $this->redis->del(CacheConstants::PREFIX_ROLES_ALL);
        } catch (\Throwable $e) {}
    }

    public function canvasRoles(?int $canvasId = null): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_ROLES_LIST . ($canvasId ?? 'global'));
            $this->redis->del(CacheConstants::PREFIX_CANVAS_ROLES_LIST . 'global');
        } catch (\Throwable $e) {}
    }

    public function canvasSnapshots(int $canvasId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_SNAPSHOTS . $canvasId);
        } catch (\Throwable $e) {}
    }

    public function canvasSanctions(int $canvasId, int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(sprintf(CacheConstants::PREFIX_CANVAS_BANNED, $canvasId, $userId));
            $this->redis->del(sprintf(CacheConstants::PREFIX_CHAT_RESTRICTED, $canvasId, $userId));
        } catch (\Throwable $e) {}
    }

    public function allUsers(): void {
        if (!$this->redis) return;
        try {
            $keys = $this->redis->keys('user:*');
            if (!empty($keys)) {
                $this->redis->del($keys);
            }
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

    public function storePackages(): void {
        if (!$this->redis) return;
        try {
            $keys = $this->redis->keys('store:coin_packages:*');
            if (!empty($keys)) {
                $this->redis->del($keys);
            }
        } catch (\Throwable $e) {}
    }

    public function storePerkPackages(): void {
        if (!$this->redis) return;
        try {
            $keys = $this->redis->keys('store:perk_packages:*');
            if (!empty($keys)) {
                $this->redis->del($keys);
            }
        } catch (\Throwable $e) {}
    }

    public function subscriptionTiers(): void {
        if (!$this->redis) return;
        try {
            $keys = $this->redis->keys('subscription:tiers:*');
            if (!empty($keys)) {
                $this->redis->del($keys);
            }
        } catch (\Throwable $e) {}
    }
}
