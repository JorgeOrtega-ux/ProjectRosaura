<?php
use App\Api\Services\Admin\AdminViewService;
use App\Core\Helpers\Utils;

$ticketUuid = $_GET['uuid'] ?? '';
if (empty($ticketUuid)) {
    $uriParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/'));
    $tIdx = array_search('ticket', $uriParts, true);
    if ($tIdx !== false && isset($uriParts[$tIdx + 1])) {
        $ticketUuid = $uriParts[$tIdx + 1];
    }
}

$adminService = new AdminViewService();
$ticketData = $adminService->getTicketDetailData($ticketUuid);

if (!empty($ticketData['redirect'])) {
    header("Location: " . $ticketData['redirect']);
    exit;
}

extract($ticketData);

$subColorRaw = !empty($ticket['subscription_color']) ? $ticket['subscription_color'] : '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}';
$subColorCSS = AdminViewService::parseSubscriptionColor($subColorRaw);

$validPic = Utils::getValidImage($ticket['profile_picture'] ?? null, 'avatar');
$avatarSrc = (strpos($validPic, 'http') === 0) ? $validPic : $appUrl . '/' . ltrim($validPic, '/');
$fallbackAvatar = $appUrl . '/public/assets/img/fallbacks/avatar-default.png';

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

$dynamicClass = ($subColorCSS && $subColorCSS !== 'transparent') ? 'subscription-dynamic' : '';
?>

<div class="view-content" data-ref="admin-ticket-detail-wrapper" data-ticket-uuid="<?php echo htmlspecialchars($ticket['uuid']); ?>">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title" data-ref="ticket-detail-title"><?php echo __('title_ticket_detail'); ?> #<?php echo htmlspecialchars(substr($ticket['uuid'], 0, 8)); ?></h1>
        </div>
        <div class="component-top-right">
            <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTicketStatusChange">
                    <span class="material-symbols-rounded">rule</span>
                    <span class="component-dropdown-text" data-ref="ticket-status-text"><?php echo htmlspecialchars($stInfo['label']); ?></span>
                    <span class="material-symbols-rounded">expand_more</span>
                </div>
                <div class="component-module component-module--dropdown disabled" data-module="moduleTicketStatusChange">
                    <div class="component-menu component-menu--w200 component-menu--h-auto component-menu--no-padding active">
                        <div class="pill-container"><div class="drag-handle"></div></div>
                        <div class="component-menu-header">
                            <div class="component-menu-header-box">
                                <span class="component-menu-header-title"><?php echo __('lbl_change_status'); ?></span>
                            </div>
                        </div>
                        <div class="component-menu-list">
                            <div class="component-menu-link <?php echo $ticket['status'] === 'open' ? 'active' : ''; ?>" data-action="updateTicketStatusAction" data-status="open">
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_open'); ?></span></div>
                            </div>
                            <div class="component-menu-link <?php echo $ticket['status'] === 'in_progress' ? 'active' : ''; ?>" data-action="updateTicketStatusAction" data-status="in_progress">
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_in_progress'); ?></span></div>
                            </div>
                            <div class="component-menu-link <?php echo $ticket['status'] === 'resolved' ? 'active' : ''; ?>" data-action="updateTicketStatusAction" data-status="resolved">
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_resolved'); ?></span></div>
                            </div>
                            <div class="component-menu-link <?php echo $ticket['status'] === 'closed' ? 'active' : ''; ?>" data-action="updateTicketStatusAction" data-status="closed">
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_closed'); ?></span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo $appUrl; ?>/admin/support/tickets" data-tooltip="<?php echo __('btn_back_to_tickets'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-card--grouped component-mb-4" data-ref="ticket-customer-card">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-button--profile <?php echo $dynamicClass; ?> component-avatar--static-md" 
                                 data-ref="ticket-user-avatar-wrapper"
                                 data-sub-bg="<?php echo htmlspecialchars($subColorCSS); ?>"
                                 style="--active-subscription-bg: <?php echo htmlspecialchars($subColorCSS); ?>;">
                                <img class="image-lazy-fade" data-ref="ticket-user-avatar" 
                                     src="<?php echo htmlspecialchars($avatarSrc); ?>" 
                                     alt="<?php echo __('alt_avatar'); ?>"
                                     onload="this.classList.add('image-loaded')"
                                     onerror="this.onerror=null; this.src='<?php echo $fallbackAvatar; ?>'; this.classList.add('image-loaded');">
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title" data-ref="ticket-user-name"><?php echo htmlspecialchars($ticket['username'] ?? __('lbl_user')); ?></h2>
                                <p class="component-card__description" data-ref="ticket-user-email"><?php echo htmlspecialchars($ticket['email'] ?? ''); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions" data-ref="ticket-badges-container">
                            <span class="component-badge" data-ref="ticket-category-badge">
                                <span class="material-symbols-rounded">category</span>
                                <span><?php echo htmlspecialchars($ticket['category']); ?></span>
                            </span>
                            <span class="component-badge component-badge--sm <?php echo $prInfo['class']; ?>" data-ref="ticket-priority-badge">
                                <span class="material-symbols-rounded">flag</span>
                                <span><?php echo htmlspecialchars($prInfo['label']); ?></span>
                            </span>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title"><?php echo __('lbl_ticket_details'); ?></span>
                                <h3 class="component-card__title component-mt-1" data-ref="ticket-detail-subject"><?php echo htmlspecialchars($ticket['subject']); ?></h3>
                                <p class="component-card__description" data-ref="ticket-detail-date"><?php echo __('lbl_created_at'); ?>: <?php echo htmlspecialchars($ticket['created_at']); ?></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped" data-ref="ticket-reply-card">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_reply_ticket_heading'); ?></h2>
                                <p class="component-card__description"><?php echo __('lbl_reply_ticket_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch component-mt-2">
                            <div class="component-input-group">
                                <textarea class="component-input-field" data-ref="ticket-reply-text" placeholder=" " rows="5" maxlength="5000" required></textarea>
                                <label class="component-input-label"><?php echo __('placeholder_reply_ticket_message'); ?></label>
                            </div>
                        </div>
                    </div>

                    <div class="component-group-item">
                        <div class="component-card__actions component-card__actions--end">
                            <button class="component-button component-button--h40" data-action="submitTicketReply" type="button">
                                <span class="material-symbols-rounded">send</span>
                                <span><?php echo __('btn_send_reply'); ?></span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
