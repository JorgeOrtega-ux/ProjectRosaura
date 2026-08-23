<?php
global $initialCanvasesJson;
$initialCanvasesJson = $initialCanvasesJson ?? '[]';
$isUserLoggedIn = !empty($_SESSION['active_account']) || isset($_SESSION['user_id']);
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="home-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('home_title'); ?></h1>
            </div>

            <div class="component-top-right">
                <?php if ($isUserLoggedIn): ?>
                <div class="component-actions active" data-ref="header-default-actions">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleHomeFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown disabled" data-module="moduleHomeFilters">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="material-symbols-rounded">filter_list</span>
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterCategory">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_category'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterCategory">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_by_category'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <div class="component-menu-link component-menu-link--bordered active" data-action="filterHomeCategory" data-filter="all">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">dashboard</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_home_all'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="filterHomeCategory" data-filter="mine">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">person</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_home_mine'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="filterHomeCategory" data-filter="joined">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">group</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_home_joined'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="filterHomeCategory" data-filter="managed">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">admin_panel_settings</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_home_managed'); ?></span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <div class="component-bottom" data-ref="dynamic-content-area" data-initial-canvases="<?php echo $initialCanvasesJson; ?>">
        </div>
    </div>
</div>