<div class="view-content" data-ref="admin-support-canned-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_canned_responses_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <button class="component-button component-button--icon component-button--h40" data-action="openCreateCannedModal" data-tooltip="<?php echo __('btn_new_canned_response'); ?>" data-position="bottom" type="button">
                    <span class="material-symbols-rounded">add</span>
                </button>
                <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/support/live-console" data-tooltip="<?php echo __('admin_support_live_title'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">support_agent</span>
                </button>
            </div>
        </div>

        <div class="component-bottom component-bottom--padded">
            <div class="component-card--grouped" data-ref="admin-canned-container">
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">quickreply</span>
                    <h3 class="component-card__title"><?php echo __('lbl_loading'); ?></h3>
                </div>
            </div>
        </div>

    </div>
</div>
