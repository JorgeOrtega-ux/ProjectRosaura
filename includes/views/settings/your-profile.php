<?php
// includes/views/settings/your-profile.php
if (session_status() === PHP_SESSION_NONE) session_start();

$isLoggedIn = isset($_SESSION['user_id']);
$userName = $_SESSION['user_name'] ?? 'Usuario';
$userEmail = $_SESSION['user_email'] ?? 'usuario@ejemplo.com';
$userRole = $_SESSION['user_role'] ?? 'user';
$userPic = $_SESSION['user_pic'] ?? 'public/storage/profilePictures/default/default.png';
$formattedAvatar = '/ProjectRosaura/' . ltrim($userPic, '/');
?>

<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title">Tu Perfil</h1>
            <p class="component-page-description">Administra tu foto de perfil, información personal y preferencias de cuenta.</p>
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
                        <h2 class="component-card__title">Foto de perfil</h2>
                        <p class="component-card__description">Se recomienda una imagen cuadrada de máximo 2MB (PNG o JPG).</p>
                        
                        <input type="file" id="input-avatar-file" accept="image/png, image/jpeg, image/jpg" style="display: none;">
                    </div>
                </div>
                
                <div class="component-card__actions component-card__actions--stretch" id="profile-avatar-actions">
                    <button type="button" class="component-button component-button--h34 component-button--dark" id="btn-change-avatar">Cambiar foto</button>
                    <button type="button" class="component-button component-button--h34" id="btn-delete-avatar">Eliminar</button>
                    
                    <button type="button" class="component-button component-button--h34" id="btn-cancel-avatar" style="display: none;">Cancelar</button>
                    <button type="button" class="component-button component-button--h34 component-button--dark" id="btn-save-avatar" style="display: none;">Guardar</button>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stateful">
                
                <div class="active component-state-box" data-state="username-view">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Nombre de usuario</h2>
                            <span class="component-display-value" id="display-username"><?php echo htmlspecialchars($userName); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="username">Editar</button>
                    </div>
                </div>

                <div class="disabled component-state-box" data-state="username-edit">
                    <div class="component-card__content" style="width: 100%;">
                        <div class="component-card__text" style="width: 100%;">
                            <h2 class="component-card__title">Nombre de usuario</h2>
                            <div class="component-edit-row">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="text" id="input-username" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($userName); ?>" data-original-value="<?php echo htmlspecialchars($userName); ?>" placeholder="Ingresa tu usuario">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="username">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveUsername">Guardar</button>
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
                            <h2 class="component-card__title">Correo electrónico</h2>
                            <span class="component-display-value" id="display-email"><?php echo htmlspecialchars($userEmail); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <button type="button" class="component-button component-button--h34" data-action="requestEmailUpdate">Editar</button>
                    </div>
                </div>

                <div class="disabled component-state-box" data-state="email-edit">
                    <div class="component-card__content" style="width: 100%;">
                        <div class="component-card__text" style="width: 100%;">
                            <h2 class="component-card__title">Correo electrónico</h2>
                            <div class="component-edit-row">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="email" id="input-email" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($userEmail); ?>" data-original-value="<?php echo htmlspecialchars($userEmail); ?>" placeholder="Ingresa tu correo">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="email">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveEmail">Guardar</button>
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
                        <h2 class="component-card__title">Idioma de la interfaz</h2>
                        <p class="component-card__description">Selecciona tu idioma preferido para la plataforma.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleModuleLanguage">
                            <span class="material-symbols-rounded">language</span>
                            <span class="component-dropdown-text">Español (Latinoamérica)</span>
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
                        <h2 class="component-card__title">Abrir enlaces en una pestaña nueva</h2>
                        <p class="component-card__description">Los enlaces externos se abrirán en una nueva pestaña del navegador.</p>
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

    </div>
</div>