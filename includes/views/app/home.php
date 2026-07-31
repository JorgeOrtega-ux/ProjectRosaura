<?php
use App\Api\Services\App\AppViewService;

global $initialCanvasesJson;
$initialCanvasesJson = $initialCanvasesJson ?? '[]';

$viewService = new AppViewService();
$tagsList = $viewService->getHomeTags();
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="purchase-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-right component-top-right--full">
                <div class="component-tags-carousel-wrapper">
                    <button class="component-tag-nav-btn component-tag-nav-left disabled" data-action="scrollTagsLeft">
                        <span class="material-symbols-rounded">chevron_left</span>
                    </button>

                    <div class="component-tags-carousel" data-ref="home-tags-carousel">
                        <button class="component-badge component-badge--interactive" data-action="openCreateSandboxModal" style="background: var(--color-brand-primary, #6200ee); color: #fff;">
                            <span class="material-symbols-rounded">science</span>
                            <span>Crear Sandbox</span>
                        </button>
                        <button class="component-badge component-badge--interactive active" data-action="filterHomeTag" data-tag="all">
                            <span class="material-symbols-rounded">explore</span>
                            <?php echo __('filter_all_canvases'); ?>
                        </button>
                        <button class="component-badge component-badge--interactive" data-action="filterHomeTag" data-tag="sandbox">
                            <span class="material-symbols-rounded">science</span>
                            <span>Sandbox</span>
                        </button>
                        <?php foreach($tagsList as $tag => $icon): ?>
                            <button class="component-badge component-badge--interactive" data-action="filterHomeTag" data-tag="<?php echo $tag; ?>">
                                <span class="material-symbols-rounded"><?php echo $icon; ?></span>
                                <?php echo __('tag_' . $tag); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>

                    <button class="component-tag-nav-btn component-tag-nav-right disabled" data-action="scrollTagsRight">
                        <span class="material-symbols-rounded">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom" data-ref="dynamic-content-area" data-initial-canvases="<?php echo $initialCanvasesJson; ?>">
                    </div>
    </div>
</div>
