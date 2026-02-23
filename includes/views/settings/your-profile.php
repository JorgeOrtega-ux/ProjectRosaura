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
    <h1 class="settings-title">Tu perfil</h1>
    <p class="settings-desc">Administra tu información personal y los detalles públicos de tu cuenta.</p>
</div>