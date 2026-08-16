<?php
use App\Api\Services\Admin\AdminViewService;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$placementFilter = isset($_GET['placement']) ? trim($_GET['placement']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$adminService = new AdminViewService();
$data = $adminService->getManageCampaignsData($searchQuery, $placementFilter, $page);

extract($data);

$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;
$userPerms = $_SESSION['user_permissions'] ?? [];
$canManageMonetization = in_array(\App\Core\System\PermissionsConstants::MANAGE_MONETIZATION, $userPerms) || in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $userPerms);

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/monetization-campaigns?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/monetization-campaigns?page=' . ($page + 1) . $queryString : '#';
?>
<div class="view-content" data-ref="manageCampaignsView" data-is-superadmin="<?php echo $isSuperAdmin; ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_campaigns_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="campaign-selection-actions">
                    <?php if ($canManageMonetization): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="editCampaign" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleActiveCampaign" data-tooltip="<?php echo __('btn_toggle_visibility'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">power_settings_new</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteCampaign" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <?php endif; ?>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($_GET['q']) ? 'has-active-filter' : ''; ?>" data-action="searchCampaign" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-nav="/admin/monetization" data-tooltip="<?php echo __('admin_monetization_btn_settings'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">tune</span>
                    </button>

                    <?php if ($canManageMonetization): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="addCampaign" data-tooltip="<?php echo __('btn_add_campaign'); ?>" data-position="bottom">
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

            <div class="component-search-toolbar <?php echo empty($searchQuery) ? 'disabled' : ''; ?>" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input data-ref="campaign-search-input" type="text" placeholder="<?php echo __('search_campaigns_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <?php if ($campaigns && count($campaigns) > 0): ?>
            <div class="component-table-wrapper" data-ref="campaigns-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('th_campaign_name'); ?></th>
                            <th data-width="170"><?php echo __('th_campaign_placement'); ?></th>
                            <th data-width="160"><?php echo __('th_campaign_metrics'); ?></th>
                            <th data-width="100"><?php echo __('th_campaign_priority'); ?></th>
                            <th data-width="120"><?php echo __('th_campaign_status'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="campaigns-table-body">
                        <?php foreach ($campaigns as $camp): 
                            $rawName = $camp['name'];
                            $placementKey = 'filter_' . $camp['placement'];
                            $placementName = __($placementKey);
                            if ($placementName === $placementKey) {
                                $placementName = ucfirst(str_replace('_', ' ', $camp['placement']));
                            }
                            $isActive = (int)$camp['is_active'] === 1;
                        ?>
                        <tr class="component-table-row clickable" 
                            data-action="selectCampaignRow" 
                            data-campaign-id="<?php echo htmlspecialchars($camp['uuid']); ?>" 
                            data-campaign-name="<?php echo htmlspecialchars($rawName); ?>">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-card__icon-container component-card__icon-container--bordered component-card__icon-container--round">
                                        <span class="material-symbols-rounded"><?php echo $camp['placement'] === 'modal' ? 'smart_display' : ($camp['placement'] === 'feed' ? 'view_agenda' : ($camp['placement'] === 'drawer_templates' ? 'design_services' : 'palette')); ?></span>
                                    </div>
                                    <div class="component-badge component-badge--sm">
                                        <span class="search-target"><?php echo htmlspecialchars($rawName); ?></span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">category</span>
                                    <span><?php echo htmlspecialchars($placementName); ?></span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">visibility</span>
                                    <span><?php echo number_format((int)$camp['impressions_count']); ?></span>
                                    <span class="component-badge-dot"></span>
                                    <span class="material-symbols-rounded">ads_click</span>
                                    <span><?php echo number_format((int)$camp['clicks_count']); ?></span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">low_priority</span>
                                    <span><?php echo (int)$camp['priority']; ?></span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm <?php echo $isActive ? 'component-badge--success' : ''; ?>">
                                    <span class="component-badge-dot"></span>
                                    <span><?php echo $isActive ? __('campaign_status_active') : __('campaign_status_paused'); ?></span>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <div class="component-empty-state-wrapper">
                <div class="component-card--grouped">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">campaign</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('empty_campaigns_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('empty_campaigns_desc'); ?></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>
