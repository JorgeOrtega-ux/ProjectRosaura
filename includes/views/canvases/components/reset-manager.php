<?php
// includes/views/canvases/components/reset-manager.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$canvasUuid = $_GET['uuid'] ?? null;
$canvasId = null;
$resetSettings = [
    'is_active' => false,
    'next_reset_at' => null,
    'take_snapshot' => true,
    'timer_action' => 'restart',
];

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
$userPermissions = $_SESSION['user_permissions'] ?? [];
$canManageOfficial = in_array('manage_canvases', $userPermissions)
    || in_array('access_admin_panel', $userPermissions)
    || in_array('canvases.manage_official', $userPermissions);

if ($canvasUuid && $userId) {
    try {
        $db = new DatabaseManager();
        $pdo = $db->getConnection(DB::CONN_CANVASES);

        $stmt = $pdo->prepare('SELECT id, owner_id FROM ' . DB::TBL_CANVASES . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $canvasUuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($canvas) {
            $isOwner = ((int)$canvas['owner_id'] === (int)$userId)
                || ($canvas['owner_id'] === null && $canManageOfficial);

            if ($isOwner) {
                $canvasId = (int)$canvas['id'];

                $stmtSettings = $pdo->prepare('SELECT is_active, next_reset_at, take_snapshot, timer_action FROM canvas_reset_settings WHERE canvas_id = :cid LIMIT 1');
                $stmtSettings->execute(['cid' => $canvasId]);
                $row = $stmtSettings->fetch(PDO::FETCH_ASSOC);

                if ($row) {
                    $resetSettings['is_active'] = (bool)$row['is_active'];
                    $resetSettings['next_reset_at'] = $row['next_reset_at'];
                    $resetSettings['take_snapshot'] = (bool)$row['take_snapshot'];
                    $resetSettings['timer_action'] = $row['timer_action'] ?: 'restart';
                }
            }
        }
    } catch (\Exception $e) {
        // Silenciar error de carga
    }
}

if (!$canvasId) {
    echo "<div class='view-content'><p>" . __('err_invalid_canvas_id') . "</p></div>";
    return;
}

$monthShort = [
    __('month_jan'), __('month_feb'), __('month_mar'), __('month_apr'),
    __('month_may'), __('month_jun'), __('month_jul'), __('month_aug'),
    __('month_sep'), __('month_oct'), __('month_nov'), __('month_dec'),
];

$resetDateLocal = '';
$resetDateDisplay = __('lbl_select_date');

if (!empty($resetSettings['next_reset_at'])) {
    try {
        $dt = new DateTime($resetSettings['next_reset_at'], new DateTimeZone('UTC'));
        $dt->setTimezone(new DateTimeZone(date_default_timezone_get()));
        $resetDateLocal = $dt->format('Y-m-d\TH:i');
        $resetDateDisplay = $dt->format('j') . ' de ' . $monthShort[(int)$dt->format('n') - 1] . ' ' . $dt->format('Y') . ', ' . $dt->format('H:i');
    } catch (\Exception $e) {
        $resetDateLocal = '';
    }
}

$isResetActive = $resetSettings['is_active'];
$timerActions = [
    'restart' => ['label' => __('timer_action_restart'), 'icon' => 'timer'],
    'stop'    => ['label' => __('timer_action_stop'), 'icon' => 'stop_circle'],
    'none'    => ['label' => __('timer_action_none'), 'icon' => 'visibility_off'],
];
$activeTimer = $resetSettings['timer_action'];
if (!isset($timerActions[$activeTimer])) {
    $activeTimer = 'restart';
}
?>

<div class="view-content" data-ref="canvas-resets-wrapper" data-canvas-id="<?php echo $canvasId; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <div>
                <h1 class="component-top-title"><?php echo __('canvas_resets_title'); ?></h1>
            </div>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--primary component-button--h40" data-action="saveSettings">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes'); ?>
            </button>
        </div>
    </div>

    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('canvas_resets_title'); ?></h1>
                <p class="component-page-description"><?php echo __('canvas_resets_desc'); ?></p>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('canvas_reset_active_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_reset_active_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" data-ref="reset_is_active" data-action="toggleActive" <?php echo $isResetActive ? 'checked' : ''; ?>>
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div data-ref="reset_options_container" class="<?php echo $isResetActive ? '' : 'disabled-interactive'; ?>">
                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_reset_date_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_reset_date_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="moduleCalendarDate">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="component-dropdown-text" data-ref="reset-date-text"><?php echo htmlspecialchars($resetDateDisplay); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                
                                <input type="hidden" data-ref="next_reset_at" value="<?php echo htmlspecialchars($resetDateLocal); ?>">

                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleCalendarDate">
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
                                                <span><?php echo __('cal_su'); ?></span>
                                                <span><?php echo __('cal_mo'); ?></span>
                                                <span><?php echo __('cal_tu'); ?></span>
                                                <span><?php echo __('cal_we'); ?></span>
                                                <span><?php echo __('cal_th'); ?></span>
                                                <span><?php echo __('cal_fr'); ?></span>
                                                <span><?php echo __('cal_sa'); ?></span>
                                            </div>

                                            <div class="component-calendar-days" data-ref="calendar-days"></div>

                                            <div class="component-calendar-time">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="number" data-ref="calendar-hours" class="component-input-field component-input-field--simple" placeholder="<?php echo __('cal_placeholder_hh'); ?>" min="0" max="23" value="00">
                                                </div>
                                                <span>:</span>
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="number" data-ref="calendar-minutes" class="component-input-field component-input-field--simple" placeholder="<?php echo __('cal_placeholder_mm'); ?>" min="0" max="59" value="00">
                                                </div>
                                            </div>

                                            <div class="component-calendar-actions">
                                                <button type="button" class="component-button component-button--h30" data-action="calendarClear"><?php echo __('btn_clear'); ?></button>
                                                <div>
                                                    <button type="button" class="component-button component-button--h30" data-action="calendarCancel"><?php echo __('btn_cancel'); ?></button>
                                                    <button type="button" class="component-button component-button--h30 component-button--dark" data-action="calendarConfirm"><?php echo __('btn_accept'); ?></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_reset_snapshot_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_reset_snapshot_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="take_snapshot" <?php echo $resetSettings['take_snapshot'] ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_reset_timer_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_reset_timer_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="moduleTimerAction">
                                    <span class="material-symbols-rounded" data-ref="icon-timer"><?php echo htmlspecialchars($timerActions[$activeTimer]['icon']); ?></span>
                                    <span class="component-dropdown-text" data-ref="text-timer"><?php echo htmlspecialchars($timerActions[$activeTimer]['label']); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                
                                <input type="hidden" data-ref="timer_action" value="<?php echo htmlspecialchars($activeTimer); ?>">

                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleTimerAction">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <?php foreach ($timerActions as $value => $meta): ?>
                                            <div class="component-menu-link <?php echo $activeTimer === $value ? 'active' : ''; ?>" data-action="selectTimerAction" data-value="<?php echo $value; ?>" data-label="<?php echo htmlspecialchars($meta['label']); ?>" data-icon="<?php echo htmlspecialchars($meta['icon']); ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($meta['icon']); ?></span></div>
                                                <div class="component-menu-link-text"><span><?php echo htmlspecialchars($meta['label']); ?></span></div>
                                            </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title text-danger"><?php echo __('canvas_reset_now_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_reset_now_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--danger component-button--h40" data-action="resetNow">
                            <span class="material-symbols-rounded">delete_forever</span>
                            <?php echo __('btn_reset_now'); ?>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>
