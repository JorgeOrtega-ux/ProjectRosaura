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
        
        // Identificamos si es el dueño para mostrar una advertencia visual, pero SIN bloquear la vista
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
            // Si el owner no está en la tabla canvas_members (algunos sistemas lo omiten), asumimos su rol como admin
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

<div class="view-content" style="position: relative;">
    <div class="component-wrapper component-wrapper--constrained" data-ref="change-role-wrapper" 
         data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>"
         data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>"
         data-target-user-id="<?php echo htmlspecialchars($targetUserId); ?>">
        
        <div class="component-top">
            <div class="component-top-left">
                <button class="component-button component-button--icon component-button--h40" data-action="cancelRole" data-tooltip="<?php echo __('btn_back') ?: 'Regresar'; ?>" data-position="right">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 class="component-top-title" style="margin-left: 10px;"><?php echo __('title_change_role') ?: 'Modificar Rol'; ?></h1>
            </div>
        </div>

        <div class="component-body">
            
            <?php if ($isOwner): ?>
            <div style="margin-bottom: 20px; padding: 12px 15px; border-radius: 8px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #b45309; display: flex; align-items: center; gap: 10px;">
                <span class="material-symbols-rounded" style="font-size: 20px;">info</span>
                <span style="font-size: 13.5px;"><?php echo __('msg_owner_role_warning') ?: 'Este usuario es el creador principal. Es probable que el sistema no permita reducir sus privilegios.'; ?></span>
            </div>
            <?php endif; ?>

            <div class="component-user-summary" style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px; padding: 15px; background: var(--bg-surface-2); border-radius: 8px;">
                <div class="component-avatar component-avatar--md">
                    <img src="<?php echo htmlspecialchars($targetAvatar); ?>" alt="avatar">
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary);"><?php echo htmlspecialchars($targetUsername); ?></h3>
                    <span style="font-size: 13px; color: var(--text-secondary);"><?php echo __('lbl_current_role') ?: 'Rol actual:'; ?> <strong><?php echo htmlspecialchars(ucfirst($targetCurrentRole)); ?></strong></span>
                </div>
            </div>

            <div class="component-form-group">
                <label class="component-label"><?php echo __('lbl_select_new_role') ?: 'Selecciona el nuevo nivel de acceso'; ?></label>
                
                <div class="component-radio-cards" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                    
                    <label class="component-radio-card <?php echo $targetCurrentRole === 'viewer' ? 'active' : ''; ?>">
                        <input type="radio" name="new_member_role" value="viewer" <?php echo $targetCurrentRole === 'viewer' ? 'checked' : ''; ?>>
                        <div class="radio-card-content">
                            <span class="material-symbols-rounded radio-icon" style="color: #6b7280;">visibility</span>
                            <div class="radio-details">
                                <span class="radio-title"><?php echo __('role_viewer') ?: 'Lector (Viewer)'; ?></span>
                                <span class="radio-description"><?php echo __('desc_role_viewer') ?: 'Solo puede ver el lienzo. No puede hacer ediciones ni invitar a otros.'; ?></span>
                            </div>
                        </div>
                    </label>

                    <label class="component-radio-card <?php echo $targetCurrentRole === 'editor' ? 'active' : ''; ?>">
                        <input type="radio" name="new_member_role" value="editor" <?php echo $targetCurrentRole === 'editor' ? 'checked' : ''; ?>>
                        <div class="radio-card-content">
                            <span class="material-symbols-rounded radio-icon" style="color: #3b82f6;">edit</span>
                            <div class="radio-details">
                                <span class="radio-title"><?php echo __('role_editor') ?: 'Editor'; ?></span>
                                <span class="radio-description"><?php echo __('desc_role_editor') ?: 'Puede editar el contenido del lienzo, pero no puede administrar miembros ni configuraciones.'; ?></span>
                            </div>
                        </div>
                    </label>

                    <label class="component-radio-card <?php echo $targetCurrentRole === 'admin' ? 'active' : ''; ?>">
                        <input type="radio" name="new_member_role" value="admin" <?php echo $targetCurrentRole === 'admin' ? 'checked' : ''; ?>>
                        <div class="radio-card-content">
                            <span class="material-symbols-rounded radio-icon" style="color: #dc3545;">shield</span>
                            <div class="radio-details">
                                <span class="radio-title"><?php echo __('role_admin') ?: 'Administrador'; ?></span>
                                <span class="radio-description"><?php echo __('desc_role_admin') ?: 'Control total. Puede editar, gestionar miembros, roles y configuraciones críticas.'; ?></span>
                            </div>
                        </div>
                    </label>

                </div>
            </div>

        </div>

        <div class="component-bottom" style="margin-top: 30px; display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="component-button component-button--secondary" data-action="cancelRole">
                <?php echo __('btn_cancel') ?: 'Cancelar'; ?>
            </button>
            <button type="button" class="component-button component-button--primary" data-action="saveRole">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes') ?: 'Guardar Cambios'; ?>
            </button>
        </div>

    </div>
</div>

<style>
.component-radio-cards .component-radio-card {
    display: block;
    cursor: pointer;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 15px;
    background: var(--bg-surface-1);
    transition: all 0.2s ease;
}
.component-radio-cards .component-radio-card:hover {
    border-color: var(--primary-color);
}
.component-radio-cards .component-radio-card input[type="radio"] {
    display: none;
}
.component-radio-cards .component-radio-card input[type="radio"]:checked + .radio-card-content {
    opacity: 1;
}
.component-radio-cards .component-radio-card:has(input:checked) {
    border-color: var(--primary-color);
    background: rgba(var(--primary-color-rgb), 0.05);
}
.radio-card-content {
    display: flex;
    align-items: center;
    gap: 15px;
    opacity: 0.8;
}
.radio-card-content .radio-icon {
    font-size: 28px;
    background: var(--bg-surface-2);
    padding: 10px;
    border-radius: 50%;
}
.radio-details {
    display: flex;
    flex-direction: column;
}
.radio-details .radio-title {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 15px;
}
.radio-details .radio-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
}
</style>