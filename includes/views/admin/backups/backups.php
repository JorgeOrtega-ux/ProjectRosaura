<?php
// includes/views/admin/backups/backups.php
if (session_status() === PHP_SESSION_NONE) session_start();

$userPerms = $_SESSION['user_permissions'] ?? [];
$canCreate = in_array('create_backups', $userPerms);
$canRestore = in_array('restore_backups', $userPerms);

$backups = [];
$backupDir = ROOT_PATH . '/storage/backups/';

if (is_dir($backupDir)) {
    $files = scandir($backupDir);
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'enc') {
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

$limit = 25; 
$totalBackups = count($backups);
$totalPages = ceil($totalBackups / $limit);
if ($totalPages < 1) $totalPages = 1;

$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
if ($page > $totalPages) $page = $totalPages;

$offset = ($page - 1) * $limit;
$pagedBackups = array_slice($backups, $offset, $limit);

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/admin/backups?page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/backups?page=' . ($page + 1) : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex" data-ref="manage-backups-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_backups_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <?php if ($canRestore): ?>
                    <button class="component-button component-button--icon component-button--h40" data-action="prepareRestore" data-tooltip="<?php echo __('tooltip_restore_backup'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">settings_backup_restore</span>
                    </button>
                    <?php endif; ?>

                    <button class="component-button component-button--icon component-button--h40" data-action="deselectBackup" data-tooltip="<?php echo __('tooltip_cancel_selection'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="searchBackup" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_backup_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleBackupFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleBackupFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">settings</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_backup_type'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterStatus">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">rule</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_status'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
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
                                        <span class="component-menu-header-title"><?php echo __('filter_by_type'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="type" value="manual" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('backup_type_manual'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="type" value="auto" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('backup_type_auto'); ?></span></div>
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
                                        <span class="component-menu-header-title"><?php echo __('filter_by_status'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="success" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_completed'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="failed" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_failed'); ?></span></div>
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

                    <?php if ($canCreate): ?>
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/backups/automation" data-tooltip="<?php echo __('btn_automate'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">schedule</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/backups/create" data-tooltip="<?php echo __('btn_create_backup'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                    <?php endif; ?>
                    
                </div>
            </div>

            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="backup-search-input" placeholder="<?php echo __('search_backup_placeholder'); ?>">
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
                            <th class="hide-mobile"><?php echo __('table_header_content'); ?></th>
                            <th><?php echo __('table_header_type'); ?></th>
                            <th><?php echo __('table_header_status'); ?></th>
                            <th><?php echo __('table_header_size'); ?></th>
                            <th><?php echo __('table_header_date'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($pagedBackups): ?>
                            <?php foreach ($pagedBackups as $backup): ?>
                                <?php 
                                    $displayType = $backup['type'] === 'manual' ? __('backup_type_manual') : __('backup_type_auto');
                                    $displayStatus = $backup['status'] === 'success' ? __('status_completed') : __('status_failed');
                                    $statusIcon = $backup['status'] === 'success' ? 'check_circle' : 'error';
                                ?>
                                <tr class="component-table-row" data-action="selectBackup" data-backup-id="<?php echo htmlspecialchars($backup['id']); ?>" data-type="<?php echo htmlspecialchars($backup['type']); ?>" data-status="<?php echo htmlspecialchars($backup['status']); ?>">
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-button--profile component-avatar--static-sm">
                                                <span class="material-symbols-rounded">inventory_2</span>
                                            </div>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">lock</span>
                                                <span class="search-target font-medium"><?php echo htmlspecialchars($backup['filename']); ?></span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="hide-mobile">
                                        <div style="display: flex; gap: 4px;">
                                            <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);" title="<?php echo __('title_database'); ?>">database</span>
                                            <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);" title="<?php echo __('title_physical_files'); ?>">folder_zip</span>
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
                                            <span class="material-symbols-rounded"><?php echo $statusIcon; ?></span>
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
                                <td colspan="6" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_search_backups'); ?></p>
                                    </div>
                                </td>
                            </tr>

                        <?php else: ?>
                            <tr>
                                <td colspan="6" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">cloud_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_backups_system'); ?></p>
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