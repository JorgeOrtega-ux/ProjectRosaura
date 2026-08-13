<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleSupportChat">
    <div class="component-menu component-menu--w335 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-support-chat">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <div class="chat-header-title-box">
                    <span class="material-symbols-rounded">support_agent</span>
                    <span class="component-menu-header-title"><?php echo __('support_livechat_title'); ?></span>
                </div>
                <div class="component-menu-header-actions">
                    <button class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="moduleSupportChat" data-menu-target="menu-support-chat" data-tooltip="<?php echo __('btn_close'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="component-menu-section-parent">
            
            <div class="component-menu-list component-p-3" data-ref="support-state-preform">
                <div class="component-card component-mb-3">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">forum</span>
                        </div>
                        <div class="component-card__text">
                            <h3 class="component-card__title"><?php echo __('support_chat_ready_heading'); ?></h3>
                            <p class="component-card__description" data-ref="support-agents-status-text"><?php echo __('support_chat_agents_checking'); ?></p>
                        </div>
                    </div>
                </div>

                <div class="component-group-item component-group-item--stacked component-mb-3">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <span class="component-stat-card__title"><?php echo __('support_category_label'); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="supportLiveModuleCategory">
                                <span class="material-symbols-rounded" data-ref="support-live-cat-icon">bug_report</span>
                                <span class="component-dropdown-text" data-ref="support-live-cat-text" data-value="technical"><?php echo __('support_cat_technical'); ?></span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="supportLiveModuleCategory">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectLiveSupportCategory" data-val="technical" data-icon="bug_report">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">bug_report</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('support_cat_technical'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectLiveSupportCategory" data-val="account" data-icon="lock">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('support_cat_account'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectLiveSupportCategory" data-val="billing" data-icon="payments">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">payments</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('support_cat_billing'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectLiveSupportCategory" data-val="policy" data-icon="gavel">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('support_cat_policy'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectLiveSupportCategory" data-val="other" data-icon="help">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">help</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('support_cat_other'); ?></span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-group-item component-group-item--stacked component-mb-3">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <span class="component-stat-card__title"><?php echo __('lbl_support_subject'); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <div class="component-input-group component-input-group--h34">
                            <input class="component-input-field component-input-field--simple" data-ref="support-live-subject" type="text" placeholder="<?php echo __('placeholder_support_subject'); ?>" maxlength="200" autocomplete="off">
                        </div>
                    </div>
                </div>

                <div class="component-group-item component-group-item--stacked component-mb-3">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <span class="component-stat-card__title"><?php echo __('lbl_support_message'); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <textarea class="component-input-field" data-ref="support-live-message" placeholder="<?php echo __('placeholder_support_message'); ?>" rows="4" maxlength="3000"></textarea>
                    </div>
                </div>

                <div class="component-empty-state-actions">
                    <button class="component-button component-button--dark component-button--h40" data-action="startLiveSupportChat" type="button">
                        <span class="material-symbols-rounded">send</span>
                        <span><?php echo __('support_btn_start_chat'); ?></span>
                    </button>
                </div>
            </div>

            <div class="component-menu-center disabled" data-ref="support-state-queue">
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">hourglass_top</span>
                    <h3 class="component-card__title"><?php echo __('support_queue_heading'); ?></h3>
                    <p class="component-empty-state-text"><?php echo __('support_queue_desc'); ?></p>
                    
                    <div class="component-item-card component-stat-card component-mb-3">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">people</span>
                        </div>
                        <div class="component-stat-card__content">
                            <span class="component-stat-card__title"><?php echo __('support_queue_position_label'); ?></span>
                            <span class="component-stat-card__value" data-ref="support-queue-position-number">#1</span>
                        </div>
                    </div>

                    <div class="component-empty-state-actions">
                        <button class="component-button component-button--h40" data-action="focusSupportEmailForm" type="button">
                            <span class="material-symbols-rounded">mail</span>
                            <span><?php echo __('support_btn_switch_to_email'); ?></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="component-chat-room-layout disabled" data-ref="support-state-room">
                <div class="component-card component-mb-2">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered" data-ref="support-agent-avatar-box">
                            <span class="material-symbols-rounded">support_agent</span>
                        </div>
                        <div class="component-card__text">
                            <h3 class="component-card__title" data-ref="support-agent-name-display"><?php echo __('support_agent_assigned'); ?></h3>
                            <p class="component-card__description" data-ref="support-agent-level-display"><?php echo __('lbl_dept_l1'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions">
                        <button class="component-button component-button--icon component-button--h32" data-action="endSupportChatSession" data-tooltip="<?php echo __('btn_end_chat'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">call_end</span>
                        </button>
                    </div>
                </div>

                <div class="chat-messages-container" data-ref="support-chat-messages-list">
                </div>

                <div class="chat-typing-indicator disabled" data-ref="support-typing-indicator">
                    <span class="material-symbols-rounded">edit_note</span>
                    <span><?php echo __('support_agent_typing'); ?></span>
                </div>
            </div>

            <div class="component-menu-center disabled" data-ref="support-state-feedback">
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">rate_review</span>
                    <h3 class="component-card__title"><?php echo __('support_csat_heading'); ?></h3>
                    <p class="component-empty-state-text"><?php echo __('support_csat_desc'); ?></p>
                    
                    <div class="component-rating-selector component-mb-3" data-ref="support-csat-stars" data-value="5">
                        <button class="component-button component-button--icon active" data-action="setCsatRating" data-rating="1" type="button"><span class="material-symbols-rounded">star</span></button>
                        <button class="component-button component-button--icon active" data-action="setCsatRating" data-rating="2" type="button"><span class="material-symbols-rounded">star</span></button>
                        <button class="component-button component-button--icon active" data-action="setCsatRating" data-rating="3" type="button"><span class="material-symbols-rounded">star</span></button>
                        <button class="component-button component-button--icon active" data-action="setCsatRating" data-rating="4" type="button"><span class="material-symbols-rounded">star</span></button>
                        <button class="component-button component-button--icon active" data-action="setCsatRating" data-rating="5" type="button"><span class="material-symbols-rounded">star</span></button>
                    </div>

                    <div class="component-input-group component-mb-3">
                        <textarea class="component-input-field" data-ref="support-csat-comment" placeholder="<?php echo __('placeholder_support_feedback'); ?>" rows="3" maxlength="1000"></textarea>
                    </div>

                    <div class="component-empty-state-actions">
                        <button class="component-button component-button--dark component-button--h40" data-action="submitSupportFeedback" type="button">
                            <span><?php echo __('btn_submit_feedback'); ?></span>
                        </button>
                        <button class="component-button component-button--h40" data-action="downloadSupportTranscript" type="button">
                            <span class="material-symbols-rounded">download</span>
                            <span><?php echo __('btn_download_transcript'); ?></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="component-menu-center disabled" data-ref="support-state-offline">
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

        <div class="component-menu-footer disabled" data-ref="support-chat-room-footer">
            <div class="chat-input-wrapper">
                <div class="component-input-group component-input-group--h40">
                    <input class="component-input-field component-input-field--simple" data-ref="support-chat-input-text" type="text" placeholder="<?php echo __('placeholder_chat_message'); ?>" maxlength="1500" autocomplete="off">
                </div>
                <button class="component-button component-button--icon component-button--dark component-button--h40" data-action="sendSupportChatMessage" data-tooltip="<?php echo __('btn_send'); ?>" data-position="top" type="button">
                    <span class="material-symbols-rounded">send</span>
                </button>
            </div>
        </div>
    </div>
</div>
