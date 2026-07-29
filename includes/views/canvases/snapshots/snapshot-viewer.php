<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$viewerData = $canvasService->getSnapshotViewerData($_GET['id'] ?? null);

$snapshotId = $viewerData['snapshotId'];
$title = $viewerData['title'];
$canvasSize = $viewerData['canvasSize'];
?>



<div class="view-content">
    
    <?php if (empty($snapshotId) || isset($phpError)): ?>
        <div>
            <h3>
                <span class="material-symbols-rounded">warning</span> <?php echo __('err_render_view'); ?>
            </h3>
            
            <?php if (isset($phpError)): ?>
                <p><strong><?php echo __('lbl_php_error'); ?>:</strong> <?php echo htmlspecialchars($phpError); ?></p>
            <?php endif; ?>
            
            <?php if (empty($snapshotId)): ?>
                <p><strong><?php echo __('lbl_problem'); ?>:</strong> <?php echo __('err_missing_get_id'); ?></p>
                <p><strong><?php echo __('lbl_get_vars_received'); ?>:</strong></p>
                <pre><?php print_r($_GET); ?></pre>
                <p><strong><?php echo __('lbl_requested_uri'); ?>:</strong> <?php echo htmlspecialchars($_SERVER['REQUEST_URI'] ?? __('lbl_unknown')); ?></p>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <div class="component-wrapper component-wrapper--full no-padding" 
         data-ref="snapshot-wrapper" 
         data-snapshot-id="<?php echo htmlspecialchars($snapshotId ?? ''); ?>"
         data-size="<?php echo htmlspecialchars($canvasSize ?? '64x64'); ?>">
         
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo $title; ?></h1>
                

            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    <button id="tl-btn-download" class="component-button component-button--icon component-button--h40" data-action="downloadSnapshotHighRes" data-tooltip="<?php echo __('btn_download'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">high_quality</span>
                    </button>
                    <button id="tl-btn-toggle-grid" class="component-button component-button--icon component-button--h40 active" data-action="toggleSnapshotGrid" data-tooltip="<?php echo __('dt_grid'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">grid_on</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <canvas data-ref="snapshot-canvas" class="component-canvas-surface"></canvas>
            
            <div class="canvas-badges-left" data-ref="badges-left">
                <div class="component-badge" data-badge-id="coords">
                    <span class="material-symbols-rounded">my_location</span>
                    <span data-ref="coords-text">- , -</span>
                </div>
                
                <div class="component-badge component-badge--warning">
                    <span class="material-symbols-rounded">history</span> <?php echo __('lbl_historical_mode'); ?>
                </div>
            </div>
        </div>
    </div>
</div>