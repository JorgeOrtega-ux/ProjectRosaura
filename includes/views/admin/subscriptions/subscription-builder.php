<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$db = new DatabaseManager();
$pdo = $db->getConnection(DB::CONN_IDENTITY);

$tblTiers = 'subscription_tiers';

$userPermissions = $_SESSION['user_permissions'] ?? [];

$isEdit = false;
$tierData = [
    'id' => 0,
    'name' => '',
    'color' => json_encode(['type' => 'solid', 'angle' => 0, 'colors' => [['hex' => '#808080', 'percentage' => 100]]]),
    'tier_level' => 1,
    'stripe_price_id_monthly' => '',
    'stripe_price_id_yearly' => ''
];

if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    
    $stmt = $pdo->prepare("SELECT * FROM {$tblTiers} WHERE id = ?");
    $stmt->execute([$id]);
    $tier = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($tier) {
        $isEdit = true;
        $tierData = $tier;
    }
}
$isSystemRole = ($isEdit && $tierData['id'] <= 1);
$currentRoleId = isset($_SESSION['user_role_id']) ? (int)$_SESSION['user_role_id'] : 0;
if (!function_exists('hexToHsv')) {
    function hexToHsv($hex) {
        $hex = ltrim($hex, '#');
        if (strlen($hex) == 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        if (strlen($hex) != 6) return ['h' => 0, 's' => 0, 'v' => 50];
        
        $r = hexdec(substr($hex, 0, 2)) / 255;
        $g = hexdec(substr($hex, 2, 2)) / 255;
        $b = hexdec(substr($hex, 4, 2)) / 255;
        
        $max = max($r, $g, $b);
        $min = min($r, $g, $b);
        $diff = $max - $min;
        
        $h = 0;
        $s = ($max == 0) ? 0 : ($diff / $max);
        $v = $max;
        
        if ($max != $min) {
            if ($max == $r) {
                $h = 60 * (($g - $b) / $diff);
                if ($g < $b) $h += 360;
            } elseif ($max == $g) {
                $h = 60 * (($b - $r) / $diff) + 120;
            } else {
                $h = 60 * (($r - $g) / $diff) + 240;
            }
        }
        return ['h' => round($h), 's' => round($s * 100), 'v' => round($v * 100)];
    }
}

function renderColorBlock($hex, $percentage, $isSolid = false) {
    $hsv = hexToHsv($hex);
    $hue = $hsv['h'];
    $sat = $hsv['s'];
    $val = $hsv['v'];
    $html = '<div class="component-color-item" data-hue="' . $hue . '" data-saturation="' . $sat . '" data-value="' . $val . '">';
    $html .= '<div class="component-color-item__drag" ' . ($isSolid ? 'style="display:none;"' : '') . '><span class="material-symbols-rounded">drag_indicator</span></div>';
    $html .= '<div class="component-color-item__preview" style="background-color: ' . htmlspecialchars($hex) . ';"></div>';
    $html .= '<div class="component-color-item__content">';
    $html .= '<div class="component-color-item__hex">';
    $html .= '<span>HEX</span>';
    $html .= '<input type="text" class="component-input component-input--h32 hex-input" value="' . htmlspecialchars($hex) . '" maxlength="7">';
    $html .= '</div>';
    if (!$isSolid) {
        $html .= '<div class="component-color-item__percentage">';
        $html .= '<span>%</span>';
        $html .= '<input type="number" class="component-input component-input--h32 percentage-input" value="' . (int)$percentage . '" min="0" max="100">';
        $html .= '</div>';
    }
    $html .= '</div>';
    if (!$isSolid) {
        $html .= '<button type="button" class="component-button component-button--icon component-button--h32 component-button--ghost component-color-item__remove" data-action="removeGradientColor"><span class="material-symbols-rounded">close</span></button>';
    }
    $html .= '</div>';
    return $html;
}

$colorData = json_decode($tierData['color'], true);
$colorType = $colorData['type'] ?? 'solid';
$colors = $colorData['colors'] ?? [['hex' => '#808080', 'percentage' => 100]];
$gradientAngle = $colorData['angle'] ?? 90;

$colorTypeLabel = $colorType === 'solid' ? __('admin_role_color_solid') : __('admin_role_color_gradient');
$colorTypeIcon = $colorType === 'solid' ? 'circle' : 'pie_chart';

$featuresData = json_decode($tierData['features'] ?? '{}', true);

?>
<div class="view-content" data-ref="admin-roles-wrapper">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo $isEdit ? 'Editar Suscripción' : 'Nueva Suscripción'; ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--dark component-button--h40" data-action="saveSubscription">
                <?php echo __('btn_save'); ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper component-wrapper--full">
            <div class="component-bottom">
                
                <input type="hidden" id="tierId" value="<?php echo $tierData['id']; ?>">
                
                <div style="display: grid; grid-template-columns: 1fr 400px; gap: 24px; align-items: start;">
                <div class="section-details">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Nombre de Suscripción</h2>
                                <p class="component-card__description">Identificador principal para esta suscripción.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-input-group component-input-group--h34">
                                <input type="text" id="tierName" class="component-input-field component-input-field--simple" placeholder="Ej. Pro, Ultra" value="<?php echo htmlspecialchars($tierData['name']); ?>">
                            </div>
                        </div>
                    </div>
                    
                    <hr class="component-divider">
                    
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Nivel (Tier)</h2>
                                <p class="component-card__description">Jerarquía numérica (0 = free, 1 = plus, etc).</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-input-group component-input-group--h34">
                                <input type="number" id="tierLevel" class="component-input-field component-input-field--simple" value="<?php echo (int)$tierData['tier_level']; ?>" min="0" style="width:100px;text-align:center;">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Stripe Price IDs</h2>
                                <p class="component-card__description">Identificadores para la facturación en Stripe (Mensual / Anual).</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-input-group component-input-group--h34" style="margin-right: 8px;">
                                <input type="text" id="stripeMonthly" class="component-input-field component-input-field--simple" placeholder="Mensual" value="<?php echo htmlspecialchars($tierData['stripe_price_id_monthly']); ?>">
                            </div>
                            <div class="component-input-group component-input-group--h34">
                                <input type="text" id="stripeYearly" class="component-input-field component-input-field--simple" placeholder="Anual" value="<?php echo htmlspecialchars($tierData['stripe_price_id_yearly']); ?>">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-header-card" style="margin-top: 32px; padding: 0 16px 16px;">
                    <h2 class="component-page-title" style="font-size: 1.1rem;">Límites y Beneficios</h2>
                    <p class="component-page-description">Configura los beneficios que obtienen los usuarios con esta suscripción.</p>
                </div>

                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Lienzos Máximos</h2>
                                <p class="component-card__description">Cantidad de lienzos permitidos (-1 para ilimitado).</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-input-group component-input-group--h34">
                                <input type="number" id="featMaxCanvases" class="component-input-field component-input-field--simple" value="<?php echo (int)($featuresData['max_canvases'] ?? 0); ?>" min="-1" style="width:100px;text-align:center;">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Almacenamiento Máximo (MB)</h2>
                                <p class="component-card__description">Límite de espacio para assets del usuario.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-input-group component-input-group--h34">
                                <input type="number" id="featMaxStorage" class="component-input-field component-input-field--simple" value="<?php echo (int)($featuresData['max_storage_mb'] ?? 0); ?>" min="0" style="width:100px;text-align:center;">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Snapshots por Lienzo</h2>
                                <p class="component-card__description">Historial máximo permitido (-1 = Ilimitado).</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-input-group component-input-group--h34">
                                <input type="number" id="featMaxSnapshots" class="component-input-field component-input-field--simple" value="<?php echo (int)($featuresData['max_snapshots_per_canvas'] ?? 0); ?>" min="-1" style="width:100px;text-align:center;">
                            </div>
                        </div>
                    </div>
                    
                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Miembros por Lienzo</h2>
                                <p class="component-card__description">Límite de usuarios invitados por lienzo.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-input-group component-input-group--h34">
                                <input type="number" id="featMaxMembers" class="component-input-field component-input-field--simple" value="<?php echo (int)($featuresData['max_members_per_canvas'] ?? 0); ?>" min="1" style="width:100px;text-align:center;">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Paletas Personalizadas</h2>
                                <p class="component-card__description">Límite máximo de paletas guardadas.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-input-group component-input-group--h34">
                                <input type="number" id="featMaxCustomPalettes" class="component-input-field component-input-field--simple" value="<?php echo (int)($featuresData['max_custom_palettes'] ?? 0); ?>" min="0" style="width:100px;text-align:center;">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-header-card" style="margin-top: 32px; padding: 0 16px 16px;">
                    <h2 class="component-page-title" style="font-size: 1.1rem;">Características</h2>
                    <p class="component-page-description">Activa o desactiva módulos especiales del sistema para esta suscripción.</p>
                </div>

                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Roles Avanzados</h2>
                                <p class="component-card__description">Permitir la creación de roles de equipo personalizados en el lienzo.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" id="featAdvancedRoles" <?php echo !empty($featuresData['advanced_roles']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Plantillas en Vivo</h2>
                                <p class="component-card__description">Acceso a la biblioteca de templates exclusivos.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" id="featLiveTemplates" <?php echo !empty($featuresData['live_templates']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Paletas Extendidas</h2>
                                <p class="component-card__description">Disponibilidad de colores extendidos en la app.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" id="featExtendedPalettes" <?php echo !empty($featuresData['extended_palettes']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Guardar Paletas Personalizadas</h2>
                                <p class="component-card__description">Habilitar creación manual de paletas.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" id="featCustomPalettes" <?php echo !empty($featuresData['custom_palettes']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Chat en Vivo y Soporte</h2>
                                <p class="component-card__description">Canal prioritario de ayuda en la app.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" id="featAllowLiveChat" <?php echo !empty($featuresData['allow_live_chat']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                        </div>
                    </div>
                </div>
                </div> <!-- End Left Column -->

                <div class="section-style">
                <div class="component-header-card" style="padding: 0 16px 16px;">
                    <h2 class="component-page-title" style="font-size: 1.1rem;"><?php echo __('admin_role_style_title'); ?></h2>
                    <p class="component-page-description"><?php echo __('admin_role_style_desc'); ?></p>
                </div>

                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Tipo de Color</h2>
                                <p class="component-card__description">Sólido o degradado.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleColorType">
                                    <span class="material-symbols-rounded" data-ref="colorTypeIcon"><?php echo $colorTypeIcon; ?></span>
                                    <span class="component-dropdown-text" data-ref="colorTypeText"><?php echo $colorTypeLabel; ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-right disabled" data-module="moduleColorType">
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

                <div data-ref="solidMasterContainer" class="component-card--grouped <?php echo $colorType !== 'solid' ? 'disabled' : ''; ?>" style="margin-top: 16px;">
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
                                    <span class="component-dropdown-text" data-ref="gradientAngleText"><?php echo $gradientAngle; ?>Â°</span>
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
                                                    <div class="component-menu-link-text"><span>' . $ang . 'Â°</span></div>
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

                </div> <!-- End Right Column -->
                </div> <!-- End Grid -->

            </div>
        </div>
    </div>
</div>