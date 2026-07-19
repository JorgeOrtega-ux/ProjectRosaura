<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Core\System\SubscriptionPlanConstants;
$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$tier = 0;
if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
    $tier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
}

$tierPro      = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_PRO);
$tierAdvanced = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_ADVANCED);
$tierUltra    = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_ULTRA);

function formatStoragePremium(int $mb): string {
    if ($mb >= 1024) return number_format($mb / 1024) . ' GB';
    return $mb . ' MB';
}

function buildCardFeatures(array $limits): array {
    $core = [];
    $advanced = [];
    
    // Core Features
    if ($limits['max_canvases'] === -1) {
        $core[] = [
            'icon' => 'check',
            'title' => __('premium_feat_unlimited_canvases_title'),
            'desc' => __('premium_feat_unlimited_canvases_desc')
        ];
    } else {
        $core[] = [
            'icon' => 'check',
            'title' => __('premium_feat_expanded_limits_title'),
            'desc' => __('premium_feat_expanded_limits_desc', ['canvases' => $limits['max_canvases']])
        ];
    }

    if ($limits['live_templates']) {
        $core[] = [
            'icon' => 'check',
            'title' => __('premium_feat_live_collab_title'),
            'desc' => __('premium_feat_live_collab_desc', ['members' => number_format($limits['max_members_per_canvas'])])
        ];
    }

    if ($limits['allow_live_chat']) {
        $core[] = [
            'icon' => 'check',
            'title' => __('premium_feat_live_chat_title'),
            'desc' => __('premium_feat_live_chat_desc')
        ];
    }

    // Advanced Features
    if ($limits['custom_palettes'] && $limits['advanced_roles']) {
        $advanced[] = [
            'icon' => 'palette',
            'title' => __('premium_feat_pro_tools_title'),
            'desc' => __('premium_feat_pro_tools_desc')
        ];
    } elseif ($limits['extended_palettes']) {
        $advanced[] = [
            'icon' => 'palette',
            'title' => __('premium_feat_extended_palettes_title'),
            'desc' => __('premium_feat_extended_palettes_desc')
        ];
    }

    $advanced[] = [
        'icon' => 'folder_open',
        'title' => __('premium_feat_resource_mgmt_title'),
        'desc' => __('premium_feat_resource_mgmt_desc')
    ];

    return ['core' => $core, 'advanced' => $advanced];
}

$cardFeaturesPro      = buildCardFeatures($tierPro);
$cardFeaturesAdvanced = buildCardFeatures($tierAdvanced);
$cardFeaturesUltra    = buildCardFeatures($tierUltra);

