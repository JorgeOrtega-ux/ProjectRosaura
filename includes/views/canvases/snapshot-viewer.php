<?php
// includes/views/app/snapshot-viewer.php

// Forzar a PHP a mostrar cualquier error fatal o advertencia en pantalla
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    // Intentamos capturar el ID de forma segura
    $snapshotId = isset($_GET['id']) ? $_GET['id'] : null;
    
    // Función de traducción segura por si la global no está cargando en este contexto
    $title = function_exists('__') ? __('lbl_snapshot_viewer_title') : null;
    $title = $title ?: 'Visor de Snapshot';

} catch (\Throwable $e) {
    // Si algo falla estrepitosamente en la inicialización
    $phpError = $e->getMessage();
}
?>

<style>
@keyframes spin { 
    100% { transform: rotate(360deg); } 
}
</style>

<div class="view-content" style="position: relative;">
    
    <?php if (empty($snapshotId) || isset($phpError)): ?>
        <div style="margin: 20px; padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 8px; color: #b71c1c;">
            <h3 style="margin-top: 0; display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-rounded">warning</span> Error de Renderizado en la Vista
            </h3>
            
            <?php if (isset($phpError)): ?>
                <p><strong>Error PHP:</strong> <?php echo htmlspecialchars($phpError); ?></p>
            <?php endif; ?>
            
            <?php if (empty($snapshotId)): ?>
                <p><strong>Problema:</strong> La variable <code>$_GET['id']</code> está vacía o no llegó a la vista.</p>
                <p><strong>Variables $_GET recibidas:</strong></p>
                <pre style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 4px;"><?php print_r($_GET); ?></pre>
                <p><strong>URI Solicitada:</strong> <?php echo htmlspecialchars($_SERVER['REQUEST_URI'] ?? 'Desconocida'); ?></p>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <div class="component-wrapper component-wrapper--full no-padding" 
         data-ref="snapshot-wrapper" 
         data-snapshot-id="<?php echo htmlspecialchars($snapshotId ?? ''); ?>">
         
        <div class="component-top">
            <div class="component-top-left" style="display: flex; align-items: center; gap: 12px;">
                <h1 class="component-top-title"><?php echo $title; ?></h1>
                
                <span class="component-badge component-badge--warning" style="margin-left: 12px;">
                    <span class="material-symbols-rounded">history</span> Modo Histórico (Solo Lectura)
                </span>
            </div>
            
            <div class="component-top-right" style="display: flex; align-items: center;">
                <div class="component-actions active">
                </div>
            </div>
        </div>

        <div class="component-bottom" style="position: relative;">
            <canvas data-ref="snapshot-canvas" class="component-canvas-surface"></canvas>
            
            <div class="component-badge component-badge--absolute-tl">
                <span class="material-symbols-rounded">my_location</span>
                <span data-ref="coords-text">- , -</span>
            </div>

            <div id="timelapse-controls" class="timelapse-player-bar" style="display: none; position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 30px; align-items: center; gap: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 100;">
                <button id="tl-btn-play" style="background: none; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">
                    <span class="material-symbols-rounded" style="font-size: 32px;">play_circle</span>
                </button>
                <input type="range" id="tl-progress" min="0" max="100" value="0" style="width: 250px; cursor: pointer;">
                <span id="tl-time" style="font-family: monospace; font-size: 14px; min-width: 45px; text-align: right;">0%</span>
                
                <div style="border-left: 1px solid rgba(255,255,255,0.3); height: 20px; margin: 0 5px;"></div>
                
                <span style="font-size: 12px; opacity: 0.8;">Velocidad:</span>
                <select id="tl-speed" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 2px 5px; cursor: pointer;">
                    <option value="1" style="color: black;">1x</option>
                    <option value="5" style="color: black;" selected>5x</option>
                    <option value="10" style="color: black;">10x</option>
                    <option value="50" style="color: black;">50x</option>
                    <option value="100" style="color: black;">100x</option>
                </select>
            </div>

        </div>
    </div>
</div>