<?php
// includes/views/settings/security.php
if (session_status() === PHP_SESSION_NONE) session_start();
use App\Config\Database;

$lastUpdateText = __('sec_never_updated');
$is2FAActive = !empty($_SESSION['user_2fa']);
$text2FA = $is2FAActive ? __('2fa_status_active') : __('2fa_status_inactive');

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
                        <h2 class="component-card__title"><?php echo __('sec_password_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('sec_last_update'); ?> <?php echo htmlspecialchars($lastUpdateText); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/change-password"><?php echo __('btn_change_password'); ?></button>
                </div>
            </div>
            
            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">shield</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('sec_2fa_title'); ?></h2>
                        <p class="component-card__description"><?php echo $text2FA; ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36 component-button--dark" data-nav="/ProjectRosaura/settings/2fa">
                        <?php echo $is2FAActive ? __('btn_manage') : __('btn_configure'); ?>
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
                        <h2 class="component-card__title"><?php echo __('sec_devices_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('sec_devices_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/devices"><?php echo __('btn_manage_devices'); ?></button>
                </div>
            </div>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('sec_delete_account_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('sec_delete_account_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36 component-button--danger" data-nav="/ProjectRosaura/settings/delete-account"><?php echo __('btn_delete_account'); ?></button>
                </div>
            </div>
        </div>
    </div>
</div>