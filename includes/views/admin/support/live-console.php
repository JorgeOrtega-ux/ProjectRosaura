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
                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
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
            </div>
        </div>

        <div class="component-bottom component-bottom--support-console component-bottom--no-gap">
            
            <!-- COLUMNA 1: COLAS DE ESPERA Y CHATS ACTIVOS -->
            <div class="admin-support-column admin-support-column--queues">
                <div class="admin-support-column-header">
                    <div class="component-badge-group">
                        <button class="component-badge component-badge--interactive component-badge--grouped-item active" data-action="switchQueueTab" data-tab="l1">
                            <span><?php echo __('lbl_dept_l1'); ?></span>
                            <span data-ref="badge-queue-l1">0</span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item" data-action="switchQueueTab" data-tab="l2">
                            <span><?php echo __('lbl_dept_l2'); ?></span>
                            <span data-ref="badge-queue-l2">0</span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item" data-action="switchQueueTab" data-tab="l3">
                            <span><?php echo __('lbl_dept_l3'); ?></span>
                            <span data-ref="badge-queue-l3">0</span>
                        </button>
                        <button class="component-badge component-badge--interactive component-badge--grouped-item" data-action="switchQueueTab" data-tab="active">
                            <span><?php echo __('lbl_my_active_chats'); ?></span>
                            <span data-ref="badge-queue-active">0</span>
                        </button>
                    </div>
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
                        <div data-ref="current-chat-client-avatar-container">
                            <div class="component-button--profile component-avatar--static-sm">
                                <img src="/public/assets/img/fallbacks/avatar-default.png" alt="Guest" data-ref="current-chat-client-avatar">
                            </div>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title" data-ref="current-chat-client-name"><?php echo __('admin_select_chat_to_attend'); ?></h2>
                            <p class="component-card__description" data-ref="current-chat-client-subject"><?php echo __('admin_no_active_chat_selected'); ?></p>
                        </div>
                    </div>
                    
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit disabled" data-ref="admin-chat-top-actions">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="adminChatMoreDropdown" data-tooltip="<?php echo __('btn_options') ?? 'Opciones'; ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminChatMoreDropdown">
                            <div class="component-menu component-menu--w200 component-menu--h-auto">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link" data-action="toggleModule" data-target="moduleSupportClientInfo">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">info</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('admin_user_profile_title'); ?></span>
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
                                            <span><?php echo __('btn_reassign_chat') ?? 'Reasignar'; ?></span>
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
                    <div class="component-search component-search--full component-search--radius-50">
                        <div class="component-search-input">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                                <button class="component-chat-attach-btn" data-action="toggleModule" data-target="adminCannedResponsesDropdown" data-tooltip="<?php echo __('lbl_quick_canned'); ?>" data-position="top" type="button">
                                    <span class="material-symbols-rounded">quickreply</span>
                                </button>
                                <div class="component-module component-module--dropdown component-module--dropdown-top component-module--dropdown-right component-module--dropdown-fixed disabled" data-module="adminCannedResponsesDropdown">
                                    <div class="component-menu component-menu--w320 component-menu--h-auto">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable" data-ref="admin-canned-list-menu">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button class="component-button component-button--icon component-button--h32" data-action="toggleInternalNoteMode" data-ref="btn-toggle-internal-note" data-tooltip="<?php echo __('tooltip_toggle_internal_note'); ?>" data-position="top" type="button">
                                <span class="material-symbols-rounded msr-sticky_note_2">sticky_note_2</span>
                            </button>

                            <input type="text" data-ref="admin-support-chat-input" placeholder="<?php echo __('placeholder_agent_chat_input'); ?>" maxlength="2000" autocomplete="off">

                            <button class="component-chat-send-btn active" data-action="sendAdminChatMessage" data-ref="admin-chat-btn-send" data-tooltip="<?php echo __('btn_send'); ?>" data-position="top" type="button">
                                <span class="material-symbols-rounded">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>

    <!-- MODULO LATERAL IZQUIERDO: INFORMACIÓN DEL USUARIO Y SESIÓN -->
    <div class="component-module component-module--sidebar disabled" data-module="moduleSupportClientInfo">
        <div class="component-menu component-menu--w320 component-menu--h-full active" data-menu="support-client-info-menu">
            <div class="pill-container"><div class="drag-handle"></div></div>
            
            <div class="component-menu-header">
                <div class="component-menu-header-box">
                    <div class="chat-header-title-box">
                        <span class="material-symbols-rounded">person</span>
                        <span class="component-menu-header-title"><?php echo __('admin_user_profile_title'); ?></span>
                    </div>
                    <div class="component-menu-header-actions">
                        <button class="component-button component-button--icon component-button--h32" data-action="toggleModule" data-target="moduleSupportClientInfo" data-tooltip="<?php echo __('btn_close'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="component-menu-section-parent component-p-3" data-ref="admin-support-client-info">
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">account_circle</span>
                    <h3 class="component-card__title"><?php echo __('admin_no_user_selected'); ?></h3>
                </div>
            </div>
        </div>
    </div>
</div>
