
<?php
// includes/views/admin/server-config.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper" style="max-width: 800px;">
        
        <div class="component-sticky-toolbar">
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active">
                    <div class="component-toolbar-left">
                        <span class="component-toolbar-title" style="border: none; padding-left: 4px; font-size: 16px;">Ajustes del Sistema</span>
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40 component-button--dark disabled-interaction" data-action="submitServerConfig" id="btn-save-config" data-tooltip="Guardar configuración" data-position="bottom">
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

        <div id="admin-config-loader" style="display: flex; justify-content: center; padding: 40px;">
            <div class="component-spinner"></div>
        </div>

        <div id="admin-config-form" class="disabled" style="display: flex; flex-direction: column; gap: 16px;">
            
            <div class="component-card--grouped component-accordion active">
                <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">manage_accounts</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">Parámetros de Cuenta y Perfil</h2>
                            <p class="component-card__description">Límites generales permitidos al crear cuentas y establecer perfiles.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content" style="padding-top: 0;">
                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Longitud mínima de contraseña</h2>
                                    <p class="component-card__description">Define la cantidad mínima de caracteres que un usuario debe ingresar al crear o cambiar su contraseña.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Longitud máxima de contraseña</h2>
                                    <p class="component-card__description">Establece el límite máximo de caracteres permitidos para una contraseña por seguridad y almacenamiento.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Longitud mínima de usuario</h2>
                                    <p class="component-card__description">El número mínimo de caracteres que debe tener un nombre de usuario válido en la plataforma.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Longitud máxima de usuario</h2>
                                    <p class="component-card__description">El límite máximo de caracteres para evitar nombres de usuario excesivamente largos que rompan la interfaz.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0 0 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Peso máximo de Avatar (MB)</h2>
                                    <p class="component-card__description">Controla el tamaño máximo de los archivos de imagen que los usuarios pueden subir como foto de perfil.</p>
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
                            <h2 class="component-card__title">Límites de Edición de Perfil</h2>
                            <p class="component-card__description">Controla cada cuántos días y cuántas veces un usuario puede modificar su perfil de forma autónoma.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content" style="padding-top: 0;">
                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Cambio de usuario: Intentos</h2>
                                    <p class="component-card__description">Cuántas veces permites que un usuario modifique su @usuario antes de aplicar un periodo de espera.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Cambio de usuario: Días de espera</h2>
                                    <p class="component-card__description">Días de penalización (enfriamiento) tras agotar los intentos para cambiar el nombre de usuario.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Cambio de correo: Intentos</h2>
                                    <p class="component-card__description">Cantidad de veces que un usuario puede actualizar la dirección de correo electrónico asociada a su cuenta.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Cambio de correo: Días de espera</h2>
                                    <p class="component-card__description">Días que el usuario debe esperar para volver a cambiar su correo tras agotar sus intentos disponibles.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">

                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Cambio de avatar: Intentos</h2>
                                    <p class="component-card__description">Número máximo de veces que se puede actualizar o eliminar la foto de perfil consecutivamente.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0 0 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Cambio de avatar: Días de espera</h2>
                                    <p class="component-card__description">Días de bloqueo para subir una nueva imagen tras alcanzar el límite de cambios de avatar permitido.</p>
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
                            <h2 class="component-card__title">Prevención de Abuso (Público)</h2>
                            <p class="component-card__description">Límites de solicitudes para inicio de sesión y recuperación de cuentas para evitar ataques de fuerza bruta.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content" style="padding-top: 0;">
                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Login: Intentos permitidos</h2>
                                    <p class="component-card__description">Número de intentos de inicio de sesión fallidos antes de aplicar un bloqueo temporal a la cuenta o IP.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Login: Bloqueo (Minutos)</h2>
                                    <p class="component-card__description">Duración en minutos del bloqueo temporal tras exceder los intentos fallidos de inicio de sesión.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">

                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Recuperación: Intentos permitidos</h2>
                                    <p class="component-card__description">Límites de envíos de correo para recuperación de contraseña que se pueden solicitar en un corto periodo.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0 0 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Recuperación: Bloqueo (Minutos)</h2>
                                    <p class="component-card__description">Minutos a esperar antes de poder volver a solicitar enlaces o códigos de recuperación de cuenta.</p>
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
                            <h2 class="component-card__title">Seguridad Administrativa</h2>
                            <p class="component-card__description">Protección contra ediciones masivas y límites anti-hackeo para el panel de moderación.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content" style="padding-top: 0;">
                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Edición masiva de Avatares (Intentos)</h2>
                                    <p class="component-card__description">Cuántos avatares de usuarios puede editar o eliminar un administrador antes de ser bloqueado.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Edición masiva de Avatares (Bloqueo min)</h2>
                                    <p class="component-card__description">Minutos que debe esperar el administrador tras superar el límite de modificación de avatares.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">

                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Edición masiva de Correos (Intentos)</h2>
                                    <p class="component-card__description">Límite de correos electrónicos que un administrador puede cambiar de forma consecutiva.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Edición masiva de Correos (Bloqueo min)</h2>
                                    <p class="component-card__description">Tiempo de bloqueo que impide seguir editando correos en el panel de administración.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">

                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Cambios masivos de Rol (Intentos)</h2>
                                    <p class="component-card__description">Número máximo de veces que se puede ascender/descender usuarios antes de pausar la acción.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Cambios masivos de Rol (Bloqueo min)</h2>
                                    <p class="component-card__description">Minutos de penalización aplicados al administrador para proteger la integridad de los roles.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">

                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Sanciones masivas de cuenta (Intentos)</h2>
                                    <p class="component-card__description">Límite de suspensiones o eliminaciones de cuentas seguidas por un administrador.</p>
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

                        <hr class="component-divider" style="margin: 0 -24px; width: auto; display: block;">
                        
                        <div class="component-group-item component-group-item--stacked" style="padding: 16px 0 0 0;">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Sanciones masivas de cuenta (Bloqueo min)</h2>
                                    <p class="component-card__description">Tiempo que detiene al administrador de seguir sancionando usuarios excesivamente.</p>
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
                            <h2 class="component-card__title">Verificar identidad</h2>
                            <p class="component-card__description">Para aplicar y guardar los cambios globales en el servidor, ingresa tu contraseña de administrador.</p>
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="password" class="component-input-field component-input-field--with-icon" id="admin_config_password" placeholder=" ">
                                    <label class="component-input-label">Tu contraseña actual</label>
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