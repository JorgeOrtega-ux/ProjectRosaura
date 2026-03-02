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
    <div class="component-wrapper" data-ref="manage-logs-wrapper">
        
        <div class="component-sticky-toolbar">
            
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active" data-ref="toolbar-default-mode">
                    <div class="component-toolbar-left">
                        <div class="component-toolbar-title disabled" data-ref="toolbar-dynamic-title">
                            <?php echo __('admin_logs_title'); ?>
                        </div>
                        <button class="component-button component-button--icon component-button--h40" data-action="searchLog" data-ref="btn-toggle-search" data-tooltip="<?php echo __('tooltip_search'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-button component-button--icon component-button--h40" data-action="toggleLogFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded">tune</span>
                            </button>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleLogFilters">
                                
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--compact">
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterCategory">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">category</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('filter_log_category'); ?></span>
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
                                            <span class="component-menu-header-title"><?php echo __('filter_by_category'); ?></span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="category" value="app" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('log_category_app'); ?></span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="category" value="database" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('log_category_database'); ?></span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="category" value="security" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('log_category_security'); ?></span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleViewMode" data-tooltip="<?php echo __('tooltip_change_view'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">table_rows</span>
                        </button>
                    </div>
                </div>

                <div class="component-toolbar-mode disabled" data-ref="toolbar-selection-mode">
                    <div class="component-toolbar-left">
                        <span id="logs-selection-count" class="component-badge component-badge--sm"><?php echo __('logs_selected_count'); ?></span>
                        
                        <button class="component-button component-button--icon component-button--h40" data-action="viewSelectedLogs" data-tooltip="<?php echo __('tooltip_view_files'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">visibility</span>
                        </button>
                        
                        <div class="component-input-group component-input-group--h40">
                            <input type="password" id="log_action_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                            <label for="log_action_password" class="component-input-label"><?php echo __('lbl_admin_password'); ?></label>
                            <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                        </div>

                        <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedLogs" data-tooltip="<?php echo __('tooltip_delete_selected'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40" data-action="deselectLog" data-tooltip="<?php echo __('tooltip_cancel_selection'); ?>" data-position="bottom">
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
                        <input type="text" data-ref="log-search-input" placeholder="<?php echo __('search_log_placeholder'); ?>">
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
                        if ($log['category'] === 'security') { $catIcon = 'security'; }
                        if ($log['category'] === 'database') { $catIcon = 'database'; }
                    ?>
                    <div class="component-item-card log-card-item" data-action="selectLog" data-log-id="<?php echo htmlspecialchars($log['id']); ?>" data-category="<?php echo htmlspecialchars($log['category']); ?>">
                        <div class="component-badge-list">
                            <div class="component-button--profile component-avatar--static">
                                <span class="material-symbols-rounded"><?php echo $catIcon; ?></span>
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">draft</span>
                                <span class="search-target font-medium"><?php echo htmlspecialchars($log['filename']); ?></span>
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">folder_open</span>
                                <span class="search-target"><?php echo htmlspecialchars($log['category']); ?></span>
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
                    <p class="component-empty-state-text"><?php echo __('empty_search_logs'); ?></p>
                </div>

            <?php else: ?>
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">folder_off</span>
                    <p class="component-empty-state-text"><?php echo __('empty_logs_system'); ?></p>
                </div>
            <?php endif; ?>
        </div>

        <div class="component-table-wrapper disabled" data-ref="view-table">
            <table class="component-table">
                <thead>
                    <tr>
                        <th><?php echo __('table_header_file'); ?></th>
                        <th><?php echo __('table_header_category'); ?></th>
                        <th><?php echo __('table_header_size'); ?></th>
                        <th><?php echo __('table_header_modified'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($logFiles): ?>
                        <?php foreach ($logFiles as $log): ?>
                            <?php 
                                $catIcon = 'description';
                                if ($log['category'] === 'security') { $catIcon = 'security'; }
                                if ($log['category'] === 'database') { $catIcon = 'database'; }
                            ?>
                            <tr class="log-card-item" data-action="selectLog" data-log-id="<?php echo htmlspecialchars($log['id']); ?>" data-category="<?php echo htmlspecialchars($log['category']); ?>">
                                <td>
                                    <div class="td-user-info">
                                        <div class="component-button--profile component-avatar--static-sm">
                                            <span class="material-symbols-rounded"><?php echo $catIcon; ?></span>
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
                                        <span class="search-target"><?php echo htmlspecialchars($log['category']); ?></span>
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
                                    <p class="component-empty-state-text"><?php echo __('empty_search_logs'); ?></p>
                                </div>
                            </td>
                        </tr>

                    <?php else: ?>
                        <tr>
                            <td colspan="4" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">folder_off</span>
                                    <p class="component-empty-state-text"><?php echo __('empty_logs_system'); ?></p>
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

    </div>
</div>