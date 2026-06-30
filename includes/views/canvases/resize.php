<?php
// includes/views/canvases/resize.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use PDO;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo "<div class='view-content'><p>" . __('err_unauthorized') . "</p></div>";
    return;
}

$uriParts = explode('/', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$uuid = end($uriParts);

if (empty($uuid) || $uuid === 'resize') {
    echo "<div class='view-content'><p>" . __('err_unspecified_canvas') . "</p></div>";
    return;
}

$db = new DatabaseManager();
$connName = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
$pdo = $db->getConnection($connName); 
$tblCanvases = defined('App\Core\System\DatabaseConstants::TBL_CANVASES') ? App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';

$userPermissions = $_SESSION['user_permissions'] ?? [];
$isAdmin = in_array('manage_canvases', $userPermissions) || 
           in_array('access_admin_panel', $userPermissions) || 
           in_array('canvases.manage_official', $userPermissions);

if ($isAdmin) {
    $sql = "SELECT id, uuid, name, size FROM {$tblCanvases} WHERE uuid = :uuid LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uuid' => $uuid]);
} else {
    $sql = "SELECT id, uuid, name, size FROM {$tblCanvases} WHERE uuid = :uuid AND owner_id = :uid LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uuid' => $uuid, 'uid' => $userId]);
}

$canvas = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$canvas) {
    echo "<div class='view-content'><p>" . __('err_canvas_not_found') . "</p></div>";
    return;
}

$currentSizeRaw = $canvas['size'];
$isCustomFormat = strpos((string)$currentSizeRaw, 'x') !== false;
$displaySize = $isCustomFormat ? $currentSizeRaw : $currentSizeRaw . 'x' . $currentSizeRaw;

$icon = 'crop_square';
if (intval($currentSizeRaw) == 128) $icon = 'aspect_ratio';
if (intval($currentSizeRaw) == 256 || intval($currentSizeRaw) == 264) $icon = 'grid_4x4';
if (intval($currentSizeRaw) >= 512) $icon = 'grid_on';

$sizesList = [
    "16"   => ['label' => '16x16',     'icon' => 'crop_square'],
    "32"   => ['label' => '32x32',     'icon' => 'crop_square'],
    "64"   => ['label' => '64x64',     'icon' => 'crop_square'],
    "128"  => ['label' => '128x128',   'icon' => 'aspect_ratio'],
    "256"  => ['label' => '256x256',   'icon' => 'grid_4x4'],
    "512"  => ['label' => '512x512',   'icon' => 'grid_on'],
    "1024" => ['label' => '1024x1024', 'icon' => 'grid_on'],
    "2048" => ['label' => '2048x2048', 'icon' => 'grid_on'],
    "4096" => ['label' => '4096x4096', 'icon' => 'grid_on']
];

if (!isset($sizesList[(string)$currentSizeRaw])) {
    $sizesList[(string)$currentSizeRaw] = ['label' => $displaySize, 'icon' => $icon];
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" data-ref="canvas-resize-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvas['id']); ?>" data-current-size="<?php echo htmlspecialchars($currentSizeRaw); ?>">
    
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
                            <input type="checkbox" data-ref="toggleScheduledResize">
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div data-ref="resize_options_container" class="disabled-interactive">
                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_resize_size_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_resize_size_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSizeResize">
                                    <span class="material-symbols-rounded" data-ref="resize-icon"><?php echo htmlspecialchars($icon); ?></span>
                                    <span class="component-dropdown-text" data-ref="text-size-resize"><?php echo htmlspecialchars($displaySize); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSizeResize">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <?php foreach ($sizesList as $val => $data): ?>
                                            <div class="component-menu-link <?php echo (string)$currentSizeRaw === (string)$val ? 'active' : ''; ?>" 
                                                 data-action="selectValue" 
                                                 data-type="size" 
                                                 data-value="<?php echo htmlspecialchars($val); ?>" 
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

                    <div class="component-group-item component-group-item--wrap d-none" data-ref="resize-warning">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title text-danger">
                                    <span class="material-symbols-rounded">warning</span> <?php echo __('canvas_resize_warning_title'); ?>
                                </h2>
                                <p class="component-card__description text-danger"><?php echo __('canvas_resize_warning_desc'); ?></p>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked" data-ref="scheduledResizeDateBlock">
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
                                    <span class="component-dropdown-text" data-ref="resize-date-text"><?php echo __('lbl_select_date'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                
                                <input type="hidden" data-ref="next_resize_at" value="">

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

                    <div class="component-group-item component-group-item--stacked" data-ref="scheduledResizeTimerBlock">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_resize_timer_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_resize_timer_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownResizeTimerAction">
                                    <span class="material-symbols-rounded" data-ref="resize-timer-icon">timer</span>
                                    <span class="component-dropdown-text" data-ref="text-resize-timer-action"><?php echo __('timer_action_restart'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownResizeTimerAction">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            
                                            <div class="component-menu-link active" data-action="selectValue" data-type="timer_action" data-value="restart" data-label="<?php echo __('timer_action_restart'); ?>" data-icon="timer">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo __('timer_action_restart'); ?></span>
                                                </div>
                                            </div>
                                            
                                            <div class="component-menu-link" data-action="selectValue" data-type="timer_action" data-value="stop" data-label="<?php echo __('timer_action_stop'); ?>" data-icon="timer_off">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer_off</span></div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo __('timer_action_stop'); ?></span>
                                                </div>
                                            </div>
                                            
                                            <div class="component-menu-link" data-action="selectValue" data-type="timer_action" data-value="none" data-label="<?php echo __('timer_action_none'); ?>" data-icon="visibility_off">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">visibility_off</span></div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo __('timer_action_none'); ?></span>
                                                </div>
                                            </div>

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
                            <h2 class="component-card__title text-danger"><?php echo __('canvas_resize_now_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_resize_now_desc'); ?></p>
                        </div>
                    </div>
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