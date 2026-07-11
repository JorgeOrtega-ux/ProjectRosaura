<?php
use App\Core\Container;
use App\Api\Services\Canvas\CanvasCoreService;
use App\Core\Interfaces\SessionManagerInterface;

$container = new Container();
$sessionManager = $container->get(SessionManagerInterface::class);
$isLoggedIn = $sessionManager->isLoggedIn();
$initialCanvases = [];

if ($isLoggedIn) {
    try {
        $canvasServices = $container->get(CanvasCoreService::class);
        $userId = $sessionManager->getActiveAccountId();
        $res = $canvasServices->getMine($userId, 50, 'all');
        if ($res && isset($res['success']) && $res['success'] && isset($res['data'])) {
            $initialCanvases = $res['data'];
        }
    } catch (\Throwable $e) {}
}
$initialCanvasesJson = htmlspecialchars(json_encode($initialCanvases), ENT_QUOTES, 'UTF-8');
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="purchase-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('home_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleHomeFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleHomeFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterHome">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">filter_list</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_canvases_title'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterHome">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_canvases_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="home_filter" class="filter-radio" data-action="changeHomeFilter" value="all" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_all_canvases'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="home_filter" class="filter-radio" data-action="changeHomeFilter" value="mine"></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_my_canvases'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="home_filter" class="filter-radio" data-action="changeHomeFilter" value="joined"></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_joined_canvases'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="home_filter" class="filter-radio" data-action="changeHomeFilter" value="favorites"></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_favorite_canvases'); ?></span></div>
                                    </label>
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