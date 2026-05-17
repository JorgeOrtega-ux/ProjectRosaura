<?php
// includes/views/admin/logs/logs.php
if (session_status() === PHP_SESSION_NONE) session_start();

$logFiles = [];
$logBaseDir = ROOT_PATH . '/logs/';

if (is_dir($logBaseDir)) {
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
    usort($logFiles, function($a, $b) {
        return strtotime($b['modified_at']) - strtotime($a['modified_at']);
    });
}

// Lógica de Paginación Estandarizada
$limit = 25; 
$totalLogs = count($logFiles);
$totalPages = ceil($totalLogs / $limit);
if ($totalPages < 1) $totalPages = 1;

$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
if ($page > $totalPages) $page = $totalPages;

$offset = ($page - 1) * $limit;

// Cortamos el array para mostrar solo la página actual
$pagedLogs = array_slice($logFiles, $offset, $limit);

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/admin/logs?page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/logs?page=' . ($page + 1) : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex" data-ref="manage-logs-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_logs_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="viewSelectedLogs" data-tooltip="<?php echo __('tooltip_view_files'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">visibility</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="deselectLog" data-tooltip="<?php echo __('tooltip_cancel_selection'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="searchLog" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_log_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleLogFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleLogFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterCategory">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_log_category'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
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
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="app" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('log_category_app'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="database" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('log_category_database'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="category" value="security" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('log_category_security'); ?></span></div>
                                    </label>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="component-inline-control" data-ref="pagination-container" data-tooltip="<?php echo __('pagination_tooltip', ['page' => $page, 'total' => $totalPages]); ?>" data-position="bottom">
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page <= 1 ? 'disabled-interaction' : ''; ?>" <?php echo $page > 1 ? 'data-nav="'.$prevPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                        </div>
                        <div class="component-inline-control__center"><?php echo $page; ?></div>
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page >= $totalPages ? 'disabled-interaction' : ''; ?>" <?php echo $page < $totalPages ? 'data-nav="'.$nextPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_right</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
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

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
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
                        <?php if ($pagedLogs): ?>
                            <?php foreach ($pagedLogs as $log): ?>
                                <?php 
                                    $catIcon = 'description';
                                    if ($log['category'] === 'security') { $catIcon = 'security'; }
                                    if ($log['category'] === 'database') { $catIcon = 'database'; }
                                ?>
                                <tr class="component-table-row" data-action="selectLog" data-log-id="<?php echo htmlspecialchars($log['id']); ?>" data-category="<?php echo htmlspecialchars($log['category']); ?>">
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
</div>