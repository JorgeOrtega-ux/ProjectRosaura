<?php
// includes/views/admin/users/edit-status.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\Repositories\UserRepository;
use App\Core\System\DatabaseConstants as DB;

$targetUserId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($targetUserId <= 0) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$db = new DatabaseManager();
$userRepo = new UserRepository($db);
$user = $userRepo->findById($targetUserId);

if (!$user) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

// Configuración inicial de Estado (Para suspensiones)
$initialState = [
    'isSuspended' => ($user['is_suspended'] == 1) ? '1' : '0',
    'suspensionReason' => '',
    'customSuspensionReason' => '',
    'suspendedType' => $user['suspension_type'] ?: DB::SUSPENSION_TEMP,
    'suspensionDuration' => '7',
    'endDate' => '',
    'notifyUserSuspension' => true
];

// Arreglo unificado usando exclusivamente Keys
$predefinedSuspension = [
    'reason_terms', 'reason_fake_info', 'reason_illegal', 'reason_fraud_use',
    'reason_abuse', 'reason_prohibited_content', 'reason_ip_violation',
    'reason_spam_bot', 'reason_security_breach', 'reason_unauthorized_commercial', 'reason_other'
];

if ($user['suspension_reason']) {
    // Si la razón en DB es una llave oficial, la mantenemos, si no, es 'reason_other' y la metemos a custom.
    if (in_array($user['suspension_reason'], $predefinedSuspension)) {
        $initialState['suspensionReason'] = $user['suspension_reason'];
    } else {
        $initialState['suspensionReason'] = 'reason_other';
        $initialState['customSuspensionReason'] = $user['suspension_reason'];
    }
}

if ($user['is_suspended'] == 1 && $user['suspension_type'] === DB::SUSPENSION_TEMP && $user['suspension_end_date']) {
    $initialState['suspensionDuration'] = 'custom';
    $d = new DateTime($user['suspension_end_date'], new DateTimeZone('UTC'));
    $initialState['endDate'] = $d->format('Y-m-d\TH:i');
}

$initialStateJson = htmlspecialchars(json_encode($initialState), ENT_QUOTES, 'UTF-8');

// --- SSR: PRE-RENDER DE TEXTOS PARA EVITAR PARPADEO CON TRADUCCIONES ---
$displayTexts = [
    'isSuspended' => ($initialState['isSuspended'] === '1') ? __('suspension_active') : __('suspension_none'),
    'suspensionReason' => !empty($initialState['suspensionReason']) ? (in_array($initialState['suspensionReason'], $predefinedSuspension) ? __($initialState['suspensionReason']) : $initialState['suspensionReason']) : __('lbl_select_suspension_reason'),
    'suspendedType' => ($initialState['suspendedType'] === DB::SUSPENSION_PERM) ? __('suspension_perm') : __('suspension_temp'),
    'suspensionDuration' => '...',
    'endDate' => __('lbl_select_date_time')
];

$durationMap = [
    '1' => __('duration_1d'), '3' => __('duration_3d'), '7' => __('duration_7d'), 
    '14' => __('duration_14d'), '30' => __('duration_30d'), 'custom' => __('suspension_custom_time')
];
if (isset($durationMap[$initialState['suspensionDuration']])) {
    $displayTexts['suspensionDuration'] = $durationMap[$initialState['suspensionDuration']];
}

if (!empty($initialState['endDate'])) {
    $d = new DateTime($initialState['endDate']);
    $monthsStr = [__('month_jan'), __('month_feb'), __('month_mar'), __('month_apr'), __('month_may'), __('month_jun'), __('month_jul'), __('month_aug'), __('month_sep'), __('month_oct'), __('month_nov'), __('month_dec')];
    $monthIndex = (int)$d->format('n') - 1;
    $day = $d->format('j');
    $year = $d->format('Y');
    $time = $d->format('H:i');
    $displayTexts['endDate'] = "{$day} " . __('lbl_of') . " {$monthsStr[$monthIndex]} {$year}, {$time}";
}

// --- SSR: PRE-RENDER DE VISIBILIDAD ---
$vis = [
    'suspension_reason' => 'disabled', 'suspension_custom' => 'disabled', 'suspension_type' => 'disabled',
    'suspension_duration' => 'disabled', 'suspension_date' => 'disabled', 'notify_user_suspension' => 'disabled'
];

if ($initialState['isSuspended'] === '1') {
    $vis['suspension_reason'] = '';
    if ($initialState['suspensionReason'] !== '') {
        if ($initialState['suspensionReason'] === 'reason_other') $vis['suspension_custom'] = '';
        $vis['suspension_type'] = '';
        if ($initialState['suspendedType'] === DB::SUSPENSION_TEMP) {
            $vis['suspension_duration'] = '';
            if ($initialState['suspensionDuration'] === 'custom') $vis['suspension_date'] = '';
        }
    }
    $vis['notify_user_suspension'] = '';
}
?>

