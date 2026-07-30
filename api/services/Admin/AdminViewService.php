<?php

namespace App\Api\Services\Admin;

use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Config\Database\CassandraManager;
use App\Core\Repositories\UserRepository;
use App\Core\Repositories\RoleRepository;
use App\Core\System\UserPrefsManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\PermissionsConstants;
use App\Core\System\SubscriptionPlanConstants;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;

class AdminViewService {

    /**

     */
    public static function parseSubscriptionColor(?string $raw): ?string {
        if (empty($raw)) return null;

        $trimmed = trim($raw);
        if (str_starts_with($trimmed, '{') && str_ends_with($trimmed, '}')) {
            $data = json_decode($trimmed, true);
            if (is_array($data) && isset($data['type'])) {
                if ($data['type'] === 'solid') {
                    return $data['color'] ?? null;
                }
                if ($data['type'] === 'gradient' && !empty($data['colors'])) {
                    $angle = $data['angle'] ?? 90;
                    $stops = [];
                    foreach ($data['colors'] as $c) {
                        $hex = $c['hex'] ?? '#000000';
                        $pct = $c['percentage'] ?? 0;
                        $stops[] = "{$hex} {$pct}%";
                    }
                    return "linear-gradient({$angle}deg, " . implode(', ', $stops) . ")";
                }
            }
        }
        return $trimmed;
    }

    /**

     */
    public function getDashboardData(): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPermissions = $_SESSION['user_permissions'] ?? [];
        $canManageRoles = in_array(PermissionsConstants::VIEW_ROLES, $userPermissions);
        $canViewLogs = in_array('view_logs', $userPermissions);
        $canManageMessages = true;

        $appUrl = defined('APP_URL') ? APP_URL : '';

