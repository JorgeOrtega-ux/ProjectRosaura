<?php
// includes/views/admin/system/server-config.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$db = new DatabaseManager();
$pdo = $db->getConnection(DB::CONN_IDENTITY);

$tblServerConfig = DB::TBL_SERVER_CONFIG;

$stmt = $pdo->query("SELECT * FROM {$tblServerConfig} LIMIT 1");
$config = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$config) {
    $config = [];
}
?>
<div class="view-content">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_server_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="submitServerConfig" data-ref="btn-save-config" data-tooltip="<?php echo __('tooltip_save_config'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped" data-ref="admin-config-group">
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
                                <input type="checkbox" data-ref="toggle_maintenance_mode" data-action="toggleMaintenance" <?php echo !empty($config['maintenance_mode']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion" data-ref="admin-config-group">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">public</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_config_sessions_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_config_sessions_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_allow_registrations_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_allow_registrations_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="toggle_allow_registrations" data-action="toggleAllowRegistrations" <?php echo !empty($config['allow_registrations']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text" style="width: 100%;">
                                        <h2 class="component-card__title"><?php echo __('admin_config_allowed_domains_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_allowed_domains_desc'); ?></p>
                                        <div class="component-card__form-area" style="margin-top: 15px;">
                                            <div class="component-dropdown-wrapper">
                                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleAllowedDomains">
                                                    <span class="material-symbols-rounded">domain</span>
                                                    <span class="component-dropdown-text" data-ref="text_allowed_domains">Ninguno</span>
                                                    <span class="material-symbols-rounded">expand_more</span>
                                                </div>
                                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleAllowedDomains" style="width: 100%; max-width: 320px;">
                                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                                        <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact" data-ref="list_allowed_domains" style="max-height: 220px;">
                                                            <label class="component-menu-link component-menu-link--bordered">
                                                                <div class="component-menu-link-icon"><input type="checkbox" class="domain-checkbox" data-action="toggleDomain" value="gmail.com"></div>
                                                                <div class="component-menu-link-text"><span>gmail.com</span></div>
                                                            </label>
                                                            <label class="component-menu-link component-menu-link--bordered">
                                                                <div class="component-menu-link-icon"><input type="checkbox" class="domain-checkbox" data-action="toggleDomain" value="outlook.com"></div>
                                                                <div class="component-menu-link-text"><span>outlook.com</span></div>
                                                            </label>
                                                            <label class="component-menu-link component-menu-link--bordered">
                                                                <div class="component-menu-link-icon"><input type="checkbox" class="domain-checkbox" data-action="toggleDomain" value="yahoo.com"></div>
                                                                <div class="component-menu-link-text"><span>yahoo.com</span></div>
                                                            </label>
                                                            <label class="component-menu-link component-menu-link--bordered">
                                                                <div class="component-menu-link-icon"><input type="checkbox" class="domain-checkbox" data-action="toggleDomain" value="hotmail.com"></div>
                                                                <div class="component-menu-link-text"><span>hotmail.com</span></div>
                                                            </label>
                                                            </div>
                                                        <div class="component-menu-footer" style="padding: 10px; border-top: 1px solid var(--border-color);">
                                                            <div class="component-search component-search--full component-search--h36">
                                                                <div class="component-search-icon">
                                                                    <span class="material-symbols-rounded">add</span>
                                                                </div>
                                                                <div class="component-search-input">
                                                                    <input type="text" data-action="addCustomDomain" placeholder="Añadir dominio y presionar Enter">
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="hidden" data-ref="raw_allowed_email_domains" value="<?php echo htmlspecialchars($config['allowed_email_domains'] ?? ''); ?>">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_session_lifetime_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_session_lifetime_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="session_lifetime_minutes" data-step="-30" data-min="15"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="session_lifetime_minutes" data-step="-5" data-min="15"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_session_lifetime_minutes" data-val="<?php echo htmlspecialchars($config['session_lifetime_minutes'] ?? 120); ?>"><?php echo htmlspecialchars($config['session_lifetime_minutes'] ?? 120); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="session_lifetime_minutes" data-step="5" data-max="43200"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="session_lifetime_minutes" data-step="30" data-max="43200"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_max_sessions_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_max_sessions_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_active_sessions_per_user" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_active_sessions_per_user" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_max_active_sessions_per_user" data-val="<?php echo htmlspecialchars($config['max_active_sessions_per_user'] ?? 3); ?>"><?php echo htmlspecialchars($config['max_active_sessions_per_user'] ?? 3); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_active_sessions_per_user" data-step="1" data-max="20"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="max_active_sessions_per_user" data-step="5" data-max="20"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_register_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_register_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="registration_rate_limit_attempts" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="registration_rate_limit_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_registration_rate_limit_attempts" data-val="<?php echo htmlspecialchars($config['registration_rate_limit_attempts'] ?? 5); ?>"><?php echo htmlspecialchars($config['registration_rate_limit_attempts'] ?? 5); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="registration_rate_limit_attempts" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="registration_rate_limit_attempts" data-step="5" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_register_cooldown_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_register_cooldown_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="registration_rate_limit_minutes" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="registration_rate_limit_minutes" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_registration_rate_limit_minutes" data-val="<?php echo htmlspecialchars($config['registration_rate_limit_minutes'] ?? 15); ?>"><?php echo htmlspecialchars($config['registration_rate_limit_minutes'] ?? 15); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="registration_rate_limit_minutes" data-step="1" data-max="1440"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="registration_rate_limit_minutes" data-step="10" data-max="1440"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_code_expire_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_code_expire_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="verification_code_expiration_minutes" data-step="-5" data-min="5"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="verification_code_expiration_minutes" data-step="-1" data-min="5"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_verification_code_expiration_minutes" data-val="<?php echo htmlspecialchars($config['verification_code_expiration_minutes'] ?? 15); ?>"><?php echo htmlspecialchars($config['verification_code_expiration_minutes'] ?? 15); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="verification_code_expiration_minutes" data-step="1" data-max="120"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="verification_code_expiration_minutes" data-step="5" data-max="120"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_reset_expire_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_reset_expire_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="password_reset_expiration_minutes" data-step="-5" data-min="5"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="password_reset_expiration_minutes" data-step="-1" data-min="5"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_password_reset_expiration_minutes" data-val="<?php echo htmlspecialchars($config['password_reset_expiration_minutes'] ?? 15); ?>"><?php echo htmlspecialchars($config['password_reset_expiration_minutes'] ?? 15); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="password_reset_expiration_minutes" data-step="1" data-max="120"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="password_reset_expiration_minutes" data-step="5" data-max="120"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion" data-ref="admin-config-group">
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
                                        <div class="component-inline-control__center" data-ref="val_min_password_length" data-val="<?php echo htmlspecialchars($config['min_password_length'] ?? 8); ?>"><?php echo htmlspecialchars($config['min_password_length'] ?? 8); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_max_password_length" data-val="<?php echo htmlspecialchars($config['max_password_length'] ?? 64); ?>"><?php echo htmlspecialchars($config['max_password_length'] ?? 64); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_min_username_length" data-val="<?php echo htmlspecialchars($config['min_username_length'] ?? 3); ?>"><?php echo htmlspecialchars($config['min_username_length'] ?? 3); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_max_username_length" data-val="<?php echo htmlspecialchars($config['max_username_length'] ?? 32); ?>"><?php echo htmlspecialchars($config['max_username_length'] ?? 32); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_max_avatar_size_mb" data-val="<?php echo htmlspecialchars($config['max_avatar_size_mb'] ?? 2); ?>"><?php echo htmlspecialchars($config['max_avatar_size_mb'] ?? 2); ?></div>
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

                <div class="component-card--grouped component-accordion" data-ref="admin-config-group">
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
                                        <div class="component-inline-control__center" data-ref="val_username_change_max_attempts" data-val="<?php echo htmlspecialchars($config['username_change_max_attempts'] ?? 1); ?>"><?php echo htmlspecialchars($config['username_change_max_attempts'] ?? 1); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_username_change_cooldown_days" data-val="<?php echo htmlspecialchars($config['username_change_cooldown_days'] ?? 7); ?>"><?php echo htmlspecialchars($config['username_change_cooldown_days'] ?? 7); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_email_change_max_attempts" data-val="<?php echo htmlspecialchars($config['email_change_max_attempts'] ?? 1); ?>"><?php echo htmlspecialchars($config['email_change_max_attempts'] ?? 1); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_email_change_cooldown_days" data-val="<?php echo htmlspecialchars($config['email_change_cooldown_days'] ?? 7); ?>"><?php echo htmlspecialchars($config['email_change_cooldown_days'] ?? 7); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_avatar_change_max_attempts" data-val="<?php echo htmlspecialchars($config['avatar_change_max_attempts'] ?? 3); ?>"><?php echo htmlspecialchars($config['avatar_change_max_attempts'] ?? 3); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_avatar_change_cooldown_days" data-val="<?php echo htmlspecialchars($config['avatar_change_cooldown_days'] ?? 1); ?>"><?php echo htmlspecialchars($config['avatar_change_cooldown_days'] ?? 1); ?></div>
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

                <div class="component-card--grouped component-accordion" data-ref="admin-config-group">
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
                                        <div class="component-inline-control__center" data-ref="val_login_rate_limit_attempts" data-val="<?php echo htmlspecialchars($config['login_rate_limit_attempts'] ?? 5); ?>"><?php echo htmlspecialchars($config['login_rate_limit_attempts'] ?? 5); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_login_rate_limit_minutes" data-val="<?php echo htmlspecialchars($config['login_rate_limit_minutes'] ?? 15); ?>"><?php echo htmlspecialchars($config['login_rate_limit_minutes'] ?? 15); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_forgot_password_rate_limit_attempts" data-val="<?php echo htmlspecialchars($config['forgot_password_rate_limit_attempts'] ?? 3); ?>"><?php echo htmlspecialchars($config['forgot_password_rate_limit_attempts'] ?? 3); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_forgot_password_rate_limit_minutes" data-val="<?php echo htmlspecialchars($config['forgot_password_rate_limit_minutes'] ?? 30); ?>"><?php echo htmlspecialchars($config['forgot_password_rate_limit_minutes'] ?? 30); ?></div>
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

                <div class="component-card--grouped component-accordion" data-ref="admin-config-group">
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
                                        <div class="component-inline-control__center" data-ref="val_admin_edit_avatar_attempts" data-val="<?php echo htmlspecialchars($config['admin_edit_avatar_attempts'] ?? 20); ?>"><?php echo htmlspecialchars($config['admin_edit_avatar_attempts'] ?? 20); ?></div>
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
                                        <h2 class="component-card__title"><?php echo __('admin_config_admin_user_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_admin_user_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_username_attempts" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_username_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_edit_username_attempts" data-val="<?php echo htmlspecialchars($config['admin_edit_username_attempts'] ?? 20); ?>"><?php echo htmlspecialchars($config['admin_edit_username_attempts'] ?? 20); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_username_attempts" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_username_attempts" data-step="10" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
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
                                        <div class="component-inline-control__center" data-ref="val_admin_edit_email_attempts" data-val="<?php echo htmlspecialchars($config['admin_edit_email_attempts'] ?? 20); ?>"><?php echo htmlspecialchars($config['admin_edit_email_attempts'] ?? 20); ?></div>
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
                                        <h2 class="component-card__title"><?php echo __('admin_config_admin_prefs_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_admin_prefs_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_prefs_attempts" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_prefs_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_edit_prefs_attempts" data-val="<?php echo htmlspecialchars($config['admin_edit_prefs_attempts'] ?? 50); ?>"><?php echo htmlspecialchars($config['admin_edit_prefs_attempts'] ?? 50); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_prefs_attempts" data-step="1" data-max="200"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_edit_prefs_attempts" data-step="10" data-max="200"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
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
                                        <div class="component-inline-control__center" data-ref="val_admin_edit_role_attempts" data-val="<?php echo htmlspecialchars($config['admin_edit_role_attempts'] ?? 10); ?>"><?php echo htmlspecialchars($config['admin_edit_role_attempts'] ?? 10); ?></div>
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
                                        <div class="component-inline-control__center" data-ref="val_admin_edit_status_attempts" data-val="<?php echo htmlspecialchars($config['admin_edit_status_attempts'] ?? 20); ?>"><?php echo htmlspecialchars($config['admin_edit_status_attempts'] ?? 20); ?></div>
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
                                        <h2 class="component-card__title"><?php echo __('admin_config_admin_notes_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_admin_notes_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_add_note_attempts" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_add_note_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_add_note_attempts" data-val="<?php echo htmlspecialchars($config['admin_add_note_attempts'] ?? 30); ?>"><?php echo htmlspecialchars($config['admin_add_note_attempts'] ?? 30); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_add_note_attempts" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_add_note_attempts" data-step="10" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_admin_read_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_admin_read_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_read_data_attempts" data-step="-10" data-min="10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_read_data_attempts" data-step="-1" data-min="10"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_read_data_attempts" data-val="<?php echo htmlspecialchars($config['admin_read_data_attempts'] ?? 120); ?>"><?php echo htmlspecialchars($config['admin_read_data_attempts'] ?? 120); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_read_data_attempts" data-step="1" data-max="500"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_read_data_attempts" data-step="10" data-max="500"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_admin_pass_verify_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_admin_pass_verify_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_password_verify_attempts" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_password_verify_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_password_verify_attempts" data-val="<?php echo htmlspecialchars($config['admin_password_verify_attempts'] ?? 5); ?>"><?php echo htmlspecialchars($config['admin_password_verify_attempts'] ?? 5); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_password_verify_attempts" data-step="1" data-max="20"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_password_verify_attempts" data-step="5" data-max="20"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion" data-ref="admin-config-group">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">storage</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_config_infra_security_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_config_infra_security_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_redis_read_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_redis_read_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_redis_read_attempts" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_redis_read_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_redis_read_attempts" data-val="<?php echo htmlspecialchars($config['admin_redis_read_attempts'] ?? 30); ?>"><?php echo htmlspecialchars($config['admin_redis_read_attempts'] ?? 30); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_redis_read_attempts" data-step="1" data-max="200"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_redis_read_attempts" data-step="5" data-max="200"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_redis_delete_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_redis_delete_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_redis_delete_attempts" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_redis_delete_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_redis_delete_attempts" data-val="<?php echo htmlspecialchars($config['admin_redis_delete_attempts'] ?? 100); ?>"><?php echo htmlspecialchars($config['admin_redis_delete_attempts'] ?? 100); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_redis_delete_attempts" data-step="1" data-max="500"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_redis_delete_attempts" data-step="10" data-max="500"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_redis_flush_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_redis_flush_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_flush_redis_sessions_attempts" data-step="-2" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_flush_redis_sessions_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_flush_redis_sessions_attempts" data-val="<?php echo htmlspecialchars($config['admin_flush_redis_sessions_attempts'] ?? 5); ?>"><?php echo htmlspecialchars($config['admin_flush_redis_sessions_attempts'] ?? 5); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_flush_redis_sessions_attempts" data-step="1" data-max="20"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_flush_redis_sessions_attempts" data-step="2" data-max="20"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_backup_create_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_backup_create_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_backup_create_attempts" data-step="-2" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_backup_create_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_backup_create_attempts" data-val="<?php echo htmlspecialchars($config['admin_backup_create_attempts'] ?? 5); ?>"><?php echo htmlspecialchars($config['admin_backup_create_attempts'] ?? 5); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_backup_create_attempts" data-step="1" data-max="20"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_backup_create_attempts" data-step="2" data-max="20"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_config_backup_restore_attempts_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_config_backup_restore_attempts_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_backup_restore_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_backup_restore_attempts" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_admin_backup_restore_attempts" data-val="<?php echo htmlspecialchars($config['admin_backup_restore_attempts'] ?? 3); ?>"><?php echo htmlspecialchars($config['admin_backup_restore_attempts'] ?? 3); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_backup_restore_attempts" data-step="1" data-max="10"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="admin_backup_restore_attempts" data-step="1" data-max="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>