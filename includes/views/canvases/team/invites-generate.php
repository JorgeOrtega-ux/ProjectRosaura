<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use PDO;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
$canvasUuid = isset($_GET['uuid']) ? $_GET['uuid'] : null;

$db = new DatabaseManager();
$connNameCanvases = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';

$canvasId = null;
$canvasOwnerId = null;

if ($canvasUuid) {
    try {
        $pdoCanvases = $db->getConnection($connNameCanvases);
        $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
        $stmt->execute(['uuid' => $canvasUuid]);
        $canvasData = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($canvasData) {
            $canvasId = (int)$canvasData['id'];
            $canvasOwnerId = isset($canvasData['owner_id']) ? (int)$canvasData['owner_id'] : null;
        }
    } catch (\Exception $e) {
    }
}

if (!$userId || !$canvasId) {
    echo "<div class='view-content'><p>".__('err_canvas_not_found_or_no_access')."</p></div>";
    return;
}

// Verify ownership: only the canvas owner can generate invites
if ((int)$userId !== $canvasOwnerId) {
    $userPerms = $_SESSION['user_permissions'] ?? $_SESSION['permissions'] ?? [];
    $isAdmin = is_array($userPerms) && (in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $userPerms) || in_array(\App\Core\System\PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $userPerms));
    if (!$isAdmin || $canvasOwnerId !== null) {
        echo "<div class='view-content'><p>".__('err_unauthorized')."</p></div>";
        return;
    }
}

