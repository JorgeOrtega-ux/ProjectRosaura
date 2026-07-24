<?php
namespace App\Api\Services\Canvas;

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;
use App\Core\System\PermissionsConstants;
use App\Core\System\SubscriptionPlanConstants;
use App\Core\System\Logger;

class CanvasViewService {

    /**
     * Obtiene y procesa los datos necesarios para la vista de creación de lienzo (create.php).
     */
    public function getCanvasCreateData(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $activeAccountId = $_SESSION['active_account'] ?? null;
        $linkedAccounts = $_SESSION['accounts'] ?? [];
        $tier = 0;
        if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
            $tier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
        }

        $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
        $maxMembers = $planLimits['max_members_per_canvas'] === -1 ? 50000 : $planLimits['max_members_per_canvas'];
        $hasLiveChat = SubscriptionPlanConstants::hasFeature($tier, 'chat_restriction') 
                    || SubscriptionPlanConstants::hasFeature($tier, 'allow_live_chat') 
                    || !empty($planLimits['allow_live_chat']) 
                    || !empty($planLimits['feat_chat_restriction']);

        $userPerms = $_SESSION['user_permissions'] ?? [];
        $canCreateOfficial = in_array(PermissionsConstants::CANVASES_CREATE_OFFICIAL, $userPerms);
        $canvasSizesList = Utils::getCanvasSizes();
        $defaultSizeKey = '64x64';
        if (!isset($canvasSizesList[$defaultSizeKey])) {
            $defaultSizeData = reset($canvasSizesList);
            $defaultSizeKey = key($canvasSizesList);
        } else {
            $defaultSizeData = $canvasSizesList[$defaultSizeKey];
        }

