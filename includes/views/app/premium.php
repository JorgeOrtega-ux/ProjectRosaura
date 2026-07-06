<?php
// includes/views/app/premium.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Core\System\SubscriptionPlanConstants;

// ── Datos de sesión ──
$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$tier = 0;
if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
    $tier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
}

// ── Cargar los límites de cada nivel directamente desde la fuente única (SSOT) ──
$tierBasic    = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_BASIC);
$tierPro      = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_PRO);
$tierAdvanced = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_ADVANCED);

// ── Helpers de formato ──
function formatStoragePremium(int $mb): string {
    if ($mb >= 1024) return number_format($mb / 1024) . ' GB';
    return $mb . ' MB';
}

function formatLimitPremium(int $val): string {
    if ($val === -1) return __('premium_val_unlimited');
    if ($val === 0) return __('premium_val_unavailable');
    return number_format($val);
}

// ── Construir las features de cada tarjeta dinámicamente ──
function buildCardFeatures(array $limits): array {
    $features = [];

    // 1. Almacenamiento
    $features[] = [
        'icon' => 'check',
        'text' => __('premium_card_storage', ['value' => formatStoragePremium($limits['max_storage_mb'])])
    ];

    // 2. Lienzos
    if ($limits['max_canvases'] === -1) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_canvases_unlimited'), 'bold' => true];
    } else {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_canvases', ['value' => $limits['max_canvases']])];
    }

    // 3. Miembros
    $features[] = [
        'icon' => 'check',
        'text' => __('premium_card_members', ['value' => number_format($limits['max_members_per_canvas'])])
    ];

    // 4. Snapshots
    if ($limits['max_snapshots_per_canvas'] === 0) {
        $features[] = ['icon' => 'cross', 'text' => __('premium_card_no_snapshots')];
    } elseif ($limits['max_snapshots_per_canvas'] === -1) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_snapshots_unlimited'), 'bold' => true];
    } else {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_snapshots', ['value' => $limits['max_snapshots_per_canvas']])];
    }

    // 5. Compartir en Vivo
    if ($limits['live_templates']) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_live_share'), 'bold' => true];
    } else {
        $features[] = ['icon' => 'cross', 'text' => __('premium_card_no_live_share')];
    }

    // 6. Paletas
    if ($limits['custom_palettes']) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_palettes_custom')];
    } elseif ($limits['extended_palettes']) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_palettes_extended')];
    } else {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_palettes_basic')];
    }

    // 7. Roles avanzados
    if ($limits['advanced_roles']) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_advanced_roles'), 'bold' => true];
    }

    return $features;
}

$cardFeaturesBasic    = buildCardFeatures($tierBasic);
$cardFeaturesPro      = buildCardFeatures($tierPro);
$cardFeaturesAdvanced = buildCardFeatures($tierAdvanced);

// ── Definir las filas de la tabla comparativa dinámicamente ──
$canvasSizeLabels = [
    __('premium_sizes_basic'),
    __('premium_sizes_pro'),
    __('premium_sizes_advanced'),
];

$paletteLabels = [
    __('premium_palettes_basic'),
    __('premium_palettes_extended'),
    __('premium_palettes_extended_custom'),
];

// Cada fila: 'label' => clave traducción, 'type' => numeric|boolean|text, 'values' => [basic, pro, advanced]
$comparisonRows = [
    [
        'label' => __('premium_cmp_canvases'),
        'values' => [
            formatLimitPremium($tierBasic['max_canvases']),
            formatLimitPremium($tierPro['max_canvases']),
            formatLimitPremium($tierAdvanced['max_canvases']),
        ],
        'type' => 'text'
    ],
    [
        'label' => __('premium_cmp_canvas_sizes'),
        'values' => [
            $canvasSizeLabels[0],
            $canvasSizeLabels[1],
            $canvasSizeLabels[2],
        ],
        'type' => 'text'
    ],
    [
        'label' => __('premium_cmp_storage'),
        'values' => [
            formatStoragePremium($tierBasic['max_storage_mb']),
            formatStoragePremium($tierPro['max_storage_mb']),
            formatStoragePremium($tierAdvanced['max_storage_mb']),
        ],
        'type' => 'text'
    ],
    [
        'label' => __('premium_cmp_members'),
        'values' => [
            number_format($tierBasic['max_members_per_canvas']),
            number_format($tierPro['max_members_per_canvas']),
            number_format($tierAdvanced['max_members_per_canvas']),
        ],
        'type' => 'text'
    ],
    [
        'label' => __('premium_cmp_live'),
        'values' => [
            $tierBasic['live_templates'],
            $tierPro['live_templates'],
            $tierAdvanced['live_templates'],
        ],
        'type' => 'boolean'
    ],
    [
        'label' => __('premium_cmp_palettes'),
        'values' => [
            $paletteLabels[0],
            $paletteLabels[1],
            $paletteLabels[2],
        ],
        'type' => 'text'
    ],
    [
        'label' => __('premium_cmp_custom_palettes'),
        'values' => [
            $tierBasic['custom_palettes'],
            $tierPro['custom_palettes'],
            $tierAdvanced['custom_palettes'],
        ],
        'type' => 'boolean'
    ],
    [
        'label' => __('premium_cmp_snapshots'),
        'values' => [
            formatLimitPremium($tierBasic['max_snapshots_per_canvas']),
            formatLimitPremium($tierPro['max_snapshots_per_canvas']),
            formatLimitPremium($tierAdvanced['max_snapshots_per_canvas']),
        ],
        'type' => 'text'
    ],
    [
        'label' => __('premium_cmp_advanced_roles'),
        'values' => [
            $tierBasic['advanced_roles'],
            $tierPro['advanced_roles'],
            $tierAdvanced['advanced_roles'],
        ],
        'type' => 'boolean'
    ],
];
?>
<style>
/* CSS Exclusivo para Premium adaptado a components.css */
.pricing-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;
    margin-bottom: 48px;
    width: 100%;
}

