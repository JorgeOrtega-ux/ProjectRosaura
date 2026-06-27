<?php
// includes/views/canvases/resize.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use PDO;

// Obtenemos el ID del usuario en sesión
$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo "<div class='view-content'><p>".__('err_unauthorized')."</p></div>";
    return;
}

// Extraer el UUID de la URL. Asumiendo formato /canvases/resize/:uuid
$uriParts = explode('/', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$uuid = end($uriParts);

if (empty($uuid) || $uuid === 'resize') {
    echo "<div class='view-content'><p>Lienzo no especificado.</p></div>";
    return;
}

$db = new DatabaseManager();
$connName = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
$pdo = $db->getConnection($connName); 
$tblCanvases = defined('App\Core\System\DatabaseConstants::TBL_CANVASES') ? App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';

// Validar permisos
$userPermissions = $_SESSION['user_permissions'] ?? [];
$isAdmin = in_array('manage_canvases', $userPermissions) || 
           in_array('access_admin_panel', $userPermissions) || 
           in_array('canvases.manage_official', $userPermissions);

if ($isAdmin) {
    $sql = "SELECT id, uuid, name, size FROM {$tblCanvases} WHERE uuid = :uuid LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uuid' => $uuid]);
} else {
    $sql = "SELECT id, uuid, name, size FROM {$tblCanvases} WHERE uuid = :uuid AND owner_id = :uid LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uuid' => $uuid, 'uid' => $userId]);
}

$canvas = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$canvas) {
    echo "<div class='view-content'><p>Lienzo no encontrado o sin permisos suficientes.</p></div>";
    return;
}

$currentSize = $canvas['size'];
$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" data-ref="canvas-resize-wrapper">
    
    <div class="component-top">
        <div class="component-top-left" style="display: flex; align-items: center; gap: 16px;">
            <button class="component-button component-button--icon component-button--transparent" data-nav="<?php echo $appUrl; ?>/canvases/manage">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <div>
                <h1 class="component-top-title">Expansión de Lienzo</h1>
            </div>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--primary component-button--h40" data-action="applyResize">
                <span class="material-symbols-rounded">save</span>
                Guardar cambios
            </button>
        </div>
    </div>

    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title">Configuración de Resolución</h1>
                <p class="component-page-description">Modifica el tamaño en vivo del lienzo <strong><?php echo htmlspecialchars($canvas['name']); ?></strong>.</p>
            </div>

            <div class="component-card--grouped" id="resizeCanvasContainer" data-canvas-id="<?php echo htmlspecialchars($canvas['id']); ?>" data-current-size="<?php echo htmlspecialchars($currentSize); ?>">
                
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Tamaño en píxeles</h2>
                            <p class="component-card__description">Selecciona la nueva resolución para tu lienzo. Los usuarios en línea experimentarán el cambio sin necesidad de recargar.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSizeResize">
                                <?php 
                                    $icon = 'crop_square';
                                    if ($currentSize == 128) $icon = 'aspect_ratio';
                                    if ($currentSize == 264) $icon = 'grid_4x4';
                                    if ($currentSize == 512) $icon = 'grid_on';
                                ?>
                                <span class="material-symbols-rounded" data-ref="resize-icon"><?php echo $icon; ?></span>
                                <span class="component-dropdown-text" data-ref="text-size-resize"><?php echo $currentSize; ?>x<?php echo $currentSize; ?></span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSizeResize">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link <?php echo $currentSize == 64 ? 'active' : ''; ?>" data-action="selectValue" data-type="size" data-value="64" data-label="64x64" data-icon="crop_square">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">crop_square</span></div>
                                            <div class="component-menu-link-text"><span>64x64</span></div>
                                        </div>
                                        <div class="component-menu-link <?php echo $currentSize == 128 ? 'active' : ''; ?>" data-action="selectValue" data-type="size" data-value="128" data-label="128x128" data-icon="aspect_ratio">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">aspect_ratio</span></div>
                                            <div class="component-menu-link-text"><span>128x128</span></div>
                                        </div>
                                        <div class="component-menu-link <?php echo $currentSize == 264 ? 'active' : ''; ?>" data-action="selectValue" data-type="size" data-value="264" data-label="264x264" data-icon="grid_4x4">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">grid_4x4</span></div>
                                            <div class="component-menu-link-text"><span>264x264</span></div>
                                        </div>
                                        <div class="component-menu-link <?php echo $currentSize == 512 ? 'active' : ''; ?>" data-action="selectValue" data-type="size" data-value="512" data-label="512x512" data-icon="grid_on">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">grid_on</span></div>
                                            <div class="component-menu-link-text"><span>512x512</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="component-group-item component-group-item--wrap" data-ref="resize-warning" style="display: none; background-color: rgba(239, 68, 68, 0.05); border-top: 1px solid rgba(239, 68, 68, 0.2);">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title" style="color: var(--color-danger, #ef4444); display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-rounded" style="font-size: 20px;">warning</span> Atención
                            </h2>
                            <p class="component-card__description" style="color: var(--color-danger, #ef4444); margin-top: 4px;">Al reducir el tamaño, se perderá de forma permanente el arte y el contenido que esté pintado fuera del nuevo límite.</p>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    </div>
</div>