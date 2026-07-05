<?php
// includes/views/app/explore.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('explore_title'); ?></h1>
                <p class="component-top-subtitle" style="color: var(--text-secondary); margin-top: 4px;"><?php echo __('explore_desc'); ?></p>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleExploreFilters" data-ref="btn-toggle-filters" data-tooltip="Ordenar" data-position="bottom">
                            <span class="material-symbols-rounded">sort</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleExploreFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title">Opciones de visualización</span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuSortExplore">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">sort</span></div>
                                        <div class="component-menu-link-text"><span>Ordenar por</span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuSortExplore">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title">Ordenar por</span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="explore_sort" class="filter-radio" data-action="changeExploreSort" value="newest" checked></div>
                                        <div class="component-menu-link-text"><span>Más nuevos primero</span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="explore_sort" class="filter-radio" data-action="changeExploreSort" value="oldest"></div>
                                        <div class="component-menu-link-text"><span>Más antiguos primero</span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="explore_sort" class="filter-radio" data-action="changeExploreSort" value="members"></div>
                                        <div class="component-menu-link-text"><span>Más populares (Miembros)</span></div>
                                    </label>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>

        <div class="component-bottom" style="padding: 0;" data-ref="dynamic-content-area">
            <!-- JS inyectará el component-grid o el component-empty-state aquí -->
        </div>

    </div>
</div>