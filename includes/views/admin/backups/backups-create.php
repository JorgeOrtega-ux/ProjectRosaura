<?php
// includes/views/admin/backups/backups-create.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content" data-ref="custom-backup-wrapper">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_backups_create_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="executeCustomBackup" data-ref="btn-confirm-custom" data-tooltip="<?php echo __('btn_start_backup'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">backup</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion" data-db="modules_settings">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('backup_modules_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('backup_modules_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded">database</span>
                                    </div>
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('backup_db_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('backup_db_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="cb-module-db" checked>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded">folder_shared</span>
                                    </div>
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('backup_uploaded_avatars_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('backup_uploaded_avatars_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="cb-module-uploaded">
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded">folder_special</span>
                                    </div>
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('backup_default_avatars_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('backup_default_avatars_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="cb-module-default">
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion mt-4">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion" data-db="backup_schema_root">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('auto_backup_schema_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('auto_backup_schema_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div data-ref="custom-schema-container"></div>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    </div>
</div>