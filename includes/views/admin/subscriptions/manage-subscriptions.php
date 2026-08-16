<?php
use App\Api\Services\Admin\AdminViewService;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$adminService = new AdminViewService();
$subData = $adminService->getManageSubscriptionsData($searchQuery, $page);

extract($subData);

$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/subscriptions?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/subscriptions?page=' . ($page + 1) . $queryString : '#';
?>
<div class="view-content" data-ref="manageSubscriptionsView" data-is-superadmin="<?php echo $isSuperAdmin; ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_tiers_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="subscription-selection-actions">
                    <?php if ($canManageTiers): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="editTier" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleVisibilityTier" data-tooltip="<?php echo __('btn_toggle_visibility'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">shopping_bag</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="setPopularTier" data-tooltip="<?php echo __('btn_set_popular'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">star</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteTier" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <?php endif; ?>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($_GET['q']) ? 'has-active-filter' : ''; ?>" data-action="searchTier" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    
                    <?php if ($canManageTiers): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="addTier" data-tooltip="<?php echo __('btn_add_tier'); ?>" data-position="bottom">
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
                        <input type="text" data-ref="tier-search-input" placeholder="<?php echo __('admin_tier_search_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <?php if ($tiers && count($tiers) > 0): ?>
            <div class="component-table-wrapper" data-ref="tiers-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('admin_tier_col_name'); ?></th>
                            <th data-width="120"><?php echo __('admin_tier_col_level'); ?></th>
                            <th data-width="140"><?php echo __('admin_tier_col_visibility'); ?></th>
                            <th data-width="140"><?php echo __('admin_tier_col_popularity'); ?></th>
                            <th data-width="180"><?php echo __('admin_roles_col_created_at'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="tiers-table-body">
                        <?php foreach ($tiers as $tier): 
                            $colorData = json_decode($tier['color'], true);
                            if (!$colorData || !isset($colorData['colors'])) {
                                $colorData = ['type' => 'solid', 'colors' => [['hex' => '#808080', 'stop' => 0]]];
                            }

                            $cssColorValue = '';

                            if ($colorData['type'] === 'gradient' && count($colorData['colors']) > 1) {
                                $angle = $colorData['angle'] ?? 0;
                                $prevStop = 0;
                                $stops = [];
                                foreach ($colorData['colors'] as $c) {
                                    $hex = htmlspecialchars(is_string($c) ? $c : $c['hex']);
                                    $percentage = isset($c['percentage']) ? (int)$c['percentage'] : (isset($c['stop']) ? (int)$c['stop'] : 100);
                                    $endStop = $prevStop + $percentage;
                                    $stops[] = "{$hex} {$prevStop}% {$endStop}%";
                                    $prevStop = $endStop;
                                }
                                $cssColorValue = "conic-gradient(from {$angle}deg, " . implode(', ', $stops) . ")";
                            } else {
                                $cssColorValue = htmlspecialchars(is_string($colorData['colors'][0]) ? $colorData['colors'][0] : $colorData['colors'][0]['hex']);
                            }

                            $rawName = $tier['name'] ?? '';
                            
                            $createdAt = explode(' ', $tier['created_at'])[0];
                            $isSystemFlag = ($tier['id'] <= 1) ? 1 : 0;
                        ?>
                        <tr class="component-table-row clickable" 
                            data-action="selectTierRow" 
                            data-tier-id="<?php echo htmlspecialchars($tier['uuid']); ?>" 
                            data-tier-name="<?php echo htmlspecialchars($rawName); ?>" 
                            data-is-system="<?php echo $isSystemFlag; ?>" 
                            data-tier-level="<?php echo (int)$tier['tier_level']; ?>">
                            <td>
                                <div class="td-user-info">
                                     <div class="component-button--profile subscription-dynamic component-avatar--static-sm" 
                                          data-sub-bg="<?php echo htmlspecialchars($cssColorValue); ?>"
                                          style="--active-subscription-bg: <?php echo htmlspecialchars($cssColorValue); ?>;">
                                        <img src="/public/assets/img/fallbacks/avatar-default.png" alt="<?php echo __('alt_avatar'); ?>"
                                             class="image-lazy-fade"
                                             onload="this.classList.add('image-loaded')">
                                    </div>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">workspace_premium</span>
                                        <span class="search-target"><?php echo htmlspecialchars($rawName); ?></span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">layers</span>
                                    <span >
                                        <?php echo (int)$tier['tier_level']; ?>
                                    </span>
                                </div>
                            </td>
                            <td>
                                <?php if ($tier['is_active']): ?>
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
                            <td>
                                <?php if ($tier['is_popular']): ?>
                                    <div class="component-badge component-badge--sm component-badge--warning">
                                        <span class="material-symbols-rounded component-icon-sm">star</span>
                                        <span><?php echo __('admin_tier_status_popular'); ?></span>
                                    </div>
                                <?php else: ?>
                                    <span class="td-muted">-</span>
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
                            <td colspan="5" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                    <p class="component-empty-state-text"><?php echo __('admin_tier_search_empty'); ?></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <div class="component-empty-state" data-ref="tiers-empty-state">
                <span class="material-symbols-rounded component-empty-state-icon">workspace_premium</span>
                <p class="component-empty-state-text"><?php echo __('admin_tier_empty_desc'); ?></p>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>