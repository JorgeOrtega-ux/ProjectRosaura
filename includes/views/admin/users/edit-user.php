<?php
use App\Api\Services\Admin\AdminViewService;
use App\Core\System\Translator;
use App\Core\System\DatabaseConstants as DB;

$adminService = new AdminViewService();
$editUserData = $adminService->getEditUserData($_GET['uuid'] ?? '');

if (!empty($editUserData['redirect'])) {
    header("Location: " . $editUserData['redirect']);
    exit;
}

extract($editUserData);

$activeSubBg = $subscriptionBgCss ?? 'var(--text-muted)';

$formattedAvatar = (!empty($user['profile_picture']) && strpos($user['profile_picture'], 'http') !== 0) 
    ? (defined('APP_URL') ? APP_URL : '') . '/' . ltrim($user['profile_picture'], '/') 
    : $user['profile_picture'];
$isDefaultAvatar = \App\Core\Helpers\Utils::isDefaultAvatar($formattedAvatar);

$langMap = Translator::getAvailableLanguages();

$themeMap = [
    DB::THEME_SYSTEM => __('theme_system'), 
    DB::THEME_LIGHT => __('theme_light'), 
    DB::THEME_DARK => __('theme_dark')
];

$rawRoleName = $user['role_name'] ?? '';
$translatedRoleName = '';
if (trim($rawRoleName) !== '') {
    $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawRoleName)));
    $translatedRoleName = __($roleKey);
    if ($translatedRoleName === $roleKey) {
        $translatedRoleName = htmlspecialchars($rawRoleName);
    }
} else {
    $translatedRoleName = __('role_user', []);
}
if ($translatedRoleName === '') {
    $translatedRoleName = __('admin_role_undefined');
}

