<?php
// includes/views/admin/logs.php
if (session_status() === PHP_SESSION_NONE) session_start();

$logFiles = [];
$logBaseDir = __DIR__ . '/../../../logs/';

if (is_dir($logBaseDir)) {
    // Buscamos dentro de las carpetas de log conocidas
    $categories = array_diff(scandir($logBaseDir), ['.', '..', '.htaccess', '.gitkeep']);
    
    foreach ($categories as $category) {
        $catDir = $logBaseDir . $category;
        if (is_dir($catDir)) {
            $files = array_diff(scandir($catDir), ['.', '..', '.htaccess', '.gitkeep']);
            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'log') {
                    $filepath = $catDir . '/' . $file;
                    $sizeBytes = filesize($filepath);
                    
                    $sizeFormatted = $sizeBytes >= 1048576 
                                    ? round($sizeBytes / 1048576, 2) . ' MB' 
                                    : round($sizeBytes / 1024, 2) . ' KB';
                                    
                    $logFiles[] = [
                        'id' => base64_encode($category . '/' . $file),
                        'filename' => $file,
                        'category' => $category,
                        'size' => $sizeFormatted,
                        'modified_at' => date('Y-m-d H:i:s', filemtime($filepath))
                    ];
                }
            }
        }
    }
    // Ordenar de más reciente a más antiguo
    usort($logFiles, function($a, $b) {
        return strtotime($b['modified_at']) - strtotime($a['modified_at']);
    });
}
?>

