<?php
if (session_status() === PHP_SESSION_NONE) session_start();

$backupId = $_GET['id'] ?? '';
if (empty($backupId)) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($uri, PHP_URL_PATH) ?? '';
    $parts = array_filter(explode('/', $path));
    $last = end($parts);
    if ($last && $last !== 'backup-restore') {
        $backupId = urldecode($last);
    }
}
$filename = base64_decode($backupId);
if (empty($filename)) {
    $filename = $backupId;
}
?>
<div class="component-modal-header component-modal-header--with-icon">
    <div class="component-card__icon-container component-card__icon-container--bordered">
        <span class="material-symbols-rounded">settings_backup_restore</span>
    </div>
    <div class="component-modal-header-text">
        <h2 class="component-modal-title"><?php echo __('admin_backups_restore_title'); ?></h2>
        <p class="component-modal-desc"><?php echo __('msg_confirm_restore_password'); ?></p>
    </div>
</div>

<div class="component-modal-body">
    <div class="component-card--grouped active">
        <div class="component-group-item component-group-item--stacked">
            <div class="component-card__content component-card__content--full component-card__content--start">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">warning</span>
                </div>
                <div class="component-card__text">
                    <h2 class="component-card__title">Advertencia de Acción Destructiva</h2>
                    <p class="component-card__description">La restauración reemplazará la estructura y registros actuales del sistema por los contenidos en este paquete. Esta acción es irreversible.</p>
                </div>
            </div>
        </div>

        <hr class="component-divider">

        <div class="component-group-item component-group-item--stacked">
            <div class="component-card__content component-card__content--full component-card__content--start">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">database</span>
                </div>
                <div class="component-card__text">
                    <h2 class="component-card__title">Paquete de Respaldo Seleccionado</h2>
                    <p class="component-card__description" data-ref="restore-target-filename" data-backup-id="<?php echo htmlspecialchars($backupId); ?>">
                        <?php echo htmlspecialchars($filename); ?>
                    </p>
                </div>
            </div>
        </div>

        <hr class="component-divider">

        <div class="component-group-item">
            <div class="component-card__content">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">lock_open</span>
                </div>
                <div class="component-card__text">
                    <h2 class="component-card__title">Desbloqueo de Seguridad para Restauración</h2>
                    <p class="component-card__description">Habilita el interruptor para confirmar la operación y autorizar el procedimiento en el servidor.</p>
                </div>
            </div>
            <div class="component-card__actions component-card__actions--end">
                <label class="component-toggle-switch">
                    <input type="checkbox" data-action="toggleRestoreLock">
                    <span class="component-toggle-slider"></span>
                </label>
            </div>
        </div>
    </div>
</div>

<div class="component-modal-actions">
    <button class="component-button component-button--h40" data-modal-action="cancel"><?php echo __('btn_cancel'); ?></button>
    <button class="component-button component-button--h40 component-button--danger disabled-interaction" data-action="confirmRestoreSubmit"><?php echo __('btn_confirm_restore'); ?></button>
</div>
