<?php 
// includes/modules/moduleTheme.php
?>
<div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleTheme">
    
    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
        
        <div class="pill-container"><div class="drag-handle"></div></div>

        <div class="component-menu-list component-menu-list--scrollable">
            
            <div class="component-menu-link active" data-action="setPref" data-key="theme" data-value="system">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">brightness_auto</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Sincronizar con el sistema</span>
                </div>
            </div>

            <div class="component-menu-link" data-action="setPref" data-key="theme" data-value="light">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">light_mode</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Tema claro</span>
                </div>
            </div>

            <div class="component-menu-link" data-action="setPref" data-key="theme" data-value="dark">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">dark_mode</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Tema oscuro</span>
                </div>
            </div>

        </div>
    </div>
</div>