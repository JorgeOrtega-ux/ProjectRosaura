<?php
// includes/views/admin/users/edit-user.php
if (session_status() === PHP_SESSION_NONE) session_start();
global $serverConfig;

use App\Config\DatabaseManager;
use App\Core\Repositories\UserRepository;
use App\Core\Repositories\RoleRepository;
use App\Core\System\UserPrefsManager;
use App\Core\System\Translator;
use App\Core\System\DatabaseConstants as DB;

$maxAvatarSize = $serverConfig['max_avatar_size_mb'] ?? 2;

$isSuperAdmin = isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4;

$targetUserId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($targetUserId <= 0) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$db = new DatabaseManager();
$userRepo = new UserRepository($db);
$roleRepo = new RoleRepository($db);
$prefsManager = new UserPrefsManager($db);

$user = $userRepo->findById($targetUserId);
if (!$user) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$prefs = $prefsManager->ensureDefaultPreferences($targetUserId);

// Lógica de color del rol dominante para el Borde del Avatar
$roleColorRaw = $user['role_color'] ?? '';
$activeRoleBg = 'var(--text-muted)';

if (!empty($roleColorRaw)) {
    $colorData = json_decode($roleColorRaw, true);
    if (json_last_error() === JSON_ERROR_NONE && isset($colorData['colors'])) {
        $firstHex = is_string($colorData['colors'][0]) ? $colorData['colors'][0] : ($colorData['colors'][0]['hex'] ?? 'var(--text-muted)');
        $activeRoleBg = $firstHex;

        if (isset($colorData['type']) && $colorData['type'] === 'gradient' && count($colorData['colors']) > 1) {
            $angle = (int)($colorData['angle'] ?? 0);
            $stops = [];
            $prevStop = 0;
            $colorsCount = count($colorData['colors']);
            foreach ($colorData['colors'] as $i => $c) {
                $hex = is_string($c) ? $c : ($c['hex'] ?? '#000');
                $percentage = isset($c['percentage']) ? (int)$c['percentage'] : floor(100 / $colorsCount);
                $endStop = $prevStop + $percentage;
                if ($i === $colorsCount - 1) $endStop = 100;
                $stops[] = "{$hex} {$prevStop}% {$endStop}%";
                $prevStop = $endStop;
            }
            $activeRoleBg = "conic-gradient(from {$angle}deg, " . implode(', ', $stops) . ")";
        }
    } else {
        $activeRoleBg = htmlspecialchars($roleColorRaw);
    }
}

$formattedAvatar = (!empty($user['profile_picture']) && strpos($user['profile_picture'], 'http') !== 0) 
    ? (defined('APP_URL') ? APP_URL : '') . '/' . ltrim($user['profile_picture'], '/') 
    : $user['profile_picture'];
$isDefaultAvatar = strpos($formattedAvatar, '/default/') !== false;

// Obtenemos los idiomas de forma centralizada desde el Translator
$langMap = Translator::getAvailableLanguages();

$themeMap = [
    DB::THEME_SYSTEM => __('theme_system'), 
    DB::THEME_LIGHT => __('theme_light'), 
    DB::THEME_DARK => __('theme_dark')
];
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
                            <div class="component-avatar role-dynamic" style="--active-role-bg: <?php echo $activeRoleBg; ?>;" data-ref="admin-profile-avatar-container">
                                <img src="<?php echo htmlspecialchars($formattedAvatar); ?>" alt="<?php echo __('alt_avatar'); ?>" data-ref="admin-profile-avatar-img" data-original-src="<?php echo htmlspecialchars($formattedAvatar); ?>" data-is-default="<?php echo $isDefaultAvatar ? 'true' : 'false'; ?>">
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
                            <button type="button" class="component-button component-button--h34 component-button--dark" data-ref="admin-btn-change-avatar"><?php echo $isDefaultAvatar ? __('btn_upload_photo') : __('btn_change_photo'); ?></button>
                            <button type="button" class="component-button component-button--h34 <?php echo $isDefaultAvatar ? 'disabled' : ''; ?>" data-ref="admin-btn-delete-avatar"><?php echo __('btn_delete'); ?></button>
                            <button type="button" class="component-button component-button--h34 disabled" data-ref="admin-btn-cancel-avatar"><?php echo __('btn_cancel'); ?></button>
                            <button type="button" class="component-button component-button--h34 component-button--dark disabled" data-ref="admin-btn-save-avatar"><?php echo __('btn_save'); ?></button>
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
                                            <button type="button" class="component-button component-button--h34 component-button--dark" data-action="adminSaveUsername"><?php echo __('btn_save'); ?></button>
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
                                            <button type="button" class="component-button component-button--h34 component-button--dark" data-action="adminSaveEmail"><?php echo __('btn_save'); ?></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped admin-edit-group">
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
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled bs-initialized" data-module="adminModuleLanguage">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
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
                </div>

                <div class="component-card--grouped admin-edit-group">
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
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled bs-initialized" data-module="adminModuleTheme">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
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
                </div>
                
                <div class="component-card--grouped admin-edit-group">
                    <div class="component-group-item component-group-item--wrap">
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
                </div>

                <div class="component-card--grouped admin-edit-group">
                    <div class="component-group-item component-group-item--wrap">
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