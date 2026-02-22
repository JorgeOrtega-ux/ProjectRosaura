<div class="component-module component-module--sidebar disabled" data-module="moduleSurface">
    <div class="component-menu component-menu--w265 component-menu--h-full">
        
        <div class="component-menu-top">
            <div class="component-menu-list">
                <a href="/ProjectRosaura/" class="component-menu-link nav-item" data-nav="/ProjectRosaura/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">home</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span>Página principal</span>
                    </div>
                </a>
                <a href="/ProjectRosaura/explore" class="component-menu-link nav-item" data-nav="/ProjectRosaura/explore">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">explore</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span>Explorar colecciones</span>
                    </div>
                </a>
            </div>
        </div>

        <div class="component-menu-bottom">
            <div class="component-menu-list">
                
                <?php /* if(isset($_SESSION['es_admin']) && $_SESSION['es_admin'] === true): */ ?>
                <a href="#" class="component-menu-link">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">admin_panel_settings</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span>Panel de Control</span>
                    </div>
                </a>
                <?php /* endif; */ ?>

                <a href="#" class="component-menu-link">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">settings</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span>Configuración</span>
                    </div>
                </a>
            </div>
        </div>

    </div>
</div>