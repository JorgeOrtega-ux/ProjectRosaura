<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;
use App\Core\System\DatabaseConstants as DB;
use PDO;
$userPerms = $_SESSION['user_permissions'] ?? [];
$isSuperAdmin = isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4;
$canEditUsers = in_array('edit_users', $userPerms);
$canAssignRoles = in_array(\App\Core\System\PermissionsConstants::ASSIGN_ROLES, $userPerms);
$canDeleteUsers = in_array('delete_users', $userPerms) || $isSuperAdmin;
$canModerateUsers = count(array_intersect(['moderate_users', 'delete_users'], $userPerms)) > 0;
$canViewKardex = in_array('view_kardex', $userPerms);
 
$limit = 25; 
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$offset = ($page - 1) * $limit;

$db = new DatabaseManager(); 
$pdo = $db->getConnection(DB::CONN_IDENTITY); 

$tblUsers = DB::TBL_USERS;
$tblRoles = DB::TBL_ROLES;
$tblUserRoles = DB::TBL_USER_ROLES;
$tblUserRestr = DB::TBL_USER_RESTRICTIONS;

$stmtRoles = $pdo->query("SELECT id, name FROM {$tblRoles} ORDER BY id ASC");
$allRoles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$rolesFilter = isset($_GET['roles']) && $_GET['roles'] !== '' ? array_filter(array_map('intval', explode(',', $_GET['roles']))) : [];
$statusFilter = isset($_GET['status']) && $_GET['status'] !== '' ? array_filter(explode(',', $_GET['status'])) : [];

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
        $statusConditions[] = "(ur.is_suspended = 0 OR ur.is_suspended IS NULL)";
    }
    if (in_array('suspended', $statusFilter)) {
        $statusConditions[] = "(ur.is_suspended = 1)";
    }
    
    if (!empty($statusConditions)) {
        $whereConditions[] = "(" . implode(" OR ", $statusConditions) . ")";
    } else {
        $whereConditions[] = "1=0";
    }
}

$whereClause = implode(" AND ", $whereConditions);

$joinRole = "";
if (!empty($rolesFilter)) {
    $placeholders = [];
    foreach ($rolesFilter as $i => $rId) {
        $key = ":role_" . $i;
        $placeholders[] = $key;
        $params[$key] = $rId;
    }
    $placeholdersStr = implode(',', $placeholders);
    $joinRole = "INNER JOIN {$tblUserRoles} ur2 ON u.id = ur2.user_id AND ur2.role_id IN ($placeholdersStr)";
}

$stmtCount = $pdo->prepare("SELECT COUNT(DISTINCT u.id) FROM {$tblUsers} u LEFT JOIN {$tblUserRestr} ur ON u.id = ur.user_id $joinRole WHERE $whereClause");
$stmtCount->execute($params);
$totalUsers = (int)$stmtCount->fetchColumn();

$totalPages = ceil($totalUsers / $limit);
if ($totalPages < 1) $totalPages = 1;
if ($page > $totalPages) {
    $page = $totalPages;
    $offset = ($page - 1) * $limit;
}

$stmt = $pdo->prepare("
    SELECT u.id, u.uuid, u.username, u.email, u.subscription_tier, u.deletion_scheduled_at, 
           ur.is_suspended, u.profile_picture, u.created_at,
           st.color as subscription_color
    FROM {$tblUsers} u
    LEFT JOIN {$tblUserRestr} ur ON u.id = ur.user_id
    LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
    $joinRole
    WHERE $whereClause
    GROUP BY u.id
    ORDER BY u.id DESC 
    LIMIT $limit OFFSET $offset
");
$stmt->execute($params);
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($users)) {
    $userIds = array_column($users, 'id');
    $placeholders = implode(',', array_fill(0, count($userIds), '?'));
    
    $stmtRoles = $pdo->prepare("
        SELECT ur.user_id, r.id, r.name
        FROM {$tblUserRoles} ur
        INNER JOIN {$tblRoles} r ON ur.role_id = r.id
        WHERE ur.user_id IN ($placeholders)
        ORDER BY r.weight DESC
    ");
    $stmtRoles->execute($userIds);
    $userRoles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);
    
    $rolesByUser = [];
    foreach ($userRoles as $ur) {
        $uid = $ur['user_id'];
        if (!isset($rolesByUser[$uid])) {
            $rolesByUser[$uid] = ['ids' => [], 'names' => [], 'color' => '#808080'];
        }
        $rolesByUser[$uid]['ids'][] = $ur['id'];
        $rolesByUser[$uid]['names'][] = $ur['name'];
    }
    
    foreach ($users as &$uRow) {
        $uid = $uRow['id'];
        if (isset($rolesByUser[$uid])) {
            $uRow['role_ids'] = implode(',', $rolesByUser[$uid]['ids']);
            $uRow['role_names'] = implode(',', $rolesByUser[$uid]['names']);
            $uRow['role_color'] = $rolesByUser[$uid]['color'];
        } else {
            $uRow['role_ids'] = null;
            $uRow['role_names'] = null;
            $uRow['role_color'] = null;
        }
    }
    unset($uRow);
}

