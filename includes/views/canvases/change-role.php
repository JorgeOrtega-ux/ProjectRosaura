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

        // Obtener rol actual del miembro objetivo
        $stmtMember = $pdoCanvases->prepare("SELECT role FROM canvas_members WHERE canvas_id = :cid AND user_id = :uid LIMIT 1");
        $stmtMember->execute(['cid' => $canvasId, 'uid' => $targetUserId]);
        $memberData = $stmtMember->fetch(PDO::FETCH_ASSOC);
        
        if ($memberData) {
            $targetCurrentRole = $memberData['role'];
        } else {
            if ($isOwner) {
                $targetCurrentRole = 'admin';
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

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" data-ref="change-role-wrapper" 
     data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>"
     data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>"
     data-target-user-id="<?php echo htmlspecialchars($targetUserId); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="component-avatar component-avatar--md">
                    <img src="<?php echo htmlspecialchars($targetAvatar); ?>" alt="avatar">
                </div>
                <div>
                    <h1 class="component-top-title" style="margin: 0;"><?php echo htmlspecialchars($targetUsername); ?></h1>
                    <span style="font-size: 13px; color: var(--text-secondary);"><?php echo __('lbl_current_role') ?: 'Rol actual:'; ?> <strong><?php echo htmlspecialchars(ucfirst($targetCurrentRole)); ?></strong></span>
                </div>
            </div>
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

                        <div class="component-group-item component-group-item--wrap">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title" style="display: flex; align-items: center; gap: 8px;">
                                        <?php echo __('role_admin') ?: 'Administrador'; ?>
                                        <span class="material-symbols-rounded" style="font-size: 16px; color: #dc3545;" title="Control Total">shield</span>
                                    </h2>
                                    <p class="component-card__description"><?php echo __('desc_role_admin') ?: 'Control total. Puede editar, gestionar miembros, roles y configuraciones críticas.'; ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="radio" name="new_member_role" value="admin" <?php echo $targetCurrentRole === 'admin' ? 'checked' : ''; ?> class="admin-role-checkbox">
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--wrap">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title" style="display: flex; align-items: center; gap: 8px;">
                                        <?php echo __('role_editor') ?: 'Editor'; ?>
                                        <span class="material-symbols-rounded" style="font-size: 16px; color: #3b82f6;" title="Puede Editar">edit</span>
                                    </h2>
                                    <p class="component-card__description"><?php echo __('desc_role_editor') ?: 'Puede editar el contenido del lienzo, pero no puede administrar miembros ni configuraciones.'; ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="radio" name="new_member_role" value="editor" <?php echo $targetCurrentRole === 'editor' ? 'checked' : ''; ?> class="admin-role-checkbox">
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--wrap">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title" style="display: flex; align-items: center; gap: 8px;">
                                        <?php echo __('role_viewer') ?: 'Lector (Viewer)'; ?>
                                        <span class="component-badge component-badge--default" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--bg-level-2);"><?php echo __('lbl_base_role') ?: 'Rol Base'; ?></span>
                                    </h2>
                                    <p class="component-card__description"><?php echo __('desc_role_viewer') ?: 'Solo puede ver el lienzo. No puede hacer ediciones ni invitar a otros.'; ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="radio" name="new_member_role" value="viewer" <?php echo $targetCurrentRole === 'viewer' ? 'checked' : ''; ?> class="admin-role-checkbox">
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    </div>
</div>