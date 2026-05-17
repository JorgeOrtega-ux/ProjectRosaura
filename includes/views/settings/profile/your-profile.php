<?php
// includes/views/settings/your-profile.php
if (session_status() === PHP_SESSION_NONE) session_start();

global $serverConfig;
$maxAvatarSize = 2;

if (!empty($serverConfig['max_avatar_size_mb']) && is_numeric($serverConfig['max_avatar_size_mb'])) {
    $maxAvatarSize = $serverConfig['max_avatar_size_mb'];
}

$isLoggedIn = isset($_SESSION['user_id']);
$userId = $_SESSION['user_id'] ?? 0;
$userName = $_SESSION['user_name'] ?? __('default_user_name');
$userEmail = $_SESSION['user_email'] ?? __('default_user_email');

// =========================================================================
// MOTOR DE VARIABLES PARA GRADIENTES DE ROL (CORTES SÓLIDOS DEL ROL MÁS FUERTE)
// =========================================================================
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
$formattedAvatar = APP_URL . '/' . htmlspecialchars($userPic);
$isDefaultAvatar = strpos($userPic, '/default/') !== false || strpos($userPic, 'fallbacks/avatar-default.png') !== false;

// Preferencias
$userPrefs = $_SESSION['user_prefs'] ?? [];
$prefLang = $userPrefs['language'] ?? ($_COOKIE['pr_language'] ?? 'es-419');
$prefOpenLinks = isset($userPrefs['open_links_new_tab']) ? (int)$userPrefs['open_links_new_tab'] : 1;
$languages = \App\Core\System\Translator::getAvailableLanguages();
$currentLangText = $languages[$prefLang] ?? __('default_language_text');
?>

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
                        <div class="component-avatar role-dynamic" style="--active-role-bg: <?php echo $activeRoleBg; ?>;" data-ref="profile-avatar-container">
                            <img src="<?php echo htmlspecialchars($formattedAvatar); ?>" alt="<?php echo __('alt_avatar'); ?>" data-ref="profile-avatar-img" data-original-src="<?php echo htmlspecialchars($formattedAvatar); ?>">
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

        </div>
    </div>
</div>