$appUrl = defined('APP_URL') ? APP_URL : '';

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']); // Remove router params
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/users?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/users?page=' . ($page + 1) . $queryString : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-users-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_users_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <?php if ($canEditUsers): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="editSelectedUser" data-tooltip="<?php echo __('tooltip_manage_account'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">manage_accounts</span>
                    </button>
                    <?php endif; ?>
                    
                    <?php if ($canAssignRoles): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="editSelectedUserRole" data-tooltip="<?php echo __('tooltip_manage_role'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">admin_panel_settings</span>
                    </button>
                    <?php endif; ?>

                    <?php if ($canModerateUsers): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="editSelectedUserStatus" data-tooltip="<?php echo __('tooltip_manage_status'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">rule</span>
                    </button>
                    <?php endif; ?>

                    <?php if ($canViewKardex): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="viewUserHistory" data-tooltip="<?php echo __('tooltip_view_history'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">history</span>
                    </button>
                    <?php endif; ?>

                    <?php if ($canDeleteUsers): ?>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedUsers" data-tooltip="<?php echo __('tooltip_delete_users'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <?php endif; ?>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="searchUser" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_user_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleUserFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleUserFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterRoles">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">admin_panel_settings</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_role'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterStatus">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">rule</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_status'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterRoles">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_by_role'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <?php 
                                    $checkedRoles = empty($rolesFilter) ? array_column($allRoles, 'id') : $rolesFilter;
                                    foreach ($allRoles as $r): 
                                        $isChecked = in_array($r['id'], $checkedRoles) ? 'checked' : '';
                                    ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="role_id" value="<?php echo htmlspecialchars($r['id']); ?>" <?php echo $isChecked; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo htmlspecialchars($r['name']); ?></span></div>
                                    </label>
                                    <?php endforeach; ?>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterStatus">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_by_status'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <?php 
                                    $checkedStatuses = empty($statusFilter) ? ['active', 'suspended', 'deleted'] : $statusFilter;
                                    ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="active" <?php echo in_array('active', $checkedStatuses) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_active'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="suspended" <?php echo in_array('suspended', $checkedStatuses) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_suspended'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="deleted" <?php echo in_array('deleted', $checkedStatuses) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_deleted'); ?></span></div>
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
                        <input type="text" data-ref="user-search-input" placeholder="<?php echo __('search_user_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('table_header_user'); ?></th>
                            <th><?php echo __('table_header_email'); ?></th>
                            <th><?php echo __('table_header_role'); ?></th>
                            <th><?php echo __('table_header_status'); ?></th>
                            <th><?php echo __('table_header_uuid'); ?></th>
                            <th><?php echo __('table_header_registered'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($users): ?>
                            <?php foreach ($users as $user): ?>
                                <?php 
                                    $isDeleted = false;
                                    
                                    $dataStatus = $user['is_suspended'] ? 'suspended' : 'active';
                                    $displayStatus = $user['is_suspended'] ? __('status_suspended') : __('status_active');
                                    $statusIcon = $user['is_suspended'] ? 'block' : 'check_circle';
                                    $validUserPic = Utils::getValidImage($user['profile_picture'], 'avatar');
                                    
                                    $roleIds = $user['role_ids'] ?? '1';
                                    $roleNamesStr = $user['role_names'] ?? __('user');
                                    $roleNamesArray = explode(',', $roleNamesStr);
                                    
                                    $subColorRaw = !empty($user['subscription_color']) ? $user['subscription_color'] : '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}';
                                    $roleColorCSS = '#808080';

                                    $parsedColor = json_decode($subColorRaw, true);
                                    if (json_last_error() === JSON_ERROR_NONE && is_array($parsedColor) && isset($parsedColor['type'])) {
                                        if ($parsedColor['type'] === 'solid' && !empty($parsedColor['colors'][0])) {
                                            $firstColor = $parsedColor['colors'][0];
                                            $roleColorCSS = is_array($firstColor) ? ($firstColor['hex'] ?? '#808080') : $firstColor;
                                        } elseif ($parsedColor['type'] === 'gradient' && !empty($parsedColor['colors'])) {
                                            $angle = isset($parsedColor['angle']) ? $parsedColor['angle'] : 0;
                                            $stops = [];
                                            $prev = 0;
                                            foreach ($parsedColor['colors'] as $colorStop) {
                                                $hex = $colorStop['hex'] ?? '#808080';
                                                $end = $prev + ($colorStop['percentage'] ?? 0);
                                                $stops[] = "{$hex} {$prev}% {$end}%";
                                                $prev = $end;
                                            }
                                            $roleColorCSS = "conic-gradient(from {$angle}deg, " . implode(', ', $stops) . ")";
                                        }
                                    } else {
                                        $roleColorCSS = $subColorRaw;
                                    }
                                ?>
                                <tr class="component-table-row" data-action="selectUser" data-user-id="<?php echo htmlspecialchars($user['id']); ?>" data-user-uuid="<?php echo htmlspecialchars($user['uuid']); ?>" data-roles-ids="<?php echo htmlspecialchars($roleIds); ?>" data-status="<?php echo htmlspecialchars($dataStatus); ?>">
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-button--profile role-dynamic component-avatar--static-sm" data-role-bg="<?php echo htmlspecialchars($roleColorCSS); ?>">
                                                <img src="<?php echo $appUrl . '/' . htmlspecialchars($validUserPic); ?>" alt="<?php echo __('alt_avatar'); ?>" 
                                                     class="image-lazy-fade"
                                                     onload="this.classList.add('image-loaded')"
                                                     onerror="this.onerror=null; this.src='<?php echo $appUrl; ?>/public/assets/img/fallbacks/avatar-default.png'; this.classList.add('image-loaded');">
                                            </div>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">person</span>
                                                <span class="search-target"><?php echo htmlspecialchars($user['username']); ?></span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">mail</span>
                                            <span class="search-target"><?php echo htmlspecialchars($user['email']); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <?php 
                                                $primaryRoleName = trim($roleNamesArray[0]);
                                                $pKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower($primaryRoleName));
                                                $pTrans = __($pKey);
                                            ?>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">shield_person</span>
                                                <span class="search-target" data-role-original-name="<?php echo htmlspecialchars($primaryRoleName); ?>">
                                                    <?php echo htmlspecialchars($pTrans); ?>
                                                </span>
                                            </div>
                                            
                                            <?php if (count($roleNamesArray) > 1): 
                                                $extraCount = count($roleNamesArray) - 1;
                                                $extraRoles = array_slice($roleNamesArray, 1);
                                                
                                                $extraRolesTrans = array_map(function($r) { 
                                                    return __('role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($r)))); 
                                                }, $extraRoles);
                                                $tooltipText = implode(', ', $extraRolesTrans);
                                            ?>
                                            
                                            <div class="component-badge component-badge--sm" data-tooltip="<?php echo htmlspecialchars($tooltipText); ?>" data-position="bottom">
                                                <span >+<?php echo $extraCount; ?></span>
                                            </div>

                                            <?php foreach ($extraRoles as $extraRoleName): 
                                                $eName = trim($extraRoleName);
                                                $eKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower($eName));
                                                $eTrans = __($eKey);
                                            ?>
                                                <span class="search-target disabled" data-role-original-name="<?php echo htmlspecialchars($eName); ?>">
                                                    <?php echo htmlspecialchars($eTrans); ?>
                                                </span>
                                            <?php endforeach; ?>
                                            
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded"><?php echo $statusIcon; ?></span>
                                            <span class="search-target"><?php echo $displayStatus; ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">fingerprint</span>
                                            <span class="search-target"><?php echo htmlspecialchars($user['uuid']); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">calendar_month</span>
                                            <span><?php echo date('d/m/Y', strtotime($user['created_at'])); ?></span>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            
                            <tr class="disabled" data-ref="empty-search-table">
                                <td colspan="6" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_search_users'); ?></p>
                                    </div>
                                </td>
                            </tr>

                        <?php else: ?>
                            <tr>
                                <td colspan="6" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">group_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_users_system'); ?></p>
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