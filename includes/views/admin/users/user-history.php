<?php
use App\Api\Services\Admin\AdminViewService;

$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$categoryParam = isset($_GET['category']) && $_GET['category'] !== '' ? explode(',', $_GET['category']) : [];
$adminService = new AdminViewService();
$userHistoryData = $adminService->getUserHistoryData($_GET['uuid'] ?? '', $page, $categoryParam);

if (!empty($userHistoryData['redirect'])) {
    header("Location: " . $userHistoryData['redirect']);
    exit;
}

extract($userHistoryData);
$user = $targetUser;
$paginatedLogs = $historyItems;
$totalItems = $totalHistory;

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/user-activity/' . $user['uuid'] . '?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/user-activity/' . $user['uuid'] . '?page=' . ($page + 1) . $queryString : '#';
?>
<div class="view-content" data-user-id="<?php echo $targetUserId; ?>" data-user-uuid="<?php echo htmlspecialchars($user['uuid']); ?>">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_user_history_title'); ?></h1>
        </div>

        <div class="component-top-right">
            <div class="component-actions active" data-ref="header-default-actions">

                <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleLogFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">tune</span>
                    </button>
                    
                    <div class="component-module component-module--dropdown disabled" data-module="moduleLogFilters">
                        <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            <div class="component-menu-header">
                                <div class="component-menu-header-box">
                                    <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                </div>
                            </div>
                            <div class="component-menu-list">
                                <?php 
                                $checkedCategories = empty($categoryFilter) ? ['moderation', 'role', 'profile', 'security', 'finance'] : $categoryFilter;
                                ?>
                                <label class="component-menu-link component-menu-link--bordered">
                                    <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="moderation" <?php echo in_array('moderation', $checkedCategories) ? 'checked' : ''; ?>></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_category_moderation'); ?></span></div>
                                </label>
                                <label class="component-menu-link component-menu-link--bordered">
                                    <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="role" <?php echo in_array('role', $checkedCategories) ? 'checked' : ''; ?>></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_category_roles'); ?></span></div>
                                </label>
                                <label class="component-menu-link component-menu-link--bordered">
                                    <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="profile" <?php echo in_array('profile', $checkedCategories) ? 'checked' : ''; ?>></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_category_profile'); ?></span></div>
                                </label>
                                <label class="component-menu-link component-menu-link--bordered">
                                    <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="security" <?php echo in_array('security', $checkedCategories) ? 'checked' : ''; ?>></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_category_security'); ?></span></div>
                                </label>
                                <label class="component-menu-link component-menu-link--bordered">
                                    <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="finance" <?php echo in_array('finance', $checkedCategories) ? 'checked' : ''; ?>></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_category_finance'); ?></span></div>
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
    </div>

    <div class="component-viewport">
        <div class="component-wrapper component-wrapper--full no-padding" data-ref="user-history-wrapper">
            <div class="component-bottom">
                <div class="component-table-wrapper" data-ref="view-table">
                    <table class="component-table">
                        <thead>
                            <tr>
                                <th><?php echo __('table_header_date'); ?></th>
                                <th><?php echo __('table_header_action'); ?></th>
                                <th><?php echo __('table_header_details'); ?></th>
                                <th><?php echo __('table_header_asn'); ?></th>
                                <th><?php echo __('table_header_admin'); ?></th>
                            </tr>
                        </thead>
                        <tbody data-ref="history-table-body">
                            <?php if (empty($paginatedLogs)): ?>
                            <tr>
                                <td colspan="5" class="component-empty-table-cell">
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
                                        : $appUrl . '/public/avatar/Um9zYXVyYVVzZXI6VQ';
                                    $adminName = !empty($log['admin_username']) 
                                        ? ($log['admin_username'] === 'user_action' ? __('lbl_user_action') : $log['admin_username']) 
                                        : __('lbl_system');
                                    
                                    $dStr = strtotime($log['created_at']);
                                    $dateStr = $dStr ? date('d/m/Y H:i', $dStr) : $log['created_at'];

                                    $actionText = __('action_updated');
                                    $actionIcon = 'info';
                                    $logCategory = $log['category'] ?? 'other';
                                    
                                    switch($log['action_type']) {
                                        case 'suspended': $actionIcon = 'block'; $actionText = __('action_suspended'); break;
                                        case 'unsuspended': $actionIcon = 'lock_open'; $actionText = __('action_unsuspended'); break;
                                        case 'deleted': $actionIcon = 'person_off'; $actionText = __('action_deleted'); break;
                                        case 'restored': $actionIcon = 'settings_backup_restore'; $actionText = __('action_restored'); break;
                                        case 'role_changed': $actionIcon = 'admin_panel_settings'; $actionText = __('action_role_changed'); break;
                                        case 'warn': $actionIcon = 'warning'; $actionText = __('action_warn'); break;
                                        case 'mute': $actionIcon = 'volume_off'; $actionText = __('action_mute'); break;
                                        case 'profile_updated': $actionIcon = 'manage_accounts'; $actionText = __('action_profile_updated'); break;
                                        case 'profile_username': $actionIcon = 'badge'; $actionText = __('action_profile_username'); break;
                                        case 'profile_email': $actionIcon = 'mail'; $actionText = __('action_profile_email'); break;
                                        case 'profile_avatar': $actionIcon = 'account_circle'; $actionText = __('action_profile_avatar'); break;
                                        case 'profile_preferences': $actionIcon = 'tune'; $actionText = __('action_profile_preferences'); break;
                                        case 'profile_password': $actionIcon = 'key'; $actionText = __('action_profile_password'); break;
                                        case 'profile_2fa': $actionIcon = 'qr_code_2'; $actionText = __('action_profile_2fa'); break;
                                        case 'login_session': $actionIcon = 'login'; $actionText = __('action_login_session'); break;
                                        case 'payment_succeeded': $actionIcon = 'payments'; $actionText = __('action_payment_succeeded'); break;
                                        case 'payment_failed': $actionIcon = 'money_off'; $actionText = __('action_payment_failed'); break;
                                        case 'payment_pending': $actionIcon = 'hourglass_top'; $actionText = __('action_payment_pending'); break;
                                        case 'payment_refunded': $actionIcon = 'currency_exchange'; $actionText = __('action_payment_refunded'); break;
                                    }

                                    $subColorJson = $log['admin_subscription_color'] ?? ($log['admin_role_color'] ?? '{"type":"solid","colors":["#808080"]}');
                                    $colorData = json_decode($subColorJson, true);
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
                                            <span><?php echo $dateStr; ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded"><?php echo $actionIcon; ?></span>
                                            <span><?php echo $actionText; ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="td-details-content">
                                            <?php if ($logCategory === 'finance' && isset($log['amount'])): ?>
                                                <div>
                                                    <strong><?php echo __('lbl_amount'); ?>:</strong> $<?php echo number_format((float)$log['amount'], 2); ?> <?php echo strtoupper($log['currency'] ?? 'USD'); ?>
                                                    <?php if (!empty($log['status'])): ?>
                                                        | <strong><?php echo __('lbl_payment_status'); ?>:</strong> <?php echo htmlspecialchars($log['status']); ?>
                                                    <?php endif; ?>
                                                </div>
                                                <?php if (!empty($log['reason'])): ?>
                                                    <div><strong><?php echo __('lbl_description'); ?>:</strong> <?php echo htmlspecialchars($log['reason']); ?></div>
                                                <?php endif; ?>
                                            <?php elseif (!empty($log['reason'])): ?>
                                                <?php 
                                                $reasonObj = is_string($log['reason']) ? json_decode($log['reason'], true) : null;
                                                if (is_array($reasonObj) && isset($reasonObj['field'])) {
                                                    $oldVal = ($reasonObj['old'] !== 'null' && $reasonObj['old'] !== '' && $reasonObj['old'] !== null) ? $reasonObj['old'] : __('lbl_na');
                                                    $newVal = ($reasonObj['new'] !== 'null' && $reasonObj['new'] !== '' && $reasonObj['new'] !== null) ? $reasonObj['new'] : __('lbl_na');
                                                    echo '<div><strong>' . __('lbl_data') . ':</strong> ' . htmlspecialchars($reasonObj['field']) . ' | <strong>' . __('lbl_prev_value') . ':</strong> ' . htmlspecialchars($oldVal) . ' | <strong>' . __('lbl_new_value') . ':</strong> ' . htmlspecialchars($newVal) . '</div>';
                                                } else {
                                                    echo '<div><strong>' . __('lbl_reason') . ':</strong> ' . htmlspecialchars($log['reason']) . '</div>';
                                                }
                                                ?>
                                            <?php endif; ?>
                                            
                                            <?php if (!empty($log['end_date'])): 
                                                $expStr = strtotime($log['end_date']);
                                                $formatExp = $expStr ? date('d/m/Y H:i', $expStr) : $log['end_date'];
                                            ?>
                                                <div><strong><?php echo __('lbl_expires'); ?>:</strong> <?php echo $formatExp; ?></div>
                                            <?php endif; ?>
                                            
                                            <?php if (!empty($log['admin_notes'])): ?>
                                                <div><strong><?php echo __('lbl_notes'); ?>:</strong> <?php echo htmlspecialchars($log['admin_notes']); ?></div>
                                            <?php endif; ?>

                                            <?php if (empty($log['reason']) && empty($log['end_date']) && !isset($log['amount'])): ?>
                                                <span><?php echo __('lbl_no_details'); ?></span>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                    <td>
                                        <?php if (!empty($log['asn']) || !empty($log['ip_address'])): ?>
                                            <div class="component-badge component-badge--sm component-badge--outline" title="<?php echo htmlspecialchars(($log['ip_address'] ? $log['ip_address'] . ' - ' : '') . ($log['asn'] ?? '')); ?>">
                                                <span class="material-symbols-rounded">router</span>
                                                <span>
                                                    <?php echo htmlspecialchars(!empty($log['asn']) ? $log['asn'] : $log['ip_address']); ?>
                                                </span>
                                            </div>
                                        <?php else: ?>
                                            <span><?php echo __('lbl_na'); ?></span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-button--profile subscription-dynamic component-avatar--static-sm"
                                                 data-sub-bg="<?php echo htmlspecialchars($activeBgCss); ?>"
                                                 style="--active-subscription-bg: <?php echo htmlspecialchars($activeBgCss); ?>;">
                                                <img src="<?php echo htmlspecialchars($adminPic); ?>" alt="<?php echo __('alt_avatar'); ?>"
                                                     class="image-lazy-fade"
                                                     onload="this.classList.add('image-loaded')"
                                                     onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/public/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');">
                                            </div>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded"><?php echo $adminBadgeIcon; ?></span>
                                                <span><?php echo htmlspecialchars($adminName); ?></span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <?php endforeach; ?>

                                <tr class="disabled" data-ref="empty-search-table">
                                    <td colspan="5" class="component-empty-table-cell">
                                        <div class="component-empty-state component-empty-state--table">
                                            <span class="material-symbols-rounded component-empty-state-icon">filter_alt_off</span>
                                            <p class="component-empty-state-text"><?php echo __('admin_history_empty_filtered'); ?></p>
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
</div>