<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;
use PDO;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
$canvasUuid = isset($_GET['uuid']) ? $_GET['uuid'] : null;
$roleId = isset($_GET['role_id']) ? (int)$_GET['role_id'] : null;

if (!$userId || !$canvasUuid || !$roleId) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/canvases/manage/roles/" . ($canvasUuid ?? ''));
    exit;
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
    echo "<div class='view-content'><p>".__('err_canvas_not_found')."</p></div>";
    return;
}
$roleData = null;
$rolePermissions = [];
try {
    $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE id = :id AND (canvas_id = :cid OR canvas_id IS NULL)");
    $stmt->execute(['id' => $roleId, 'cid' => $canvasId]);
    $roleData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($roleData) {
        $stmtPerms = $pdoCanvases->prepare("SELECT permission_id FROM canvas_role_permissions WHERE role_id = :rid");
        $stmtPerms->execute(['rid' => $roleId]);
        $rolePermissions = $stmtPerms->fetchAll(PDO::FETCH_COLUMN);
    }
} catch (\Exception $e) {}

if (!$roleData) {
    echo "<div class='view-content'><p>".__('err_role_not_found')."</p></div>";
    return;
}

$isSystemRole = (isset($roleData['is_system']) && (int)$roleData['is_system'] === 1);
$userRolesWeight = 0;
$canManageRoles = ($canvasOwnerId === $userId);

if (!$canManageRoles) {
    try {
        $stmtRole = $pdoCanvases->prepare("SELECT r.weight FROM canvas_roles r JOIN canvas_user_roles ur ON r.id = ur.role_id WHERE ur.canvas_id = :cid AND ur.user_id = :uid ORDER BY r.weight DESC LIMIT 1");
        $stmtRole->execute(['cid' => $canvasId, 'uid' => $userId]);
        $w = $stmtRole->fetchColumn();
        if ($w !== false) $userRolesWeight = (int)$w;
        
        $stmtPerm = $pdoCanvases->prepare("SELECT 1 FROM canvas_role_permissions rp JOIN canvas_permissions p ON rp.permission_id = p.id JOIN canvas_user_roles ur ON rp.role_id = ur.role_id WHERE ur.canvas_id = :cid AND ur.user_id = :uid AND p.name = 'manage_roles' LIMIT 1");
        $stmtPerm->execute(['cid' => $canvasId, 'uid' => $userId]);
        if ($stmtPerm->fetchColumn()) {
            $canManageRoles = true;
        }
    } catch (\Exception $e) {}
} else {
    $userRolesWeight = 100;
}

if (!$canManageRoles) {
    echo "<div class='view-content'><p>".__('err_no_permission')."</p></div>";
    return;
}
$allPermissions = [];
try {
    $stmt = $pdoCanvases->query("SELECT id, name, description FROM canvas_permissions ORDER BY id ASC");
    $allPermissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (\Exception $e) {}

$appUrl = defined('APP_URL') ? APP_URL : '';
$backUrl = $appUrl . '/canvases/manage/roles/' . $canvasUuid;

$rawName = $roleData['name'] ?? '';
$translatedName = '';
if (trim($rawName) !== '') {
    if ($isSystemRole) {
        $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
        $translatedName = __($roleKey);
    } else {
        $translatedName = htmlspecialchars($rawName);
    }
}
?>

<div class="view-content" data-ref="canvasRolePermissionsView" data-canvas-id="<?php echo $canvasId; ?>" data-canvas-uuid="<?php echo $canvasUuid; ?>" data-role-id="<?php echo $roleId; ?>" data-user-weight="<?php echo $userRolesWeight; ?>" data-role-weight="<?php echo (int)$roleData['weight']; ?>" data-is-system="<?php echo $isSystemRole ? '1' : '0'; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo $backUrl; ?>" data-tooltip="<?php echo __('btn_back'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 class="component-top-title" data-ref="role-name-display">
                <?php echo __('admin_edit_role_permissions_title'); ?>: <?php echo htmlspecialchars($translatedName !== '' ? $translatedName : __('admin_role_undefined')); ?>
            </h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--primary component-button--icon component-button--h40" data-action="savePermissions" data-tooltip="<?php echo __('btn_save'); ?>" data-position="bottom" <?php echo $isSystemRole ? 'disabled' : ''; ?>>
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                <div data-ref="permissions-container" class="component-list">
                    <?php if (empty($allPermissions)): ?>
                        <div class="component-empty-state">
                            <span class="material-symbols-rounded empty-icon">lock</span>
                            <h3><?php echo __('admin_perms_empty_title'); ?></h3>
                        </div>
                    <?php else: ?>
                        <?php foreach ($allPermissions as $p): ?>
                            <?php 
                                $isChecked = in_array($p['id'], $rolePermissions) ? 'checked' : ''; 
                                
                                $permName = $p['name'];
                                $cleanPermName = preg_replace('/[\s\W_]+/', '_', strtolower(trim($permName)));
                                $permNameTranslated = __('perm.' . $cleanPermName);
                                if ($permNameTranslated === 'perm.' . $cleanPermName) $permNameTranslated = str_replace('_', ' ', ucfirst($permName));

                                $permDescTranslated = '';
                                if (!empty($p['description'])) {
                                    $t = __($p['description']);
                                    if ($t !== $p['description']) $permDescTranslated = $t;
                                }
                                if (!$permDescTranslated) {
                                    $t = __('perm.desc_' . $cleanPermName);
                                    if ($t !== 'perm.desc_' . $cleanPermName) $permDescTranslated = $t;
                                }
                                if (!$permDescTranslated) {
                                    $t = __('desc_' . $cleanPermName);
                                    if ($t !== 'desc_' . $cleanPermName) $permDescTranslated = $t;
                                }
                            ?>
                            <div class="component-card--grouped">
                                <div class="component-group-item component-group-item--wrap">
                                    <div class="component-card__content">
                                        <div class="component-card__text" data-perm-key="<?php echo htmlspecialchars($p['name']); ?>">
                                            <h2 class="component-card__title" data-ref="perm-name"><?php echo htmlspecialchars($permNameTranslated); ?></h2>
                                            <?php if ($permDescTranslated): ?>
                                                <p class="component-card__description" data-ref="perm-desc"><?php echo htmlspecialchars($permDescTranslated); ?></p>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--end">
                                        <label class="component-toggle-switch">
                                            <input type="checkbox" data-ref="permCheckbox" value="<?php echo $p['id']; ?>" <?php echo $isChecked; ?> <?php echo $isSystemRole ? 'disabled' : ''; ?>>
                                            <span class="component-toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>
