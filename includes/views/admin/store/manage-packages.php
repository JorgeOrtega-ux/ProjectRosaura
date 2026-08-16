<?php
use App\Api\Services\Admin\AdminViewService;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$adminService = new AdminViewService();
$data = $adminService->getManageStorePackagesData($searchQuery, $page);

extract($data);

$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;
$userPerms = $_SESSION['user_permissions'] ?? [];
$canManageStore = in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $userPerms);

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/store-packages?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/store-packages?page=' . ($page + 1) . $queryString : '#';
?>
<div class="view-content" data-ref="managePackagesView" data-is-superadmin="<?php echo $isSuperAdmin; ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('store_coins_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="package-selection-actions">
                    <?php if ($canManageStore): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="editPackage" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleVisibilityPackage" data-tooltip="<?php echo __('btn_toggle_visibility'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">shopping_bag</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deletePackage" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <?php endif; ?>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($_GET['q']) ? 'has-active-filter' : ''; ?>" data-action="searchPackage" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    
                    <?php if ($canManageStore): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="addPackage" data-tooltip="<?php echo __('btn_add_package'); ?>" data-position="bottom">
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
                    <div class="component-search-input">
                        <input type="text" data-ref="package-search-input" placeholder="<?php echo __('search_packages_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <?php if ($packages && count($packages) > 0): ?>
            <div class="component-table-wrapper" data-ref="packages-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('th_package'); ?></th>
                            <th data-width="120"><?php echo __('th_amount'); ?></th>
                            <th data-width="120"><?php echo __('th_price'); ?></th>
                            <th data-width="140"><?php echo __('lbl_allow_purchase'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="packages-table-body">
                        <?php foreach ($packages as $pkg): 
                            $rawName = __($pkg['name']);
                            $icon = !empty($pkg['icon']) ? $pkg['icon'] : 'monetization_on';
                        ?>
                        <tr class="component-table-row clickable" 
                            data-action="selectPackageRow" 
                            data-package-id="<?php echo htmlspecialchars($pkg['uuid']); ?>" 
                            data-package-name="<?php echo htmlspecialchars($rawName); ?>">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-card__icon-container component-card__icon-container--bordered component-card__icon-container--round">
                                        <span class="material-symbols-rounded"><?php echo htmlspecialchars($icon); ?></span>
                                    </div>
                                    <div class="component-badge component-badge--sm">
                                        <span class="search-target"><?php echo htmlspecialchars($rawName); ?></span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">monetization_on</span>
                                    <span ><?php echo number_format((int)$pkg['amount']); ?></span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span>$<?php echo number_format((float)$pkg['price_usd'], 2); ?></span>
                                </div>
                            </td>
                            <td>
                                <?php if ($pkg['is_active']): ?>
                                    <div class="component-badge component-badge--sm component-badge--success">
                                        <span class="material-symbols-rounded component-icon-sm">check_circle</span>
                                        <span><?php echo __('admin_status_purchasable'); ?></span>
                                    </div>
                                <?php else: ?>
                                    <div class="component-badge component-badge--sm component-badge--danger">
                                        <span class="material-symbols-rounded component-icon-sm">cancel</span>
                                        <span><?php echo __('admin_status_not_purchasable'); ?></span>
                                    </div>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        
                        <tr class="disabled" data-ref="empty-search-table">
                            <td colspan="4" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                    <p class="component-empty-state-text"><?php echo __('lbl_no_results_found'); ?></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <div class="component-empty-state" data-ref="packages-empty-state">
                <span class="material-symbols-rounded component-empty-state-icon">storefront</span>
                <p class="component-empty-state-text"><?php echo __('store_coins_empty'); ?></p>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>
