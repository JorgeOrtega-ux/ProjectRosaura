<?php
// includes/views/canvases/change-role.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
// Extraemos del router los parámetros de la URL adaptados a UUID
$canvasUuid = isset($_GET['uuid']) ? $_GET['uuid'] : null;
$targetUserUuid = isset($_GET['user_uuid']) ? $_GET['user_uuid'] : null;

$db = new DatabaseManager();
$connNameCanvases = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
$connNameIdentity = defined('App\Core\System\DatabaseConstants::CONN_IDENTITY') ? App\Core\System\DatabaseConstants::CONN_IDENTITY : 'identity';

$canvasId = null;
$targetUserId = null;
$targetCurrentRole = null;
$targetUsername = '';
$targetAvatar = defined('APP_URL') ? APP_URL . '/public/assets/img/fallbacks/avatar-default.png' : '';
$isOwner = false;

if (!$userId || !$canvasUuid || !$targetUserUuid) {
    echo "<div class='view-content'><p>".__('err_unauthorized_or_missing_id')."</p></div>";
    return;
}

// 1. Obtener detalles del perfil (Identity) utilizando el UUID proporcionado
try {
    $pdoIdentity = $db->getConnection($connNameIdentity);
    $stmtUser = $pdoIdentity->prepare("SELECT id, username, profile_picture FROM users WHERE uuid = :uuid LIMIT 1");
    $stmtUser->execute(['uuid' => $targetUserUuid]);
    $userData = $stmtUser->fetch(PDO::FETCH_ASSOC);
    
    if ($userData) {
        $targetUserId = (int)$userData['id'];
        $targetUsername = !empty($userData['username']) ? $userData['username'] : 'Usuario #' . $targetUserId;
        if (!empty($userData['profile_picture'])) {
            $targetAvatar = $userData['profile_picture'];
        }
    } else {
        echo "<div class='view-content'><p>El usuario especificado no existe o no es válido.</p></div>";
        return;
    }
} catch (\Exception $e) {
    echo "<div class='view-content'><p>Error de conexión con el módulo de identidad.</p></div>";
    return;
}

// 2. Obtener ID del lienzo y verificar membresía actual del miembro objetivo
try {
    $pdoCanvases = $db->getConnection($connNameCanvases);
    
    // Obtener info del lienzo
    $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
    $stmt->execute(['uuid' => $canvasUuid]);
    $canvasData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($canvasData) {
        $canvasId = (int)$canvasData['id'];
        
        // Identificamos si es el dueño
        if ($canvasData['owner_id'] == $targetUserId) {
            $isOwner = true;
        }

        // Obtener roles actuales del miembro objetivo
        $stmtMember = $pdoCanvases->prepare("SELECT role_id FROM canvas_user_roles WHERE canvas_id = :cid AND user_id = :uid");
        $stmtMember->execute(['cid' => $canvasId, 'uid' => $targetUserId]);
        $memberRoles = $stmtMember->fetchAll(PDO::FETCH_COLUMN);
        
        if (!empty($memberRoles)) {
            $targetCurrentRoles = array_map('intval', $memberRoles);
        } else {
            if ($isOwner) {
                // Owner might not be in user_roles explicitly, or they have a max weight role
                $targetCurrentRoles = [-1]; // Special indicator
            } else {
                echo "<div class='view-content'><p>El usuario especificado no pertenece a este lienzo.</p></div>";
                return;
            }
        }
    } else {
        echo "<div class='view-content'><p>".__('err_canvas_not_found')."</p></div>";
        return;
    }
} catch (\Exception $e) {
    echo "<div class='view-content'><p>Error interno al procesar los datos de membresía.</p></div>";
    return;
}

// Fetch all available roles for this canvas
$availableRoles = [];
try {
    $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE canvas_id IS NULL OR canvas_id = :cid ORDER BY weight DESC");
    $stmt->execute(['cid' => $canvasId]);
    $availableRoles = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (\Exception $e) {}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" data-ref="change-role-wrapper" 
     data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>"
     data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>"
     data-target-user-id="<?php echo htmlspecialchars($targetUserId); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title">Gestionar Rol: <?php echo htmlspecialchars($targetUsername); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40" data-action="cancelRole" data-tooltip="<?php echo __('btn_cancel') ?: 'Cancelar'; ?>" data-position="bottom">
                <span class="material-symbols-rounded">close</span>
            </button>
            <button class="component-button component-button--icon component-button--h40" data-action="saveRole" data-tooltip="<?php echo __('btn_save_changes') ?: 'Guardar Cambios'; ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <?php if ($isOwner): ?>
                <div style="margin-bottom: 20px; padding: 12px 15px; border-radius: 8px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #b45309; display: flex; align-items: center; gap: 10px;">
                    <span class="material-symbols-rounded" style="font-size: 20px;">info</span>
                    <span style="font-size: 13.5px;"><?php echo __('msg_owner_role_warning') ?: 'Este usuario es el creador principal. Es probable que el sistema no permita reducir sus privilegios.'; ?></span>
                </div>
                <?php endif; ?>

                <div data-ref="admin-roles-form">
                    <div class="component-card--grouped">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_select_new_role') ?: 'Selecciona el nuevo nivel de acceso'; ?></h2>
                                    <p class="component-card__description" data-ref="admin-role-desc">
                                        Modifica el rol de este miembro dentro del lienzo actual de forma instantánea.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <?php foreach ($availableRoles as $role): 
                            $rawName = $role['name'];
                            $isSystemFlag = $role['is_system'] ?? 0;
                            if ($isSystemFlag) {
                                $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
                                $translatedName = __($roleKey);
                                if ($translatedName === $roleKey) $translatedName = $rawName;
                                $desc = __('desc_role_' . strtolower(trim($rawName))) ?: 'Rol del sistema';
                            } else {
                                $translatedName = htmlspecialchars($rawName);
                                $desc = 'Rol personalizado (Peso: ' . $role['weight'] . ')';
                            }
                            
                            $isChecked = in_array((int)$role['id'], $targetCurrentRoles ?? []) ? 'checked' : '';
                        ?>
                        <div class="component-group-item component-group-item--wrap">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title" style="display: flex; align-items: center; gap: 8px;">
                                        <?php echo $translatedName; ?>
                                        <span class="material-symbols-rounded" style="font-size: 16px; color: var(--text-color-muted);" title="Hierarchy: <?php echo $role['weight']; ?>"><?php echo $isSystemFlag ? 'shield' : 'person'; ?></span>
                                    </h2>
                                    <p class="component-card__description"><?php echo htmlspecialchars($desc); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" name="new_member_roles[]" value="<?php echo $role['id']; ?>" <?php echo $isChecked; ?> class="admin-role-checkbox">
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        <hr class="component-divider">
                        <?php endforeach; ?>

                    </div>
                </div>

            </div>
        </div>
    </div>
</div>