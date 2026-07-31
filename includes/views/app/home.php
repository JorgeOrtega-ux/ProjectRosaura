<?php
use App\Api\Services\App\AppViewService;

global $initialCanvasesJson;
$initialCanvasesJson = $initialCanvasesJson ?? '[]';

$viewService = new AppViewService();
$tagsList = $viewService->getHomeTags();
?>
<div class="view-content" style="position: relative;">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="purchase-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-right component-top-right--full">
                <div class="component-tags-carousel-wrapper">
                    <button class="component-tag-nav-btn component-tag-nav-left disabled" data-action="scrollTagsLeft">
                        <span class="material-symbols-rounded">chevron_left</span>
                    </button>

                    <div class="component-tags-carousel" data-ref="home-tags-carousel">
                        <button class="component-badge component-badge--interactive active" data-action="filterHomeTag" data-tag="all">
                            <span class="material-symbols-rounded">explore</span>
                            <?php echo __('filter_all_canvases'); ?>
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

    <!-- Botón Flotante Redondo Negro/Blanco con Borde e Icono de Ciencia para Sandbox -->
    <button class="component-sandbox-fab" data-action="openCreateSandboxModal" title="Crear Sandbox">
        <span class="material-symbols-rounded">science</span>
    </button>
</div>

<style>
.component-sandbox-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background-color: var(--text-primary, #ffffff) !important;
    border: 1px solid var(--text-inverse, #1c1c20) !important;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: none;
    z-index: 99;
    transition: opacity 0.2s ease, border-color 0.2s ease;
}
.component-sandbox-fab:hover {
    opacity: 0.85;
}
.component-sandbox-fab span {
    color: var(--text-inverse, #1c1c20) !important;
    font-size: 21px;
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>