/* Toggle Switch Facturación */
.billing-toggle-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
    margin-top: 16px;
}

.billing-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.2s ease;
    user-select: none;
}

.billing-label.active {
    color: var(--text-primary);
}

.billing-discount {
    background-color: var(--color-success-bg);
    color: var(--color-success);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: var(--sl-border-radius-pill);
    margin-left: 6px;
    font-weight: 700;
}

.toggle-switch {
    position: relative;
    width: 50px;
    height: 28px;
    background-color: var(--bg-hover-light);
    border: var(--border-dynamic);
    border-radius: var(--sl-border-radius-pill);
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.toggle-knob {
    position: absolute;
    top: 2px;
    left: 3px;
    width: 22px;
    height: 22px;
    background-color: var(--text-primary);
    border-radius: 50%;
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.billing-yearly-active .toggle-knob {
    transform: translateX(20px);
    background-color: var(--action-primary);
}

.billing-yearly-active .toggle-switch {
    border-color: var(--action-primary);
}

/* Pricing Cards - TAMAÑO FIJO */
.pricing-card {
    width: 320px; 
    max-width: 100%; 
    flex: 0 0 auto;
    background-color: var(--bg-surface);
    border: var(--border-dynamic);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    position: relative;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.pricing-card:hover {
    border-color: var(--border-color-hover);
}

.pricing-card.featured {
    border: 2px solid var(--action-primary);
    box-shadow: var(--shadow-card);
}

.featured-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--action-primary);
    color: var(--text-inverse);
    padding: 2px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
}

.plan-name {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.plan-price-wrapper {
    display: flex;
    align-items: baseline;
    margin-bottom: 12px;
}

.plan-currency {
    font-size: 20px;
    color: var(--text-primary);
    font-weight: 700;
}

.plan-price, .plan-period {
    transition: opacity 0.15s ease;
}

.plan-price {
    font-size: 36px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
}

.plan-period {
    font-size: 13px;
    color: var(--text-secondary);
    margin-left: 4px;
}

.plan-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
    line-height: 1.4;
}

.plan-features {
    list-style: none;
    padding: 0;
    margin: 0 0 24px 0;
    flex-grow: 1;
}

.plan-features li {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--text-primary);
}

.feature-icon-check {
    color: var(--color-success);
    font-size: 18px !important;
}

.feature-icon-cross {
    color: var(--text-tertiary);
    font-size: 18px !important;
}

/* Tabla Comparativa */
.comparison-wrapper {
    margin: 32px auto 0 auto;
    width: 100%;
    max-width: 1008px; 
}

