<?php

namespace App\Core\Repositories;

use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\RoleRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\SecurityConstants;
use App\Core\System\CacheConstants;
use App\Core\System\CacheInvalidator;
use App\Config\Database\RedisCache;
use PDO;
use PDOException;
use Exception;

class UserRepository implements UserRepositoryInterface {
    private $pdo;
    private $roleRepository;
    private $redisClient;
    private CacheInvalidator $cacheInvalidator;

    public function __construct(DatabaseManager $db, RoleRepositoryInterface $roleRepository, RedisCache $redisCache = null) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
        $this->roleRepository = $roleRepository;
        $this->redisClient = $redisCache ? $redisCache->getClient() : null;
        $this->cacheInvalidator = new CacheInvalidator($this->redisClient);
    }
    
    public function invalidateProfileCache(int $userId, ?string $uuid = null): void {
        $this->cacheInvalidator->user($userId, $uuid);
    }

    private function getUserWithDetails(string $column, $value): ?array {
        $cacheKey = null;
        if ($this->redisClient && ($column === 'id' || $column === 'uuid')) {
            $cacheKey = CacheConstants::PREFIX_USER_PROFILE . $value;
            $cached = $this->redisClient->get($cacheKey);
            if ($cached) {
                $decoded = json_decode($cached, true);
                if (is_array($decoded) && array_key_exists('google_id', $decoded)) {
                    return $decoded;
                }
            }
        }

        $tblUsers = DB::TBL_USERS;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;

        try {
            $stmtUser = $this->pdo->prepare("
                SELECT 
                    u.id, u.uuid, u.username, u.email, u.password, u.google_id, u.subscription_tier, u.profile_picture, u.purchase_preference,
                    u.two_factor_secret, u.two_factor_enabled, u.two_factor_recovery_codes, u.deletion_scheduled_at, u.created_at,
                    u.template_tokens_used, u.template_tokens_reset_at,
                    ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                    ur.deleted_by, ur.deleted_reason, ur.admin_notes,
                    st.color as subscription_color
                FROM {$tblUsers} u 
                LEFT JOIN {$tblUserRestr} ur ON u.id = ur.user_id 
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                WHERE u.{$column} = ?
                LIMIT 1
            ");
            $stmtUser->execute([$value]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user) return null;
            $roles = $this->roleRepository->getUserRoles($user['id']);

            if (!empty($roles)) {
                $mainRole = $roles[0];
                $user['role_name'] = $mainRole['name'];
                $user['role_weight'] = $mainRole['weight'];
                $user['assigned_roles_ids'] = implode(',', array_column($roles, 'id'));
            } else {
                $user['role_name'] = null;
                $user['role_weight'] = null;
                $user['assigned_roles_ids'] = null;
            }
            $permissionsArray = $this->roleRepository->getMergedPermissionsForUser($user['id']);
            $user['permissions'] = !empty($permissionsArray) ? implode(',', $permissionsArray) : null;

            $user['real_subscription_tier'] = (int)($user['subscription_tier'] ?? 0);
            // subscription_color ya viene del LEFT JOIN en la query principal

            if ($cacheKey && $this->redisClient) {
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($user));
            }

            return $user;

        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['column' => $column, 'value' => $value, 'exception' => $e]);
            return null;
        }
    }
    public function getUsersList(int $limit, int $offset): array {
        $tblUsers = DB::TBL_USERS;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;

        try {
            $stmtUsers = $this->pdo->prepare("
                SELECT u.id, u.uuid, u.username, u.email, u.subscription_tier, u.profile_picture, u.created_at,
                       ur.is_suspended, ur.suspension_type,
                       st.color as subscription_color
                FROM {$tblUsers} u
                LEFT JOIN {$tblUserRestr} ur ON u.id = ur.user_id
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                ORDER BY u.id DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmtUsers->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmtUsers->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmtUsers->execute();
            
            $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
            if (empty($users)) return [];

            $userIds = array_column($users, 'id');
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));

            $stmtRoles = $this->pdo->prepare("
                SELECT user_roles.user_id, r.id as role_id, r.name, r.weight
                FROM {$tblUserRoles} user_roles
                INNER JOIN {$tblRoles} r ON user_roles.role_id = r.id
                WHERE user_roles.user_id IN ($placeholders)
                ORDER BY user_roles.user_id, r.weight DESC
            ");
            $stmtRoles->execute($userIds);
            $rolesData = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);

            $rolesByUser = [];
            foreach ($rolesData as $row) {
                $uid = $row['user_id'];
                if (!isset($rolesByUser[$uid])) $rolesByUser[$uid] = [];
                $rolesByUser[$uid][] = $row;
            }

            foreach ($users as &$user) {
                $uid = $user['id'];
                if (isset($rolesByUser[$uid])) {
                    $mainRole = $rolesByUser[$uid][0];
                    $user['role_name'] = $mainRole['name'];
                    $user['role_weight'] = $mainRole['weight'];
                    $user['assigned_roles_ids'] = implode(',', array_column($rolesByUser[$uid], 'role_id'));
                } else {
                    $user['role_name'] = null;
                    $user['role_weight'] = null;
                    $user['assigned_roles_ids'] = null;
                }
            }

            return $users;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['exception' => $e]);
            return [];
        }
    }

    public function findById(int $id): ?array {
        return $this->getUserWithDetails('id', $id);
    }

    public function findByUuid(string $uuid): ?array {
        return $this->getUserWithDetails('uuid', $uuid);
    }

    public function findByEmail(string $email): ?array {
        return $this->getUserWithDetails('email', $email);
    }

    public function findByGoogleId(string $googleId): ?array {
        return $this->getUserWithDetails('google_id', $googleId);
    }

    public function updateGoogleId(int $id, ?string $googleId): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET google_id = ? WHERE id = ?");
            $res = $stmt->execute([$googleId, $id]);
            if ($res) $this->invalidateProfileCache($id);
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'google_id' => $googleId, 'exception' => $e]);
            return false;
        }
    }

    public function findByUsername(string $username): ?array {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("SELECT id FROM {$tblUsers} WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            return $user ?: null;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['username' => $username, 'exception' => $e]);
            return null;
        }
    }

    public function createUser(array $data): int {
        $tblUsers = DB::TBL_USERS;
        $tblUserRoles = DB::TBL_USER_ROLES;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;

        try {
            $this->pdo->beginTransaction();
            
            $stmtUser = $this->pdo->prepare("INSERT INTO {$tblUsers} (uuid, username, email, password, profile_picture, google_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmtUser->execute([
                $data['uuid'], 
                $data['username'], 
                $data['email'], 
                $data['password'], 
                $data['profile_picture'],
                $data['google_id'] ?? null
            ]);
            $userId = (int) $this->pdo->lastInsertId();

            $rolesToAssign = isset($data['roles']) && is_array($data['roles']) ? $data['roles'] : [SecurityConstants::DEFAULT_USER_ROLE_ID];
            if (!in_array(SecurityConstants::DEFAULT_USER_ROLE_ID, $rolesToAssign)) $rolesToAssign[] = SecurityConstants::DEFAULT_USER_ROLE_ID;

            $placeholders = implode(',', array_fill(0, count($rolesToAssign), '(?, ?)'));
            $values = [];
            foreach ($rolesToAssign as $roleId) {
                $values[] = $userId;
                $values[] = (int)$roleId;
            }
            $stmtRole = $this->pdo->prepare("INSERT INTO {$tblUserRoles} (user_id, role_id) VALUES {$placeholders}");
            $stmtRole->execute($values);

            $stmtRest = $this->pdo->prepare("INSERT INTO {$tblUserRestr} (user_id) VALUES (?)");
            $stmtRest->execute([$userId]);

            $this->pdo->commit();
            return $userId;
        } catch (Exception $e) { 
            $this->pdo->rollBack();
            Logger::error("Database error in " . __METHOD__, ['email' => $data['email'], 'username' => $data['username'], 'exception' => $e]);
            return 0;
        }
    }

    public function liftSuspension(int $id): bool {
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO {$tblUserRestr} (user_id, is_suspended, suspension_type, suspension_reason, suspension_end_date)
                VALUES (?, 0, NULL, NULL, NULL)
                ON DUPLICATE KEY UPDATE 
                    is_suspended = 0, suspension_type = NULL, suspension_reason = NULL, suspension_end_date = NULL
            ");
            $res = $stmt->execute([$id]);
            if ($res) $this->invalidateProfileCache($id);
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    public function updateAvatar(int $id, string $path): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET profile_picture = ? WHERE id = ?");
            $res = $stmt->execute([$path, $id]);
            if ($res) $this->invalidateProfileCache($id);
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'path' => $path, 'exception' => $e]);
            return false;
        }
    }

    public function updateUsername(int $id, string $username): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET username = ? WHERE id = ?");
            $res = $stmt->execute([$username, $id]);
            if ($res) $this->invalidateProfileCache($id);
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'username' => $username, 'exception' => $e]);
            return false;
        }
    }

    public function updateEmail(int $id, string $email): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET email = ? WHERE id = ?");
            $res = $stmt->execute([$email, $id]);
            if ($res) $this->invalidateProfileCache($id);
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'email' => $email, 'exception' => $e]);
            return false;
        }
    }

    public function updatePassword(int $id, string $hashedPassword): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET password = ? WHERE id = ?");
            $res = $stmt->execute([$hashedPassword, $id]);
            if ($res) $this->invalidateProfileCache($id);
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    public function update2FA(int $id, ?string $secret, int $enabled, ?string $recoveryCodes): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET two_factor_secret = ?, two_factor_enabled = ?, two_factor_recovery_codes = ? WHERE id = ?");
            $res = $stmt->execute([$secret, $enabled, $recoveryCodes, $id]);
            if ($res) {
                $this->invalidateProfileCache($id);
            }
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'enabled' => $enabled, 'exception' => $e]);
            return false;
        }
    }

    public function updateRecoveryCodes(int $id, string $recoveryCodes): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET two_factor_recovery_codes = ? WHERE id = ?");
            $res = $stmt->execute([$recoveryCodes, $id]);
            if ($res) {
                $this->invalidateProfileCache($id);
            }
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    public function updatePreference(int $userId, string $key, $value): bool {
        if (!in_array($key, DB::ALLOWED_PREF_KEYS)) return false;

        $tblUserPrefs = DB::TBL_USER_PREFERENCES;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUserPrefs} SET {$key} = ? WHERE user_id = ?");
            return $stmt->execute([$value, $userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'key' => $key, 'value' => $value, 'exception' => $e]);
            return false;
        }
    }

    public function updatePurchasePreference(int $userId, string $pref): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET purchase_preference = ? WHERE id = ?");
            $res = $stmt->execute([$pref, $userId]);
            if ($res) $this->invalidateProfileCache($userId);
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'pref' => $pref, 'exception' => $e]);
            return false;
        }
    }

    public function setFlag(int $userId, string $flagKey): bool {
        $tblFlags = DB::TBL_USER_FLAGS;
        try {
            $stmt = $this->pdo->prepare("INSERT IGNORE INTO {$tblFlags} (user_id, flag_key) VALUES (?, ?)");
            return $stmt->execute([$userId, $flagKey]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'flag_key' => $flagKey, 'exception' => $e]);
            return false;
        }
    }

    public function scheduleDeletion(int $userId, string $date): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET deletion_scheduled_at = ? WHERE id = ?");
            return $stmt->execute([$date, $userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'date' => $date, 'exception' => $e]);
            return false;
        }
    }

    public function cancelDeletion(int $userId): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET deletion_scheduled_at = NULL WHERE id = ?");
            return $stmt->execute([$userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function deleteUserHard(int $userId): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("DELETE FROM {$tblUsers} WHERE id = ?");
            $res = $stmt->execute([$userId]);
            if ($res) {
                $this->cacheInvalidator->user($userId);
            }
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function updateStorageUsed(int $userId, int $bytesDelta): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET storage_used_bytes = GREATEST(0, storage_used_bytes + ?) WHERE id = ?");
            $res = $stmt->execute([$bytesDelta, $userId]);
            if ($res && $this->redisClient) {
                try {
                    $this->redisClient->del(CacheConstants::PREFIX_USER_STORAGE . $userId);
                } catch (\Throwable $e) {}
            }
            return $res;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'delta' => $bytesDelta, 'exception' => $e]);
            return false;
        }
    }

    public function getStorageUsed(int $userId): float {
        // Check Redis cache first
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get(CacheConstants::PREFIX_USER_STORAGE . $userId);
                if ($cached !== null && $cached !== false) {
                    return (float)$cached;
                }
            } catch (\Throwable $e) {}
        }

        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("SELECT storage_used_bytes FROM {$tblUsers} WHERE id = ?");
            $stmt->execute([$userId]);
            $bytes = (float)$stmt->fetchColumn();

            if ($bytes <= 0) {
                $bytes = $this->calculateDynamicUserStorageBytes($userId);
            }

            $mb = $bytes / (1024 * 1024);

            if ($this->redisClient) {
                try {
                    $this->redisClient->setex(CacheConstants::PREFIX_USER_STORAGE . $userId, CacheConstants::TTL_FIVE_MINS, (string)$mb);
                } catch (\Throwable $e) {}
            }

            return $mb;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return 0.0;
        }
    }

    private function calculateDynamicUserStorageBytes(int $userId): float {
        $totalBytes = 0.0;
        try {
            // 1. Canvases owned by user: calculate pixel buffer sizes (width * height * 4)
            $stmt = $this->pdo->prepare("SELECT size FROM db_canvases.canvases WHERE owner_id = ?");
            $stmt->execute([$userId]);
            $sizes = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

            foreach ($sizes as $sizeStr) {
                $parts = explode('x', strtolower((string)$sizeStr));
                $w = (int)($parts[0] ?? 64);
                $h = isset($parts[1]) ? (int)$parts[1] : $w;
                if ($w <= 0) $w = 64;
                if ($h <= 0) $h = 64;
                // 4 bytes per pixel (RGBA)
                $totalBytes += ($w * $h * 4);
            }

            // 2. Snapshot history entries for user's canvases (~50KB per snapshot)
            $stmt = $this->pdo->prepare("
                SELECT COUNT(h.id) 
                FROM db_canvases.canvas_snapshots_history h
                JOIN db_canvases.canvases c ON h.canvas_id = c.id
                WHERE c.owner_id = ?
            ");
            $stmt->execute([$userId]);
            $snapshotCount = (int)$stmt->fetchColumn();
            $totalBytes += ($snapshotCount * 50 * 1024);

            // 3. User uploaded templates
            $stmt = $this->pdo->prepare("SELECT COALESCE(SUM(file_size), 0) FROM db_canvases.user_templates WHERE user_id = ?");
            $stmt->execute([$userId]);
            $templateBytes = (float)$stmt->fetchColumn();
            $totalBytes += $templateBytes;

            // 4. Custom profile picture check (~150KB)
            $stmt = $this->pdo->prepare("SELECT profile_picture FROM " . DB::TBL_USERS . " WHERE id = ?");
            $stmt->execute([$userId]);
            $pic = (string)$stmt->fetchColumn();
            if ($pic && strpos($pic, 'uploaded') !== false) {
                $totalBytes += (150 * 1024);
            }
        } catch (\Throwable $e) {
            Logger::error("Error calculating dynamic user storage", ['user_id' => $userId, 'error' => $e->getMessage()]);
        }
        return $totalBytes;
    }

    public function getRegistrationStats(string $startDate, string $endDate): array {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("
                SELECT DATE(created_at) as date, COUNT(id) as count 
                FROM {$tblUsers} 
                WHERE created_at >= ? AND created_at <= ?
                GROUP BY DATE(created_at) 
                ORDER BY date ASC
            ");
            $stmt->execute([$startDate, $endDate]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['exception' => $e]);
            return [];
        }
    }

    public function getCustomPalettes(int $userId): array {
        $cacheKey = CacheConstants::PREFIX_USER_PALETTE . $userId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    return json_decode($cached, true) ?? [];
                }
            } catch (\Throwable $e) {}
        }

        try {
            $stmt = $this->pdo->prepare("SELECT palette_key, name, colors FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            $customPalettes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($customPalettes as &$p) {
                $p['colors'] = json_decode($p['colors'], true) ?? [];
            }

            if ($this->redisClient) {
                try {
                    $this->redisClient->setex($cacheKey, CacheConstants::TTL_TEN_MINS, json_encode($customPalettes));
                } catch (\Throwable $e) {}
            }

            return $customPalettes;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return [];
        }
    }

    public function getTemplateTokenUsage(int $userId): array {
        $cacheKey = CacheConstants::PREFIX_USER_TEMPLATE_TOKENS . $userId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== false && $cached !== null) {
                    $data = json_decode($cached, true);
                    if (is_array($data)) {
                        $used = (int)($data['used'] ?? 0);
                        $resetAtStr = $data['reset_at'] ?? null;
                        $resetInSeconds = 0;
                        if ($resetAtStr) {
                            $resetTime = strtotime($resetAtStr);
                            $now = time();
                            if ($resetTime <= $now) {
                                $tblUsers = DB::TBL_USERS;
                                $stmtReset = $this->pdo->prepare("UPDATE {$tblUsers} SET template_tokens_used = 0, template_tokens_reset_at = NULL WHERE id = ?");
                                $stmtReset->execute([$userId]);
                                $this->invalidateProfileCache($userId);
                                return ['used' => 0, 'reset_at' => null, 'reset_in_seconds' => 0];
                            } else {
                                $resetInSeconds = $resetTime - $now;
                            }
                        }
                        return [
                            'used' => $used,
                            'reset_at' => $resetAtStr,
                            'reset_in_seconds' => $resetInSeconds
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("Redis error in " . __METHOD__, ['exception' => $e]);
            }
        }

        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("SELECT template_tokens_used, template_tokens_reset_at FROM {$tblUsers} WHERE id = ?");
            $stmt->execute([$userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                return ['used' => 0, 'reset_at' => null, 'reset_in_seconds' => 0];
            }

            $used = (int)($row['template_tokens_used'] ?? 0);
            $resetAtStr = $row['template_tokens_reset_at'] ?? null;
            $resetInSeconds = 0;

            if ($resetAtStr) {
                $resetTime = strtotime($resetAtStr);
                $now = time();
                if ($resetTime <= $now) {
                    $stmtReset = $this->pdo->prepare("UPDATE {$tblUsers} SET template_tokens_used = 0, template_tokens_reset_at = NULL WHERE id = ?");
                    $stmtReset->execute([$userId]);
                    $used = 0;
                    $resetAtStr = null;
                } else {
                    $resetInSeconds = $resetTime - $now;
                }
            }

            $result = [
                'used' => $used,
                'reset_at' => $resetAtStr,
                'reset_in_seconds' => $resetInSeconds
            ];

            if ($this->redisClient) {
                try {
                    $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode([
                        'used' => $used,
                        'reset_at' => $resetAtStr
                    ]));
                } catch (\Throwable $e) {}
            }

            return $result;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return ['used' => 0, 'reset_at' => null, 'reset_in_seconds' => 0];
        }
    }

    public function consumeTemplateTokens(int $userId, int $tokensToConsume, int $windowHours = 5): array {
        $tblUsers = DB::TBL_USERS;
        try {
            $usage = $this->getTemplateTokenUsage($userId);
            $currentUsed = $usage['used'];
            $resetAt = $usage['reset_at'];

            if (!$resetAt) {
                $resetAt = date('Y-m-d H:i:s', strtotime("+{$windowHours} hours"));
                $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET template_tokens_used = template_tokens_used + ?, template_tokens_reset_at = ? WHERE id = ?");
                $stmt->execute([$tokensToConsume, $resetAt, $userId]);
            } else {
                $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET template_tokens_used = template_tokens_used + ? WHERE id = ?");
                $stmt->execute([$tokensToConsume, $userId]);
            }

            $newUsed = $currentUsed + $tokensToConsume;
            
            // Invalidate/update cache
            $this->invalidateProfileCache($userId);
            if ($this->redisClient) {
                try {
                    $cacheKey = CacheConstants::PREFIX_USER_TEMPLATE_TOKENS . $userId;
                    $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode([
                        'used' => $newUsed,
                        'reset_at' => $resetAt
                    ]));
                } catch (\Throwable $e) {}
            }

            return [
                'success' => true,
                'new_used' => $newUsed,
                'reset_at' => $resetAt
            ];
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return ['success' => false, 'message' => 'Error al actualizar tokens'];
        }
    }

    public function getUsernamesByIds(array $ids): array {
        if (empty($ids)) {
            return [];
        }

        $tblUsers = DB::TBL_USERS;
        try {
            $ids = array_map('intval', $ids);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            
            $stmt = $this->pdo->prepare("SELECT id, username FROM {$tblUsers} WHERE id IN ({$placeholders})");
            $stmt->execute($ids);
            
            return $stmt->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['ids' => $ids, 'exception' => $e]);
            return [];
        }
    }
}
?>