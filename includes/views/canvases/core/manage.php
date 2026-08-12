<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$manageData = $canvasService->getCanvasManageData(isset($_GET['page']) ? (int)$_GET['page'] : 1);

if (!empty($manageData['unauthorized'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

$canvases = $manageData['canvases'];
$totalCanvases = $manageData['totalItems'];
$totalPages = $manageData['totalPages'];
$page = $manageData['page'];
$isAdmin = $manageData['isAdmin'];
$hasAdvancedRoles = $manageData['hasAdvancedRoles'];
$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/canvases/manage?page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/canvases/manage?page=' . ($page + 1) : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-canvases-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvases_manage_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-ref="btn-nav-edit" data-nav="" data-tooltip="<?php echo __('tooltip_edit_canvas'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedCanvases" data-ref="btn-action-delete" data-tooltip="<?php echo __('tooltip_delete_canvas'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="manage-selection-more-menu" data-tooltip="<?php echo __('tooltip_options'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed disabled" data-module="manage-selection-more-menu">
                            <div class="component-menu component-menu--w265">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <button type="button" class="component-menu-link" data-ref="btn-nav-resize" data-nav="">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">expand</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tooltip_resize_canvas'); ?></span></div>
                                    </button>

                                    <button type="button" class="component-menu-link" data-ref="btn-nav-resets" data-nav="">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">update</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tooltip_manage_resets'); ?></span></div>
                                    </button>

                                    <button type="button" class="component-menu-link disabled-interaction" data-ref="btn-nav-snapshots" data-nav="">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">collections</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tooltip_view_capturas'); ?></span></div>
                                    </button>

                                    <button type="button" class="component-menu-link" data-action="createSnapshotSelected" data-ref="btn-action-create-snapshot">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">photo_camera</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('btn_create_captura'); ?></span></div>
                                    </button>

                                    <button type="button" class="component-menu-link" data-ref="btn-nav-members" data-nav="">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">group</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tooltip_manage_members'); ?></span></div>
                                    </button>

                                    <button type="button" class="component-menu-link" data-ref="btn-nav-sanctions" data-nav="">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tooltip_manage_sanctions'); ?></span></div>
                                    </button>

                                    <?php
                                        $rolesLock = \App\Core\System\SubscriptionFeatureConfig::getLockDetails($manageData['userTier'] ?? 0, 'feat_advanced_roles', 'link');
                                    ?>
                                    <button type="button" class="component-menu-link <?php echo $rolesLock['class']; ?>" data-ref="btn-nav-roles" data-nav="" <?php echo $rolesLock['attributes']; ?>>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">shield_person</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tooltip_manage_roles'); ?></span><?php echo $rolesLock['badge_html']; ?></div>
                                    </button>

                                    <button type="button" class="component-menu-link" data-ref="btn-nav-invites" data-nav="">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">link</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tooltip_manage_invites'); ?></span></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="searchCanvas" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_canvas_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

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
                            <th>Rol</th>
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
                                <?php
                                $isOwner = isset($canvas['owner_id']) && $canvas['owner_id'] == $userId ? 1 : 0;
                                $userPerms = json_encode($canvas['user_permissions'] ?? []);
                                ?>
                                <tr class="component-table-row" data-action="selectCanvas" data-canvas-id="<?php echo htmlspecialchars($canvas['id']); ?>" data-uuid="<?php echo htmlspecialchars($canvas['uuid']); ?>" data-size="<?php echo htmlspecialchars($canvas['size']); ?>" data-is-owner="<?php echo $isOwner; ?>" data-user-permissions="<?php echo htmlspecialchars($userPerms); ?>">
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">palette</span>
                                                <span class="search-target"><?php echo htmlspecialchars($canvas['name']); ?></span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <?php if ($isOwner): ?>
                                            <div class="component-badge component-badge--sm component-badge--primary">
                                                <span>Propietario</span>
                                            </div>
                                        <?php else: ?>
                                            <div class="component-badge component-badge--sm component-badge--secondary">
                                                <span><?php echo htmlspecialchars($canvas['user_role_name'] ?? 'Colaborador'); ?></span>
                                            </div>
                                        <?php endif; ?>
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
                                                $sizeVal = $canvas['size'] ?? '64x64';
                                                echo htmlspecialchars(strpos($sizeVal, 'x') !== false ? $sizeVal : $sizeVal . 'x' . $sizeVal);
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