<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Core\System\SubscriptionPlanConstants;

$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts  = $_SESSION['accounts'] ?? [];
$currentUserTier = 0;
if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
    $currentUserTier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
}

// Fetch all active tiers (tier_level > 0 and is_active = 1)
$allTiers = array_filter(SubscriptionPlanConstants::getAllTiers(), fn($t) => $t['tier_level'] > 0 && (isset($t['is_active']) ? (int)$t['is_active'] === 1 : true));

function formatStoragePremium(int $mb): string {
    if ($mb >= 1024) return number_format($mb / 1024, 0) . ' GB';
    return $mb . ' MB';
}

// Define rows to compare
$availableFeatures = \App\Core\System\SubscriptionFeatureConfig::getAvailableFeatures();
$rowsToCompare = [
    [
        'label' => __('plan_limit_canvases', 'Lienzos'),
        'desc' => __('plan_limit_canvases_desc', 'Proyectos simultáneos'),
        'icon' => 'dashboard',
        'values_fn' => function($t) {
            return $t['max_canvases'] == -1 ? __('plan_limit_unlimited', 'Ilimitado') : $t['max_canvases'] . ' ' . __('plan_limit_canvases', 'Lienzos');
        }
    ],
    [
        'label' => __('plan_limit_snapshots', 'Snapshots'),
        'desc' => __('plan_limit_snapshots_desc', 'Por lienzo'),
        'icon' => 'history',
        'values_fn' => function($t) {
            return $t['max_snapshots_per_canvas'] == -1 ? __('plan_limit_unlimited', 'Ilimitado') : $t['max_snapshots_per_canvas'] . ' ' . __('plan_limit_snapshots', 'Snapshots');
        }
    ],
    [
        'label' => __('plan_limit_members', 'Miembros'),
        'desc' => __('plan_limit_members_desc', 'Por lienzo'),
        'icon' => 'group',
        'values_fn' => function($t) {
            return $t['max_members_per_canvas'] == -1 ? __('plan_limit_unlimited', 'Ilimitados') : number_format($t['max_members_per_canvas']) . ' ' . __('plan_limit_members', 'Miembros');
        }
    ],
    [
        'label' => __('lbl_storage', 'Almacenamiento'),
        'desc' => __('plan_storage_desc', 'Capacidad de almacenamiento'),
        'icon' => 'cloud',
        'values_fn' => function($t) {
            return formatStoragePremium((int)($t['max_storage_mb'] ?? 0));
        }
    ],
];

