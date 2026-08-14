<?php
use App\Core\System\PermissionsConstants as PC;

$userPermissions = $_SESSION['user_permissions'] ?? [];
$canEscalate = in_array(PC::SUPPORT_CHAT_ESCALATE, $userPermissions);
$canReassign = in_array(PC::SUPPORT_CHAT_REASSIGN, $userPermissions);
$canViewMetrics = in_array(PC::SUPPORT_VIEW_METRICS, $userPermissions);
$canManageCanned = in_array(PC::SUPPORT_MANAGE_CANNED, $userPermissions);
$canManageTickets = in_array(PC::SUPPORT_TICKETS_MANAGE, $userPermissions);

$chatUuid = $_GET['uuid'] ?? null;
if (empty($chatUuid)) {
    $uriParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/'));
    $cIdx = array_search('c', $uriParts, true);
    if ($cIdx !== false && isset($uriParts[$cIdx + 1])) {
        $chatUuid = $uriParts[$cIdx + 1];
    }
}

$initialActiveTab = 'l1';
if (!empty($chatUuid)) {
    try {
        $dbMgr = new \App\Config\Database\DatabaseManager();
        $pdo = $dbMgr->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
        $stmt = $pdo->prepare("SELECT department_level, status, assigned_agent_id FROM support_chat_sessions WHERE uuid = ? LIMIT 1");
        $stmt->execute([$chatUuid]);
        $sessRow = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($sessRow) {
            $currentUserId = $_SESSION['user_id'] ?? null;
            if ($sessRow['status'] === 'active' || ($currentUserId && (int)$sessRow['assigned_agent_id'] === (int)$currentUserId)) {
                $initialActiveTab = 'active';
            } elseif (!empty($sessRow['department_level'])) {
                $initialActiveTab = $sessRow['department_level'];
            }
        }
    } catch (\Throwable $e) {}
}
?>
<div class="view-content" data-ref="admin-support-live-wrapper" data-initial-tab="<?php echo htmlspecialchars($initialActiveTab); ?>">
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
                                        <span class="material-symbols-rounded status-offline" data-ref="agent-status-indicator-icon">fiber_manual_record</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span data-ref="agent-status-display-text"><?php echo __('lbl_agent_status_offline'); ?></span>
                                    </div>
                                    <div class="component-menu-link-actions">
                                        <span class="material-symbols-rounded">chevron_right</span>
                                    </div>
                                </div>

                                <div class="component-menu-divider"></div>

                                <?php if ($canManageTickets): ?>
                                <div class="component-menu-link" data-nav="<?php echo APP_URL; ?>/admin/support/tickets">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">mail</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_manage_tickets'); ?></span></div>
                                </div>
                                <?php endif; ?>

                                <?php if ($canManageCanned): ?>
                                <div class="component-menu-link" data-nav="<?php echo APP_URL; ?>/admin/support/canned-responses">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">quickreply</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_canned_responses'); ?></span></div>
                                </div>
                                <?php endif; ?>

                                <?php if ($canViewMetrics): ?>
                                <div class="component-menu-link" data-nav="<?php echo APP_URL; ?>/admin/support/metrics">
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
                                <div class="component-menu-link" data-action="changeAgentStatus" data-val="online">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded status-online">check_circle</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_online'); ?></span></div>
                                </div>
                                <div class="component-menu-link" data-action="changeAgentStatus" data-val="busy">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded status-busy">do_not_disturb_on</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_busy'); ?></span></div>
                                </div>
                                <div class="component-menu-link" data-action="changeAgentStatus" data-val="away">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded status-away">schedule</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_away'); ?></span></div>
                                </div>
                                <div class="component-menu-link active" data-action="changeAgentStatus" data-val="offline">
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
                            <span data-ref="badge-queue-l1">0</span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item <?php echo $initialActiveTab === 'l2' ? 'active' : ''; ?>" data-action="switchQueueTab" data-tab="l2" type="button">
                            <span><?php echo __('lbl_dept_l2'); ?></span>
                            <span data-ref="badge-queue-l2">0</span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item <?php echo $initialActiveTab === 'l3' ? 'active' : ''; ?>" data-action="switchQueueTab" data-tab="l3" type="button">
                            <span><?php echo __('lbl_dept_l3'); ?></span>
                            <span data-ref="badge-queue-l3">0</span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item <?php echo $initialActiveTab === 'active' ? 'active' : ''; ?>" data-action="switchQueueTab" data-tab="active" type="button">
                            <span><?php echo __('lbl_my_active_chats'); ?></span>
                            <span data-ref="badge-queue-active">0</span>
                        </button>
                    </div>
                </div>

                <div class="component-card-list component-card-list--scrollable" data-ref="admin-support-queue-container">
                    <?php for ($i = 0; $i < 5; $i++): ?>
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-skeleton component-skeleton--avatar-sm"></div>
                            <div class="component-card__text">
                                <div class="component-skeleton component-skeleton--title-sm"></div>
                                <div class="component-skeleton component-skeleton--desc-sm"></div>
                            </div>
                        </div>
                    </div>
                    <?php endfor; ?>
                </div>
            </div>

            <!-- COLUMNA 2: SALA DE CHAT EN VIVO -->
            <div class="component-column-box component-column-box--chat" data-ref="support-column-chat">
                <div class="component-chat-header disabled" data-ref="admin-support-chat-header">
                    <div class="component-mobile-back-box">
                        <button class="component-button component-button--icon component-button--h34" data-action="backToQueuesMobile" data-tooltip="<?php echo __('btn_back_to_queues'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">arrow_back</span>
                        </button>
                    </div>

                    <div class="component-card__content component-cursor-pointer" data-action="toggleModule" data-target="moduleSupportClientInfo">
                        <div data-ref="current-chat-client-avatar-container">
                            <div class="component-button--profile component-avatar--static-sm">
                                <img class="avatar-image" data-ref="current-chat-client-avatar" src="/public/assets/img/fallbacks/avatar-default.png" alt="Guest">
                            </div>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title" data-ref="current-chat-client-name"><?php echo __('lbl_select_chat_to_attend'); ?></h2>
                            <p class="component-card__description" data-ref="current-chat-client-subject"><?php echo __('lbl_no_active_chat_selected'); ?></p>
                        </div>
                    </div>
                    
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit disabled" data-ref="admin-chat-top-actions">
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
                                            <span><?php echo __('lbl_view_issue', [], 'Ver problema'); ?></span>
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
                    <div class="component-empty-state">
                        <span class="material-symbols-rounded component-empty-state-icon">chat_bubble_outline</span>
                        <h3 class="component-card__title"><?php echo __('lbl_select_chat_prompt'); ?></h3>
                        <p class="component-card__description"><?php echo __('lbl_no_active_chat_selected'); ?></p>
                    </div>
                </div>

                <div class="component-chat-typing-indicator disabled" data-ref="admin-support-typing-indicator">
                    <span class="material-symbols-rounded">edit_note</span>
                    <span><?php echo __('lbl_user_is_typing'); ?></span>
                </div>

                <div class="component-chat-footer disabled" data-ref="admin-support-chat-footer">
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
                                                    <input type="text" data-ref="admin-canned-search" placeholder="<?php echo __('search_canned_responses', [], 'Buscar respuestas rápidas...'); ?>" autocomplete="off">
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

                            <button class="component-button component-button--icon component-button--h32" data-action="triggerAdminChatAttach" data-tooltip="<?php echo __('chat_attach_photos', [], 'Adjuntar imágenes'); ?>" data-position="top" type="button">
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
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">account_circle</span>
                    <h3 class="component-card__title"><?php echo __('lbl_no_user_selected'); ?></h3>
                </div>
            </div>
        </div>
    </div>
</div>
