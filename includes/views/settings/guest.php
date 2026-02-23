<?php
if (isset($_SESSION['user_id'])) {
    $isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
    if ($isSpaRequest) {
        header("X-SPA-Redirect: /ProjectRosaura/settings/your-profile");
    } else {
        header("Location: /ProjectRosaura/settings/your-profile");
    }
    exit;
}
?>
<div class="settings-container">
    <h1 class="settings-title">Configuración de invitado</h1>
    <p class="settings-desc">No tienes una sesión activa. Inicia sesión o regístrate para configurar tus preferencias personalizadas.</p>
</div>