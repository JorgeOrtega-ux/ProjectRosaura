<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Core\System\SubscriptionPlanConstants;

$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts  = $_SESSION['accounts'] ?? [];
$tier = 0;
if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
    $tier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
}

$tierPlus  = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_PLUS);
$tierPro   = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_PRO);
$tierUltra = SubscriptionPlanConstants::getTierLimits(SubscriptionPlanConstants::TIER_ULTRA);

function formatStoragePremium(int $mb): string {
    if ($mb >= 1024) return number_format($mb / 1024, 0) . ' GB';
    return $mb . ' MB';
}

$prices = SubscriptionPlanConstants::getTierPrices();

$plusMonthly  = number_format($prices[1]['monthly'], 2);
$plusYearly   = number_format($prices[1]['yearly'] / 12, 2);
$proMonthly   = number_format($prices[2]['monthly'], 2);
$proYearly    = number_format($prices[2]['yearly'] / 12, 2);
$ultraMonthly = number_format($prices[3]['monthly'], 2);
$ultraYearly  = number_format($prices[3]['yearly'] / 12, 2);

?>
<div class="view-content" data-ref="premium-wrapper">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('premium_page_title'); ?>&nbsp;<span class="component-text-gradient-blue">ProjectRosaura</span></h1>
        </div>
        <div class="component-top-right">
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper component-wrapper--full">
            <div class="component-bottom">

                <!-- Header Libre sin bordes -->
                <div class="component-page-intro">
                    <h1 class="component-page-intro__title"><?php echo __('premium_page_title'); ?>&nbsp;<span class="component-text-gradient-blue">ProjectRosaura</span></h1>
                    <p class="component-page-intro__desc"><?php echo __('premium_page_desc'); ?></p>

                    <div class="component-toggle-group" id="billingToggle">
                        <div class="component-toggle-group__wrapper">
                            <button type="button" class="component-button component-button--dark component-button--rounded-pill component-button--h40 component-toggle-group__button component-toggle-group__button--w145" id="lblMonthly"><?php echo __('premium_billing_monthly'); ?></button>
                            <button type="button" class="component-button component-button--ghost component-button--rounded-pill component-button--h40 component-toggle-group__button component-toggle-group__button--w145 component-text-notice--muted" id="lblYearly"><?php echo __('premium_billing_yearly'); ?></button>
                        </div>
                        <input type="checkbox" id="billingCheckboxToggle" autocomplete="off" hidden>
                    </div>
                </div>

                <!-- Contenedor Flex de 3 Tarjetas de Suscripción -->
                <div class="component-flex-center-gap">
                    
                    <!-- Tarjeta 1: Plus (Tier 1) -->
                    <div class="component-card component-plan-card component-card--grouped component-card--p18 component-card--w560 component-card--flow-top component-card--fw500" data-tier="1" data-ref="plan-card">
                        
                        <div class="component-plan-card__header">
                            <h2 class="component-plan-card__title"><?php echo __('premium_plan_plus'); ?></h2>
                            <p class="component-plan-card__desc"><?php echo __('premium_desc_plus'); ?></p>

                            <div class="component-plan-card__storage">
                                <span class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded component-badge__icon component-icon-sm">cloud</span>
                                    <span><?php echo formatStoragePremium($tierPlus['max_storage_mb']); ?> <?php echo __('lbl_storage'); ?></span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="component-plan-card__body">
                            <div class="component-plan-card__price-section">
                                <div class="component-plan-card__old-price">USD <?php echo number_format($prices[1]['monthly'] * 1.5, 2); ?></div>
                                
                                <div class="component-plan-card__price-row">
                                    <span class="component-plan-card__price-amount">USD&nbsp;</span>
                                    <span data-ref="plan-price" data-monthly="<?php echo $plusMonthly; ?>" data-yearly="<?php echo $plusYearly; ?>" class="component-plan-card__price-amount"><?php echo $plusMonthly; ?></span>
                                    <span data-ref="plan-period" data-period-monthly="<?php echo __('premium_period_month'); ?>" data-period-yearly="<?php echo __('premium_period_year'); ?>" class="component-plan-card__period"><?php echo __('premium_period_month'); ?></span>
                                </div>

                                <div class="component-plan-card__price-subtext"><?php echo __('premium_billing_currency_note'); ?></div>
                            </div>

                            <div class="component-plan-card__action">
                                <?php if ($tier === 1): ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 disabled-interactive component-cursor-pointer component-text-center"><?php echo __('premium_btn_current'); ?></div>
                                <?php elseif ($tier > 1): ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="1"><?php echo __('premium_btn_downgrade_plus'); ?></div>
                                <?php else: ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="1">Mejorar a Plus</div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="component-plan-card__footer">
                            <ul class="component-plan-card__features-list">
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">check</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_canvases', ['value' => $tierPlus['max_canvases']]); ?></span>
                                        <span class="component-plan-card__feature-desc">Hasta <?php echo $tierPlus['max_canvases']; ?> lienzos activos.</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">check</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_members', ['value' => number_format($tierPlus['max_members_per_canvas'])]); ?></span>
                                        <span class="component-plan-card__feature-desc">Colaboración ampliada en tiempo real.</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">check</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name">Plantillas en Vivo</span>
                                        <span class="component-plan-card__feature-desc">Sincronización de plantillas en el lienzo.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                    </div>

                    <!-- Tarjeta 2: Pro (Recomendado - Tier 2) -->
                    <div class="component-card component-plan-card component-card--grouped component-card--p18 component-card--w560 component-card--flow-top component-card--fw500 component-card--featured" data-tier="2" data-ref="plan-card">
                        
                        <div class="component-plan-card__header">
                            <div>
                                <span class="component-plan-card__tag component-text-gradient-blue"><?php echo __('premium_badge_popular'); ?></span>
                                <h2 class="component-plan-card__title"><?php echo __('premium_plan_pro'); ?></h2>
                            </div>
                            <p class="component-plan-card__desc"><?php echo __('premium_desc_pro'); ?></p>

                            <div class="component-plan-card__storage">
                                <span class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded component-badge__icon component-icon-sm">cloud</span>
                                    <span><?php echo formatStoragePremium($tierPro['max_storage_mb']); ?> <?php echo __('lbl_storage'); ?></span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="component-plan-card__body">
                            <div class="component-plan-card__price-section">
                                <div class="component-plan-card__old-price">USD <?php echo number_format($prices[2]['monthly'] * 1.5, 2); ?></div>
                                
                                <div class="component-plan-card__price-row">
                                    <span class="component-plan-card__price-amount">USD&nbsp;</span>
                                    <span data-ref="plan-price" data-monthly="<?php echo $proMonthly; ?>" data-yearly="<?php echo $proYearly; ?>" class="component-plan-card__price-amount"><?php echo $proMonthly; ?></span>
                                    <span data-ref="plan-period" data-period-monthly="<?php echo __('premium_period_month'); ?>" data-period-yearly="<?php echo __('premium_period_year'); ?>" class="component-plan-card__period"><?php echo __('premium_period_month'); ?></span>
                                </div>

                                <div class="component-plan-card__price-subtext"><?php echo __('premium_billing_currency_note'); ?></div>
                            </div>

                            <div class="component-plan-card__action">
                                <?php if ($tier === 2): ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 disabled-interactive component-cursor-pointer component-text-center"><?php echo __('premium_btn_current'); ?></div>
                                <?php elseif (2 < $tier): ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="2"><?php echo __('premium_btn_downgrade_pro'); ?></div>
                                <?php else: ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="2"><?php echo __('premium_btn_upgrade_pro'); ?></div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="component-plan-card__footer">
                            <ul class="component-plan-card__features-list">
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">check</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_canvases', ['value' => $tierPro['max_canvases']]); ?></span>
                                        <span class="component-plan-card__feature-desc">Crea hasta <?php echo $tierPro['max_canvases']; ?> lienzos activos simultáneos.</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">check</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_members', ['value' => number_format($tierPro['max_members_per_canvas'])]); ?></span>
                                        <span class="component-plan-card__feature-desc">Colaboración fluida para equipos de 2,500 miembros.</span>
                                    </div>
                                </li>
                            </ul>
                            
                            <hr class="component-plan-card__divider">
                            <div class="component-plan-card__features-title"><?php echo __('premium_feat_title_pro'); ?></div>
                            
                            <ul class="component-plan-card__features-list">
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-text-secondary component-plan-card__feature-icon">palette</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name">Paletas Personalizadas (5)</span>
                                        <span class="component-plan-card__feature-desc">Crea hasta 5 paletas de colores exclusivas.</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-text-secondary component-plan-card__feature-icon">admin_panel_settings</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name">Roles Avanzados</span>
                                        <span class="component-plan-card__feature-desc">Gestión completa de permisos por lienzo.</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-text-secondary component-plan-card__feature-icon">history</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_snapshots', ['value' => $tierPro['max_snapshots_per_canvas']]); ?></span>
                                        <span class="component-plan-card__feature-desc">Guarda hasta 100 versiones de historial.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                    </div>

                    <!-- Tarjeta 3: Ultra (Máximo Nivel - Tier 3) -->
                    <div class="component-card component-plan-card component-card--grouped component-card--p18 component-card--w560 component-card--flow-top component-card--fw500" data-tier="3" data-ref="plan-card">
                        
                        <div class="component-plan-card__header">
                            <div>
                                <h2 class="component-plan-card__title"><?php echo __('premium_plan_ultra'); ?></h2>
                            </div>
                            <p class="component-plan-card__desc"><?php echo __('premium_desc_ultra'); ?></p>

                            <div class="component-plan-card__storage">
                                <span class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded component-badge__icon component-icon-sm">cloud</span>
                                    <span><?php echo formatStoragePremium($tierUltra['max_storage_mb']); ?> <?php echo __('lbl_storage'); ?></span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="component-plan-card__body">
                            <div class="component-plan-card__price-section">
                                <div class="component-plan-card__old-price">USD <?php echo number_format($prices[3]['monthly'] * 1.5, 2); ?></div>
                                
                                <div class="component-plan-card__price-row">
                                    <span class="component-plan-card__price-amount">USD&nbsp;</span>
                                    <span data-ref="plan-price" data-monthly="<?php echo $ultraMonthly; ?>" data-yearly="<?php echo $ultraYearly; ?>" class="component-plan-card__price-amount"><?php echo $ultraMonthly; ?></span>
                                    <span data-ref="plan-period" data-period-monthly="<?php echo __('premium_period_month'); ?>" data-period-yearly="<?php echo __('premium_period_year'); ?>" class="component-plan-card__period"><?php echo __('premium_period_month'); ?></span>
                                </div>

                                <div class="component-plan-card__price-subtext">Acceso prioritario y herramientas sin límites</div>
                            </div>

                            <div class="component-plan-card__action">
                                <?php if ($tier === 3): ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 disabled-interactive component-cursor-pointer component-text-center"><?php echo __('premium_btn_current'); ?></div>
                                <?php else: ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="3"><?php echo __('premium_btn_upgrade_ultra'); ?></div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="component-plan-card__footer">
                            <ul class="component-plan-card__features-list">
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">check</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_canvases', ['value' => $tierUltra['max_canvases']]); ?></span>
                                        <span class="component-plan-card__feature-desc">Capacidad máxima para grandes organizaciones (50 lienzos).</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">check</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_members', ['value' => number_format($tierUltra['max_members_per_canvas'])]); ?></span>
                                        <span class="component-plan-card__feature-desc">Hasta 50,000 miembros interactuando simultáneamente.</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">check</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_snapshots_unlimited'); ?></span>
                                        <span class="component-plan-card__feature-desc">Historial completo de versiones sin límite.</span>
                                    </div>
                                </li>
                            </ul>
                            
                            <hr class="component-plan-card__divider">
                            <div class="component-plan-card__features-title"><?php echo __('premium_feat_title_ultra'); ?></div>
                            
                            <ul class="component-plan-card__features-list">
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-text-secondary component-plan-card__feature-icon">palette</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo __('premium_card_palettes_custom'); ?></span>
                                        <span class="component-plan-card__feature-desc">Crea hasta 25 paletas de colores personalizadas.</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-text-secondary component-plan-card__feature-icon">forum</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name">Chat en vivo en el lienzo</span>
                                        <span class="component-plan-card__feature-desc">Comunicación integrada en tiempo real.</span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-text-secondary component-plan-card__feature-icon">terminal</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name">Soporte y Ejecución Prioritaria</span>
                                        <span class="component-plan-card__feature-desc">Procesamiento preferencial en servidores.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                    </div>

                </div>
                
                <div class="component-disclaimer component-margin-top-32">
                    <?php echo __('premium_disclaimer'); ?>
                </div>

            </div>
        </div>
    </div>
</div>
