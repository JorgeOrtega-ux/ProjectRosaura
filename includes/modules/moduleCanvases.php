<?php 
$isLoggedIn = isset($_SESSION['active_account']) && $_SESSION['active_account'] !== null;
$userPermissions = $_SESSION['user_permissions'] ?? [];
$canCreateCanvas = $isLoggedIn ? in_array('create_canvas', $userPermissions) : true;
$canManageCanvases = $isLoggedIn ? in_array('manage_canvases', $userPermissions) : true;
$canJoinCanvas = $isLoggedIn ? in_array('join_canvas', $userPermissions) : false;
$createUrl = APP_URL . '/canvases/create';
?>

<div class="component-module component-module--dropdown disabled" data-module="moduleCanvases">
    <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="canvases-options">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-list component-menu-list--scrollable">
            
            <?php if ($canCreateCanvas): ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo $createUrl; ?>">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">add_circle</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('lbl_create_canvas'); ?></span>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($canJoinCanvas): ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/canvases/join">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">group_add</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('lbl_join_canvas'); ?></span>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($canManageCanvases): ?>
            <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="<?php echo APP_URL; ?>/canvases/manage">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">dashboard</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('lbl_manage_canvases'); ?></span>
                </div>
            </div>
            <?php endif; ?>
            
        </div>
    </div>
</div>