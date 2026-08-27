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
    private $dbManager;
    private $cassandraManager;

    public function __construct(?DatabaseManager $dbManager = null, ?CassandraManager $cassandraManager = null) {
        if ($dbManager === null || $cassandraManager === null) {
            global $container;
            if (isset($container) && $container instanceof \App\Core\Container) {
                $dbManager = $dbManager ?? $container->get(DatabaseManager::class);
                $cassandraManager = $cassandraManager ?? $container->get(CassandraManager::class);
            }
        }
        $this->dbManager = $dbManager ?? new DatabaseManager();
        $this->cassandraManager = $cassandraManager ?? new CassandraManager();
    }

    /**

     */
    public static function parseSubscriptionColor(?string $raw): ?string {
        if (empty($raw)) return 'var(--text-muted)';

        $trimmed = trim($raw);
        $colorData = json_decode($trimmed, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($colorData)) {
            return $trimmed;
        }

        $firstColorObj = $colorData['colors'][0] ?? ($colorData['color'] ?? null);
        $bg = is_string($firstColorObj) ? $firstColorObj : ($firstColorObj['hex'] ?? 'var(--text-muted)');

        if (($colorData['type'] ?? 'solid') === 'gradient' && !empty($colorData['colors']) && count($colorData['colors']) > 1) {
            $angle = (int)($colorData['angle'] ?? 0);
            $stopsArray = [];
            $prevStop = 0;
            $colorsCount = count($colorData['colors']);
            foreach ($colorData['colors'] as $i => $colorObj) {
                $hex = is_string($colorObj) ? $colorObj : ($colorObj['hex'] ?? '#000000');
                $percentage = (is_array($colorObj) && isset($colorObj['percentage'])) ? (int)$colorObj['percentage'] : floor(100 / $colorsCount);
                $endStop = $prevStop + $percentage;
                if ($i === $colorsCount - 1) $endStop = 100;
                $stopsArray[] = "{$hex} {$prevStop}% {$endStop}%";
                $prevStop = $endStop;
            }
            $bg = "conic-gradient(from {$angle}deg, " . implode(', ', $stopsArray) . ")";
        }

        return $bg;
    }

    /**

     */
    public function getDashboardData(): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPermissions = $_SESSION['user_permissions'] ?? [];
        $canViewDashboard = in_array(PermissionsConstants::VIEW_DASHBOARD, $userPermissions);
        $canManageRoles = in_array(PermissionsConstants::VIEW_ROLES, $userPermissions);
        $canViewLogs = in_array(PermissionsConstants::VIEW_LOGS, $userPermissions);
        $canManageMessages = in_array(PermissionsConstants::MANAGE_CONTENT, $userPermissions);
        $canManageSubscriptions = in_array(PermissionsConstants::MANAGE_SUBSCRIPTIONS, $userPermissions);
        $canManageAdvertisements = in_array(PermissionsConstants::MANAGE_ADVERTISEMENTS, $userPermissions);

        $appUrl = defined('APP_URL') ? APP_URL : '';

        return [
            'canViewDashboard' => $canViewDashboard,
            'canManageRoles' => $canManageRoles,
            'canViewLogs' => $canViewLogs,
            'canManageMessages' => $canManageMessages,
            'canManageSubscriptions' => $canManageSubscriptions,
            'canManageAdvertisements' => $canManageAdvertisements,
            'appUrl' => $appUrl
        ];
    }

    public function getServerConfigData(): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $config = [];
        try {
            $redis = (new RedisCache())->getClient();
            if ($redis) {
                $serverConfigRepo = new \App\Core\Repositories\ServerConfigRepository($this->dbManager, $redis);
                $config = $serverConfigRepo->getConfig();
            } else {
                $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
                $stmt = $pdo->query("SELECT * FROM " . DB::TBL_SERVER_CONFIG . " LIMIT 1");
                $config = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];
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

        $roleRepo = new RoleRepository($this->dbManager, new \App\Config\Database\RedisCache());

        $activeUserId = $_SESSION['user_id'] ?? null;
        if ($activeUserId) {
            $userPerms = $roleRepo->getMergedPermissionsForUser((int)$activeUserId);
        } else {
            $userPerms = $_SESSION['user_permissions'] ?? [];
        }
        $isSuperAdmin = (isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4) 
            || (isset($_SESSION['user_role_weight']) && (int)$_SESSION['user_role_weight'] >= \App\Core\System\SecurityConstants::WEIGHT_SUPER_ADMIN)
            || (!empty($_SESSION['is_super_admin']));
        $canEditUsers = in_array(PermissionsConstants::EDIT_USERS, $userPerms);
        $canAssignRoles = in_array(PermissionsConstants::ASSIGN_ROLES, $userPerms);
        $canDeleteUsers = in_array(PermissionsConstants::DELETE_USERS, $userPerms) || $isSuperAdmin;
        $canModerateUsers = count(array_intersect([PermissionsConstants::MODERATE_USERS, PermissionsConstants::DELETE_USERS], $userPerms)) > 0;
        $canViewKardex = in_array(PermissionsConstants::VIEW_KARDEX, $userPerms);

        $limit = 25;
        if ($page < 1) $page = 1;

        $db = $this->dbManager;
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $tblUsers = DB::TBL_USERS;
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;

        $allRoles = $roleRepo->getAll();

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
                    (SELECT is_suspended FROM {$tblUserRestr} ur WHERE ur.user_id = u.id AND ur.is_suspended = 1 AND (ur.suspension_end_date IS NULL OR ur.suspension_end_date > NOW()) LIMIT 1) as is_suspended,
                    (SELECT suspension_type FROM {$tblUserRestr} ur WHERE ur.user_id = u.id AND ur.is_suspended = 1 AND (ur.suspension_end_date IS NULL OR ur.suspension_end_date > NOW()) LIMIT 1) as suspension_type,
                    (SELECT suspension_end_date FROM {$tblUserRestr} ur WHERE ur.user_id = u.id AND ur.is_suspended = 1 AND (ur.suspension_end_date IS NULL OR ur.suspension_end_date > NOW()) LIMIT 1) as restriction_expires_at
                FROM {$tblUsers} u
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
                    $uRow['subscription_color'] = SubscriptionPlanConstants::getTierColor((int)($uRow['subscription_tier'] ?? 0));
                    $uRow['sub_bg'] = self::parseSubscriptionColor($uRow['subscription_color']);
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
        $isSuperAdmin = (isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4) 
            || (isset($_SESSION['user_role_weight']) && (int)$_SESSION['user_role_weight'] >= \App\Core\System\SecurityConstants::WEIGHT_SUPER_ADMIN)
            || (!empty($_SESSION['is_super_admin']));

        if (empty($targetUserUuid)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $db = $this->dbManager;
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

        $subColorRaw = $user['subscription_color'] ?? '';
        $subscriptionBgCss = self::parseSubscriptionColor($subColorRaw);

        return [
            'redirect' => null,
            'user' => $user,
            'targetUserId' => $targetUserId,
            'targetUserUuid' => $targetUserUuid,
            'prefs' => $prefs,
            'maxAvatarSize' => $maxAvatarSize,
            'isSuperAdmin' => $isSuperAdmin,
            'subscriptionBgCss' => $subscriptionBgCss,
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

        $db = $this->dbManager;
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

        $db = $this->dbManager;
        $pdo = $db->getConnection(DB::CONN_IDENTITY);

        $redis = new RedisCache();
        $roleRepo = new RoleRepository($db, $redis);
        $userRepo = new UserRepository($db, $roleRepo);
        $targetUser = $userRepo->findByUuid($targetUserUuid);

        if (!$targetUser) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $targetUserId = (int)$targetUser['id'];

        $roleRepo = new RoleRepository($this->dbManager, new RedisCache());
        $allRoles = $roleRepo->getAll();

        $assignedRoleIds = [];
        try {
            $stmtUserRole = $pdo->prepare("SELECT role_id FROM " . DB::TBL_USER_ROLES . " WHERE user_id = :uid");
            $stmtUserRole->execute(['uid' => $targetUserId]);
            $assignedRoleIds = $stmtUserRole->fetchAll(\PDO::FETCH_COLUMN);
            $assignedRoleIds = array_map('intval', $assignedRoleIds);
        } catch (\Throwable $e) {
            Logger::error("getEditUserRoleData assignedRoleIds error: " . $e->getMessage(), ['exception' => $e]);
        }

        if (empty($assignedRoleIds) && isset($targetUser['role_id'])) {
            $assignedRoleIds = [(int)$targetUser['role_id']];
        }

        $currentUserRoleId = !empty($assignedRoleIds) ? $assignedRoleIds[0] : 1;
        $currentUserWeight = isset($_SESSION['user_role_weight']) ? (int)$_SESSION['user_role_weight'] : 0;
        $isSuperAdmin = (isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4) 
            || ($currentUserWeight >= \App\Core\System\SecurityConstants::WEIGHT_SUPER_ADMIN)
            || (!empty($_SESSION['is_super_admin']));

        return [
            'redirect' => null,
            'targetUser' => $targetUser,
            'targetUserId' => $targetUserId,
            'targetUserUuid' => $targetUserUuid,
            'allRoles' => $allRoles,
            'currentUserRoleId' => $currentUserRoleId,
            'assignedRoleIds' => $assignedRoleIds,
            'currentUserWeight' => $currentUserWeight,
            'isSuperAdmin' => $isSuperAdmin,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getUserHistoryData(?string $targetUserUuid, int $page = 1, array $categoryFilter = []): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (empty($targetUserUuid)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/users"];
        }

        $db = $this->dbManager;
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

        $validCategories = ['moderation', 'role', 'profile', 'security', 'finance'];
        if (empty($categoryFilter)) {
            $checkedCategories = $validCategories;
        } else {
            $checkedCategories = array_values(array_intersect($validCategories, $categoryFilter));
            if (empty($checkedCategories)) {
                $checkedCategories = $validCategories;
            }
        }

        $subqueries = [];

        if (in_array('moderation', $checkedCategories) || in_array('role', $checkedCategories)) {
            $modFilter = "";
            if (!in_array('role', $checkedCategories)) {
                $modFilter = " AND ml.action_type != 'role_changed'";
            } elseif (!in_array('moderation', $checkedCategories)) {
                $modFilter = " AND ml.action_type = 'role_changed'";
            }
            $subqueries[] = "
                SELECT 
                    'moderation' AS source_table,
                    CASE WHEN ml.action_type = 'role_changed' THEN 'role' ELSE 'moderation' END AS category,
                    ml.action_type,
                    ml.reason,
                    ml.end_date,
                    ml.admin_notes,
                    ml.admin_id,
                    u_adm.username AS admin_username,
                    u_adm.profile_picture AS admin_profile_picture,
                    u_adm.subscription_tier AS admin_subscription_tier,
                    r_adm.color AS admin_role_color,
                    r_adm.name AS admin_role,
                    NULL AS ip_address,
                    NULL AS asn,
                    NULL AS amount,
                    NULL AS currency,
                    NULL AS status,
                    ml.created_at
                FROM moderation_logs ml
                LEFT JOIN users u_adm ON ml.admin_id = u_adm.id
                LEFT JOIN user_roles ur_adm ON u_adm.id = ur_adm.user_id
                LEFT JOIN roles r_adm ON ur_adm.role_id = r_adm.id
                WHERE ml.user_id = :uid {$modFilter}
            ";
        }

        if (in_array('profile', $checkedCategories) || in_array('security', $checkedCategories)) {
            $pclFilter = "";
            if (!in_array('security', $checkedCategories)) {
                $pclFilter = " AND pcl.change_type NOT IN ('password', '2fa')";
            } elseif (!in_array('profile', $checkedCategories)) {
                $pclFilter = " AND pcl.change_type IN ('password', '2fa')";
            }
            $subqueries[] = "
                SELECT 
                    'profile' AS source_table,
                    CASE WHEN pcl.change_type IN ('password', '2fa') THEN 'security' ELSE 'profile' END AS category,
                    CONCAT('profile_', pcl.change_type) AS action_type,
                    JSON_OBJECT('field', pcl.change_type, 'old', pcl.old_value, 'new', pcl.new_value) AS reason,
                    NULL AS end_date,
                    NULL AS admin_notes,
                    NULL AS admin_id,
                    'user_action' AS admin_username,
                    NULL AS admin_profile_picture,
                    NULL AS admin_subscription_tier,
                    NULL AS admin_role_color,
                    'user' AS admin_role,
                    pcl.ip_address,
                    pcl.asn,
                    NULL AS amount,
                    NULL AS currency,
                    NULL AS status,
                    pcl.created_at
                FROM profile_changes_log pcl
                WHERE pcl.user_id = :uid {$pclFilter}
            ";
        }

        if (in_array('finance', $checkedCategories)) {
            $subqueries[] = "
                SELECT 
                    'finance' AS source_table,
                    'finance' AS category,
                    CONCAT('payment_', ph.status) AS action_type,
                    ph.description AS reason,
                    NULL AS end_date,
                    NULL AS admin_notes,
                    NULL AS admin_id,
                    'user_action' AS admin_username,
                    NULL AS admin_profile_picture,
                    NULL AS admin_subscription_tier,
                    NULL AS admin_role_color,
                    'user' AS admin_role,
                    NULL AS ip_address,
                    NULL AS asn,
                    (ph.amount_cents / 100.0) AS amount,
                    ph.currency,
                    ph.status,
                    ph.created_at
                FROM payment_history ph
                WHERE ph.user_id = :uid
            ";
        }

        if (in_array('security', $checkedCategories)) {
            $subqueries[] = "
                SELECT 
                    'security' AS source_table,
                    'security' AS category,
                    'login_session' AS action_type,
                    CONCAT(IFNULL(at.user_agent, 'Navegador Web'), IF(at.location IS NOT NULL AND at.location != '', CONCAT(' (', at.location, ')'), '')) AS reason,
                    at.expires_at AS end_date,
                    NULL AS admin_notes,
                    NULL AS admin_id,
                    'user_action' AS admin_username,
                    NULL AS admin_profile_picture,
                    NULL AS admin_subscription_tier,
                    NULL AS admin_role_color,
                    'user' AS admin_role,
                    at.ip_address,
                    at.asn,
                    NULL AS amount,
                    NULL AS currency,
                    NULL AS status,
                    at.created_at
                FROM auth_tokens at
                WHERE at.user_id = :uid
            ";
        }

        $totalHistory = 0;
        $historyItems = [];

        if (!empty($subqueries)) {
            $unionSql = implode(" UNION ALL ", $subqueries);

            try {
                $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM ({$unionSql}) AS u_hist");
                $stmtCount->bindValue(':uid', $targetUserId, \PDO::PARAM_INT);
                $stmtCount->execute();
                $totalHistory = (int)$stmtCount->fetchColumn();
            } catch (\Throwable $e) {
                Logger::error("getUserHistoryData totalHistory error: " . $e->getMessage(), ['exception' => $e]);
            }

            $totalPages = ceil($totalHistory / $limit);
            if ($totalPages < 1) $totalPages = 1;
            if ($page > $totalPages) $page = $totalPages;
            $offset = ($page - 1) * $limit;

            try {
                $stmt = $pdo->prepare("SELECT * FROM ({$unionSql}) AS u_hist ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
                $stmt->bindValue(':uid', $targetUserId, \PDO::PARAM_INT);
                $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
                $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
                $stmt->execute();
                $historyItems = $stmt->fetchAll(\PDO::FETCH_ASSOC);
                foreach ($historyItems as &$hItem) {
                    if (isset($hItem['admin_subscription_tier']) && $hItem['admin_subscription_tier'] !== null) {
                        $hItem['admin_subscription_color'] = SubscriptionPlanConstants::getTierColor((int)$hItem['admin_subscription_tier']);
                    } else {
                        $hItem['admin_subscription_color'] = null;
                    }
                }
                unset($hItem);
            } catch (\Throwable $e) {
                Logger::error("getUserHistoryData historyItems error: " . $e->getMessage(), ['exception' => $e]);
            }
        } else {
            $totalPages = 1;
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
            'categoryFilter' => $checkedCategories,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }


    public function getManageSubscriptionsData(?string $searchQuery, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $canManageTiers = in_array(PermissionsConstants::MANAGE_SUBSCRIPTIONS, $userPerms);

        $searchQuery = trim($searchQuery ?? '');
        $limit = 25;
        if ($page < 1) $page = 1;

        $allTiers = SubscriptionPlanConstants::getAllTiers();

        if ($searchQuery !== '') {
            $allTiers = array_values(array_filter($allTiers, function($t) use ($searchQuery) {
                return stripos($t['name'] ?? '', $searchQuery) !== false;
            }));
        }

        $totalTiers = count($allTiers);
        $totalPages = (int)ceil($totalTiers / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        $tiers = array_slice($allTiers, $offset, $limit);

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

    public function getManageAdvertisementsData(?string $searchQuery, ?string $typeFilter = null, ?string $statusFilter = null, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $canManageAds = in_array(PermissionsConstants::MANAGE_ADVERTISEMENTS, $userPerms);

        $adsService = new AdminAdvertisementsService($this->dbManager);
        $listData = $adsService->getProvidersList($searchQuery, $typeFilter, $statusFilter, $page, 25);

        return [
            'canManageAds' => $canManageAds,
            'providers' => $listData['providers'],
            'totalProviders' => $listData['totalProviders'],
            'totalPages' => $listData['totalPages'],
            'page' => $listData['page'],
            'searchQuery' => $listData['searchQuery'],
            'typeFilter' => $listData['typeFilter'],
            'statusFilter' => $listData['statusFilter'],
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    public function getManageProviderAdsData(string $providerUuid, ?string $searchQuery = '', ?string $formatFilter = null, ?string $statusFilter = null, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $canManageAds = in_array(PermissionsConstants::MANAGE_ADVERTISEMENTS, $userPerms);

        $adsService = new AdminAdvertisementsService($this->dbManager);
        $data = $adsService->getProviderAdsPaginated($providerUuid, $searchQuery, $formatFilter, $statusFilter, $page, 25);

        return array_merge($data, [
            'canManageAds' => $canManageAds,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ]);
    }



    /**

     */
    public function getSubscriptionBuilderData(?string $targetUuid = null): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $canManageTiers = in_array(PermissionsConstants::MANAGE_SUBSCRIPTIONS, $userPerms) 
            || in_array(PermissionsConstants::ACCESS_ADMIN_PANEL, $userPerms)
            || in_array(PermissionsConstants::MANAGE_ROLES_STRUCTURE, $userPerms);

        if (!$canManageTiers) {
            return ['error' => __('err_unauthorized')];
        }

        $isEdit = false;
        $tier = null;

        if (!empty($targetUuid)) {
            $tier = SubscriptionPlanConstants::getTierByUuid($targetUuid);
            if ($tier) {
                $isEdit = true;
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

        $db = $this->dbManager;
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
            $stmt = $pdo->prepare("SELECT id, uuid, name, weight, is_system, created_at FROM {$tblRoles} {$searchCondition} ORDER BY id ASC LIMIT :limit OFFSET :offset");
            foreach ($searchParams as $key => $val) {
                $stmt->bindValue($key, $val);
            }
            $stmt->bindValue(':limit', (int)$limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$offset, \PDO::PARAM_INT);
            $stmt->execute();
            $roles = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($roles as &$role) {
                if (empty($role['uuid'])) {
                    $newUuid = \App\Core\Helpers\Utils::generateUUID();
                    $stmtUpdate = $pdo->prepare("UPDATE {$tblRoles} SET uuid = ? WHERE id = ?");
                    $stmtUpdate->execute([$newUuid, $role['id']]);
                    $role['uuid'] = $newUuid;
                }
            }
            unset($role);
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

        $db = $this->dbManager;
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

        $roleRepo = new RoleRepository($this->dbManager, new RedisCache());
        $allPermissions = $roleRepo->getAllPermissions();

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
     * Obtiene los datos de configuración para el constructor/editor de roles.
     */
    public function getRoleBuilderData(?string $uuid = null, ?int $id = null): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $db = $this->dbManager;
        $pdo = $db->getConnection(DB::CONN_IDENTITY);
        $tblRoles = DB::TBL_ROLES;

        $isEdit = false;
        $roleData = [
            'id' => 0,
            'name' => '',
            'color' => json_encode(['type' => 'solid', 'angle' => 0, 'colors' => [['hex' => '#808080', 'percentage' => 100]]]),
            'weight' => 1
        ];

        try {
            if ($uuid) {
                $stmt = $pdo->prepare("SELECT * FROM {$tblRoles} WHERE uuid = ?");
                $stmt->execute([$uuid]);
                $role = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($role) {
                    $isEdit = true;
                    $roleData = array_merge($roleData, $role);
                }
            } elseif ($id) {
                $stmt = $pdo->prepare("SELECT * FROM {$tblRoles} WHERE id = ?");
                $stmt->execute([(int)$id]);
                $role = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($role) {
                    $isEdit = true;
                    $roleData = array_merge($roleData, $role);
                }
            }
        } catch (\Throwable $e) {
            Logger::error("getRoleBuilderData fetch error: " . $e->getMessage(), ['exception' => $e]);
        }

        $isSystemRole = ($isEdit && (isset($roleData['is_system']) ? (int)$roleData['is_system'] === 1 : (int)$roleData['id'] <= 4));
        
        $currentRoleId = isset($_SESSION['user_role_id']) ? (int)$_SESSION['user_role_id'] : 0;
        $currentUserWeight = 0;
        if ($currentRoleId > 0) {
            try {
                $stmtW = $pdo->prepare("SELECT weight FROM {$tblRoles} WHERE id = ?");
                $stmtW->execute([$currentRoleId]);
                $rowW = $stmtW->fetch(\PDO::FETCH_ASSOC);
                if ($rowW) {
                    $currentUserWeight = (int)$rowW['weight'];
                }
            } catch (\Throwable $e) {
                Logger::error("getRoleBuilderData weight fetch error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        return [
            'isEdit' => $isEdit,
            'roleData' => $roleData,
            'isSystemRole' => $isSystemRole,
            'currentUserWeight' => $currentUserWeight,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getManageMessagesData(?string $searchQuery = '', int $page = 1, string $filter = 'all', string $sort = 'recent'): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $db = $this->dbManager;
        $pdo = $db->getConnection(DB::CONN_CANVASES);

        $searchQuery = trim($searchQuery ?? '');
        $limit = 25;
        if ($page < 1) $page = 1;

        $session = $this->cassandraManager->getSession();
        $rawMessages = [];

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
                    
                    $rawMessages[] = [
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
            } catch (\Throwable $e) {
                Logger::error("getManageMessagesData select messages error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        // Enrich with user names (DB::CONN_IDENTITY)
        $userIds = array_values(array_filter(array_unique(array_column($rawMessages, 'user_id'))));
        $userMap = [];
        if (!empty($userIds)) {
            try {
                $pdoIdentity = $db->getConnection(DB::CONN_IDENTITY);
                $placeholders = implode(',', array_fill(0, count($userIds), '?'));
                $stmt = $pdoIdentity->prepare("SELECT id, username FROM users WHERE id IN ($placeholders)");
                $stmt->execute($userIds);
                while ($uRow = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                    $userMap[$uRow['id']] = $uRow['username'];
                }
            } catch (\Throwable $e) {
                Logger::error("getManageMessagesData fetch users error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        // Enrich with canvas names (DB::CONN_CANVASES)
        $canvasIds = array_values(array_filter(array_unique(array_column($rawMessages, 'canvas_id'))));
        $canvasMap = [];
        $canvasUuidMap = [];
        if (!empty($canvasIds)) {
            try {
                $placeholders = implode(',', array_fill(0, count($canvasIds), '?'));
                $stmt = $pdo->prepare("SELECT id, uuid, name FROM canvases WHERE id IN ($placeholders)");
                $stmt->execute($canvasIds);
                while ($cRow = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                    $canvasMap[$cRow['id']] = $cRow['name'];
                    $canvasUuidMap[$cRow['id']] = $cRow['uuid'];
                }
            } catch (\Throwable $e) {
                Logger::error("getManageMessagesData fetch canvases error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        // Enrich with report counts (DB::CONN_CANVASES -> canvas_chat_reports)
        $msgUuids = array_values(array_filter(array_unique(array_column($rawMessages, 'uuid'))));
        $reportCountMap = [];
        if (!empty($msgUuids)) {
            try {
                $placeholders = implode(',', array_fill(0, count($msgUuids), '?'));
                $stmt = $pdo->prepare("SELECT message_id, COUNT(*) as rep_count FROM canvas_chat_reports WHERE message_id IN ($placeholders) GROUP BY message_id");
                $stmt->execute($msgUuids);
                while ($rRow = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                    $reportCountMap[$rRow['message_id']] = (int)$rRow['rep_count'];
                }
            } catch (\Throwable $e) {
                Logger::error("getManageMessagesData fetch reports error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        foreach ($rawMessages as &$msg) {
            $msg['username'] = $userMap[$msg['user_id']] ?? ('Usuario #' . $msg['user_id']);
            $msg['canvas_name'] = $canvasMap[$msg['canvas_id']] ?? ('ID: ' . $msg['canvas_id']);
            $msg['canvas_uuid'] = $canvasUuidMap[$msg['canvas_id']] ?? '';
            $msg['report_count'] = $reportCountMap[$msg['uuid']] ?? 0;
        }
        unset($msg);

        // Filter
        $filtered = [];
        foreach ($rawMessages as $msg) {
            if ($filter === 'reported' && ($msg['report_count'] ?? 0) <= 0) {
                continue;
            }
            if ($searchQuery !== '') {
                $q = mb_strtolower($searchQuery);
                $match = (mb_stripos($msg['message'], $q) !== false) ||
                         (mb_stripos($msg['username'], $q) !== false) ||
                         (mb_stripos($msg['uuid'], $q) !== false) ||
                         (mb_stripos($msg['canvas_name'], $q) !== false);
                if (!$match) continue;
            }
            $filtered[] = $msg;
        }

        // Sort
        if ($sort === 'most_reported') {
            usort($filtered, function($a, $b) {
                if ($b['report_count'] !== $a['report_count']) {
                    return $b['report_count'] <=> $a['report_count'];
                }
                return strcmp($b['created_at'], $a['created_at']);
            });
        } else {
            usort($filtered, function($a, $b) {
                return strcmp($b['created_at'], $a['created_at']);
            });
        }

        $totalMessages = count($filtered);
        $totalPages = (int)ceil($totalMessages / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        $messages = array_slice($filtered, $offset, $limit);

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
    public function getReportsData(?string $messageUuid = null, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $db = $this->dbManager;
        $pdo = $db->getConnection(DB::CONN_CANVASES);

        $messageUuid = trim($messageUuid ?? ($_GET['uuid'] ?? ($_GET['id'] ?? '')));

        $session = $this->cassandraManager->getSession();
        $messageData = null;

        if ($session && !empty($messageUuid)) {
            try {
                $stmt = $session->prepare("SELECT uuid, canvas_id, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason, created_at FROM canvas_chat_messages WHERE uuid = ?");
                $rows = $session->execute($stmt, [$messageUuid])->asRowsResult();
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

                    $messageData = [
                        'id' => $row['uuid'] ?? $messageUuid,
                        'uuid' => $row['uuid'] ?? $messageUuid,
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
                    break;
                }
            } catch (\Throwable $e) {
                Logger::error("getReportsData message fetch error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        if (!$messageData) {
            $messageData = [
                'id' => $messageUuid,
                'uuid' => $messageUuid,
                'visibility' => 'visible',
                'deleted_by' => '',
                'delete_reason' => ''
            ];
        }

        $reports = [];
        if (!empty($messageUuid)) {
            try {
                $stmt = $pdo->prepare("SELECT * FROM canvas_chat_reports WHERE message_id = :mid ORDER BY created_at DESC");
                $stmt->execute([':mid' => $messageUuid]);
                $reports = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            } catch (\Throwable $e) {
                Logger::error("getReportsData select reports error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        if (!empty($reports)) {
            $reporterIds = array_values(array_filter(array_unique(array_column($reports, 'reporter_user_id'))));
            if (!empty($reporterIds)) {
                try {
                    $pdoIdentity = $db->getConnection(DB::CONN_IDENTITY);
                    $placeholders = implode(',', array_fill(0, count($reporterIds), '?'));
                    $stmtUser = $pdoIdentity->prepare("SELECT id, username FROM users WHERE id IN ($placeholders)");
                    $stmtUser->execute($reporterIds);
                    $userMap = [];
                    while ($uRow = $stmtUser->fetch(\PDO::FETCH_ASSOC)) {
                        $userMap[$uRow['id']] = $uRow['username'];
                    }
                    foreach ($reports as &$rep) {
                        $rep['reporter_username'] = $userMap[$rep['reporter_user_id']] ?? ('Usuario #' . $rep['reporter_user_id']);
                    }
                    unset($rep);
                } catch (\Throwable $e) {
                    Logger::error("getReportsData reporter users error: " . $e->getMessage(), ['exception' => $e]);
                }
            }
        }

        $visibility = $messageData['visibility'] ?? 'visible';
        $deletedBy = $messageData['deleted_by'] ?? '';
        $deleteReason = $messageData['delete_reason'] ?? '';

        $visibilityLabels = [
            'visible' => __('msg_visibility_visible'),
            'under_review' => __('msg_visibility_under_review'),
            'deleted' => __('msg_visibility_deleted')
        ];
        $visibilityIcons = [
            'visible' => 'check_circle',
            'under_review' => 'pending',
            'deleted' => 'delete'
        ];

        $currentVisIcon = $visibilityIcons[$visibility] ?? 'check_circle';
        $currentVisText = $visibilityLabels[$visibility] ?? $visibility;

        return [
            'messageUuid' => $messageUuid,
            'messageData' => $messageData,
            'visibility' => $visibility,
            'deletedBy' => $deletedBy,
            'deleteReason' => $deleteReason,
            'currentVisIcon' => $currentVisIcon,
            'currentVisText' => $currentVisText,
            'reports' => $reports,
            'totalReports' => count($reports),
            'totalPages' => 1,
            'page' => 1,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**

     */
    public function getLogsData(?string $category = 'all', int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
        $searchQueryLower = strtolower($searchQuery);

        $categoryFilter = [];
        if (isset($_GET['category']) && $_GET['category'] !== '') {
            $categoryFilter = explode(',', $_GET['category']);
        } elseif ($category !== 'all' && !empty($category)) {
            $categoryFilter = explode(',', $category);
        }

        $logFiles = [];
        $logBaseDir = ROOT_PATH . '/storage/private/logs/';

        if (is_dir($logBaseDir)) {
            $categories = array_diff(scandir($logBaseDir), ['.', '..', '.htaccess', '.gitkeep']);
            
            foreach ($categories as $cat) {
                $catDir = $logBaseDir . $cat;
                if (is_dir($catDir)) {
                    $files = array_diff(scandir($catDir), ['.', '..', '.htaccess', '.gitkeep']);
                    foreach ($files as $file) {
                        if (pathinfo($file, PATHINFO_EXTENSION) === 'log') {
                            $filepath = $catDir . '/' . $file;
                            $sizeBytes = @filesize($filepath) ?: 0;
                            
                            $sizeFormatted = $sizeBytes >= 1048576 
                                            ? round($sizeBytes / 1048576, 2) . ' MB' 
                                            : round($sizeBytes / 1024, 2) . ' KB';
                                            
                            $logFiles[] = [
                                'id' => base64_encode($cat . '/' . $file),
                                'filename' => $file,
                                'category' => $cat,
                                'size' => $sizeFormatted,
                                'modified_at' => date('Y-m-d H:i:s', @filemtime($filepath) ?: time())
                            ];
                        }
                    }
                }
            }
            
            usort($logFiles, function($a, $b) {
                return strtotime($b['modified_at']) - strtotime($a['modified_at']);
            });
        }

        // Apply filters
        $filteredLogs = array_filter($logFiles, function($log) use ($searchQueryLower, $categoryFilter) {
            if ($searchQueryLower !== '' && strpos(strtolower($log['filename']), $searchQueryLower) === false) {
                return false;
            }
            if (!empty($categoryFilter) && !in_array($log['category'], $categoryFilter)) {
                return false;
            }
            return true;
        });

        // Pagination
        $limit = 25; 
        $totalLogs = count($filteredLogs);
        $totalPages = ceil($totalLogs / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page < 1) $page = 1;
        if ($page > $totalPages) $page = $totalPages;

        $offset = ($page - 1) * $limit;
        $pagedLogs = array_slice($filteredLogs, $offset, $limit);

        return [
            'logs' => $pagedLogs,
            'totalLogs' => $totalLogs,
            'totalPages' => $totalPages,
            'page' => $page,
            'categoryFilter' => $categoryFilter,
            'searchQuery' => $searchQuery,
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

        $db = $this->dbManager;
        $pdo = $db->getConnection(DB::CONN_IDENTITY);
        $tblServerConfig = DB::TBL_SERVER_CONFIG;

        $autoEnabled = 0;
        $autoFreq = 24;
        $autoRetention = 5;
        $schemaConfig = [];

        try {
            $stmt = $pdo->query("SELECT auto_backup_enabled, auto_backup_frequency_hours, auto_backup_retention_count, backup_schema_config FROM {$tblServerConfig} WHERE id = 1");
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                $autoEnabled = (int)$row['auto_backup_enabled'];
                $autoFreq = (int)$row['auto_backup_frequency_hours'];
                $autoRetention = (int)$row['auto_backup_retention_count'];
                if (!empty($row['backup_schema_config'])) {
                    $decoded = json_decode($row['backup_schema_config'], true);
                    if (is_array($decoded)) {
                        $schemaConfig = $decoded;
                    }
                }
            }
        } catch (\Throwable $e) {
            \App\Core\System\Logger::error("getBackupsAutomationData config load error: " . $e->getMessage(), ['exception' => $e]);
        }

        // Get available schema (MySQL + Cassandra)
        $availableSchema = [];
        try {
            $pdoGlobal = $db->getGlobalConnection();
            $stmt = $pdoGlobal->query("SHOW DATABASES WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')");
            $databases = $stmt->fetchAll(\PDO::FETCH_COLUMN);
            
            foreach ($databases as $dbName) {
                $stmtTables = $pdoGlobal->query("SHOW TABLES FROM `$dbName`");
                $availableSchema[$dbName] = $stmtTables->fetchAll(\PDO::FETCH_COLUMN);
            }
            
            // Query Cassandra keyspaces and tables
            $session = $this->cassandraManager->getSession();
            if ($session) {
                try {
                    $ksRows = $session->query("SELECT keyspace_name FROM system_schema.keyspaces")->asRowsResult();
                    foreach ($ksRows as $ksRow) {
                        $ksName = $ksRow['keyspace_name'];
                        // Skip internal system keyspaces
                        if (strpos($ksName, 'system') === 0) {
                            continue;
                        }
                        
                        $tableRows = $session->query("SELECT table_name FROM system_schema.tables WHERE keyspace_name = '$ksName'")->asRowsResult();
                        $availableSchema[$ksName] = [];
                        foreach ($tableRows as $tRow) {
                            $availableSchema[$ksName][] = $tRow['table_name'];
                        }
                    }
                } catch (\Exception $cassandraEx) {
                    \App\Core\System\Logger::error("getBackupsAutomationData cassandra schema fetch error: " . $cassandraEx->getMessage());
                }
            }
        } catch (\Throwable $e) {
            \App\Core\System\Logger::error("getBackupsAutomationData schema fetch error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'autoEnabled' => $autoEnabled,
            'autoFreq' => $autoFreq,
            'autoRetention' => $autoRetention,
            'schemaConfig' => $schemaConfig,
            'availableSchema' => $availableSchema,
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

        if (empty($backupId)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/admin/backups"];
        }

        $filename = base64_decode($backupId);
        if (empty($filename)) {
            $filename = $backupId;
        }

        $metaFilename = str_replace('.tar.gz.enc', '.meta.json', $filename);
        $backupsDir = \ROOT_PATH . '/storage/private/backups';
        $metaPath = $backupsDir . '/' . $metaFilename;

        $metadata = null;
        if (file_exists($metaPath)) {
            $metadata = json_decode(file_get_contents($metaPath), true);
        }

        // If metadata is null (old backup), load current schema as a fallback
        if (!$metadata) {
            $currentSchema = [];
            try {
                $db = $this->dbManager;
                $pdoGlobal = $db->getGlobalConnection();
                $stmt = $pdoGlobal->query("SHOW DATABASES WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')");
                $databases = $stmt->fetchAll(\PDO::FETCH_COLUMN);
                
                foreach ($databases as $dbName) {
                    $stmtTables = $pdoGlobal->query("SHOW TABLES FROM `$dbName`");
                    $currentSchema[$dbName] = $stmtTables->fetchAll(\PDO::FETCH_COLUMN);
                }
                
                $session = $this->cassandraManager->getSession();
                if ($session) {
                    $ksRows = $session->query("SELECT keyspace_name FROM system_schema.keyspaces")->asRowsResult();
                    foreach ($ksRows as $ksRow) {
                        $ksName = $ksRow['keyspace_name'];
                        if (strpos($ksName, 'system') === 0) continue;
                        $tableRows = $session->query("SELECT table_name FROM system_schema.tables WHERE keyspace_name = '$ksName'")->asRowsResult();
                        $currentSchema[$ksName] = [];
                        foreach ($tableRows as $tRow) {
                            $currentSchema[$ksName][] = $tRow['table_name'];
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Ignore errors during schema fallback query
            }
            $metadata = [
                'type' => 'full',
                'schema' => $currentSchema,
                'is_fallback' => true
            ];
        }

        return [
            'backupId' => $backupId,
            'filename' => $filename,
            'metadata' => $metadata,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }
}
