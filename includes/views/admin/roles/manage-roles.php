<?php
use App\Api\Services\Admin\AdminViewService;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$adminService = new AdminViewService();
$rolesData = $adminService->getManageRolesData($searchQuery, $page);

extract($rolesData);

$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/roles?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/roles?page=' . ($page + 1) . $queryString : '#';
?>
<div class="view-content" data-ref="manageRolesView" data-current-user-weight="<?php echo $currentUserWeight; ?>" data-is-superadmin="<?php echo $isSuperAdmin; ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_roles_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="role-selection-actions">
                    <?php if ($canManageRoles): ?>
                    <button class="component-button component-button--secondary component-button--icon component-button--h40" data-action="editRole" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <?php endif; ?>
                    
                    <?php if ($isSuperAdmin): ?>
                    <button class="component-button component-button--secondary component-button--icon component-button--h40" data-action="editPermissions" data-tooltip="<?php echo __('btn_edit_permissions'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">admin_panel_settings</span>
                    </button>
                    <?php endif; ?>

                    <?php if ($canManageRoles): ?>
                    <button class="component-button component-button--danger component-button--icon component-button--h40" data-action="deleteRole" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <?php endif; ?>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($_GET['q']) ? 'has-active-filter' : ''; ?>" data-action="searchRole" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    
                    <?php if ($canManageRoles): ?>
                    <button class="component-button component-button--primary component-button--icon component-button--h40" data-action="addRole" data-tooltip="<?php echo __('btn_add_role'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                    <?php endif; ?>

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
                    <input type="text" class="component-search-input" placeholder="<?php echo __('placeholder_search_roles'); ?>" data-ref="role-search-input" value="<?php echo htmlspecialchars($searchQuery); ?>" autocomplete="off">
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <?php if ($roles && count($roles) > 0): ?>
            <div class="component-table-wrapper" data-ref="roles-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('admin_roles_col_system_role'); ?></th>
                            <th data-width="120"><?php echo __('admin_roles_col_hierarchy'); ?></th>
                            <th data-width="180"><?php echo __('admin_roles_col_created_at'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="roles-table-body">
                        <?php foreach ($roles as $role): 
                            $rawName = $role['name'] ?? '';
                            $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
                            $translatedName = __($roleKey);
                            
                            $createdAt = explode(' ', $role['created_at'])[0];
                            $isSystemFlag = isset($role['is_system']) ? (int)$role['is_system'] : 0;
                        ?>
                        <tr class="component-table-row clickable" 
                            data-action="selectRoleRow" 
                            data-role-id="<?php echo $role['id']; ?>" 
                            data-role-uuid="<?php echo htmlspecialchars($role['uuid'] ?? ''); ?>"
                            data-role-name="<?php echo htmlspecialchars($translatedName); ?>" 
                            data-is-system="<?php echo $isSystemFlag; ?>" 
                            data-role-weight="<?php echo (int)$role['weight']; ?>">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-button--profile component-avatar--static-sm">
                                        <img src="/public/avatar/Um9zYXVyYVVzZXI6VQ" alt="<?php echo __('alt_role_avatar'); ?>"
                                             class="image-lazy-fade"
                                             onload="this.classList.add('image-loaded')">
                                    </div>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">admin_panel_settings</span>
                                        <span class="search-target"><?php echo htmlspecialchars($translatedName); ?></span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">layers</span>
                                    <span >
                                        <?php echo (int)$role['weight']; ?>
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span><?php echo $createdAt; ?></span>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        
                        <tr class="disabled" data-ref="empty-search-table">
                            <td colspan="3" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                    <p class="component-empty-state-text"><?php echo __('empty_search_roles'); ?></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <div class="component-empty-state" data-ref="roles-empty-state">
                <span class="material-symbols-rounded empty-icon">admin_panel_settings</span>
                <h3><?php echo __('admin_roles_empty_title'); ?></h3>
                <p><?php echo __('admin_roles_empty_desc'); ?></p>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>