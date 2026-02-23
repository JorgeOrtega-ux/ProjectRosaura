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
                    <div class="component-avatar role-<?php echo htmlspecialchars($userRole); ?>">
                        <img src="<?php echo htmlspecialchars($formattedAvatar); ?>" alt="Avatar">
                        <div class="component-avatar__overlay">
                            <span class="material-symbols-rounded">photo_camera</span>
                        </div>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Foto de perfil</h2>
                        <p class="component-card__description">Se recomienda una imagen cuadrada de máximo 2MB (PNG o JPG).</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--stretch">
                    <button type="button" class="component-button component-button--h34 component-button--dark">Cambiar foto</button>
                    <button type="button" class="component-button component-button--h34">Eliminar</button>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stateful">
                
                <div class="active component-state-box" data-state="username-view">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Nombre de usuario</h2>
                            <span class="component-display-value"><?php echo htmlspecialchars($userName); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <button type="button" class="component-button component-button--h34" onclick="toggleEdit('username')">Editar</button>
                    </div>
                </div>

                <div class="disabled component-state-box" data-state="username-edit">
                    <div class="component-card__content" style="width: 100%;">
                        <div class="component-card__text" style="width: 100%;">
                            <h2 class="component-card__title">Nombre de usuario</h2>
                            <div class="component-edit-row">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="text" id="input-username" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($userName); ?>" placeholder="Ingresa tu usuario">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" onclick="toggleEdit('username')">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark">Guardar</button>
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
                            <span class="component-display-value"><?php echo htmlspecialchars($userEmail); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <button type="button" class="component-button component-button--h34" onclick="toggleEdit('email')">Editar</button>
                    </div>
                </div>

                <div class="disabled component-state-box" data-state="email-edit">
                    <div class="component-card__content" style="width: 100%;">
                        <div class="component-card__text" style="width: 100%;">
                            <h2 class="component-card__title">Correo electrónico</h2>
                            <div class="component-edit-row">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="email" id="input-email" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($userEmail); ?>" placeholder="Ingresa tu correo">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" onclick="toggleEdit('email')">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark">Guardar</button>
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
                    <div class="component-dropdown-trigger">
                        <span class="material-symbols-rounded">language</span>
                        <span class="component-dropdown-text">Español (Latinoamérica)</span>
                        <span class="material-symbols-rounded">expand_more</span>
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
                        <input type="checkbox" checked>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

    </div>
</div>

<script>
    function toggleEdit(field) {
        const viewBox = document.querySelector(`[data-state="${field}-view"]`);
        const editBox = document.querySelector(`[data-state="${field}-edit"]`);
        
        if (viewBox.classList.contains('active')) {
            // Se oculta la vista, se muestra la edición
            viewBox.classList.replace('active', 'disabled');
            editBox.classList.replace('disabled', 'active');
            // Retardo para enfocar el input una vez que sea visible
            setTimeout(() => document.getElementById('input-' + field).focus(), 50);
        } else {
            // Se oculta la edición, se muestra la vista
            editBox.classList.replace('active', 'disabled');
            viewBox.classList.replace('disabled', 'active');
        }
    }
</script>