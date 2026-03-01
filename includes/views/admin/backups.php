<?php
// includes/views/admin/backups.php
if (session_status() === PHP_SESSION_NONE) session_start();

$backups = [];
$backupDir = __DIR__ . '/../../../storage/backups/';

if (is_dir($backupDir)) {
    $files = scandir($backupDir);
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'sql') {
            $filepath = $backupDir . $file;
            $sizeBytes = filesize($filepath);
            
            $sizeFormatted = $sizeBytes >= 1048576 
                            ? round($sizeBytes / 1048576, 2) . ' MB' 
                            : round($sizeBytes / 1024, 2) . ' KB';
                            
            $backups[] = [
                'id' => base64_encode($file),
                'filename' => $file,
                'type' => strpos($file, 'auto_backup_') !== false ? 'auto' : 'manual',
                'status' => 'success',
                'size' => $sizeFormatted,
                'created_at' => date('Y-m-d H:i:s', filemtime($filepath))
            ];
        }
    }
    usort($backups, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });
}
?>

<div class="view-content">
    <div class="component-wrapper" data-ref="manage-backups-wrapper">
        
        <div class="component-sticky-toolbar">
            
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active" data-ref="toolbar-default-mode">
                    <div class="component-toolbar-left">
                        <div class="component-toolbar-title disabled" data-ref="toolbar-dynamic-title">
                            <?php echo __('admin_backups_title'); ?>
                        </div>
                        <button class="component-button component-button--icon component-button--h40" data-action="searchBackup" data-ref="btn-toggle-search" data-tooltip="Buscar" data-position="bottom">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-button component-button--icon component-button--h40" data-action="toggleBackupFilters" data-ref="btn-toggle-filters" data-tooltip="Filtros" data-position="bottom">
                                <span class="material-symbols-rounded">tune</span>
                            </button>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleBackupFilters">
                                
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <span class="component-menu-header-title">Filtros de búsqueda</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--compact">
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">settings</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Tipo de copia</span>
                                            </div>
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">chevron_right</span>
                                            </div>
                                        </div>
                                        
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterStatus">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">rule</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Estado</span>
                                            </div>
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">chevron_right</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterType">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                                <span class="material-symbols-rounded">arrow_back</span>
                                            </button>
                                            <span class="component-menu-header-title">Filtrar por Tipo</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="type" value="manual" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Manual</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="type" value="auto" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Automática</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterStatus">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                                <span class="material-symbols-rounded">arrow_back</span>
                                            </button>
                                            <span class="component-menu-header-title">Filtrar por Estado</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="status" value="success" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Completado</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="status" value="failed" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Fallido</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleViewMode" data-tooltip="Cambiar vista" data-position="bottom">
                            <span class="material-symbols-rounded">table_rows</span>
                        </button>
                        <button class="component-button component-button--h40" data-nav="/ProjectRosaura/admin/backups/automation">
                            <span class="material-symbols-rounded">schedule</span> Automatizar
                        </button>
                        <button class="component-button component-button--dark component-button--h40" data-action="createBackup">
                            <span class="material-symbols-rounded">add</span> Crear Copia
                        </button>
                    </div>
                </div>

                <div class="component-toolbar-mode disabled" data-ref="toolbar-selection-mode">
                    <div class="component-toolbar-left" style="align-items: center; gap: 12px;">
                        
                        <div class="component-input-group component-input-group--h40" style="width: 210px; margin-right: 8px;">
                            <input type="password" id="backup_action_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                            <label for="backup_action_password" class="component-input-label">Contraseña actual</label>
                            <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword" style="font-size: 18px; right: 8px;">visibility_off</span>
                        </div>

                        <button class="component-button component-button--icon component-button--h40" data-action="restoreSelectedBackup" data-tooltip="Restaurar copia" data-position="bottom">
                            <span class="material-symbols-rounded">settings_backup_restore</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedBackup" data-tooltip="Eliminar copia" data-position="bottom">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40" data-action="deselectBackup" data-tooltip="Cancelar selección" data-position="bottom">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>

            </div>

            <div class="component-toolbar-secondary" data-ref="secondary-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="backup-search-input" placeholder="Buscar por nombre de archivo...">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card" data-ref="manage-backups-header">
            <h1 class="component-page-title"><?php echo __('admin_backups_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_backups_desc'); ?></p>
        </div>

        <div class="component-list active" data-ref="view-cards">
            <?php if ($backups): ?>
                <?php foreach ($backups as $backup): ?>
                    <?php 
                        $displayType = $backup['type'] === 'manual' ? 'Manual' : 'Automática';
                        $displayStatus = $backup['status'] === 'success' ? 'Completado' : 'Fallido';
                        $statusIcon = $backup['status'] === 'success' ? 'check_circle' : 'error';
                        $statusColor = $backup['status'] === 'success' ? 'var(--color-success)' : 'var(--color-error)';
                    ?>
                    <div class="component-item-card backup-card-item" data-action="selectBackup" data-backup-id="<?php echo htmlspecialchars($backup['id']); ?>" data-type="<?php echo htmlspecialchars($backup['type']); ?>" data-status="<?php echo htmlspecialchars($backup['status']); ?>">
                        <div class="component-badge-list">
                            <div class="component-button--profile component-avatar--static" style="background: var(--bg-surface-alt); border: 1px solid var(--border-color);">
                                <span class="material-symbols-rounded" style="color: var(--text-primary);">database</span>
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">description</span>
                                <span class="search-target font-medium"><?php echo htmlspecialchars($backup['filename']); ?></span>
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">settings</span>
                                <span class="search-target"><?php echo $displayType; ?></span>
                            </div>

                            <div class="component-badge">
                                <span class="material-symbols-rounded" style="color: <?php echo $statusColor; ?>;"><?php echo $statusIcon; ?></span>
                                <span class="search-target"><?php echo $displayStatus; ?></span>
                            </div>

                            <div class="component-badge">
                                <span class="material-symbols-rounded">hard_drive</span>
                                <span class="search-target"><?php echo htmlspecialchars($backup['size']); ?></span>
                            </div>

                            <div class="component-badge">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span><?php echo date('d/m/Y H:i', strtotime($backup['created_at'])); ?></span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
                
                <div class="component-empty-state disabled" data-ref="empty-search-cards">
                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                    <p class="component-empty-state-text">No se encontraron copias de seguridad para tu búsqueda/filtro.</p>
                </div>

            <?php else: ?>
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">cloud_off</span>
                    <p class="component-empty-state-text">No hay copias de seguridad registradas en el sistema.</p>
                </div>
            <?php endif; ?>
        </div>

        <div class="component-table-wrapper disabled" data-ref="view-table">
            <table class="component-table">
                <thead>
                    <tr>
                        <th>Archivo</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Tamaño</th>
                        <th>Fecha de Creación</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($backups): ?>
                        <?php foreach ($backups as $backup): ?>
                            <?php 
                                $displayType = $backup['type'] === 'manual' ? 'Manual' : 'Automática';
                                $displayStatus = $backup['status'] === 'success' ? 'Completado' : 'Fallido';
                                $statusIcon = $backup['status'] === 'success' ? 'check_circle' : 'error';
                                $statusColor = $backup['status'] === 'success' ? 'var(--color-success)' : 'var(--color-error)';
                            ?>
                            <tr class="backup-card-item" data-action="selectBackup" data-backup-id="<?php echo htmlspecialchars($backup['id']); ?>" data-type="<?php echo htmlspecialchars($backup['type']); ?>" data-status="<?php echo htmlspecialchars($backup['status']); ?>">
                                <td>
                                    <div class="td-user-info">
                                        <div class="component-button--profile component-avatar--static-sm" style="background: var(--bg-surface-alt); border: 1px solid var(--border-color);">
                                            <span class="material-symbols-rounded" style="color: var(--text-primary); font-size: 16px;">database</span>
                                        </div>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">description</span>
                                            <span class="search-target font-medium"><?php echo htmlspecialchars($backup['filename']); ?></span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">settings</span>
                                        <span class="search-target"><?php echo $displayType; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded" style="color: <?php echo $statusColor; ?>;"><?php echo $statusIcon; ?></span>
                                        <span class="search-target"><?php echo $displayStatus; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">hard_drive</span>
                                        <span class="search-target"><?php echo htmlspecialchars($backup['size']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span><?php echo date('d/m/Y H:i', strtotime($backup['created_at'])); ?></span>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        
                        <tr class="disabled" data-ref="empty-search-table">
                            <td colspan="5" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                    <p class="component-empty-state-text">No se encontraron copias de seguridad para tu búsqueda/filtro.</p>
                                </div>
                            </td>
                        </tr>

                    <?php else: ?>
                        <tr>
                            <td colspan="5" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">cloud_off</span>
                                    <p class="component-empty-state-text">No hay copias de seguridad registradas en el sistema.</p>
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

    </div>
</div>