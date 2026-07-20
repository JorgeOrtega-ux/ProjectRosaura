<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;
use PDO;
$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo "<div class='view-content'><p>".__('err_unauthorized')."</p></div>";
    return;
}
$userPermissions = $_SESSION['user_permissions'] ?? [];
$isAdmin = in_array('manage_canvases', $userPermissions) || 
           in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $userPermissions) || 
           in_array(\App\Core\System\PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $userPermissions);

$limit = 25; 
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$offset = ($page - 1) * $limit;

$db = new DatabaseManager();
$connName = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
$pdo = $db->getConnection($connName); 

$tblCanvases = defined('App\Core\System\DatabaseConstants::TBL_CANVASES') ? App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';
if ($isAdmin) {
    $sqlCount = "SELECT COUNT(*) FROM {$tblCanvases} WHERE owner_id = :uid OR is_official = 1";
    $sqlSelect = "SELECT id, uuid, name, privacy, size, max_participants, created_at, is_official, favorites_count 
                  FROM {$tblCanvases} 
                  WHERE owner_id = :uid OR is_official = 1
                  ORDER BY id DESC 
                  LIMIT $limit OFFSET $offset";
} else {
    $sqlCount = "SELECT COUNT(*) FROM {$tblCanvases} WHERE owner_id = :uid";
    $sqlSelect = "SELECT id, uuid, name, privacy, size, max_participants, created_at, is_official, favorites_count 
                  FROM {$tblCanvases} 
                  WHERE owner_id = :uid 
                  ORDER BY id DESC 
                  LIMIT $limit OFFSET $offset";
}
$stmtCount = $pdo->prepare($sqlCount);
$stmtCount->execute(['uid' => $userId]);
$totalCanvases = (int)$stmtCount->fetchColumn();

$totalPages = ceil($totalCanvases / $limit);
if ($totalPages < 1) $totalPages = 1;
if ($page > $totalPages) {
    $page = $totalPages;
    $offset = ($page - 1) * $limit;
}
$stmt = $pdo->prepare($sqlSelect);
$stmt->execute(['uid' => $userId]);
$canvases = $stmt->fetchAll(PDO::FETCH_ASSOC);

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/canvases/manage?page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/canvases/manage?page=' . ($page + 1) : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex" data-ref="manage-canvases-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvases_manage_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-ref="btn-nav-resize" data-nav="" data-tooltip="<?php echo __('tooltip_resize_canvas'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">expand</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 disabled-interactive" data-ref="btn-nav-snapshots" data-nav="" data-tooltip="<?php echo __('tooltip_view_snapshots'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">collections</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-ref="btn-nav-resets" data-nav="" data-tooltip="<?php echo __('tooltip_manage_resets'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">update</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-ref="btn-nav-edit" data-nav="" data-tooltip="<?php echo __('tooltip_edit_canvas'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-ref="btn-nav-members" data-nav="" data-tooltip="<?php echo __('tooltip_manage_members'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">group</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-ref="btn-nav-roles" data-nav="" data-tooltip="<?php echo __('tooltip_manage_roles'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">shield_person</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-ref="btn-nav-invites" data-nav="" data-tooltip="<?php echo __('tooltip_manage_invites'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">link</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedCanvases" data-tooltip="<?php echo __('tooltip_delete_canvas'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="deselectCanvas" data-tooltip="<?php echo __('tooltip_cancel_selection'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="searchCanvas" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_canvas_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-inline-control" data-ref="pagination-container" data-tooltip="<?php echo __('pagination_tooltip', ['page' => $page, 'total' => $totalPages]); ?>" data-position="bottom">
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page <= 1 ? 'disabled-interactive' : ''; ?>" <?php echo $page > 1 ? 'data-nav="'.$prevPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                        </div>
                        <div class="component-inline-control__center"><?php echo $page; ?></div>
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page >= $totalPages ? 'disabled-interactive' : ''; ?>" <?php echo $page < $totalPages ? 'data-nav="'.$nextPageUrl.'"' : ''; ?>>
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
                        <input type="text" data-ref="canvas-search-input" placeholder="<?php echo __('search_canvas_placeholder'); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('table_header_canvas_name'); ?></th>
                            <th><?php echo __('table_header_type'); ?></th>
                            <th><?php echo __('table_header_privacy'); ?></th>
                            <th><?php echo __('table_header_size'); ?></th>
                            <th><?php echo __('table_header_limit'); ?></th>
                            <th><?php echo __('table_header_likes'); ?></th>
                            <th><?php echo __('table_header_registered'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($canvases): ?>
                            <?php foreach ($canvases as $canvas): ?>
                                <tr class="component-table-row" data-action="selectCanvas" data-canvas-id="<?php echo htmlspecialchars($canvas['id']); ?>" data-uuid="<?php echo htmlspecialchars($canvas['uuid']); ?>" data-size="<?php echo htmlspecialchars($canvas['size']); ?>">
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">palette</span>
                                                <span class="search-target font-medium"><?php echo htmlspecialchars($canvas['name']); ?></span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">category</span>
                                            <span class="search-target"><?php echo !empty($canvas['is_official']) ? __('canvas_official') : __('canvas_personal'); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded"><?php echo $canvas['privacy'] === 'public' ? 'public' : 'lock'; ?></span>
                                            <span class="search-target"><?php echo htmlspecialchars(ucfirst($canvas['privacy'])); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">aspect_ratio</span>
                                            <span class="search-target"><?php 
                                                $sizeVal = $canvas['size'] ?? '0';
                                                if ($sizeVal === 'infinite') {
                                                    echo 'Sin límites';
                                                } else {
                                                    echo htmlspecialchars(strpos($sizeVal, 'x') !== false ? $sizeVal : $sizeVal . 'x' . $sizeVal);
                                                }
                                            ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">groups</span>
                                            <span class="search-target"><?php echo htmlspecialchars($canvas['max_participants']); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">favorite</span>
                                            <span class="search-target"><?php echo htmlspecialchars($canvas['favorites_count']); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">calendar_month</span>
                                            <span><?php echo date('d/m/Y', strtotime($canvas['created_at'])); ?></span>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            
                            <tr class="disabled" data-ref="empty-search-table">
                                <td colspan="7" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_search_canvases'); ?></p>
                                    </div>
                                </td>
                            </tr>

                        <?php else: ?>
                            <tr>
                                <td colspan="7" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">palette</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_canvases_system'); ?></p>
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