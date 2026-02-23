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
    <h1 class="settings-title">Accesibilidad</h1>
    <p class="settings-desc">Ajusta la interfaz según tus preferencias para una mejor experiencia.</p>
</div>