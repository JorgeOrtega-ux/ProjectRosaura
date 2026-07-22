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
?>
<div class="view-content" data-ref="premium-wrapper">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('upgrade_page_title'); ?>&nbsp;<span class="component-text-gradient-blue">ProjectRosaura</span></h1>
        </div>
        <div class="component-top-right">
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper component-wrapper--full">
            <div class="component-bottom">

                <div class="component-page-intro">
                    <h1 class="component-page-intro__title"><?php echo __('upgrade_page_title'); ?>&nbsp;<span class="component-text-gradient-blue">ProjectRosaura</span></h1>
                    <p class="component-page-intro__desc"><?php echo __('upgrade_page_desc'); ?></p>

                    <div class="component-toggle-group" id="billingToggle">
                        <div class="component-toggle-group__wrapper">
                            <button type="button" class="component-button component-button--dark component-button--rounded-pill component-button--h40 component-toggle-group__button component-toggle-group__button--w145" id="lblMonthly"><?php echo __('upgrade_billing_monthly'); ?></button>
                            <button type="button" class="component-button component-button--ghost component-button--rounded-pill component-button--h40 component-toggle-group__button component-toggle-group__button--w145 component-text-notice--muted" id="lblYearly"><?php echo __('upgrade_billing_yearly'); ?></button>
                        </div>
                        <input type="checkbox" id="billingCheckboxToggle" autocomplete="off" hidden>
                    </div>
                </div>

                <div class="component-flex-center-gap">
                    <?php foreach ($allTiers as $tier): 
                        $feats = $tier['features'];
                        $isPopular = !empty($feats['is_popular']);
                        $tierLevel = (int)$tier['tier_level'];
                        
                        $monthly = number_format((float)($feats['price_monthly'] ?? 0), 2);
                        $yearly = number_format((float)($feats['price_yearly'] ?? 0) / 12, 2);
                        $oldPrice = number_format(((float)($feats['price_monthly'] ?? 0)) * 1.5, 2);

                        $limits = $feats['limits'] ?? $feats; // Backward compatibility
                        $storage = (int)($limits['max_storage_mb'] ?? 0);
                        
                        $availableFeatures = \App\Core\System\SubscriptionFeatureConfig::getAvailableFeatures();
                        $cardClass = 'component-card component-plan-card component-card--grouped component-card--p18 component-card--w560 component-card--flow-top component-card--fw500';
                        if ($isPopular) $cardClass .= ' component-card--featured';
                        
                        // Handle dynamic colors
                        $colorStyle = '';
                        if (!empty($tier['color'])) {
                            $c = $tier['color'];
                            if (($c['type'] ?? 'solid') === 'gradient') {
                                $angle = $c['angle'] ?? 90;
                                $stops = [];
                                $prev = 0;
                                foreach (($c['colors'] ?? []) as $sc) {
                                    $end = $prev + ($sc['percentage'] ?? 0);
                                    $stops[] = $sc['hex'] . " {$prev}% {$end}%";
                                    $prev = $end;
                                }
                                if ($stops) {
                                    $colorStyle = "background: conic-gradient(from {$angle}deg, " . implode(', ', $stops) . "); -webkit-background-clip: text; -webkit-text-fill-color: transparent;";
                                }
                            } else {
                                $solidHex = $c['colors'][0]['hex'] ?? '#808080';
                                $colorStyle = "color: {$solidHex};";
                            }
                        }
                    ?>
                    <div class="<?php echo $cardClass; ?>" data-tier="<?php echo $tierLevel; ?>" data-ref="plan-card">
                        
                        <div class="component-plan-card__header">
                            <div>
                                <?php if ($isPopular): ?>
                                    <span class="component-badge component-badge--sm" style="margin-bottom: 8px;"><span class="component-text-gradient-blue"><?php echo __('plan_badge_popular'); ?></span></span>
                                <?php endif; ?>
                                <h2 class="component-plan-card__title"><?php echo htmlspecialchars($tier['name']); ?></h2>
                            </div>
                            <!-- Note: The desc is dynamic per tier. If we don't have a specific description key in DB, we can use a generic one or map it -->
                            <p class="component-plan-card__desc"><?php echo __('plan_desc_' . strtolower(str_replace(' ', '_', $tier['name'])), __('upgrade_page_desc')); ?></p>

                            <div class="component-plan-card__storage">
                                <span class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded component-badge__icon component-icon-sm">cloud</span>
                                    <span><?php echo formatStoragePremium($storage); ?> <?php echo __('lbl_storage'); ?></span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="component-plan-card__body">
                            <div class="component-plan-card__price-section">
                                <?php if ((float)$oldPrice > 0): ?>
                                    <div class="component-plan-card__old-price">USD <?php echo $oldPrice; ?></div>
                                <?php endif; ?>
                                
                                <div class="component-plan-card__price-row">
                                    <span class="component-plan-card__price-amount">USD&nbsp;</span>
                                    <span data-ref="plan-price" data-monthly="<?php echo $monthly; ?>" data-yearly="<?php echo $yearly; ?>" class="component-plan-card__price-amount"><?php echo $monthly; ?></span>
                                    <span data-ref="plan-period" data-period-monthly="<?php echo __('plan_period_month'); ?>" data-period-yearly="<?php echo __('plan_period_year'); ?>" class="component-plan-card__period"><?php echo __('plan_period_month'); ?></span>
                                </div>

                                <div class="component-plan-card__price-subtext"><?php echo __('upgrade_billing_currency_note'); ?></div>
                            </div>

                            <div class="component-plan-card__action">
                                <?php if ($currentUserTier === $tierLevel): ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 disabled-interaction component-cursor-pointer component-text-center"><?php echo __('plan_btn_current'); ?></div>
                                <?php elseif ($currentUserTier > $tierLevel): ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="<?php echo $tierLevel; ?>"><?php echo __('plan_btn_downgrade'); ?></div>
                                <?php else: ?>
                                    <div class="component-button component-button--dark component-button--rounded-pill component-button--full component-button--h40 component-cursor-pointer component-text-center" data-action="subscribe" data-tier="<?php echo $tierLevel; ?>"><?php echo __('plan_btn_upgrade'); ?></div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="component-plan-card__footer">
                            <ul class="component-plan-card__features-list">
                                
                                <!-- Limits -->
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">dashboard</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo $limits['max_canvases'] == -1 ? __('plan_limit_unlimited', 'Ilimitado') . ' ' . __('plan_limit_canvases', 'Lienzos') : $limits['max_canvases'] . ' ' . __('plan_limit_canvases', 'Lienzos'); ?></span>
                                        <span class="component-plan-card__feature-desc"><?php echo __('plan_limit_canvases_desc', 'Proyectos simultáneos'); ?></span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">history</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo $limits['max_snapshots_per_canvas'] == -1 ? __('plan_limit_unlimited', 'Ilimitado') . ' ' . __('plan_limit_snapshots', 'Snapshots') : $limits['max_snapshots_per_canvas'] . ' ' . __('plan_limit_snapshots', 'Snapshots'); ?></span>
                                        <span class="component-plan-card__feature-desc"><?php echo __('plan_limit_snapshots_desc', 'Por lienzo'); ?></span>
                                    </div>
                                </li>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon">group</span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo $limits['max_members_per_canvas'] == -1 ? __('plan_limit_unlimited', 'Ilimitados') . ' ' . __('plan_limit_members', 'Miembros') : number_format($limits['max_members_per_canvas']) . ' ' . __('plan_limit_members', 'Miembros'); ?></span>
                                        <span class="component-plan-card__feature-desc"><?php echo __('plan_limit_members_desc', 'Por lienzo'); ?></span>
                                    </div>
                                </li>

                                <!-- Boolean Features -->
                                <?php 
                                foreach ($availableFeatures as $fKey => $fData): 
                                    if (empty($feats[$fKey])) continue; // Only show enabled features
                                    
                                    $titleStr = __($fData['title_key']);
                                    if ($fKey === 'feat_custom_palettes') {
                                        $titleStr = __($fData['title_key'], ['value' => $limits['max_custom_palettes'] ?? 0]);
                                    }
                                ?>
                                <li class="component-plan-card__feature-item">
                                    <span class="material-symbols-rounded component-icon-sm component-plan-card__feature-icon"><?php echo htmlspecialchars($fData['icon']); ?></span>
                                    <div class="component-plan-card__feature-text">
                                        <span class="component-plan-card__feature-name"><?php echo $titleStr; ?></span>
                                        <span class="component-plan-card__feature-desc"><?php echo __($fData['desc_key']); ?></span>
                                    </div>
                                </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>

                    </div>
                    <?php endforeach; ?>
                </div>
                
                <div class="component-disclaimer component-margin-top-32">
                    <?php echo __('upgrade_disclaimer'); ?>
                </div>

            </div>
        </div>
    </div>
</div>
