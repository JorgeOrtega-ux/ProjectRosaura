<?php
// includes/views/admin/users/user-history.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\Repositories\UserRepository;
use App\Core\Repositories\ModerationRepository;
use App\Core\Repositories\ProfileLogRepository;

$targetUserId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($targetUserId <= 0) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$db = new DatabaseManager();
$userRepo = new UserRepository($db);
$modRepo = new ModerationRepository($db);
$profileLogRepo = new ProfileLogRepository($db);

$user = $userRepo->findById($targetUserId);
if (!$user) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$limit = 25; 
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;

$modLogs = $modRepo->getKardex($targetUserId);
$profileLogs = $profileLogRepo->getLogsByUserId($targetUserId);

foreach ($profileLogs as $pl) {
    $modLogs[] = [
        'created_at' => $pl['created_at'],
        'action_type' => 'profile_' . $pl['change_type'],
        'reason' => __('lbl_data') . ': ' . $pl['change_type'] . ' | ' . __('lbl_prev_value') . ': ' . ($pl['old_value'] ?? __('lbl_na')) . ' | ' . __('lbl_new_value') . ': ' . ($pl['new_value'] ?? __('lbl_na')),
        'admin_username' => __('lbl_user_action'),
        'admin_profile_picture' => $user['profile_picture'] ?? null,
        'admin_role' => 'user',
        'admin_role_color' => $user['role_color'] ?? '{"type":"solid","colors":["#808080"]}'
    ];
}

usort($modLogs, function($a, $b) {
    return strtotime($b['created_at']) - strtotime($a['created_at']);
});

$totalItems = count($modLogs);
$totalPages = ceil($totalItems / $limit);
if ($totalPages < 1) $totalPages = 1;
if ($page > $totalPages) {
    $page = $totalPages;
}

