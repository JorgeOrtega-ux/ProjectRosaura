<?php
// includes/views/admin/roles/role-permissions.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Config\RedisCache;
use App\Core\Repositories\RoleRepository;

// 1. VALIDACIÓN ESTRICTA A NIVEL SERVIDOR
$userPermissions = $_SESSION['user_permissions'] ?? [];
if (!in_array('manage_roles_structure', $userPermissions)) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-roles");
    exit;
}

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-roles");
    exit;
}

$roleId = (int)$_GET['id'];

// 2. HIDRATACIÓN DE DATOS (SERVER-SIDE)
$dbManager = new DatabaseManager();
$redis = new RedisCache();
$roleRepo = new RoleRepository($dbManager, $redis);

$role = $roleRepo->findById($roleId);
if (!$role) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-roles");
    exit;
}

// CORRECCIÓN: Obtener el peso del administrador y verificar si es Super Admin (ID 4) usando la sesión multi-cuenta
$currentUserWeight = isset($_SESSION['user_role_weight']) ? (int)$_SESSION['user_role_weight'] : 0;
$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;
$targetRoleWeight = (int)$role['weight'];

$allPermissions = $roleRepo->getAllPermissions();
$rolePermissionsData = $roleRepo->getRolePermissions($roleId);
$rolePermissionsIds = array_column($rolePermissionsData, 'id');
?>
<div class="view-content" data-role-id="<?php echo $roleId; ?>" data-role-weight="<?php echo $targetRoleWeight; ?>" data-current-user-weight="<?php echo $currentUserWeight; ?>" data-is-superadmin="<?php echo $isSuperAdmin; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <?php 
            $rawName = $role['name'] ?? '';
            $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
            ?>
            <h1 class="component-top-title" data-ref="role-name-display">
                <?php echo __('admin_edit_role_permissions_title'); ?>: <?php echo htmlspecialchars(__($roleKey)); ?>
            </h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--primary component-button--icon component-button--h40" data-action="savePermissions" data-tooltip="<?php echo __('btn_save'); ?>" data-position="bottom">
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
                                $isChecked = in_array($p['id'], $rolePermissionsIds) ? 'checked' : ''; 
                                $isCritical = isset($p['is_critical']) ? (int)$p['is_critical'] : 0;
                                
                                // CORRECCIÓN: Generación dinámica de claves de traducción "0 textos hardcodeados"
                                $cleanPermName = preg_replace('/[\s\W_]+/', '_', strtolower(trim($p['name'])));
                                $permNameTranslated = __('perm.' . $cleanPermName);
                                $permDescTranslated = __('perm.desc_' . $cleanPermName);
                            ?>
                            <div class="component-card--grouped">
                                <div class="component-group-item component-group-item--wrap">
                                    <div class="component-card__content">
                                        <div class="component-card__text" data-perm-key="<?php echo htmlspecialchars($p['name']); ?>">
                                            <h2 class="component-card__title" data-ref="perm-name"><?php echo htmlspecialchars($permNameTranslated); ?></h2>
                                            <p class="component-card__description" data-ref="perm-desc"><?php echo htmlspecialchars($permDescTranslated); ?></p>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--end">
                                        <label class="component-toggle-switch">
                                            <input type="checkbox" data-ref="permCheckbox" value="<?php echo $p['id']; ?>" data-is-critical="<?php echo $isCritical; ?>" <?php echo $isChecked; ?>>
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