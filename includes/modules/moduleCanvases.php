<?php 

$userPermissions = $_SESSION['user_permissions'] ?? [];
$canCreateCanvas = in_array('create_canvas', $userPermissions);
$canManageCanvases = in_array('manage_canvases', $userPermissions);
$canJoinCanvas = in_array('join_canvas', $userPermissions);
?>

<div class="component-module component-module--dropdown disabled" data-module="moduleCanvases">
    <div class="component-menu component-menu--w265 component-menu--h-auto active" data-menu="canvases-options">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-list">
            
            <?php if ($canCreateCanvas): ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/canvases/create">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">add_circle</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('lbl_create_canvas'); ?></span>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($canJoinCanvas): ?>
            <div class="component-menu-link component-menu-link--bordered nav-item" data-action="openJoinCanvasModal">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">group_add</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('lbl_join_canvas'); ?></span>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>
</div>