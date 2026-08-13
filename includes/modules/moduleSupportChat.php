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
            <div class="component-menu-center">
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
