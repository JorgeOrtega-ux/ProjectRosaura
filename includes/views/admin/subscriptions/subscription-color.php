<?php
use App\Api\Services\Admin\AdminViewService;
use App\Core\Helpers\Utils;

$adminService = new AdminViewService();
$builderData = $adminService->getSubscriptionBuilderData($_GET['uuid'] ?? null);

if (!empty($builderData['error'])) {
    echo "<div class='view-content'><p>" . htmlspecialchars($builderData['error']) . "</p></div>";
    return;
}

extract($builderData);
$tierUuid = $tier['uuid'] ?? ($_GET['uuid'] ?? '');
$tierName = $tier['name'] ?? '';
$tierColorRaw = $tier['color'] ?? '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}';

$decodedColor = json_decode($tierColorRaw, true);
$colorsList = [];
$gradientAngle = 0;
if (is_array($decodedColor)) {
    $gradientAngle = (int)($decodedColor['angle'] ?? 0);
    if (!empty($decodedColor['colors'])) {
        foreach ($decodedColor['colors'] as $c) {
            $hex = is_array($c) ? ($c['hex'] ?? '#808080') : (string)$c;
            $clean = strtoupper(trim($hex));
            if (!str_starts_with($clean, '#')) $clean = '#' . $clean;
            $pct = is_array($c) ? (int)($c['percentage'] ?? 0) : 0;
            $colorsList[] = ['hex' => $clean, 'percentage' => $pct];
        }
    }
}
if (empty($colorsList)) {
    $colorsList = [['hex' => '#808080', 'percentage' => 100]];
}

$countColors = count($colorsList);
$cssColorValue = '';
if ($countColors === 1) {
    $colorsList[0]['percentage'] = 100;
    $cssColorValue = $colorsList[0]['hex'];
} else {
    $sum = array_sum(array_column($colorsList, 'percentage'));
    if ($sum !== 100) {
        $base = floor(100 / $countColors);
        $rem = 100 % $countColors;
        foreach ($colorsList as $idx => &$item) {
            $item['percentage'] = (int)($base + ($idx < $rem ? 1 : 0));
        }
        unset($item);
    }
    $prevStop = 0;
    $stops = [];
    foreach ($colorsList as $item) {
        $endStop = $prevStop + $item['percentage'];
        $stops[] = "{$item['hex']} {$prevStop}% {$endStop}%";
        $prevStop = $endStop;
    }
    $cssColorValue = "conic-gradient(from {$gradientAngle}deg, " . implode(', ', $stops) . ")";
}

if (!function_exists('hexToRgbArr')) {
    function hexToRgbArr(string $hex): array {
        $clean = ltrim($hex, '#');
        if (strlen($clean) === 3) {
            $clean = $clean[0].$clean[0].$clean[1].$clean[1].$clean[2].$clean[2];
        }
        if (strlen($clean) !== 6) return ['r' => 128, 'g' => 128, 'b' => 128];
        return [
            'r' => hexdec(substr($clean, 0, 2)),
            'g' => hexdec(substr($clean, 2, 2)),
            'b' => hexdec(substr($clean, 4, 2))
        ];
    }
}

if (!function_exists('hexToHslArr')) {
    function hexToHslArr(string $hex): array {
        $rgb = hexToRgbArr($hex);
        $r = $rgb['r'] / 255;
        $g = $rgb['g'] / 255;
        $b = $rgb['b'] / 255;

        $max = max($r, $g, $b);
        $min = min($r, $g, $b);
        $d = $max - $min;
        $l = ($max + $min) / 2;
        $h = 0;
        $s = 0;

        if ($d != 0) {
            $s = $l > 0.5 ? $d / (2 - $max - $min) : $d / ($max + $min);
            if ($max === $r) {
                $h = ($g - $b) / $d + ($g < $b ? 6 : 0);
            } elseif ($max === $g) {
                $h = ($b - $r) / $d + 2;
            } else {
                $h = ($r - $g) / $d + 4;
            }
            $h *= 60;
        }

        return [
            'h' => round($h),
            's' => round($s * 100),
            'l' => round($l * 100)
        ];
    }
}
?>

