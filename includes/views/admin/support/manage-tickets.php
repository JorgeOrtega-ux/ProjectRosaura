<div class="view-content" data-ref="admin-support-tickets-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_manage_tickets_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/support/live-console" data-tooltip="<?php echo __('admin_support_live_title'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">support_agent</span>
                </button>
                <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/dashboard" data-tooltip="<?php echo __('btn_back_to_dashboard'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">dashboard</span>
                </button>
            </div>
        </div>

        <div class="component-bottom component-bottom--padded">
            
            <div class="component-filter-bar component-mb-3">
                <div class="component-input-group component-input-group--h34">
                    <input class="component-input-field component-input-field--simple" data-ref="tickets-search-input" type="text" placeholder="<?php echo __('placeholder_search_tickets'); ?>" autocomplete="off">
                </div>

                <div class="component-pill-bar">
                    <button class="component-pill-button active" data-action="filterTicketStatus" data-status=""><?php echo __('lbl_all_statuses'); ?></button>
                    <button class="component-pill-button" data-action="filterTicketStatus" data-status="open"><?php echo __('lbl_status_open'); ?></button>
                    <button class="component-pill-button" data-action="filterTicketStatus" data-status="in_progress"><?php echo __('lbl_status_in_progress'); ?></button>
                    <button class="component-pill-button" data-action="filterTicketStatus" data-status="resolved"><?php echo __('lbl_status_resolved'); ?></button>
                    <button class="component-pill-button" data-action="filterTicketStatus" data-status="closed"><?php echo __('lbl_status_closed'); ?></button>
                </div>
            </div>

            <div class="component-card--grouped" data-ref="admin-tickets-container">
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">mark_email_read</span>
                    <h3 class="component-card__title"><?php echo __('lbl_loading'); ?></h3>
                </div>
            </div>

        </div>

    </div>
</div>
