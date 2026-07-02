<?php
// includes/views/canvases/resize.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\Helpers\Utils;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo "<div class='view-content'><p>" . __('err_unauthorized') . "</p></div>";
    return;
}

$canvasUuid = $_GET['uuid'] ?? null;

if (!$canvasUuid) {
    echo "<div class='view-content'><p>" . __('err_unspecified_canvas') . "</p></div>";
    return;
}

$userPermissions = $_SESSION['user_permissions'] ?? [];
$canManageOfficial = in_array('manage_canvases', $userPermissions)
    || in_array('access_admin_panel', $userPermissions)
    || in_array('canvases.manage_official', $userPermissions);

$db = new DatabaseManager();
$pdo = $db->getConnection(DB::CONN_CANVASES);

if ($canManageOfficial) {
    $stmt = $pdo->prepare('SELECT id, uuid, name, size, owner_id FROM ' . DB::TBL_CANVASES . ' WHERE uuid = :uuid LIMIT 1');
    $stmt->execute(['uuid' => $canvasUuid]);
} else {
    $stmt = $pdo->prepare('SELECT id, uuid, name, size, owner_id FROM ' . DB::TBL_CANVASES . ' WHERE uuid = :uuid AND owner_id = :uid LIMIT 1');
    $stmt->execute(['uuid' => $canvasUuid, 'uid' => $userId]);
}

$canvas = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$canvas) {
    echo "<div class='view-content'><p>" . __('err_canvas_not_found') . "</p></div>";
    return;
}

$canvasId = (int)$canvas['id'];
$resizeSettings = [
    'is_active' => false,
    'next_resize_at' => null,
    'target_size' => '64x64',
    'timer_action' => 'restart',
];

$stmtSettings = $pdo->prepare('SELECT is_active, next_resize_at, target_size, timer_action FROM canvas_resize_settings WHERE canvas_id = :cid LIMIT 1');
$stmtSettings->execute(['cid' => $canvasId]);
$row = $stmtSettings->fetch(PDO::FETCH_ASSOC);

if ($row) {
    $resizeSettings['is_active'] = (bool)$row['is_active'];
    $resizeSettings['next_resize_at'] = $row['next_resize_at'];
    $resizeSettings['target_size'] = $row['target_size'] ?: '64x64';
    $resizeSettings['timer_action'] = $row['timer_action'] ?: 'restart';
}

$sizesList = Utils::getCanvasSizes();
$currentSizeRaw = (string)$canvas['size'];

if (!str_contains($currentSizeRaw, 'x') && is_numeric($currentSizeRaw)) {
    $currentSizeRaw = $currentSizeRaw . 'x' . $currentSizeRaw;
}

if (!isset($sizesList[$currentSizeRaw])) {
    $sizesList[$currentSizeRaw] = ['label' => $currentSizeRaw, 'icon' => 'crop_square'];
}

$scheduledSize = $resizeSettings['target_size'];
if (!isset($sizesList[$scheduledSize])) {
    $sizesList[$scheduledSize] = ['label' => $scheduledSize, 'icon' => 'crop_square'];
}

$instantSize = $currentSizeRaw;
$scheduledMeta = $sizesList[$scheduledSize];
$instantMeta = $sizesList[$instantSize];

$isResizeActive = $resizeSettings['is_active'];

$monthShort = [
    __('month_jan'), __('month_feb'), __('month_mar'), __('month_apr'),
    __('month_may'), __('month_jun'), __('month_jul'), __('month_aug'),
    __('month_sep'), __('month_oct'), __('month_nov'), __('month_dec'),
];

$resizeDateLocal = '';
$resizeDateDisplay = __('lbl_select_date');

if (!empty($resizeSettings['next_resize_at'])) {
    try {
        $dt = new DateTime($resizeSettings['next_resize_at'], new DateTimeZone('UTC'));
        $dt->setTimezone(new DateTimeZone(date_default_timezone_get()));
        $resizeDateLocal = $dt->format('Y-m-d\TH:i');
        $resizeDateDisplay = $dt->format('j') . ' de ' . $monthShort[(int)$dt->format('n') - 1] . ' ' . $dt->format('Y') . ', ' . $dt->format('H:i');
    } catch (\Exception $e) {
        $resizeDateLocal = '';
    }
}

$timerActions = [
    'restart' => ['label' => __('timer_action_restart'), 'icon' => 'timer'],
    'stop'    => ['label' => __('timer_action_stop'), 'icon' => 'timer_off'],
    'none'    => ['label' => __('timer_action_none'), 'icon' => 'visibility_off'],
];
$activeTimer = $resizeSettings['timer_action'];
if (!isset($timerActions[$activeTimer])) {
    $activeTimer = 'restart';
}

$currWidth = (int)explode('x', $currentSizeRaw)[0];
$instantWidth = (int)explode('x', $instantSize)[0];
$showShrinkWarning = $instantWidth < $currWidth;
?>

