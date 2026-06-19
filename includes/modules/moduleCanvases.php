<?php 
// includes/modules/moduleCanvases.php

$userPermissions = $_SESSION['user_permissions'] ?? [];
$canCreateCanvas = in_array('create_canvas', $userPermissions);
$canManageCanvases = in_array('manage_canvases', $userPermissions);
$canJoinCanvas = in_array('join_canvas', $userPermissions);
?>

<div class="component-module component-module--dropdown disabled" data-module="moduleCanvases">
    <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="canvases-options">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-list component-menu-list--scrollable">
            
            <?php if ($canCreateCanvas): ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/canvases/create">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">add_circle</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Crear nuevo lienzo</span>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($canManageCanvases): ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/canvases/manage">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">dashboard</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Administrar mis lienzos</span>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($canJoinCanvas): ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/canvases/join">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">group_add</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Unirme a un lienzo</span>
                </div>
            </div>
            <?php endif; ?>
            
        </div>
    </div>
</div>