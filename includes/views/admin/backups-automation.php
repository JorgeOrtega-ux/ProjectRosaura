<?php
// includes/views/admin/backups-automation.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content view-fade-in">
    <div class="component-wrapper component-wrapper--admin-centered">
        
        <div class="component-toolbar-mode active">
            <div class="component-toolbar-left">
                <button class="component-button component-button--icon component-button--h40" data-nav="/ProjectRosaura/admin/backups" data-tooltip="Volver a copias" data-position="bottom">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
            </div>
        </div>

        <div class="component-header-card component-header-card--compact">
            <h1 class="component-page-title"><?php echo __('admin_backups_auto_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_backups_auto_desc'); ?></p>
        </div>

        <div class="component-list">
            
            <div class="component-item-card component-item-card--setting">
                <div class="component-item-card-left">
                    <span class="component-item-card-icon material-symbols-rounded">power_settings_new</span>
                    <div class="component-item-card-texts">
                        <span class="component-item-card-title"><?php echo __('auto_backup_enabled_title'); ?></span>
                        <span class="component-item-card-desc"><?php echo __('auto_backup_enabled_desc'); ?></span>
                    </div>
                </div>
                <div class="component-item-card-right">
                    <label class="component-toggle">
                        <input type="checkbox" id="toggle-auto-backup">
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="component-item-card component-item-card--setting component-item-card--expanded" id="wrapper-auto-options">
                <div class="component-form-group-list">
                    
                    <div class="component-form-group">
                        <label class="component-form-label"><?php echo __('auto_backup_freq_title'); ?></label>
                        <p class="component-form-desc"><?php echo __('auto_backup_freq_desc'); ?></p>
                        <div class="component-input-with-icon">
                            <span class="material-symbols-rounded">update</span>
                            <input type="number" id="input-auto-freq" class="component-input" min="1" max="720" placeholder="Ej. 24">
                        </div>
                    </div>

                    <div class="component-form-group">
                        <label class="component-form-label"><?php echo __('auto_backup_retention_title'); ?></label>
                        <p class="component-form-desc"><?php echo __('auto_backup_retention_desc'); ?></p>
                        <div class="component-input-with-icon">
                            <span class="material-symbols-rounded">inventory_2</span>
                            <input type="number" id="input-auto-retention" class="component-input" min="1" max="50" placeholder="Ej. 5">
                        </div>
                    </div>

                </div>
            </div>

            <div class="component-actions component-actions--end component-actions--mt20">
                <button class="component-button component-button--dark component-button--h40" id="btn-save-auto-backup">
                    Guardar Configuración
                </button>
            </div>

        </div>

    </div>
</div>