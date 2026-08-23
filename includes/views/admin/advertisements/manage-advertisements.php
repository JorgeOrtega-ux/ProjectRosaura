<?php
use App\Api\Services\Admin\AdminViewService;
use App\Core\Helpers\Utils;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$typeFilter = isset($_GET['type']) ? trim($_GET['type']) : '';
$statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$adminService = new AdminViewService();
$adData = $adminService->getManageAdvertisementsData($searchQuery, $typeFilter, $statusFilter, $page);

extract($adData);

$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/advertisements?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/advertisements?page=' . ($page + 1) . $queryString : '#';
?>
<div class="view-content" data-ref="manageAdvertisementsView" data-is-superadmin="<?php echo $isSuperAdmin; ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_advertisements_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="advertisement-selection-actions">
                    <?php if ($canManageAds): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="editProvider" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="viewProviderAds" data-tooltip="<?php echo __('admin_ad_manage_ads'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">ad_units</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleProviderActive" data-tooltip="<?php echo __('admin_ad_toggle_active'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">power_settings_new</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteProvider" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <?php endif; ?>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="downloadGeneralMetrics" data-tooltip="<?php echo __('admin_ad_download_general_metrics'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">assessment</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($searchQuery) ? 'has-active-filter' : ''; ?>" data-action="searchProvider" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40 <?php echo (!empty($typeFilter) || !empty($statusFilter)) ? 'has-active-filter' : ''; ?>" data-action="toggleModule" data-target="moduleProviderFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown disabled" data-module="moduleProviderFilters">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="material-symbols-rounded">filter_list</span>
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_provider_type'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterStatus">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">rule</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_ad_status'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterType">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_provider_type'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="type" data-value="all" type="radio" name="provider_type_filter" value="all" <?php echo (empty($typeFilter) || $typeFilter === 'all') ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_type_all'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="type" data-value="direct" type="radio" name="provider_type_filter" value="direct" <?php echo $typeFilter === 'direct' ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_type_direct'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="type" data-value="network" type="radio" name="provider_type_filter" value="network" <?php echo $typeFilter === 'network' ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_type_network'); ?></span></div>
                                    </label>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterStatus">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_ad_status'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="status" data-value="all" type="radio" name="provider_status_filter" value="all" <?php echo (empty($statusFilter) || $statusFilter === 'all') ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_status_all'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="status" data-value="active" type="radio" name="provider_status_filter" value="active" <?php echo $statusFilter === 'active' ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('admin_status_active'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="status" data-value="inactive" type="radio" name="provider_status_filter" value="inactive" <?php echo $statusFilter === 'inactive' ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('admin_status_inactive'); ?></span></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <?php if ($canManageAds): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="addProvider" data-tooltip="<?php echo __('admin_ad_add_provider'); ?>" data-position="bottom">
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
                        <input type="text" data-ref="provider-search-input" placeholder="<?php echo __('admin_ad_search_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <?php if ($providers && count($providers) > 0): ?>
            <div class="component-table-wrapper" data-ref="providers-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('admin_ad_col_name'); ?></th>
                            <th data-width="170"><?php echo __('admin_ad_col_type'); ?></th>
                            <th data-width="140"><?php echo __('admin_ad_col_status'); ?></th>
                            <th data-width="170"><?php echo __('admin_ad_col_expiration'); ?></th>
                            <th data-width="130"><?php echo __('admin_ad_col_ads_count'); ?></th>
                            <th data-width="160"><?php echo __('admin_roles_col_created_at'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="providers-table-body">
                        <?php foreach ($providers as $provider): 
                            $rawName = $provider['name'] ?? '';
                            $providerType = $provider['provider_type'] ?? 'direct';
                            $networkId = $provider['network_id'] ?? '';
                            $isActive = (int)($provider['is_active'] ?? 1);
                            $hasExpiration = (int)($provider['has_expiration'] ?? 0);
                            $expDate = $provider['expiration_date'] ? explode(' ', $provider['expiration_date'])[0] : '';
                            $createdAt = explode(' ', $provider['created_at'])[0];
                            $totalAds = (int)($provider['total_ads'] ?? 0);
                            $isNetwork = ($providerType === 'network');
                        ?>
                        <tr class="component-table-row clickable" 
                            data-action="selectProviderRow" 
                            data-provider-id="<?php echo htmlspecialchars($provider['uuid']); ?>" 
                            data-provider-name="<?php echo htmlspecialchars($rawName); ?>" 
                            data-provider-type="<?php echo htmlspecialchars($providerType); ?>"
                            data-network-id="<?php echo htmlspecialchars($networkId); ?>"
                            data-is-active="<?php echo $isActive; ?>"
                            data-has-expiration="<?php echo $hasExpiration; ?>"
                            data-expiration-date="<?php echo htmlspecialchars($provider['expiration_date'] ?? ''); ?>">
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded"><?php echo $isNetwork ? 'hub' : 'corporate_fare'; ?></span>
                                    <span class="search-target"><?php echo htmlspecialchars($rawName); ?></span>
                                </div>
                            </td>
                            <td>
                                <?php if ($isNetwork): ?>
                                    <div class="component-badge component-badge--sm component-badge--warning">
                                        <span class="material-symbols-rounded component-icon-sm">hub</span>
                                        <span><?php echo __('admin_ad_type_network'); ?></span>
                                    </div>
                                <?php else: ?>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded component-icon-sm">corporate_fare</span>
                                        <span><?php echo __('admin_ad_type_direct'); ?></span>
                                    </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($isActive): ?>
                                    <div class="component-badge component-badge--sm component-badge--success">
                                        <span class="material-symbols-rounded component-icon-sm">check_circle</span>
                                        <span><?php echo __('admin_status_active'); ?></span>
                                    </div>
                                <?php else: ?>
                                    <div class="component-badge component-badge--sm component-badge--danger">
                                        <span class="material-symbols-rounded component-icon-sm">cancel</span>
                                        <span><?php echo __('admin_status_inactive'); ?></span>
                                    </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($hasExpiration && !empty($expDate)): ?>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded component-icon-sm">event</span>
                                        <span><?php echo $expDate; ?></span>
                                    </div>
                                <?php else: ?>
                                    <div class="component-badge component-badge--sm component-badge--muted">
                                        <span class="material-symbols-rounded component-icon-sm">all_inclusive</span>
                                        <span><?php echo __('admin_ad_no_expiration'); ?></span>
                                    </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded component-icon-sm">view_carousel</span>
                                    <span><?php echo $totalAds; ?></span>
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
                            <td colspan="6" class="component-empty-table-cell">
                                <?php echo \App\Core\Helpers\Utils::renderEmptyState([
                                    'type' => 'search',
                                    'title' => __('search_empty_no_results_title'),
                                    'message' => __('admin_ad_search_empty')
                                ]); ?>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <?php echo \App\Core\Helpers\Utils::renderEmptyState([
                'type' => 'advertisements',
                'title' => __('admin_ad_providers_empty_title'),
                'message' => __('admin_ad_empty_desc'),
                'ref' => 'providers-empty-state'
            ]); ?>
            <?php endif; ?>
        </div>

    </div>
</div>
<script>
    window.COUNTRY_CATALOG = <?php echo json_encode(\App\Core\System\CountryConstants::getCountries(), JSON_UNESCAPED_UNICODE); ?>;
    window.ADVERTISEMENT_FORMATS = <?php echo json_encode(\App\Core\System\AdvertisementConstants::getFormatsCatalog(), JSON_UNESCAPED_UNICODE); ?>;
</script>
