<?php
if (!isset($_SESSION['user_id'])) {
    $isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
    if ($isSpaRequest) {
        header("X-SPA-Redirect: /ProjectRosaura/settings/guest");
    } else {
        header("Location: /ProjectRosaura/settings/guest");
    }
    exit;
}
?>
<div class="settings-container">
    <h1 class="settings-title">Inicio de sesión y seguridad</h1>
    <p class="settings-desc">Gestiona tus contraseñas, métodos de acceso y la seguridad integral de tu cuenta.</p>
</div>