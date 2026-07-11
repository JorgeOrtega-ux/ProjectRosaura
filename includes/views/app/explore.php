<?php
use App\Core\Container;
use App\Api\Services\Canvas\CanvasServices;
use App\Core\Interfaces\SessionManagerInterface;

$container = new Container();
$sessionManager = $container->get(SessionManagerInterface::class);
$userId = $sessionManager->isLoggedIn() ? $sessionManager->getActiveAccountId() : null;

$initialCanvases = [];

try {
    $canvasServices = $container->get(CanvasServices::class);
    $sort = 'newest';
    $officialRes = $canvasServices->getOfficialCanvases($userId, $sort);
    $allCanvases = [];
    if ($officialRes && isset($officialRes['success']) && $officialRes['success'] && isset($officialRes['data'])) {
        $allCanvases = array_merge($allCanvases, $officialRes['data']);
    }
    $publicRes = $canvasServices->getPublicCanvases($userId, 50, $sort);
    if ($publicRes && isset($publicRes['success']) && $publicRes['success'] && isset($publicRes['data'])) {
        $existingIds = array_column($allCanvases, 'id');
        foreach ($publicRes['data'] as $publicCanvas) {
            if (!in_array($publicCanvas['id'], $existingIds)) {
                $allCanvases[] = $publicCanvas;
            }
        }
    }
    usort($allCanvases, function($a, $b) {
        $timeA = strtotime($a['created_at']);
        $timeB = strtotime($b['created_at']);
        return $timeB - $timeA;
    });
    
    $initialCanvases = $allCanvases;
} catch (\Throwable $e) {}

$initialCanvasesJson = htmlspecialchars(json_encode($initialCanvases), ENT_QUOTES, 'UTF-8');
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('explore_title'); ?></h1>
                <p class="component-top-subtitle"><?php echo __('explore_desc'); ?></p>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleExploreFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_sort'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">sort</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleExploreFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuSortExplore">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">sort</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('explore_sort_by'); ?></span></div>
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
                                        <span class="component-menu-header-title"><?php echo __('explore_sort_by'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="explore_sort" class="filter-radio" data-action="changeExploreSort" value="newest" checked></div>
                                        <div class="component-menu-link-text"><span><?php echo __('explore_sort_newest'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="explore_sort" class="filter-radio" data-action="changeExploreSort" value="oldest"></div>
                                        <div class="component-menu-link-text"><span><?php echo __('explore_sort_oldest'); ?></span></div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon"><input type="checkbox" name="explore_sort" class="filter-radio" data-action="changeExploreSort" value="members"></div>
                                        <div class="component-menu-link-text"><span><?php echo __('explore_sort_popular'); ?></span></div>
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