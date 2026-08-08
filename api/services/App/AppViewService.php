<?php
namespace App\Api\Services\App;

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\Helpers\Utils;
use PDO;
use Exception;
use App\Core\System\StorePackagesConfig;
use App\Core\System\SubscriptionPlanConstants;
use App\Core\System\SubscriptionFeatureConfig;
use App\Core\System\Logger;

class AppViewService {

    /**

     */
    public function getStoreCoinsData(): array {
        if (class_exists(StorePackagesConfig::class) && method_exists(StorePackagesConfig::class, 'getCoinPackages')) {
            try {
                $packages = StorePackagesConfig::getCoinPackages();
                return is_array($packages) ? $packages : [];
            } catch (\Throwable $e) {
                Logger::error("Error loading store coin packages: " . $e->getMessage(), ['exception' => $e]);
                return [];
            }
        }
        return [];
    }

    /**
     * Obtiene los paquetes de contenido/ventajas para la vista store-content.
     */
    public function getStoreContentData(): array {
        if (class_exists(StorePackagesConfig::class) && method_exists(StorePackagesConfig::class, 'getContentPackages')) {
            try {
                $packages = StorePackagesConfig::getContentPackages();
                return is_array($packages) ? $packages : [];
            } catch (\Throwable $e) {
                Logger::error("Error loading store content packages: " . $e->getMessage(), ['exception' => $e]);
                return [];
            }
        }
        return [];
    }

    /**
     * Formatea capacidad de almacenamiento en MB a formato legible.
     */
    public static function formatStorage(int $mb): string {
        if ($mb >= 1024) return number_format($mb / 1024, 0) . ' GB';
        return $mb . ' MB';
    }

    /**

     */
    public function getUpgradePageData(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $activeAccountId = $_SESSION['active_account'] ?? null;
        $linkedAccounts  = $_SESSION['accounts'] ?? [];
        $currentUserTier = 0;
        if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
            $currentUserTier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
        }

        

        $allTiers = array_filter(
            SubscriptionPlanConstants::getAllTiers(),
            fn($t) => $t['tier_level'] > 0 && (isset($t['is_active']) ? (int)$t['is_active'] === 1 : true)
        );

        $availableFeatures = SubscriptionFeatureConfig::getAvailableFeatures();
        $rowsToCompare = [
            [
                'label' => __('plan_limit_canvases'),
                'desc' => __('plan_limit_canvases_desc', 'Proyectos simultáneos'),
                'icon' => 'dashboard',
                'values_fn' => function($t) {
                    return $t['max_canvases'] == -1 ? __('plan_limit_unlimited') : $t['max_canvases'] . ' ' . __('plan_limit_canvases');
                }
            ],
            [
                'label' => __('plan_limit_capturas', 'Capturas'),
                'desc' => __('plan_limit_capturas_desc'),
                'icon' => 'history',
                'values_fn' => function($t) {
                    return $t['max_snapshots_per_canvas'] == -1 ? __('plan_limit_unlimited', 'Ilimitado') : $t['max_snapshots_per_canvas'] . ' ' . __('plan_limit_capturas', 'Capturas');
                }
            ],
            [
                'label' => __('plan_limit_members', 'Miembros'),
                'desc' => __('plan_limit_members_desc'),
                'icon' => 'group',
                'values_fn' => function($t) {
                    return $t['max_members_per_canvas'] == -1 ? __('plan_limit_unlimited', 'Ilimitados') : number_format($t['max_members_per_canvas']) . ' ' . __('plan_limit_members', 'Miembros');
                }
            ],
            [
                'label' => __('lbl_storage', 'Almacenamiento'),
                'desc' => __('plan_storage_desc', 'Capacidad de almacenamiento'),
                'icon' => 'cloud',
                'values_fn' => function($t) {
                    return self::formatStorage((int)($t['max_storage_mb'] ?? 0));
                }
            ],
        ];

        foreach ($availableFeatures as $fKey => $fData) {
            $rowsToCompare[] = [
                'label' => __($fData['title_key']),
                'desc' => __($fData['desc_key']),
                'icon' => $fData['icon'],
                'values_fn' => function($t) use ($fKey, $fData) {
                    $hasFeat = !empty($t[$fKey]);
                    if ($fKey === 'feat_custom_palettes') {
                        return $hasFeat ? ($t['max_custom_palettes'] ?? 0) : false;
                    }
                    return $hasFeat;
                }
            ];
        }

