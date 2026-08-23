<?php
use App\Api\Services\Admin\AdminViewService;

$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$typesFilter = isset($_GET['types']) && $_GET['types'] !== '' ? explode(',', $_GET['types']) : [];
$statusFilter = isset($_GET['status']) && $_GET['status'] !== '' ? explode(',', $_GET['status']) : [];

$adminService = new AdminViewService();
$backupsData = $adminService->getBackupsData($_GET['q'] ?? null, $page, $typesFilter, $statusFilter);

extract($backupsData);

$userPerms = $_SESSION['user_permissions'] ?? [];
$canCreate = in_array('create_backups', $userPerms);
$canRestore = in_array('restore_backups', $userPerms);
$pagedBackups = $backups;

$queryParams = $_GET;
unset($queryParams['url'], $queryParams['page']);
$queryString = !empty($queryParams) ? '&' . http_build_query($queryParams) : '';

$prevPageUrl = $page > 1 ? $appUrl . '/admin/backups?page=' . ($page - 1) . $queryString : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/backups?page=' . ($page + 1) . $queryString : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-backups-wrapper">
        
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
                </div>

                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="searchBackup" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_backup_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleBackupFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown disabled" data-module="moduleBackupFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="material-symbols-rounded">filter_list</span>
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list">
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
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php 
                                    $checkedTypes = empty($typesFilter) ? ['manual', 'auto'] : $typesFilter;
                                    ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="type" value="manual" <?php echo in_array('manual', $checkedTypes) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('backup_type_manual'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="type" value="auto" <?php echo in_array('auto', $checkedTypes) ? 'checked' : ''; ?>></div>
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
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php 
                                    $checkedStatuses = empty($statusFilter) ? ['success', 'failed'] : $statusFilter;
                                    ?>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="success" <?php echo in_array('success', $checkedStatuses) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_completed'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="status" value="failed" <?php echo in_array('failed', $checkedStatuses) ? 'checked' : ''; ?>></div>
                                        <div class="component-menu-link-text"><span><?php echo __('status_failed'); ?></span></div>
                                    </label>
                                </div>
                            </div>

                        </div>
                    </div>

                    <?php if ($canCreate): ?>
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/backup-schedule" data-tooltip="<?php echo __('btn_automate'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">schedule</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/backup-create" data-tooltip="<?php echo __('btn_create_backup'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                    <?php endif; ?>

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
                        <input type="text" data-ref="backup-search-input" placeholder="<?php echo __('search_backup_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
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
                                                <span class="search-target"><?php echo htmlspecialchars($backup['filename']); ?></span>
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
                                <td colspan="5" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_search_backups'); ?></p>
                                    </div>
                                </td>
                            </tr>

                        <?php else: ?>
                            <tr>
                                <td colspan="5" class="component-empty-table-cell">
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