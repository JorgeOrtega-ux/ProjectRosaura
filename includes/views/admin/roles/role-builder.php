<?php
// includes/views/admin/roles/role-builder.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

// VALIDACIÓN ESTRICTA A NIVEL SERVIDOR: Verificación de permisos granulares
$userPermissions = $_SESSION['user_permissions'] ?? [];
if (!in_array('manage_roles_structure', $userPermissions)) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-roles");
    exit;
}

$db = new DatabaseManager();
$pdo = $db->getConnection(DB::CONN_IDENTITY);

$tblRoles = DB::TBL_ROLES;

$isEdit = false;
$roleData = [
    'id' => 0,
    'name' => '',
    'color' => json_encode(['type' => 'solid', 'angle' => 0, 'colors' => [['hex' => '#808080', 'percentage' => 100]]]),
    'weight' => 1
];

if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    
    $stmt = $pdo->prepare("SELECT * FROM {$tblRoles} WHERE id = ?");
    $stmt->execute([$id]);
    $role = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($role) {
        $isEdit = true;
        $roleData = $role;
    }
}

// Determinamos si es un rol de sistema (ID <= 4 o si tienes la columna is_system en tu BD)
$isSystemRole = ($isEdit && (isset($roleData['is_system']) ? (int)$roleData['is_system'] === 1 : $roleData['id'] <= 4));

// Obtener el peso del administrador actual
$currentRoleId = isset($_SESSION['user_role_id']) ? (int)$_SESSION['user_role_id'] : 0;
$currentUserWeight = 0;
if ($currentRoleId > 0) {
    $stmtW = $pdo->prepare("SELECT weight FROM {$tblRoles} WHERE id = ?");
    $stmtW->execute([$currentRoleId]);
    $rowW = $stmtW->fetch(PDO::FETCH_ASSOC);
    if ($rowW) {
        $currentUserWeight = (int)$rowW['weight'];
    }
}

