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

$isEdit = false;
$roleData = [
    'id' => 0,
    'name' => '',
    'weight' => 10,
    'is_system' => 0
];

if ($roleId) {
    try {
        $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE id = :id AND (canvas_id = :cid OR canvas_id IS NULL)");
        $stmt->execute(['id' => $roleId, 'cid' => $canvasId]);
        $role = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($role) {
            $isEdit = true;
            $roleData = $role;
        } else {
            echo "<div class='view-content'><p>Rol no encontrado o no pertenece a este lienzo.</p></div>";
            return;
        }
    } catch (\Exception $e) {}
}

$isSystemRole = (isset($roleData['is_system']) && (int)$roleData['is_system'] === 1);

// Obtener permisos del usuario para UI restrictions (peso máximo, canManage)
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

if (!$canManageRoles || ($isEdit && $roleData['weight'] >= $userRolesWeight && $canvasOwnerId !== $userId)) {
     // User is allowed to view but maybe not edit if weight is higher? 
     // We will let the frontend logic disable the inputs.
}

$appUrl = defined('APP_URL') ? APP_URL : '';
$backUrl = $appUrl . '/canvases/manage/roles/' . $canvasUuid;

$rawName = $roleData['name'] ?? '';
$translatedName = '';
if (trim($rawName) !== '') {
    if ($isSystemRole) {
        $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
        $translatedName = __($roleKey);
        if ($translatedName === $roleKey) $translatedName = $rawName;
    } else {
        $translatedName = htmlspecialchars($rawName);
    }
}
?>

<div class="view-content" data-ref="canvasRoleBuilderView" data-canvas-id="<?php echo $canvasId; ?>" data-canvas-uuid="<?php echo $canvasUuid; ?>" data-role-id="<?php echo $roleData['id']; ?>" data-is-system="<?php echo $isSystemRole ? '1' : '0'; ?>" data-user-weight="<?php echo $userRolesWeight; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo $backUrl; ?>" data-tooltip="<?php echo __('btn_back') ?: 'Volver'; ?>" data-position="bottom">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 class="component-top-title" style="margin-left: 10px;" data-ref="builderTitle"><?php echo $isEdit ? (__('admin_edit_role') ?: 'Editar Rol') : (__('admin_role_builder') ?: 'Crear Rol'); ?></h1>
            <?php if ($isSystemRole): ?>
            <h1 class="component-top-title" data-ref="systemIndicator"><?php echo __('admin_role_system_limited_edit') ?: '(Rol del Sistema)'; ?></h1>
            <?php endif; ?>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--primary component-button--h40" data-action="saveRoleData">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes') ?: 'Guardar'; ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stateful">
                        <div class="active component-state-box" data-state="role-name-view" data-ref="roleNameView">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_role_name') ?: 'Nombre del Rol'; ?></h2>
                                    <span class="component-display-value" data-ref="display-role-name">
                                        <?php echo $translatedName !== '' ? htmlspecialchars($translatedName) : (__('admin_role_undefined') ?: 'Indefinido'); ?>
                                    </span>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--stretch">
                                <button type="button" class="component-button component-button--h34 <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>" data-action="toggleEditState" data-target="role-name"><?php echo __('btn_edit') ?: 'Editar'; ?></button>
                            </div>
                        </div>

                        <div class="disabled component-state-box" data-state="role-name-edit" data-ref="roleNameEdit">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_role_name') ?: 'Nombre del Rol'; ?></h2>
                                    <div class="component-edit-row">
                                        <div class="component-input-group component-input-group--h34">
                                            <input type="text" data-ref="roleNameInput" class="component-input-field component-input-field--simple" placeholder="<?php echo __('ph_role_moderator') ?: 'Ej: Moderador'; ?>" value="<?php echo htmlspecialchars($roleData['name']); ?>" <?php echo $isSystemRole ? 'disabled' : ''; ?>>
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="role-name"><?php echo __('btn_cancel') ?: 'Cancelar'; ?></button>
                                            <button type="button" class="component-button component-button--h34 component-button--dark <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>" data-action="applyRoleName"><?php echo __('btn_save') ?: 'Guardar'; ?></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_role_hierarchy_title') ?: 'Jerarquía (Peso)'; ?></h2>
                                <p class="component-card__description"><?php echo __('admin_role_hierarchy_desc') ?: 'Roles con un peso mayor pueden gestionar a los que tienen menos peso.'; ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="-5" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="-1" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_role_weight" data-val="<?php echo (int)$roleData['weight']; ?>"><?php echo (int)$roleData['weight']; ?></div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="1" data-max="99"><span class="material-symbols-rounded">chevron_right</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="5" data-max="99"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </div>
</div>
