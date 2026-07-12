<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    $snapshotId = isset($_GET['id']) ? $_GET['id'] : null;
    $title = __('lbl_snapshot_viewer_title');

} catch (\Throwable $e) {
    $phpError = $e->getMessage();
}
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
         data-snapshot-id="<?php echo htmlspecialchars($snapshotId ?? ''); ?>">
         
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo $title; ?></h1>
                

            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    <button id="tl-btn-play" class="component-button component-button--icon component-button--h40" data-tooltip="<?php echo __('tooltip_play_timelapse'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">play_circle</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <canvas data-ref="snapshot-canvas" class="component-canvas-surface"></canvas>
            
            <div class="component-badge component-badge--absolute-tl">
                <span class="material-symbols-rounded">my_location</span>
                <span data-ref="coords-text">- , -</span>
            </div>
            
            <div class="component-badge component-badge--warning component-badge--absolute-tl">
                <span class="material-symbols-rounded">history</span> <?php echo __('lbl_historical_mode'); ?>
            </div>
        </div>
    </div>
</div>