foreach ($availableFeatures as $fKey => $fData) {
    $rowsToCompare[] = [
        'label' => __($fData['title_key']),
        'desc' => __($fData['desc_key']),
        'icon' => $fData['icon'],
        'values_fn' => function($t) use ($fKey, $fData) {
            $hasFeat = !empty($t[$fKey]);
            if ($fKey === 'feat_custom_palettes') {
                return $hasFeat ? ($t['max_custom_palettes'] ?? 0) : false;
            }
            return $hasFeat;
        }
    ];
}
?>
<div class="view-content" data-ref="subscription-wrapper">
    
    <?php if (empty($allTiers)): ?>
        <div class="component-viewport">
            <div class="component-wrapper component-wrapper--full">
                <div class="component-bottom" data-ref="dynamic-content-area">
                    <div class="component-empty-state" data-ref="empty-state-rendered">
                        <span class="material-symbols-rounded component-empty-state-icon">dashboard_customize</span>
                        <p class="component-empty-state-text"><?php echo __('upgrade_empty_plans'); ?></p>
                    </div>
                </div>
            </div>
        </div>
    <?php else: ?>
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('upgrade_page_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-dropdown-wrapper">
                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleBillingCycle">
                        <span class="material-symbols-rounded" data-ref="billingCycleIcon">calendar_month</span>
                        <span class="component-dropdown-text" data-ref="billingCycleText"><?php echo __('upgrade_billing_monthly'); ?></span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled bs-initialized" data-module="moduleBillingCycle">
                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            <div class="component-menu-list component-menu-list--scrollable">
                                <div class="component-menu-link active" data-action="setBillingCycle" data-value="monthly">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span><?php echo __('upgrade_billing_monthly'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-link" data-action="setBillingCycle" data-value="yearly">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded">event_repeat</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span><?php echo __('upgrade_billing_yearly'); ?></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-viewport">
            <div class="component-wrapper upgrade-wrapper">
                <div class="component-bottom">

                    <!-- Accordion List for Plans -->
                    <?php foreach ($allTiers as $tier):
                        $isPopular = !empty($tier['is_popular']);
                        $tierLevel = (int)$tier['tier_level'];
                        $monthly = number_format((float)($tier['price_monthly'] ?? 0), 2);
                        $yearly = number_format((float)($tier['price_yearly'] ?? 0) / 12, 2);
                        
                        $cardClass = 'component-card--grouped component-accordion';
                    ?>
                        <div class="<?php echo $cardClass; ?>" data-tier="<?php echo $tierLevel; ?>" data-ref="plan-card">
                            <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                                <div class="component-card__content">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded">stars</span>
                                    </div>
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">
                                            <?php echo htmlspecialchars($tier['name']); ?>
                                            <?php if ($isPopular): ?>
                                                <span class="component-badge component-badge--sm"><span><?php echo __('plan_badge_popular'); ?></span></span>
                                            <?php endif; ?>
                                        </h2>
                                        <p class="component-card__description"><?php echo __('plan_desc_' . strtolower(str_replace(' ', '_', $tier['name'])), __('upgrade_page_desc')); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                                </div>
                            </div>

                            <div class="component-accordion-body">
                                <div class="component-accordion-content">
                                    
                                    <!-- Row 1: Suscribirse / Precio -->
                                    <div class="component-group-item component-group-item--wrap">
                                        <div class="component-card__content">
                                            <div class="component-card__text">
                                                <h2 class="component-card__title"><?php echo __('upgrade_price_title', [], 'Precio y suscripción'); ?></h2>
                                                <p class="component-card__description"><?php echo __('upgrade_price_desc', [], 'Elige este plan y gestiona tu ciclo de facturación'); ?></p>
                                            </div>
                                        </div>
                                        <div class="component-card__actions component-card__actions--end">
                                            <?php if ($currentUserTier === $tierLevel): ?>
                                                <button type="button" class="component-button component-button--dark component-button--rounded-pill component-button--h36 disabled-interaction component-cursor-pointer">
                                                    <span class="material-symbols-rounded">check_circle</span>
                                                    <span><?php echo __('plan_btn_current'); ?></span>
                                                </button>
                                            <?php else: ?>
                                                <button type="button" class="component-button component-button--dark component-button--rounded-pill component-button--h36 component-button--hover-text component-cursor-pointer" data-action="subscribe" data-tier="<?php echo $tierLevel; ?>">
                                                    <span class="material-symbols-rounded">
                                                        <?php echo ($currentUserTier > $tierLevel) ? 'arrow_downward' : 'rocket_launch'; ?>
                                                    </span>
                                                    <span class="btn-default-text">
                                                        $<span data-ref="plan-price" data-monthly="<?php echo $monthly; ?>" data-yearly="<?php echo $yearly; ?>"><?php echo $monthly; ?></span>
                                                        <span data-ref="plan-period" data-period-monthly="/ <?php echo __('plan_period_month'); ?>" data-period-yearly="/ <?php echo __('plan_period_year'); ?>">/ <?php echo __('plan_period_month'); ?></span>
                                                    </span>
                                                    <span class="btn-hover-text">
                                                        <?php echo ($currentUserTier > $tierLevel) ? __('plan_btn_downgrade') : __('plan_btn_upgrade'); ?>
                                                    </span>
                                                </button>
                                            <?php endif; ?>
                                        </div>
                                    </div>

                                    <hr class="component-divider">

                                    <!-- Row 2: Ventajas / Límites -->
                                    <div class="component-group-item component-group-item--stacked">
                                        <div class="component-card__content component-card__content--full">
                                            <div class="component-card__text">
                                                <h2 class="component-card__title"><?php echo __('upgrade_features_title', [], 'Ventajas incluidas'); ?></h2>
                                                <p class="component-card__description"><?php echo __('upgrade_features_desc', [], 'Límites y características del plan'); ?></p>
                                                
                                                <div class="component-badge-grid">
                                                    <?php foreach ($rowsToCompare as $row): 
                                                        $val = $row['values_fn']($tier);
                                                        if ($val === false) continue;
                                                    ?>
                                                        <span class="component-badge component-badge--sm">
                                                            <span class="material-symbols-rounded component-icon-sm"><?php echo $row['icon']; ?></span>
                                                            <span>
                                                                <?php 
                                                                if ($val === true) {
                                                                    echo htmlspecialchars($row['label']);
                                                                } else {
                                                                    echo htmlspecialchars($row['label']) . ': ' . htmlspecialchars($val);
                                                                }
                                                                ?>
                                                            </span>
                                                        </span>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                    
                </div>

                <div class="component-disclaimer">
                    <?php echo __('upgrade_disclaimer'); ?>
                </div>

            </div>
        </div>
    <?php endif; ?>
</div>
