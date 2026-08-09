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
    max-width: 952px !important;
    width: 952px !important;
    height: 592px !important;
    max-height: 592px !important;
    padding: 32px !important;
    border-radius: 24px !important;
    background-color: var(--bg-surface) !important;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
}

.restore-modal-single-block {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
}

.component-modal-box--restore-container .step-modal-content {
    padding: 0 !important;
    overflow: hidden !important;
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    min-height: auto !important;
    max-height: none !important;
}

.component-modal-box--restore-container .step-modal-step {
    display: none;
    flex-direction: column;
    flex: 1;
    height: 100%;
    overflow: hidden;
}

.component-modal-box--restore-container .step-modal-step.active {
    display: flex;
}

.restore-header {
    padding: 0;
    margin-bottom: 12px;
}

/* Paso 1 Splitter */
.restore-splitter {
    display: flex;
    flex-direction: row;
    gap: 0;
    flex: 1;
    height: 100%;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-card);
    overflow: hidden;
    margin-bottom: 8px;
}

.restore-pane-left {
    width: 40%;
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--bg-card);
}

.restore-pane-right {
    width: 60%;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--bg-surface);
}

.restore-db-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
    background: var(--bg-surface);
}

.restore-tables-container {
    display: none;
    flex-direction: column;
    gap: 8px;
}

.restore-tables-container.active {
    display: flex;
}

.restore-table-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px dashed var(--border-color);
    background: var(--bg-surface);
}

/* Paso 2 specific modifications */
.restore-badge-container {
    display: flex;
    align-items: center;
    margin-top: 8px;
}

.component-group-item--compact {
    padding: 16px !important;
}

.restore-step-2-card-wrapper {
}

.restore-step-2-card-wrapper .component-card--grouped {
    margin: 0;
}

.restore-step-2-card-wrapper .component-group-item {
    border-top: none !important;
}

/* Paso 3 password block */
.restore-password-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 32px 0;
    flex: 1;
    justify-content: center;
}

/* Footer / Actions */
.restore-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 16px;
    width: 100%;
}

.restore-footer-dots {
    display: flex;
    gap: 8px;
    align-items: center;
}

.restore-footer-dots .step-modal-dot {
    margin: 0;
}

.restore-footer-dots .step-modal-dot.disabled {
    pointer-events: none;
    opacity: 0.5;
}

@media (max-width: 768px) {
    .component-modal-box--restore-container {
        width: 100% !important;
        max-width: 95vw !important;
        max-height: 95vh;
        overflow-y: auto;
        padding: 20px !important;
        height: auto !important;
    }
    .restore-splitter {
        flex-direction: column;
        max-height: none;
        height: auto;
    }
    .restore-pane-left {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
    }
    .restore-pane-right {
        width: 100%;
    }
    .restore-footer-dots {
        position: static;
        transform: none;
    }
}
</style>

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
