<div class="view-content" data-ref="admin-support-metrics-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_support_metrics_title'); ?></h1>
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
            <div class="component-stat-grid">
                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">forum</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_metric_total_chats'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-total-chats">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">star</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_metric_avg_csat'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-avg-csat">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">timer</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_metric_frt'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-avg-frt">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">hourglass_empty</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_metric_avg_duration'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-avg-duration">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">forward</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_metric_transfers_l1_l2'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-transfers-l1-l2">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">priority_high</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_metric_transfers_l2_l3'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-transfers-l2-l3">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">mail</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_metric_total_tickets'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-total-tickets">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">mark_email_unread</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_metric_open_tickets'); ?></span>
                        <span class="component-stat-card__value" data-ref="metric-open-tickets">--</span>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
