<?php
// includes/views/admin/backups/backups-restore.php
if (session_status() === PHP_SESSION_NONE) session_start();

$backupId = isset($_GET['id']) ? $_GET['id'] : '';
$filename = base64_decode($backupId);
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
                
                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full component-card__content--start">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">warning</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('warning_critical_action'); ?></h2>
                                <p class="component-card__description"><?php echo __('msg_restore_warning_data_loss'); ?></p>
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
                                <h2 class="component-card__title"><?php echo __('lbl_backup_to_restore'); ?></h2>
                                <p class="component-card__description font-medium" data-ref="restore-target-filename" data-backup-id="<?php echo htmlspecialchars($backupId); ?>">
                                    <?php echo htmlspecialchars($filename); ?>
                                </p>
                                <div class="component-badge component-badge--sm mt-2">
                                    <span class="material-symbols-rounded">info</span>
                                    <span><?php echo __('restore_package_info'); ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">lock_open</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_unlock_restore_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_unlock_restore_desc'); ?></p>
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