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
<div class="restore-modal-single-block">
    <script type="application/json" data-ref="restore-available-schema">
        <?php echo json_encode($schema); ?>
    </script>

    <div class="step-modal-content">
        <!-- STEP 1: SCHEMA SELECTION -->
        <div class="step-modal-step active" id="restore-step-1">
            <div class="component-modal-header component-modal-header--with-icon restore-header">
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">Paso 1: Selección de Bases de Datos y Tablas</h2>
                    <p class="component-modal-desc">Elige los elementos específicos que deseas restaurar del paquete de respaldo.</p>
                </div>
            </div>

            <?php if ($isFallback): ?>
                <div class="restore-badge-container">
                    <span class="component-badge">Respaldo heredado</span>
                </div>
            <?php endif; ?>

            <div class="restore-splitter" data-ref="restore-schema-tree">
                <div class="restore-pane-left" data-ref="restore-db-pane">
                    <div class="component-spinner component-spinner--centered"></div>
                </div>
                <div class="restore-pane-right" data-ref="restore-tables-pane">
                </div>
            </div>

            <div class="restore-footer">
                <div class="restore-footer-dots">
                    <div class="step-modal-dot active"></div>
                    <div class="step-modal-dot" data-step-target="restore-step-2"></div>
                    <div class="step-modal-dot disabled-interaction" data-step-target="restore-step-3"></div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel"><?php echo __('btn_cancel'); ?></button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-step-target="restore-step-2" data-action="nextToStep2">Siguiente</button>
                </div>
            </div>
        </div>

        <!-- STEP 2: CONFIRMATION & SAFETY LOCK -->
        <div class="step-modal-step" id="restore-step-2">
            <div class="component-modal-header component-modal-header--with-icon restore-header">
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">Paso 2: Confirmación y Desbloqueo</h2>
                    <p class="component-modal-desc">
                        La restauración reemplazará la estructura y todos los registros seleccionados. Esta acción es irreversible y puede sobrescribir datos existentes en producción. Se aconseja realizar una copia de seguridad del estado actual antes de proceder, ya que cualquier cambio podría afectar a los usuarios activos.
                    </p>
                    <div class="restore-badge-container">
                        <span class="component-badge" data-ref="restore-target-filename" data-backup-id="<?php echo htmlspecialchars($backupId); ?>">
                            <span class="material-symbols-rounded">database</span>
                            <?php echo htmlspecialchars($filename); ?>
                        </span>
                    </div>
                </div>
            </div>

            <div class="restore-step-2-card-wrapper">
                <div class="component-card--grouped active">
                    <div class="component-group-item component-group-item--compact">
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
            </div>

            <div class="restore-footer">
                <div class="restore-footer-dots">
                    <div class="step-modal-dot" data-step-target="restore-step-1"></div>
                    <div class="step-modal-dot active"></div>
                    <div class="step-modal-dot disabled-interaction" data-step-target="restore-step-3"></div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-step-target="restore-step-1">Atrás</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark disabled-interaction" data-step-target="restore-step-3" data-action="nextToStep3">Siguiente</button>
                </div>
            </div>
        </div>

        <!-- STEP 3: PASSWORD VERIFICATION -->
        <div class="step-modal-step" id="restore-step-3">
            <div class="component-modal-header component-modal-header--with-icon restore-header">
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">Paso 3: Verificar Identidad</h2>
                    <p class="component-modal-desc">Confirma tu contraseña para autorizar la restauración en el servidor.</p>
                </div>
            </div>

            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="password" data-ref="modal_verify_password" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="current-password">
                    <label class="component-input-label">Contraseña actual</label>
                    <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                </div>
            </div>

            <div class="restore-footer">
                <div class="restore-footer-dots">
                    <div class="step-modal-dot" data-step-target="restore-step-1"></div>
                    <div class="step-modal-dot" data-step-target="restore-step-2"></div>
                    <div class="step-modal-dot active"></div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-step-target="restore-step-2">Atrás</button>
                    <button type="button" class="component-button component-button--h40 component-button--danger disabled-interaction" data-action="confirmRestoreSubmit"><?php echo __('btn_confirm_restore'); ?></button>
                </div>
            </div>
        </div>
    </div>
</div>
