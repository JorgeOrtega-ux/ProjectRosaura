<?php
// includes/views/admin/users/manage-users.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\Helpers\Utils;
use App\Core\System\DatabaseConstants as DB;
use PDO;

// EXTRACCIÓN DE PERMISOS GRANULARES
$userPerms = $_SESSION['user_permissions'] ?? [];
$isSuperAdmin = isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4;
$canEditUsers = in_array('edit_users', $userPerms);
$canAssignRoles = in_array('assign_roles', $userPerms);
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

$stmtRoles = $pdo->query("SELECT id, name, color FROM {$tblRoles} ORDER BY id ASC");
$allRoles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);

$stmtCount = $pdo->query("SELECT COUNT(*) FROM {$tblUsers}");
$totalUsers = (int)$stmtCount->fetchColumn();

$totalPages = ceil($totalUsers / $limit);
if ($totalPages < 1) $totalPages = 1;
if ($page > $totalPages) {
    $page = $totalPages;
    $offset = ($page - 1) * $limit;
}

// QUERY ACTUALIZADA: Se agrega "ORDER BY r.weight DESC" en los GROUP_CONCAT
$stmt = $pdo->query("
    SELECT u.id, u.uuid, u.username, u.email, u.deletion_scheduled_at, 
           ur.is_suspended, u.profile_picture, u.created_at,
           (SELECT r.color FROM {$tblRoles} r INNER JOIN {$tblUserRoles} ur2 ON r.id = ur2.role_id WHERE ur2.user_id = u.id ORDER BY r.weight DESC LIMIT 1) as role_color,
           (SELECT GROUP_CONCAT(r.id ORDER BY r.weight DESC) FROM {$tblRoles} r INNER JOIN {$tblUserRoles} ur3 ON r.id = ur3.role_id WHERE ur3.user_id = u.id) as role_ids,
           (SELECT GROUP_CONCAT(r.name ORDER BY r.weight DESC) FROM {$tblRoles} r INNER JOIN {$tblUserRoles} ur4 ON r.id = ur4.role_id WHERE ur4.user_id = u.id) as role_names
    FROM {$tblUsers} u
    LEFT JOIN {$tblUserRestr} ur ON u.id = ur.user_id
    ORDER BY u.id DESC 
    LIMIT $limit OFFSET $offset
");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/admin/manage-users?page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/manage-users?page=' . ($page + 1) : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex" data-ref="manage-users-wrapper">
        
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

                    <button class="component-button component-button--icon component-button--h40" data-action="deselectUser" data-tooltip="<?php echo __('tooltip_cancel_selection'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">close</span>
                    </button>
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
                                    <?php foreach ($allRoles as $r): ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="role_id" value="<?php echo htmlspecialchars($r['id']); ?>" checked></div>
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
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="active" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_active'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="suspended" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_suspended'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="deleted" checked></div>
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
                        <input type="text" data-ref="user-search-input" placeholder="<?php echo __('search_user_placeholder'); ?>">
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
                                    $isDeleted = !empty($user['deletion_scheduled_at']);
                                    
                                    $dataStatus = $isDeleted ? 'deleted' : ($user['is_suspended'] ? 'suspended' : 'active');
                                    $displayStatus = $isDeleted ? __('status_deleted') : ($user['is_suspended'] ? __('status_suspended') : __('status_active'));
                                    $statusIcon = $isDeleted ? 'person_off' : ($user['is_suspended'] ? 'block' : 'check_circle');
                                    $validUserPic = Utils::getValidImage($user['profile_picture'], 'avatar');
                                    
                                    $roleIds = $user['role_ids'] ?? '1';
                                    $roleNamesStr = $user['role_names'] ?? 'User';
                                    $roleNamesArray = explode(',', $roleNamesStr);
                                    
                                    $roleColorRaw = !empty($user['role_color']) ? $user['role_color'] : '#6b7280';
                                    $roleColorCSS = '#6b7280';

                                    $parsedColor = json_decode($roleColorRaw, true);
                                    if (json_last_error() === JSON_ERROR_NONE && is_array($parsedColor) && isset($parsedColor['type'])) {
                                        if ($parsedColor['type'] === 'solid' && !empty($parsedColor['colors'][0])) {
                                            $firstColor = $parsedColor['colors'][0];
                                            $roleColorCSS = is_array($firstColor) ? ($firstColor['hex'] ?? '#6b7280') : $firstColor;
                                        } elseif ($parsedColor['type'] === 'gradient' && !empty($parsedColor['colors'])) {
                                            $angle = isset($parsedColor['angle']) ? $parsedColor['angle'] : 0;
                                            $stops = [];
                                            foreach ($parsedColor['colors'] as $colorStop) {
                                                $hex = $colorStop['hex'] ?? '#000';
                                                $stop = $colorStop['stop'] ?? '0';
                                                $stops[] = "{$hex} {$stop}%";
                                            }
                                            $roleColorCSS = "conic-gradient(from {$angle}deg, " . implode(', ', $stops) . ")";
                                        }
                                    } else {
                                        $roleColorCSS = $roleColorRaw;
                                    }
                                ?>
                                <tr class="component-table-row" data-action="selectUser" data-user-id="<?php echo htmlspecialchars($user['id']); ?>" data-roles-ids="<?php echo htmlspecialchars($roleIds); ?>" data-status="<?php echo htmlspecialchars($dataStatus); ?>">
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-button--profile role-dynamic component-avatar--static-sm" style="--active-role-bg: <?php echo htmlspecialchars($roleColorCSS); ?>;">
                                                <img src="<?php echo $appUrl . '/' . htmlspecialchars($validUserPic); ?>" alt="<?php echo __('alt_avatar'); ?>">
                                            </div>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">person</span>
                                                <span class="search-target font-medium"><?php echo htmlspecialchars($user['username']); ?></span>
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
                                        <div style="display: flex; flex-direction: row; gap: 4px; align-items: center;">
                                            <?php 
                                                $primaryRoleName = trim($roleNamesArray[0]);
                                                $pKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower($primaryRoleName));
                                                $pTrans = __($pKey);
                                            ?>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">shield_person</span>
                                                <span class="search-target font-bold" data-role-original-name="<?php echo htmlspecialchars($primaryRoleName); ?>">
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
                                                <span class="font-bold">+<?php echo $extraCount; ?></span>
                                            </div>

                                            <?php foreach ($extraRoles as $extraRoleName): 
                                                $eName = trim($extraRoleName);
                                                $eKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower($eName));
                                                $eTrans = __($eKey);
                                            ?>
                                                <span class="search-target" style="display:none;" data-role-original-name="<?php echo htmlspecialchars($eName); ?>">
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