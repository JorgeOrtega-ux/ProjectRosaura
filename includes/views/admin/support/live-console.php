<?php
use App\Core\System\PermissionsConstants as PC;

$userPermissions = $_SESSION['user_permissions'] ?? [];
$canEscalate = in_array(PC::SUPPORT_CHAT_ESCALATE, $userPermissions);
$canReassign = in_array(PC::SUPPORT_CHAT_REASSIGN, $userPermissions);
$canViewMetrics = in_array(PC::SUPPORT_VIEW_METRICS, $userPermissions);
$canManageCanned = in_array(PC::SUPPORT_MANAGE_CANNED, $userPermissions);
$canManageTickets = in_array(PC::SUPPORT_TICKETS_MANAGE, $userPermissions);
?>
<div class="view-content" data-ref="admin-support-live-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_support_live_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-dropdown-wrapper">
                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminAgentStatusDropdown">
                        <span class="material-symbols-rounded" data-ref="agent-status-indicator-icon">fiber_manual_record</span>
                        <span class="component-dropdown-text" data-ref="agent-status-display-text"><?php echo __('lbl_agent_status_offline'); ?></span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div class="component-module component-module--dropdown component-module--dropdown-right disabled" data-module="adminAgentStatusDropdown">
                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            <div class="component-menu-list">
                                <div class="component-menu-link" data-action="changeAgentStatus" data-val="online">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">check_circle</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_online'); ?></span></div>
                                </div>
                                <div class="component-menu-link" data-action="changeAgentStatus" data-val="busy">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">do_not_disturb_on</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_busy'); ?></span></div>
                                </div>
                                <div class="component-menu-link" data-action="changeAgentStatus" data-val="away">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_away'); ?></span></div>
                                </div>
                                <div class="component-menu-link active" data-action="changeAgentStatus" data-val="offline">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">cancel</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('lbl_agent_status_offline'); ?></span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button class="component-button component-button--icon component-button--h40 <?php echo !$canManageTickets ? 'disabled-interaction' : ''; ?>" data-nav="<?php echo APP_URL; ?>/admin/support/tickets" data-tooltip="<?php echo __('admin_manage_tickets'); ?>" data-position="bottom" <?php echo !$canManageTickets ? 'disabled' : ''; ?>>
                    <span class="material-symbols-rounded">mail</span>
                </button>
                <button class="component-button component-button--icon component-button--h40 <?php echo !$canManageCanned ? 'disabled-interaction' : ''; ?>" data-nav="<?php echo APP_URL; ?>/admin/support/canned-responses" data-tooltip="<?php echo __('admin_canned_responses'); ?>" data-position="bottom" <?php echo !$canManageCanned ? 'disabled' : ''; ?>>
                    <span class="material-symbols-rounded">quickreply</span>
                </button>
                <button class="component-button component-button--icon component-button--h40 <?php echo !$canViewMetrics ? 'disabled-interaction' : ''; ?>" data-nav="<?php echo APP_URL; ?>/admin/support/metrics" data-tooltip="<?php echo __('admin_support_metrics'); ?>" data-position="bottom" <?php echo !$canViewMetrics ? 'disabled' : ''; ?>>
                    <span class="material-symbols-rounded">analytics</span>
                </button>
                <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/dashboard" data-tooltip="<?php echo __('btn_back_to_dashboard'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">dashboard</span>
                </button>
            </div>
        </div>

        <div class="component-bottom component-bottom--support-console">
            
            <!-- COLUMNA 1: COLAS DE ESPERA Y CHATS ACTIVOS -->
            <div class="admin-support-column admin-support-column--queues">
                <div class="admin-support-column-header">
                    <h2 class="component-top-title"><?php echo __('admin_support_queues_title'); ?></h2>
                </div>
                
                <div class="component-pill-bar component-p-2">
                    <button class="component-pill-button active" data-action="switchQueueTab" data-tab="l1"><?php echo __('lbl_dept_l1'); ?> <span class="component-badge" data-ref="badge-queue-l1">0</span></button>
                    <button class="component-pill-button" data-action="switchQueueTab" data-tab="l2"><?php echo __('lbl_dept_l2'); ?> <span class="component-badge" data-ref="badge-queue-l2">0</span></button>
                    <button class="component-pill-button" data-action="switchQueueTab" data-tab="l3"><?php echo __('lbl_dept_l3'); ?> <span class="component-badge" data-ref="badge-queue-l3">0</span></button>
                    <button class="component-pill-button" data-action="switchQueueTab" data-tab="active"><?php echo __('lbl_my_active_chats'); ?> <span class="component-badge" data-ref="badge-queue-active">0</span></button>
                </div>

                <div class="admin-support-queue-list" data-ref="admin-support-queue-container">
                    <div class="component-empty-state">
                        <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                        <h3 class="component-card__title"><?php echo __('admin_no_chats_in_queue'); ?></h3>
                    </div>
                </div>
            </div>

            <!-- COLUMNA 2: SALA DE CHAT EN VIVO -->
            <div class="admin-support-column admin-support-column--chat">
                <div class="admin-support-chat-header" data-ref="admin-support-chat-header">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded" data-ref="current-chat-client-avatar">person</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title" data-ref="current-chat-client-name"><?php echo __('admin_select_chat_to_attend'); ?></h2>
                            <p class="component-card__description" data-ref="current-chat-client-subject"><?php echo __('admin_no_active_chat_selected'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions disabled" data-ref="admin-chat-top-actions">
                        <?php if ($canEscalate): ?>
                        <button class="component-button component-button--h34" data-action="openEscalateModal" type="button">
                            <span class="material-symbols-rounded">forward</span>
                            <span><?php echo __('btn_escalate_chat'); ?></span>
                        </button>
                        <?php endif; ?>
                        <?php if ($canReassign): ?>
                        <button class="component-button component-button--h34" data-action="openReassignModal" type="button">
                            <span class="material-symbols-rounded">swap_horiz</span>
                            <span><?php echo __('btn_reassign_chat') ?? 'Reasignar'; ?></span>
                        </button>
                        <?php endif; ?>
                        <button class="component-button component-button--dark component-button--h34" data-action="openCloseChatModal" type="button">
                            <span class="material-symbols-rounded">check_circle</span>
                            <span><?php echo __('btn_resolve_chat'); ?></span>
                        </button>
                    </div>
                </div>

                <div class="admin-support-messages-container" data-ref="admin-support-messages-list">
                    <div class="component-empty-state">
                        <span class="material-symbols-rounded component-empty-state-icon">chat_bubble_outline</span>
                        <h3 class="component-card__title"><?php echo __('admin_select_chat_prompt'); ?></h3>
                    </div>
                </div>

                <div class="component-chat-typing-indicator disabled" data-ref="admin-support-typing-indicator">
                    <span class="material-symbols-rounded">edit_note</span>
                    <span><?php echo __('lbl_user_is_typing') ?? 'El usuario está escribiendo...'; ?></span>
                </div>

                <div class="admin-support-chat-footer disabled" data-ref="admin-support-chat-footer">
                    <div class="admin-support-toolbar">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger component-dropdown-trigger--small" data-action="toggleModule" data-target="adminCannedResponsesDropdown">
                                <span class="material-symbols-rounded">quickreply</span>
                                <span class="component-dropdown-text"><?php echo __('lbl_quick_canned'); ?></span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminCannedResponsesDropdown">
                                <div class="component-menu component-menu--w335 component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list" data-ref="admin-canned-list-menu">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button class="component-button component-button--icon component-button--h32" data-action="toggleInternalNoteMode" data-ref="btn-toggle-internal-note" data-tooltip="<?php echo __('tooltip_toggle_internal_note'); ?>" data-position="top" type="button">
                            <span class="material-symbols-rounded">sticky_note_2</span>
                        </button>
                    </div>

                    <div class="chat-input-wrapper">
                        <div class="component-input-group component-input-group--h40">
                            <input class="component-input-field component-input-field--simple" data-ref="admin-support-chat-input" type="text" placeholder="<?php echo __('placeholder_agent_chat_input'); ?>" maxlength="2000" autocomplete="off">
                        </div>
                        <button class="component-button component-button--icon component-button--dark component-button--h40" data-action="sendAdminChatMessage" data-tooltip="<?php echo __('btn_send'); ?>" data-position="top" type="button">
                            <span class="material-symbols-rounded">send</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- COLUMNA 3: DETALLES DEL USUARIO Y SESIÓN -->
            <div class="admin-support-column admin-support-column--sidebar">
                <div class="admin-support-column-header">
                    <h2 class="component-top-title"><?php echo __('admin_user_profile_title'); ?></h2>
                </div>

                <div class="admin-support-sidebar-content" data-ref="admin-support-client-info">
                    <div class="component-empty-state">
                        <span class="material-symbols-rounded component-empty-state-icon">account_circle</span>
                        <h3 class="component-card__title"><?php echo __('admin_no_user_selected'); ?></h3>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>
