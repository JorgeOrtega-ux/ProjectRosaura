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

<div class="view-content">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_backups_restore_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="confirmRestore" data-tooltip="<?php echo __('btn_confirm_restore'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">settings_backup_restore</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-card--grouped component-accordion active">
                    
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">settings_backup_restore</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Parámetros de Restauración de Sistema</h2>
                                <p class="component-card__description">Revisión del archivo de paquete de datos y confirmación de seguridad</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>

                    <div class="component-accordion-body">
                        <div class="component-accordion-content">

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
                    
                </div>

            </div>
        </div>
    </div>
</div>