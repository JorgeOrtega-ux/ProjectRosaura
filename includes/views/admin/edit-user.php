<?php
// includes/views/admin/edit-user.php
if (session_status() === PHP_SESSION_NONE) session_start();
global $serverConfig;
$maxAvatarSize = $serverConfig['max_avatar_size_mb'] ?? 2;
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card" style="position: relative;">
            <button class="component-button component-button--icon component-button--h36" data-nav="/ProjectRosaura/admin/manage-users" style="position: absolute; left: 24px; top: 24px;">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 class="component-page-title">Gestionar Cuenta</h1>
            <p class="component-page-description">Editando información directamente desde el panel de administración.</p>
        </div>

        <div id="admin-edit-loader" style="display: flex; justify-content: center; padding: 40px;">
            <div class="component-spinner"></div>
        </div>

        <div id="admin-edit-form" class="disabled">
            <div class="component-card--grouped">
                <div class="component-group-item">
                     <div class="component-card__content">
                        <div class="component-avatar" id="admin-profile-avatar-container">
                            <img src="" alt="Avatar" id="admin-profile-avatar-img" data-original-src="">
                            <div class="component-avatar__overlay" id="admin-profile-avatar-overlay">
                                <span class="material-symbols-rounded">photo_camera</span>
                            </div>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">Foto de perfil</h2>
                            <p class="component-card__description">Se recomienda una imagen cuadrada de máximo <?php echo htmlspecialchars($maxAvatarSize); ?>MB (PNG o JPG).</p>
                            
                            <input type="file" id="admin-input-avatar-file" accept="image/png, image/jpeg, image/jpg" class="disabled">
                        </div>
                    </div>
                    
                    <div class="component-card__actions component-card__actions--stretch" id="admin-profile-avatar-actions">
                        <button type="button" class="component-button component-button--h34 component-button--dark" id="admin-btn-change-avatar">Subir foto</button>
                        <button type="button" class="component-button component-button--h34 disabled" id="admin-btn-delete-avatar">Eliminar</button>
                        
                        <button type="button" class="component-button component-button--h34 disabled" id="admin-btn-cancel-avatar">Cancelar</button>
                        <button type="button" class="component-button component-button--h34 component-button--dark disabled" id="admin-btn-save-avatar">Guardar</button>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item component-group-item--stateful">
                    
                    <div class="active component-state-box" data-state="admin-username-view">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Nombre de usuario</h2>
                                <span class="component-display-value" id="admin-display-username">Cargando...</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="admin-username">Editar</button>
                        </div>
                    </div>

                    <div class="disabled component-state-box" data-state="admin-username-edit">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Nombre de usuario</h2>
                                <div class="component-edit-row">
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="text" id="input-admin-username" class="component-input-field component-input-field--simple" value="" data-original-value="" placeholder="Ingresa el usuario">
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="admin-username">Cancelar</button>
                                        <button type="button" class="component-button component-button--h34 component-button--dark" data-action="adminSaveUsername">Guardar</button>
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
                                <h2 class="component-card__title">Correo electrónico</h2>
                                <span class="component-display-value" id="admin-display-email">Cargando...</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="admin-email">Editar</button>
                        </div>
                    </div>

                    <div class="disabled component-state-box" data-state="admin-email-edit">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Correo electrónico</h2>
                                <div class="component-edit-row">
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="email" id="input-admin-email" class="component-input-field component-input-field--simple" value="" data-original-value="" placeholder="Ingresa el correo">
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="admin-email">Cancelar</button>
                                        <button type="button" class="component-button component-button--h34 component-button--dark" data-action="adminSaveEmail">Guardar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div class="component-card--grouped" style="margin-top: 16px;">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Idioma de la interfaz</h2>
                            <p class="component-card__description">Selecciona tu idioma preferido para la plataforma.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="adminToggleModuleLanguage">
                                <span class="material-symbols-rounded">language</span>
                                <span class="component-dropdown-text" id="admin-lang-text">Cargando...</span>
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
                                                <input type="text" placeholder="Buscar idioma...">
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

            <div class="component-card--grouped" style="margin-top: 16px;">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Tema de la interfaz</h2>
                            <p class="component-card__description">Elige el tema de colores para la plataforma.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="adminToggleModuleTheme">
                                <span class="material-symbols-rounded">brightness_auto</span>
                                <span class="component-dropdown-text" id="admin-theme-text">Cargando...</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled bs-initialized" data-module="adminModuleTheme">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link" data-action="adminSetPref" data-key="theme" data-value="system">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">brightness_auto</span></div>
                                            <div class="component-menu-link-text"><span>Sincronizar con el sistema</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetPref" data-key="theme" data-value="light">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">light_mode</span></div>
                                            <div class="component-menu-link-text"><span>Tema claro</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetPref" data-key="theme" data-value="dark">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">dark_mode</span></div>
                                            <div class="component-menu-link-text"><span>Tema oscuro</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="component-card--grouped" style="margin-top: 16px;">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Abrir enlaces en una pestaña nueva</h2>
                            <p class="component-card__description">Los enlaces externos se abrirán en una nueva pestaña del navegador.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" id="admin-toggle-links" data-action="adminTogglePreference" data-key="open_links_new_tab">
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped" style="margin-top: 16px;">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Aumentar el tiempo de las alertas</h2>
                            <p class="component-card__description">Las notificaciones y mensajes durarán más tiempo en la pantalla antes de desaparecer.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" id="admin-toggle-alerts" data-action="adminTogglePreference" data-key="extended_alerts">
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
</div>