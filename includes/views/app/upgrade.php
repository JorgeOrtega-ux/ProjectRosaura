<?php
use App\Api\Services\App\AppViewService;

$viewService = new AppViewService();
$upgradeData = $viewService->getUpgradePageData();

$currentUserTier = $upgradeData['currentUserTier'];
$allTiers = $upgradeData['allTiers'];
$rowsToCompare = $upgradeData['rowsToCompare'];
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
        </div>

        <div class="component-viewport">
            <div class="component-wrapper component-wrapper--full upgrade-wrapper">
                <div class="component-bottom upgrade-bottom-section">
                    <div class="upgrade-bottom-header">
                        <h2 class="upgrade-bottom-title"><?php echo __('upgrade_bottom_title'); ?></h2>
                        <p class="upgrade-bottom-desc"><?php echo __('upgrade_bottom_desc'); ?></p>
                        <div class="component-toggle-pill">
                            <button type="button" class="component-button component-button--rounded-pill active" data-action="setBillingCycle" data-value="monthly">
                                <?php echo __('upgrade_billing_monthly'); ?>
                            </button>
                            <button type="button" class="component-button component-button--rounded-pill" data-action="setBillingCycle" data-value="yearly">
                                <?php echo __('upgrade_billing_yearly'); ?>
                            </button>
                        </div>
                    </div>

                    <div class="upgrade-cards-container">
                        <?php foreach ($allTiers as $tier):
                            $isPopular = !empty($tier['is_popular']);
                            $tierLevel = (int)$tier['tier_level'];
                            $monthly = number_format((float)($tier['price_monthly'] ?? 0), 2);
                            $yearly = number_format((float)($tier['price_yearly'] ?? 0), 2);
                            
                            $storageLabel = '200 MB de almacenamiento'; // default placeholder
                            foreach ($rowsToCompare as $row) {
                                if ($row['icon'] === 'cloud') {
                                    $val = $row['values_fn']($tier);
                                    if ($val !== false) {
                                        $storageLabel = $val === true ? $row['label'] : $val . ' de ' . $row['label'];
                                    }
                                }
                            }
                        ?>
                            <div class="component-card component-card--grouped upgrade-card <?php echo $isPopular ? 'upgrade-card--popular' : 'upgrade-card--standard'; ?>" data-tier="<?php echo $tierLevel; ?>" data-ref="plan-card">
                                
                                <div>
                                    <?php if ($isPopular): ?>
                                        <div class="upgrade-card-popular-badge"><?php echo __('upgrade_card_popular_badge'); ?></div>
                                    <?php endif; ?>
                                    <h3 class="upgrade-card-title"><?php echo htmlspecialchars($tier['name']); ?></h3>
                                    <p class="upgrade-card-desc"><?php echo __('upgrade_card_desc'); ?></p>
                                    <span class="component-badge component-badge--sm upgrade-card-storage-badge">
                                        <span class="material-symbols-rounded">cloud</span>
                                        <span><?php echo $storageLabel; ?></span>
                                    </span>
                                </div>

                                <div>
                                    <div class="upgrade-card-price-label"><?php echo __('upgrade_card_price_from'); ?></div>
                                    <div class="upgrade-card-price-container">
                                        <span class="upgrade-card-price">
                                            USD $<span data-ref="plan-price" data-monthly="<?php echo $monthly; ?>" data-yearly="<?php echo $yearly; ?>"><?php echo $monthly; ?></span>
                                        </span>
                                        <span class="upgrade-card-period" data-ref="plan-period" data-period-monthly="<?php echo __('upgrade_period_monthly_full'); ?>" data-period-yearly="<?php echo __('upgrade_period_yearly_full'); ?>"><?php echo __('upgrade_period_monthly_full'); ?></span>
                                    </div>
                                </div>

                                <div>
                                    <?php if ($currentUserTier === $tierLevel): ?>
                                        <button type="button" class="component-button component-button--dark component-button--rounded-pill disabled-interaction component-cursor-pointer upgrade-card-button">
                                            <span class="material-symbols-rounded">check_circle</span>
                                            <span><?php echo __('plan_btn_current'); ?></span>
                                        </button>
                                    <?php else: ?>
                                        <button type="button" class="component-button component-button--dark component-button--rounded-pill component-button--hover-text component-cursor-pointer upgrade-card-button <?php echo $isPopular ? 'upgrade-card-button--popular' : ''; ?>" data-action="subscribe" data-tier="<?php echo $tierLevel; ?>">
                                            <span class="btn-default-text">
                                                <?php echo sprintf(__('plan_btn_get'), htmlspecialchars($tier['name'])); ?>
                                            </span>
                                            <span class="btn-hover-text">
                                                <?php echo ($currentUserTier > $tierLevel) ? __('plan_btn_downgrade') : __('plan_btn_upgrade'); ?>
                                            </span>
                                        </button>
                                    <?php endif; ?>
                                </div>

                                <hr class="component-divider">

                                <div>
                                    <div class="upgrade-card-features">
                                        <?php 
                                        $featureIndex = 0;
                                        foreach ($rowsToCompare as $row): 
                                            $val = $row['values_fn']($tier);
                                            if ($val === false) continue;
                                            
                                            $featureTitle = $val === true ? htmlspecialchars($row['label']) : htmlspecialchars($val) . ' de ' . htmlspecialchars($row['label']);
                                            
                                            $desc = htmlspecialchars($row['desc'] ?? '');
                                        ?>
                                            <?php if ($featureIndex === 2): // Add separator after the second feature ?>
                                                <div class="upgrade-card-feature-divider-container">
                                                    <hr class="component-divider upgrade-card-feature-divider">
                                                    <p class="upgrade-card-feature-divider-text"><?php echo __('upgrade_card_feature_divider_text'); ?></p>
                                                </div>
                                            <?php endif; ?>

                                            <div class="upgrade-card-feature-item <?php echo $featureIndex > 4 ? 'upgrade-card-feature-item--hidden' : ''; ?>" data-hidden="<?php echo $featureIndex > 4 ? 'true' : 'false'; ?>">
                                                <span class="material-symbols-rounded upgrade-card-feature-icon"><?php echo $row['icon']; ?></span>
                                                <div class="upgrade-card-feature-text-container">
                                                    <span class="upgrade-card-feature-title"><?php echo $featureTitle; ?></span>
                                                    <span class="upgrade-card-feature-desc"><?php echo $desc; ?></span>
                                                </div>
                                            </div>
                                        <?php 
                                        $featureIndex++;
                                        endforeach; ?>
                                        
                                        <?php if ($featureIndex > 5): ?>
                                            <div class="upgrade-card-features-toggle-container">
                                                <span class="component-badge component-cursor-pointer" data-action="toggle-plan-features">Mostrar todos los beneficios</span>
                                            </div>
                                        <?php endif; ?>
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
        </div>
    <?php endif; ?>
</div>
