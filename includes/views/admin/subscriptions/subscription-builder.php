<?php
use App\Api\Services\Admin\AdminViewService;
use App\Core\System\SubscriptionFeatureConfig;
use App\Core\System\SubscriptionPlanConstants;

$adminService = new AdminViewService();
$builderData = $adminService->getSubscriptionBuilderData($_GET['uuid'] ?? null);

if (!empty($builderData['error'])) {
    echo "<div class='view-content'><p>".htmlspecialchars($builderData['error'])."</p></div>";
    return;
}

extract($builderData);

$tierData = [
    'uuid' => '',
    'id' => 0,
    'name' => '',
    'is_active' => 1,
    'color' => json_encode(['type' => 'solid', 'angle' => 0, 'colors' => [['hex' => '#808080', 'percentage' => 100]]]),
    'tier_level' => 1,
    'stripe_price_id_monthly' => '',
    'stripe_price_id_yearly' => ''
];

if ($isEdit && !empty($tier)) {
    $tierData = array_merge($tierData, $tier);
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
    $html .= '                      <div class="component-color-swatch" data-ref="triggerPreview"></div>';
    $html .= '                      <span class="component-dropdown-text" data-ref="triggerHex">' . htmlspecialchars(strtoupper($hex)) . '</span>';
    $html .= '                  </div>';
    $html .= '                  <span class="material-symbols-rounded">expand_more</span>';
    $html .= '              </div>';
    $html .= '              <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="' . $id . '" data-ref="componentModule">';
    $html .= '                  <div class="component-menu component-menu--w-full component-menu--h-auto">';
    $html .= '                      <div class="pill-container"><div class="drag-handle"></div></div>';
    $html .= '                      <div class="component-color-picker" data-ref="customColorPicker" data-h="' . $hue . '" data-s="' . $sat . '" data-v="' . $val . '">';
    $html .= '                          <div class="component-color-picker__sv-area" data-action="dragSV">';
    $html .= '                              <div class="component-color-picker__sv-bg"></div>';
    $html .= '                              <div class="component-color-picker__sv-thumb" data-ref="svThumb"></div>';
    $html .= '                          </div>';
    $html .= '                          <div class="component-color-picker__hue-area" data-action="dragHue">';
    $html .= '                              <div class="component-color-picker__hue-thumb" data-ref="hueThumb"></div>';
    $html .= '                          </div>';
    $html .= '                          <div class="component-input-group component-input-group--h34 component-input-group--color">';
    $html .= '                              <div class="component-color-swatch component-color-swatch--sm" data-ref="hexInputPreview"></div>';
    $html .= '                              <input type="text" class="component-input-field component-input-field--mono" data-ref="hexInput" value="' . htmlspecialchars(strtoupper($hex)) . '" readonly>';
    $html .= '                          </div>';
    $html .= '                          <div class="' . $controlsClass . '" data-ref="controlsContainer">';
    $html .= '                              <div class="component-inline-control component-inline-control--fixed component-color-picker__percentage" data-ref="percentageControl">';
    $html .= '                                  <div class="component-inline-control__group">';
    $html .= '                                      <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>';
    $html .= '                                      <button type="button" class="component-inline-control__btn" data-action="adjustColorStop" data-step="-5"><span class="material-symbols-rounded">chevron_left</span></button>';
    $html .= '                                  </div>';
    $html .= '                                  <div class="component-inline-control__center" data-value="' . $actualPercentage . '" data-ref="percentageCenter">';
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

$featuresData = [
    'price_monthly' => $tierData['price_monthly'] ?? 0,
    'price_yearly' => $tierData['price_yearly'] ?? 0,
    'limits' => [
        'max_canvases' => $tierData['max_canvases'] ?? 1,
        'max_storage_mb' => $tierData['max_storage_mb'] ?? 20,
        'max_upload_mb' => $tierData['max_upload_mb'] ?? 10,
        'max_snapshots_per_canvas' => $tierData['max_snapshots_per_canvas'] ?? 10,
        'max_members_per_canvas' => $tierData['max_members_per_canvas'] ?? 10,
        'max_custom_palettes' => $tierData['max_custom_palettes'] ?? 0,
        'max_template_tokens' => $tierData['max_template_tokens'] ?? 0,
    ],
    'feat_advanced_roles' => $tierData['feat_advanced_roles'] ?? 0,
    'feat_chat_restriction' => $tierData['feat_chat_restriction'] ?? 0,
    'feat_custom_palettes' => $tierData['feat_custom_palettes'] ?? 0,
    'feat_custom_colors' => $tierData['feat_custom_colors'] ?? 0,
    'feat_priority_rendering' => $tierData['feat_priority_rendering'] ?? 0,
    'feat_unlimited_exports' => $tierData['feat_unlimited_exports'] ?? 0,
    'feat_beta_access' => $tierData['feat_beta_access'] ?? 0,
    'feat_inject_templates' => $tierData['feat_inject_templates'] ?? 0,
    'feat_live_share' => $tierData['feat_live_share'] ?? 0,
];

?>
<div class="view-content" data-ref="admin-subscriptions-wrapper" data-tier-uuid="<?php echo htmlspecialchars($tierData['uuid']); ?>" data-tier-active="<?php echo (int)($tierData['is_active'] ?? 1); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo $isEdit ? (__('admin_tier_edit_title')) : (__('admin_tier_new_title')); ?></h1>
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
                

                
                <!-- Detalles Accordion -->
                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">diamond</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_tier_details_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_tier_details_desc') ?: 'Configura los datos básicos e identificadores.'; ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="tier-name-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_tier_name'); ?></h2>
                                            <span class="component-display-value" data-ref="display-tier-name"><?php echo htmlspecialchars($tierData['name']) ?: (__('admin_not_configured')); ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="tier-name"><?php echo __('btn_edit'); ?></button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="tier-name-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_tier_name'); ?></h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" id="tierName" data-ref="input-tier-name" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($tierData['name']); ?>" data-original-value="<?php echo htmlspecialchars($tierData['name']); ?>" placeholder="Ej. Pro, Ultra">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="tier-name"><?php echo __('btn_cancel'); ?></button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="tier-name"><?php echo __('btn_save'); ?></button>
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
                                        <h2 class="component-card__title"><?php echo __('admin_tier_level_title') ?: 'Nivel (Tier)'; ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_level_desc') ?: 'Jerarquía numérica (0 = free, 1 = plus, etc).'; ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="tierLevel" data-step="-5" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="tierLevel" data-step="-1" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_tierLevel" data-value="<?php echo (int)$tierData['tier_level']; ?>"><?php echo (int)$tierData['tier_level']; ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="tierLevel" data-step="1" data-max="99"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="tierLevel" data-step="5" data-max="99"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>


        
                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_tier_price_monthly'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_price_monthly_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="priceMonthly" data-step="-5" data-min="0" data-decimal="true"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="priceMonthly" data-step="-1" data-min="0" data-decimal="true"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_priceMonthly" data-value="<?php echo (float)($tierData['price_monthly'] ?? 0); ?>"><?php echo number_format((float)($tierData['price_monthly'] ?? 0), 2); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="priceMonthly" data-step="1" data-max="999" data-decimal="true"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="priceMonthly" data-step="5" data-max="999" data-decimal="true"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_tier_price_yearly'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_price_yearly_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="priceYearly" data-step="-10" data-min="0" data-decimal="true"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="priceYearly" data-step="-1" data-min="0" data-decimal="true"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_priceYearly" data-value="<?php echo (float)($tierData['price_yearly'] ?? 0); ?>"><?php echo number_format((float)($tierData['price_yearly'] ?? 0), 2); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="priceYearly" data-step="1" data-max="9999" data-decimal="true"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="priceYearly" data-step="10" data-max="9999" data-decimal="true"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
        
                            <hr class="component-divider">
        
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="stripe-monthly-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_tier_stripe_monthly') ?: 'Stripe Price ID (Mensual)'; ?></h2>
                                            <span class="component-display-value" data-ref="display-stripe-monthly"><?php echo htmlspecialchars($tierData['stripe_price_id_monthly']) ?: (__('admin_not_configured')); ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="stripe-monthly"><?php echo __('btn_edit'); ?></button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="stripe-monthly-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_tier_stripe_monthly') ?: 'Stripe Price ID (Mensual)'; ?></h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-stripe-monthly" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($tierData['stripe_price_id_monthly']); ?>" data-original-value="<?php echo htmlspecialchars($tierData['stripe_price_id_monthly']); ?>" placeholder="ID Mensual">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="stripe-monthly"><?php echo __('btn_cancel'); ?></button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="stripe-monthly"><?php echo __('btn_save'); ?></button>
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
                                            <h2 class="component-card__title"><?php echo __('admin_tier_stripe_yearly') ?: 'Stripe Price ID (Anual)'; ?></h2>
                                            <span class="component-display-value" data-ref="display-stripe-yearly"><?php echo htmlspecialchars($tierData['stripe_price_id_yearly']) ?: (__('admin_not_configured')); ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="stripe-yearly"><?php echo __('btn_edit'); ?></button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="stripe-yearly-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('admin_tier_stripe_yearly') ?: 'Stripe Price ID (Anual)'; ?></h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-stripe-yearly" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($tierData['stripe_price_id_yearly']); ?>" data-original-value="<?php echo htmlspecialchars($tierData['stripe_price_id_yearly']); ?>" placeholder="ID Anual">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="stripe-yearly"><?php echo __('btn_cancel'); ?></button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="stripe-yearly"><?php echo __('btn_save'); ?></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Características Accordion -->
                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">stars</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_tier_features_title') ?: 'Características'; ?></h2>
                                <p class="component-card__description"><?php echo __('admin_tier_features_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <?php 
                            $availableFeatures = \App\Core\System\SubscriptionFeatureConfig::getAvailableFeatures();
                            $featCount = count($availableFeatures);
                            $fIndex = 0;
                            foreach ($availableFeatures as $fKey => $fData): 
                                $isChecked = !empty($featuresData[$fKey]) ? 'checked' : '';
                            ?>
                                <div class="component-group-item component-group-item--wrap">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __($fData['title_key']) ?: $fKey; ?></h2>
                                            <p class="component-card__description"><?php echo __($fData['desc_key']); ?></p>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--end">
                                        <label class="component-toggle-switch">
                                            <input type="checkbox" data-ref="feature-toggle" data-key="<?php echo $fKey; ?>" <?php echo $isChecked; ?>>
                                            <span class="component-toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <?php if (++$fIndex < $featCount): ?>
                                    <hr class="component-divider">
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

                <!-- Límites Accordion -->
                <div class="component-card--grouped component-accordion" data-ref="limits-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">speed</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_tier_limits_title') ?: 'Límites y Beneficios'; ?></h2>
                                <p class="component-card__description"><?php echo __('admin_tier_limits_desc'); ?></p>
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
                                        <h2 class="component-card__title"><?php echo __('admin_tier_limit_canvases'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_limit_canvases_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCanvases" data-step="-10" data-min="-1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCanvases" data-step="-1" data-min="-1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxCanvases" data-value="<?php echo (int)($featuresData['limits']['max_canvases'] ?? 0); ?>"><?php echo ((int)($featuresData['limits']['max_canvases'] ?? 0)) === -1 ? '∞' : (int)($featuresData['limits']['max_canvases'] ?? 0); ?></div>
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
                                        <h2 class="component-card__title"><?php echo __('admin_tier_limit_storage') ?: 'Almacenamiento Máximo (MB)'; ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_limit_storage_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxStorage" data-step="-100" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxStorage" data-step="-10" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxStorage" data-value="<?php echo (int)($featuresData['limits']['max_storage_mb'] ?? 0); ?>"><?php echo (int)($featuresData['limits']['max_storage_mb'] ?? 0); ?></div>
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
                                        <h2 class="component-card__title"><?php echo __('admin_tier_limit_upload') ?: 'Límite de Subida por Archivo (MB)'; ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_limit_upload_desc') ?: 'Peso máximo permitido por cada archivo original subido en chats y plantillas.'; ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxUpload" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxUpload" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxUpload" data-value="<?php echo (int)($featuresData['limits']['max_upload_mb'] ?? 10); ?>"><?php echo (int)($featuresData['limits']['max_upload_mb'] ?? 10); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxUpload" data-step="1" data-max="500"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxUpload" data-step="10" data-max="500"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
        
                            <hr class="component-divider">
        
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_tier_limit_capturas'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_limit_capturas_desc') ?: 'Historial máximo permitido (-1 = Ilimitado).'; ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxSnapshots" data-step="-10" data-min="-1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxSnapshots" data-step="-1" data-min="-1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxSnapshots" data-value="<?php echo (int)($featuresData['limits']['max_snapshots_per_canvas'] ?? 0); ?>"><?php echo ((int)($featuresData['limits']['max_snapshots_per_canvas'] ?? 0)) === -1 ? '∞' : (int)($featuresData['limits']['max_snapshots_per_canvas'] ?? 0); ?></div>
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
                                        <h2 class="component-card__title"><?php echo __('admin_tier_limit_members'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_limit_members_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxMembers" data-step="-10" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxMembers" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxMembers" data-value="<?php echo (int)($featuresData['limits']['max_members_per_canvas'] ?? 1); ?>"><?php echo (int)($featuresData['limits']['max_members_per_canvas'] ?? 1); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxMembers" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxMembers" data-step="10" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
        
                            <hr class="component-divider" data-requires-feature="feat_custom_palettes">
        
                            <div class="component-group-item component-group-item--stacked" data-requires-feature="feat_custom_palettes">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_tier_limit_palettes') ?: 'Paletas Personalizadas'; ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_limit_palettes_desc') ?: 'Límite máximo de paletas guardadas.'; ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCustomPalettes" data-step="-5" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCustomPalettes" data-step="-1" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxCustomPalettes" data-value="<?php echo (int)($featuresData['limits']['max_custom_palettes'] ?? 0); ?>"><?php echo (int)($featuresData['limits']['max_custom_palettes'] ?? 0); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCustomPalettes" data-step="1" data-max="50"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxCustomPalettes" data-step="5" data-max="50"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider" data-requires-feature="feat_inject_templates">
        
                            <div class="component-group-item component-group-item--stacked" data-requires-feature="feat_inject_templates">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_tier_limit_template_tokens') ?: 'Tokens de Plantilla'; ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_limit_template_tokens_desc') ?: 'Cuota máxima de tokens para inyección de plantillas.'; ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxTemplateTokens" data-step="-250" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxTemplateTokens" data-step="-50" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_featMaxTemplateTokens" data-value="<?php echo (int)($featuresData['limits']['max_template_tokens'] ?? 0); ?>"><?php echo (int)($featuresData['limits']['max_template_tokens'] ?? 0); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxTemplateTokens" data-step="50" data-max="10000"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="featMaxTemplateTokens" data-step="250" data-max="10000"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Estilo y Diseño Accordion -->
                <div class="component-card--grouped component-accordion">
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
                                        <h2 class="component-card__title"><?php echo __('admin_tier_color_type') ?: 'Tipo de Color'; ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_tier_color_type_desc') ?: 'Sólido o degradado.'; ?></p>
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
                                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleGradientAngle" data-value="<?php echo $gradientAngle; ?>" data-ref="gradientAngleTrigger">
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