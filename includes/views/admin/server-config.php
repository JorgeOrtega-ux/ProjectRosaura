<?php
// includes/views/admin/server-config.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-sticky-toolbar">
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active">
                    <div class="component-toolbar-left">
                        <span class="component-toolbar-title"><?php echo __('admin_server_settings_title'); ?></span>
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40 component-button--dark disabled-interaction" data-action="submitServerConfig" id="btn-save-config" data-tooltip="<?php echo __('tooltip_save_config'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">save</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('admin_server_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_server_desc'); ?></p>
        </div>

        <div id="admin-config-loader">
            <div class="component-spinner component-spinner--centered"></div>
        </div>

        <div id="admin-config-form" class="disabled">
            
            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">construction</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_maintenance_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_maintenance_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" id="toggle_maintenance_mode" data-action="toggleMaintenance">
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped component-accordion active">
                <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">manage_accounts</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_config_account_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_config_account_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content">
                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_min_pass_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_min_pass_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="min_password_length" data-step="-5" data-min="4"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="min_password_length" data-step="-1" data-min="4"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_min_password_length" data-val="8">8</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="min_password_length" data-step="1" data-max="64"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="min_password_length" data-step="5" data-max="64"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_max_pass_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_max_pass_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_password_length" data-step="-10" data-min="8"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_password_length" data-step="-1" data-min="8"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_max_password_length" data-val="64">64</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_password_length" data-step="1" data-max="255"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_password_length" data-step="10" data-max="255"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_min_user_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_min_user_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="min_username_length" data-step="-5" data-min="2"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="min_username_length" data-step="-1" data-min="2"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_min_username_length" data-val="3">3</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="min_username_length" data-step="1" data-max="32"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="min_username_length" data-step="5" data-max="32"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_max_user_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_max_user_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_username_length" data-step="-5" data-min="3"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_username_length" data-step="-1" data-min="3"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_max_username_length" data-val="32">32</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_username_length" data-step="1" data-max="64"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_username_length" data-step="5" data-max="64"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_max_avatar_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_max_avatar_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_avatar_size_mb" data-step="-2" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_avatar_size_mb" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_max_avatar_size_mb" data-val="2">2</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_avatar_size_mb" data-step="1" data-max="10"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_avatar_size_mb" data-step="2" data-max="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped component-accordion">
                <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">hourglass_top</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_config_profile_limits_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_config_profile_limits_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content">
                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_user_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_user_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="username_change_max_attempts" data-step="-3" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="username_change_max_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_username_change_max_attempts" data-val="1">1</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="username_change_max_attempts" data-step="1" data-max="10"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="username_change_max_attempts" data-step="3" data-max="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_user_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_user_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="username_change_cooldown_days" data-step="-7" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="username_change_cooldown_days" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_username_change_cooldown_days" data-val="7">7</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="username_change_cooldown_days" data-step="1" data-max="90"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="username_change_cooldown_days" data-step="7" data-max="90"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_email_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_email_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="email_change_max_attempts" data-step="-3" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="email_change_max_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_email_change_max_attempts" data-val="1">1</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="email_change_max_attempts" data-step="1" data-max="10"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="email_change_max_attempts" data-step="3" data-max="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_email_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_email_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="email_change_cooldown_days" data-step="-7" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="email_change_cooldown_days" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_email_change_cooldown_days" data-val="7">7</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="email_change_cooldown_days" data-step="1" data-max="90"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="email_change_cooldown_days" data-step="7" data-max="90"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_avatar_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_avatar_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="avatar_change_max_attempts" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="avatar_change_max_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_avatar_change_max_attempts" data-val="3">3</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="avatar_change_max_attempts" data-step="1" data-max="50"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="avatar_change_max_attempts" data-step="5" data-max="50"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_avatar_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_avatar_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="avatar_change_cooldown_days" data-step="-7" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="avatar_change_cooldown_days" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_avatar_change_cooldown_days" data-val="1">1</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="avatar_change_cooldown_days" data-step="1" data-max="90"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="avatar_change_cooldown_days" data-step="7" data-max="90"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped component-accordion">
                <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">security</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_config_abuse_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_config_abuse_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content">
                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_login_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_login_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="login_rate_limit_attempts" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="login_rate_limit_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_login_rate_limit_attempts" data-val="5">5</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="login_rate_limit_attempts" data-step="1" data-max="20"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="login_rate_limit_attempts" data-step="5" data-max="20"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_login_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_login_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="login_rate_limit_minutes" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="login_rate_limit_minutes" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_login_rate_limit_minutes" data-val="15">15</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="login_rate_limit_minutes" data-step="1" data-max="120"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="login_rate_limit_minutes" data-step="10" data-max="120"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_recover_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_recover_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="forgot_password_rate_limit_attempts" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="forgot_password_rate_limit_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_forgot_password_rate_limit_attempts" data-val="3">3</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="forgot_password_rate_limit_attempts" data-step="1" data-max="20"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="forgot_password_rate_limit_attempts" data-step="5" data-max="20"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_recover_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_recover_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="forgot_password_rate_limit_minutes" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="forgot_password_rate_limit_minutes" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_forgot_password_rate_limit_minutes" data-val="30">30</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="forgot_password_rate_limit_minutes" data-step="1" data-max="120"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="forgot_password_rate_limit_minutes" data-step="10" data-max="120"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped component-accordion">
                <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">admin_panel_settings</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_config_admin_security_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_config_admin_security_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content">
                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_admin_avatar_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_admin_avatar_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_avatar_attempts" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_avatar_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_admin_edit_avatar_attempts" data-val="20">20</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_avatar_attempts" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_avatar_attempts" data-step="10" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_admin_avatar_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_admin_avatar_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_avatar_minutes" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_avatar_minutes" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_admin_edit_avatar_minutes" data-val="30">30</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_avatar_minutes" data-step="1" data-max="240"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_avatar_minutes" data-step="10" data-max="240"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_admin_email_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_admin_email_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_email_attempts" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_email_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_admin_edit_email_attempts" data-val="20">20</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_email_attempts" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_email_attempts" data-step="10" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_admin_email_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_admin_email_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_email_minutes" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_email_minutes" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_admin_edit_email_minutes" data-val="30">30</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_email_minutes" data-step="1" data-max="240"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_email_minutes" data-step="10" data-max="240"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_admin_role_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_admin_role_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_role_attempts" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_role_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_admin_edit_role_attempts" data-val="10">10</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_role_attempts" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_role_attempts" data-step="10" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_admin_role_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_admin_role_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_role_minutes" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_role_minutes" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_admin_edit_role_minutes" data-val="30">30</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_role_minutes" data-step="1" data-max="240"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_role_minutes" data-step="10" data-max="240"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_admin_status_attempts_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_admin_status_attempts_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_status_attempts" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_status_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_admin_edit_status_attempts" data-val="20">20</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_status_attempts" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_status_attempts" data-step="10" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_config_admin_status_cooldown_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_config_admin_status_cooldown_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_status_minutes" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_status_minutes" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" id="val_admin_edit_status_minutes" data-val="30">30</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_status_minutes" data-step="1" data-max="240"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_status_minutes" data-step="10" data-max="240"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped disabled" id="admin-config-password-area">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">lock</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_verify_identity_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_verify_identity_desc_config'); ?></p>
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="password" class="component-input-field component-input-field--with-icon" id="admin_config_password" placeholder=" ">
                                    <label class="component-input-label"><?php echo __('lbl_current_password'); ?></label>
                                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>