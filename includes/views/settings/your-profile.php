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

<div class="settings-container">
    <div class="settings-wrapper">
        
        <div class="settings-header-card">
            <h1 class="settings-title">Tu Perfil</h1>
            <p class="settings-desc">Administra tu foto de perfil, información personal y preferencias de cuenta.</p>
        </div>

        <div class="settings-card-group">
            <div class="settings-group-item">
                 <div class="settings-card-content">
                    <div class="settings-avatar role-<?php echo htmlspecialchars($userRole); ?>">
                        <img src="<?php echo htmlspecialchars($formattedAvatar); ?>" alt="Avatar">
                        <div class="settings-avatar-overlay">
                            <span class="material-symbols-rounded">photo_camera</span>
                        </div>
                    </div>
                    <div class="settings-card-text">
                        <h2 class="settings-card-title">Foto de perfil</h2>
                        <p class="settings-card-desc">Se recomienda una imagen cuadrada de máximo 2MB (PNG o JPG).</p>
                    </div>
                </div>
                <div class="settings-card-actions">
                    <button type="button" class="component-button component-button--dark">Cambiar foto</button>
                    <button type="button" class="component-button">Eliminar</button>
                </div>
            </div>

            <hr class="settings-divider">

            <div class="settings-group-item settings-group-item--wrap">
                <div class="settings-card-content">
                    <div class="settings-card-text">
                        <h2 class="settings-card-title">Nombre de usuario</h2>
                        <div class="active" data-state="username-view">
                            <span class="settings-display-value"><?php echo htmlspecialchars($userName); ?></span>
                        </div>
                        <div class="disabled" data-state="username-edit">
                            <div class="component-input-group settings-input-adjust">
                                <input type="text" id="input-username" class="component-input-field" value="<?php echo htmlspecialchars($userName); ?>" placeholder=" ">
                                <label for="input-username" class="component-input-label">Nombre de usuario</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="settings-card-actions active" data-state="username-actions-view">
                    <button type="button" class="component-button" onclick="toggleEdit('username')">Editar</button>
                </div>
                <div class="settings-card-actions disabled" data-state="username-actions-edit">
                    <button type="button" class="component-button" onclick="toggleEdit('username')">Cancelar</button>
                    <button type="button" class="component-button component-button--dark">Guardar</button>
                </div>
            </div>

            <hr class="settings-divider">

            <div class="settings-group-item settings-group-item--wrap">
                <div class="settings-card-content">
                    <div class="settings-card-text">
                        <h2 class="settings-card-title">Correo electrónico</h2>
                        <div class="active" data-state="email-view">
                            <span class="settings-display-value"><?php echo htmlspecialchars($userEmail); ?></span>
                        </div>
                        <div class="disabled" data-state="email-edit">
                            <div class="component-input-group settings-input-adjust">
                                <input type="email" id="input-email" class="component-input-field" value="<?php echo htmlspecialchars($userEmail); ?>" placeholder=" ">
                                <label for="input-email" class="component-input-label">Correo electrónico</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="settings-card-actions active" data-state="email-actions-view">
                    <button type="button" class="component-button" onclick="toggleEdit('email')">Editar</button>
                </div>
                <div class="settings-card-actions disabled" data-state="email-actions-edit">
                    <button type="button" class="component-button" onclick="toggleEdit('email')">Cancelar</button>
                    <button type="button" class="component-button component-button--dark">Guardar</button>
                </div>
            </div>
        </div>

        <div class="settings-card-group">
            <div class="settings-group-item settings-group-item--stacked">
                <div class="settings-card-content">
                    <div class="settings-card-text">
                        <h2 class="settings-card-title">Idioma de la interfaz</h2>
                        <p class="settings-card-desc">Selecciona tu idioma preferido para la plataforma.</p>
                    </div>
                </div>
                <div class="settings-card-actions">
                    <div class="settings-dropdown-trigger">
                        <span class="material-symbols-rounded">language</span>
                        <span class="settings-dropdown-text">Español (Latinoamérica)</span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="settings-card-group">
            <div class="settings-group-item settings-group-item--wrap">
                <div class="settings-card-content">
                    <div class="settings-card-text">
                        <h2 class="settings-card-title">Abrir enlaces en una pestaña nueva</h2>
                        <p class="settings-card-desc">Los enlaces externos se abrirán en una nueva pestaña del navegador.</p>
                    </div>
                </div>
                <div class="settings-card-actions">
                    <label class="settings-toggle-switch">
                        <input type="checkbox" checked>
                        <span class="settings-toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

    </div>
