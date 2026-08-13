<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Api\Services\Admin\AdminViewService;

$backupId = $_GET['uuid'] ?? ($_GET['id'] ?? '');

$adminViewService = new AdminViewService();
$restoreData = $adminViewService->getBackupsRestoreData($backupId);

if (!empty($restoreData['redirect'])) {
    header("Location: " . $restoreData['redirect']);
    exit;
}

extract($restoreData);

$schema = $metadata['schema'] ?? [];
$isFallback = $metadata['is_fallback'] ?? false;
?>

<div class="view-content" data-ref="admin-backup-restore-wrapper" data-backup-id="<?php echo htmlspecialchars($backupId); ?>">

    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_backups_restore_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="executeRestore" data-ref="btn-confirm-restore" data-tooltip="<?php echo __('btn_confirm_restore'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">settings_backup_restore</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">inventory_2</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('backup_restore_target_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('backup_restore_target_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <span class="component-badge" data-ref="restore-target-filename" data-backup-id="<?php echo htmlspecialchars($backupId); ?>">
                                <span class="material-symbols-rounded">database</span>
                                <?php echo htmlspecialchars($filename); ?>
                            </span>
                            <?php if ($isFallback): ?>
                                <span class="component-badge"><?php echo __('backup_restore_legacy_badge'); ?></span>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion" data-ref="restore-schema-accordion">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion" data-db="restore_schema_root">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">schema</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('backup_restore_schema_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('backup_restore_schema_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>

                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <script type="application/json" data-ref="restore-available-schema">
                                <?php echo json_encode($schema); ?>
                            </script>

                            <div class="component-list component-list--flush" data-ref="restore-schema-list">
                                <?php 
                                $dbEntries = array_keys($schema);
                                $dbCount = count($dbEntries);
                                $dbIdx = 0;
                                foreach ($schema as $dbName => $tables): 
                                    $totalTables = count($tables);
                                    $dbIdx++;
                                ?>
                                <div class="component-card--grouped component-accordion component-card--flush">
                                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion" data-db="<?php echo htmlspecialchars($dbName); ?>">
                                        <div class="component-card__content">
                                            <div class="component-card__text">
                                                <h2 class="component-card__title"><?php echo htmlspecialchars($dbName); ?></h2>
                                                <p class="component-card__description"><?php echo __('backup_restore_tables_available', ['count' => $totalTables]); ?></p>
                                            </div>
                                        </div>
                                        <div class="component-card__actions component-card__actions--end">
                                            <span class="component-badge component-badge--sm" data-badge="<?php echo htmlspecialchars($dbName); ?>">
                                                <?php echo __('backup_restore_tables_selected', ['selected' => $totalTables, 'total' => $totalTables]); ?>
                                            </span>
                                            <div data-action="preventAccordion">
                                                <label class="component-toggle-switch">
                                                    <input type="checkbox" class="restore-schema-db-cb" value="<?php echo htmlspecialchars($dbName); ?>" checked>
                                                    <span class="component-toggle-slider"></span>
                                                </label>
                                            </div>
                                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                                        </div>
                                    </div>

                                    <div class="component-accordion-body">
                                        <div class="component-accordion-content">
                                            <?php foreach ($tables as $tIndex => $table): ?>
                                                <?php if ($tIndex > 0): ?>
                                                    <hr class="component-divider">
                                                <?php endif; ?>
                                                <div class="component-group-item component-group-item--wrap">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title"><?php echo htmlspecialchars($table); ?></h2>
                                                            <p class="component-card__description"><?php echo __('backup_restore_table_desc', ['table' => htmlspecialchars($table)]); ?></p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--end">
                                                        <label class="component-toggle-switch">
                                                            <input type="checkbox" class="restore-schema-table-cb" data-db="<?php echo htmlspecialchars($dbName); ?>" value="<?php echo htmlspecialchars($table); ?>" checked>
                                                            <span class="component-toggle-slider"></span>
                                                        </label>
                                                    </div>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                                <?php if ($dbIdx < $dbCount): ?>
                                    <hr class="component-divider">
                                <?php endif; ?>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">warning</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('backup_restore_warning_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('backup_restore_warning_desc'); ?></p>
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
                                <h2 class="component-card__title"><?php echo __('backup_restore_lock_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('backup_restore_lock_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="toggle-restore-lock" data-action="toggleRestoreLock">
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
