<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    $snapshotId = isset($_GET['id']) ? $_GET['id'] : null;
    $title = function_exists('__') ? __('lbl_snapshot_viewer_title') : null;
    $title = $title ?: 'Visor de Snapshot';

} catch (\Throwable $e) {
    $phpError = $e->getMessage();
}
?>

<style>
@keyframes spin { 
    100% { transform: rotate(360deg); } 
}
</style>

<div class="view-content">
    
    <?php if (empty($snapshotId) || isset($phpError)): ?>
        <div>
            <h3>
                <span class="material-symbols-rounded">warning</span> Error de Renderizado en la Vista
            </h3>
            
            <?php if (isset($phpError)): ?>
                <p><strong>Error PHP:</strong> <?php echo htmlspecialchars($phpError); ?></p>
            <?php endif; ?>
            
            <?php if (empty($snapshotId)): ?>
                <p><strong>Problema:</strong> La variable <code>$_GET['id']</code> está vacía o no llegó a la vista.</p>
                <p><strong>Variables $_GET recibidas:</strong></p>
                <pre><?php print_r($_GET); ?></pre>
                <p><strong>URI Solicitada:</strong> <?php echo htmlspecialchars($_SERVER['REQUEST_URI'] ?? 'Desconocida'); ?></p>
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
                    <button id="tl-btn-play" class="component-button component-button--icon component-button--h40" title="Reproducir Timelapse">
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
                <span class="material-symbols-rounded">history</span> Modo Histórico (Solo Lectura)
            </div>
        </div>
    </div>
</div>