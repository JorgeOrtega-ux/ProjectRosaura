<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleAdminSupportChat">
    <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding active" data-ref="menu-admin-support-chat">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <div class="chat-header-title-box">
                    <span class="material-symbols-rounded">support_agent</span>
                    <span class="component-menu-header-title"><?php echo __('title_support_live'); ?></span>
                </div>
                <div class="component-menu-header-actions">
                    <button class="component-button component-button--icon component-button--h32" data-action="maximizeAdminFloatingChat" data-tooltip="<?php echo __('btn_open_full_console', [], 'Abrir consola completa'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">open_in_full</span>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- SALA DE CHAT ACTIVA PARA AGENTE -->
        <div class="component-menu-section-parent component-menu-section-parent--chat" data-ref="admin-support-floating-state-room">
            <!-- Barra superior del cliente -->
            <div class="component-support-room-agent-bar">
                <div class="component-card__content">
                    <div data-ref="admin-support-floating-client-avatar-container">
                        <div class="component-button--profile component-avatar--static-sm">
                            <img class="avatar-image" src="/public/assets/img/fallbacks/avatar-default.png" alt="Client">
                        </div>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title" data-ref="admin-support-floating-client-name"><?php echo __('lbl_user'); ?></h2>
                        <p class="component-card__description" data-ref="admin-support-floating-client-subject"><?php echo __('lbl_no_active_chat_selected'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h32" data-action="toggleModule" data-target="adminFloatingChatMoreDropdown" data-tooltip="<?php echo __('btn_options'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                        <div class="component-module component-module--dropdown chat-dropdown-module disabled" data-module="adminFloatingChatMoreDropdown">
                            <div class="component-menu component-menu--w265 component-menu--h-auto active" data-menu="admin-floating-chat-more-menu">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link" data-action="maximizeAdminFloatingChat">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">open_in_full</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('btn_open_full_console', [], 'Abrir consola completa'); ?></span>
                                        </div>
                                    </div>
                                    <div class="component-menu-link" data-action="openViewIssueModal">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">help_outline</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('lbl_view_issue', [], 'Ver problema'); ?></span>
                                        </div>
                                    </div>
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
            </div>

            <!-- Visor de mensajes -->
            <div class="component-menu-center component-chat-messages" data-ref="admin-support-floating-messages-list">
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">chat_bubble_outline</span>
                    <h3 class="component-card__title"><?php echo __('lbl_select_chat_prompt'); ?></h3>
                </div>
            </div>

            <!-- Indicador de typing -->
            <div class="component-chat-typing-indicator disabled" data-ref="admin-support-floating-typing-indicator">
                <span class="material-symbols-rounded">edit_note</span>
                <span><?php echo __('lbl_user_is_typing'); ?></span>
            </div>
            
            <!-- Barra de entrada de texto -->
            <div class="component-menu-bottom component-chat-input-area" data-ref="admin-support-floating-footer">
                <div class="chat-attachments-preview-container disabled" data-ref="admin-support-floating-attachments-preview"></div>
                <div class="component-search component-search--w-auto">
                    <div class="component-search-input">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-chat-attach-btn" data-action="toggleModule" data-target="adminFloatingCannedResponsesDropdown" data-tooltip="<?php echo __('lbl_quick_canned'); ?>" data-position="top" type="button">
                                <span class="material-symbols-rounded">quickreply</span>
                            </button>
                            <div class="component-module component-module--dropdown chat-dropdown-module disabled" data-module="adminFloatingCannedResponsesDropdown">
                                <div class="component-menu component-menu--w320 component-menu--h-auto component-menu--no-padding component-menu--limited active" data-ref="menuFloatingCannedResponses">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-header">
                                        <div class="component-search component-search--full component-search--h36">
                                            <div class="component-search-icon">
                                                <span class="material-symbols-rounded">search</span>
                                            </div>
                                            <div class="component-search-input">
                                                <input type="text" data-ref="admin-floating-canned-search" placeholder="<?php echo __('search_canned_responses', [], 'Buscar respuestas rápidas...'); ?>" autocomplete="off">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="component-menu-list component-menu-list--scrollable" data-ref="admin-floating-canned-list-menu">
                                    </div>
                                    <div class="component-menu-empty disabled" data-ref="admin-floating-canned-empty">
                                        <div class="component-menu-link disabled-interaction">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">search_off</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('no_results_found'); ?></span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button class="component-button component-button--icon component-button--h32" data-action="triggerAdminFloatingChatAttach" data-tooltip="<?php echo __('chat_attach_photos', [], 'Adjuntar imágenes'); ?>" data-position="top" type="button">
                            <span class="material-symbols-rounded">attach_file</span>
                        </button>
                        <input id="admin-support-floating-chat-file-input" class="disabled" type="file" multiple accept="image/jpeg, image/png, image/webp, image/gif">

                        <button class="component-button component-button--icon component-button--h32" data-action="toggleAdminFloatingInternalNoteMode" data-ref="btn-toggle-floating-internal-note" data-tooltip="<?php echo __('tooltip_toggle_internal_note'); ?>" data-position="top" type="button">
                            <span class="material-symbols-rounded msr-sticky_note_2">sticky_note_2</span>
                        </button>

                        <input data-ref="admin-support-floating-chat-input" type="text" placeholder="<?php echo __('placeholder_agent_chat_input'); ?>" maxlength="2000" autocomplete="off">

                        <button class="component-chat-send-btn active" data-action="sendAdminFloatingChatMessage" data-ref="admin-floating-chat-btn-send" data-tooltip="<?php echo __('btn_send'); ?>" data-position="top" type="button">
                            <span class="material-symbols-rounded">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>

<button class="component-button component-button--icon component-button--h40 component-fab-admin-support disabled" data-action="openFloatingAdminSupportChat" data-ref="floating-admin-support-btn" data-tooltip="<?php echo __('title_support_live'); ?>" data-position="left" type="button">
    <span class="material-symbols-rounded">support_agent</span>
    <span class="component-badge component-badge--danger component-fab-badge disabled" data-ref="admin-support-unread-badge">0</span>
</button>
