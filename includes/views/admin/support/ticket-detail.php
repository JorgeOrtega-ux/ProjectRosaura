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

<?php
$trackingCode = $ticket['tracking_code'] ?? ('4-50' . date('y', strtotime($ticket['created_at'] ?? 'now')) . sprintf('%09d', abs(crc32($ticket['uuid']))));
$trackingDisplay = '[' . htmlspecialchars($trackingCode) . ']';
?>

<div class="view-content" data-ref="admin-ticket-detail-wrapper" data-ticket-uuid="<?php echo htmlspecialchars($ticket['uuid']); ?>" data-ticket-tracking="<?php echo htmlspecialchars($trackingCode); ?>" data-ticket-subject="<?php echo htmlspecialchars($ticket['subject']); ?>" data-ticket-username="<?php echo htmlspecialchars($ticket['username'] ?? 'Usuario'); ?>">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title" data-ref="ticket-detail-title"><?php echo __('title_ticket_detail'); ?> <span class="component-font-mono"><?php echo $trackingDisplay; ?></span></h1>
        </div>
        <div class="component-top-right">
            <div class="component-dropdown-wrapper">
                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTicketStatusChange">
                    <span class="material-symbols-rounded" data-ref="ticket-status-icon"><?php echo htmlspecialchars($stInfo['icon']); ?></span>
                    <span class="component-dropdown-text" data-ref="ticket-status-text"><?php echo htmlspecialchars($stInfo['label']); ?></span>
                    <span class="material-symbols-rounded">expand_more</span>
                </div>
                <div class="component-module component-module--dropdown disabled" data-module="moduleTicketStatusChange">
                    <div class="component-menu component-menu--w-full component-menu--h-auto active">
                        <div class="pill-container"><div class="drag-handle"></div></div>
                        <div class="component-menu-list">
                            <div class="component-menu-link <?php echo $ticket['status'] === 'open' ? 'active' : ''; ?>" data-action="updateTicketStatusAction" data-status="open">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">error</span></div>
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_open'); ?></span></div>
                            </div>
                            <div class="component-menu-link <?php echo $ticket['status'] === 'in_progress' ? 'active' : ''; ?>" data-action="updateTicketStatusAction" data-status="in_progress">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">timelapse</span></div>
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_in_progress'); ?></span></div>
                            </div>
                            <div class="component-menu-link <?php echo $ticket['status'] === 'resolved' ? 'active' : ''; ?>" data-action="updateTicketStatusAction" data-status="resolved">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">check_circle</span></div>
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_resolved'); ?></span></div>
                            </div>
                            <div class="component-menu-link <?php echo $ticket['status'] === 'closed' ? 'active' : ''; ?>" data-action="updateTicketStatusAction" data-status="closed">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_closed'); ?></span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
                            <span class="component-badge" data-ref="ticket-tracking-badge" title="<?php echo __('lbl_tracking_code', [], 'Número de seguimiento'); ?>">
                                <span class="material-symbols-rounded">tag</span>
                                <span class="component-font-mono"><?php echo htmlspecialchars($trackingCode); ?></span>
                            </span>
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
                                <span class="component-card__label"><?php echo __('lbl_ticket_details'); ?></span>
                                <h3 class="component-card__title component-mt-1" data-ref="ticket-detail-subject"><?php echo htmlspecialchars($ticket['subject']); ?></h3>
                                <p class="component-card__description" data-ref="ticket-detail-date"><?php echo __('lbl_created_at'); ?>: <?php echo htmlspecialchars($ticket['created_at']); ?> &nbsp;|&nbsp; UUID: <?php echo htmlspecialchars($ticket['uuid']); ?></p>
                            </div>
                        </div>
                        <?php if (!empty($ticket['message'])): ?>
                        <div class="component-card__content component-mt-2">
                            <div class="component-card__text" data-ref="ticket-detail-original-message">
                                <p class="component-card__description"><?php echo nl2br(htmlspecialchars($ticket['message'])); ?></p>
                            </div>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="component-card--grouped" data-ref="ticket-reply-card">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-flex-between">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_reply_ticket_heading'); ?></h2>
                                <p class="component-card__description"><?php echo __('lbl_reply_ticket_desc'); ?></p>
                            </div>
                            <div class="component-actions-group" style="display: flex; align-items: center; gap: 8px;">
                                <div class="component-dropdown-wrapper">
                                    <div class="component-dropdown-trigger component-dropdown-trigger--h36" data-action="toggleModule" data-target="moduleTicketReplyTemplates">
                                        <span class="material-symbols-rounded">quickreply</span>
                                        <span class="component-dropdown-text" data-ref="ticket-selected-template-label"><?php echo __('lbl_select_email_template', [], 'Plantillas de Correo'); ?></span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>
                                    <div class="component-module component-module--dropdown disabled" data-module="moduleTicketReplyTemplates">
                                        <div class="component-menu component-menu--w320 component-menu--h-auto active">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list component-menu-list--scrollable">
                                                <div class="component-menu-link active" data-action="applyTicketTemplate" data-template-key="blank">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">edit_note</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('tpl_ticket_blank', [], 'Respuesta Personalizada / Libre'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="applyTicketTemplate" data-template-key="resolved">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">check_circle</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('tpl_ticket_resolved', [], 'Resolución y Cierre de Incidencia'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="applyTicketTemplate" data-template-key="request_details">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">screenshot</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('tpl_ticket_request_details', [], 'Solicitud de Más Información / Capturas'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="applyTicketTemplate" data-template-key="investigating">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">engineering</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('tpl_ticket_investigating', [], 'En Investigación Técnica / Escalamiento'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="applyTicketTemplate" data-template-key="billing">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">credit_card</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('tpl_ticket_billing', [], 'Facturación, Membresía y Pagos'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="applyTicketTemplate" data-template-key="security">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">security</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('tpl_ticket_security', [], 'Verificación y Seguridad de Cuenta'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="applyTicketTemplate" data-template-key="follow_up">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('tpl_ticket_follow_up', [], 'Actualización de Estado / En Progreso'); ?></span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button class="component-button component-button--icon component-button--h36" data-action="aiImproveTicketReply" data-tooltip="<?php echo __('btn_ai_improve'); ?>" data-position="top" type="button">
                                    <span class="material-symbols-rounded">auto_fix_high</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h36 component-button--primary" data-action="submitTicketReply" data-tooltip="<?php echo __('btn_send_reply'); ?>" data-position="top" type="button">
                                    <span class="material-symbols-rounded">send</span>
                                </button>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch component-mt-3">
                            <textarea class="component-input-field" data-ref="ticket-reply-text" placeholder="<?php echo __('placeholder_reply_ticket_message'); ?>" rows="7" maxlength="5000" required></textarea>
                        </div>
                    </div>

                    <div class="component-group-item">
                        <div class="component-card__content">
                            <span class="component-card__description" data-ref="ticket-reply-hint">
                                <span class="material-symbols-rounded component-icon--inline">info</span> <?php echo __('lbl_template_editable_hint', [], 'Puedes modificar los detalles entre corchetes antes de enviar.'); ?>
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>

