<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Core\System\SubscriptionPlanConstants;
$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$tier = 0;
if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
    $tier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
}
$tierBasic    = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_BASIC);
$tierPro      = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_PRO);
$tierAdvanced = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_ADVANCED);
function formatStoragePremium(int $mb): string {
    if ($mb >= 1024) return number_format($mb / 1024) . ' GB';
    return $mb . ' MB';
}

function formatLimitPremium(int $val): string {
    if ($val === -1) return __('premium_val_unlimited');
    if ($val === 0) return __('premium_val_unavailable');
    return number_format($val);
}
function buildCardFeatures(array $limits): array {
    $features = [];
    $features[] = [
        'icon' => 'check',
        'text' => __('premium_card_storage', ['value' => formatStoragePremium($limits['max_storage_mb'])])
    ];
    if ($limits['max_canvases'] === -1) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_canvases_unlimited'), 'bold' => true];
    } else {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_canvases', ['value' => $limits['max_canvases']])];
    }
    $features[] = [
        'icon' => 'check',
        'text' => __('premium_card_members', ['value' => number_format($limits['max_members_per_canvas'])])
    ];
    if ($limits['max_snapshots_per_canvas'] === 0) {
        $features[] = ['icon' => 'cross', 'text' => __('premium_card_no_snapshots')];
    } elseif ($limits['max_snapshots_per_canvas'] === -1) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_snapshots_unlimited'), 'bold' => true];
    } else {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_snapshots', ['value' => $limits['max_snapshots_per_canvas']])];
    }
    if ($limits['live_templates']) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_live_share'), 'bold' => true];
    } else {
        $features[] = ['icon' => 'cross', 'text' => __('premium_card_no_live_share')];
    }
    if ($limits['custom_palettes']) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_palettes_custom')];
    } elseif ($limits['extended_palettes']) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_palettes_extended')];
    } else {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_palettes_basic')];
    }
    if ($limits['advanced_roles']) {
        $features[] = ['icon' => 'check', 'text' => __('premium_card_advanced_roles'), 'bold' => true];
    }

    return $features;
}

