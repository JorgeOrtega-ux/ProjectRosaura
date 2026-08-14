<div class="view-content" data-ref="admin-support-tickets-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('title_tickets'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="followUpSelectedTicket" data-tooltip="<?php echo __('btn_follow_up_ticket'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">forward</span>
                    </button>
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="deselectTicket" data-tooltip="<?php echo __('btn_close'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleSearch" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleTicketFilters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom" type="button">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleTicketFilters">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('lbl_status'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link active" data-action="filterTicketStatus" data-status="">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_all_statuses'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="filterTicketStatus" data-status="open">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_status_open'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="filterTicketStatus" data-status="in_progress">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_status_in_progress'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="filterTicketStatus" data-status="resolved">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_status_resolved'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="filterTicketStatus" data-status="closed">
                                        <div class="component-menu-link-text"><span><?php echo __('lbl_status_closed'); ?></span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/support/live-console" data-tooltip="<?php echo __('title_support_live'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">support_agent</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/support/canned-responses" data-tooltip="<?php echo __('title_canned_responses'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">quickreply</span>
                    </button>
                    
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/dashboard" data-tooltip="<?php echo __('btn_back_to_dashboard'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">dashboard</span>
                    </button>
                </div>

            </div>

            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="tickets-search-input" placeholder="<?php echo __('placeholder_search_tickets'); ?>" autocomplete="off">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="admin-tickets-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th data-width="220"><?php echo __('table_header_user'); ?></th>
                            <th><?php echo __('lbl_support_subject'); ?></th>
                            <th data-width="140"><?php echo __('lbl_chat_category'); ?></th>
                            <th data-width="130"><?php echo __('lbl_chat_priority'); ?></th>
                            <th data-width="130"><?php echo __('lbl_status'); ?></th>
                            <th data-width="160"><?php echo __('lbl_date'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="admin-tickets-table-body">
                        <tr>
                            <td colspan="6">
                                <div class="component-empty-state">
                                    <div class="component-spinner component-spinner--centered"></div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>