$offset = ($page - 1) * $limit;
$paginatedLogs = array_slice($modLogs, $offset, $limit);

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/admin/user-history?id=' . $targetUserId . '&page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/user-history?id=' . $targetUserId . '&page=' . ($page + 1) : '#';
?>
<div class="view-content" data-user-id="<?php echo $targetUserId; ?>">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex" data-ref="user-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_user_history_title'); ?></h1>
            </div>

            <div class="component-top-right">
                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="searchLog" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_history_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleLogFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleLogFilters">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="moderation" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_category_moderation'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="role" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_category_roles'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="profile" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_category_profile'); ?></span></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-inline-control" data-ref="pagination-container" data-tooltip="<?php echo __('pagination_tooltip', ['page' => $page, 'total' => $totalPages]); ?>" data-position="bottom">
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page <= 1 ? 'disabled-interaction' : ''; ?>" <?php echo $page > 1 ? 'data-nav="'.$prevPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                        </div>
                        <div class="component-inline-control__center"><?php echo $page; ?></div>
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page >= $totalPages ? 'disabled-interaction' : ''; ?>" <?php echo $page < $totalPages ? 'data-nav="'.$nextPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_right</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="log-search-input" placeholder="<?php echo __('search_history_placeholder'); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('table_header_date'); ?></th>
                            <th><?php echo __('table_header_action'); ?></th>
                            <th><?php echo __('table_header_details'); ?></th>
                            <th><?php echo __('table_header_admin'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="history-table-body">
                        <?php if (empty($paginatedLogs)): ?>
                        <tr>
                            <td colspan="4" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">history</span>
                                    <p class="component-empty-state-text"><?php echo __('admin_history_empty'); ?></p>
                                </div>
                            </td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($paginatedLogs as $log): 
                                $adminPic = !empty($log['admin_profile_picture']) 
                                    ? $appUrl . '/' . ltrim($log['admin_profile_picture'], '/') 
                                    : $appUrl . '/public/assets/img/fallbacks/avatar-default.png';
                                
                                $adminName = !empty($log['admin_username']) ? $log['admin_username'] : __('lbl_system');
                                
                                $dStr = strtotime($log['created_at']);
                                $dateStr = $dStr ? date('d/m/Y H:i', $dStr) : $log['created_at'];

                                $actionText = __('action_updated');
                                $actionIcon = 'info';
                                $logCategory = 'other';
                                
                                switch($log['action_type']) {
                                    case 'suspended': $actionIcon = 'block'; $actionText = __('action_suspended'); $logCategory = 'moderation'; break;
                                    case 'unsuspended': $actionIcon = 'lock_open'; $actionText = __('action_unsuspended'); $logCategory = 'moderation'; break;
                                    case 'deleted': $actionIcon = 'person_off'; $actionText = __('action_deleted'); $logCategory = 'moderation'; break;
                                    case 'restored': $actionIcon = 'settings_backup_restore'; $actionText = __('action_restored'); $logCategory = 'moderation'; break;
                                    case 'role_changed': $actionIcon = 'admin_panel_settings'; $actionText = __('action_role_changed'); $logCategory = 'role'; break;
                                    case 'profile_updated': $actionIcon = 'manage_accounts'; $actionText = __('action_profile_updated'); $logCategory = 'profile'; break;
                                    case 'profile_username': $actionIcon = 'badge'; $actionText = __('action_profile_username'); $logCategory = 'profile'; break;
                                    case 'profile_email': $actionIcon = 'mail'; $actionText = __('action_profile_email'); $logCategory = 'profile'; break;
                                    case 'profile_avatar': $actionIcon = 'account_circle'; $actionText = __('action_profile_avatar'); $logCategory = 'profile'; break;
                                    case 'profile_preferences': $actionIcon = 'tune'; $actionText = __('action_profile_preferences'); $logCategory = 'profile'; break;
                                }

                                $roleColorJson = $log['admin_role_color'] ?? '{"type":"solid","colors":["#808080"]}';
                                $colorData = json_decode($roleColorJson, true);
                                $activeBgCss = '#808080';
                                
                                if (is_array($colorData) && !empty($colorData['colors'])) {
                                    $extractColor = function($item) {
                                        return is_array($item) ? ($item['hex'] ?? '#808080') : $item;
                                    };

                                    $c1 = $extractColor($colorData['colors'][0]);

                                    if (isset($colorData['type']) && $colorData['type'] === 'gradient' && count($colorData['colors']) >= 2) {
                                        $c2 = $extractColor($colorData['colors'][1]);
                                        $angle = $colorData['angle'] ?? 90;
                                        $activeBgCss = "linear-gradient({$angle}deg, {$c1}, {$c2})";
                                    } else {
                                        $activeBgCss = $c1;
                                    }
                                }

                                $adminBadgeIcon = 'admin_panel_settings';
                                if ($adminName === __('lbl_user_action') || ($log['admin_role'] ?? '') === 'user') {
                                    $adminBadgeIcon = 'person';
                                } elseif ($adminName === __('lbl_system')) {
                                    $adminBadgeIcon = 'smart_toy';
                                    $activeBgCss = '#6c757d'; 
                                }
                            ?>
                            <tr class="component-table-row log-row" data-log-category="<?php echo htmlspecialchars($logCategory); ?>">
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span class="search-target"><?php echo $dateStr; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded"><?php echo $actionIcon; ?></span>
                                        <span class="search-target"><?php echo $actionText; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="td-details-content text-sm search-target">
                                        <?php if (!empty($log['reason'])): ?>
                                            <div><strong><?php echo __('lbl_reason'); ?>:</strong> <?php echo htmlspecialchars($log['reason']); ?></div>
                                        <?php endif; ?>
                                        <?php if (!empty($log['end_date'])): 
                                            $expStr = strtotime($log['end_date']);
                                            $formatExp = $expStr ? date('d/m/Y H:i', $expStr) : $log['end_date'];
                                        ?>
                                            <div><strong><?php echo __('lbl_expires'); ?>:</strong> <?php echo $formatExp; ?></div>
                                        <?php endif; ?>
                                        <?php if (empty($log['reason']) && empty($log['end_date'])): ?>
                                            <span style="color: var(--text-muted);"><?php echo __('lbl_no_details'); ?></span>
                                        <?php endif; ?>
                                    </div>
                                </td>
                                <td>
                                    <div class="td-user-info">
                                        <div class="component-button--profile role-dynamic component-avatar--static-sm" style="--active-role-bg: <?php echo htmlspecialchars($activeBgCss, ENT_QUOTES, 'UTF-8'); ?>;">
                                            <img src="<?php echo htmlspecialchars($adminPic); ?>" alt="<?php echo __('alt_avatar'); ?>">
                                        </div>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded"><?php echo $adminBadgeIcon; ?></span>
                                            <span class="search-target font-medium"><?php echo htmlspecialchars($adminName); ?></span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>

                            <tr class="disabled" data-ref="empty-search-table">
                                <td colspan="4" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_search_history'); ?></p>
                                    </div>
                                </td>
                            </tr>

                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>