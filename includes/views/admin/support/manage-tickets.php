<?php
use App\Api\Services\Admin\AdminViewService;
use App\Core\Helpers\Utils;

$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

$adminService = new AdminViewService();
$ticketsData = $adminService->getManageTicketsData($searchQuery, $statusFilter, $page);

extract($ticketsData);
?>

<div class="view-content" data-ref="admin-support-tickets-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-tickets-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('title_tickets'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="followUpSelectedTicket" data-tooltip="<?php echo __('btn_follow_up_ticket'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">forward</span>
                    </button>
                </div>

                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($searchQuery) ? 'has-active-filter' : ''; ?>" data-action="toggleSearch" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40 <?php echo !empty($statusFilter) ? 'has-active-filter' : ''; ?>" data-action="toggleModule" data-target="moduleTicketFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown disabled" data-module="moduleTicketFilters">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('lbl_status'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link <?php echo empty($statusFilter) ? 'active' : ''; ?>" data-action="filterTicketStatus" data-status="">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_all_statuses'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link <?php echo $statusFilter === 'open' ? 'active' : ''; ?>" data-action="filterTicketStatus" data-status="open">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_status_open'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link <?php echo $statusFilter === 'in_progress' ? 'active' : ''; ?>" data-action="filterTicketStatus" data-status="in_progress">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_status_in_progress'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link <?php echo $statusFilter === 'resolved' ? 'active' : ''; ?>" data-action="filterTicketStatus" data-status="resolved">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_status_resolved'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link <?php echo $statusFilter === 'closed' ? 'active' : ''; ?>" data-action="filterTicketStatus" data-status="closed">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_status_closed'); ?></span></div>
                                    </div>
                                </div>
                            </div>
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
                        <input type="text" data-ref="tickets-search-input" placeholder="<?php echo __('placeholder_search_tickets'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>" autocomplete="off">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="admin-tickets-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th data-width="220"><?php echo __('table_header_user'); ?></th>
                            <th><?php echo __('lbl_support_subject'); ?></th>
                            <th data-width="140"><?php echo __('lbl_chat_category'); ?></th>
                            <th data-width="130"><?php echo __('lbl_chat_priority'); ?></th>
                            <th data-width="130"><?php echo __('lbl_status'); ?></th>
                            <th data-width="160"><?php echo __('lbl_date'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="admin-tickets-table-body">
                        <?php if (!empty($tickets)): ?>
                            <?php foreach ($tickets as $ticket): 
                                $statusMap = [
                                    'open' => ['class' => 'component-badge--danger', 'icon' => 'error', 'label' => __('lbl_status_open')],
                                    'in_progress' => ['class' => 'component-badge--warning', 'icon' => 'timelapse', 'label' => __('lbl_status_in_progress')],
                                    'resolved' => ['class' => 'component-badge--success', 'icon' => 'check_circle', 'label' => __('lbl_status_resolved')],
                                    'closed' => ['class' => '', 'icon' => 'lock', 'label' => __('lbl_status_closed')]
                                ];
                                $stInfo = $statusMap[$ticket['status']] ?? ['class' => '', 'icon' => 'help', 'label' => $ticket['status']];

                                $prioMap = [
                                    'low' => ['class' => '', 'label' => __('lbl_priority_low')],
                                    'medium' => ['class' => '', 'label' => __('lbl_priority_medium')],
                                    'high' => ['class' => 'component-badge--warning', 'label' => __('lbl_priority_high')],
                                    'urgent' => ['class' => 'component-badge--danger', 'label' => __('lbl_priority_urgent')]
                                ];
                                $prInfo = $prioMap[$ticket['priority']] ?? ['class' => '', 'label' => $ticket['priority']];

                                $subColorRaw = !empty($ticket['subscription_color']) ? $ticket['subscription_color'] : '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}';
                                $subColorCSS = AdminViewService::parseSubscriptionColor($subColorRaw);

                                $validPic = Utils::getValidImage($ticket['profile_picture'] ?? null, 'avatar');
                                $avatarSrc = (strpos($validPic, 'http') === 0) ? $validPic : $appUrl . '/' . ltrim($validPic, '/');
                                $fallbackAvatar = $appUrl . '/public/assets/img/fallbacks/avatar-default.png';
                            ?>
                            <tr class="component-table-row clickable" data-action="selectTicketRow" data-uuid="<?php echo htmlspecialchars($ticket['uuid']); ?>">
                                <td>
                                    <div class="td-user-info">
                                        <div class="component-button--profile subscription-dynamic component-avatar--static-sm" 
                                             data-sub-bg="<?php echo htmlspecialchars($subColorCSS); ?>"
                                             style="--active-subscription-bg: <?php echo htmlspecialchars($subColorCSS); ?>;">
                                            <img src="<?php echo htmlspecialchars($avatarSrc); ?>" alt="<?php echo __('alt_avatar'); ?>" 
                                                 class="image-lazy-fade"
                                                 onload="this.classList.add('image-loaded')"
                                                 onerror="this.onerror=null; this.src='<?php echo $fallbackAvatar; ?>'; this.classList.add('image-loaded');">
                                        </div>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">person</span>
                                            <span class="search-target"><?php echo htmlspecialchars($ticket['username'] ?? __('lbl_user')); ?></span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">chat</span>
                                        <span class="search-target"><?php echo htmlspecialchars($ticket['subject']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">category</span>
                                        <span><?php echo htmlspecialchars($ticket['category']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm <?php echo $prInfo['class']; ?>">
                                        <span class="material-symbols-rounded">flag</span>
                                        <span><?php echo htmlspecialchars($prInfo['label']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm <?php echo $stInfo['class']; ?>">
                                        <span class="material-symbols-rounded"><?php echo $stInfo['icon']; ?></span>
                                        <span><?php echo htmlspecialchars($stInfo['label']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span><?php echo htmlspecialchars($ticket['created_at']); ?></span>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="6" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                                        <p class="component-empty-state-text"><?php echo __('lbl_no_tickets_found'); ?></p>
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