<div class="view-content" data-user-id="<?php echo $targetUserId; ?>" data-initial-state="<?php echo $initialStateJson; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title" data-ref="page-main-title"><?php echo __('admin_manage_status_title'); ?></h1>
        </div>
        <div class="component-top-right" data-ref="toolbar-actions-config">
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="submitSuspensionUpdate" data-ref="admin-btn-save-suspension" data-tooltip="<?php echo __('tooltip_save_status'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div data-ref="admin-status-form">
                    
                    <div class="component-setup-container active">
                        
                        <div class="component-card--grouped">
                            
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_access_restriction_title'); ?></h2>
                                        <p class="component-card__description">
                                            <?php echo ($user['role_name'] === 'founder') ? '<span class="component-text-notice--error">'.__('err_founder_suspend_immutable').'</span>' : __('desc_account_suspension'); ?>
                                        </p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger <?php echo ($user['role_name'] === 'founder') ? 'disabled-interaction' : ''; ?>" data-action="toggleModule" data-target="adminModuleSuspended">
                                            <span class="material-symbols-rounded">shield</span>
                                            <span class="component-dropdown-text" data-ref="admin-isSuspended-text"><?php echo $displayTexts['isSuspended']; ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspended">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="isSuspended" data-value="0">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock_open</span></div>
                                                        <div class="component-menu-link-text"><span><?php echo __('suspension_none'); ?></span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="isSuspended" data-value="1">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">block</span></div>
                                                        <div class="component-menu-link-text"><span><?php echo __('suspension_active'); ?></span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $vis['suspension_reason']; ?>" data-ref="section-suspended-reason">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_suspension_reason_title'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_suspension_reason_desc'); ?></p>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--start">
                                        <div class="component-dropdown-wrapper">
                                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleSuspensionReason">
                                                <span class="material-symbols-rounded">format_list_bulleted</span>
                                                <span class="component-dropdown-text" data-ref="admin-suspensionReason-text"><?php echo $displayTexts['suspensionReason']; ?></span>
                                                <span class="material-symbols-rounded">expand_more</span>
                                            </div>
                                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspensionReason">
                                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                                    <div class="component-menu-list component-menu-list--scrollable">
                                                        
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_terms">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_terms'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_fake_info">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">person_off</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_fake_info'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_illegal">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">local_police</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_illegal'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_fraud_use">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">warning</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_fraud_use'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_abuse">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">block</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_abuse'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_prohibited_content">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">report</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_prohibited_content'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_ip_violation">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">copyright</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_ip_violation'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_spam_bot">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">smart_toy</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_spam_bot'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_security_breach">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">security</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_security_breach'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_unauthorized_commercial">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">storefront</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_unauthorized_commercial'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="reason_other">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">more_horiz</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('reason_other'); ?></span></div>
                                                        </div>

                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $vis['suspension_custom']; ?>" data-ref="section-suspended-custom-reason">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content component-card__content--full">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_custom_reason_suspension_title'); ?></h2>
                                            <div class="component-card__form-area">
                                                <textarea class="component-input-field" data-ref="inp_custom_suspension_reason" placeholder="<?php echo __('placeholder_suspension_reason'); ?>"><?php echo htmlspecialchars($initialState['customSuspensionReason'] ?? '', ENT_QUOTES, 'UTF-8'); ?></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $vis['suspension_type']; ?>" data-ref="section-suspended-type">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_suspension_type_title'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_suspension_type_desc'); ?></p>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--start">
                                        <div class="component-dropdown-wrapper">
                                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleSuspendedType">
                                                <span class="material-symbols-rounded">hourglass_empty</span>
                                                <span class="component-dropdown-text" data-ref="admin-suspendedType-text"><?php echo $displayTexts['suspendedType']; ?></span>
                                                <span class="material-symbols-rounded">expand_more</span>
                                            </div>
                                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspendedType">
                                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                                    <div class="component-menu-list component-menu-list--scrollable">
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspendedType" data-value="<?php echo DB::SUSPENSION_TEMP; ?>">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('suspension_temp'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspendedType" data-value="<?php echo DB::SUSPENSION_PERM; ?>">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock_clock</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('suspension_perm'); ?></span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $vis['suspension_duration']; ?>" data-ref="section-suspended-duration">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_suspension_duration_title'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_suspension_duration_desc'); ?></p>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--start">
                                        <div class="component-dropdown-wrapper">
                                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleSuspensionDuration">
                                                <span class="material-symbols-rounded">schedule</span>
                                                <span class="component-dropdown-text" data-ref="admin-suspensionDuration-text"><?php echo $displayTexts['suspensionDuration']; ?></span>
                                                <span class="material-symbols-rounded">expand_more</span>
                                            </div>
                                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspensionDuration">
                                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                                    <div class="component-menu-list component-menu-list--scrollable">
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="1">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('duration_1d'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="3">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('duration_3d'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="7">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('duration_7d'); ?></span></div>
                                                        </div>
                                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="custom">
                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">edit_calendar</span></div>
                                                            <div class="component-menu-link-text"><span><?php echo __('suspension_custom_time'); ?></span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="<?php echo $vis['suspension_date']; ?>" data-ref="section-suspended-date">
                                <hr class="component-divider">
                                <div class="component-group-item component-group-item--stacked">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_suspension_end_title'); ?></h2>
                                            <p class="component-card__description"><?php echo __('admin_suspension_end_desc'); ?></p>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--start">
                                        <div class="component-dropdown-wrapper">
                                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleCalendar">
                                                <span class="material-symbols-rounded">calendar_month</span>
                                                <span class="component-dropdown-text" data-ref="admin-endDate-text"><?php echo $displayTexts['endDate']; ?></span>
                                            </div>
                                            <?php include __DIR__ . '/../../modules/moduleCalendar.php'; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="component-card--grouped <?php echo $vis['notify_user_suspension']; ?>" data-ref="section-notify-user-suspension">
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded">forward_to_inbox</span>
                                    </div>
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_notify_suspension_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_notify_suspension_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="chk_notify_user_suspension" <?php echo ($initialState['notifyUserSuspension']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div style="height: 40px;"></div>

                </div>
            </div>

        </div>
    </div>
</div>