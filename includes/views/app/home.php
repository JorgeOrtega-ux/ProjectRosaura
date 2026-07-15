<?php
global $initialCanvasesJson;
$initialCanvasesJson = $initialCanvasesJson ?? '[]';
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
            </div>
        </div>

        <div class="component-bottom" data-ref="dynamic-content-area" data-initial-canvases="<?php echo $initialCanvasesJson; ?>">
                    </div>
    </div>
</div>