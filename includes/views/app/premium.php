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
            'title' => 'Lienzos ilimitados',
            'desc' => 'Obtén límites de uso sin restricciones para todos tus proyectos.'
        ];
    } else {
        $core[] = [
            'icon' => 'check',
            'title' => 'Límites de uso ampliados',
            'desc' => 'Obtén ' . $limits['max_canvases'] . ' lienzos y mayor capacidad de almacenamiento.'
        ];
    }

    if ($limits['live_templates']) {
        $core[] = [
            'icon' => 'check',
            'title' => 'Colaboración en vivo',
            'desc' => 'Invita hasta ' . number_format($limits['max_members_per_canvas']) . ' miembros a colaborar en tiempo real.'
        ];
    }

    if ($limits['allow_live_chat']) {
        $core[] = [
            'icon' => 'check',
            'title' => 'Chat en vivo',
            'desc' => 'Comunícate con tu equipo directamente en la plataforma.'
        ];
    }

    // Advanced Features
    if ($limits['custom_palettes'] && $limits['advanced_roles']) {
        $advanced[] = [
            'icon' => 'palette',
            'title' => 'Herramientas Profesionales',
            'desc' => 'Crea paletas personalizadas y gestiona roles avanzados.'
        ];
    } elseif ($limits['extended_palettes']) {
        $advanced[] = [
            'icon' => 'palette',
            'title' => 'Paletas ampliadas',
            'desc' => 'Mayor variedad de colores predefinidos para tus diseños.'
        ];
    }

    $advanced[] = [
        'icon' => 'folder_open',
        'title' => 'Gestión de recursos',
        'desc' => 'Acceso a un panel de control con opciones ampliadas.'
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
        'btn_text'   => 'Obtener Pro',
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
        'btn_text'   => 'Obtener Advanced',
        'features'   => $cardFeaturesAdvanced,
        'css_class'  => '',
        'is_recommended' => false,
        'btn_class'  => 'component-button component-button--rounded-pill component-button--full component-button--h45'
    ],
    [
        'tier'       => 3,
        'title'      => 'Ultra',
        'storage'    => formatStoragePremium($tierUltra['max_storage_mb']),
        'old_price'  => 'Desde', 
        'monthly'    => $prices[3]['monthly'],
        'yearly'     => $prices[3]['yearly'],
        'btn_text'   => 'Obtener Ultra',
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
            <h1 class="component-page-title">Actualiza para obtener más acceso a <span class="component-text-primary">Premium</span></h1>
            <p class="component-page-description">Cancela cuando quieras. Al suscribirte, aceptas las condiciones de nuestro servicio.</p>
        </div>

        <div class="component-toggle-group" id="billingToggle">
            <div class="component-toggle-group__wrapper">
                <button type="button" class="component-button component-button--dark component-button--rounded-pill component-toggle-group__button" id="lblMonthly">Mensual</button>
                <button type="button" class="component-button component-button--ghost component-button--rounded-pill component-toggle-group__button component-text-notice--muted" id="lblYearly">Anual</button>
            </div>
            <!-- Using HTML hidden attribute instead of CSS class to guarantee it stays invisible without inline styles -->
            <input type="checkbox" id="billingCheckboxToggle" autocomplete="off" hidden>
        </div>
        
        <p class="component-discount-note">Ahorra 20% con el pago anual</p>

        <!-- Cards flex container -->
        <div class="component-flex-center-gap component-flex-wrap">
            
            <?php foreach ($plans as $plan): 
                $planTier = $plan['tier'];
            ?>
            <div class="component-card component-card--grouped component-card--p18 component-card--w320 component-card--h-full <?php echo $plan['css_class']; ?>" data-tier="<?php echo $planTier; ?>" data-ref="plan-card">
                
                <div class="component-card__header">
                    <?php if ($plan['is_recommended']): ?>
                        <div class="component-badge component-badge--primary component-badge--top-center">Recomendado</div>
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
                            <span><?php echo $plan['storage']; ?> de almacenamiento</span>
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
                            <div class="component-button component-button--rounded-pill component-button--full component-button--h45 disabled-interactive component-cursor-pointer component-text-center">Tu Plan Actual</div>
                        <?php elseif ($planTier < $tier): ?>
                            <div class="component-button component-button--rounded-pill component-button--full component-button--h45 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="<?php echo $planTier; ?>">Bajar de nivel</div>
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
                        <div class="component-card__features-title">Incluye mayor nivel de acceso a las herramientas y más</div>
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
