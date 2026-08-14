<div class="view-content" data-ref="admin-ticket-detail-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title" data-ref="ticket-detail-title"><?php echo __('title_ticket_detail'); ?></h1>
        </div>
        <div class="component-top-right">
            <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTicketStatusChange">
                    <span class="material-symbols-rounded">rule</span>
                    <span class="component-dropdown-text" data-ref="ticket-status-text">--</span>
                    <span class="material-symbols-rounded">expand_more</span>
                </div>
                <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleTicketStatusChange">
                    <div class="component-menu component-menu--w200 component-menu--h-auto component-menu--no-padding active">
                        <div class="pill-container"><div class="drag-handle"></div></div>
                        <div class="component-menu-header">
                            <div class="component-menu-header-box">
                                <span class="component-menu-header-title"><?php echo __('lbl_change_status'); ?></span>
                            </div>
                        </div>
                        <div class="component-menu-list component-menu-list--compact">
                            <div class="component-menu-link" data-action="updateTicketStatusAction" data-status="open">
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_open'); ?></span></div>
                            </div>
                            <div class="component-menu-link" data-action="updateTicketStatusAction" data-status="in_progress">
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_in_progress'); ?></span></div>
                            </div>
                            <div class="component-menu-link" data-action="updateTicketStatusAction" data-status="resolved">
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_resolved'); ?></span></div>
                            </div>
                            <div class="component-menu-link" data-action="updateTicketStatusAction" data-status="closed">
                                <div class="component-menu-link-text"><span><?php echo __('lbl_status_closed'); ?></span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/support/tickets" data-tooltip="<?php echo __('btn_back_to_tickets'); ?>" data-position="bottom">
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
                            <div class="component-avatar" data-ref="ticket-user-avatar-wrapper">
                                <img class="avatar-image" data-ref="ticket-user-avatar" src="<?php echo APP_URL; ?>/public/assets/img/fallbacks/avatar-default.png" alt="Avatar">
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title" data-ref="ticket-user-name">--</h2>
                                <p class="component-card__description" data-ref="ticket-user-email">--</p>
                            </div>
                        </div>
                        <div class="component-card__actions" data-ref="ticket-badges-container">
                            <span class="component-badge" data-ref="ticket-category-badge">--</span>
                            <span class="component-badge component-badge--sm" data-ref="ticket-priority-badge">--</span>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item" data-ref="ticket-quick-actions-bar">
                        <div class="component-card__content">
                            <div class="component-badge-group" data-ref="ticket-user-meta-badges"></div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title"><?php echo __('lbl_ticket_details'); ?></span>
                                <h3 class="component-card__title component-mt-1" data-ref="ticket-detail-subject"><?php echo __('lbl_loading'); ?></h3>
                                <p class="component-card__description" data-ref="ticket-detail-date">--</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch component-mt-2">
                            <div class="component-p-3" data-ref="ticket-detail-original-message">
                                <p class="component-card__description">--</p>
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
                            <button class="component-button component-button--dark component-button--h40" data-action="submitTicketReply" type="button">
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
