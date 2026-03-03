<?php
// includes/views/admin/backups-automation.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content view-fade-in">
    <div class="component-wrapper component-wrapper--admin-centered">
        
        <div class="component-toolbar-mode active">
            <div class="component-toolbar-left">
                <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/backups" data-tooltip="<?php echo __('btn_back_to_backups'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
            </div>
        </div>

        <div class="component-header-card component-header-card--compact">
            <h1 class="component-page-title"><?php echo __('admin_backups_auto_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_backups_auto_desc'); ?></p>
        </div>

        <div id="admin-auto-loader">
            <div class="component-spinner"></div>
        </div>

        <div id="admin-auto-form" class="disabled">
            
            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">power_settings_new</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('auto_backup_enabled_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('auto_backup_enabled_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" id="toggle-auto-backup" data-action="toggleAutoBackup">
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped disabled" id="wrapper-auto-options">
                
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('auto_backup_freq_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('auto_backup_freq_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleAutoFreq">
                                <span class="material-symbols-rounded">update</span>
                                <span class="component-dropdown-text" data-ref="admin-autoFreq-text"><?php echo __('loading_text'); ?></span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleAutoFreq">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="0">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">bug_report</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('auto_freq_test'); ?></span></div>
                                        </div>
                                        <div class="component-menu-divider"></div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="1">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('auto_freq_1h'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="3">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('auto_freq_3h'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="6">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('auto_freq_6h'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="12">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('auto_freq_12h'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="24">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">today</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('auto_freq_24h'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="48">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">calendar_month</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('auto_freq_48h'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="168">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">date_range</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('auto_freq_168h'); ?></span></div>
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
                            <h2 class="component-card__title"><?php echo __('auto_backup_retention_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('auto_backup_retention_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-inline-control component-inline-control--fixed">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustAutoConfig" data-field="auto_backup_retention_count" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustAutoConfig" data-field="auto_backup_retention_count" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                            </div>
                            <div class="component-inline-control__center" id="val_auto_backup_retention_count" data-val="5">5</div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustAutoConfig" data-field="auto_backup_retention_count" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustAutoConfig" data-field="auto_backup_retention_count" data-step="5" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div class="component-card--grouped disabled" id="admin-auto-password-area">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">lock</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_verify_identity_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_verify_identity_desc_auto'); ?></p>
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="password" class="component-input-field component-input-field--with-icon" id="admin_auto_password" placeholder=" ">
                                    <label for="admin_auto_password" class="component-input-label"><?php echo __('lbl_current_password'); ?></label>
                                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button class="component-button component-button--h36 component-button--dark disabled-interaction" data-action="submitAutoBackupConfig" id="btn-save-auto-backup"><?php echo __('btn_save_config'); ?></button>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>