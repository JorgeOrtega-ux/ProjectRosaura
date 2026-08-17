<?php
use App\Api\Services\Admin\AdminViewService;

$providerUuid = isset($_GET['uuid']) ? trim($_GET['uuid']) : '';
$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$formatFilter = isset($_GET['format']) ? trim($_GET['format']) : '';
$statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$adminService = new AdminViewService();
$adData = $adminService->getManageProviderAdsData($providerUuid, $searchQuery, $formatFilter, $statusFilter, $page);

if (empty($adData['provider'])) {
    header("Location: " . ($adData['appUrl'] ?? '') . "/admin/advertisements");
    exit;
}

extract($adData);

$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;
$isNetwork = ($provider['provider_type'] === 'network');

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page'], $queryParams['uuid']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/advertisement-items/' . $provider['uuid'] . '?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/advertisement-items/' . $provider['uuid'] . '?page=' . ($page + 1) . $queryString : '#';
?>
<div class="view-content" data-ref="manageProviderAdsView" data-provider-uuid="<?php echo htmlspecialchars($provider['uuid']); ?>" data-provider-type="<?php echo htmlspecialchars($provider['provider_type']); ?>" data-provider-name="<?php echo htmlspecialchars($provider['name']); ?>" data-is-superadmin="<?php echo $isSuperAdmin; ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_manage_provider_ads_title'); ?>: <?php echo htmlspecialchars($provider['name']); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="ad-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="downloadAdMetrics" data-tooltip="<?php echo __('admin_ad_download_metrics'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">monitoring</span>
                    </button>
                    <?php if ($canManageAds): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="editAd" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleAdStatus" data-tooltip="<?php echo __('admin_ad_toggle_status'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">power_settings_new</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteAd" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <?php endif; ?>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($searchQuery) ? 'has-active-filter' : ''; ?>" data-action="searchAd" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40 <?php echo (!empty($formatFilter) || !empty($statusFilter)) ? 'has-active-filter' : ''; ?>" data-action="toggleModule" data-target="moduleAdFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown disabled" data-module="moduleAdFilters">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterFormat">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_ad_format'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterStatus">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">rule</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_ad_status'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterFormat">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_ad_format'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="format" data-value="all" type="radio" name="ad_format_filter" value="all" <?php echo (empty($formatFilter) || $formatFilter === 'all') ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_format_all'); ?></span></div>
                                    </label>
                                    <?php foreach (\App\Core\System\AdvertisementConstants::getFormatsCatalog() as $fmt): ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="format" data-value="<?php echo htmlspecialchars($fmt['id']); ?>" type="radio" name="ad_format_filter" value="<?php echo htmlspecialchars($fmt['id']); ?>" <?php echo $formatFilter === $fmt['id'] ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo htmlspecialchars($fmt['label']); ?></span></div>
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
                                        <span class="component-menu-header-title"><?php echo __('filter_ad_status'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="status" data-value="all" type="radio" name="ad_status_filter" value="all" <?php echo (empty($statusFilter) || $statusFilter === 'all') ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_status_all'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="status" data-value="active" type="radio" name="ad_status_filter" value="active" <?php echo $statusFilter === 'active' ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('admin_status_active'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input class="filter-radio" data-filter-type="status" data-value="inactive" type="radio" name="ad_status_filter" value="inactive" <?php echo $statusFilter === 'inactive' ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('admin_status_inactive'); ?></span></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <?php if ($canManageAds): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="<?php echo $isNetwork ? 'openCreateNetworkSlotModal' : 'openCreateAdModal'; ?>" data-provider-uuid="<?php echo htmlspecialchars($provider['uuid']); ?>" data-tooltip="<?php echo $isNetwork ? __('btn_new_network_slot') : __('btn_new_ad'); ?>" data-position="bottom">
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
                        <input class="search-input" data-ref="ad-search-input" type="text" placeholder="<?php echo __('admin_ad_items_search_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <?php if ($ads && count($ads) > 0): ?>
            <div class="component-table-wrapper" data-ref="ads-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('admin_ad_col_title'); ?></th>
                            <th data-width="170"><?php echo __('admin_ad_col_format'); ?></th>
                            <th data-width="130"><?php echo __('admin_ad_col_status'); ?></th>
                            <th data-width="160"><?php echo __('admin_ad_col_targeting'); ?></th>
                            <th data-width="160"><?php echo __('admin_ad_col_resources'); ?></th>
                            <th data-width="180"><?php echo __('admin_ad_col_target'); ?></th>
                            <th data-width="140"><?php echo __('admin_roles_col_created_at'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="ads-table-body">
                        <?php foreach ($ads as $ad): 
                            $rawName = $ad['name'] ?? '';
                            $rawTitle = $ad['title'] ?? $rawName;
                            $format = $ad['format'] ?? 'feed';
                            $status = $ad['status'] ?? 'active';
                            $isActive = ($status === 'active');
                            $resources = $ad['resources'] ?? [];
                            $resCount = count($resources);
                            $createdAt = explode(' ', $ad['created_at'])[0];
                            $targetUrl = $ad['target_url'] ?? '';
                            $sponsor = $ad['sponsor_label'] ?? $provider['name'];
                            $formatKey = 'admin_ad_format_' . $format;
                            $formatTitle = __($formatKey);
                            $resourcesJson = json_encode($resources);
                            $settingsRaw = $ad['settings'] ?? null;
                            $settingsObj = is_string($settingsRaw) ? json_decode($settingsRaw, true) : (is_array($settingsRaw) ? $settingsRaw : []);
                            $settingsJson = json_encode($settingsObj ?: new \stdClass());

                            $geoMode = $settingsObj['geo_mode'] ?? 'all';
                            $geoCountries = $settingsObj['geo_countries'] ?? [];
                            $blockDc = !empty($settingsObj['block_datacenters']);

                            $iconName = \App\Core\System\AdvertisementConstants::getFormatIcon($format);

                            $scriptRes = null;
                            if ($isNetwork && !empty($resources)) {
                                foreach ($resources as $r) {
                                    if (($r['resource_type'] ?? '') === 'script') {
                                        $scriptRes = $r;
                                        break;
                                    }
                                }
                                if (!$scriptRes) $scriptRes = $resources[0];
                            }
                        ?>
                        <tr class="component-table-row clickable" 
                            data-action="selectAdRow" 
                            data-ad-uuid="<?php echo htmlspecialchars($ad['uuid']); ?>" 
                            data-ad-name="<?php echo htmlspecialchars($rawName); ?>" 
                            data-ad-title="<?php echo htmlspecialchars($rawTitle); ?>"
                            data-ad-desc="<?php echo htmlspecialchars($ad['description'] ?? ''); ?>"
                            data-ad-url="<?php echo htmlspecialchars($targetUrl); ?>"
                            data-ad-sponsor="<?php echo htmlspecialchars($sponsor); ?>"
                            data-ad-format="<?php echo htmlspecialchars($format); ?>"
                            data-ad-status="<?php echo htmlspecialchars($status); ?>"
                            data-ad-resources="<?php echo htmlspecialchars($resourcesJson, ENT_QUOTES, 'UTF-8'); ?>"
                            data-ad-settings="<?php echo htmlspecialchars($settingsJson, ENT_QUOTES, 'UTF-8'); ?>">
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded"><?php echo $iconName; ?></span>
                                    <span class="search-target"><?php echo htmlspecialchars($rawTitle); ?></span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded component-icon-sm"><?php echo $iconName; ?></span>
                                    <span><?php echo $formatTitle; ?></span>
                                </div>
                            </td>
                            <td>
                                <?php if ($isActive): ?>
                                    <div class="component-badge component-badge--sm component-badge--success" data-ref="ad-status-badge">
                                        <span class="material-symbols-rounded component-icon-sm">check_circle</span>
                                        <span><?php echo __('admin_status_active'); ?></span>
                                    </div>
                                <?php else: ?>
                                    <div class="component-badge component-badge--sm component-badge--danger" data-ref="ad-status-badge">
                                        <span class="material-symbols-rounded component-icon-sm">cancel</span>
                                        <span><?php echo __('admin_status_inactive'); ?></span>
                                    </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($geoMode === 'allow' && !empty($geoCountries)): ?>
                                    <div class="component-badge component-badge--sm component-badge--primary" data-tooltip="<?php echo implode(', ', $geoCountries); ?>">
                                        <span class="material-symbols-rounded component-icon-sm">travel_explore</span>
                                        <span><?php echo count($geoCountries) . ' ' . __('lbl_targeting_allowed'); ?></span>
                                    </div>
                                <?php elseif ($geoMode === 'block' && !empty($geoCountries)): ?>
                                    <div class="component-badge component-badge--sm component-badge--danger" data-tooltip="<?php echo implode(', ', $geoCountries); ?>">
                                        <span class="material-symbols-rounded component-icon-sm">block</span>
                                        <span><?php echo count($geoCountries) . ' ' . __('lbl_targeting_blocked'); ?></span>
                                    </div>
                                <?php else: ?>
                                    <div class="component-badge component-badge--sm component-badge--muted">
                                        <span class="material-symbols-rounded component-icon-sm">public</span>
                                        <span><?php echo __('lbl_targeting_global'); ?></span>
                                    </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($isNetwork && $scriptRes): ?>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded component-icon-sm">code</span>
                                        <span><?php echo !empty($scriptRes['content_url']) ? htmlspecialchars($scriptRes['content_url']) : __('lbl_network_slot'); ?></span>
                                    </div>
                                <?php elseif ($resCount > 0): ?>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded component-icon-sm">perm_media</span>
                                        <span><?php echo $resCount . ' ' . __('lbl_resources_count'); ?></span>
                                    </div>
                                <?php else: ?>
                                    <div class="component-badge component-badge--sm component-badge--muted">
                                        <span class="material-symbols-rounded component-icon-sm">hide_image</span>
                                        <span><?php echo __('lbl_no_resources'); ?></span>
                                    </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if (!empty($targetUrl)): ?>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded component-icon-sm">link</span>
                                        <span><?php echo htmlspecialchars($targetUrl); ?></span>
                                    </div>
                                <?php else: ?>
                                    <div class="component-badge component-badge--sm component-badge--muted">
                                        <span class="material-symbols-rounded component-icon-sm">business</span>
                                        <span><?php echo htmlspecialchars($sponsor); ?></span>
                                    </div>
                                <?php endif; ?>
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
                            <td class="component-empty-table-cell" colspan="7">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                    <p class="component-empty-state-text"><?php echo __('admin_ad_search_empty'); ?></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <div class="component-empty-state" data-ref="ads-empty-state">
                <span class="material-symbols-rounded component-empty-state-icon">campaign</span>
                <p class="component-empty-state-text"><?php echo __('admin_ad_items_empty_desc'); ?></p>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>
<script>
    window.COUNTRY_CATALOG = <?php echo json_encode(\App\Core\System\CountryConstants::getCountries(), JSON_UNESCAPED_UNICODE); ?>;
    window.ADVERTISEMENT_FORMATS = <?php echo json_encode(\App\Core\System\AdvertisementConstants::getFormatsCatalog(), JSON_UNESCAPED_UNICODE); ?>;
</script>

