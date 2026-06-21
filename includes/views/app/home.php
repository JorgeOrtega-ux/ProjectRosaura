<?php
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$publicCanvases = [];

try {
    // Inicializamos la conexión mediante servidor para obtener los lienzos públicos
    $dbManager = new DatabaseManager();
    $db = $dbManager->getConnection(DB::CONN_CANVASES);

    // Añadimos 'id' a la consulta para poder armar la ruta del snapshot
    $sql = "SELECT id, uuid, name FROM " . DB::TBL_CANVASES . " WHERE privacy = 'public' ORDER BY created_at DESC LIMIT 20";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $publicCanvases = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

} catch (\Exception $e) {
    error_log("Error al cargar lienzos públicos en el home: " . $e->getMessage());
}
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="purchase-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('home_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    </div>
            </div>
        </div>

        <div class="component-bottom">
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; padding: 20px;">
                
                <?php if (!empty($publicCanvases)): ?>
                    <?php foreach ($publicCanvases as $canvas): ?>
                        
                        <?php 
                        // Lógica Server-Side para determinar la imagen
                        $snapshotPath = "/assets/img/snapshots/canvas_" . $canvas['id'] . ".png";
                        $physicalPath = dirname(__DIR__, 3) . '/public' . $snapshotPath;
                        $bgStyle = "background-image: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);"; // Default fallback
                        
                        if (file_exists($physicalPath)) {
                            $timestamp = filemtime($physicalPath);
                            $snapshotUrl = $snapshotPath . "?v=" . $timestamp;
                            // Insertamos la imagen (rendering pixelated y demas ira en la clase CSS generica)
                            $bgStyle = "background-image: url('{$snapshotUrl}'), linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);";
                        }
                        ?>

                        <div data-nav="/design/<?php echo htmlspecialchars($canvas['uuid']); ?>" class="component-snapshot-card" style="<?php echo $bgStyle; ?>">
                            <h3 class="component-snapshot-title">
                                <?php echo htmlspecialchars($canvas['name']); ?>
                            </h3>
                        </div>

                    <?php endforeach; ?>
                <?php else: ?>
                    <p style="color: #666;">No hay lienzos públicos disponibles por el momento.</p>
                <?php endif; ?>

            </div>
            
        </div>

    </div>
</div>