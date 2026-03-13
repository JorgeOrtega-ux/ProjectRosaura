<?php
// includes/views/settings/accessibility.php
$userPrefs = $_SESSION['user_prefs'] ?? [];
$prefTheme = $userPrefs['theme'] ?? 'system';
$prefExtendedAlerts = isset($userPrefs['extended_alerts']) ? (int)$userPrefs['extended_alerts'] : 0;

$themeTexts = [
    'system' => __('theme_system'),
    'light'  => __('theme_light'),
    'dark'   => __('theme_dark')
];
$currentThemeText = $themeTexts[$prefTheme] ?? __('theme_system');
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('acc_title'); ?></h1>
            <p class="component-page-description"><?php echo __('acc_desc'); ?></p>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('pref_theme_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('pref_theme_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleModuleTheme">
                            <span class="material-symbols-rounded">brightness_auto</span>
                            <span class="component-dropdown-text"><?php echo htmlspecialchars($currentThemeText); ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <?php include __DIR__ . '/../../modules/moduleTheme.php'; ?>
                    </div>

                </div>
            </div>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('pref_alerts_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('pref_alerts_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" data-action="togglePreference" data-key="extended_alerts" <?php echo $prefExtendedAlerts === 1 ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">history</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('sec_history_title') ?? 'Historial de actividad'; ?></h2>
                        <p class="component-card__description"><?php echo __('sec_history_desc') ?? 'Administra tu historial de búsqueda y reproducción de videos.'; ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36" data-nav="/settings/history"><?php echo __('btn_manage_history') ?? 'Administrar historial'; ?></button>
                </div>
            </div>
        </div>

    </div>
</div>