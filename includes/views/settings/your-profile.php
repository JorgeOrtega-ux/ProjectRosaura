<?php
// includes/views/settings/your-profile.php
if (session_status() === PHP_SESSION_NONE) session_start();

$isLoggedIn = isset($_SESSION['user_id']);
$userName = $_SESSION['user_name'] ?? 'Usuario';
$userEmail = $_SESSION['user_email'] ?? 'usuario@ejemplo.com';
$userRole = $_SESSION['user_role'] ?? 'user';
$userPic = $_SESSION['user_pic'] ?? 'public/storage/profilePictures/default/default.png';
$formattedAvatar = '/ProjectRosaura/' . ltrim($userPic, '/');

// Verificamos si la imagen actual pertenece al directorio default
$isDefaultAvatar = strpos($userPic, '/default/') !== false;

// Preferencias
$userPrefs = $_SESSION['user_prefs'] ?? [];
$prefLang = $userPrefs['language'] ?? ($_COOKIE['pr_language'] ?? 'es-419');
$prefOpenLinks = isset($userPrefs['open_links_new_tab']) ? (int)$userPrefs['open_links_new_tab'] : 1;

$languages = [
    'en-US' => 'English (United States)',
    'en-GB' => 'English (United Kingdom)',
    'fr-FR' => 'Français (France)',
    'de-DE' => 'Deutsch (Deutschland)',
    'it-IT' => 'Italiano (Italia)',
    'es-419' => 'Español (Latinoamérica)',
    'es-MX' => 'Español (México)',
    'es-ES' => 'Español (España)',
    'pt-BR' => 'Português (Brasil)',
    'pt-PT' => 'Português (Portugal)'
];
$currentLangText = $languages[$prefLang] ?? 'Español (Latinoamérica)';
?>

<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('prof_title'); ?></h1>
            <p class="component-page-description"><?php echo __('prof_desc'); ?></p>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item">
                 <div class="component-card__content">
                    <div class="component-avatar role-<?php echo htmlspecialchars($userRole); ?>" id="profile-avatar-container">
                        <img src="<?php echo htmlspecialchars($formattedAvatar); ?>" alt="Avatar" id="profile-avatar-img" data-original-src="<?php echo htmlspecialchars($formattedAvatar); ?>">
                        <div class="component-avatar__overlay" id="profile-avatar-overlay">
                            <span class="material-symbols-rounded">photo_camera</span>
                        </div>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('prof_avatar_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('prof_avatar_desc'); ?></p>
                        
                        <input type="file" id="input-avatar-file" accept="image/png, image/jpeg, image/jpg" class="disabled">
                    </div>
                </div>
                
                <div class="component-card__actions component-card__actions--stretch" id="profile-avatar-actions">
                    <button type="button" class="component-button component-button--h34 component-button--dark" id="btn-change-avatar"><?php echo __('btn_change_avatar'); ?></button>
                    <button type="button" class="component-button component-button--h34 <?php echo $isDefaultAvatar ? 'disabled' : ''; ?>" id="btn-delete-avatar"><?php echo __('btn_delete'); ?></button>
                    
                    <button type="button" class="component-button component-button--h34 disabled" id="btn-cancel-avatar"><?php echo __('btn_cancel'); ?></button>
                    <button type="button" class="component-button component-button--h34 component-button--dark disabled" id="btn-save-avatar"><?php echo __('btn_save'); ?></button>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stateful">
                
                <div class="active component-state-box" data-state="username-view">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('lbl_username'); ?></h2>
                            <span class="component-display-value" id="display-username"><?php echo htmlspecialchars($userName); ?></span>
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
                                    <input type="text" id="input-username" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($userName); ?>" data-original-value="<?php echo htmlspecialchars($userName); ?>" placeholder="<?php echo __('ph_username'); ?>">
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
                            <span class="component-display-value" id="display-email"><?php echo htmlspecialchars($userEmail); ?></span>
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
                                    <input type="email" id="input-email" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($userEmail); ?>" data-original-value="<?php echo htmlspecialchars($userEmail); ?>" placeholder="<?php echo __('ph_email'); ?>">
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
                        <div class="component-dropdown-trigger" data-action="toggleModuleLanguage">
                            <span class="material-symbols-rounded">language</span>
                            <span class="component-dropdown-text"><?php echo htmlspecialchars($currentLangText); ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <?php include __DIR__ . '/../../modules/moduleLanguage.php'; ?>
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