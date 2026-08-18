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
                    <button class="component-button component-button--icon component-button--h40" data-action="openTimelapseModal" data-ref="btn-timelapse-modal" data-tooltip="<?php echo __('btn_timelapse'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">timelapse</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="downloadSnapshotHighRes" data-tooltip="<?php echo __('btn_download'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">high_quality</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 active" data-action="toggleSnapshotGrid" data-tooltip="<?php echo __('dt_grid'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">grid_on</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <canvas class="component-canvas-surface" data-ref="snapshot-canvas"></canvas>
            
            <div class="canvas-badges-left" data-ref="badges-left">
                <div class="component-badge" data-badge-id="coords">
                    <span class="material-symbols-rounded">my_location</span>
                    <span data-ref="coords-text">- , -</span>
                </div>
                
                <div class="component-badge component-badge--warning">
                    <span class="material-symbols-rounded">history</span> <?php echo __('lbl_historical_mode'); ?>
                </div>
            </div>

            <div class="component-timelapse-player" data-ref="timelapse-player">
                <div class="component-timelapse-player-top">
                    <div class="component-timelapse-status">
                        <span class="component-timelapse-pulse" data-ref="timelapse-pulse"></span>
                        <span class="component-timelapse-status-text" data-ref="timelapse-status-text"><?php echo __('lbl_timelapse_playing'); ?></span>
                    </div>
                    
                    <div class="component-timelapse-stats">
                        <span class="component-badge" data-ref="timelapse-pixel-count">0 / 0 px</span>
                    </div>

                    <button class="component-button component-button--icon component-button--h30" data-action="closeTimelapse" data-tooltip="<?php echo __('btn_exit_timelapse'); ?>" data-position="top">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div class="component-timelapse-timeline">
                    <input class="component-timelapse-scrubber" data-ref="timelapse-scrubber" data-action="scrubTimelapse" type="range" min="0" max="100" value="0" step="0.1">
                </div>

                <div class="component-timelapse-controls">
                    <div class="component-timelapse-controls-left">
                        <button class="component-button component-button--icon component-button--h35" data-action="stepBackwardTimelapse" data-tooltip="<?php echo __('lbl_timelapse_step'); ?>" data-position="top">
                            <span class="material-symbols-rounded">skip_previous</span>
                        </button>
                        <button class="component-button component-button--icon component-button--primary component-button--h35" data-action="togglePlayTimelapse" data-ref="btn-timelapse-play" data-position="top">
                            <span class="material-symbols-rounded" data-ref="timelapse-play-icon">play_arrow</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h35" data-action="stepForwardTimelapse" data-tooltip="<?php echo __('lbl_timelapse_step'); ?>" data-position="top">
                            <span class="material-symbols-rounded">skip_next</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h35" data-action="restartTimelapse" data-position="top">
                            <span class="material-symbols-rounded">restart_alt</span>
                        </button>
                    </div>

                    <div class="component-timelapse-controls-right">
                        <button class="component-button component-button--h35 component-timelapse-speed-pill" data-action="openTimelapseSpeedMenu" data-ref="timelapse-speed-indicator" type="button">
                            <span class="material-symbols-rounded">speed</span>
                            <span data-ref="timelapse-speed-text">5x</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>