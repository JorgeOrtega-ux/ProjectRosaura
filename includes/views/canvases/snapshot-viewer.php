<?php
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    $snapshotId = isset($_GET['id']) ? $_GET['id'] : null;
    $title = __('lbl_snapshot_viewer_title');
    $canvasSize = '64x64';
    
    if ($snapshotId) {
        $dbManager = new DatabaseManager();
        $db = $dbManager->getConnection(DB::CONN_CANVASES);
        
        $sql = "SELECT c.size FROM canvas_snapshots_history s
                JOIN canvases c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :uuid LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':uuid' => $snapshotId]);
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $canvasSize = $row['size'];
        }
    }

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
                    <button id="tl-btn-play" class="component-button component-button--icon component-button--h40" data-action="toggleMenuInModule" data-module-target="moduleTimelapseTools" data-menu-target="menu-timelapse" data-tooltip="<?php echo __('tooltip_play_timelapse'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">play_circle</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <canvas data-ref="snapshot-canvas" class="component-canvas-surface"></canvas>
            
            <div style="position: absolute; top: 1rem; left: 1rem; display: flex; flex-direction: column; gap: 0.5rem; z-index: 10; pointer-events: none;">
                <div class="component-badge">
                    <span class="material-symbols-rounded">my_location</span>
                    <span data-ref="coords-text">- , -</span>
                </div>
                
                <div class="component-badge component-badge--warning">
                    <span class="material-symbols-rounded">history</span> <?php echo __('lbl_historical_mode'); ?>
                </div>

                <div id="tl-stats-badge" class="component-badge component-badge--dark" style="opacity: 0; transition: opacity 0.3s ease;">
                    <span class="material-symbols-rounded">analytics</span> 
                    <span id="tl-stats-text">0 / 0 (0%)</span>
                </div>
            </div>
        </div>
    </div>

    <?php require_once __DIR__ . '/../../modules/moduleTimelapseTools.php'; ?>

</div>