$prices = SubscriptionPlanConstants::getTierPrices();
$plans = [
    [
        'tier'       => 1,
        'title'      => 'Pro',
        'storage'    => formatStoragePremium($tierPro['max_storage_mb']),
        'old_price'  => 'USD ' . ($prices[1]['monthly'] * 1.5), 
        'monthly'    => $prices[1]['monthly'],
        'yearly'     => $prices[1]['yearly'],
        'btn_text'   => __('btn_get_pro'),
        'features'   => $cardFeaturesPro,
        'css_class'  => 'component-card--featured',
        'is_recommended' => true,
        'btn_class'  => 'component-button component-button--rounded-pill component-button--full component-button--h45'
    ],
    [
        'tier'       => 2,
        'title'      => 'Advanced',
        'storage'    => formatStoragePremium($tierAdvanced['max_storage_mb']),
        'old_price'  => 'USD ' . ($prices[2]['monthly'] * 1.5),
        'monthly'    => $prices[2]['monthly'],
        'yearly'     => $prices[2]['yearly'],
        'btn_text'   => __('btn_get_advanced'),
        'features'   => $cardFeaturesAdvanced,
        'css_class'  => '',
        'is_recommended' => false,
        'btn_class'  => 'component-button component-button--rounded-pill component-button--full component-button--h45'
    ],
    [
        'tier'       => 3,
        'title'      => 'Ultra',
        'storage'    => formatStoragePremium($tierUltra['max_storage_mb']),
        'old_price'  => __('lbl_from'), 
        'monthly'    => $prices[3]['monthly'],
        'yearly'     => $prices[3]['yearly'],
        'btn_text'   => __('btn_get_ultra'),
        'features'   => $cardFeaturesUltra,
        'css_class'  => '',
        'is_recommended' => false,
        'btn_class'  => 'component-button component-button--dark component-button--rounded-pill component-button--full component-button--h45'
    ],
];
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full component-max-w-1200">
        
        <div class="component-page-header">
            <h1 class="component-page-title"><?php echo __('premium_page_title'); ?></h1>
            <p class="component-page-description"><?php echo __('premium_page_desc'); ?></p>
        </div>

        <div class="component-toggle-group" id="billingToggle">
            <div class="component-toggle-group__wrapper">
                <button type="button" class="component-button component-button--dark component-button--rounded-pill component-toggle-group__button" id="lblMonthly"><?php echo __('lbl_monthly'); ?></button>
                <button type="button" class="component-button component-button--ghost component-button--rounded-pill component-toggle-group__button component-text-notice--muted" id="lblYearly"><?php echo __('lbl_yearly'); ?></button>
            </div>
            <input type="checkbox" id="billingCheckboxToggle" autocomplete="off" hidden>
        </div>
        
        <p class="component-discount-note"><?php echo __('premium_discount_note'); ?></p>

        <div class="component-flex-center-gap component-flex-wrap">
            
            <?php foreach ($plans as $plan): 
                $planTier = $plan['tier'];
            ?>
            <div class="component-card component-card--grouped component-card--p18 component-card--w320 component-card--h-full <?php echo $plan['css_class']; ?>" data-tier="<?php echo $planTier; ?>" data-ref="plan-card">
                
                <div class="component-card__header">
                    <?php if ($plan['is_recommended']): ?>
                        <div class="component-badge component-badge--primary component-badge--top-center"><?php echo __('badge_recommended'); ?></div>
                    <?php endif; ?>
                    
                    <div class="component-card__brand">
                        <span class="material-symbols-rounded component-text-primary">stars</span>
                        <span class="component-text-lg component-font-bold"><?php echo $plan['title']; ?></span>
                    </div>
                </div>
                
                <div class="component-card__body">
                    <div class="component-card__storage-badge-wrapper">
                        <span class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded component-badge__icon component-icon-sm">cloud</span>
                            <span><?php echo $plan['storage']; ?> <?php echo __('lbl_storage'); ?></span>
                        </span>
                    </div>

                    <div class="component-card__price-box">
                        <div class="component-card__price-prefix">
                            <span class="component-text-sm component-text-secondary <?php echo ($plan['tier'] !== 3) ? 'component-text-line-through' : ''; ?>">
                                <?php echo $plan['old_price']; ?>
                            </span>
                            <span class="component-text-lg component-font-bold <?php echo $plan['is_recommended'] ? 'component-text-success' : 'component-text-primary'; ?>">
                                USD
                            </span>
                        </div>
                        <span data-ref="plan-price" data-monthly="<?php echo $plan['monthly']; ?>" data-yearly="<?php echo $plan['yearly']; ?>" class="component-text-xxl component-font-bold <?php echo $plan['is_recommended'] ? 'component-text-success' : 'component-text-primary'; ?> component-lh-1 component-transition-opacity"><?php echo $plan['monthly']; ?></span>
                        <span data-ref="plan-period" data-period-monthly="/mes" data-period-yearly="/año" class="component-text-sm <?php echo $plan['is_recommended'] ? 'component-text-success' : 'component-text-secondary'; ?> component-transition-opacity component-card__price-suffix">/mes</span>
                    </div>
                    
                    <div class="component-card__action">
                        <?php if ($tier === $planTier): ?>
                            <div class="component-button component-button--rounded-pill component-button--full component-button--h45 disabled-interactive component-cursor-pointer component-text-center"><?php echo __('btn_current_plan'); ?></div>
                        <?php elseif ($planTier < $tier): ?>
                            <div class="component-button component-button--rounded-pill component-button--full component-button--h45 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="<?php echo $planTier; ?>"><?php echo __('btn_downgrade'); ?></div>
                        <?php else: ?>
                            <div class="<?php echo $plan['btn_class']; ?> component-cursor-pointer component-text-center" data-action="subscribe" data-tier="<?php echo $planTier; ?>"><?php echo $plan['btn_text']; ?></div>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="component-card__footer">
                    <ul class="component-card__features-list">
                        <?php foreach ($plan['features']['core'] as $feat): ?>
                        <li class="component-card__feature-item">
                            <span class="material-symbols-rounded component-icon-sm component-card__feature-icon"><?php echo $feat['icon']; ?></span>
                            <div class="component-card__feature-text">
                                <span class="component-card__feature-name"><?php echo $feat['title']; ?></span>
                                <span class="component-card__feature-desc"><?php echo $feat['desc']; ?></span>
                            </div>
                        </li>
                        <?php endforeach; ?>
                    </ul>
                    
                    <?php if (!empty($plan['features']['advanced'])): ?>
                        <hr class="component-card__divider">
                        <div class="component-card__features-title"><?php echo __('premium_includes_more_tools'); ?></div>
                        <ul class="component-card__features-list">
                            <?php foreach ($plan['features']['advanced'] as $feat): ?>
                            <li class="component-card__feature-item">
                                <span class="material-symbols-rounded component-icon-sm component-text-secondary component-card__feature-icon"><?php echo $feat['icon']; ?></span>
                                <div class="component-card__feature-text">
                                    <span class="component-card__feature-name"><?php echo $feat['title']; ?></span>
                                    <span class="component-card__feature-desc"><?php echo $feat['desc']; ?></span>
                                </div>
                            </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>
                </div>

            </div>
            <?php endforeach; ?>

        </div>
        
        <div class="component-store-disclaimer">
            <?php echo __('premium_disclaimer'); ?>
        </div>
    </div>
</div>
