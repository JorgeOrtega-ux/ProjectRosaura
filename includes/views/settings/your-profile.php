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
                <div class="component-card__actions">
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
                    <div class="component-card__actions">
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
                                <div class="component-card__actions">
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
                    <div class="component-card__actions">
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
                                <div class="component-card__actions">
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
                <div class="component-card__actions">
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
                <div class="component-card__actions">
                    <label class="component-toggle-switch">
                        <input type="checkbox" checked>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

    </div>
</div>

<style>
/* ========================================= */
/* --- GENERIC COMPONENT STYLES ---          */
/* ========================================= */
.view-content { width: 100%; height: 100%; padding: 0; }
.component-wrapper { width: 100%; max-width: 700px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }

.component-header-card { text-align: center; border: 1px solid #00000020; border-radius: 12px; padding: 24px; background-color: #ffffff; }
.component-page-title { font-size: 24px; font-weight: 700; margin: 0 0 8px 0; color: #111111; }
.component-page-description { font-size: 15px; color: #666666; margin: 0; }

.component-card--grouped { display: flex; flex-direction: column; border: 1px solid #00000020; border-radius: 12px; background-color: #ffffff; overflow: hidden; }

/* Estructuras base para las filas */
.component-group-item { display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 24px; gap: 16px; }
.component-group-item--wrap { flex-wrap: wrap; }
.component-group-item--stacked { flex-direction: column; align-items: flex-start; gap: 12px; }
.component-group-item--stacked .component-card__actions { width: 100%; }

/* Variación para filas que tienen estados (Ver/Editar) */
.component-group-item--stateful { display: block; width: 100%; padding: 24px; }

.component-divider { border: 0; border-top: 1px solid #00000020; width: 100%; margin: 0; }

.component-card__content { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 18px; }
.component-card__text { display: flex; flex-direction: column; gap: 4px; width: 100%; }

.component-card__title { font-size: 15px; font-weight: 600; margin: 0; color: #111111; }
.component-card__description { font-size: 14px; color: #666666; margin: 0; line-height: 1.4; }
.component-display-value { font-size: 15px; color: #111111; }

.component-card__actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

/* ========================================= */
/* --- VIEW & EDIT STATE LOGIC ---           */
/* ========================================= */

.component-state-box {
    width: 100%;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}
.component-state-box.disabled { display: none !important; }
.component-state-box.active { display: flex; }

/* Contenedor que amarra firmemente el input con sus botones en PC */
.component-edit-row {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 16px;
    margin-top: 6px; /* Espacio exacto bajo el título */
}

/* El input toma todo el espacio sobrante que los botones no usan */
.component-edit-row .component-input-group {
    flex: 1; 
}

/* ========================================= */
/* --- INPUT OVERRIDES ---                   */
/* ========================================= */
.component-input-group--h34 { height: 34px !important; }
.component-input-field--simple { padding: 0 12px !important; }

/* ========================================= */
/* --- AVATAR COMPONENT ---                  */
/* ========================================= */
.component-avatar { width: 64px; height: 64px; border-radius: 50%; position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background-color: #f5f5fa; }
.component-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; border: 2px solid #ffffff; position: relative; z-index: 2; }
.component-avatar::before { content: ''; position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px; border-radius: 50%; border: 2px solid transparent; z-index: 1; }

.component-avatar.role-user::before { border-color: #cccccc; }
.component-avatar.role-moderator::before { border-color: #1a73e8; }
.component-avatar.role-administrator::before { border-color: #d32f2f; }
.component-avatar.role-founder::before {
    border: none;
    background-image: conic-gradient(from 300deg, #D32029 0deg 90deg, #206BD3 90deg 210deg, #28A745 210deg 300deg, #FFC107 300deg 360deg);
    mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff 0);
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff 0);
}

.component-avatar__overlay { position: absolute; inset: 0; background-color: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; opacity: 0; cursor: pointer; z-index: 3; transition: opacity 0.2s ease; }
.component-avatar:hover .component-avatar__overlay { opacity: 1; }

/* ========================================= */
/* --- TOGGLE SWITCH COMPONENT ---           */
/* ========================================= */
.component-toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.component-toggle-switch input { opacity: 0; width: 0; height: 0; }
.component-toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e0e0e0; border-radius: 34px; transition: .3s; border: 1px solid #00000020; }
.component-toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: #ffffff; border-radius: 50%; transition: .3s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
input:checked + .component-toggle-slider { background-color: #111111; border-color: #111111; }
input:checked + .component-toggle-slider:before { transform: translateX(20px); }

/* ========================================= */
/* --- DROPDOWN TRIGGER COMPONENT ---        */
/* ========================================= */
.component-dropdown-trigger { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 265px; height: 40px; padding: 0 12px; border: 1px solid #00000020; border-radius: 8px; background-color: #ffffff; cursor: pointer; color: #111111; transition: border-color 0.2s ease, background-color 0.2s ease; }
.component-dropdown-trigger:hover { border-color: #111111; background-color: #f5f5fa; }
.component-dropdown-text { flex: 1; font-weight: 500; font-size: 14px; }

/* ========================================= */
/* --- MEDIA QUERIES ---                     */
/* ========================================= */
@media (max-width: 600px) {
    /* Filas genéricas a columnas */
    .component-group-item {
        flex-direction: column;
        align-items: stretch;
    }
    
    .component-dropdown-trigger {
        max-width: 100%;
    }

    /* Manejo del Estado de Vista en móvil */
    .component-state-box.active {
        flex-direction: column;
        align-items: stretch;
    }
    .component-state-box[data-state$="-view"] .component-card__actions {
        width: 100%;
        margin-top: 12px;
        justify-content: flex-start;
    }

    /* Manejo de la fila de Edición en móvil */
    .component-edit-row {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }
    .component-edit-row .component-card__actions {
        width: 100%;
        display: flex;
    }
    .component-edit-row .component-button {
        flex: 1; /* Los dos botones se estiran tomando el 50% del ancho cada uno */
    }
}
</style>

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