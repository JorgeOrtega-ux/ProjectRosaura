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
            <div class="component-wrapper component-wrapper--full upgrade-wrapper">
                <div class="component-bottom upgrade-bottom-section">
                    <div class="upgrade-bottom-header">
                        <h2 class="upgrade-bottom-title">Actualiza para obtener más acceso</h2>
                        <p class="upgrade-bottom-desc">Cancela cuando quieras. Si actualizas, aceptas las condiciones</p>
                    </div>

                    <div class="upgrade-cards-container">
                        <?php foreach ($allTiers as $tier):
                            $isPopular = !empty($tier['is_popular']);
                            $tierLevel = (int)$tier['tier_level'];
                            $monthly = number_format((float)($tier['price_monthly'] ?? 0), 2);
                            $yearly = number_format((float)($tier['price_yearly'] ?? 0) / 12, 2);
                            
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
                                        <div class="upgrade-card-popular-badge">Recomendado</div>
                                    <?php endif; ?>
                                    <h3 class="upgrade-card-title"><?php echo htmlspecialchars($tier['name']); ?></h3>
                                    <p class="upgrade-card-desc">Acelera tus flujos de trabajo con mayor acceso a la IA</p>
                                    <span class="component-badge component-badge--sm upgrade-card-storage-badge">
                                        <span class="material-symbols-rounded">cloud</span>
                                        <span><?php echo $storageLabel; ?></span>
                                    </span>
                                </div>

                                <div>
                                    <div class="upgrade-card-price-label">Desde</div>
                                    <div class="upgrade-card-price-container">
                                        <span class="upgrade-card-price">
                                            USD $<span data-ref="plan-price" data-monthly="<?php echo $monthly; ?>" data-yearly="<?php echo $yearly; ?>"><?php echo $monthly; ?></span>
                                        </span>
                                        <span class="upgrade-card-period" data-ref="plan-period" data-period-monthly="al mes" data-period-yearly="al año">al mes</span>
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
                                                Obtener <?php echo htmlspecialchars($tier['name']); ?>
                                            </span>
                                            <span class="btn-hover-text">
                                                <?php echo ($currentUserTier > $tierLevel) ? __('plan_btn_downgrade') : __('plan_btn_upgrade'); ?>
                                            </span>
                                        </button>
                                    <?php endif; ?>
                                </div>

                                <hr class="component-divider" style="margin: 0;">

                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <div class="upgrade-card-features">
                                        <?php 
                                        $featureIndex = 0;
                                        foreach ($rowsToCompare as $row): 
                                            $val = $row['values_fn']($tier);
                                            if ($val === false) continue;
                                            
                                            $featureTitle = $val === true ? htmlspecialchars($row['label']) : htmlspecialchars($val) . ' de ' . htmlspecialchars($row['label']);
                                            
                                            $desc = "Obtén mayor acceso y funciones avanzadas para mejorar tu productividad.";
                                            if ($row['icon'] === 'cloud' || stripos($row['label'], 'almacenamiento') !== false) {
                                                $desc = "Guarda todos tus proyectos y archivos sin preocuparte por el espacio.";
                                            } elseif (stripos($row['label'], 'proyecto') !== false || $row['icon'] === 'dashboard') {
                                                $desc = "Crea y gestiona múltiples proyectos simultáneamente con total libertad.";
                                            } elseif (stripos($row['label'], 'soporte') !== false) {
                                                $desc = "Atención prioritaria para resolver tus dudas de forma rápida y eficaz.";
                                            } elseif (stripos($row['label'], 'agente') !== false || stripos($row['label'], 'snapshot') !== false) {
                                                $desc = "Despliega recursos con mayores límites de frecuencia y capacidad.";
                                            }
                                        ?>
                                            <?php if ($featureIndex === 2): // Add separator after the second feature ?>
                                                <div class="upgrade-card-feature-divider-container">
                                                    <hr class="component-divider upgrade-card-feature-divider">
                                                    <p class="upgrade-card-feature-divider-text">Incluye mayor nivel de acceso a los modelos más potentes y más</p>
                                                </div>
                                            <?php endif; ?>

                                            <div class="upgrade-card-feature-item">
                                                <span class="material-symbols-rounded upgrade-card-feature-icon"><?php echo $row['icon']; ?></span>
                                                <div class="upgrade-card-feature-text-container">
                                                    <span class="upgrade-card-feature-title"><?php echo $featureTitle; ?></span>
                                                    <span class="upgrade-card-feature-desc"><?php echo $desc; ?></span>
                                                </div>
                                            </div>
                                        <?php 
                                        $featureIndex++;
                                        endforeach; ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <div class="component-disclaimer">
                    <?php echo __('upgrade_disclaimer'); ?>
                </div>

            </div>
        </div>
    <?php endif; ?>
</div>
