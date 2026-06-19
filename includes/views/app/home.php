<?php
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$publicCanvases = [];

try {
    // Inicializamos la conexión mediante servidor para obtener los lienzos públicos
    $dbManager = new DatabaseManager();
    $db = $dbManager->getConnection(DB::CONN_CANVASES);

    $sql = "SELECT uuid, name FROM " . DB::TBL_CANVASES . " WHERE privacy = 'public' ORDER BY created_at DESC LIMIT 20";
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
                        
                        <div data-nav="/design/<?php echo htmlspecialchars($canvas['uuid']); ?>" style="
                            height: 180px;
                            background-color: #e9ecef;
                            background-image: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                            border-radius: 12px;
                            position: relative;
                            /* Sombra interna inferior (bottom inset shadow) */
                            box-shadow: inset 0px -70px 50px -20px rgba(0, 0, 0, 0.7);
                            display: flex;
                            align-items: flex-end;
                            padding: 20px;
                            /* Configuración inicial del borde separado (outline) */
                            outline: 2px solid transparent;
                            outline-offset: 0px;
                            transition: outline 0.2s ease, outline-offset 0.2s ease;
                            cursor: pointer;
                        "
                        onmouseover="this.style.outline='2px solid #000000'; this.style.outlineOffset='2px';"
                        onmouseout="this.style.outline='2px solid transparent'; this.style.outlineOffset='0px';"
                        >
                            <h3 style="
                                margin: 0; 
                                color: #ffffff; 
                                font-size: 1.25rem; 
                                font-family: inherit;
                                z-index: 10;
                                text-shadow: 0px 2px 4px rgba(0,0,0,0.6);
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                width: 100%;
                            ">
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