<?php
use App\Api\Services\App\AppViewService;

$viewService = new AppViewService();
$coinPackages = $viewService->getStoreCoinsData();
?>
<div class="view-content" data-ref="store-coins-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('store_coins_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <button class="component-button component-button--primary component-button--h40" data-nav="/store/coins">
                    <span class="material-symbols-rounded">toll</span> 
                    <span data-ref="user-coins-balance">0</span>
                </button>
                
                <div class="component-actions disabled" data-ref="store-coins-selection-actions">
                    <button class="component-button component-button--primary component-button--h40" data-action="buySelectedCoins" data-tooltip="<?php echo __('btn_buy'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">shopping_cart</span>
                        <span><?php echo __('btn_buy'); ?></span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <?php if (empty($coinPackages)): ?>
            <div class="component-empty-state" data-ref="empty-state-rendered">
                <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                <p class="component-empty-state-text"><?php echo __('store_coins_empty'); ?></p>
            </div>
            <?php else: ?>
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('th_package') ?: 'Paquete'; ?></th>
                            <th><?php echo __('th_amount') ?: 'Cantidad'; ?></th>
                            <th><?php echo __('th_bonus') ?: 'Bonificación'; ?></th>
                            <th><?php echo __('th_price'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($coinPackages as $pkg): ?>
                        <tr class="component-table-row clickable" data-action="selectCoinPackage" data-amount="<?= $pkg['amount'] ?>" data-price="<?= $pkg['price_usd'] ?>">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-card__icon-container component-card__icon-container--bordered component-card__icon-container--round">
                                        <span class="material-symbols-rounded"><?= $pkg['icon'] ?></span>
                                    </div>
                                    <div class="component-badge component-badge--sm">
                                        <span ><?= $pkg['name'] ?></span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">toll</span>
                                    <span><?= \App\Core\Helpers\Utils::formatNumber($pkg['amount']) ?> <?= __('coins'); ?></span>
                                </div>
                            </td>
                            <td>
                                <?php if (!empty($pkg['bonus_text'])): ?>
                                <div class="component-badge component-badge--sm component-badge--success">
                                    <span class="material-symbols-rounded">stars</span>
                                    <span><?= $pkg['bonus_text'] ?></span>
                                </div>
                                <?php else: ?>
                                <div class="component-badge component-badge--sm component-badge--muted">
                                    <span>-</span>
                                </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">payments</span>
                                    <span >$<?= \App\Core\Helpers\Utils::formatNumber($pkg['price_usd'], 2) ?> USD</span>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>