$cardFeaturesBasic    = buildCardFeatures($tierBasic);
$cardFeaturesPro      = buildCardFeatures($tierPro);
$cardFeaturesAdvanced = buildCardFeatures($tierAdvanced);
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
<div class="view-content">
    <div class="component-wrapper component-wrapper--full component-max-w-1200">
        
        <div class="component-text-center component-py-24">
            <h1 class="component-page-title"><?php echo __('premium_page_title'); ?></h1>
            <p class="component-page-description component-max-w-600"><?php echo __('premium_page_desc'); ?></p>
        </div>

        <div class="component-flex-center-row component-mb-32 component-mt-16" id="billingToggle">
            <span class="component-text-notice component-font-600 component-cursor-pointer" id="lblMonthly"><?php echo __('premium_billing_monthly'); ?></span>
            
            <label class="component-toggle-switch">
                <input type="checkbox" id="billingCheckboxToggle" autocomplete="off">
                <span class="component-toggle-slider"></span>
            </label>

            <span class="component-text-notice component-text-notice--muted component-font-600 component-cursor-pointer" id="lblYearly">
                <?php echo __('premium_billing_yearly'); ?> <span class="component-badge component-badge--sm component-badge--success component-ml-6"><?php echo __('premium_billing_save'); ?></span>
            </span>
        </div>
        
        <p class="component-text-center component-text-sm component-text-secondary component-mt-n16 component-mb-32"><?php echo __('premium_billing_currency_note'); ?></p>

        <div class="component-flex-center-gap">
            
            <?php
            $prices = SubscriptionPlanConstants::getTierPrices();
            $plans = [
                [
                    'tier'       => 0,
                    'name_key'   => 'premium_plan_basic',
                    'desc_key'   => 'premium_desc_basic',
                    'css_class'  => '',
                    'badge'      => null,
                    'monthly'    => $prices[0]['monthly'],
                    'yearly'     => $prices[0]['yearly'],
                    'features'   => $cardFeaturesBasic,
                    'btn_class'  => 'component-button component-button--full component-button--h45',
                    'btn_adv'    => false,
                ],
                [
                    'tier'       => 1,
                    'name_key'   => 'premium_plan_pro',
                    'desc_key'   => 'premium_desc_pro',
                    'css_class'  => 'component-card--featured',
                    'badge'      => ['key' => 'premium_badge_popular', 'class' => 'component-badge component-badge--primary component-badge--top-center'],
                    'monthly'    => $prices[1]['monthly'],
                    'yearly'     => $prices[1]['yearly'],
                    'features'   => $cardFeaturesPro,
                    'btn_class'  => 'component-button component-button--dark component-button--full component-button--h45',
                    'btn_adv'    => false,
                ],
                [
                    'tier'       => 2,
                    'name_key'   => 'premium_plan_advanced',
                    'desc_key'   => 'premium_desc_advanced',
                    'css_class'  => '',
                    'badge'      => ['key' => 'premium_badge_top', 'class' => 'component-badge component-badge--warning component-badge--top-center'],
                    'monthly'    => $prices[2]['monthly'],
                    'yearly'     => $prices[2]['yearly'],
                    'features'   => $cardFeaturesAdvanced,
                    'btn_class'  => 'component-button component-button--dark component-button--full component-button--h45',
                    'btn_adv'    => false,
                ],
            ];

            foreach ($plans as $plan):
                $planTier = $plan['tier'];
            ?>
            <div class="component-card component-card--grouped component-card--p18 component-card--w320 <?php echo $plan['css_class']; ?>" data-tier="<?php echo $planTier; ?>" data-ref="plan-card">
                <?php if ($plan['badge']): ?>
                    <div class="<?php echo $plan['badge']['class']; ?>"><?php echo __($plan['badge']['key']); ?></div>
                <?php endif; ?>
                
                <div class="component-card__title component-text-lg component-font-bold component-mb-8"><?php echo __($plan['name_key']); ?></div>
                <div class="component-flex-baseline component-mb-12">
                    <span class="component-text-lg component-font-bold component-text-primary">$</span>
                    <span data-ref="plan-price" data-monthly="<?php echo $plan['monthly']; ?>" data-yearly="<?php echo $plan['yearly']; ?>" class="component-text-xxl component-font-bold component-text-primary component-lh-1 component-transition-opacity"><?php echo $plan['monthly']; ?></span>
                    <span data-ref="plan-period" data-period-monthly="<?php echo __('premium_period_month'); ?>" data-period-yearly="<?php echo __('premium_period_year'); ?>" class="component-text-sm component-text-secondary component-ml-4 component-transition-opacity"><?php echo __('premium_period_month'); ?></span>
                </div>
                <p class="component-card__description component-border-bottom"><?php echo __($plan['desc_key']); ?></p>
                
                <ul class="component-list-none">
                    <?php foreach ($plan['features'] as $feat): 
                        $iconClass = $feat['icon'] === 'check' ? 'component-text-success' : 'component-text-tertiary';
                        $iconName  = $feat['icon'] === 'check' ? 'check_circle' : 'cancel';
                        $isBold    = !empty($feat['bold']);
                    ?>
                    <li class="component-flex-center-gap-8 component-mb-12 component-text-md component-text-primary">
                        <span class="material-symbols-rounded component-icon-sm <?php echo $iconClass; ?>"><?php echo $iconName; ?></span>
                        <?php echo $isBold ? '<b>' . $feat['text'] . '</b>' : $feat['text']; ?>
                    </li>
                    <?php endforeach; ?>
                </ul>

                <?php if ($tier === $planTier): ?>
                    <div class="<?php echo $plan['btn_class']; ?> disabled component-cursor-pointer component-text-center component-flex-center-row"><?php echo __('premium_btn_current'); ?></div>
                <?php elseif ($planTier === 0): ?>
                    <div class="component-button component-button--full component-button--h45 component-cursor-pointer component-text-center component-flex-center-row" data-action="subscribe" data-tier="0"><?php echo __('premium_btn_downgrade_basic'); ?></div>
                <?php elseif ($planTier === 1 && $tier > 1): ?>
                    <div class="<?php echo $plan['btn_class']; ?> component-cursor-pointer component-text-center component-flex-center-row" data-action="subscribe" data-tier="1"><?php echo __('premium_btn_downgrade_pro'); ?></div>
                <?php elseif ($planTier === 1): ?>
                    <div class="<?php echo $plan['btn_class']; ?> component-cursor-pointer component-text-center component-flex-center-row" data-action="subscribe" data-tier="1"><?php echo __('premium_btn_upgrade_pro'); ?></div>
                <?php elseif ($planTier === 2): ?>
                    <div class="<?php echo $plan['btn_class']; ?> component-cursor-pointer component-text-center component-flex-center-row" data-action="subscribe" data-tier="2"><?php echo __('premium_btn_upgrade_advanced'); ?></div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>

        </div>

        <div class="component-mt-32 component-w-full component-max-w-1008">
            <h2 class="component-page-title component-text-center component-mb-24"><?php echo __('premium_cmp_title'); ?></h2>
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
                            <td class="component-font-600"><?php echo $row['label']; ?></td>
                            <?php foreach ($row['values'] as $i => $val): ?>
                                <td>
                                    <?php if ($row['type'] === 'boolean'): ?>
                                        <?php if ($val): ?>
                                            <span class="material-symbols-rounded component-text-success component-icon-sm">check</span>
                                        <?php else: ?>
                                            <span class="material-symbols-rounded component-text-tertiary component-icon-sm">remove</span>
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