<div class="view-content" data-ref="canvas-resize-wrapper" data-canvas-id="<?php echo htmlspecialchars((string)$canvasId); ?>" data-current-size="<?php echo htmlspecialchars($currentSizeRaw); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <div>
                <h1 class="component-top-title"><?php echo __('canvas_resize_title'); ?></h1>
            </div>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--primary component-button--h40" data-action="saveScheduledResize">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes'); ?>
            </button>
        </div>
    </div>

    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('canvas_resize_title'); ?></h1>
                <p class="component-page-description"><?php echo __('canvas_resize_desc'); ?></p>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('canvas_resize_active_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_resize_active_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" data-ref="toggleScheduledResize" <?php echo $isResizeActive ? 'checked' : ''; ?>>
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div data-ref="resize_options_container" class="<?php echo $isResizeActive ? '' : 'disabled-interactive'; ?>">
                <div class="component-card--grouped">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_resize_size_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_resize_size_scheduled_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSizeScheduled">
                                    <span class="material-symbols-rounded" data-ref="scheduled-resize-icon"><?php echo htmlspecialchars($scheduledMeta['icon']); ?></span>
                                    <span class="component-dropdown-text" data-ref="text-size-scheduled"><?php echo htmlspecialchars($scheduledMeta['label']); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>

                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSizeScheduled">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <?php foreach ($sizesList as $val => $data): ?>
                                            <div class="component-menu-link <?php echo (string)$scheduledSize === (string)$val ? 'active' : ''; ?>"
                                                 data-action="selectValue"
                                                 data-type="size_scheduled"
                                                 data-value="<?php echo htmlspecialchars((string)$val); ?>"
                                                 data-label="<?php echo htmlspecialchars($data['label']); ?>"
                                                 data-icon="<?php echo htmlspecialchars($data['icon']); ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($data['icon']); ?></span></div>
                                                <div class="component-menu-link-text"><span><?php echo htmlspecialchars($data['label']); ?></span></div>
                                            </div>
                                            <?php endforeach; ?>
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
                                <h2 class="component-card__title"><?php echo __('canvas_resize_date_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_resize_date_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="moduleCalendarDateResize">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="component-dropdown-text" data-ref="resize-date-text"><?php echo htmlspecialchars($resizeDateDisplay); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                
                                <input type="hidden" data-ref="next_resize_at" value="<?php echo htmlspecialchars($resizeDateLocal); ?>">

                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleCalendarDateResize">
                                    <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        
                                        <div data-ref="resizeCalendarWrapper" class="component-calendar">
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

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_resize_timer_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_resize_timer_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownResizeTimerAction">
                                    <span class="material-symbols-rounded" data-ref="resize-timer-icon"><?php echo htmlspecialchars($timerActions[$activeTimer]['icon']); ?></span>
                                    <span class="component-dropdown-text" data-ref="text-resize-timer-action"><?php echo htmlspecialchars($timerActions[$activeTimer]['label']); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>

                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownResizeTimerAction">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <?php foreach ($timerActions as $value => $meta): ?>
                                            <div class="component-menu-link <?php echo $activeTimer === $value ? 'active' : ''; ?>"
                                                 data-action="selectValue"
                                                 data-type="timer_action"
                                                 data-value="<?php echo $value; ?>"
                                                 data-label="<?php echo htmlspecialchars($meta['label']); ?>"
                                                 data-icon="<?php echo htmlspecialchars($meta['icon']); ?>">
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
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title text-danger"><?php echo __('canvas_resize_now_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_resize_now_desc'); ?></p>
                        </div>
                    </div>
                </div>

                <div class="component-alert-error<?php echo $showShrinkWarning ? ' active' : ''; ?>" data-ref="resize-shrink-warning">
                    <?php echo __('canvas_resize_warning_desc'); ?>
                </div>

                <hr class="component-divider">

                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('canvas_resize_instant_size_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_resize_instant_size_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSizeInstant">
                                <span class="material-symbols-rounded" data-ref="instant-resize-icon"><?php echo htmlspecialchars($instantMeta['icon']); ?></span>
                                <span class="component-dropdown-text" data-ref="text-size-instant"><?php echo htmlspecialchars($instantMeta['label']); ?></span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>

                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSizeInstant">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <?php foreach ($sizesList as $val => $data): ?>
                                        <div class="component-menu-link <?php echo (string)$instantSize === (string)$val ? 'active' : ''; ?>"
                                             data-action="selectValue"
                                             data-type="size_instant"
                                             data-value="<?php echo htmlspecialchars((string)$val); ?>"
                                             data-label="<?php echo htmlspecialchars($data['label']); ?>"
                                             data-icon="<?php echo htmlspecialchars($data['icon']); ?>">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($data['icon']); ?></span></div>
                                            <div class="component-menu-link-text"><span><?php echo htmlspecialchars($data['label']); ?></span></div>
                                        </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content"></div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--danger component-button--h40" data-action="applyResizeNow">
                            <span class="material-symbols-rounded">flash_on</span>
                            <?php echo __('btn_apply_now'); ?>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>
