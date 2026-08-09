<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Api\Services\Admin\AdminViewService;

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

$adminViewService = new AdminViewService();
$restoreData = $adminViewService->getBackupsRestoreData($backupId);
extract($restoreData);

$schema = $metadata['schema'] ?? [];
$isFallback = $metadata['is_fallback'] ?? false;
?>

<style>
.component-modal-box--restore-container {
    max-width: 960px !important;
    width: 960px !important;
    height: auto;
    max-height: 90vh;
    padding: 0 !important;
    border-radius: 24px !important;
    background-color: var(--bg-surface) !important;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
}
.restore-modal-left {
    width: 45%;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background-color: var(--bg-surface);
}
.restore-modal-right {
    width: 55%;
    padding: 32px;
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 16px;
    background-color: var(--bg-surface);
    overflow-y: auto;
    max-height: 90vh;
}
.restore-schema-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.restore-schema-db {
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 12px 16px;
    background: var(--bg-card);
}
.restore-schema-db-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
}
.restore-schema-tables-list {
    margin-top: 10px;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px solid var(--border-color);
    padding-top: 10px;
}
.restore-schema-table-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
@media (max-width: 768px) {
    .component-modal-box--restore-container {
        width: 100% !important;
        max-width: 95vw !important;
        flex-direction: column !important;
        max-height: 95vh;
        overflow-y: auto;
    }
    .restore-modal-left {
        width: 100% !important;
    }
    .restore-modal-right {
        width: 100% !important;
        border-left: none;
        border-top: 1px solid var(--border-color);
        max-height: none;
    }
}
</style>

<div class="component-modal-box--restore-container" style="box-shadow: none !important; border-radius: 0 !important; background: transparent !important; width: 100% !important; max-width: 100% !important; max-height: none !important;">
    <script type="application/json" data-ref="restore-available-schema">
        <?php echo json_encode($schema); ?>
    </script>

    <!-- LEFT COLUMN -->
    <div class="restore-modal-left">
        <div class="component-modal-header component-modal-header--with-icon" style="padding:0; margin-bottom:12px;">
            <div class="component-card__icon-container component-card__icon-container--bordered">
                <span class="material-symbols-rounded">settings_backup_restore</span>
            </div>
            <div class="component-modal-header-text">
                <h2 class="component-modal-title"><?php echo __('admin_backups_restore_title'); ?></h2>
                <p class="component-modal-desc"><?php echo __('msg_confirm_restore_password'); ?></p>
            </div>
        </div>

        <div class="component-card--grouped active" style="margin:0;">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded" style="color:var(--status-danger);">warning</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Advertencia de Acción Destructiva</h2>
                        <p class="component-card__description">La restauración reemplazará la estructura y registros seleccionados por los contenidos de este paquete. Esta acción es irreversible.</p>
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
                        <p class="component-card__description">Habilita el interruptor para confirmar la operación y autorizar el procedimiento.</p>
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

        <div class="component-modal-actions" style="padding:0; margin-top:auto; justify-content: flex-end; gap: 8px;">
            <button class="component-button component-button--h40" data-modal-action="cancel"><?php echo __('btn_cancel'); ?></button>
            <button class="component-button component-button--h40 component-button--danger disabled-interaction" data-action="confirmRestoreSubmit"><?php echo __('btn_confirm_restore'); ?></button>
        </div>
    </div>

    <!-- RIGHT COLUMN -->
    <div class="restore-modal-right">
        <h3 class="component-card__title" style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span class="material-symbols-rounded">checklist</span>
            Selección de Bases de Datos y Tablas
        </h3>
        
        <?php if ($isFallback): ?>
            <div style="background: var(--bg-hover-light); border: 1px solid var(--border-color); padding: 12px; border-radius: 12px; font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                <span class="material-symbols-rounded" style="vertical-align: middle; font-size: 18px; margin-right: 4px; color: var(--status-warning);">info</span>
                Este respaldo no tiene un archivo de metadatos asociado (versión anterior). Se muestran las tablas actuales del sistema como referencia.
            </div>
        <?php endif; ?>

        <div class="restore-schema-container" data-ref="restore-schema-tree">
            <!-- Rendered dynamically via JS -->
            <div class="component-spinner component-spinner--centered"></div>
        </div>
    </div>
</div>
