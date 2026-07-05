<?php
// includes/views/canvases/role-builder.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\Helpers\Utils;
use PDO;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
$canvasUuid = isset($_GET['uuid']) ? $_GET['uuid'] : null;
$roleId = isset($_GET['role_id']) ? (int)$_GET['role_id'] : null;

if (!$userId || !$canvasUuid) {
    echo "<div class='view-content'><p>".__('err_unauthorized_or_missing_id')."</p></div>";
    return;
}

$db = new DatabaseManager();
$connNameCanvases = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
$pdoCanvases = $db->getConnection($connNameCanvases);

$canvasId = null;
$canvasOwnerId = null;
try {
    $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
    $stmt->execute(['uuid' => $canvasUuid]);
    $canvasData = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($canvasData) {
        $canvasId = (int)$canvasData['id'];
        $canvasOwnerId = (int)$canvasData['owner_id'];
    }
} catch (\Exception $e) {}

if (!$canvasId) {
    echo "<div class='view-content'><p>Lienzo no encontrado.</p></div>";
    return;
}

// Fetch all permissions
$allPermissions = [];
try {
    $stmt = $pdoCanvases->query("SELECT id, name FROM canvas_permissions ORDER BY id ASC");
    $allPermissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (\Exception $e) {}

// Fetch role if editing
$roleData = null;
$rolePermissions = [];
if ($roleId) {
    try {
        $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE id = :id AND canvas_id = :cid");
        $stmt->execute(['id' => $roleId, 'cid' => $canvasId]);
        $roleData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($roleData) {
            $stmtPerms = $pdoCanvases->prepare("SELECT permission_id FROM canvas_role_permissions WHERE role_id = :rid");
            $stmtPerms->execute(['rid' => $roleId]);
            $rolePermissions = $stmtPerms->fetchAll(PDO::FETCH_COLUMN);
        }
    } catch (\Exception $e) {}
    
    if (!$roleData) {
        echo "<div class='view-content'><p>Rol no encontrado o no pertenece a este lienzo.</p></div>";
        return;
    }
}

$appUrl = defined('APP_URL') ? APP_URL : '';
$backUrl = $appUrl . '/canvases/manage/roles/' . $canvasUuid;
?>
<div class="view-content" data-ref="canvasRoleBuilderView" data-canvas-id="<?php echo $canvasId; ?>" data-canvas-uuid="<?php echo $canvasUuid; ?>" data-role-id="<?php echo $roleId ?: ''; ?>">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        <div class="component-top">
            <div class="component-top-left">
                <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo $backUrl; ?>" data-tooltip="Volver" data-position="bottom">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 class="component-top-title" style="margin-left: 10px;"><?php echo $roleId ? 'Editar Rol' : 'Crear Rol'; ?></h1>
            </div>
            <div class="component-top-right">
                <button class="component-button component-button--primary component-button--h40" data-action="saveRole">
                    <span class="material-symbols-rounded">save</span>
                    <span>Guardar</span>
                </button>
            </div>
        </div>

        <div class="component-bottom" style="padding: 20px; overflow-y: auto;">
            <div class="form-group" style="max-width: 400px; margin-bottom: 20px;">
                <label class="form-label">Nombre del Rol</label>
                <input type="text" class="form-control" name="role_name" value="<?php echo htmlspecialchars($roleData['name'] ?? ''); ?>" placeholder="Ej: Constructor">
            </div>

            <div class="form-group" style="max-width: 400px; margin-bottom: 30px;">
                <label class="form-label">Peso del Rol (0-99)</label>
                <input type="number" class="form-control" name="role_weight" min="0" max="99" value="<?php echo htmlspecialchars($roleData['weight'] ?? 10); ?>" placeholder="Ej: 50">
                <small style="color: var(--text-muted); display: block; margin-top: 5px;">Roles con mayor peso dominan a roles con menor peso. El peso máximo para roles personalizados es 99.</small>
            </div>

            <h3 style="margin-bottom: 15px; font-size: 16px; font-weight: 500;">Permisos</h3>
            <div class="permissions-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                <?php foreach ($allPermissions as $perm): 
                    $permName = $perm['name'];
                    // Translated name based on desc_key
                    $translatedDesc = __('desc_' . $permName);
                    if ($translatedDesc === 'desc_' . $permName) $translatedDesc = str_replace('_', ' ', ucfirst($permName));
                    
                    $isChecked = in_array($perm['id'], $rolePermissions) ? 'checked' : '';
                ?>
                <label class="component-checkbox-card" style="display: flex; align-items: flex-start; padding: 15px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s;">
                    <input type="checkbox" name="permissions[]" value="<?php echo $perm['id']; ?>" <?php echo $isChecked; ?> style="margin-top: 4px; margin-right: 12px; transform: scale(1.2);">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 4px;"><?php echo htmlspecialchars($translatedDesc); ?></div>
                        <div style="font-size: 12px; color: var(--text-muted); font-family: monospace;"><?php echo $permName; ?></div>
                    </div>
                </label>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>
