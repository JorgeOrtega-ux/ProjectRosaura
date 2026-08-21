<?php
global $initialCanvasesJson;
$initialCanvasesJson = $initialCanvasesJson ?? '[]';
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="home-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('home_title'); ?></h1>
            </div>

            <div class="component-top-right">
                <div class="component-dropdown-wrapper">
                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="homeFilterDropdown" data-position="bottom">
                        <span class="material-symbols-rounded">filter_list</span>
                        <span class="component-dropdown-text" data-ref="selected-filter-label"><?php echo __('filter_home_all'); ?></span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div class="component-module component-module--dropdown disabled" data-module="homeFilterDropdown">
                        <div class="component-menu component-menu--w220 component-menu--h-auto component-menu--limited">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            <div class="component-menu-list">
                                <div class="component-menu-link active" data-action="filterHomeCategory" data-filter="all">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">dashboard</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_home_all'); ?></span></div>
                                </div>
                                <div class="component-menu-link" data-action="filterHomeCategory" data-filter="mine">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">person</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_home_mine'); ?></span></div>
                                </div>
                                <div class="component-menu-link" data-action="filterHomeCategory" data-filter="joined">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">group</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_home_joined'); ?></span></div>
                                </div>
                                <div class="component-menu-link" data-action="filterHomeCategory" data-filter="managed">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">admin_panel_settings</span></div>
                                    <div class="component-menu-link-text"><span><?php echo __('filter_home_managed'); ?></span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-bottom" data-ref="dynamic-content-area" data-initial-canvases="<?php echo $initialCanvasesJson; ?>">
        </div>
    </div>
</div>