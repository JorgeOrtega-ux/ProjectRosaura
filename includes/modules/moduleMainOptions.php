<?php 
// includes/modules/moduleMainOptions.php
$isLoggedIn = isset($_SESSION['user_id']);
?>
<div class="component-module component-module--dropdown disabled" data-module="moduleMainOptions">
    <div class="component-menu component-menu--w265 component-menu--h-auto">
        
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-list">
            <div class="component-menu-link">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">settings</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Configuración</span>
                </div>
            </div>
            <div class="component-menu-link">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">help</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Ayuda y comentarios</span>
                </div>
            </div>
            
            <?php if ($isLoggedIn): ?>
            <div class="component-menu-link" data-action="submitLogout">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded" style="color: #d32f2f;">logout</span>
                </div>
                <div class="component-menu-link-text">
                    <span style="color: #d32f2f;">Cerrar sesión</span>
                </div>
            </div>
            <?php endif; ?>

        </div>
    </div>
</div>