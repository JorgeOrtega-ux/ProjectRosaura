<?php
use App\Api\Services\Settings\SettingsViewService;

$settingsService = new SettingsViewService();
$accountData = $settingsService->getYourAccountData();

extract($accountData);
?>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script>
    window.GOOGLE_CLIENT_ID = "<?php echo htmlspecialchars($googleClientId); ?>";
</script>

<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('prof_title'); ?></h1>
                <p class="component-page-description"><?php echo __('prof_desc'); ?></p>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-avatar subscription-dynamic" 
                             data-sub-bg="<?php echo $activeSubBg; ?>" 
                             style="--active-subscription-bg: <?php echo $activeSubBg; ?>;"
                             data-ref="profile-avatar-container">
                            <img src="<?php echo htmlspecialchars($formattedAvatar); ?>" 
                                 alt="<?php echo __('alt_avatar'); ?>" 
                                 data-ref="profile-avatar-img" 
                                 data-original-src="<?php echo htmlspecialchars($formattedAvatar); ?>"
                                 data-is-default="<?php echo $isDefaultAvatar ? 'true' : 'false'; ?>"
                                 class="image-lazy-fade"
                                 onload="this.classList.add('image-loaded')"
                                 onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');">
                            <div class="component-avatar__overlay" data-ref="profile-avatar-overlay">
                                <span class="material-symbols-rounded">photo_camera</span>
                            </div>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('prof_avatar_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('prof_avatar_desc', ['max_mb' => (string)$maxAvatarSize]); ?></p>

                            <input type="file" data-ref="input-avatar-file" accept="image/png, image/jpeg, image/jpg" class="disabled">
                        </div>
                    </div>

                    <div class="component-card__actions component-card__actions--stretch" data-ref="profile-avatar-actions">
                        <button type="button" class="component-button component-button--h34" data-ref="btn-change-avatar"><?php echo $isDefaultAvatar ? __('btn_upload_avatar') : __('btn_change_avatar'); ?></button>
                        <button type="button" class="component-button component-button--h34 <?php echo $isDefaultAvatar ? 'disabled' : ''; ?>" data-ref="btn-delete-avatar"><?php echo __('btn_delete'); ?></button>

                        <button type="button" class="component-button component-button--h34 disabled" data-ref="btn-cancel-avatar"><?php echo __('btn_cancel'); ?></button>
                        <button type="button" class="component-button component-button--h34 disabled" data-ref="btn-save-avatar"><?php echo __('btn_save'); ?></button>
                    </div>
                </div>
                
                <hr class="component-divider">

                <div class="component-group-item component-group-item--stateful">

                    <div class="active component-state-box" data-state="username-view">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_username'); ?></h2>
                                <?php 
                                $showRole = false;
                                $translatedRole = '';
                                if (!empty($userRoleName)) {
                                    $roleLower = strtolower(trim($userRoleName));
                                    if ($roleLower !== 'user' && $roleLower !== 'usuario') {
                                        $showRole = true;
                                        $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', $roleLower);
                                        $translatedRole = __($roleKey);
                                    }
                                }
                                ?>
                                <span class="component-display-value" data-ref="display-username">
                                    <?php echo htmlspecialchars($userName); ?>
                                    <?php if ($showRole): ?> (<?php echo htmlspecialchars($translatedRole); ?>)<?php endif; ?>
                                </span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="username"><?php echo __('btn_edit'); ?></button>
                        </div>
                    </div>

                    <div class="disabled component-state-box" data-state="username-edit">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_username'); ?></h2>
                                <div class="component-edit-row">
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="text" data-ref="input-username" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($userName); ?>" data-original-value="<?php echo htmlspecialchars($userName); ?>" placeholder="<?php echo __('ph_username'); ?>">
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="username"><?php echo __('btn_cancel'); ?></button>
                                        <button type="button" class="component-button component-button--h34" data-action="saveUsername"><?php echo __('btn_save'); ?></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <hr class="component-divider">

                <!-- Handle / Identifier Section -->
                <div class="component-group-item component-group-item--stateful">

                    <div class="active component-state-box" data-state="identifier-view">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_identifier'); ?></h2>
                                <span class="component-display-value" data-ref="display-identifier">
                                    @<?php echo htmlspecialchars($userIdentifier); ?>
                                </span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="identifier"><?php echo __('btn_edit'); ?></button>
                        </div>
                    </div>

                    <div class="disabled component-state-box" data-state="identifier-edit">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_identifier'); ?></h2>
                                <div class="component-edit-row">
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="text" class="component-input-field component-input-field--simple" data-ref="input-identifier" data-original-value="<?php echo htmlspecialchars($userIdentifier); ?>" value="<?php echo htmlspecialchars($userIdentifier); ?>" placeholder="<?php echo __('ph_identifier'); ?>">
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="identifier"><?php echo __('btn_cancel'); ?></button>
                                        <button type="button" class="component-button component-button--h34" data-action="saveIdentifier"><?php echo __('btn_save'); ?></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <hr class="component-divider">

                <!-- Bio Section -->
                <div class="component-group-item component-group-item--stateful">

                    <div class="active component-state-box" data-state="bio-view">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_bio'); ?></h2>
                                <span class="component-display-value" data-ref="display-bio">
                                    <?php echo !empty($userBio) ? htmlspecialchars($userBio) : __('no_bio_yet'); ?>
                                </span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="bio"><?php echo __('btn_edit'); ?></button>
                        </div>
                    </div>

                    <div class="disabled component-state-box" data-state="bio-edit">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_bio'); ?></h2>
                                <div class="component-edit-row">
                                    <div class="component-input-group">
                                        <textarea class="component-input-field component-input-field--textarea" data-ref="input-bio" rows="2" maxlength="250" placeholder="<?php echo __('ph_bio'); ?>"><?php echo htmlspecialchars($userBio); ?></textarea>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="bio"><?php echo __('btn_cancel'); ?></button>
                                        <button type="button" class="component-button component-button--h34" data-action="saveBio"><?php echo __('btn_save'); ?></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <hr class="component-divider">

                <div class="component-group-item component-group-item--stateful">

                    <div class="active component-state-box" data-state="email-view">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_email'); ?></h2>
                                <span class="component-display-value" data-ref="display-email"><?php echo htmlspecialchars($userEmail); ?></span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <button type="button" class="component-button component-button--h34" data-action="requestEmailUpdate"><?php echo __('btn_edit'); ?></button>
                        </div>
                    </div>

                    <div class="disabled component-state-box" data-state="email-edit">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_email'); ?></h2>
                                <div class="component-edit-row">
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="email" data-ref="input-email" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($userEmail); ?>" data-original-value="<?php echo htmlspecialchars($userEmail); ?>" placeholder="<?php echo __('ph_email'); ?>">
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="email"><?php echo __('btn_cancel'); ?></button>
                                        <button type="button" class="component-button component-button--h34" data-action="saveEmail"><?php echo __('btn_save'); ?></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <hr class="component-divider">

                <div class="component-group-item component-group-item--stateful">
                    <div class="active component-state-box" data-state="subscription-view">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_subscription_plan'); ?></h2>
                                <span class="component-display-value" data-ref="display-subscription"><?php echo htmlspecialchars($subscriptionPlanLabel); ?></span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <?php if ($subscriptionTier >= $maxSubscriptionTier): ?>
                                <button type="button" class="component-button component-button--h34" data-nav="<?php echo APP_URL; ?>/upgrade"><?php echo __('btn_manage'); ?></button>
                            <?php else: ?>
                                <button type="button" class="component-button component-button--h34" data-nav="<?php echo APP_URL; ?>/upgrade"><?php echo __('btn_update_plan'); ?></button>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Connected Google Account Section -->
            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                            </svg>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">Google</h2>
                            <p class="component-card__description" data-ref="google-account-status">
                                <?php echo $isGoogleConnected ? htmlspecialchars($userName) : __('google_not_connected', []); ?>
                            </p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end" data-ref="google-account-actions">
                        <?php if ($isGoogleConnected): ?>
                            <button type="button" class="component-button component-button--h34" data-action="unlinkGoogle" data-google-name="<?php echo htmlspecialchars($userName); ?>" data-user-email="<?php echo htmlspecialchars($userEmail); ?>">
                                <?php echo __('btn_disconnect', []); ?>
                            </button>
                        <?php else: ?>
                            <button type="button" class="component-button component-button--h34" data-action="linkGoogle">
                                <?php echo __('btn_connect', [], 'Conectar'); ?>
                            </button>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('pref_lang_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('pref_lang_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">

                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleLanguage">
                                <span class="material-symbols-rounded">language</span>
                                <span class="component-dropdown-text"><?php echo htmlspecialchars($currentLangText); ?></span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <?php include __DIR__ . '/../../../modules/moduleLanguage.php'; ?>
                        </div>

                    </div>
                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('pref_links_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('pref_links_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" data-action="togglePreference" data-key="open_links_new_tab" <?php echo $prefOpenLinks === 1 ? 'checked' : ''; ?>>
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('settings.telemetry.title'); ?></h2>
                            <p class="component-card__description"><?php echo __('settings.telemetry.desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" data-action="togglePreference" data-key="allow_telemetry" <?php echo $prefTelemetry === 1 ? 'checked' : ''; ?>>
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>