$availableRoles = [];
try {
    $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE canvas_id IS NULL OR canvas_id = :cid ORDER BY weight DESC");
    $stmt->execute(['cid' => $canvasId]);
    $availableRoles = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (\Exception $e) {}

$defaultRole = null;
if (!empty($availableRoles)) {
    foreach ($availableRoles as $r) {
        if (strtolower($r['name']) === 'viewer') {
            $defaultRole = $r;
            break;
        }
    }
    if (!$defaultRole) {
        $defaultRole = end($availableRoles);
    }
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" data-ref="manage-invites-generate-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>" data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('lbl_generate_new_invite'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--h40 component-button--primary" data-action="submitGenerateInvite">
                <span class="material-symbols-rounded">add_link</span>
                <?php echo __('btn_generate_invite'); ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                <div id="form-generate-invite" class="component-form">
                    <div class="component-card--grouped">
                        
                                                <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_role_to_grant'); ?></h2>
                                    <p class="component-card__description"><?php echo __('desc_invite_role'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-dropdown-wrapper">
                                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleRole">
                                        <?php 
                                            $defIcon = ($defaultRole['is_system'] ?? 0) ? 'shield' : 'person';
                                            $defLabel = $defaultRole['name'] ?? __('lbl_select');
                                            if ($defaultRole && ($defaultRole['is_system'] ?? 0)) {
                                                $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($defLabel)));
                                                $translatedName = __($roleKey);
                                                if ($translatedName !== $roleKey) $defLabel = $translatedName;
                                            }
                                        ?>
                                        <span class="material-symbols-rounded" data-ref="icon-role"><?php echo $defIcon; ?></span>
                                        <span class="component-dropdown-text" data-ref="text-role"><?php echo htmlspecialchars($defLabel); ?></span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>
                                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleRole">
                                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list component-menu-list--scrollable">
                                                <?php foreach ($availableRoles as $role): 
                                                    $rawName = $role['name'];
                                                    $isSystemFlag = $role['is_system'] ?? 0;
                                                    $icon = $isSystemFlag ? 'shield' : 'person';
                                                    if ($isSystemFlag) {
                                                        $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
                                                        $translatedName = __($roleKey);
                                                    } else {
                                                        $translatedName = htmlspecialchars($rawName);
                                                    }
                                                    $nameLower = strtolower(trim($rawName));
                                                    $isHighRole = in_array($nameLower, ['owner', 'propietario', 'superadmin', 'superadministrador']) || (isset($role['weight']) && (int)$role['weight'] >= 100);
                                                    
                                                    $isActive = ($defaultRole && $defaultRole['id'] == $role['id']) ? 'active' : '';
                                                    $isDisabled = $isHighRole ? 'disabled-interaction' : '';
                                                ?>
                                                    <div class="component-menu-link <?php echo $isActive . ' ' . $isDisabled; ?>" data-action="selectInviteRole" data-value="<?php echo htmlspecialchars($role['id']); ?>" data-label="<?php echo htmlspecialchars($translatedName); ?>" data-icon="<?php echo $icon; ?>" <?php if($isHighRole) echo 'data-tooltip="' . htmlspecialchars(__('err_cannot_generate_invite_role')) . '" data-position="right"'; ?>>
                                                        <div class="component-menu-link-icon">
                                                            <span class="material-symbols-rounded"><?php echo $icon; ?></span>
                                                        </div>
                                                        <div class="component-menu-link-text">
                                                            <span><?php echo $translatedName; ?></span>
                                                        </div>
                                                    </div>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <input type="hidden" name="role" data-ref="hidden-role-id" value="<?php echo $defaultRole ? htmlspecialchars($defaultRole['id']) : ''; ?>" required>
                            </div>
                        </div>

                        <hr class="component-divider">

                                                <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_uses_limit'); ?></h2>
                                    <p class="component-card__description"><?php echo __('desc_uses_limit'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustMaxUses" data-step="-5" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustMaxUses" data-step="-1" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="val_max_uses" data-val="0"><?php echo __('lbl_no_limit'); ?></div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustMaxUses" data-step="1" data-max="999"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustMaxUses" data-step="5" data-max="999"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                                <input type="hidden" name="max_uses" data-ref="hidden-max-uses" value="">
                            </div>
                        </div>

                        <hr class="component-divider">

                                                <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_expiration_date'); ?></h2>
                                    <p class="component-card__description"><?php echo __('desc_expiration_date'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-dropdown-wrapper">
                                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="inviteModuleCalendar">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span class="component-dropdown-text" data-ref="invite-endDate-text"><?php echo __('lbl_no_expiration'); ?></span>
                                    </div>
                                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="inviteModuleCalendar">
                                        <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            
                                            <div class="component-calendar">
                                                <div class="component-calendar-header">
                                                    <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                                        <span class="material-symbols-rounded">chevron_left</span>
                                                    </button>
                                                    <div class="component-calendar-title" data-ref="calendar-title"></div>
                                                    <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                                        <span class="material-symbols-rounded">chevron_right</span>
                                                    </button>
                                                </div>

                                                <div class="component-calendar-weekdays">
                                                    <span><?php echo __('day_su_min'); ?></span><span><?php echo __('day_mo_min'); ?></span><span><?php echo __('day_tu_min'); ?></span><span><?php echo __('day_we_min'); ?></span><span><?php echo __('day_th_min'); ?></span><span><?php echo __('day_fr_min'); ?></span><span><?php echo __('day_sa_min'); ?></span>
                                                </div>

                                                <div class="component-calendar-days" data-ref="calendar-days"></div>

                                                <div class="component-calendar-time">
                                                    <div class="component-input-group component-input-group--h34">
                                                        <input type="number" data-ref="calendar-hours" class="component-input-field component-input-field--simple" placeholder="HH" min="0" max="23" value="00">
                                                    </div>
                                                    <span>:</span>
                                                    <div class="component-input-group component-input-group--h34">
                                                        <input type="number" data-ref="calendar-minutes" class="component-input-field component-input-field--simple" placeholder="MM" min="0" max="59" value="00">
                                                    </div>
                                                </div>

                                                <div class="component-calendar-actions">
                                                    <button type="button" class="component-button component-button--h30" data-action="calendarClear"><?php echo __('lbl_no_expiration'); ?></button>
                                                    <div>
                                                        <button type="button" class="component-button component-button--h30" data-action="calendarCancel"><?php echo __('btn_cancel'); ?></button>
                                                        <button type="button" class="component-button component-button--h30 component-button--dark" data-action="calendarConfirm"><?php echo __('btn_accept'); ?></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <input type="hidden" name="expires_at" data-ref="hidden-expires-at" value="">
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