$userTier = (int)($user['subscription_tier'] ?? 0);
$subscriptionPlanLabel = \App\Core\System\SubscriptionPlanConstants::getTierLimits($userTier)['name'] ?? __('tier_free');
?>
<div class="view-content" data-user-id="<?php echo $targetUserId; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_manage_account_title'); ?></h1>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped admin-edit-group">
                    <div class="component-group-item">
                         <div class="component-card__content">
                            <div class="component-avatar subscription-dynamic" 
                                 data-ref="admin-profile-avatar-container" 
                                 data-sub-bg="<?php echo htmlspecialchars($activeSubBg); ?>"
                                 style="--active-subscription-bg: <?php echo htmlspecialchars($activeSubBg); ?>;">
                                <img src="<?php echo htmlspecialchars($formattedAvatar); ?>" alt="<?php echo __('alt_avatar'); ?>" 
                                     class="image-lazy-fade"
                                     onload="this.classList.add('image-loaded')"
                                     onerror="this.onerror=null; this.src='<?php echo (defined('APP_URL') ? APP_URL : ''); ?>/public/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');"
                                     data-ref="admin-profile-avatar-img" 
                                     data-original-src="<?php echo htmlspecialchars($formattedAvatar); ?>" 
                                     data-is-default="<?php echo $isDefaultAvatar ? 'true' : 'false'; ?>">
                                <div class="component-avatar__overlay" data-ref="admin-profile-avatar-overlay">
                                    <span class="material-symbols-rounded">photo_camera</span>
                                </div>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('prof_avatar_title'); ?></h2>
                                <p class="component-card__description"><?php echo str_replace('{max_mb}', htmlspecialchars($maxAvatarSize), __('prof_avatar_desc')); ?></p>
                                <input type="file" data-ref="admin-input-avatar-file" accept="image/png, image/jpeg, image/jpg" class="disabled">
                            </div>
                        </div>
                        
                        <div class="component-card__actions component-card__actions--stretch" data-ref="admin-profile-avatar-actions">
                            <button type="button" class="component-button component-button--h34" data-ref="admin-btn-change-avatar"><?php echo $isDefaultAvatar ? __('btn_upload_photo') : __('btn_change_photo'); ?></button>
                            <button type="button" class="component-button component-button--h34 <?php echo $isDefaultAvatar ? 'disabled' : ''; ?>" data-ref="admin-btn-delete-avatar"><?php echo __('btn_delete'); ?></button>
                            <button type="button" class="component-button component-button--h34 disabled" data-ref="admin-btn-cancel-avatar"><?php echo __('btn_cancel'); ?></button>
                            <button type="button" class="component-button component-button--h34 disabled" data-ref="admin-btn-save-avatar"><?php echo __('btn_save'); ?></button>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stateful">
                        <div class="active component-state-box" data-state="admin-username-view">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_username'); ?></h2>
                                    <span class="component-display-value" data-ref="admin-display-username"><?php echo htmlspecialchars($user['username']); ?></span>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--stretch">
                                <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="admin-username"><?php echo __('btn_edit'); ?></button>
                            </div>
                        </div>

                        <div class="disabled component-state-box" data-state="admin-username-edit">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_username'); ?></h2>
                                    <div class="component-edit-row">
                                        <div class="component-input-group component-input-group--h34">
                                            <input type="text" data-ref="input-admin-username" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($user['username']); ?>" data-original-value="<?php echo htmlspecialchars($user['username']); ?>" placeholder="<?php echo __('ph_username'); ?>">
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="admin-username"><?php echo __('btn_cancel'); ?></button>
                                            <button type="button" class="component-button component-button--h34" data-action="adminSaveUsername"><?php echo __('btn_save'); ?></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stateful">
                        <div class="active component-state-box" data-state="admin-email-view">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_email'); ?></h2>
                                    <span class="component-display-value" data-ref="admin-display-email"><?php echo htmlspecialchars($user['email']); ?></span>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--stretch">
                                <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="admin-email"><?php echo __('btn_edit'); ?></button>
                            </div>
                        </div>

                        <div class="disabled component-state-box" data-state="admin-email-edit">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_email'); ?></h2>
                                    <div class="component-edit-row">
                                        <div class="component-input-group component-input-group--h34">
                                            <input type="email" data-ref="input-admin-email" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($user['email']); ?>" data-original-value="<?php echo htmlspecialchars($user['email']); ?>" placeholder="<?php echo __('ph_email'); ?>">
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="admin-email"><?php echo __('btn_cancel'); ?></button>
                                            <button type="button" class="component-button component-button--h34" data-action="adminSaveEmail"><?php echo __('btn_save'); ?></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stateful">
                        <div class="active component-state-box" data-state="admin-role-view">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_system_role'); ?></h2>
                                    <span class="component-display-value" data-ref="admin-display-role"><?php echo htmlspecialchars($translatedRoleName); ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stateful">
                        <div class="active component-state-box" data-state="admin-subscription-view">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_subscription_plan'); ?></h2>
                                    <span class="component-display-value" data-ref="admin-display-subscription"><?php echo htmlspecialchars($subscriptionPlanLabel); ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion admin-edit-group">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_security_account_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('lbl_security_account_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('lbl_sync_stripe_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('lbl_sync_stripe_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="adminSyncStripe" data-user-id="<?php echo $targetUserId; ?>" data-user-uuid="<?php echo htmlspecialchars($targetUserUuid); ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>">
                                        <span><?php echo __('btn_sync_stripe'); ?></span>
                                    </button>
                                </div>
                            </div>



                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('lbl_password_reset_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('lbl_password_reset_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="adminSendPasswordReset" data-user-id="<?php echo $targetUserId; ?>" data-user-uuid="<?php echo htmlspecialchars($targetUserUuid); ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>" data-email="<?php echo htmlspecialchars($user['email']); ?>">
                                        <span><?php echo __('btn_send_password_reset'); ?></span>
                                    </button>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('lbl_unlock_login_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('lbl_unlock_login_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="adminUnlockRateLimit" data-user-id="<?php echo $targetUserId; ?>" data-user-uuid="<?php echo htmlspecialchars($targetUserUuid); ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>" data-email="<?php echo htmlspecialchars($user['email']); ?>">
                                        <span><?php echo __('btn_unlock_rate_limit'); ?></span>
                                    </button>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('lbl_terminate_sessions_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('lbl_terminate_sessions_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="adminTerminateSessions" data-user-id="<?php echo $targetUserId; ?>" data-user-uuid="<?php echo htmlspecialchars($targetUserUuid); ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>" data-email="<?php echo htmlspecialchars($user['email']); ?>">
                                        <span><?php echo __('btn_terminate_sessions'); ?></span>
                                    </button>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('lbl_two_factor_auth_title'); ?></h2>
                                        <span class="component-display-value" data-ref="admin-display-2fa">
                                            <?php if (!empty($user['two_factor_enabled'])): ?>
                                                <span class="component-badge component-badge--sm component-badge--success"><?php echo __('lbl_2fa_enabled'); ?></span>
                                            <?php else: ?>
                                                <span class="component-badge component-badge--sm"><?php echo __('lbl_2fa_disabled'); ?></span>
                                            <?php endif; ?>
                                        </span>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <?php if (!empty($user['two_factor_enabled'])): ?>
                                    <button type="button" class="component-button component-button--h34" data-action="adminOpenDisable2FA" data-user-id="<?php echo $targetUserId; ?>" data-user-uuid="<?php echo htmlspecialchars($targetUserUuid); ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>">
                                        <span><?php echo __('btn_disable_2fa'); ?></span>
                                    </button>
                                    <?php else: ?>
                                    <button type="button" class="component-button component-button--h34 disabled" disabled>
                                        <span><?php echo __('lbl_2fa_not_active'); ?></span>
                                    </button>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion admin-edit-group">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_user_preferences_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('lbl_user_preferences_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('pref_lang_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('pref_lang_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleLanguage">
                                            <span class="material-symbols-rounded">language</span>
                                            <span class="component-dropdown-text" data-ref="admin-lang-text"><?php echo htmlspecialchars($langMap[$prefs['language']] ?? $prefs['language']); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <div class="component-module component-module--dropdown disabled" data-module="adminModuleLanguage">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-header">
                                                    <div class="component-search component-search--full component-search--h36">
                                                        <div class="component-search-icon">
                                                            <span class="material-symbols-rounded">search</span>
                                                        </div>
                                                        <div class="component-search-input">
                                                            <input type="text" placeholder="<?php echo __('search_language'); ?>">
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <?php foreach($langMap as $key => $name): ?>
                                                    <div class="component-menu-link <?php echo $prefs['language'] === $key ? 'active' : ''; ?>" data-action="adminSetPref" data-key="language" data-value="<?php echo $key; ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                                        <div class="component-menu-link-text"><span><?php echo $name; ?></span></div>
                                                    </div>
                                                    <?php endforeach; ?>
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
                                        <h2 class="component-card__title"><?php echo __('pref_theme_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('pref_theme_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleTheme">
                                            <span class="material-symbols-rounded">brightness_auto</span>
                                            <span class="component-dropdown-text" data-ref="admin-theme-text"><?php echo htmlspecialchars($themeMap[$prefs['theme']] ?? $prefs['theme']); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <div class="component-module component-module--dropdown disabled" data-module="adminModuleTheme">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list">
                                                    <div class="component-menu-link <?php echo $prefs['theme'] === DB::THEME_SYSTEM ? 'active' : ''; ?>" data-action="adminSetPref" data-key="theme" data-value="<?php echo DB::THEME_SYSTEM; ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">brightness_auto</span></div>
                                                        <div class="component-menu-link-text"><span><?php echo __('theme_system'); ?></span></div>
                                                    </div>
                                                    <div class="component-menu-link <?php echo $prefs['theme'] === DB::THEME_LIGHT ? 'active' : ''; ?>" data-action="adminSetPref" data-key="theme" data-value="<?php echo DB::THEME_LIGHT; ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">light_mode</span></div>
                                                        <div class="component-menu-link-text"><span><?php echo __('theme_light'); ?></span></div>
                                                    </div>
                                                    <div class="component-menu-link <?php echo $prefs['theme'] === DB::THEME_DARK ? 'active' : ''; ?>" data-action="adminSetPref" data-key="theme" data-value="<?php echo DB::THEME_DARK; ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">dark_mode</span></div>
                                                        <div class="component-menu-link-text"><span><?php echo __('theme_dark'); ?></span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('pref_links_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('pref_links_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="admin-toggle-links" data-action="adminTogglePreference" data-key="open_links_new_tab" <?php echo ($prefs['open_links_new_tab'] == 1) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('pref_alerts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('pref_alerts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="admin-toggle-alerts" data-action="adminTogglePreference" data-key="extended_alerts" <?php echo ($prefs['extended_alerts'] == 1) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>