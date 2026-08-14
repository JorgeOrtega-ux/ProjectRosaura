<?php
$activeAccountId = $_SESSION['active_account'] ?? null;
$isLoggedIn = !empty($activeAccountId);
?>
<div class="view-content" data-ref="contact-support-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('support_page_title'); ?></h1>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-header-card component-mb-4">
                    <h1 class="component-page-title"><?php echo __('support_hub_title'); ?></h1>
                    <p class="component-page-description"><?php echo __('support_hub_desc'); ?></p>
                </div>

                <div class="component-card--grouped">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">mail</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('support_channel_email_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('support_channel_email_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <?php if ($isLoggedIn): ?>
                            <button class="component-button component-button--h36" data-action="openCreateTicketModal" type="button">
                                <span><?php echo __('btn_create_ticket'); ?></span>
                            </button>
                            <?php else: ?>
                            <button class="component-button component-button--h36" data-nav="<?php echo APP_URL; ?>/login" type="button">
                                <span><?php echo __('support_guest_login_btn'); ?></span>
                            </button>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <hr class="component-divider">

                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">support_agent</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('support_channel_chat_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('support_channel_chat_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <?php if ($isLoggedIn): ?>
                            <button class="component-button component-button--h36" data-action="openStartLiveChatModal" type="button">
                                <span><?php echo __('support_btn_start_chat'); ?></span>
                            </button>
                            <?php else: ?>
                            <button class="component-button component-button--h36" data-nav="<?php echo APP_URL; ?>/login" type="button">
                                <span><?php echo __('support_guest_login_btn'); ?></span>
                            </button>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
