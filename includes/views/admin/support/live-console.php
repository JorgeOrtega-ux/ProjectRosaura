<?php
use App\Api\Services\Admin\AdminViewService;
use App\Core\Helpers\Utils;

$chatUuid = $_GET['uuid'] ?? null;
if (empty($chatUuid)) {
    $uriParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/'));
    $cIdx = array_search('c', $uriParts, true);
    if ($cIdx !== false && isset($uriParts[$cIdx + 1])) {
        $chatUuid = $uriParts[$cIdx + 1];
    }
}

$adminService = new AdminViewService();
$consoleData = $adminService->getLiveConsoleData($chatUuid);

extract($consoleData);

$statusLabels = [
    'online' => __('lbl_agent_status_online'),
    'busy' => __('lbl_agent_status_busy'),
    'away' => __('lbl_agent_status_away'),
    'offline' => __('lbl_agent_status_offline')
];
$currentStatusLabel = $statusLabels[$agentStatus] ?? __('lbl_agent_status_offline');
$currentStatusClass = 'status-' . $agentStatus;
$fallbackAvatar = $appUrl . '/public/assets/img/fallbacks/avatar-default.png';
?>

<div class="view-content" data-ref="admin-support-live-wrapper" data-initial-tab="<?php echo htmlspecialchars($initialActiveTab); ?>" data-initial-status="<?php echo htmlspecialchars($agentStatus); ?>" data-current-chat="<?php echo htmlspecialchars($chatUuid ?? ''); ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('title_support_live'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="adminSupportTopMoreDropdown" data-tooltip="<?php echo __('btn_options'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">more_vert</span>
                    </button>
                    <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="adminSupportTopMoreDropdown">
                        <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="support-top-main-menu">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            <div class="component-menu-list component-menu-list--scrollable">
                                <div class="component-menu-link" data-action="showSubMenu" data-menu-target="support-top-status-menu">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded <?php echo $currentStatusClass; ?>" data-ref="agent-status-indicator-icon">fiber_manual_record</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span data-ref="agent-status-display-text"><?php echo htmlspecialchars($currentStatusLabel); ?></span>
                                    </div>
                                    <div class="component-menu-link-actions">
                                        <span class="material-symbols-rounded">chevron_right</span>
                                    </div>
                                </div>

                                <div class="component-menu-divider"></div>

                                <?php if ($canManageTickets): ?>
                                <div class="component-menu-link" data-nav="<?php echo $appUrl; ?>/admin/support/tickets">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">mail</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_manage_tickets'); ?></span></div>
                                </div>
                                <?php endif; ?>

                                <?php if ($canManageCanned): ?>
                                <div class="component-menu-link" data-nav="<?php echo $appUrl; ?>/admin/support/canned-responses">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">quickreply</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_canned_responses'); ?></span></div>
                                </div>
                                <?php endif; ?>

                                <?php if ($canViewMetrics): ?>
                                <div class="component-menu-link" data-nav="<?php echo $appUrl; ?>/admin/support/metrics">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">analytics</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_support_metrics'); ?></span></div>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-menu="support-top-status-menu">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            <div class="component-menu-header">
                                <div class="component-menu-header-box">
                                    <button class="component-button component-button--icon component-button--h32" data-action="showSubMenu" data-menu-target="support-top-main-menu" type="button">
                                        <span class="material-symbols-rounded">arrow_back</span>
                                    </button>
                                    <span class="component-menu-header-title"><?php echo __('lbl_agent_status'); ?></span>
                                </div>
                            </div>
                            <div class="component-menu-list component-menu-list--scrollable">
                                <div class="component-menu-link <?php echo $agentStatus === 'online' ? 'active' : ''; ?>" data-action="changeAgentStatus" data-val="online">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded status-online">check_circle</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_online'); ?></span></div>
                                </div>
                                <div class="component-menu-link <?php echo $agentStatus === 'busy' ? 'active' : ''; ?>" data-action="changeAgentStatus" data-val="busy">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded status-busy">do_not_disturb_on</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_busy'); ?></span></div>
                                </div>
                                <div class="component-menu-link <?php echo $agentStatus === 'away' ? 'active' : ''; ?>" data-action="changeAgentStatus" data-val="away">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded status-away">schedule</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_away'); ?></span></div>
                                </div>
                                <div class="component-menu-link <?php echo $agentStatus === 'offline' ? 'active' : ''; ?>" data-action="changeAgentStatus" data-val="offline">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded status-offline">cancel</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_offline'); ?></span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-bottom component-bottom--console">
            
            <!-- COLUMNA 1: COLAS DE ESPERA Y CHATS ACTIVOS -->
            <div class="component-column-box component-column-box--sidebar" data-ref="support-column-queues">
                <div class="component-column-header">
                    <div class="component-badge-group">
                        <button class="component-badge component-badge--interactive component-badge--grouped-item <?php echo $initialActiveTab === 'l1' ? 'active' : ''; ?>" data-action="switchQueueTab" data-tab="l1" type="button">
                            <span><?php echo __('lbl_dept_l1'); ?></span>
                            <span data-ref="badge-queue-l1"><?php echo $counts['l1']; ?></span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item <?php echo $initialActiveTab === 'l2' ? 'active' : ''; ?>" data-action="switchQueueTab" data-tab="l2" type="button">
                            <span><?php echo __('lbl_dept_l2'); ?></span>
                            <span data-ref="badge-queue-l2"><?php echo $counts['l2']; ?></span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item <?php echo $initialActiveTab === 'l3' ? 'active' : ''; ?>" data-action="switchQueueTab" data-tab="l3" type="button">
                            <span><?php echo __('lbl_dept_l3'); ?></span>
                            <span data-ref="badge-queue-l3"><?php echo $counts['l3']; ?></span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item <?php echo $initialActiveTab === 'active' ? 'active' : ''; ?>" data-action="switchQueueTab" data-tab="active" type="button">
                            <span><?php echo __('lbl_my_active_chats'); ?></span>
                            <span data-ref="badge-queue-active"><?php echo $counts['active']; ?></span>
                        </button>
                    </div>
                </div>

                <div class="component-card-list component-card-list--scrollable" data-ref="admin-support-queue-container">
                    <?php if (!empty($activeTabSessions)): ?>
                        <?php foreach ($activeTabSessions as $session): 
                            $clientName = $session['client_username'] ?? $session['guest_name'] ?? __('lbl_guest');
                            $subColorRaw = !empty($session['client_subscription_color']) ? $session['client_subscription_color'] : '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}';
                            $subColorCSS = AdminViewService::parseSubscriptionColor($subColorRaw);
                            $validPic = Utils::getValidImage($session['client_avatar'] ?? null, 'avatar');
                            $avatarSrc = (strpos($validPic, 'http') === 0) ? $validPic : $appUrl . '/' . ltrim($validPic, '/');
                            $isCurrent = ($chatUuid === $session['uuid']);
                            $dynamicClass = ($subColorCSS && $subColorCSS !== 'transparent') ? 'subscription-dynamic' : '';
                        ?>
                        <div class="component-group-item component-group-item--clickable <?php echo $isCurrent ? 'active' : ''; ?>" data-action="selectQueueSession" data-uuid="<?php echo htmlspecialchars($session['uuid']); ?>">
                            <div class="component-card__content">
                                <div class="component-button--profile <?php echo $dynamicClass; ?> component-avatar--static-sm" 
                                     data-sub-bg="<?php echo htmlspecialchars($subColorCSS); ?>"
                                     style="--active-subscription-bg: <?php echo htmlspecialchars($subColorCSS); ?>;">
                                    <img class="image-lazy-fade" src="<?php echo htmlspecialchars($avatarSrc); ?>" alt="<?php echo __('alt_avatar'); ?>"
                                         onload="this.classList.add('image-loaded')"
                                         onerror="this.onerror=null; this.src='<?php echo $fallbackAvatar; ?>'; this.classList.add('image-loaded');">
                                </div>
                                <div class="component-card__text">
                                    <h3 class="component-card__title"><?php echo htmlspecialchars($clientName); ?></h3>
                                    <p class="component-card__description"><?php echo htmlspecialchars($session['subject'] ?? __('lbl_no_subject')); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions">
                                <span class="component-badge component-badge--sm <?php echo $session['priority'] === 'urgent' ? 'component-badge--danger' : ($session['priority'] === 'high' ? 'component-badge--warning' : ''); ?>">
                                    <span class="material-symbols-rounded">flag</span>
                                </span>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="component-empty-state component-p-4">
                            <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                            <h3 class="component-card__title"><?php echo __('lbl_no_chats_in_queue'); ?></h3>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- COLUMNA 2: SALA DE CHAT EN VIVO -->
            <div class="component-column-box component-column-box--chat" data-ref="support-column-chat">
                <?php 
                $hasChat = !empty($currentSession);
                $currClientName = $currentSession['client_username'] ?? $currentSession['guest_name'] ?? __('lbl_guest');
                $currSubColorRaw = !empty($currentSession['client_subscription_color']) ? $currentSession['client_subscription_color'] : '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}';
                $currSubColorCSS = AdminViewService::parseSubscriptionColor($currSubColorRaw);
                $currPic = Utils::getValidImage($currentSession['client_avatar'] ?? null, 'avatar');
                $currAvatarSrc = (strpos($currPic, 'http') === 0) ? $currPic : $appUrl . '/' . ltrim($currPic, '/');
                $currDynamicClass = ($currSubColorCSS && $currSubColorCSS !== 'transparent') ? 'subscription-dynamic' : '';
                ?>
                <div class="component-chat-header <?php echo $hasChat ? 'active' : 'disabled'; ?>" data-ref="admin-support-chat-header">
                    <div class="component-mobile-back-box">
                        <button class="component-button component-button--icon component-button--h34" data-action="backToQueuesMobile" data-tooltip="<?php echo __('btn_back_to_queues'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">arrow_back</span>
                        </button>
                    </div>

                    <div class="component-card__content component-cursor-pointer" data-action="toggleModule" data-target="moduleSupportClientInfo">
                        <div data-ref="current-chat-client-avatar-container">
                            <div class="component-button--profile <?php echo $currDynamicClass; ?> component-avatar--static-sm"
                                 data-sub-bg="<?php echo htmlspecialchars($currSubColorCSS); ?>"
                                 style="--active-subscription-bg: <?php echo htmlspecialchars($currSubColorCSS); ?>;">
                                <img class="avatar-image image-lazy-fade" data-ref="current-chat-client-avatar" 
                                     src="<?php echo htmlspecialchars($hasChat ? $currAvatarSrc : $fallbackAvatar); ?>" 
                                     alt="Client"
                                     onload="this.classList.add('image-loaded')"
                                     onerror="this.onerror=null; this.src='<?php echo $fallbackAvatar; ?>'; this.classList.add('image-loaded');">
                            </div>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title" data-ref="current-chat-client-name"><?php echo htmlspecialchars($hasChat ? $currClientName : __('lbl_select_chat_to_attend')); ?></h2>
                            <p class="component-card__description" data-ref="current-chat-client-subject"><?php echo htmlspecialchars($hasChat ? ($currentSession['subject'] ?? '') : __('lbl_no_active_chat_selected')); ?></p>
                        </div>
                    </div>
                    
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit <?php echo $hasChat ? '' : 'disabled'; ?>" data-ref="admin-chat-top-actions">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="adminChatMoreDropdown" data-tooltip="<?php echo __('btn_options'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="adminChatMoreDropdown">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="admin-chat-more-menu">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <div class="component-menu-link" data-action="openViewIssueModal">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">help_outline</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('lbl_view_issue'); ?></span>
                                        </div>
                                    </div>

                                    <div class="component-menu-link" data-action="toggleModule" data-target="moduleSupportClientInfo">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">info</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('lbl_user_profile_title'); ?></span>
                                        </div>
                                    </div>

                                    <?php if ($canEscalate): ?>
                                    <div class="component-menu-link" data-action="openEscalateModal">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">forward</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('btn_escalate_chat'); ?></span>
                                        </div>
                                    </div>
                                    <?php endif; ?>
                                    <?php if ($canReassign): ?>
                                    <div class="component-menu-link" data-action="openReassignModal">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">swap_horiz</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('btn_reassign_chat'); ?></span>
                                        </div>
                                    </div>
                                    <?php endif; ?>
                                    <div class="component-menu-divider"></div>
                                    <div class="component-menu-link" data-action="openCloseChatModal">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">check_circle</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('btn_resolve_chat'); ?></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-chat-messages" data-ref="admin-support-messages-list">
                    <?php if ($hasChat && !empty($sessionMessages)): ?>
                        <?php foreach ($sessionMessages as $msg): 
                            $isAgent = ($msg['sender_type'] === 'agent');
                            $isInternal = !empty($msg['is_internal']);
                            $bubbleClass = $isInternal ? 'message-internal' : ($isAgent ? 'message-outgoing' : 'message-incoming');
                        ?>
                        <div class="component-chat-message <?php echo $bubbleClass; ?>">
                            <div class="component-chat-message__content">
                                <p><?php echo nl2br(htmlspecialchars($msg['message'])); ?></p>
                                <span class="component-chat-message__time"><?php echo htmlspecialchars($msg['created_at']); ?></span>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="component-empty-state">
                            <span class="material-symbols-rounded component-empty-state-icon">chat_bubble_outline</span>
                            <h3 class="component-card__title"><?php echo __('lbl_select_chat_prompt'); ?></h3>
                            <p class="component-card__description"><?php echo __('lbl_no_active_chat_selected'); ?></p>
                        </div>
                    <?php endif; ?>
                </div>

                <div class="component-chat-typing-indicator disabled" data-ref="admin-support-typing-indicator">
                    <span class="material-symbols-rounded">edit_note</span>
                    <span><?php echo __('lbl_user_is_typing'); ?></span>
                </div>

                <div class="component-chat-footer <?php echo $hasChat ? 'active' : 'disabled'; ?>" data-ref="admin-support-chat-footer">
                    <div class="chat-attachments-preview-container disabled" data-ref="admin-support-chat-attachments-preview"></div>
                    <div class="component-search component-search--full component-search--radius-50">
                        <div class="component-search-input">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                                <button class="component-chat-attach-btn" data-action="toggleModule" data-target="adminCannedResponsesDropdown" data-tooltip="<?php echo __('lbl_quick_canned'); ?>" data-position="top" type="button">
                                    <span class="material-symbols-rounded">quickreply</span>
                                </button>
                                <div class="component-module component-module--dropdown component-module--dropdown-top component-module--dropdown-right component-module--dropdown-fixed disabled" data-module="adminCannedResponsesDropdown">
                                    <div class="component-menu component-menu--w320 component-menu--h-auto component-menu--no-padding component-menu--limited active" data-ref="menuCannedResponses">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-header">
                                            <div class="component-search component-search--full component-search--h36">
                                                <div class="component-search-icon">
                                                    <span class="material-symbols-rounded">search</span>
                                                </div>
                                                <div class="component-search-input">
                                                    <input type="text" data-ref="admin-canned-search" placeholder="<?php echo __('search_canned_responses'); ?>" autocomplete="off">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="component-menu-list component-menu-list--scrollable" data-ref="admin-canned-list-menu">
                                        </div>
                                        <div class="component-menu-empty disabled" data-ref="admin-canned-empty">
                                            <div class="component-menu-link disabled-interaction">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">search_off</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('no_results_found'); ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button class="component-button component-button--icon component-button--h32" data-action="triggerAdminChatAttach" data-tooltip="<?php echo __('chat_attach_photos'); ?>" data-position="top" type="button">
                                <span class="material-symbols-rounded">attach_file</span>
                            </button>
                            <input id="admin-support-chat-file-input" class="disabled" type="file" multiple accept="image/jpeg, image/png, image/webp, image/gif">

                            <button class="component-button component-button--icon component-button--h32" data-action="toggleInternalNoteMode" data-ref="btn-toggle-internal-note" data-tooltip="<?php echo __('tooltip_toggle_internal_note'); ?>" data-position="top" type="button">
                                <span class="material-symbols-rounded msr-sticky_note_2">sticky_note_2</span>
                            </button>

                            <input data-ref="admin-support-chat-input" type="text" placeholder="<?php echo __('placeholder_agent_chat_input'); ?>" maxlength="2000" autocomplete="off">

                            <button class="component-chat-send-btn active" data-action="sendAdminChatMessage" data-ref="admin-chat-btn-send" data-tooltip="<?php echo __('btn_send'); ?>" data-position="top" type="button">
                                <span class="material-symbols-rounded">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>

    <!-- MODULO LATERAL DERECHO: INFORMACIÓN DEL USUARIO Y SESIÓN -->
    <div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleSupportClientInfo">
        <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding active" data-menu="support-client-info-menu">
            <div class="pill-container"><div class="drag-handle"></div></div>
            
            <div class="component-menu-header">
                <div class="component-menu-header-box">
                    <div class="chat-header-title-box">
                        <span class="material-symbols-rounded">person</span>
                        <span class="component-menu-header-title"><?php echo __('lbl_user_profile_title'); ?></span>
                    </div>
                </div>
            </div>

            <div class="component-menu-list component-menu-list--scrollable component-p-3" data-ref="admin-support-client-info">
                <?php if ($hasChat): ?>
                    <div class="component-group-item component-mb-3">
                        <div class="component-card__content">
                            <div class="component-button--profile <?php echo $currDynamicClass; ?> component-avatar--static-md"
                                 data-sub-bg="<?php echo htmlspecialchars($currSubColorCSS); ?>"
                                 style="--active-subscription-bg: <?php echo htmlspecialchars($currSubColorCSS); ?>;">
                                <img class="avatar-image image-lazy-fade" src="<?php echo htmlspecialchars($currAvatarSrc); ?>" alt="Avatar"
                                     onload="this.classList.add('image-loaded')"
                                     onerror="this.onerror=null; this.src='<?php echo $fallbackAvatar; ?>'; this.classList.add('image-loaded');">
                            </div>
                            <div class="component-card__text">
                                <h3 class="component-card__title"><?php echo htmlspecialchars($currClientName); ?></h3>
                                <p class="component-card__description"><?php echo htmlspecialchars($currentSession['client_email'] ?? ''); ?></p>
                            </div>
                        </div>
                    </div>
                    <div class="component-badge-group component-mb-3">
                        <span class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded">category</span>
                            <span><?php echo htmlspecialchars($currentSession['category'] ?? 'general'); ?></span>
                        </span>
                        <span class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded">flag</span>
                            <span><?php echo htmlspecialchars($currentSession['priority'] ?? 'medium'); ?></span>
                        </span>
                    </div>
                <?php else: ?>
                    <div class="component-empty-state">
                        <span class="material-symbols-rounded component-empty-state-icon">account_circle</span>
                        <h3 class="component-card__title"><?php echo __('lbl_no_user_selected'); ?></h3>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>
