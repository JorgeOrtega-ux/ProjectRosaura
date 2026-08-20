<?php
$title = __('title_trash');
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="trash-wrapper">
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('title_trash'); ?></h1>
                <p class="component-top-desc"><?php echo __('desc_trash_retention_notice'); ?></p>
            </div>
            <div class="component-top-right">
                <div class="component-actions active" data-ref="header-default-actions">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button type="button" class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleTrashFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown disabled" data-module="moduleTrashFilters">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_type'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterType">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button type="button" class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_by_type'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <div class="component-menu-link component-menu-link--bordered active" data-action="filterTrashType" data-type="all">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">auto_awesome_motion</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_all'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="filterTrashType" data-type="canvases">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tab_canvases'); ?></span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="filterTrashType" data-type="templates">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">layers</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('tab_templates'); ?></span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="button" class="component-button component-button--danger component-button--h40 disabled" data-action="emptyTrash" data-ref="btn-empty-trash" data-tooltip="<?php echo __('btn_empty_trash'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete_sweep</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="component-bottom" data-ref="trash-content-area"></div>
    </div>
</div>