</div>

<style>
/* ========================================= */
/* --- SETTINGS SPECIFIC STYLES ---          */
/* ========================================= */
.settings-container {
    width: 100%;
    height: 100%;
    padding: 0;
}

.settings-wrapper {
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.settings-header-card {
    text-align: center;
    border: 1px solid #00000020;
    border-radius: 12px;
    padding: 24px;
    background-color: #ffffff;
}

.settings-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: #111111;
}

.settings-desc {
    font-size: 15px;
    color: #666666;
    margin: 0;
}

.settings-card-group {
    display: flex;
    flex-direction: column;
    border: 1px solid #00000020;
    border-radius: 12px;
    background-color: #ffffff;
    overflow: hidden;
}

.settings-group-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    gap: 16px;
}

.settings-group-item--wrap {
    flex-wrap: wrap;
}

.settings-group-item--stacked {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}

.settings-group-item--stacked .settings-card-actions {
    width: 100%;
}

.settings-divider {
    border: 0;
    border-top: 1px solid #00000020;
    width: 100%;
    margin: 0;
}

.settings-card-content {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 18px;
}

.settings-card-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
}

.settings-card-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    color: #111111;
}

.settings-card-desc {
    font-size: 14px;
    color: #666666;
    margin: 0;
    line-height: 1.4;
}

.settings-display-value {
    font-size: 15px;
    color: #111111;
}

.settings-card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.settings-input-adjust {
    margin-top: 8px;
}

/* AVATAR SETTINGS */
.settings-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background-color: #f5f5fa;
}

.settings-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 2px solid #ffffff;
    position: relative;
    z-index: 2;
}

.settings-avatar::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    border: 2px solid transparent;
    z-index: 1;
}

.settings-avatar.role-user::before { border-color: #cccccc; }
.settings-avatar.role-moderator::before { border-color: #1a73e8; }
.settings-avatar.role-administrator::before { border-color: #d32f2f; }
.settings-avatar.role-founder::before {
    border: none;
    background-image: conic-gradient(from 300deg, #D32029 0deg 90deg, #206BD3 90deg 210deg, #28A745 210deg 300deg, #FFC107 300deg 360deg);
    mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff 0);
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff 0);
}

.settings-avatar-overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(0,0,0,0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    opacity: 0;
    cursor: pointer;
    z-index: 3;
    transition: opacity 0.2s ease;
}

.settings-avatar:hover .settings-avatar-overlay {
    opacity: 1;
}

/* TOGGLE SWITCH */
.settings-toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
}

.settings-toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.settings-toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #e0e0e0;
    border-radius: 34px;
    transition: .3s;
    border: 1px solid #00000020;
}

.settings-toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 2px;
    bottom: 2px;
    background-color: #ffffff;
    border-radius: 50%;
    transition: .3s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

input:checked + .settings-toggle-slider {
    background-color: #111111;
    border-color: #111111;
}

input:checked + .settings-toggle-slider:before {
    transform: translateX(20px);
}

/* DROPDOWN TRIGGER */
.settings-dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    max-width: 265px;
    height: 40px;
    padding: 0 12px;
    border: 1px solid #00000020;
    border-radius: 8px;
    background-color: #ffffff;
    cursor: pointer;
    color: #111111;
    transition: border-color 0.2s ease, background-color 0.2s ease;
}

.settings-dropdown-trigger:hover {
    border-color: #111111;
    background-color: #f5f5fa;
}

.settings-dropdown-text {
    flex: 1;
    font-weight: 500;
    font-size: 14px;
}

/* STATES */
.active[data-state] { display: flex; }
.disabled[data-state] { display: none; }

/* MEDIA QUERIES */
@media (max-width: 600px) {
    .settings-group-item {
        flex-direction: column;
        align-items: stretch;
    }
    .settings-card-actions {
        width: 100%;
        justify-content: flex-start;
    }
    .settings-dropdown-trigger {
        max-width: 100%;
    }
    .disabled[data-state$="-edit"] {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>