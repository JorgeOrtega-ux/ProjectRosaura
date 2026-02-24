<?php
// includes/views/settings/security.php
if (session_status() === PHP_SESSION_NONE) session_start();
use App\Config\Database;

$lastUpdateText = "Nunca se ha actualizado";
$is2FAActive = !empty($_SESSION['user_2fa']);
$text2FA = $is2FAActive ? 'Activado' : 'Añade una capa adicional de seguridad a tu cuenta.';

if (isset($_SESSION['user_id'])) {
    $db = new Database();
    $pdo = $db->getConnection();
    $stmt = $pdo->prepare("SELECT created_at FROM profile_changes_log WHERE user_id = ? AND change_type = 'password' ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$_SESSION['user_id']]);
    $log = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($log && !empty($log['created_at'])) {
        $date = new DateTime($log['created_at']);
        $lastUpdateText = $date->format('d/m/Y H:i');
    }
}
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('sec_title'); ?></h1>
            <p class="component-page-description"><?php echo __('sec_desc'); ?></p>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">lock</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Contraseña</h2>
                        <p class="component-card__description">Última actualización: <?php echo htmlspecialchars($lastUpdateText); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/change-password">Cambiar contraseña</button>
                </div>
            </div>
            
            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">shield</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Autenticación de dos factores (2FA)</h2>
                        <p class="component-card__description" style="<?php echo $is2FAActive ? 'color: #16a34a; font-weight: 500;' : ''; ?>"><?php echo $text2FA; ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36 component-button--dark" data-nav="/ProjectRosaura/settings/2fa">
                        <?php echo $is2FAActive ? 'Gestionar' : 'Configurar'; ?>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">devices</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Tus dispositivos</h2>
                        <p class="component-card__description">Gestiona los dispositivos en los que has iniciado sesión actualmente.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36">Gestionar dispositivos</button>
                </div>
            </div>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Eliminar cuenta</h2>
                        <p class="component-card__description">Elimina tu cuenta y todos tus datos de forma permanente e irrecuperable.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36 component-button--danger">Eliminar cuenta</button>
                </div>
            </div>
        </div>
    </div>
</div>