        return [
            'canManageRoles' => $canManageRoles,
            'canViewLogs' => $canViewLogs,
            'canManageMessages' => $canManageMessages,
            'appUrl' => $appUrl
        ];
    }

    /**

     */
    public function getServerConfigData(): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $tblServerConfig = DB::TBL_SERVER_CONFIG;
        $config = [];

        try {
            $stmt = $pdo->query("SELECT * FROM {$tblServerConfig} LIMIT 1");
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                $config = $row;
            }
        } catch (\Throwable $e) {
            Logger::error("getServerConfigData error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'config' => $config,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Datos para la gestión de usuarios (users/manage-users.php).
     */
    public function getManageUsersData(?string $searchQuery, array $rolesFilter, array $statusFilter, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $isSuperAdmin = isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4;
        $canEditUsers = in_array('edit_users', $userPerms);
        $canAssignRoles = in_array(PermissionsConstants::ASSIGN_ROLES, $userPerms);
        $canDeleteUsers = in_array('delete_users', $userPerms) || $isSuperAdmin;
        $canModerateUsers = count(array_intersect(['moderate_users', 'delete_users'], $userPerms)) > 0;
        $canViewKardex = in_array('view_kardex', $userPerms);

        $limit = 25;
        if ($page < 1) $page = 1;

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $tblUsers = DB::TBL_USERS;
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;

        $allRoles = [];
        try {
            $stmtRoles = $pdo->query("SELECT id, name FROM {$tblRoles} ORDER BY id ASC");
            $allRoles = $stmtRoles->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getManageUsersData allRoles error: " . $e->getMessage(), ['exception' => $e]);
        }

        $searchQuery = trim($searchQuery ?? '');
        $whereConditions = ["1=1"];
        $params = [];

        if ($searchQuery !== '') {
            $whereConditions[] = "(u.email LIKE :q1 OR u.username LIKE :q2 OR u.uuid LIKE :q3)";
            $qVal = '%' . $searchQuery . '%';
            $params[':q1'] = $qVal;
            $params[':q2'] = $qVal;
            $params[':q3'] = $qVal;
        }

        if (!empty($statusFilter)) {
            $statusConditions = [];
            if (in_array('active', $statusFilter)) {
                $statusConditions[] = "u.id NOT IN (SELECT user_id FROM {$tblUserRestr} WHERE is_suspended = 1 AND (suspension_end_date IS NULL OR suspension_end_date > NOW()))";
            }
            if (in_array('suspended', $statusFilter)) {
                $statusConditions[] = "u.id IN (SELECT user_id FROM {$tblUserRestr} WHERE is_suspended = 1 AND (suspension_end_date IS NULL OR suspension_end_date > NOW()))";
            }
            if (!empty($statusConditions)) {
                $whereConditions[] = "(" . implode(" OR ", $statusConditions) . ")";
            }
        }

        if (!empty($rolesFilter)) {
            $inRoles = implode(',', array_map('intval', $rolesFilter));
            $whereConditions[] = "u.id IN (SELECT user_id FROM {$tblUserRoles} WHERE role_id IN ({$inRoles}))";
        }

        $whereClause = "WHERE " . implode(" AND ", $whereConditions);

        $totalUsers = 0;
        try {
            $countSql = "SELECT COUNT(u.id) FROM {$tblUsers} u {$whereClause}";
            $stmtCount = $pdo->prepare($countSql);
            foreach ($params as $k => $v) {
                $stmtCount->bindValue($k, $v);
            }
            $stmtCount->execute();
            $totalUsers = (int)$stmtCount->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("getManageUsersData count error: " . $e->getMessage(), ['exception' => $e]);
        }

        $totalPages = ceil($totalUsers / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        $users = [];
        try {
            $sql = "
                SELECT 
                    u.id, u.uuid, u.username, u.email, u.profile_picture, u.created_at, u.subscription_tier,
                    st.color as subscription_color,
                    (SELECT is_suspended FROM {$tblUserRestr} ur WHERE ur.user_id = u.id AND ur.is_suspended = 1 AND (ur.suspension_end_date IS NULL OR ur.suspension_end_date > NOW()) LIMIT 1) as is_suspended,
                    (SELECT suspension_type FROM {$tblUserRestr} ur WHERE ur.user_id = u.id AND ur.is_suspended = 1 AND (ur.suspension_end_date IS NULL OR ur.suspension_end_date > NOW()) LIMIT 1) as suspension_type,
                    (SELECT suspension_end_date FROM {$tblUserRestr} ur WHERE ur.user_id = u.id AND ur.is_suspended = 1 AND (ur.suspension_end_date IS NULL OR ur.suspension_end_date > NOW()) LIMIT 1) as restriction_expires_at
                FROM {$tblUsers} u
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                {$whereClause}
                ORDER BY u.id DESC
                LIMIT :limit OFFSET :offset
            ";
            $stmt = $pdo->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':limit', (int)$limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, \PDO::PARAM_INT);
            $stmt->execute();
            $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            if (!empty($users)) {
                $userIds = array_column($users, 'id');
                $placeholders = implode(',', array_fill(0, count($userIds), '?'));
                
                $stmtRoles = $pdo->prepare("
                    SELECT ur.user_id, r.id, r.name
                    FROM {$tblUserRoles} ur
                    INNER JOIN {$tblRoles} r ON ur.role_id = r.id
                    WHERE ur.user_id IN ({$placeholders})
                    ORDER BY r.weight DESC
                ");
                $stmtRoles->execute($userIds);
                $userRoles = $stmtRoles->fetchAll(\PDO::FETCH_ASSOC);
                
                $rolesByUser = [];
                foreach ($userRoles as $ur) {
                    $uid = $ur['user_id'];
                    if (!isset($rolesByUser[$uid])) {
                        $rolesByUser[$uid] = ['ids' => [], 'names' => []];
                    }
                    $rolesByUser[$uid]['ids'][] = $ur['id'];
                    $rolesByUser[$uid]['names'][] = $ur['name'];
                }
                
                foreach ($users as &$uRow) {
                    $uid = $uRow['id'];
                    if (isset($rolesByUser[$uid])) {
                        $uRow['role_ids'] = implode(',', $rolesByUser[$uid]['ids']);
                        $uRow['role_names'] = implode(',', $rolesByUser[$uid]['names']);
                    } else {
                        $uRow['role_ids'] = null;
                        $uRow['role_names'] = null;
                    }
                    $uRow['role_bg'] = self::parseSubscriptionColor($uRow['subscription_color'] ?? null);
                }
                unset($uRow);
            }
        } catch (\Throwable $e) {
            Logger::error("getManageUsersData select error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'users' => $users,
            'allRoles' => $allRoles,
            'totalUsers' => $totalUsers,
            'totalPages' => $totalPages,
            'page' => $page,
            'limit' => $limit,
            'searchQuery' => $searchQuery,
            'rolesFilter' => $rolesFilter,
            'statusFilter' => $statusFilter,
            'canEditUsers' => $canEditUsers,
            'canAssignRoles' => $canAssignRoles,
            'canDeleteUsers' => $canDeleteUsers,
            'canModerateUsers' => $canModerateUsers,
            'canViewKardex' => $canViewKardex,
            'isSuperAdmin' => $isSuperAdmin,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getEditUserData(?string $targetUserUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();
        global $serverConfig;

        $maxAvatarSize = $serverConfig['max_avatar_size_mb'] ?? 2;
        $isSuperAdmin = isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4;

        if (empty($targetUserUuid)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $db = new DatabaseManager();
        $redis = new RedisCache();
        $roleRepo = new RoleRepository($db, $redis);
        $userRepo = new UserRepository($db, $roleRepo);
        $prefsManager = new UserPrefsManager($db);

        $user = $userRepo->findByUuid($targetUserUuid);
        if (!$user) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $targetUserId = (int)$user['id'];
        $prefs = $prefsManager->ensureDefaultPreferences($targetUserId);

        $roleColorRaw = $user['subscription_color'] ?? ($user['role_color'] ?? '');
        $roleBgCss = self::parseSubscriptionColor($roleColorRaw);

        return [
            'redirect' => null,
            'user' => $user,
            'targetUserId' => $targetUserId,
            'targetUserUuid' => $targetUserUuid,
            'prefs' => $prefs,
            'maxAvatarSize' => $maxAvatarSize,
            'isSuperAdmin' => $isSuperAdmin,
            'roleBgCss' => $roleBgCss,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getEditStatusData(?string $targetUserUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (empty($targetUserUuid)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $db = new DatabaseManager();
        $redis = new RedisCache();
        $roleRepo = new RoleRepository($db, $redis);
        $userRepo = new UserRepository($db, $roleRepo);
        $targetUser = $userRepo->findByUuid($targetUserUuid);

        if (!$targetUser) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $pdo = $db->getConnection(DB::CONN_IDENTITY);
        $targetUserId = (int)$targetUser['id'];

        $stmt = $pdo->prepare("SELECT * FROM " . DB::TBL_USER_RESTRICTIONS . " WHERE user_id = ? AND is_suspended = 1 AND (suspension_end_date IS NULL OR suspension_end_date > NOW()) LIMIT 1");
        $stmt->execute([$targetUserId]);
        $restriction = $stmt->fetch(\PDO::FETCH_ASSOC);

        $initialState = [
            'isSuspended' => $restriction ? '1' : '0',
            'suspensionReason' => '',
            'customSuspensionReason' => '',
            'suspendedType' => $restriction ? $restriction['suspension_type'] : 'temporary',
            'suspensionDuration' => '7',
            'endDate' => ''
        ];

        return [
            'redirect' => null,
            'targetUser' => $targetUser,
            'targetUserId' => $targetUserId,
            'targetUserUuid' => $targetUserUuid,
            'restriction' => $restriction,
            'initialState' => $initialState,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getEditUserRoleData(?string $targetUserUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (empty($targetUserUuid)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $redis = new RedisCache();
        $roleRepo = new RoleRepository($db, $redis);
        $userRepo = new UserRepository($db, $roleRepo);
        $targetUser = $userRepo->findByUuid($targetUserUuid);

        if (!$targetUser) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $targetUserId = (int)$targetUser['id'];

        $allRoles = [];
        try {
            $stmtRoles = $pdo->query("SELECT id, name, weight FROM " . DB::TBL_ROLES . " ORDER BY weight DESC");
            $allRoles = $stmtRoles->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getEditUserRoleData allRoles error: " . $e->getMessage(), ['exception' => $e]);
        }

        $currentUserRoleId = null;
        try {
            $stmtUserRole = $pdo->prepare("SELECT role_id FROM " . DB::TBL_USER_ROLES . " WHERE user_id = :uid LIMIT 1");
            $stmtUserRole->execute(['uid' => $targetUserId]);
            $currentUserRoleId = $stmtUserRole->fetchColumn();
            if ($currentUserRoleId !== false) {
                $currentUserRoleId = (int)$currentUserRoleId;
            }
        } catch (\Throwable $e) {
            Logger::error("getEditUserRoleData currentUserRoleId error: " . $e->getMessage(), ['exception' => $e]);
        }

        $currentUserWeight = isset($_SESSION['user_role_weight']) ? (int)$_SESSION['user_role_weight'] : 0;

        return [
            'redirect' => null,
            'targetUser' => $targetUser,
            'targetUserId' => $targetUserId,
            'targetUserUuid' => $targetUserUuid,
            'allRoles' => $allRoles,
            'currentUserRoleId' => $currentUserRoleId,
            'currentUserWeight' => $currentUserWeight,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getUserHistoryData(?string $targetUserUuid, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (empty($targetUserUuid)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $db = new DatabaseManager();
        $redis = new RedisCache();
        $roleRepo = new RoleRepository($db, $redis);
        $userRepo = new UserRepository($db, $roleRepo);
        $targetUser = $userRepo->findByUuid($targetUserUuid);

        if (!$targetUser) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $targetUserId = (int)$targetUser['id'];
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $limit = 20;
        if ($page < 1) $page = 1;

        $totalHistory = 0;
        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(id) FROM user_security_history WHERE user_id = :uid");
            $stmtCount->execute(['uid' => $targetUserId]);
            $totalHistory = (int)$stmtCount->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("getUserHistoryData totalHistory error: " . $e->getMessage(), ['exception' => $e]);
        }

        $totalPages = ceil($totalHistory / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        $historyItems = [];
        try {
            $stmt = $pdo->prepare("SELECT * FROM user_security_history WHERE user_id = :uid ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
            $stmt->bindValue(':uid', $targetUserId, \PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();
            $historyItems = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getUserHistoryData historyItems error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'redirect' => null,
            'targetUser' => $targetUser,
            'targetUserId' => $targetUserId,
            'targetUserUuid' => $targetUserUuid,
            'historyItems' => $historyItems,
            'totalHistory' => $totalHistory,
            'totalPages' => $totalPages,
            'page' => $page,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getManageSubscriptionsData(?string $searchQuery, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $canManageTiers = in_array(PermissionsConstants::MANAGE_ROLES_STRUCTURE, $userPerms) || in_array(PermissionsConstants::ACCESS_ADMIN_PANEL, $userPerms);

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $tblTiers = 'subscription_tiers';
        $searchQuery = trim($searchQuery ?? '');
        $limit = 25;
        if ($page < 1) $page = 1;

        $searchCondition = "";
        $searchParams = [];
        if ($searchQuery !== '') {
            $searchCondition = "WHERE name LIKE :search";
            $searchParams[':search'] = '%' . $searchQuery . '%';
        }

        $totalTiers = 0;
        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(id) FROM {$tblTiers} {$searchCondition}");
            foreach ($searchParams as $key => $val) {
                $stmtCount->bindValue($key, $val);
            }
            $stmtCount->execute();
            $totalTiers = (int)$stmtCount->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("getManageSubscriptionsData totalTiers error: " . $e->getMessage(), ['exception' => $e]);
        }

        $totalPages = ceil($totalTiers / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        $tiers = [];
        try {
            $stmt = $pdo->prepare("SELECT id, uuid, is_active, is_popular, name, color, tier_level, created_at FROM {$tblTiers} {$searchCondition} ORDER BY tier_level ASC LIMIT :limit OFFSET :offset");
            foreach ($searchParams as $key => $val) {
                $stmt->bindValue($key, $val);
            }
            $stmt->bindValue(':limit', (int)$limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, \PDO::PARAM_INT);
            $stmt->execute();
            $tiers = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getManageSubscriptionsData tiers error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'canManageTiers' => $canManageTiers,
            'tiers' => $tiers,
            'totalTiers' => $totalTiers,
            'totalPages' => $totalPages,
            'page' => $page,
            'searchQuery' => $searchQuery,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getSubscriptionBuilderData(?string $targetUuid = null): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $canManageTiers = in_array(PermissionsConstants::MANAGE_ROLES_STRUCTURE, $userPerms) || in_array(PermissionsConstants::ACCESS_ADMIN_PANEL, $userPerms);

        if (!$canManageTiers) {
            return ['error' => __('err_unauthorized')];
        }

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $isEdit = false;
        $tier = null;

        if (!empty($targetUuid)) {
            try {
                $stmt = $pdo->prepare("SELECT * FROM subscription_tiers WHERE uuid = :uuid LIMIT 1");
                $stmt->execute(['uuid' => $targetUuid]);
                $tier = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($tier) {
                    $isEdit = true;
                }
            } catch (\Throwable $e) {
                Logger::error("getSubscriptionBuilderData error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        $allFeatures = SubscriptionPlanConstants::ALL_FEATURES;

        return [
            'error' => null,
            'isEdit' => $isEdit,
            'tier' => $tier,
            'targetUuid' => $targetUuid,
            'allFeatures' => $allFeatures,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getManageRolesData(?string $searchQuery, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $canManageRoles = in_array(PermissionsConstants::MANAGE_ROLES_STRUCTURE, $userPerms);

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_IDENTITY);
        $tblRoles = DB::TBL_ROLES;

        $searchQuery = trim($searchQuery ?? '');
        $limit = 25;
        if ($page < 1) $page = 1;

        $searchCondition = "";
        $searchParams = [];
        if ($searchQuery !== '') {
            $searchCondition = "WHERE name LIKE :search";
            $searchParams[':search'] = '%' . $searchQuery . '%';
        }

        $totalRoles = 0;
        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(id) FROM {$tblRoles} {$searchCondition}");
            foreach ($searchParams as $key => $val) {
                $stmtCount->bindValue($key, $val);
            }
            $stmtCount->execute();
            $totalRoles = (int)$stmtCount->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("getManageRolesData totalRoles error: " . $e->getMessage(), ['exception' => $e]);
        }

        $totalPages = ceil($totalRoles / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        $roles = [];
        try {
            $stmt = $pdo->prepare("SELECT id, name, weight, is_system, created_at FROM {$tblRoles} {$searchCondition} ORDER BY id ASC LIMIT :limit OFFSET :offset");
            foreach ($searchParams as $key => $val) {
                $stmt->bindValue($key, $val);
            }
            $stmt->bindValue(':limit', (int)$limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, \PDO::PARAM_INT);
            $stmt->execute();
            $roles = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getManageRolesData roles error: " . $e->getMessage(), ['exception' => $e]);
        }

        $currentUserWeight = isset($_SESSION['user_role_weight']) ? (int)$_SESSION['user_role_weight'] : 0;

        return [
            'canManageRoles' => $canManageRoles,
            'roles' => $roles,
            'totalRoles' => $totalRoles,
            'totalPages' => $totalPages,
            'page' => $page,
            'searchQuery' => $searchQuery,
            'currentUserWeight' => $currentUserWeight,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getRolePermissionsData(?string $roleUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (empty($roleUuid)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/roles"];
        }

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $role = null;
        $rolePermissions = [];

        try {
            $stmt = $pdo->prepare("SELECT * FROM roles WHERE uuid = :uuid LIMIT 1");
            $stmt->execute(['uuid' => $roleUuid]);
            $role = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($role) {
                $roleId = $role['id'];
                $stmtPerms = $pdo->prepare("SELECT permission_id FROM role_permissions WHERE role_id = :rid");
                $stmtPerms->execute(['rid' => $roleId]);
                $rolePermissions = $stmtPerms->fetchAll(\PDO::FETCH_COLUMN);
            }
        } catch (\Throwable $e) {
            Logger::error("getRolePermissionsData role fetch error: " . $e->getMessage(), ['exception' => $e]);
        }

        if (!$role) {
            return ['error' => __('err_role_not_found')];
        }

        $allPermissions = [];
        try {
            $stmtAll = $pdo->query("SELECT * FROM permissions ORDER BY category, id ASC");
            $allPermissions = $stmtAll->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getRolePermissionsData allPermissions error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'redirect' => null,
            'error' => null,
            'roleId' => $roleId,
            'role' => $role,
            'rolePermissions' => $rolePermissions,
            'allPermissions' => $allPermissions,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getManageMessagesData(?string $searchQuery, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_CANVASES);

        $searchQuery = trim($searchQuery ?? '');
        $limit = 25;
        if ($page < 1) $page = 1;

        $cassandra = new CassandraManager();
        $session = $cassandra->getSession();
        $allMessages = [];
        $totalMessages = 0;

        try {
            $totalMessages = (int)$pdo->query("SELECT COALESCE(SUM(total_messages), 0) FROM canvases")->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("getManageMessagesData totalMessages error: " . $e->getMessage(), ['exception' => $e]);
        }

        $totalPages = ceil($totalMessages / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        if ($session) {
            try {
                $rows = $session->query("SELECT uuid, canvas_id, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason, created_at FROM canvas_chat_messages LIMIT 1000")->asRowsResult();
                foreach ($rows as $row) {
                    $createdAt = '';
                    if (isset($row['created_at'])) {
                        $dt = null;
                        if ($row['created_at'] instanceof \DateTime) {
                            $dt = $row['created_at'];
                        } else if (is_string($row['created_at'])) {
                            try {
                                $dt = new \DateTime($row['created_at']);
                            } catch (\Exception $ex) {}
                        } else if (is_numeric($row['created_at'])) {
                            $dt = new \DateTime('@' . intval($row['created_at'] / 1000));
                        }
                        
                        if ($dt) {
                            $dt->setTimezone(new \DateTimeZone(date_default_timezone_get()));
                            $createdAt = $dt->format('Y-m-d H:i:s');
                        } else if (is_string($row['created_at'])) {
                            $createdAt = $row['created_at'];
                        }
                    }
                    
                    $allMessages[] = [
                        'id' => $row['uuid'] ?? '',
                        'uuid' => $row['uuid'] ?? '',
                        'canvas_id' => (int)($row['canvas_id'] ?? 0),
                        'user_id' => (int)($row['user_id'] ?? 0),
                        'message' => $row['message'] ?? '',
                        'attachments' => $row['attachments'] ?? null,
                        'file_size' => (int)($row['file_size'] ?? 0),
                        'visibility' => $row['visibility'] ?? 'visible',
                        'deleted_by' => $row['deleted_by'] ?? null,
                        'delete_reason' => $row['delete_reason'] ?? null,
                        'created_at' => $createdAt
                    ];
                }
                
                // Sort by created_at DESC
                usort($allMessages, function($a, $b) {
                    return strcmp($b['created_at'], $a['created_at']);
                });
            } catch (\Throwable $e) {
                Logger::error("getManageMessagesData select messages error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        $messages = array_slice($allMessages, $offset, $limit);

        return [
            'messages' => $messages,
            'totalMessages' => $totalMessages,
            'totalPages' => $totalPages,
            'page' => $page,
            'searchQuery' => $searchQuery,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Datos para los reportes de contenido (messages/reports.php).
     */
    public function getReportsData(?string $searchQuery, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_CANVASES);

        $limit = 25;
        if ($page < 1) $page = 1;

        $reports = [];
        $totalReports = 0;

        try {
            $stmtCount = $pdo->query("SELECT COUNT(id) FROM canvas_chat_reports");
            $totalReports = (int)$stmtCount->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("getReportsData totalReports error: " . $e->getMessage(), ['exception' => $e]);
        }

        $totalPages = ceil($totalReports / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        try {
            $stmt = $pdo->prepare("SELECT * FROM canvas_chat_reports ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
            $stmt->bindValue(':limit', (int)$limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, \PDO::PARAM_INT);
            $stmt->execute();
            $reports = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getReportsData select reports error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'reports' => $reports,
            'totalReports' => $totalReports,
            'totalPages' => $totalPages,
            'page' => $page,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getLogsData(?string $category = 'all', int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $limit = 50;
        if ($page < 1) $page = 1;

        $logs = [];
        $totalLogs = 0;

        try {
            $stmtCount = $pdo->query("SELECT COUNT(id) FROM user_security_history");
            $totalLogs = (int)$stmtCount->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("getLogsData totalLogs error: " . $e->getMessage(), ['exception' => $e]);
        }

        $totalPages = ceil($totalLogs / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        try {
            $stmt = $pdo->prepare("SELECT * FROM user_security_history ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
            $stmt->bindValue(':limit', (int)$limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, \PDO::PARAM_INT);
            $stmt->execute();
            $logs = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getLogsData select logs error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'logs' => $logs,
            'totalLogs' => $totalLogs,
            'totalPages' => $totalPages,
            'page' => $page,
            'category' => $category,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getLogsViewerData(?string $fileName): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $content = '';
        if ($fileName) {
            $safeName = basename($fileName);
            $logPath = defined('APP_ROOT') ? APP_ROOT . '/storage/logs/' . $safeName : '';
            if ($logPath && file_exists($logPath)) {
                $content = file_get_contents($logPath);
            }
        }

        return [
            'fileName' => $fileName,
            'content' => $content,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getBackupsData(?string $searchQuery, int $page = 1, array $typesFilter = [], array $statusFilter = []): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $backups = [];
        $baseDir = defined('ROOT_PATH') ? ROOT_PATH : (defined('APP_ROOT') ? APP_ROOT : dirname(__DIR__, 3));
        $backupDir = rtrim($baseDir, '/\\') . '/storage/private/backups/';

        if (is_dir($backupDir)) {
            $files = array_diff(scandir($backupDir), ['.', '..', '.htaccess', '.gitkeep']);
            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'enc' || pathinfo($file, PATHINFO_EXTENSION) === 'sql' || pathinfo($file, PATHINFO_EXTENSION) === 'zip') {
                    $filepath = $backupDir . $file;
                    if (!file_exists($filepath)) continue;

                    $sizeBytes = filesize($filepath);
                    $sizeFormatted = $sizeBytes >= 1048576 
                                    ? round($sizeBytes / 1048576, 2) . ' MB' 
                                    : round($sizeBytes / 1024, 2) . ' KB';
                                    
                    $backups[] = [
                        'id' => base64_encode($file),
                        'filename' => $file,
                        'type' => strpos($file, 'auto_backup_') !== false ? 'auto' : 'manual',
                        'status' => 'success',
                        'size' => $sizeFormatted,
                        'created_at' => date('Y-m-d H:i:s', filemtime($filepath))
                    ];
                }
            }
            usort($backups, function($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });
        }

        $searchQuery = isset($searchQuery) ? strtolower(trim($searchQuery)) : '';

        $filteredBackups = array_filter($backups, function($b) use ($searchQuery, $typesFilter, $statusFilter) {
            if ($searchQuery !== '' && strpos(strtolower($b['filename']), $searchQuery) === false) return false;
            if (!empty($typesFilter) && !in_array($b['type'], $typesFilter)) return false;
            if (!empty($statusFilter) && !in_array($b['status'], $statusFilter)) return false;
            return true;
        });

        $limit = 25; 
        $totalBackups = count($filteredBackups);
        $totalPages = ceil($totalBackups / $limit);
        if ($totalPages < 1) $totalPages = 1;

        if ($page < 1) $page = 1;
        if ($page > $totalPages) $page = $totalPages;

        $offset = ($page - 1) * $limit;
        $pagedBackups = array_slice(array_values($filteredBackups), $offset, $limit);

        return [
            'backups' => $pagedBackups,
            'totalBackups' => $totalBackups,
            'totalPages' => $totalPages,
            'searchQuery' => $searchQuery,
            'page' => $page,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Datos para la automatización de respaldos (backups/backups-automation.php).
     */
    public function getBackupsAutomationData(): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        return [
            'automationConfig' => [
                'enabled' => false,
                'frequency' => 'daily'
            ],
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Datos para la creación manual de respaldo (backups/backups-create.php).
     */
    public function getBackupsCreateData(): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        return [
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Datos para la restauración de respaldo (backups/backups-restore.php).
     */
    public function getBackupsRestoreData(?string $backupId): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        return [
            'backupId' => $backupId,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }
}