        return [
            'currentUserTier' => $currentUserTier,
            'allTiers' => $allTiers,
            'rowsToCompare' => $rowsToCompare
        ];
    }

    /**

     */
    public function getHomeTags(): array {
        return [
            'art' => 'palette', 
            'gaming' => 'sports_esports', 
            'anime' => 'animation', 
            'flags' => 'flag', 
            'memes' => 'mood', 
            'pixelart' => 'grid_on', 
            'community' => 'groups', 
            'nature' => 'nature', 
            'scifi' => 'rocket_launch', 
            'fantasy' => 'auto_fix_high',
            'music' => 'music_note',
            'sports' => 'sports_soccer',
            'popculture' => 'movie'
        ];
    }

    /**

     */
    public function getCanvasDesignData(?string $canvasUuid, bool $isSnapshot = false): array {
        $canvasIntId = 0; 
        $canvasName = '';
        $canvasSize = '64'; 
        $canvasPalette = 'default'; 
        $canvasPrivacy = 'private'; 
        $canvasApproval = '0'; 
        $canvasAllowChat = '0';
        $canvasAllowPurchases = '1';
        $canvasCooldownBatch = '5';
        $canvasCooldownSeconds = '10';
        $resetActive = '0';
        $nextResetAt = '';
        $timerAction = 'restart';
        $resizeActive = '0';
        $nextResizeAt = '';
        $resizeTargetSize = '64';
        $resizeTimerAction = 'restart';
        $isMember = false;
        $userRole = 'spectator';
        $userId = null;
        $isOwner = false;
        $isBlockedInit = true;
        $isSpectatorInit = true;
        $isSubscriptionLockedInit = false;
        $canvasInitialZoom = 0.5;
        $isChatRestricted = false;
        $chatRestrictionType = null;
        $chatRestrictionEnd = null;
        $canInjectTemplate = false;
        $canLiveShare = false;
        $isBanned = false;

        if (!empty($canvasUuid)) {
            try {
                $dbManager = new DatabaseManager();
                $db = $dbManager->getConnection(DB::CONN_CANVASES);
                $sql = "SELECT c.id, c.name, c.size, c.palette_id, c.privacy, c.requires_approval, c.is_subscription_locked, 
                               c.cooldown_pixels_batch, c.cooldown_seconds, c.owner_id, c.created_at, c.max_participants, c.allow_chat, c.allow_purchases,
                               r.is_active as reset_active, r.next_reset_at,
                               rs.is_active as resize_active, rs.next_resize_at, rs.target_size
                        FROM " . DB::TBL_CANVASES . " c
                        LEFT JOIN canvas_reset_settings r ON c.id = r.canvas_id
                        LEFT JOIN canvas_resize_settings rs ON c.id = rs.canvas_id
                        WHERE c.uuid = :uuid LIMIT 1";
                
                $stmt = $db->prepare($sql);
                $stmt->execute([':uuid' => $canvasUuid]);
                $canvas = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($canvas) {
                    $canvasIntId = (int)$canvas['id'];
                    $canvasName = $canvas['name'];
                    $canvasSize = strtolower($canvas['size'] ?? '64');
                    $canvasPalette = $canvas['palette_id'] ?? 'default';
                    $canvasPrivacy = $canvas['privacy'] ?? 'private';
                    $canvasApproval = $canvas['requires_approval'] ?? '0';
                    $canvasAllowChat = $canvas['allow_chat'] ?? '0';
                    $canvasAllowPurchases = $canvas['allow_purchases'] ?? '1';

                    
                    $canvasCooldownBatch = $canvas['cooldown_pixels_batch'] ?? '5';
                    $canvasCooldownSeconds = $canvas['cooldown_seconds'] ?? '10';

                    $resetActive = $canvas['reset_active'] ?? '0';
                    $nextResetAt = $canvas['next_reset_at'] ?? '';

                    $resizeActive = $canvas['resize_active'] ?? '0';
                    $nextResizeAt = $canvas['next_resize_at'] ?? '';
                    $resizeTargetSize = $canvas['target_size'] ?? '64';

                    global $sessionManager;
                    $session = $sessionManager ?? null;
                    if ($session && method_exists($session, 'isLoggedIn') && $session->isLoggedIn()) {
                        $userId = $session->getActiveAccountId();
                        if (isset($canvas['owner_id']) && (int)$canvas['owner_id'] === (int)$userId) {
                            $isOwner = true;
                            $isMember = true;
                            $userRole = 'admin';
                        }
                        $memberSql = "SELECT r.name as role FROM canvas_user_roles cur JOIN canvas_roles r ON cur.role_id = r.id WHERE cur.canvas_id = :cid AND cur.user_id = :uid LIMIT 1";
                        $mStmt = $db->prepare($memberSql);
                        $mStmt->execute([':cid' => $canvasIntId, ':uid' => $userId]);
                        if ($mRow = $mStmt->fetch(PDO::FETCH_ASSOC)) {
                            $isMember = true;
                            if (!$isOwner) {
                                $userRole = 'editor';
                            }
                        }
                    }
                    $isBlockedInit = ($canvasPrivacy === 'private' && !$isMember);
                    $isSpectatorInit = ($userRole === 'spectator' && !$isBlockedInit);
                    $isSubscriptionLockedInit = isset($canvas['is_subscription_locked']) ? (bool)$canvas['is_subscription_locked'] : false;

                    $allSizes = Utils::getCanvasSizes();
                    $canvasInitialZoom = $allSizes[$canvasSize]['initial_zoom'] ?? 0.5;
                    
                    if ($userId) {
                        // Check if user is banned from the canvas (excluding the owner)
                        if (!$isOwner) {
                            $banSql = "SELECT id FROM canvas_sanctions WHERE canvas_id = :cid AND user_id = :uid AND sanction_scope = 'canvas_ban' AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW())) LIMIT 1";
                            $banStmt = $db->prepare($banSql);
                            $banStmt->execute([':cid' => $canvasIntId, ':uid' => $userId]);
                            if ($banStmt->fetch()) {
                                $isBanned = true;
                            }
                        }

                        // Check if user is restricted from chat
                        if (!$isBanned) {
                            $restSql = "SELECT suspension_type, end_date FROM canvas_sanctions WHERE canvas_id = :cid AND user_id = :uid AND sanction_scope = 'chat_mute' AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW())) LIMIT 1";
                            $restStmt = $db->prepare($restSql);
                            $restStmt->execute([':cid' => $canvasIntId, ':uid' => $userId]);
                            if ($restRow = $restStmt->fetch(PDO::FETCH_ASSOC)) {
                                $isChatRestricted = true;
                                $chatRestrictionType = $restRow['suspension_type'];
                                $chatRestrictionEnd = $restRow['end_date'];
                            }
                        }
                    }
                }

                if ($userId) {
                    $uStmt = $dbManager->getConnection(DB::CONN_IDENTITY)->prepare("SELECT subscription_tier FROM users WHERE id = :uid LIMIT 1");
                    $uStmt->execute([':uid' => $userId]);
                    $userTier = (int)($uStmt->fetchColumn() ?: 0);
                    $canInjectTemplate = SubscriptionPlanConstants::hasFeature($userTier, 'inject_templates');
                    $canLiveShare = SubscriptionPlanConstants::hasFeature($userTier, 'live_share');
                }

            } catch (Exception $e) {
                Logger::error('err_design_view_load', ['exception' => $e->getMessage()]);
            }
        }

        return [
            'canvasIntId' => $canvasIntId,
            'canvasUuid' => $canvasUuid,
            'canvasName' => $canvasName,
            'canvasSize' => $canvasSize,
            'canvasPalette' => $canvasPalette,
            'canvasPrivacy' => $canvasPrivacy,
            'canvasApproval' => $canvasApproval,
            'canvasAllowChat' => $canvasAllowChat,
            'canvasAllowPurchases' => $canvasAllowPurchases,
            'canvasCooldownBatch' => $canvasCooldownBatch,
            'canvasCooldownSeconds' => $canvasCooldownSeconds,
            'resetActive' => $resetActive,
            'nextResetAt' => $nextResetAt,
            'timerAction' => $timerAction,
            'resizeActive' => $resizeActive,
            'nextResizeAt' => $nextResizeAt,
            'resizeTargetSize' => $resizeTargetSize,
            'resizeTimerAction' => $resizeTimerAction,
            'isMember' => $isMember,
            'userRole' => $userRole,
            'userId' => $userId,
            'isOwner' => $isOwner,
            'isBlockedInit' => $isBlockedInit,
            'isSpectatorInit' => $isSpectatorInit,
            'isSubscriptionLockedInit' => $isSubscriptionLockedInit,
            'canvasInitialZoom' => $canvasInitialZoom,
            'isChatRestricted' => $isChatRestricted,
            'chatRestrictionType' => $chatRestrictionType,
            'chatRestrictionEnd' => $chatRestrictionEnd,
            'canInjectTemplate' => $canInjectTemplate,
            'canLiveShare' => $canLiveShare,
            'isBanned' => $isBanned,
            'isSnapshot' => $isSnapshot
        ];
    }
}