<div class="view-content">
    <div class="component-wrapper" data-ref="manage-logs-wrapper" style="position: relative;">
        
        <div class="component-sticky-toolbar">
            
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active" data-ref="toolbar-default-mode">
                    <div class="component-toolbar-left">
                        <div class="component-toolbar-title disabled" data-ref="toolbar-dynamic-title">
                            <?php echo __('admin_logs_title'); ?>
                        </div>
                        <button class="component-button component-button--icon component-button--h40" data-action="searchLog" data-ref="btn-toggle-search" data-tooltip="Buscar" data-position="bottom">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-button component-button--icon component-button--h40" data-action="toggleLogFilters" data-ref="btn-toggle-filters" data-tooltip="Filtros" data-position="bottom">
                                <span class="material-symbols-rounded">tune</span>
                            </button>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleLogFilters">
                                
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <span class="component-menu-header-title">Filtros de búsqueda</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--compact">
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterCategory">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">category</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Categoría de log</span>
                                            </div>
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">chevron_right</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterCategory">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                                <span class="material-symbols-rounded">arrow_back</span>
                                            </button>
                                            <span class="component-menu-header-title">Filtrar por Categoría</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="category" value="app" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>App (General)</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="category" value="database" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Database</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="category" value="security" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Security</span>
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
                    </div>
                </div>

                <div class="component-toolbar-mode disabled" data-ref="toolbar-selection-mode">
                    <div class="component-toolbar-left" style="align-items: center; gap: 12px;">
                        <button class="component-button component-button--icon component-button--h40" data-action="viewSelectedLog" data-tooltip="Visualizar archivo" data-position="bottom">
                            <span class="material-symbols-rounded">visibility</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedLog" data-tooltip="Eliminar archivo" data-position="bottom">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40" data-action="deselectLog" data-tooltip="Cancelar selección" data-position="bottom">
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
                        <input type="text" data-ref="log-search-input" placeholder="Buscar por nombre de archivo o fecha...">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card" data-ref="manage-logs-header">
            <h1 class="component-page-title"><?php echo __('admin_logs_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_logs_desc'); ?></p>
        </div>

        <div class="component-list active" data-ref="view-cards">
            <?php if ($logFiles): ?>
                <?php foreach ($logFiles as $log): ?>
                    <?php 
                        $catIcon = 'description';
                        $catColor = 'var(--text-secondary)';
                        if ($log['category'] === 'security') { $catIcon = 'security'; $catColor = 'var(--color-error)'; }
                        if ($log['category'] === 'database') { $catIcon = 'database'; $catColor = 'var(--color-toast-info)'; }
                    ?>
                    <div class="component-item-card log-card-item" data-action="selectLog" data-log-id="<?php echo htmlspecialchars($log['id']); ?>" data-category="<?php echo htmlspecialchars($log['category']); ?>">
                        <div class="component-badge-list">
                            <div class="component-button--profile component-avatar--static" style="background: var(--bg-surface-alt); border: 1px solid var(--border-color);">
                                <span class="material-symbols-rounded" style="color: <?php echo $catColor; ?>;"><?php echo $catIcon; ?></span>
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">draft</span>
                                <span class="search-target font-medium"><?php echo htmlspecialchars($log['filename']); ?></span>
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">folder_open</span>
                                <span class="search-target" style="text-transform: capitalize;"><?php echo htmlspecialchars($log['category']); ?></span>
                            </div>

                            <div class="component-badge">
                                <span class="material-symbols-rounded">hard_drive</span>
                                <span class="search-target"><?php echo htmlspecialchars($log['size']); ?></span>
                            </div>

                            <div class="component-badge">
                                <span class="material-symbols-rounded">schedule</span>
                                <span class="search-target"><?php echo date('d/m/Y H:i', strtotime($log['modified_at'])); ?></span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
                
                <div class="component-empty-state disabled" data-ref="empty-search-cards">
                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                    <p class="component-empty-state-text">No se encontraron archivos de log para tu búsqueda/filtro.</p>
                </div>

            <?php else: ?>
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">folder_off</span>
                    <p class="component-empty-state-text">No hay archivos de registro en el servidor.</p>
                </div>
            <?php endif; ?>
        </div>

        <div class="component-table-wrapper disabled" data-ref="view-table">
            <table class="component-table">
                <thead>
                    <tr>
                        <th>Archivo</th>
                        <th>Categoría</th>
                        <th>Tamaño</th>
                        <th>Última modificación</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($logFiles): ?>
                        <?php foreach ($logFiles as $log): ?>
                            <?php 
                                $catIcon = 'description';
                                $catColor = 'var(--text-secondary)';
                                if ($log['category'] === 'security') { $catIcon = 'security'; $catColor = 'var(--color-error)'; }
                                if ($log['category'] === 'database') { $catIcon = 'database'; $catColor = 'var(--color-toast-info)'; }
                            ?>
                            <tr class="log-card-item" data-action="selectLog" data-log-id="<?php echo htmlspecialchars($log['id']); ?>" data-category="<?php echo htmlspecialchars($log['category']); ?>">
                                <td>
                                    <div class="td-user-info">
                                        <div class="component-button--profile component-avatar--static-sm" style="background: var(--bg-surface-alt); border: 1px solid var(--border-color);">
                                            <span class="material-symbols-rounded" style="color: <?php echo $catColor; ?>; font-size: 16px;"><?php echo $catIcon; ?></span>
                                        </div>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">draft</span>
                                            <span class="search-target font-medium"><?php echo htmlspecialchars($log['filename']); ?></span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">folder_open</span>
                                        <span class="search-target" style="text-transform: capitalize;"><?php echo htmlspecialchars($log['category']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">hard_drive</span>
                                        <span class="search-target"><?php echo htmlspecialchars($log['size']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">schedule</span>
                                        <span class="search-target"><?php echo date('d/m/Y H:i', strtotime($log['modified_at'])); ?></span>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        
                        <tr class="disabled" data-ref="empty-search-table">
                            <td colspan="4" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                    <p class="component-empty-state-text">No se encontraron archivos de log para tu búsqueda/filtro.</p>
                                </div>
                            </td>
                        </tr>

                    <?php else: ?>
                        <tr>
                            <td colspan="4" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">folder_off</span>
                                    <p class="component-empty-state-text">No hay archivos de registro en el servidor.</p>
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

    </div>
</div>