// FUNCIONES HELPER PHP PARA RENDERIZAR COLORES
if (!function_exists('hexToHsv')) {
    function hexToHsv($hex) {
        $hex = ltrim($hex, '#');
        if (strlen($hex) == 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        if (strlen($hex) != 6) return ['h' => 0, 's' => 0, 'v' => 50]; // Fallback
        
        $r = hexdec(substr($hex, 0, 2)) / 255;
        $g = hexdec(substr($hex, 2, 2)) / 255;
        $b = hexdec(substr($hex, 4, 2)) / 255;
        $max = max($r, $g, $b); $min = min($r, $g, $b);
        $d = $max - $min; $v = $max;
        $s = $max == 0 ? 0 : $d / $max;
        $h = 0;
        
        if ($max != $min) {
            if ($max == $r) $h = ($g - $b) / $d + ($g < $b ? 6 : 0);
            elseif ($max == $g) $h = ($b - $r) / $d + 2;
            elseif ($max == $b) $h = ($r - $g) / $d + 4;
            $h /= 6;
        }
        return ['h' => round($h * 360), 's' => round($s * 100), 'v' => round($v * 100)];
    }
}

if (!function_exists('renderColorBlock')) {
    function renderColorBlock($hex, $percentage, $isSolid) {
        $hsv = hexToHsv($hex);
        $h = $hsv['h']; $s = $hsv['s']; $v = $hsv['v'];
        $uniqueId = 'cp_' . substr(md5(uniqid()), 0, 9);
        
        $title = $isSolid ? __('admin_role_color_title') : __('admin_role_hue_adjust');
        $desc = $isSolid ? __('admin_role_color_desc') : __('admin_role_hue_adjust_desc');
        $percentageVal = $isSolid ? 100 : (int)$percentage;
        
        $svAreaBg = "hsl({$h}, 100%, 50%)";
        $svThumbLeft = "{$s}%";
        $svThumbTop = (100 - $v) . "%";
        $hueThumbLeft = ($h / 360 * 100) . "%";
        $controlsClass = $isSolid ? 'disabled' : '';

        return '
        <div class="component-color-row" data-component="color-block">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title" data-ref="blockTitle">' . $title . '</h2>
                        <p class="component-card__description" data-ref="blockDesc">' . $desc . '</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--color" data-ref="dropdownWrapper">
                        <div class="component-dropdown-trigger component-dropdown-trigger--color" data-action="toggleModule" data-target="' . $uniqueId . '">
                            <div class="component-dropdown-trigger__left">
                                <div class="component-color-swatch" data-ref="triggerPreview" style="background-color: ' . $hex . ';"></div>
                                <span class="component-dropdown-text component-text--mono" data-ref="triggerHex">' . $hex . '</span>
                            </div>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="' . $uniqueId . '" data-ref="componentModule">
                            <div class="component-menu component-menu--w-full component-menu--h-auto">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                
                                <div class="component-color-picker" data-ref="customColorPicker" data-h="' . $h . '" data-s="' . $s . '" data-v="' . $v . '">
                                    <div class="component-color-picker__sv-area" data-action="dragSV" style="background-color: ' . $svAreaBg . ';">
                                        <div class="component-color-picker__sv-bg"></div>
                                        <div class="component-color-picker__sv-thumb" data-ref="svThumb" style="left: ' . $svThumbLeft . '; top: ' . $svThumbTop . ';"></div>
                                    </div>
                                    <div class="component-color-picker__hue-area" data-action="dragHue">
                                        <div class="component-color-picker__hue-thumb" data-ref="hueThumb" style="left: ' . $hueThumbLeft . ';"></div>
                                    </div>
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="text" class="component-input-field component-input-field--mono" data-ref="hexInput" value="' . $hex . '" readonly>
                                    </div>
                                    <div class="component-color-picker__controls ' . $controlsClass . '" data-ref="controlsContainer">
                                        <div class="component-inline-control component-inline-control--fixed component-color-picker__percentage" data-ref="percentageControl">
                                            <div class="component-inline-control__group">
                                                <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                                <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-5"><span class="material-symbols-rounded">chevron_left</span></button>
                                            </div>
                                            <div class="component-inline-control__center" data-val="' . $percentageVal . '" data-ref="percentageCenter">
                                                <span data-ref="stopValueDisplay">' . $percentageVal . '</span>%
                                            </div>
                                            <div class="component-inline-control__group">
                                                <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="5"><span class="material-symbols-rounded">chevron_right</span></button>
                                                <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                            </div>
                                        </div>
                                        <button type="button" class="component-button component-button--icon component-button--h40 btn-delete-color" data-action="removeGradientColor" data-ref="deleteBtn">
                                            <span class="material-symbols-rounded">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <hr class="component-divider" data-ref="blockDivider">
        </div>
        ';
    }
}

// PROCESAMIENTO DE JSON A PHP
$colorData = json_decode($roleData['color'], true);
if (!$colorData || !isset($colorData['colors'])) {
    $colorData = ['type' => 'solid', 'angle' => 0, 'colors' => [['hex' => '#808080', 'percentage' => 100]]];
}

$colorType = $colorData['type'] ?? 'solid';
$gradientAngle = (int)($colorData['angle'] ?? 0);
$colors = $colorData['colors'];
$colorCount = count($colors);

foreach ($colors as $i => &$c) {
    if (!is_array($c)) $c = ['hex' => $c, 'percentage' => floor(100 / $colorCount)];
    if (!isset($c['percentage'])) $c['percentage'] = floor(100 / $colorCount);
}
unset($c);

if ($colorType === 'gradient' && count($colors) < 2) {
    $colors = [['hex' => '#d32029', 'percentage' => 50], ['hex' => '#206bd3', 'percentage' => 50]];
}

// CÁLCULO DEL COLOR DEL ANILLO DE PREVISUALIZACIÓN DESDE PHP
$previewBackgroundStyle = '#808080';
if ($colorType === 'solid' && !empty($colors[0]['hex'])) {
    $previewBackgroundStyle = $colors[0]['hex'];
} else if ($colorType === 'gradient') {
    $segments = [];
    $prevStop = 0;
    foreach ($colors as $c) {
        $endStop = $prevStop + (int)$c['percentage'];
        $segments[] = "{$c['hex']} {$prevStop}% {$endStop}%";
        $prevStop = $endStop;
    }
    $previewBackgroundStyle = "conic-gradient(from {$gradientAngle}deg, " . implode(', ', $segments) . ")";
}

$colorTypeLabel = $colorType === 'solid' ? __('admin_role_color_solid') : __('admin_role_color_gradient');
$colorTypeIcon = $colorType === 'solid' ? 'circle' : 'pie_chart';

$rawName = $roleData['name'] ?? '';
$translatedName = '';
if (trim($rawName) !== '') {
    $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
    $translatedName = __($roleKey);
}

?>

<div class="view-content" data-ref="roleBuilderView" data-role-id="<?php echo $roleData['id']; ?>" data-color-type="<?php echo $colorType; ?>" data-current-user-weight="<?php echo $currentUserWeight; ?>" data-is-system="<?php echo $isSystemRole ? '1' : '0'; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title" data-ref="builderTitle"><?php echo $isEdit ? __('admin_edit_role') : __('admin_role_builder'); ?></h1>
            <?php if ($isSystemRole): ?>
            <h1 class="component-top-title" data-ref="systemIndicator"><?php echo __('admin_role_system_limited_edit'); ?></h1>
            <?php endif; ?>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--primary component-button--h40" data-action="saveRoleData">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes'); ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-preview-ring" data-ref="roleLivePreviewRing" style="background: <?php echo $previewBackgroundStyle; ?>;">
                                <div class="component-preview-ring__inner">
                                    <span class="material-symbols-rounded">person</span>
                                </div>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_role_preview_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_role_preview_desc'); ?></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stateful">
                        <div class="active component-state-box" data-state="role-name-view" data-ref="roleNameView">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_role_name'); ?></h2>
                                    <span class="component-display-value" data-ref="display-role-name">
                                        <?php echo $translatedName !== '' ? htmlspecialchars($translatedName) : __('admin_role_undefined'); ?>
                                    </span>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--stretch">
                                <button type="button" class="component-button component-button--h34 <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>" data-action="toggleEditState" data-target="role-name"><?php echo __('btn_edit'); ?></button>
                            </div>
                        </div>

                        <div class="disabled component-state-box" data-state="role-name-edit" data-ref="roleNameEdit">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_role_name'); ?></h2>
                                    <div class="component-edit-row">
                                        <div class="component-input-group component-input-group--h34">
                                            <input type="text" data-ref="roleNameInput" class="component-input-field component-input-field--simple" placeholder="<?php echo __('ph_role_moderator'); ?>" value="<?php echo htmlspecialchars($roleData['name']); ?>" <?php echo $isSystemRole ? 'disabled' : ''; ?>>
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="role-name"><?php echo __('btn_cancel'); ?></button>
                                            <button type="button" class="component-button component-button--h34 component-button--dark <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>" data-action="applyRoleName"><?php echo __('btn_save'); ?></button>
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
                                <h2 class="component-card__title"><?php echo __('admin_role_hierarchy_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_role_hierarchy_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_role_weight" data-val="<?php echo (int)$roleData['weight']; ?>"><?php echo (int)$roleData['weight']; ?></div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="5" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="component-card--grouped">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_role_style_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_role_style_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleColorType">
                                    <span class="material-symbols-rounded" data-ref="colorTypeIcon"><?php echo $colorTypeIcon; ?></span>
                                    <span class="component-dropdown-text" data-ref="colorTypeText"><?php echo $colorTypeLabel; ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleColorType">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <div class="component-menu-link <?php echo $colorType === 'solid' ? 'active' : ''; ?>" data-action="setColorType" data-value="solid">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">circle</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('admin_role_color_solid'); ?></span></div>
                                            </div>
                                            <div class="component-menu-link <?php echo $colorType === 'gradient' ? 'active' : ''; ?>" data-action="setColorType" data-value="gradient">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">pie_chart</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('admin_role_color_gradient'); ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div data-ref="solidMasterContainer" class="component-card--grouped <?php echo $colorType !== 'solid' ? 'disabled' : ''; ?>">
                    <div data-ref="solidColorContainer" class="component-color-list">
                        <?php if ($colorType === 'solid') echo renderColorBlock($colors[0]['hex'], 100, true); ?>
                    </div>
                </div>

                <div data-ref="gradientMasterContainer" class="component-card--grouped <?php echo $colorType !== 'gradient' ? 'disabled' : ''; ?>">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_role_rotation_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_role_rotation_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleGradientAngle" data-val="<?php echo $gradientAngle; ?>" data-ref="gradientAngleTrigger">
                                    <span class="material-symbols-rounded">rotate_right</span>
                                    <span class="component-dropdown-text" data-ref="gradientAngleText"><?php echo $gradientAngle; ?>°</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleGradientAngle">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <?php 
                                            $angles = [
                                                0 => 'north', 45 => 'north_east', 90 => 'east', 135 => 'south_east', 
                                                180 => 'south', 225 => 'south_west', 270 => 'west', 315 => 'north_west'
                                            ];
                                            foreach ($angles as $ang => $icon) {
                                                $active = $gradientAngle === $ang ? 'active' : '';
                                                echo '
                                                <div class="component-menu-link ' . $active . '" data-action="setGradientAngle" data-value="' . $ang . '">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">' . $icon . '</span></div>
                                                    <div class="component-menu-link-text"><span>' . $ang . '°</span></div>
                                                </div>';
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">palette</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_role_blocks_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_role_blocks_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end" data-ref="btnAddGradientColorWrapper">
                            <button type="button" class="component-button component-button--h36" data-ref="btnAddGradientColor" data-action="addGradientColor">
                                <?php echo __('btn_add_block'); ?>
                            </button>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div data-ref="gradientColorsContainer" class="component-color-list">
                        <?php 
                        if ($colorType === 'gradient') {
                            foreach ($colors as $c) echo renderColorBlock($c['hex'], $c['percentage'], false);
                        }
                        ?>
                    </div>

                </div>

            </div>
        </div>
    </div>
</div>