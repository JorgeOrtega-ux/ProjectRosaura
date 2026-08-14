<div class="view-content" data-ref="admin-support-canned-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('lbl_canned_responses'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="editSelectedCanned" data-ref="btn-edit-canned" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="deleteSelectedCanned" data-ref="btn-delete-canned" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="deselectCanned" data-tooltip="<?php echo __('btn_cancel'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="toggleSearch" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="openCreateCannedModal" data-tooltip="<?php echo __('btn_new_canned_response'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/support/live-console" data-tooltip="<?php echo __('title_support_live'); ?>" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">support_agent</span>
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
                        <input type="text" data-ref="canned-search-input" placeholder="<?php echo __('placeholder_canned_shortcut'); ?>" autocomplete="off">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="admin-canned-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th data-width="150"><?php echo __('lbl_canned_shortcut'); ?></th>
                            <th data-width="220"><?php echo __('lbl_canned_title'); ?></th>
                            <th><?php echo __('lbl_canned_content'); ?></th>
                            <th data-width="120"><?php echo __('lbl_min_level_allowed'); ?></th>
                            <th data-width="120"><?php echo __('lbl_language'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="admin-canned-table-body">
                        <tr>
                            <td colspan="5">
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
