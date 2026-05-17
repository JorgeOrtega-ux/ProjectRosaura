<?php
// includes/views/settings/guest.php
$prefLang = $_COOKIE['pr_language'] ?? 'es-419';

// Obtenemos la lista centralizada de idiomas
$languages = \App\Core\System\Translator::getAvailableLanguages();
$currentLangText = $languages[$prefLang] ?? __('default_language_text');
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('guest_title'); ?></h1>
                <p class="component-page-description"><?php echo __('guest_desc'); ?></p>
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
                            <?php include __DIR__ . '/../../modules/moduleLanguage.php'; ?>
                        </div>

                    </div>
                </div>
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
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleTheme">
                                <span class="material-symbols-rounded">brightness_auto</span>
                                <span class="component-dropdown-text"><?php echo __('theme_system'); ?></span>
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
                            <h2 class="component-card__title"><?php echo __('pref_links_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('pref_links_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" data-action="togglePreference" data-key="open_links_new_tab" checked>
                            <span class="component-toggle-slider"></span>
                        </label>
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
                            <input type="checkbox" data-action="togglePreference" data-key="extended_alerts">
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>