        return [
            'tier' => $tier,
            'planLimits' => $planLimits,
            'maxMembers' => $maxMembers,
            'hasLiveChat' => $hasLiveChat,
            'userPerms' => $userPerms,
            'canCreateOfficial' => $canCreateOfficial,
            'canvasSizesList' => $canvasSizesList,
            'defaultSizeKey' => $defaultSizeKey,
            'defaultSizeData' => $defaultSizeData
        ];
    }

    /**
     * Obtiene los lienzos administrables y la paginación para (manage.php).
     */
    public function getCanvasManageData(?int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        if (!$userId) {
            return [
                'unauthorized' => true,
                'canvases' => [],
                'totalItems' => 0,
                'totalPages' => 0,
                'page' => 1,
                'isAdmin' => false,
                'hasAdvancedRoles' => false
            ];
        }

        $userPermissions = $_SESSION['user_permissions'] ?? [];
        $isAdmin = in_array(PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $userPermissions);

        $subscriptionTier = (int)($_SESSION['subscription_tier'] ?? 0);
        $hasAdvancedRoles = SubscriptionPlanConstants::hasFeature($subscriptionTier, 'advanced_roles');

        $limit = 25;
        $currentPage = ($page && $page > 0) ? $page : 1;
        $offset = ($currentPage - 1) * $limit;

        $db = new DatabaseManager();
        $connName = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
        $pdo = $db->getConnection($connName);

        $tblCanvases = defined('\App\Core\System\DatabaseConstants::TBL_CANVASES') ? \App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';
        if ($isAdmin) {
            $sqlCount = "SELECT COUNT(*) FROM {$tblCanvases} WHERE owner_id = :uid OR is_official = 1";
            $sqlSelect = "SELECT id, uuid, name, privacy, size, max_participants, created_at, is_official, favorites_count 
                          FROM {$tblCanvases} 
                          WHERE owner_id = :uid OR is_official = 1
                          ORDER BY id DESC 
                          LIMIT $limit OFFSET $offset";
        } else {
            $sqlCount = "SELECT COUNT(*) FROM {$tblCanvases} WHERE owner_id = :uid";
            $sqlSelect = "SELECT id, uuid, name, privacy, size, max_participants, created_at, is_official, favorites_count 
                          FROM {$tblCanvases} 
                          WHERE owner_id = :uid 
                          ORDER BY id DESC 
                          LIMIT $limit OFFSET $offset";
        }

        $stmtCount = $pdo->prepare($sqlCount);
        $stmtCount->execute([':uid' => $userId]);
        $totalItems = (int)$stmtCount->fetchColumn();
        $totalPages = ceil($totalItems / $limit);

        $stmtSelect = $pdo->prepare($sqlSelect);
        $stmtSelect->execute([':uid' => $userId]);
        $canvases = $stmtSelect->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'unauthorized' => false,
            'canvases' => $canvases,
            'totalItems' => $totalItems,
            'totalPages' => $totalPages,
            'page' => $currentPage,
            'isAdmin' => $isAdmin,
            'hasAdvancedRoles' => $hasAdvancedRoles
        ];
    }

    /**
     * Obtiene la galería de snapshots de un lienzo (snapshots-gallery.php).
     */
    public function getSnapshotsGalleryData(?string $paramUuid): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $uuid = $paramUuid;
        if (!$uuid && !empty($_SERVER['REQUEST_URI'])) {
            $pathParts = array_values(array_filter(explode('/', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))));
            $lastPart = end($pathParts);
            if ($lastPart && $lastPart !== 'snapshots' && $lastPart !== 'canvas') {
                $uuid = $lastPart;
            }
        }

        $snapshots = [];
        $canvasName = __('default_canvas_name');
        $error = false;
        $errorMessage = '';
        $errorIcon = 'error';

        $appUrl = defined('APP_URL') ? APP_URL : '';
        $fallbackImg = $appUrl . '/assets/img/fallbacks/canvas-default.png';

        if ($uuid) {
            try {
                $dbConnName = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
                $tblCanvases = defined('\App\Core\System\DatabaseConstants::TBL_CANVASES') ? \App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';
                $db = (new DatabaseManager())->getConnection($dbConnName);

                $stmt = $db->prepare('SELECT id, name, privacy, owner_id FROM ' . $tblCanvases . ' WHERE uuid = :uuid LIMIT 1');
                $stmt->execute([':uuid' => $uuid]);
                $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

                if (!$canvas) {
                    $error = true;
                    $errorMessage = __('err_canvas_not_found');
                } else {
                    $canvasName = $canvas['name'];
                    $isAuthorized = true;

                    $userId = $_SESSION['user_id'] ?? null;
                    $isOwner = ($canvas['owner_id'] == $userId);

                    if ($canvas['privacy'] === \App\Core\System\DatabaseConstants::PRIVACY_PRIVATE) {
                        $isMember = false;
                        if ($userId && !$isOwner) {
                            $memberStmt = $db->prepare('SELECT role FROM canvas_members WHERE canvas_id = :canvas_id AND user_id = :user_id LIMIT 1');
                            $memberStmt->execute([':canvas_id' => $canvas['id'], ':user_id' => $userId]);
                            $isMember = (bool) $memberStmt->fetch(\PDO::FETCH_ASSOC);
                        }

                        if (!$isOwner && !$isMember) {
                            $isAuthorized = false;
                            $error = true;
                            $errorMessage = __('err_unauthorized');
                            $errorIcon = 'lock';
                        }
                    }

                    if ($isAuthorized) {
                        $userIdParam = $_SESSION['user_id'] ?? 0;
                        $privacyCondition = $isOwner ? '' : ' AND s.privacy = \'public\'';

                        $stmtHist = $db->prepare('
                            SELECT s.id, s.file_path, s.snapshot_uuid, s.created_at, s.privacy,
                                   (SELECT COUNT(*) FROM canvas_snapshots_likes l WHERE l.snapshot_id = s.id) as likes_count,
                                   (SELECT COUNT(*) FROM canvas_snapshots_likes l WHERE l.snapshot_id = s.id AND l.user_id = :user_id) as user_liked
                            FROM canvas_snapshots_history s
                            WHERE s.canvas_id = :canvas_id' . $privacyCondition . '
                            ORDER BY s.created_at DESC
                        ');
                        $stmtHist->execute([':canvas_id' => $canvas['id'], ':user_id' => $userIdParam]);
                        $history = $stmtHist->fetchAll(\PDO::FETCH_ASSOC);

                        foreach ($history as $item) {
                            $imageUrl = Utils::getS3PublicUrl($item['file_path']);
                            $snapshots[] = [
                                'id' => $item['id'],
                                'url' => $imageUrl,
                                'date' => date('d/m/Y H:i', strtotime($item['created_at'])),
                                'snapshot_uuid' => $item['snapshot_uuid'],
                                'privacy' => $item['privacy'],
                                'likes_count' => $item['likes_count'],
                                'user_liked' => $item['user_liked'] > 0
                            ];
                        }
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("Error loading snapshots gallery: " . $e->getMessage(), ['exception' => $e]);
                $error = true;
                $errorMessage = __('err_load_snapshots');
            }
        } else {
            $error = true;
            $errorMessage = __('err_canvas_uuid_missing');
        }

        $galleryTitle = $error ? __('snapshots_gallery_title_error') : str_replace('{name}', $canvasName, __('snapshots_gallery_title'));

        return [
            'uuid' => $uuid,
            'snapshots' => $snapshots,
            'canvasName' => $canvasName,
            'galleryTitle' => $galleryTitle,
            'error' => $error,
            'errorMessage' => $errorMessage,
            'errorIcon' => $errorIcon,
            'fallbackImg' => $fallbackImg
        ];
    }

    /**
     * Obtiene los datos del visor de snapshots (snapshot-viewer.php).
     */
    public function getSnapshotViewerData(?string $paramId): array {
        $snapshotId = $paramId;
        if (!$snapshotId && !empty($_SERVER['REQUEST_URI'])) {
            $pathParts = array_values(array_filter(explode('/', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))));
            $lastPart = end($pathParts);
            if ($lastPart && $lastPart !== 'view' && $lastPart !== 'snapshot') {
                $snapshotId = $lastPart;
            }
        }

        $title = __('lbl_snapshot_viewer_title');
        $canvasSize = '64x64';

        if ($snapshotId) {
            try {
                $dbManager = new DatabaseManager();
                $dbConnName = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
                $db = $dbManager->getConnection($dbConnName);

                $sql = "SELECT c.size FROM canvas_snapshots_history s
                        JOIN canvases c ON s.canvas_id = c.id
                        WHERE s.snapshot_uuid = :uuid LIMIT 1";
                $stmt = $db->prepare($sql);
                $stmt->execute([':uuid' => $snapshotId]);
                if ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                    $canvasSize = $row['size'];
                }
            } catch (\Throwable $e) {
                Logger::error("Error loading snapshot viewer size: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        return [
            'snapshotId' => $snapshotId,
            'title' => $title,
            'canvasSize' => $canvasSize
        ];
    }

    /**
     * Obtiene la información del lienzo y sus miembros (members.php).
     */
    public function getCanvasMembersData(?string $paramUuid, int $page = 1): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        $canvasUuid = $paramUuid;

        $db = new DatabaseManager();
        $connNameCanvases = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
        $connNameIdentity = defined('\App\Core\System\DatabaseConstants::CONN_IDENTITY') ? \App\Core\System\DatabaseConstants::CONN_IDENTITY : 'identity';

        $canvasId = null;
        $canvasOwnerId = null;
        $pdoCanvases = null;

        if ($canvasUuid) {
            try {
                $pdoCanvases = $db->getConnection($connNameCanvases);
                $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
                $stmt->execute(['uuid' => $canvasUuid]);
                $canvasData = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($canvasData) {
                    $canvasId = (int)$canvasData['id'];
                    $canvasOwnerId = (int)$canvasData['owner_id'];
                }
            } catch (\Throwable $e) {
                Logger::error("getCanvasMembersData canvas query error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        if (!$userId || !$canvasId) {
            return [
                'unauthorized' => true,
                'userId' => $userId,
                'canvasUuid' => $canvasUuid,
                'canvasId' => $canvasId,
                'canvasOwnerId' => $canvasOwnerId,
                'members' => [],
                'memberRoles' => [],
                'userDetails' => [],
                'totalMembers' => 0,
                'page' => 1,
                'totalPages' => 1,
                'prevPageUrl' => '#',
                'nextPageUrl' => '#'
            ];
        }

        $limit = 25;
        if ($page < 1) $page = 1;
        $offset = ($page - 1) * $limit;

        $members = [];
        $memberRoles = [];
        $userDetails = [];
        $totalMembers = 0;

        if ($pdoCanvases) {
            try {
                $stmtCount = $pdoCanvases->prepare("SELECT COUNT(*) FROM canvas_members WHERE canvas_id = :cid");
                $stmtCount->execute(['cid' => $canvasId]);
                $totalMembers = (int)$stmtCount->fetchColumn();

                $stmt = $pdoCanvases->prepare("
                    SELECT user_id, joined_at 
                    FROM canvas_members 
                    WHERE canvas_id = :cid 
                    ORDER BY joined_at DESC 
                    LIMIT {$limit} OFFSET {$offset}
                ");
                $stmt->execute(['cid' => $canvasId]);
                $members = $stmt->fetchAll(\PDO::FETCH_ASSOC);

                if (!empty($members)) {
                    $userIds = array_column($members, 'user_id');
                    $inQuery = implode(',', array_fill(0, count($userIds), '?'));

                    $stmtRoles = $pdoCanvases->prepare("
                        SELECT cur.user_id, r.name, r.is_system, r.weight
                        FROM canvas_user_roles cur
                        JOIN canvas_roles r ON cur.role_id = r.id
                        WHERE cur.canvas_id = ? AND cur.user_id IN ({$inQuery})
                        ORDER BY r.weight DESC, r.name ASC
                    ");
                    $params = array_merge([$canvasId], $userIds);
                    $stmtRoles->execute($params);

                    while ($row = $stmtRoles->fetch(\PDO::FETCH_ASSOC)) {
                        $memberRoles[$row['user_id']][] = $row;
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("getCanvasMembersData roles query error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        if (!empty($members)) {
            try {
                $userIds = array_column($members, 'user_id');
                $pdoIdentity = $db->getConnection($connNameIdentity);

                $inQuery = implode(',', array_fill(0, count($userIds), '?'));
                $stmtUsers = $pdoIdentity->prepare("
                    SELECT u.id, u.uuid, u.username, u.profile_picture, st.color as subscription_color
                    FROM users u
                    LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                    WHERE u.id IN ({$inQuery})
                ");
                $stmtUsers->execute($userIds);

                while ($row = $stmtUsers->fetch(\PDO::FETCH_ASSOC)) {
                    $row['role_bg'] = self::parseSubscriptionColor($row['subscription_color'] ?? null);
                    $userDetails[$row['id']] = $row;
                }
            } catch (\Throwable $e) {
                Logger::error("getCanvasMembersData users query error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        $totalPages = (int)ceil($totalMembers / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) {
            $page = $totalPages;
        }

        $appUrl = defined('APP_URL') ? APP_URL : '';
        $prevPageUrl = $page > 1 ? $appUrl . '/canvases/members/' . $canvasUuid . '?page=' . ($page - 1) : '#';
        $nextPageUrl = $page < $totalPages ? $appUrl . '/canvases/members/' . $canvasUuid . '?page=' . ($page + 1) : '#';

        return [
            'unauthorized' => false,
            'userId' => $userId,
            'canvasUuid' => $canvasUuid,
            'canvasId' => $canvasId,
            'canvasOwnerId' => $canvasOwnerId,
            'members' => $members,
            'memberRoles' => $memberRoles,
            'userDetails' => $userDetails,
            'totalMembers' => $totalMembers,
            'page' => $page,
            'totalPages' => $totalPages,
            'prevPageUrl' => $prevPageUrl,
            'nextPageUrl' => $nextPageUrl,
            'appUrl' => $appUrl
        ];
    }

    /**
     * Auxiliar para parsear colores/gradientes de suscripción.
     */
    public static function parseSubscriptionColor(?string $subscriptionColorRaw): string {
        if (empty($subscriptionColorRaw)) {
            return 'var(--text-muted)';
        }
        $colorData = json_decode($subscriptionColorRaw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($colorData)) {
            return htmlspecialchars($subscriptionColorRaw);
        }

        $firstColorObj = $colorData['colors'][0] ?? null;
        $activeRoleBg = is_string($firstColorObj) ? htmlspecialchars($firstColorObj) : htmlspecialchars($firstColorObj['hex'] ?? 'var(--text-muted)');

        if (($colorData['type'] ?? 'solid') === 'gradient' && count($colorData['colors']) > 1) {
            $angle = (int)($colorData['angle'] ?? 0);
            $stopsArray = [];
            $prevStop = 0;
            $colorsCount = count($colorData['colors']);

            foreach ($colorData['colors'] as $i => $colorObj) {
                $hex = is_string($colorObj) ? $colorObj : ($colorObj['hex'] ?? '#000000');
                $hex = htmlspecialchars($hex);
                $percentage = is_array($colorObj) && isset($colorObj['percentage']) ? (int)$colorObj['percentage'] : floor(100 / $colorsCount);

                $endStop = $prevStop + $percentage;
                if ($i === $colorsCount - 1) $endStop = 100;
                $stopsArray[] = "{$hex} {$prevStop}% {$endStop}%";
                $prevStop = $endStop;
            }
            $activeRoleBg = "conic-gradient(from {$angle}deg, " . implode(', ', $stopsArray) . ")";
        }
        return $activeRoleBg;
    }

    /**
     * Obtiene y procesa los datos para la vista de edición de lienzo (workspace/edit.php).
     */
    public function getWorkspaceEditData(?string $canvasUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $activeAccountId = $_SESSION['active_account'] ?? null;
        $linkedAccounts = $_SESSION['accounts'] ?? [];
        $tier = 0;
        if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
            $tier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
        }

        $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
        $maxMembers = $planLimits['max_members_per_canvas'] === -1 ? 50000 : $planLimits['max_members_per_canvas'];
        $hasLiveChat = SubscriptionPlanConstants::hasFeature($tier, 'chat_restriction') || SubscriptionPlanConstants::hasFeature($tier, 'allow_live_chat') || !empty($planLimits['allow_live_chat']) || !empty($planLimits['feat_chat_restriction']);

        $canvasId = null;
        $cName = '';
        $cDesc = '';
        $cSize = '64';
        $cPrivacy = 'private';
        $cApproval = 0;
        $cPalette = 'default';
        $cBatch = 5;
        $cCooldown = 10;
        $cLimit = 10;
        $cAllowPurchases = 1;
        $cAllowChat = 0;
        $canCreateOfficial = false;
        $cOfficial = false;
        $cTags = [];

        if ($canvasUuid) {
            try {
                $db = new DatabaseManager();
                $pdo = $db->getConnection(defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases');
                $stmt = $pdo->prepare("SELECT * FROM canvases WHERE uuid = :uuid LIMIT 1");
                $stmt->execute(['uuid' => $canvasUuid]);
                $canvasData = $stmt->fetch(\PDO::FETCH_ASSOC);

                if ($canvasData) {
                    $canvasId = (int)$canvasData['id'];
                    $cName = htmlspecialchars($canvasData['name'] ?? '');
                    $cSize = htmlspecialchars($canvasData['size'] ?? '64');
                    $cPrivacy = $canvasData['privacy'] ?? 'private';
                    $cApproval = (int)($canvasData['requires_approval'] ?? 0);
                    $cPalette = htmlspecialchars($canvasData['palette_id'] ?? 'default');
                    $cBatch = (int)($canvasData['cooldown_pixels_batch'] ?? 5);
                    $cCooldown = (int)($canvasData['cooldown_seconds'] ?? 10);
                    $cLimit = (int)($canvasData['max_participants'] ?? 10);
                    $cAllowPurchases = (int)($canvasData['allow_purchases'] ?? 1);
                    $cAllowChat = (int)($canvasData['allow_chat'] ?? 0);
                    
                    $userPerms = $_SESSION['user_permissions'] ?? [];
                    $canCreateOfficial = in_array(PermissionsConstants::CANVASES_CREATE_OFFICIAL, $userPerms);
                    $cOfficial = (bool)($canvasData['is_official'] ?? 0);

                    if (!empty($canvasData['tags'])) {
                        $cTags = json_decode($canvasData['tags'], true) ?? [];
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("getWorkspaceEditData canvas query error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        return [
            'canvasId' => $canvasId,
            'tier' => $tier,
            'planLimits' => $planLimits,
            'maxMembers' => $maxMembers,
            'hasLiveChat' => $hasLiveChat,
            'cName' => $cName,
            'cDesc' => $cDesc,
            'cSize' => $cSize,
            'cPrivacy' => $cPrivacy,
            'cApproval' => $cApproval,
            'cPalette' => $cPalette,
            'cBatch' => $cBatch,
            'cCooldown' => $cCooldown,
            'cLimit' => $cLimit,
            'cAllowPurchases' => $cAllowPurchases,
            'cAllowChat' => $cAllowChat,
            'canCreateOfficial' => $canCreateOfficial,
            'cOfficial' => $cOfficial,
            'cTags' => $cTags
        ];
    }

    /**
     * Obtiene los datos de la vista de reinicio de lienzo (workspace/reset.php).
     */
    public function getWorkspaceResetData(?string $canvasUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $canvasId = null;
        $resetSettings = [
            'is_active' => false,
            'next_reset_at' => null,
            'take_snapshot' => true,
        ];
        $canTakeSnapshot = true;
        $maxSnapshots = -1;
        $currentSnapshots = 0;

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        $userPermissions = $_SESSION['user_permissions'] ?? [];
        $canManageOfficial = in_array(PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $userPermissions);

        if ($canvasUuid && $userId) {
            try {
                $db = new DatabaseManager();
                $pdo = $db->getConnection(defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases');

                $tblCanvases = defined('\App\Core\System\DatabaseConstants::TBL_CANVASES') ? \App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';
                $stmt = $pdo->prepare('SELECT id, owner_id FROM ' . $tblCanvases . ' WHERE uuid = :uuid LIMIT 1');
                $stmt->execute(['uuid' => $canvasUuid]);
                $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

                if ($canvas) {
                    $isOwner = ((int)$canvas['owner_id'] === (int)$userId)
                        || ($canvas['owner_id'] === null && $canManageOfficial);

                    if ($isOwner) {
                        $canvasId = (int)$canvas['id'];

                        $stmtSettings = $pdo->prepare('SELECT is_active, next_reset_at, take_snapshot FROM canvas_reset_settings WHERE canvas_id = :cid LIMIT 1');
                        $stmtSettings->execute(['cid' => $canvasId]);
                        $row = $stmtSettings->fetch(\PDO::FETCH_ASSOC);

                        if ($row) {
                            $resetSettings['is_active'] = (bool)$row['is_active'];
                            $resetSettings['next_reset_at'] = $row['next_reset_at'];
                            $resetSettings['take_snapshot'] = (bool)$row['take_snapshot'];
                        }

                        if ($canvas['owner_id'] !== null) {
                            try {
                                $dbIdentityManager = new DatabaseManager();
                                $roleRepo = new \App\Core\Repositories\RoleRepository($dbIdentityManager, new \App\Config\Database\RedisCache());
                                $userRepo = new \App\Core\Repositories\UserRepository($dbIdentityManager, $roleRepo);
                                $uRow = $userRepo->findById($canvas['owner_id']);
                                $ownerTier = $uRow ? (int)$uRow['subscription_tier'] : 0;
                            } catch (\Throwable $e) {
                                $ownerTier = 0;
                            }
                            $planLimits = SubscriptionPlanConstants::getTierLimits($ownerTier);
                            $maxSnapshots = $planLimits['max_snapshots_per_canvas'];
                        }

                        $stmtSnapCount = $pdo->prepare('SELECT COUNT(*) FROM canvas_snapshots_history WHERE canvas_id = :cid');
                        $stmtSnapCount->execute(['cid' => $canvasId]);
                        $currentSnapshots = (int)$stmtSnapCount->fetchColumn();

                        $canTakeSnapshot = ($maxSnapshots === -1 || $currentSnapshots < $maxSnapshots);
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("getWorkspaceResetData query error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        $monthShort = [
            __('month_jan'), __('month_feb'), __('month_mar'), __('month_apr'),
            __('month_may'), __('month_jun'), __('month_jul'), __('month_aug'),
            __('month_sep'), __('month_oct'), __('month_nov'), __('month_dec'),
        ];

        $resetDateLocal = '';
        $resetDateDisplay = __('lbl_select_date');

        if (!empty($resetSettings['next_reset_at'])) {
            try {
                $dt = new \DateTime($resetSettings['next_reset_at']);
                $resetDateLocal = $dt->format('Y-m-d\TH:i');
                $monthIndex = (int)$dt->format('n') - 1;
                $monthStr = $monthShort[$monthIndex] ?? $dt->format('M');
                $resetDateDisplay = $dt->format('d') . ' ' . $monthStr . ' ' . $dt->format('Y, H:i');
            } catch (\Throwable $e) {}
        }

        return [
            'canvasId' => $canvasId,
            'canvasUuid' => $canvasUuid,
            'resetSettings' => $resetSettings,
            'maxSnapshots' => $maxSnapshots,
            'currentSnapshots' => $currentSnapshots,
            'canTakeSnapshot' => $canTakeSnapshot,
            'monthShort' => $monthShort,
            'resetDateLocal' => $resetDateLocal,
            'resetDateDisplay' => $resetDateDisplay
        ];
    }

    /**
     * Obtiene los datos de la vista de redimensionado de lienzo (workspace/resize.php).
     */
    public function getWorkspaceResizeData(?string $canvasUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        if (!$userId) {
            return ['error' => __('err_unauthorized')];
        }

        if (!$canvasUuid) {
            return ['error' => __('err_unspecified_canvas')];
        }

        $userPermissions = $_SESSION['user_permissions'] ?? [];
        $canManageOfficial = in_array(PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $userPermissions);

        $db = new DatabaseManager();
        $pdo = $db->getConnection(defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases');
        $tblCanvases = defined('\App\Core\System\DatabaseConstants::TBL_CANVASES') ? \App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';

        $stmt = $pdo->prepare('SELECT id, uuid, name, size, owner_id FROM ' . $tblCanvases . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $canvasUuid]);
        $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$canvas) {
            return ['error' => __('err_canvas_not_found')];
        }

        $isOwner = ((int)$canvas['owner_id'] === (int)$userId) || ($canvas['owner_id'] === null && $canManageOfficial) || $canManageOfficial;
        if (!$isOwner) {
            return ['error' => __('err_unauthorized')];
        }

        $canvasId = (int)$canvas['id'];
        $resizeSettings = [
            'is_active' => false,
            'next_resize_at' => null,
            'target_size' => '64x64',
        ];

        try {
            $stmtSettings = $pdo->prepare('SELECT is_active, next_resize_at, target_size FROM canvas_resize_settings WHERE canvas_id = :cid LIMIT 1');
            $stmtSettings->execute(['cid' => $canvasId]);
            $row = $stmtSettings->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                $resizeSettings['is_active'] = (bool)$row['is_active'];
                $resizeSettings['next_resize_at'] = $row['next_resize_at'];
                $resizeSettings['target_size'] = $row['target_size'] ?? '64x64';
            }
        } catch (\Throwable $e) {
            Logger::error("getWorkspaceResizeData settings query error: " . $e->getMessage(), ['exception' => $e]);
        }

        $sizesList = Utils::getCanvasSizes();
        $currentSizeRaw = (string)$canvas['size'];

        if (!str_contains($currentSizeRaw, 'x') && is_numeric($currentSizeRaw)) {
            $currentSizeRaw = $currentSizeRaw . 'x' . $currentSizeRaw;
        }

        if (!isset($sizesList[$currentSizeRaw])) {
            $sizesList[$currentSizeRaw] = ['label' => $currentSizeRaw, 'icon' => 'crop_square'];
        }

        $scheduledSize = $resizeSettings['target_size'];
        if (!isset($sizesList[$scheduledSize])) {
            $sizesList[$scheduledSize] = ['label' => $scheduledSize, 'icon' => 'crop_square'];
        }

        $instantSize = $currentSizeRaw;
        $scheduledMeta = $sizesList[$scheduledSize];
        $instantMeta = $sizesList[$instantSize];
        $isResizeActive = $resizeSettings['is_active'];

        $monthShort = [
            __('month_jan'), __('month_feb'), __('month_mar'), __('month_apr'),
            __('month_may'), __('month_jun'), __('month_jul'), __('month_aug'),
            __('month_sep'), __('month_oct'), __('month_nov'), __('month_dec'),
        ];

        $resizeDateLocal = '';
        $resizeDateDisplay = __('lbl_select_date');

        if (!empty($resizeSettings['next_resize_at'])) {
            try {
                $dt = new \DateTime($resizeSettings['next_resize_at']);
                $resizeDateLocal = $dt->format('Y-m-d\TH:i');
                $monthIndex = (int)$dt->format('n') - 1;
                $monthStr = $monthShort[$monthIndex] ?? $dt->format('M');
                $resizeDateDisplay = $dt->format('d') . ' ' . $monthStr . ' ' . $dt->format('Y, H:i');
            } catch (\Throwable $e) {}
        }

        $ownerTier = 0;
        if ($canvas['owner_id'] !== null) {
            try {
                $dbIdentityManager = new DatabaseManager();
                $roleRepo = new \App\Core\Repositories\RoleRepository($dbIdentityManager, new \App\Config\Database\RedisCache());
                $userRepo = new \App\Core\Repositories\UserRepository($dbIdentityManager, $roleRepo);
                $uRow = $userRepo->findById($canvas['owner_id']);
                if ($uRow) {
                    $ownerTier = (int)$uRow['subscription_tier'];
                }
            } catch (\Throwable $e) {}
        }

        return [
            'error' => null,
            'canvas' => $canvas,
            'canvasId' => $canvasId,
            'canvasUuid' => $canvasUuid,
            'canManageOfficial' => $canManageOfficial,
            'ownerTier' => $ownerTier,
            'resizeSettings' => $resizeSettings,
            'sizesList' => $sizesList,
            'currentSizeRaw' => $currentSizeRaw,
            'scheduledSize' => $scheduledSize,
            'instantSize' => $instantSize,
            'scheduledMeta' => $scheduledMeta,
            'instantMeta' => $instantMeta,
            'isResizeActive' => $isResizeActive,
            'monthShort' => $monthShort,
            'resizeDateLocal' => $resizeDateLocal,
            'resizeDateDisplay' => $resizeDateDisplay
        ];
    }

    /**
     * Obtiene los roles de un lienzo (team/roles.php).
     */
    public function getCanvasRolesData(?string $canvasUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        if (!$userId || !$canvasUuid) {
            return ['error' => __('err_unauthorized_or_missing_id')];
        }

        $db = new DatabaseManager();
        $connNameCanvases = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
        $pdoCanvases = $db->getConnection($connNameCanvases);

        $canvasId = null;
        $canvasOwnerId = null;
        try {
            $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
            $stmt->execute(['uuid' => $canvasUuid]);
            $canvasData = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($canvasData) {
                $canvasId = (int)$canvasData['id'];
                $canvasOwnerId = (int)$canvasData['owner_id'];
            }
        } catch (\Throwable $e) {}

        if (!$canvasId) {
            return ['error' => __('err_canvas_not_found')];
        }

        $ownerTier = 0;
        if ($canvasOwnerId !== null) {
            try {
                $connNameIdentity = defined('\App\Core\System\DatabaseConstants::CONN_IDENTITY') ? \App\Core\System\DatabaseConstants::CONN_IDENTITY : 'identity';
                $pdoIdentity = $db->getConnection($connNameIdentity);
                $stmtUser = $pdoIdentity->prepare("SELECT subscription_tier FROM users WHERE id = :uid LIMIT 1");
                $stmtUser->execute(['uid' => $canvasOwnerId]);
                $tierVal = $stmtUser->fetchColumn();
                if ($tierVal !== false) {
                    $ownerTier = (int)$tierVal;
                }
            } catch (\Throwable $e) {}
        }

        $isAdmin = in_array(PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $_SESSION['user_permissions'] ?? []);
        $hasAdvancedRoles = SubscriptionPlanConstants::hasFeature($ownerTier, 'advanced_roles');
        if (!$hasAdvancedRoles) {
            return ['error' => __('err_plan_custom_roles')];
        }

        $roles = [];
        try {
            $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE canvas_id IS NULL OR canvas_id = :cid ORDER BY weight DESC");
            $stmt->execute(['cid' => $canvasId]);
            $roles = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getCanvasRolesData roles query error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'error' => null,
            'userId' => $userId,
            'canvasUuid' => $canvasUuid,
            'canvasId' => $canvasId,
            'canvasOwnerId' => $canvasOwnerId,
            'ownerTier' => $ownerTier,
            'isAdmin' => $isAdmin,
            'roles' => $roles
        ];
    }

    /**
     * Obtiene los datos para cambiar el rol de un miembro (team/change-role.php).
     */
    public function getCanvasChangeRoleData(?string $canvasUuid, ?string $targetUserUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        if (!$userId || !$canvasUuid || !$targetUserUuid) {
            return ['error' => __('err_unauthorized_or_missing_id')];
        }

        $db = new DatabaseManager();
        $connNameCanvases = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
        $connNameIdentity = defined('\App\Core\System\DatabaseConstants::CONN_IDENTITY') ? \App\Core\System\DatabaseConstants::CONN_IDENTITY : 'identity';

        $targetUserId = null;
        $targetUsername = '';
        $targetAvatar = defined('APP_URL') ? APP_URL . '/public/assets/img/fallbacks/avatar-default.png' : '';
        $targetSubscriptionColor = null;

        try {
            $pdoIdentity = $db->getConnection($connNameIdentity);
            $stmtUser = $pdoIdentity->prepare("
                SELECT u.id, u.username, u.profile_picture, st.color as subscription_color 
                FROM users u
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                WHERE u.uuid = :uuid LIMIT 1
            ");
            $stmtUser->execute(['uuid' => $targetUserUuid]);
            $userData = $stmtUser->fetch(\PDO::FETCH_ASSOC);

            if ($userData) {
                $targetUserId = (int)$userData['id'];
                $targetUsername = !empty($userData['username']) ? $userData['username'] : (__('user') ?: 'User') . ' #' . $targetUserId;
                if (!empty($userData['profile_picture'])) {
                    $targetAvatar = $userData['profile_picture'];
                }
                $targetSubscriptionColor = self::parseSubscriptionColor($userData['subscription_color'] ?? null);
            } else {
                return ['error' => __('err_invalid_user')];
            }
        } catch (\Throwable $e) {
            Logger::error("getCanvasChangeRoleData identity error: " . $e->getMessage(), ['exception' => $e]);
            return ['error' => __('err_identity_conn')];
        }

        $canvasId = null;
        $canvasOwnerId = null;
        $isOwner = false;
        $targetCurrentRoles = [];

        try {
            $pdoCanvases = $db->getConnection($connNameCanvases);
            $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
            $stmt->execute(['uuid' => $canvasUuid]);
            $canvasData = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($canvasData) {
                $canvasId = (int)$canvasData['id'];
                $canvasOwnerId = (int)$canvasData['owner_id'];

                $ownerTier = 0;
                if ($canvasOwnerId !== null) {
                    try {
                        $stmtUserTier = $pdoIdentity->prepare("SELECT subscription_tier FROM users WHERE id = :uid LIMIT 1");
                        $stmtUserTier->execute(['uid' => $canvasOwnerId]);
                        $tierVal = $stmtUserTier->fetchColumn();
                        if ($tierVal !== false) {
                            $ownerTier = (int)$tierVal;
                        }
                    } catch (\Throwable $e) {}
                }

                $isAdmin = in_array(PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $_SESSION['user_permissions'] ?? []);

                $hasAdvancedRoles = SubscriptionPlanConstants::hasFeature($ownerTier, 'advanced_roles');
                if (!$hasAdvancedRoles) {
                    return ['error' => __('err_plan_custom_roles')];
                }

                if ($canvasData['owner_id'] == $targetUserId) {
                    $isOwner = true;
                }

                $stmtMember = $pdoCanvases->prepare("SELECT role_id FROM canvas_user_roles WHERE canvas_id = :cid AND user_id = :uid");
                $stmtMember->execute(['cid' => $canvasId, 'uid' => $targetUserId]);
                $memberRoles = $stmtMember->fetchAll(\PDO::FETCH_COLUMN);

                if (!empty($memberRoles)) {
                    $targetCurrentRoles = array_map('intval', $memberRoles);
                } else {
                    if ($isOwner) {
                        $targetCurrentRoles = [-1];
                    } else {
                        return ['error' => __('err_user_not_member')];
                    }
                }
            } else {
                return ['error' => __('err_canvas_not_found')];
            }
        } catch (\Throwable $e) {
            Logger::error("getCanvasChangeRoleData membership error: " . $e->getMessage(), ['exception' => $e]);
            return ['error' => __('err_internal_membership')];
        }

        $availableRoles = [];
        try {
            $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE canvas_id IS NULL OR canvas_id = :cid ORDER BY weight DESC");
            $stmt->execute(['cid' => $canvasId]);
            $availableRoles = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getCanvasChangeRoleData availableRoles error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'error' => null,
            'canvasId' => $canvasId,
            'canvasUuid' => $canvasUuid,
            'targetUserId' => $targetUserId,
            'targetUserUuid' => $targetUserUuid,
            'targetUsername' => $targetUsername,
            'targetAvatar' => $targetAvatar,
            'targetSubscriptionColor' => $targetSubscriptionColor,
            'isOwner' => $isOwner,
            'targetCurrentRoles' => $targetCurrentRoles,
            'availableRoles' => $availableRoles,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Obtiene los datos para la vista de restricciones de chat (team/chat-restriction.php).
     */
    public function getCanvasChatRestrictionData(?string $canvasUuid, ?string $targetUserUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (empty($canvasUuid) || empty($targetUserUuid)) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . '/'];
        }

        $userId = $_SESSION['active_account'] ?? $_SESSION['user_id'] ?? null;
        $db = new DatabaseManager();
        $pdo = $db->getConnection(defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases');

        $stmt = $pdo->prepare("SELECT id, owner_id as user_id FROM canvases WHERE uuid = :uuid OR id = :uuid LIMIT 1");
        $stmt->execute(['uuid' => $canvasUuid]);
        $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$canvas || (int)$canvas['user_id'] !== (int)$userId) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . '/'];
        }

        $redis = new \App\Config\Database\RedisCache();
        $roleRepo = new \App\Core\Repositories\RoleRepository($db, $redis);
        $userRepo = new \App\Core\Repositories\UserRepository($db, $roleRepo);
        $targetUser = $userRepo->findById($targetUserUuid);

        if (!$targetUser) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/canvases/manage/{$canvasUuid}"];
        }

        $canvasId = (int)$canvas['id'];
        $targetUserId = (int)$targetUser['id'];

        $stmt = $pdo->prepare("SELECT * FROM canvas_chat_restrictions WHERE canvas_id = ? AND user_id = ?");
        $stmt->execute([$canvasId, $targetUserId]);
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
            'canvas' => $canvas,
            'canvasId' => $canvasId,
            'canvasUuid' => $canvasUuid,
            'targetUser' => $targetUser,
            'targetUserId' => $targetUserId,
            'targetUserUuid' => $targetUserUuid,
            'restriction' => $restriction,
            'initialState' => $initialState,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Obtiene las invitaciones de un lienzo (team/invites.php & team/invites-generate.php).
     */
    public function getCanvasInvitesData(?string $canvasUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        $db = new DatabaseManager();
        $connNameCanvases = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';

        $canvasId = null;
        $canvasOwnerId = null;
        $pdoCanvases = null;

        if ($canvasUuid) {
            try {
                $pdoCanvases = $db->getConnection($connNameCanvases);
                $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
                $stmt->execute(['uuid' => $canvasUuid]);
                $canvasData = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($canvasData) {
                    $canvasId = (int)$canvasData['id'];
                    $canvasOwnerId = isset($canvasData['owner_id']) ? (int)$canvasData['owner_id'] : null;
                }
            } catch (\Throwable $e) {
                Logger::error("getCanvasInvitesData canvas query error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        if (!$userId || !$canvasId) {
            return ['error' => __('err_canvas_not_found_or_no_access')];
        }

        if ((int)$userId !== $canvasOwnerId) {
            $userPerms = $_SESSION['user_permissions'] ?? $_SESSION['permissions'] ?? [];
            $isAdmin = is_array($userPerms) && in_array(PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $userPerms);
            if (!$isAdmin || $canvasOwnerId !== null) {
                return ['error' => __('err_unauthorized')];
            }
        }

        $invites = [];
        try {
            $stmt = $pdoCanvases->prepare("
                SELECT * 
                FROM canvas_invites 
                WHERE canvas_id = :cid 
                ORDER BY created_at DESC
            ");
            $stmt->execute(['cid' => $canvasId]);
            $invites = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("getCanvasInvitesData invites query error: " . $e->getMessage(), ['exception' => $e]);
        }

        return [
            'error' => null,
            'userId' => $userId,
            'canvasId' => $canvasId,
            'canvasUuid' => $canvasUuid,
            'canvasOwnerId' => $canvasOwnerId,
            'invites' => $invites,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Obtiene las solicitudes de acceso pendientes a un lienzo (team/requests.php).
     */
    public function getCanvasRequestsData(?string $canvasUuid): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        if (!$userId) {
            return ['error' => __('err_unauthorized')];
        }

        $canvasId = null;
        $pendingRequests = [];

        if ($canvasUuid) {
            try {
                $db = new DatabaseManager();
                $pdo = $db->getConnection(defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases');

                $stmt = $pdo->prepare("SELECT id FROM canvases WHERE uuid = :uuid LIMIT 1");
                $stmt->execute(['uuid' => $canvasUuid]);
                $canvasId = (int)$stmt->fetchColumn();

                if ($canvasId) {
                    $stmtReq = $pdo->prepare("SELECT id, user_id, status, created_at FROM canvas_access_requests WHERE canvas_id = :cid AND status = 'pending' ORDER BY created_at ASC");
                    $stmtReq->execute(['cid' => $canvasId]);
                    $pendingRequests = $stmtReq->fetchAll(\PDO::FETCH_ASSOC);
                }
            } catch (\Throwable $e) {
                Logger::error("getCanvasRequestsData error: " . $e->getMessage(), ['exception' => $e]);
            }
        }

        if (!$canvasId) {
            return ['error' => __('err_invalid_canvas_id')];
        }

        return [
            'error' => null,
            'canvasId' => $canvasId,
            'canvasUuid' => $canvasUuid,
            'pendingRequests' => $pendingRequests,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Obtiene los datos del creador/editor de roles de lienzo (team/role-builder.php).
     */
    public function getCanvasRoleBuilderData(?string $canvasUuid, ?int $roleId): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        if (!$userId || !$canvasUuid) {
            return ['error' => __('err_unauthorized_or_missing_id')];
        }

        $db = new DatabaseManager();
        $connNameCanvases = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
        $pdoCanvases = $db->getConnection($connNameCanvases);

        $canvasId = null;
        $canvasOwnerId = null;

        try {
            $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
            $stmt->execute(['uuid' => $canvasUuid]);
            $canvasData = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($canvasData) {
                $canvasId = (int)$canvasData['id'];
                $canvasOwnerId = (int)$canvasData['owner_id'];
            }
        } catch (\Throwable $e) {}

        if (!$canvasId) {
            return ['error' => __('err_canvas_not_found')];
        }

        $ownerTier = 0;
        if ($canvasOwnerId !== null) {
            try {
                $connNameIdentity = defined('\App\Core\System\DatabaseConstants::CONN_IDENTITY') ? \App\Core\System\DatabaseConstants::CONN_IDENTITY : 'identity';
                $pdoIdentity = $db->getConnection($connNameIdentity);
                $stmtUser = $pdoIdentity->prepare("SELECT subscription_tier FROM users WHERE id = :uid LIMIT 1");
                $stmtUser->execute(['uid' => $canvasOwnerId]);
                $tierVal = $stmtUser->fetchColumn();
                if ($tierVal !== false) {
                    $ownerTier = (int)$tierVal;
                }
            } catch (\Throwable $e) {}
        }

        $isAdmin = in_array(PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $_SESSION['user_permissions'] ?? []);

        $hasAdvancedRoles = SubscriptionPlanConstants::hasFeature($ownerTier, 'advanced_roles');
        if (!$hasAdvancedRoles) {
            return ['error' => __('err_plan_custom_roles')];
        }

        $isEdit = false;
        $roleData = [
            'id' => 0,
            'name' => '',
            'weight' => 10,
            'is_system' => 0
        ];

        if ($roleId) {
            try {
                $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE id = :id AND (canvas_id = :cid OR canvas_id IS NULL)");
                $stmt->execute(['id' => $roleId, 'cid' => $canvasId]);
                $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($row) {
                    $isEdit = true;
                    $roleData = $row;
                }
            } catch (\Throwable $e) {}
        }

        return [
            'error' => null,
            'canvasId' => $canvasId,
            'canvasUuid' => $canvasUuid,
            'canvasOwnerId' => $canvasOwnerId,
            'ownerTier' => $ownerTier,
            'isAdmin' => $isAdmin,
            'isEdit' => $isEdit,
            'roleId' => $roleId,
            'roleData' => $roleData
        ];
    }

    /**
     * Obtiene los permisos de un rol de lienzo (team/role-permissions.php).
     */
    public function getCanvasRolePermissionsData(?string $canvasUuid, ?int $roleId): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
        if (!$userId || !$canvasUuid || !$roleId) {
            return ['redirect' => (defined('APP_URL') ? APP_URL : '') . "/canvases/manage/roles/" . ($canvasUuid ?? '')];
        }

        $db = new DatabaseManager();
        $connNameCanvases = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
        $pdoCanvases = $db->getConnection($connNameCanvases);

        $canvasId = null;
        $canvasOwnerId = null;
        try {
            $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
            $stmt->execute(['uuid' => $canvasUuid]);
            $canvasData = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($canvasData) {
                $canvasId = (int)$canvasData['id'];
                $canvasOwnerId = (int)$canvasData['owner_id'];
            }
        } catch (\Throwable $e) {}

        if (!$canvasId) {
            return ['error' => __('err_canvas_not_found')];
        }

        $ownerTier = 0;
        if ($canvasOwnerId !== null) {
            try {
                $connNameIdentity = defined('\App\Core\System\DatabaseConstants::CONN_IDENTITY') ? \App\Core\System\DatabaseConstants::CONN_IDENTITY : 'identity';
                $pdoIdentity = $db->getConnection($connNameIdentity);
                $stmtUser = $pdoIdentity->prepare("SELECT subscription_tier FROM users WHERE id = :uid LIMIT 1");
                $stmtUser->execute(['uid' => $canvasOwnerId]);
                $tierVal = $stmtUser->fetchColumn();
                if ($tierVal !== false) {
                    $ownerTier = (int)$tierVal;
                }
            } catch (\Throwable $e) {}
        }

        $isAdmin = in_array(PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $_SESSION['user_permissions'] ?? []);
        $hasAdvancedRoles = SubscriptionPlanConstants::hasFeature($ownerTier, 'advanced_roles');
        if (!$hasAdvancedRoles) {
            return ['error' => __('err_plan_custom_roles')];
        }

        $roleData = null;
        $rolePermissions = [];
        try {
            $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE id = :id AND (canvas_id = :cid OR canvas_id IS NULL)");
            $stmt->execute(['id' => $roleId, 'cid' => $canvasId]);
            $roleData = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($roleData) {
                $stmtPerms = $pdoCanvases->prepare("SELECT permission_id FROM canvas_role_permissions WHERE role_id = :rid");
                $stmtPerms->execute(['rid' => $roleId]);
                $rolePermissions = $stmtPerms->fetchAll(\PDO::FETCH_COLUMN);
            }
        } catch (\Throwable $e) {}

        if (!$roleData) {
            return ['error' => __('err_role_not_found')];
        }

        $allPermissions = [];
        try {
            $stmtAll = $pdoCanvases->prepare("SELECT * FROM canvas_permissions ORDER BY id ASC");
            $stmtAll->execute();
            $allPermissions = $stmtAll->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {}

        return [
            'redirect' => null,
            'error' => null,
            'canvasId' => $canvasId,
            'canvasUuid' => $canvasUuid,
            'canvasOwnerId' => $canvasOwnerId,
            'ownerTier' => $ownerTier,
            'isAdmin' => $isAdmin,
            'roleId' => $roleId,
            'roleData' => $roleData,
            'rolePermissions' => $rolePermissions,
            'allPermissions' => $allPermissions,
            'appUrl' => defined('APP_URL') ? APP_URL : ''
        ];
    }

    /**
     * Obtiene los adjuntos y datos de visor para adjuntos de chat (chat/chat-viewer.php).
     */
    public function getCanvasChatViewerData(?string $canvasUuid, ?string $msgIdRaw, int $idx = 0): array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $msgId = (int)$msgIdRaw;
        $isPending = (strpos((string)$msgIdRaw, 'pending_') === 0);

        $hasAccess = false;
        $attachments = [];
        $errorMsg = null;

        $userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;

        if ($userId && !empty($canvasUuid) && ($msgId > 0 || $isPending)) {
            try {
                $dbManager = new DatabaseManager();
                $dbConnName = defined('\App\Core\System\DatabaseConstants::CONN_CANVASES') ? \App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
                $pdo = $dbManager->getConnection($dbConnName);

                $tblCanvases = defined('\App\Core\System\DatabaseConstants::TBL_CANVASES') ? \App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';
                $stmt = $pdo->prepare("SELECT id, privacy, owner_id FROM " . $tblCanvases . " WHERE uuid = ?");
                $stmt->execute([$canvasUuid]);
                $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

                if ($canvas) {
                    $canvasId = (int)$canvas['id'];
                    if ($canvas['privacy'] !== 'private' || (int)$canvas['owner_id'] === (int)$userId) {
                        $hasAccess = true;
                    } else {
                        $stmtRoles = $pdo->prepare("SELECT id FROM canvas_user_roles WHERE canvas_id = ? AND user_id = ? LIMIT 1");
                        $stmtRoles->execute([$canvasId, $userId]);
                        if ($stmtRoles->fetch()) {
                            $hasAccess = true;
                        }
                    }
                }

                if ($hasAccess) {
                    if ($isPending) {
                        $attachments = [];
                    } else {
                        $stmtMsg = $pdo->prepare("SELECT attachments FROM canvas_chat_messages WHERE id = ? AND canvas_id = ?");
                        $stmtMsg->execute([$msgId, $canvasId]);
                        $msg = $stmtMsg->fetch(\PDO::FETCH_ASSOC);
                        if ($msg && !empty($msg['attachments'])) {
                            $decoded = is_string($msg['attachments']) ? json_decode($msg['attachments'], true) : $msg['attachments'];
                            if (is_array($decoded)) {
                                foreach ($decoded as $att) {
                                    if (strpos($att, '/public/') === 0) {
                                        $attachments[] = $att;
                                    } else {
                                        $attachments[] = '/api/index.php?route=chat.attachment&canvas_uuid=' . $canvasUuid . '&file=' . urlencode(basename($att));
                                    }
                                }
                            }
                        } else {
                            $errorMsg = __('err_msg_no_attachments');
                        }
                    }
                } else {
                    $errorMsg = __('err_no_permission_images');
                }
            } catch (\Throwable $e) {
                Logger::error("getCanvasChatViewerData error: " . $e->getMessage(), ['exception' => $e]);
                $errorMsg = __('err_load_image');
            }
        } else {
            $errorMsg = __('err_invalid_params');
        }

        $totalImages = count($attachments);
        if ($idx < 0 || $idx >= $totalImages) $idx = 0;
        $attachmentsJson = json_encode($attachments);

        return [
            'hasAccess' => $hasAccess,
            'attachments' => $attachments,
            'attachmentsJson' => $attachmentsJson,
            'totalImages' => $totalImages,
            'idx' => $idx,
            'errorMsg' => $errorMsg
        ];
    }
}
