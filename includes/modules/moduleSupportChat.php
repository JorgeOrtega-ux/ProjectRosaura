<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleSupportChat">
    <div class="component-menu component-menu--w335 component-menu--chat component-menu--h-full component-menu--no-padding active" data-ref="menu-support-chat">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <div class="chat-header-title-box">
                    <span class="material-symbols-rounded">support_agent</span>
                    <span class="component-menu-header-title"><?php echo __('support_livechat_title'); ?></span>
                </div>
            </div>
        </div>
        
        <!-- ESTADO 1: COLA DE ESPERA -->
        <div class="component-menu-section-parent disabled" data-ref="support-state-queue">
            <div class="component-menu-center component-p-3">
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">hourglass_top</span>
                    <h3 class="component-card__title"><?php echo __('support_queue_heading'); ?></h3>
                    <p class="component-empty-state-text"><?php echo __('support_queue_desc'); ?> <span data-ref="support-queue-position-number">#1</span></p>

                    <div class="component-empty-state-actions">
                        <button class="component-button component-button--h40" data-action="leaveSupportQueue" type="button">
                            <span class="material-symbols-rounded">close</span>
                            <span><?php echo __('support_btn_leave_queue'); ?></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ESTADO 3: SALA DE CHAT ACTIVA -->
        <div class="component-menu-section-parent component-menu-section-parent--chat disabled" data-ref="support-state-room">
            <!-- Barra superior del agente -->
            <div class="component-support-room-agent-bar">
                <div class="component-card__content">
                    <div data-ref="support-agent-avatar-container">
                        <div class="component-button--profile component-avatar--static-sm">
                            <img class="avatar-image" data-ref="support-agent-avatar-img" src="/public/assets/img/fallbacks/avatar-default.png" alt="Agent">
                        </div>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title" data-ref="support-agent-name-display"><?php echo __('support_agent_assigned'); ?></h2>
                        <p class="component-card__description" data-ref="support-agent-level-display"><?php echo __('lbl_dept_l1'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h32" data-action="toggleModule" data-target="supportUserChatMoreDropdown" data-tooltip="<?php echo __('btn_options'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                        <div class="component-module component-module--dropdown component-module--dropdown-bottom component-module--dropdown-right component-module--dropdown-fixed chat-dropdown-module disabled" data-module="supportUserChatMoreDropdown">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="support-user-chat-more-menu">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link" data-action="openViewIssueModal">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">help_outline</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('lbl_view_issue', [], 'Ver problema'); ?></span>
                                        </div>
                                    </div>
                                    <div class="component-menu-divider"></div>
                                    <div class="component-menu-link text-danger" data-action="endSupportChatSession">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">call_end</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span><?php echo __('btn_end_chat', [], 'Finalizar chat'); ?></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Visor de mensajes -->
            <div class="component-menu-center component-chat-messages" data-ref="support-chat-messages-list">
            </div>

            <!-- Indicador de typing -->
            <div class="component-chat-typing-indicator disabled" data-ref="support-typing-indicator">
                <span class="material-symbols-rounded">edit_note</span>
                <span><?php echo __('support_agent_typing'); ?></span>
            </div>
            
            <!-- Barra de entrada de texto -->
            <div class="component-menu-bottom component-chat-input-area" data-ref="support-chat-room-footer">
                <div class="component-search component-search--w-auto">
                    <div class="component-search-input">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-chat-attach-btn" data-action="toggleModule" data-target="support-attach-menu" data-tooltip="<?php echo __('chat_attach_photos'); ?>" data-position="top" type="button">
                                <span class="material-symbols-rounded">add</span>
                            </button>
                            <div class="component-module component-module--dropdown component-module--dropdown-top component-module--dropdown-right component-module--dropdown-fixed chat-dropdown-module disabled" data-module="support-attach-menu">
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuSupportAttachOptions">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link" data-action="triggerSupportChatAttach">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">attach_file</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('chat_attach_photos'); ?></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <input id="support-chat-file-input" class="disabled" type="file" multiple accept="image/jpeg, image/png, image/webp, image/gif">

                        <input data-ref="support-chat-input-text" type="text" placeholder="<?php echo __('placeholder_chat_message'); ?>" maxlength="1500" autocomplete="off">
                        <button class="component-chat-send-btn" data-action="sendSupportChatMessage" data-ref="support-btn-send" data-tooltip="<?php echo __('btn_send'); ?>" data-position="top" type="button">
                            <span class="material-symbols-rounded">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ESTADO 4: FUERA DE LÍNEA -->
        <div class="component-menu-section-parent disabled" data-ref="support-state-offline">
            <div class="component-menu-center component-p-3">
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">headset_off</span>
                    <h3 class="component-card__title"><?php echo __('support_livechat_unavailable_heading'); ?></h3>
                    <p class="component-empty-state-text"><?php echo __('support_livechat_unavailable_desc'); ?></p>
                    <div class="component-empty-state-actions">
                        <button class="component-button component-button--dark component-button--h40" data-action="focusSupportEmailForm" type="button">
                            <span class="material-symbols-rounded">mail</span>
                            <span><?php echo __('support_btn_switch_to_email'); ?></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>

<button class="component-button component-button--dark component-button--icon component-button--h40 component-fab-support disabled" data-action="openFloatingSupportChat" data-ref="floating-support-btn" data-tooltip="<?php echo __('support_livechat_title'); ?>" data-position="left" type="button">
    <span class="material-symbols-rounded">support_agent</span>
</button>
