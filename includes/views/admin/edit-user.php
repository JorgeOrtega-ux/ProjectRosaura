<?php
// includes/views/admin/edit-user.php
if (session_status() === PHP_SESSION_NONE) session_start();
global $serverConfig;
$maxAvatarSize = $serverConfig['max_avatar_size_mb'] ?? 2;
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('admin_manage_account_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_manage_account_desc'); ?></p>
        </div>

        <div data-ref="admin-edit-loader">
            <div class="component-spinner component-spinner--centered"></div>
        </div>

        <div class="component-card--grouped admin-edit-group disabled">
            <div class="component-group-item">
                 <div class="component-card__content">
                    <div class="component-avatar" data-ref="admin-profile-avatar-container">
                        <img src="" alt="<?php echo __('alt_profile'); ?>" data-ref="admin-profile-avatar-img" data-original-src="">
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
                    <button type="button" class="component-button component-button--h34 component-button--dark" data-ref="admin-btn-change-avatar"><?php echo __('btn_upload_avatar'); ?></button>
                    <button type="button" class="component-button component-button--h34 disabled" data-ref="admin-btn-delete-avatar"><?php echo __('btn_delete'); ?></button>
                    
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
                            <span class="component-display-value" data-ref="admin-display-username"><?php echo __('loading_text'); ?></span>
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
                                    <input type="text" data-ref="input-admin-username" class="component-input-field component-input-field--simple" value="" data-original-value="" placeholder="<?php echo __('ph_username'); ?>">
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
                            <span class="component-display-value" data-ref="admin-display-email"><?php echo __('loading_text'); ?></span>
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
                                    <input type="email" data-ref="input-admin-email" class="component-input-field component-input-field--simple" value="" data-original-value="" placeholder="<?php echo __('ph_email'); ?>">
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

        <div class="component-card--grouped admin-edit-group disabled">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Modo Creador</h2>
                        <p class="component-card__description">Habilita la capacidad de subir videos y acceder a Studio publicando un canal para este usuario.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" data-ref="admin-toggle-creator" data-action="adminToggleCreatorStatus">
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="component-card--grouped admin-edit-group disabled">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('pref_lang_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('pref_lang_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="adminToggleModuleLanguage">
                            <span class="material-symbols-rounded">language</span>
                            <span class="component-dropdown-text" data-ref="admin-lang-text"><?php echo __('loading_text'); ?></span>
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
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="en-US">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>English (United States)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="en-GB">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>English (United Kingdom)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="fr-FR">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>Français (France)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="de-DE">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>Deutsch (Deutschland)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="it-IT">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>Italiano (Italia)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="es-419">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>Español (Latinoamérica)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="es-MX">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>Español (México)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="es-ES">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>Español (España)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="pt-BR">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>Português (Brasil)</span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="language" data-value="pt-PT">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                                        <div class="component-menu-link-text"><span>Português (Portugal)</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-card--grouped admin-edit-group disabled">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('pref_theme_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('pref_theme_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="adminToggleModuleTheme">
                            <span class="material-symbols-rounded">brightness_auto</span>
                            <span class="component-dropdown-text" data-ref="admin-theme-text"><?php echo __('loading_text'); ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled bs-initialized" data-module="adminModuleTheme">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="theme" data-value="system">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">brightness_auto</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('theme_system'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="theme" data-value="light">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">light_mode</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('theme_light'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link" data-action="adminSetPref" data-key="theme" data-value="dark">
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
        
        <div class="component-card--grouped admin-edit-group disabled">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('pref_links_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('pref_links_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" data-ref="admin-toggle-links" data-action="adminTogglePreference" data-key="open_links_new_tab">
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="component-card--grouped admin-edit-group disabled">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('pref_alerts_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('pref_alerts_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" data-ref="admin-toggle-alerts" data-action="adminTogglePreference" data-key="extended_alerts">
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

    </div>
</div>