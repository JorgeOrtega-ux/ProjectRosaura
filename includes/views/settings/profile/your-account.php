<?php
use App\Core\System\SubscriptionPlanConstants;

if (session_status() === PHP_SESSION_NONE) session_start();

global $serverConfig;
$maxAvatarSize = 2;

if (!empty($serverConfig['max_avatar_size_mb']) && is_numeric($serverConfig['max_avatar_size_mb'])) {
    $maxAvatarSize = $serverConfig['max_avatar_size_mb'];
}

$isLoggedIn = isset($_SESSION['user_id']);
$userId = $_SESSION['user_id'] ?? 0;
$userName = $_SESSION['user_name'] ?? __('user');
$userEmail = $_SESSION['user_email'] ?? '';
$userRoleColorRaw = $_SESSION['user_role_color'] ?? '{"type":"solid","colors":[{"hex":"var(--text-muted)"}]}';
$activeRoleBg = 'var(--text-muted)';

if ($isLoggedIn) {
    $colorData = json_decode($userRoleColorRaw, true);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($colorData)) {
        $colorData = ['type' => 'solid', 'colors' => [['hex' => $userRoleColorRaw, 'percentage' => 100]]];
    }

    $firstColorObj = $colorData['colors'][0] ?? null;
    $activeRoleBg = is_string($firstColorObj) ? htmlspecialchars($firstColorObj) : htmlspecialchars($firstColorObj['hex'] ?? 'var(--text-muted)');

    if (($colorData['type'] ?? 'solid') === 'gradient' && count($colorData['colors']) > 1) {
        $angle = (int)($colorData['angle'] ?? 0);
        $stopsArray = [];
        $prevStop = 0;
        $colorsCount = count($colorData['colors']);
        
        foreach ($colorData['colors'] as $i => $colorObj) {
            $hex = is_string($colorObj) ? $colorObj : ($colorObj['hex'] ?? '#000000');
            $hex = htmlspecialchars($hex);
            $percentage = is_array($colorObj) && isset($colorObj['percentage']) ? (int)$colorObj['percentage'] : floor(100 / $colorsCount);

            $endStop = $prevStop + $percentage;
            if ($i === $colorsCount - 1) $endStop = 100;
            $stopsArray[] = "{$hex} {$prevStop}% {$endStop}%";
            $prevStop = $endStop;
        }
        $activeRoleBg = "conic-gradient(from {$angle}deg, " . implode(', ', $stopsArray) . ")";
    }
}

$rawUserPic = $_SESSION['user_pic'] ?? '';
$userPic = \App\Core\Helpers\Utils::getValidImage($rawUserPic, 'avatar');
$formattedAvatar = htmlspecialchars($userPic);
$isDefaultAvatar = strpos($userPic, 'profilePictures/default/') !== false || strpos($userPic, 'fallbacks/avatar-default.png') !== false;
$userPrefs = $_SESSION['user_prefs'] ?? [];
$prefLang = $userPrefs['language'] ?? ($_COOKIE['pr_language'] ?? 'es-419');
$prefOpenLinks = isset($userPrefs['open_links_new_tab']) ? (int)$userPrefs['open_links_new_tab'] : 1;
$prefTelemetry = isset($userPrefs['allow_telemetry']) ? (int)$userPrefs['allow_telemetry'] : 1;

$languages = \App\Core\System\Translator::getAvailableLanguages();
$currentLangText = $languages[$prefLang] ?? __('default_language_text');

$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$subscriptionTier = 0;
if ($activeAccountId !== null && isset($linkedAccounts[$activeAccountId])) {
    $subscriptionTier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
} else {
    $subscriptionTier = (int)($_SESSION['subscription_tier'] ?? 0);
}
$subscriptionPlanLabel = match ($subscriptionTier) {
    SubscriptionPlanConstants::TIER_ULTRA => __('tier_ultra'),
    SubscriptionPlanConstants::TIER_PRO => __('tier_pro'),
    SubscriptionPlanConstants::TIER_PLUS => __('tier_plus'),
    default => __('tier_free'),
};

$googleId = null;
if ($isLoggedIn) {
    try {
        global $container;
        if ($container) {
            $userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
            $currentUserDb = $userRepo->findById($userId);
            if ($currentUserDb) {
                $googleId = $currentUserDb['google_id'] ?? null;
            }
        }
    } catch (\Throwable $e) {}
}
$isGoogleConnected = !empty($googleId);
$googleClientId = $_ENV['GOOGLE_CLIENT_ID'] ?? '';
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
                        <div class="component-avatar role-dynamic" data-role-bg="<?php echo $activeRoleBg; ?>" data-ref="profile-avatar-container">
                            <img src="<?php echo htmlspecialchars($formattedAvatar); ?>" 
                                 alt="<?php echo __('alt_avatar'); ?>" 
                                 data-ref="profile-avatar-img" 
                                 data-original-src="<?php echo htmlspecialchars($formattedAvatar); ?>"
                                 data-is-default="<?php echo $isDefaultAvatar ? 'true' : 'false'; ?>"
                                 onerror="this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/avatar-default.png'">
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
                        <button type="button" class="component-button component-button--h34 component-button--dark" data-ref="btn-change-avatar"><?php echo $isDefaultAvatar ? __('btn_upload_avatar') : __('btn_change_avatar'); ?></button>
                        <button type="button" class="component-button component-button--h34 <?php echo $isDefaultAvatar ? 'disabled' : ''; ?>" data-ref="btn-delete-avatar"><?php echo __('btn_delete'); ?></button>

                        <button type="button" class="component-button component-button--h34 disabled" data-ref="btn-cancel-avatar"><?php echo __('btn_cancel'); ?></button>
                        <button type="button" class="component-button component-button--h34 component-button--dark disabled" data-ref="btn-save-avatar"><?php echo __('btn_save'); ?></button>
                    </div>
                </div>
                
                <hr class="component-divider">

                <div class="component-group-item component-group-item--stateful">

                    <div class="active component-state-box" data-state="username-view">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_username'); ?></h2>
                                <span class="component-display-value" data-ref="display-username"><?php echo htmlspecialchars($userName); ?></span>
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
                                        <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveUsername"><?php echo __('btn_save'); ?></button>
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
                                        <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveEmail"><?php echo __('btn_save'); ?></button>
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
                            <button type="button" class="component-button component-button--h34" data-nav="<?php echo APP_URL; ?>/upgrade"><?php echo __('btn_update_plan'); ?></button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Connected Google Account Section -->
            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
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
                                <?php echo $isGoogleConnected ? htmlspecialchars($userName) : __('google_not_connected', [], 'No vinculada'); ?>
                            </p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end" data-ref="google-account-actions">
                        <?php if ($isGoogleConnected): ?>
                            <button type="button" class="component-button component-button--h34" data-action="unlinkGoogle" data-google-name="<?php echo htmlspecialchars($userName); ?>" data-user-email="<?php echo htmlspecialchars($userEmail); ?>">
                                <?php echo __('btn_disconnect', [], 'Desconectar'); ?>
                            </button>
                        <?php else: ?>
                            <button type="button" class="component-button component-button--h34 component-button--dark" data-action="linkGoogle">
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
                <div class="component-group-item component-group-item--wrap">
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
                <div class="component-group-item component-group-item--wrap">
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