.comparison-title {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 24px;
}
</style>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full" style="max-width: 1050px;">
        
        <div style="text-align: center; padding: 24px 0;">
            <h1 class="component-page-title"><?php echo __('premium_page_title'); ?></h1>
            <p class="component-page-description" style="max-width: 600px; margin: 0 auto;"><?php echo __('premium_page_desc'); ?></p>
        </div>

        <div class="billing-toggle-container" id="premiumBillingToggle">
            <span class="billing-label active" id="lblMonthly"><?php echo __('premium_billing_monthly'); ?></span>
            <div class="toggle-switch">
                <div class="toggle-knob"></div>
            </div>
            <span class="billing-label" id="lblYearly">
                <?php echo __('premium_billing_yearly'); ?> <span class="billing-discount"><?php echo __('premium_billing_save'); ?></span>
            </span>
        </div>
        
        <p style="text-align: center; font-size: 13px; color: var(--text-secondary); margin-top: -16px; margin-bottom: 32px;"><?php echo __('premium_billing_currency_note'); ?></p>

        <div class="pricing-grid">
            
            <?php
            // ── Definición de las tarjetas ──
            $plans = [
                [
                    'tier'       => 0,
                    'name_key'   => 'premium_plan_basic',
                    'desc_key'   => 'premium_desc_basic',
                    'css_class'  => '',
                    'badge'      => null,
                    'monthly'    => 0,
                    'yearly'     => 0,
                    'features'   => $cardFeaturesBasic,
                    'btn_class'  => 'component-button component-button--full component-button--h45',
                    'btn_adv'    => false,
                ],
                [
                    'tier'       => 1,
                    'name_key'   => 'premium_plan_pro',
                    'desc_key'   => 'premium_desc_pro',
                    'css_class'  => 'featured',
                    'badge'      => ['key' => 'premium_badge_popular', 'class' => 'featured-badge'],
                    'monthly'    => 15,
                    'yearly'     => 144,
                    'features'   => $cardFeaturesPro,
                    'btn_class'  => 'component-button component-button--dark component-button--full component-button--h45',
                    'btn_adv'    => false,
                ],
                [
                    'tier'       => 2,
                    'name_key'   => 'premium_plan_advanced',
                    'desc_key'   => 'premium_desc_advanced',
                    'css_class'  => '',
                    'badge'      => ['key' => 'premium_badge_top', 'class' => 'featured-badge'],
                    'monthly'    => 35,
                    'yearly'     => 336,
                    'features'   => $cardFeaturesAdvanced,
                    'btn_class'  => 'component-button component-button--dark component-button--full component-button--h45',
                    'btn_adv'    => false,
                ],
            ];

            foreach ($plans as $plan):
                $planTier = $plan['tier'];
            ?>
            <div class="pricing-card <?php echo $plan['css_class']; ?>" data-tier="<?php echo $planTier; ?>">
                <?php if ($plan['badge']): ?>
                    <div class="<?php echo $plan['badge']['class']; ?>"><?php echo __($plan['badge']['key']); ?></div>
                <?php endif; ?>
                
                <div class="plan-name"><?php echo __($plan['name_key']); ?></div>
                <div class="plan-price-wrapper">
                    <span class="plan-currency">$</span>
                    <span class="plan-price" data-monthly="<?php echo $plan['monthly']; ?>" data-yearly="<?php echo $plan['yearly']; ?>"><?php echo $plan['monthly']; ?></span>
                    <span class="plan-period" data-period-monthly="<?php echo __('premium_period_month'); ?>" data-period-yearly="<?php echo __('premium_period_year'); ?>"><?php echo __('premium_period_month'); ?></span>
                </div>
                <p class="plan-desc"><?php echo __($plan['desc_key']); ?></p>
                
                <ul class="plan-features">
                    <?php foreach ($plan['features'] as $feat): 
                        $iconClass = $feat['icon'] === 'check' ? 'feature-icon-check' : 'feature-icon-cross';
                        $iconName  = $feat['icon'] === 'check' ? 'check_circle' : 'cancel';
                        $isBold    = !empty($feat['bold']);
                    ?>
                    <li>
                        <span class="material-symbols-rounded <?php echo $iconClass; ?>"><?php echo $iconName; ?></span>
                        <?php echo $isBold ? '<b>' . $feat['text'] . '</b>' : $feat['text']; ?>
                    </li>
                    <?php endforeach; ?>
                </ul>

                <?php if ($tier === $planTier): ?>
                    <div class="<?php echo $plan['btn_class']; ?> disabled" style="cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center;"><?php echo __('premium_btn_current'); ?></div>
                <?php elseif ($planTier === 0): ?>
                    <div class="component-button component-button--full component-button--h45" data-action="subscribe" data-tier="0" style="cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center;"><?php echo __('premium_btn_downgrade_basic'); ?></div>
                <?php elseif ($planTier === 1 && $tier > 1): ?>
                    <div class="<?php echo $plan['btn_class']; ?>" data-action="subscribe" data-tier="1" style="cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center;"><?php echo __('premium_btn_downgrade_pro'); ?></div>
                <?php elseif ($planTier === 1): ?>
                    <div class="<?php echo $plan['btn_class']; ?>" data-action="subscribe" data-tier="1" style="cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center;"><?php echo __('premium_btn_upgrade_pro'); ?></div>
                <?php elseif ($planTier === 2): ?>
                    <div class="<?php echo $plan['btn_class']; ?>" data-action="subscribe" data-tier="2" style="cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center;"><?php echo __('premium_btn_upgrade_advanced'); ?></div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>

        </div>

        <!-- ── Tabla Comparativa Dinámica ── -->
        <div class="comparison-wrapper">
            <h2 class="comparison-title"><?php echo __('premium_cmp_title'); ?></h2>
            <div class="component-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('premium_cmp_features'); ?></th>
                            <th><?php echo __('premium_plan_basic'); ?></th>
                            <th><?php echo __('premium_plan_pro'); ?></th>
                            <th><?php echo __('premium_plan_advanced'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($comparisonRows as $row): ?>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;"><?php echo $row['label']; ?></td>
                            <?php foreach ($row['values'] as $i => $val): ?>
                                <td>
                                    <?php if ($row['type'] === 'boolean'): ?>
                                        <?php if ($val): ?>
                                            <span class="material-symbols-rounded feature-icon-check">check</span>
                                        <?php else: ?>
                                            <span class="material-symbols-rounded feature-icon-cross">remove</span>
                                        <?php endif; ?>
                                    <?php else: ?>
                                        <?php echo $val; ?>
                                    <?php endif; ?>
                                </td>
                            <?php endforeach; ?>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>
