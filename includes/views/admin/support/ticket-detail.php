<div class="view-content" data-ref="admin-ticket-detail-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_ticket_detail_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/support/tickets" data-tooltip="<?php echo __('btn_back_to_tickets'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-card--grouped component-mb-4" data-ref="ticket-metadata-card">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">mark_email_unread</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title" data-ref="ticket-detail-subject"><?php echo __('lbl_loading'); ?></h2>
                                <p class="component-card__description" data-ref="ticket-detail-meta">--</p>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h3 class="component-card__title"><?php echo __('lbl_support_message'); ?></h3>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-item-card" data-ref="ticket-detail-original-message">
                                <p class="component-card__description">--</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped" data-ref="ticket-reply-card">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_reply_ticket_heading'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_reply_ticket_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <textarea class="component-input-field" data-ref="ticket-reply-text" placeholder="<?php echo __('placeholder_reply_ticket_message'); ?>" rows="5" maxlength="5000"></textarea>
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
