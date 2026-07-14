<?php
use App\Core\Container;
use App\Api\Services\Canvas\CanvasCoreService;
use App\Core\Interfaces\SessionManagerInterface;

$container = new Container();
$sessionManager = $container->get(SessionManagerInterface::class);
$isLoggedIn = $sessionManager->isLoggedIn();
$initialCanvases = [];

try {
    $canvasServices = $container->get(CanvasCoreService::class);
    $userId = $isLoggedIn ? $sessionManager->getActiveAccountId() : null;
    
    $perms = $isLoggedIn ? $sessionManager->getPermissions() : [];
    if (empty($perms) && isset($_SESSION['user_permissions'])) {
        $perms = $_SESSION['user_permissions'];
    } elseif (empty($perms) && isset($_SESSION['permissions'])) {
        $perms = $_SESSION['permissions'];
    }
    $canManageOfficial = in_array('access_admin_panel', $perms) || 
                         in_array('canvases.manage_official', $perms) || 
                         in_array('canvases.create_official', $perms);

    $res = $canvasServices->getHomeFeed($userId, 'all', 20, 0, $canManageOfficial);
    if ($res && isset($res['success']) && $res['success'] && isset($res['data'])) {
        $initialCanvases = $res['data'];
    }
} catch (\Throwable $e) {}
$initialCanvasesJson = htmlspecialchars(json_encode($initialCanvases), ENT_QUOTES, 'UTF-8');
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="purchase-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-right" style="width: 100%;">
                <div class="component-tags-carousel-wrapper" style="position: relative; width: 100%; display: flex; align-items: center;">
                    <button class="component-tag-nav-btn component-tag-nav-left" data-action="scrollTagsLeft" style="display: none;">
                        <span class="material-symbols-rounded">chevron_left</span>
                    </button>

                    <div class="component-tags-carousel" data-ref="home-tags-carousel" style="display: flex; gap: 8px; overflow-x: auto; scroll-behavior: smooth; white-space: nowrap; -ms-overflow-style: none; scrollbar-width: none; flex: 1; padding: 4px 10px;">
                        <button class="component-badge component-badge--interactive active" data-action="filterHomeTag" data-tag="all">
                            <span class="material-symbols-rounded">explore</span>
                            <?php echo __('filter_all_canvases'); ?>
                        </button>
                        <?php 
                        $tagsList = [
                            'fun' => 'mood', 
                            'tension' => 'local_fire_department', 
                            'action' => 'bolt', 
                            'strategy' => 'psychology', 
                            'roleplay' => 'theater_comedy', 
                            'casual' => 'coffee', 
                            'romance' => 'favorite', 
                            'horror' => 'dark_mode', 
                            'scifi' => 'rocket_launch', 
                            'fantasy' => 'auto_fix_high'
                        ];
                        foreach($tagsList as $tag => $icon): ?>
                            <button class="component-badge component-badge--interactive" data-action="filterHomeTag" data-tag="<?php echo $tag; ?>">
                                <span class="material-symbols-rounded"><?php echo $icon; ?></span>
                                <?php echo __('tag_' . $tag); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>

                    <button class="component-tag-nav-btn component-tag-nav-right" data-action="scrollTagsRight" style="display: none;">
                        <span class="material-symbols-rounded">chevron_right</span>
                    </button>
                </div>
                
                <style>
                .component-tags-carousel::-webkit-scrollbar { display: none; }
                .component-tags-carousel.is-dragging {
                    scroll-behavior: auto !important;
                    cursor: grabbing;
                    user-select: none;
                }
                .component-tags-carousel.is-dragging .component-badge {
                    pointer-events: none;
                }
                .component-badge {
                    transition: all 0.2s ease;
                }
                .component-badge.active {
                    background: var(--text-primary) !important;
                    color: var(--bg-surface) !important;
                    border-color: var(--text-primary) !important;
                }
                .component-tag-nav-btn {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 2;
                    background: var(--bg-surface);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    transition: all 0.2s ease;

                }
                .component-tag-nav-btn:hover {
                    background: var(--bg-surface);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    transform: translateY(-50%) scale(1.05);
                }
                .component-tag-nav-left { left: 0; }
                .component-tag-nav-right { right: 0; }
                </style>
            </div>
        </div>

        <div class="component-bottom" data-ref="dynamic-content-area" data-initial-canvases="<?php echo $initialCanvasesJson; ?>">
                    </div>
    </div>
</div>