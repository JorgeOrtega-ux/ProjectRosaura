<?php
$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$isLoggedIn = !empty($activeAccountId);
$userName = '';
$userEmail = '';

if ($isLoggedIn) {
    $userName = $linkedAccounts[$activeAccountId]['username'] ?? ($_SESSION['username'] ?? ($_SESSION['user_name'] ?? ''));
    $userEmail = $linkedAccounts[$activeAccountId]['user_email'] ?? ($_SESSION['user_email'] ?? '');
    if (empty($userName) || empty($userEmail)) {
        global $container;
        if ($container) {
            try {
                $userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
                $userDb = $userRepo->findById((int)$activeAccountId);
                if ($userDb) {
                    $userName = $userDb['username'] ?? '';
                    $userEmail = $userDb['email'] ?? '';
                }
            } catch (\Throwable $e) {}
        }
    }
}
?>
<div class="view-content" data-ref="contact-support-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('support_page_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <?php if ($isLoggedIn): ?>
            <button class="component-button component-button--icon component-button--h40" data-action="submitSupportTicket" data-tooltip="<?php echo __('tooltip_submit_ticket'); ?>" data-position="bottom" type="button">
                <span class="material-symbols-rounded">send</span>
            </button>
            <?php endif; ?>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-header-card component-mb-4">
                    <h1 class="component-page-title"><?php echo __('support_hub_title'); ?></h1>
                    <p class="component-page-description"><?php echo __('support_hub_desc'); ?></p>
                </div>

                <div class="component-card--grouped component-mb-4">
                    <div class="component-group-item active">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">mail</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('support_channel_email_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('support_channel_email_desc'); ?></p>
                            </div>
                        </div>
                    </div>
                    
                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--clickable" data-action="toggleMenuInModule" data-module-target="moduleSupportChat" data-menu-target="menu-support-chat" role="button" tabindex="0">
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
                            <span class="material-symbols-rounded">chevron_right</span>
                        </div>
                    </div>
                </div>

                <?php if ($isLoggedIn): ?>
                <div class="component-card--grouped" data-ref="support-form-card">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">verified_user</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_connected_account'); ?></h2>
                                <p class="component-card__description"><?php echo __('support_logged_in_as', ['username' => htmlspecialchars($userName), 'email' => htmlspecialchars($userEmail)]); ?></p>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('support_category_label'); ?></h2>
                                <p class="component-card__description"><?php echo __('support_category_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="supportModuleCategory">
                                    <span class="material-symbols-rounded msr-bug_report" data-ref="support-category-icon">bug_report</span>
                                    <span class="component-dropdown-text" data-ref="support-category-text" data-value="technical"><?php echo __('support_cat_technical'); ?></span>
                                    <span class="material-symbols-rounded msr-expand_more">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="supportModuleCategory">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <div class="component-menu-link active" data-action="selectSupportCategory" data-val="technical" data-icon="bug_report">
                                                <div class="component-menu-link-icon">
                                                    <span class="material-symbols-rounded msr-bug_report">bug_report</span>
                                                </div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo __('support_cat_technical'); ?></span>
                                                </div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectSupportCategory" data-val="account" data-icon="lock">
                                                <div class="component-menu-link-icon">
                                                    <span class="material-symbols-rounded msr-lock">lock</span>
                                                </div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo __('support_cat_account'); ?></span>
                                                </div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectSupportCategory" data-val="billing" data-icon="payments">
                                                <div class="component-menu-link-icon">
                                                    <span class="material-symbols-rounded msr-payments">payments</span>
                                                </div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo __('support_cat_billing'); ?></span>
                                                </div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectSupportCategory" data-val="policy" data-icon="gavel">
                                                <div class="component-menu-link-icon">
                                                    <span class="material-symbols-rounded msr-gavel">gavel</span>
                                                </div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo __('support_cat_policy'); ?></span>
                                                </div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectSupportCategory" data-val="other" data-icon="help">
                                                <div class="component-menu-link-icon">
                                                    <span class="material-symbols-rounded msr-help">help</span>
                                                </div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo __('support_cat_other'); ?></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_support_subject'); ?></h2>
                                <p class="component-card__description"><?php echo __('support_subject_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-input-group component-input-group--h34">
                                <input class="component-input-field component-input-field--simple" data-ref="support-subject" type="text" placeholder="<?php echo __('placeholder_support_subject'); ?>" maxlength="200" autocomplete="off">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_support_message'); ?></h2>
                                <p class="component-card__description"><?php echo __('support_message_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <textarea class="component-input-field" data-ref="support-message" placeholder="<?php echo __('placeholder_support_message'); ?>" rows="5" maxlength="5000"></textarea>
                        </div>
                    </div>

                    <div class="disabled" data-ref="turnstile-container" data-action="contact_support"></div>
                </div>

                <?php else: ?>
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">lock</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('support_guest_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('support_guest_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <button class="component-button component-button--dark component-button--h40" data-nav="<?php echo APP_URL; ?>/login" type="button">
                                <span class="material-symbols-rounded">login</span>
                                <span><?php echo __('support_guest_login_btn'); ?></span>
                            </button>
                            <button class="component-button component-button--h40" data-nav="<?php echo APP_URL; ?>/register" type="button">
                                <span><?php echo __('support_guest_register_btn'); ?></span>
                            </button>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

            </div>
        </div>
    </div>
</div>