<div class="view-content" data-ref="adminSubscriptionColorView" data-uuid="<?php echo htmlspecialchars($tierUuid); ?>">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="subscription-color-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_subscription_colors_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <!-- Acciones de Selección Múltiple -->
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="editSelectedColor" data-position="bottom" data-ref="btn-edit-color" data-tooltip="<?php echo __('tooltip_edit_color'); ?>">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteSelectedColors" data-position="bottom" data-ref="btn-delete-color" data-tooltip="<?php echo __('tooltip_delete_color'); ?>">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
                
                <!-- Acciones Predeterminadas -->
                <div class="component-actions active" data-ref="header-default-actions">
                    <!-- Selector de Ángulo de Rotación -->
                    <div class="component-dropdown-wrapper <?php echo $countColors > 1 ? '' : 'disabled'; ?>" data-ref="gradientAngleDropdownWrapper">
                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleGradientAngle" data-value="<?php echo $gradientAngle; ?>" data-ref="gradientAngleTrigger">
                            <span class="material-symbols-rounded">rotate_right</span>
                            <span class="component-dropdown-text" data-ref="gradientAngleText"><?php echo $gradientAngle; ?>°</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown disabled" data-module="moduleGradientAngle">
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

                    <button class="component-button component-button--icon component-button--h40" data-action="searchColor" data-position="bottom" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_color_placeholder'); ?>">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="openAddColorModal" data-position="bottom" data-ref="btn-add-color" data-tooltip="<?php echo __('btn_add_color'); ?>">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="saveColorData" data-position="bottom" data-ref="btn-save-color" data-tooltip="<?php echo __('btn_save'); ?>">
                        <span class="material-symbols-rounded">save</span>
                    </button>

                    <!-- Preview en Vivo del Avatar con Borde de Suscripción -->
                    <button class="component-button component-button--profile subscription-dynamic" data-ref="subscriptionLivePreviewAvatar" data-sub-bg="<?php echo htmlspecialchars($cssColorValue); ?>" style="--active-subscription-bg: <?php echo htmlspecialchars($cssColorValue); ?>;" data-tooltip="<?php echo __('admin_subscription_color_preview'); ?>" data-position="bottom">
                        <img src="<?php echo $appUrl; ?>/avatar/Um9zYXVyYVVzZXI6VQ" alt="<?php echo __('alt_profile'); ?>" decoding="async" class="image-lazy-fade" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='<?php echo $appUrl; ?>/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');">
                    </button>
                </div>
                
            </div>

            <!-- Barra de Búsqueda -->
            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="color-search-input" placeholder="<?php echo __('search_color_placeholder'); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th><?php echo __('table_header_sample'); ?></th>
                            <th><?php echo __('table_header_hex'); ?></th>
                            <th><?php echo __('table_header_percentage'); ?></th>
                            <th><?php echo __('table_header_rgb'); ?></th>
                            <th><?php echo __('table_header_hsl'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="subscriptionColorsTableBody">
                        <?php if (empty($colorsList)): ?>
                            <tr>
                                <td colspan="6" class="component-empty-table-cell">
                                    <?php echo \App\Core\Helpers\Utils::renderEmptyState([
                                        'type' => 'canvas',
                                        'title' => __('admin_sub_colors_empty_title'),
                                        'message' => __('admin_sub_colors_empty_desc')
                                    ]); ?>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($colorsList as $index => $item): 
                                $hex = $item['hex'];
                                $percentage = $item['percentage'];
                                $rgb = hexToRgbArr($hex);
                                $hsl = hexToHslArr($hex);
                                $controlDisabled = $countColors === 1 ? 'disabled-interaction' : '';
                            ?>
                                <tr class="component-table-row" data-action="selectColorRow" data-index="<?php echo $index; ?>">
                                    <td>
                                        <div class="component-badge component-badge--sm">#<?php echo $index + 1; ?></div>
                                    </td>
                                    <td>
                                        <div class="component-table-color-swatch" style="background-color: <?php echo htmlspecialchars($hex); ?>;"></div>
                                    </td>
                                    <td>
                                        <span class="component-code-text search-target"><?php echo htmlspecialchars($hex); ?></span>
                                    </td>
                                    <td>
                                        <div class="component-inline-control component-inline-control--fixed <?php echo $controlDisabled; ?>" data-ref="percentageControl">
                                            <div class="component-inline-control__group">
                                                <button type="button" class="component-inline-control__btn" data-action="adjustColorPercent" data-index="<?php echo $index; ?>" data-step="-5">
                                                    <span class="material-symbols-rounded">chevron_left</span>
                                                </button>
                                            </div>
                                            <div class="component-inline-control__center" data-val="<?php echo $percentage; ?>">
                                                <span data-ref="percentageDisplay"><?php echo $percentage; ?></span>%
                                            </div>
                                            <div class="component-inline-control__group">
                                                <button type="button" class="component-inline-control__btn" data-action="adjustColorPercent" data-index="<?php echo $index; ?>" data-step="5">
                                                    <span class="material-symbols-rounded">chevron_right</span>
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="component-subtext">rgb(<?php echo $rgb['r']; ?>, <?php echo $rgb['g']; ?>, <?php echo $rgb['b']; ?>)</span>
                                    </td>
                                    <td>
                                        <span class="component-subtext">hsl(<?php echo $hsl['h']; ?>°, <?php echo $hsl['s']; ?>%, <?php echo $hsl['l']; ?>%)</span>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>

<script type="application/json" data-ref="tierColorConfigJson">
    <?php echo json_encode(['angle' => $gradientAngle, 'colors' => $colorsList]); ?>
</script>