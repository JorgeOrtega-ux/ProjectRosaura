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
    $id = 'cp_' . uniqid();
    
    $title = $isSolid ? __('admin_solid_color_title') : __('admin_color_block_title');
    if (!$title || $title === 'admin_solid_color_title' || $title === 'admin_color_block_title') {
        $title = $isSolid ? 'Color Principal' : 'Color';
    }
    $desc = $isSolid ? __('admin_solid_color_desc') : __('admin_color_block_desc');
    if (!$desc || $desc === 'admin_solid_color_desc' || $desc === 'admin_color_block_desc') {
        $desc = $isSolid ? 'El color único para esta suscripción.' : 'Selecciona un color para este bloque.';
    }
    
    $actualPercentage = $percentage !== null ? (int)$percentage : 0;
    $controlsClass = $isSolid ? 'component-color-picker__controls disabled' : 'component-color-picker__controls';
    
    $html = '<div class="component-color-row" data-component="color-block">';
    $html .= '  <div class="component-group-item component-group-item--stacked">';
    $html .= '      <div class="component-card__content">';
    $html .= '          <div class="component-card__text">';
    $html .= '              <h2 class="component-card__title" data-ref="blockTitle">' . htmlspecialchars($title) . '</h2>';
    $html .= '              <p class="component-card__description" data-ref="blockDesc">' . htmlspecialchars($desc) . '</p>';
    $html .= '          </div>';
    $html .= '      </div>';
    $html .= '      <div class="component-card__actions component-card__actions--start">';
    $html .= '          <div class="component-dropdown-wrapper component-dropdown-wrapper--color" data-ref="dropdownWrapper">';
    $html .= '              <div class="component-dropdown-trigger component-dropdown-trigger--color" data-action="toggleModule" data-target="' . $id . '">';
    $html .= '                  <div class="component-dropdown-trigger__left">';
    $html .= '                      <div class="component-color-swatch" data-ref="triggerPreview" style="background-color: ' . htmlspecialchars($hex) . ';"></div>';
    $html .= '                      <span class="component-dropdown-text component-text--mono" data-ref="triggerHex">' . htmlspecialchars(strtoupper($hex)) . '</span>';
    $html .= '                  </div>';
    $html .= '                  <span class="material-symbols-rounded">expand_more</span>';
    $html .= '              </div>';
    $html .= '              <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="' . $id . '" data-ref="componentModule">';
    $html .= '                  <div class="component-menu component-menu--w-full component-menu--h-auto">';
    $html .= '                      <div class="pill-container"><div class="drag-handle"></div></div>';
    $html .= '                      <div class="component-color-picker" data-ref="customColorPicker" data-h="' . $hue . '" data-s="' . $sat . '" data-v="' . $val . '">';
    $html .= '                          <div class="component-color-picker__sv-area" data-action="dragSV" style="background-color: hsl(' . $hue . ', 100%, 50%);">';
    $html .= '                              <div class="component-color-picker__sv-bg"></div>';
    $html .= '                              <div class="component-color-picker__sv-thumb" data-ref="svThumb" style="left: ' . $sat . '%; top: ' . (100 - $val) . '%;"></div>';
    $html .= '                          </div>';
    $html .= '                          <div class="component-color-picker__hue-area" data-action="dragHue">';
    $html .= '                              <div class="component-color-picker__hue-thumb" data-ref="hueThumb" style="left: ' . ($hue / 360 * 100) . '%;"></div>';
    $html .= '                          </div>';
    $html .= '                          <div class="component-input-group component-input-group--h34 component-input-group--color">';
    $html .= '                              <div class="component-color-swatch component-color-swatch--sm" data-ref="hexInputPreview" style="background-color: ' . htmlspecialchars($hex) . ';"></div>';
    $html .= '                              <input type="text" class="component-input-field component-input-field--mono" data-ref="hexInput" value="' . htmlspecialchars(strtoupper($hex)) . '" readonly>';
    $html .= '                          </div>';
    $html .= '                          <div class="' . $controlsClass . '" data-ref="controlsContainer">';
    $html .= '                              <div class="component-inline-control component-inline-control--fixed component-color-picker__percentage" data-ref="percentageControl">';
    $html .= '                                  <div class="component-inline-control__group">';
    $html .= '                                      <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>';
    $html .= '                                      <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-5"><span class="material-symbols-rounded">chevron_left</span></button>';
    $html .= '                                  </div>';
    $html .= '                                  <div class="component-inline-control__center" data-val="' . $actualPercentage . '" data-ref="percentageCenter">';
    $html .= '                                      <span data-ref="stopValueDisplay">' . $actualPercentage . '</span>%';
    $html .= '                                  </div>';
    $html .= '                                  <div class="component-inline-control__group">';
    $html .= '                                      <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="5"><span class="material-symbols-rounded">chevron_right</span></button>';
    $html .= '                                      <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>';
    $html .= '                                  </div>';
    $html .= '                              </div>';
    $html .= '                              <button type="button" class="component-button component-button--icon component-button--h40 btn-delete-color" data-action="removeGradientColor" data-ref="deleteBtn">';
    $html .= '                                  <span class="material-symbols-rounded">delete</span>';
    $html .= '                              </button>';
    $html .= '                          </div>';
    $html .= '                      </div>';
    $html .= '                  </div>';
    $html .= '              </div>';
    $html .= '          </div>';
    $html .= '      </div>';
    $html .= '  </div>';
    $html .= '  <hr class="component-divider" data-ref="blockDivider">';
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
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <input type="hidden" id="tierId" value="<?php echo $tierData['id']; ?>">
                
                <!-- Detalles Accordion -->
                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">diamond</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Detalles de Suscripción</h2>
                                <p class="component-card__description">Configura los datos básicos e identificadores.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Nombre de Suscripción</h2>
                                        <p class="component-card__description">Identificador principal para esta suscripción.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="text" id="tierName" class="component-input-field component-input-field--simple" placeholder="Ej. Pro, Ultra" value="<?php echo htmlspecialchars($tierData['name']); ?>">
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">
                            
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Nivel (Tier)</h2>
                                        <p class="component-card__description">Jerarquía numérica (0 = free, 1 = plus, etc).</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="tierLevel" data-step="-5" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="tierLevel" data-step="-1" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_tierLevel" data-val="<?php echo (int)$tierData['tier_level']; ?>"><?php echo (int)$tierData['tier_level']; ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="tierLevel" data-step="1" data-max="99"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="tierLevel" data-step="5" data-max="99"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
        
                            <hr class="component-divider">
        
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="stripe-monthly-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Stripe Price ID (Mensual)</h2>
                                            <span class="component-display-value" data-ref="display-stripe-monthly"><?php echo htmlspecialchars($tierData['stripe_price_id_monthly']) ?: 'No configurado'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="stripe-monthly"><?php echo __('btn_edit') ?: 'Editar'; ?></button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="stripe-monthly-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Stripe Price ID (Mensual)</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-stripe-monthly" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($tierData['stripe_price_id_monthly']); ?>" data-original-value="<?php echo htmlspecialchars($tierData['stripe_price_id_monthly']); ?>" placeholder="ID Mensual">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="stripe-monthly"><?php echo __('btn_cancel') ?: 'Cancelar'; ?></button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="stripe-monthly"><?php echo __('btn_save') ?: 'Aplicar'; ?></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">
                            
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="stripe-yearly-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Stripe Price ID (Anual)</h2>
                                            <span class="component-display-value" data-ref="display-stripe-yearly"><?php echo htmlspecialchars($tierData['stripe_price_id_yearly']) ?: 'No configurado'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="stripe-yearly"><?php echo __('btn_edit') ?: 'Editar'; ?></button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="stripe-yearly-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Stripe Price ID (Anual)</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-stripe-yearly" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($tierData['stripe_price_id_yearly']); ?>" data-original-value="<?php echo htmlspecialchars($tierData['stripe_price_id_yearly']); ?>" placeholder="ID Anual">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="stripe-yearly"><?php echo __('btn_cancel') ?: 'Cancelar'; ?></button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="stripe-yearly"><?php echo __('btn_save') ?: 'Aplicar'; ?></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Límites Accordion -->
                <div class="component-card--grouped component-accordion mt-4">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">speed</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Límites y Beneficios</h2>
                                <p class="component-card__description">Configura los beneficios que obtienen los usuarios con esta suscripción.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Lienzos Máximos</h2>
                                        <p class="component-card__description">Cantidad de lienzos permitidos (-1 para ilimitado).</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCanvases" data-step="-10" data-min="-1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCanvases" data-step="-1" data-min="-1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxCanvases" data-val="<?php echo (int)($featuresData['max_canvases'] ?? 0); ?>"><?php echo ((int)($featuresData['max_canvases'] ?? 0)) === -1 ? '∞' : (int)($featuresData['max_canvases'] ?? 0); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCanvases" data-step="1" data-max="999"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCanvases" data-step="10" data-max="999"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
        
                            <hr class="component-divider">
        
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Almacenamiento Máximo (MB)</h2>
                                        <p class="component-card__description">Límite de espacio para assets del usuario.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxStorage" data-step="-100" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxStorage" data-step="-10" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxStorage" data-val="<?php echo (int)($featuresData['max_storage_mb'] ?? 0); ?>"><?php echo (int)($featuresData['max_storage_mb'] ?? 0); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxStorage" data-step="10" data-max="5000"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxStorage" data-step="100" data-max="5000"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
        
                            <hr class="component-divider">
        
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Snapshots por Lienzo</h2>
                                        <p class="component-card__description">Historial máximo permitido (-1 = Ilimitado).</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxSnapshots" data-step="-10" data-min="-1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxSnapshots" data-step="-1" data-min="-1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxSnapshots" data-val="<?php echo (int)($featuresData['max_snapshots_per_canvas'] ?? 0); ?>"><?php echo ((int)($featuresData['max_snapshots_per_canvas'] ?? 0)) === -1 ? '∞' : (int)($featuresData['max_snapshots_per_canvas'] ?? 0); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxSnapshots" data-step="1" data-max="999"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxSnapshots" data-step="10" data-max="999"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">
        
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Miembros por Lienzo</h2>
                                        <p class="component-card__description">Límite de usuarios invitados por lienzo.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxMembers" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxMembers" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxMembers" data-val="<?php echo (int)($featuresData['max_members_per_canvas'] ?? 1); ?>"><?php echo (int)($featuresData['max_members_per_canvas'] ?? 1); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxMembers" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxMembers" data-step="10" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
        
                            <hr class="component-divider">
        
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Paletas Personalizadas</h2>
                                        <p class="component-card__description">Límite máximo de paletas guardadas.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCustomPalettes" data-step="-5" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCustomPalettes" data-step="-1" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxCustomPalettes" data-val="<?php echo (int)($featuresData['max_custom_palettes'] ?? 0); ?>"><?php echo (int)($featuresData['max_custom_palettes'] ?? 0); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCustomPalettes" data-step="1" data-max="50"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCustomPalettes" data-step="5" data-max="50"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Características Accordion -->
                <div class="component-card--grouped component-accordion mt-4">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">stars</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Características</h2>
                                <p class="component-card__description">Activa o desactiva módulos especiales del sistema.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
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

                <!-- Estilo y Diseño Accordion -->
                <div class="component-card--grouped component-accordion mt-4">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">palette</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_role_style_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_role_style_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Tipo de Color</h2>
                                        <p class="component-card__description">Sólido o degradado.</p>
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
                            <div data-ref="solidMasterContainer" class="<?php echo $colorType !== 'solid' ? 'disabled' : ''; ?>">
                                <hr class="component-divider">
                                <div data-ref="solidColorContainer" class="component-color-list">
                                    <?php if ($colorType === 'solid') echo renderColorBlock($colors[0]['hex'], 100, true); ?>
                                </div>
                            </div>

                            <div data-ref="gradientMasterContainer" class="<?php echo $colorType !== 'gradient' ? 'disabled' : ''; ?>">
                                <hr class="component-divider">
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
        </div>
    </div>
</div>