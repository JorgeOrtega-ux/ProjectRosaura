<?php
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$publicCanvases = [];
// Intentamos obtener el ID del usuario actual mediante sesión (ajusta según cómo manejes la sesión en tu framework)
$currentUserId = $_SESSION['user_id'] ?? ($_SESSION['user']['id'] ?? 0);

try {
    // Inicializamos la conexión mediante servidor para obtener los lienzos públicos
    $dbManager = new DatabaseManager();
    $db = $dbManager->getConnection(DB::CONN_CANVASES);

    // CORRECCIÓN: Cambiamos 'owner_id' a 'user_id' que es la columna real en la base de datos
    $sql = "SELECT id, uuid, name, user_id FROM " . DB::TBL_CANVASES . " WHERE privacy = 'public' ORDER BY created_at DESC LIMIT 20";
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

                        // CORRECCIÓN: Verificamos contra 'user_id'
                        $isOwner = ($canvas['user_id'] == $currentUserId);
                        ?>

                        <div class="component-snapshot-card" data-card-id="<?php echo $canvas['id']; ?>" style="<?php echo $bgStyle; ?>">
                            
                            <div data-nav="/design/<?php echo htmlspecialchars($canvas['uuid']); ?>" class="component-snapshot-link">
                                <h3 class="component-snapshot-title">
                                    <?php echo htmlspecialchars($canvas['name']); ?>
                                </h3>
                            </div>

                            <div class="component-snapshot-actions-wrapper component-dropdown-wrapper">
                                <div class="component-snapshot-actions">
                                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleModule" data-target="snapshot-menu-<?php echo $canvas['id']; ?>">
                                        <span class="material-symbols-rounded">more_vert</span>
                                    </button>
                                </div>
                                
                                <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed disabled" data-module="snapshot-menu-<?php echo $canvas['id']; ?>">
                                    <div class="component-menu component-menu--w265">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        
                                        <div class="component-menu-list">
                                            <!-- 1-Abrir en una pestaña nueva -->
                                            <button type="button" class="component-menu-link" data-action="openCanvasNewTab" data-uuid="<?php echo htmlspecialchars($canvas['uuid']); ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">open_in_new</span></div>
                                                <div class="component-menu-link-text"><span>Abrir en una pestaña nueva</span></div>
                                            </button>

                                            <!-- 2-Copiar el enlace -->
                                            <button type="button" class="component-menu-link" data-action="copyCanvasLink" data-uuid="<?php echo htmlspecialchars($canvas['uuid']); ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">content_copy</span></div>
                                                <div class="component-menu-link-text"><span>Copiar el enlace</span></div>
                                            </button>

                                            <div class="component-menu-divider"></div>

                                            <!-- 3-Salir del lienzo / Eliminar lienzo -->
                                            <?php if ($isOwner): ?>
                                                <button type="button" class="component-menu-link component-text-notice--error" data-action="deleteCanvas" data-id="<?php echo $canvas['id']; ?>" data-uuid="<?php echo htmlspecialchars($canvas['uuid']); ?>">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                                                    <div class="component-menu-link-text"><span>Eliminar lienzo</span></div>
                                                </button>
                                            <?php else: ?>
                                                <button type="button" class="component-menu-link component-text-notice--error" data-action="leaveCanvas" data-id="<?php echo $canvas['id']; ?>" data-uuid="<?php echo htmlspecialchars($canvas['uuid']); ?>">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">logout</span></div>
                                                    <div class="component-menu-link-text"><span>Salir del lienzo</span></div>
                                                </button>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    <?php endforeach; ?>
                <?php else: ?>
                    <p style="color: #666;">No hay lienzos públicos disponibles por el momento.</p>
                <?php endif; ?>

            </div>
            
        </div>

    </div>
</div>