<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
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
try {
    $pdoIdentity = $db->getConnection($connNameIdentity);
    $stmtUser = $pdoIdentity->prepare("SELECT id, username, profile_picture FROM users WHERE uuid = :uuid LIMIT 1");
    $stmtUser->execute(['uuid' => $targetUserUuid]);
    $userData = $stmtUser->fetch(PDO::FETCH_ASSOC);
    
    if ($userData) {
        $targetUserId = (int)$userData['id'];
        $targetUsername = !empty($userData['username']) ? $userData['username'] : (__('user') ?: 'User') . ' #' . $targetUserId;
        if (!empty($userData['profile_picture'])) {
            $targetAvatar = $userData['profile_picture'];
        }
    } else {
        echo "<div class='view-content'><p>".__('err_invalid_user')."</p></div>";
        return;
    }
} catch (\Exception $e) {
    echo "<div class='view-content'><p>".__('err_identity_conn')."</p></div>";
    return;
}
try {
    $pdoCanvases = $db->getConnection($connNameCanvases);
    $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
    $stmt->execute(['uuid' => $canvasUuid]);
    $canvasData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($canvasData) {
        $canvasId = (int)$canvasData['id'];
        $canvasOwnerId = (int)$canvasData['owner_id'];

        $ownerTier = 0;
        if ($canvasOwnerId !== null) {
            try {
                $stmtUserTier = $pdoIdentity->prepare("SELECT subscription_tier FROM users WHERE id = :uid LIMIT 1");
                $stmtUserTier->execute(['uid' => $canvasOwnerId]);
                $tierVal = $stmtUserTier->fetchColumn();
                if ($tierVal !== false) {
                    $ownerTier = (int)$tierVal;
                }
            } catch (\Exception $e) {}
        }

        $isAdmin = in_array('manage_canvases', $_SESSION['user_permissions'] ?? []) || 
                   in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $_SESSION['user_permissions'] ?? []) || 
                   in_array(\App\Core\System\PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $_SESSION['user_permissions'] ?? []);

        $hasAdvancedRoles = $isAdmin || ($ownerTier >= 2);
        if (!$hasAdvancedRoles) {
            echo "<div class='view-content'><p>".__('err_plan_custom_roles')."</p></div>";
            return;
        }

        if ($canvasData['owner_id'] == $targetUserId) {
            $isOwner = true;
        }
        $stmtMember = $pdoCanvases->prepare("SELECT role_id FROM canvas_user_roles WHERE canvas_id = :cid AND user_id = :uid");
        $stmtMember->execute(['cid' => $canvasId, 'uid' => $targetUserId]);
        $memberRoles = $stmtMember->fetchAll(PDO::FETCH_COLUMN);
        
        if (!empty($memberRoles)) {
            $targetCurrentRoles = array_map('intval', $memberRoles);
        } else {
            if ($isOwner) {
                $targetCurrentRoles = [-1];
            } else {
                echo "<div class='view-content'><p>".__('err_user_not_member')."</p></div>";
                return;
            }
        }
    } else {
        echo "<div class='view-content'><p>".__('err_canvas_not_found')."</p></div>";
        return;
    }
} catch (\Exception $e) {
    echo "<div class='view-content'><p>".__('err_internal_membership')."</p></div>";
    return;
}
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
            <h1 class="component-top-title"><?php echo __('lbl_manage_role') . ': ' . htmlspecialchars($targetUsername); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40" data-action="cancelRole" data-tooltip="<?php echo __('btn_cancel'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">close</span>
            </button>
            <button class="component-button component-button--icon component-button--h40" data-action="saveRole" data-tooltip="<?php echo __('btn_save_changes'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <?php if ($isOwner): ?>
                <div>
                    <span class="material-symbols-rounded">info</span>
                    <span><?php echo __('msg_owner_role_warning'); ?></span>
                </div>
                <?php endif; ?>

                <div data-ref="admin-roles-form">
                    <div class="component-card--grouped">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_select_new_role'); ?></h2>
                                    <p class="component-card__description" data-ref="admin-role-desc">
                                        <?php echo __('desc_manage_role'); ?>
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
                                $desc = __('desc_role_' . strtolower(trim($rawName)));
                            } else {
                                $translatedName = htmlspecialchars($rawName);
                                $desc = __('lbl_custom_role_weight') . ' ' . $role['weight'];
                            }
                            
                            $isChecked = in_array((int)$role['id'], $targetCurrentRoles ?? []) ? 'checked' : '';
                        ?>
                        <div class="component-group-item component-group-item--wrap">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">
                                        <?php echo $translatedName; ?>
                                        <span class="material-symbols-rounded" title="Hierarchy: <?php echo $role['weight']; ?>"><?php echo $isSystemFlag ? 'shield' : 'person'; ?></span>
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