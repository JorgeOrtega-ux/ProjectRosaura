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
    
    $btnBack = function_exists('__') ? __('btn_back') : null;
    $btnBack = $btnBack ?: 'Volver';

} catch (\Throwable $e) {
    // Si algo falla estrepitosamente en la inicialización
    $phpError = $e->getMessage();
}
?>

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
                    <button class="component-button component-button--h34" onclick="window.history.back()">
                        <span class="material-symbols-rounded">arrow_back</span>
                        <?php echo $btnBack; ?>
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
        </div>
    </div>
</div>