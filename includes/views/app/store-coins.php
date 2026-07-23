<?php
use App\Core\System\StorePackagesConfig;

$coinPackages = [];
if (class_exists(StorePackagesConfig::class) && method_exists(StorePackagesConfig::class, 'getCoinPackages')) {
    try {
        $coinPackages = StorePackagesConfig::getCoinPackages();
        if (!is_array($coinPackages)) $coinPackages = [];
    } catch (\Throwable $e) {
        $coinPackages = [];
    }
}
?>
<div class="view-content" data-ref="store-coins-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('store_coins_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="store-coins-selection-actions">
                    <button class="component-button component-button--primary component-button--h40" data-action="buySelectedCoins" data-tooltip="<?php echo __('btn_buy'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">shopping_cart</span>
                        <span><?php echo __('btn_buy'); ?></span>
                    </button>
                </div>
                
                <div class="component-badge component-badge--warning">
                    <span class="material-symbols-rounded">toll</span> <span data-ref="user-coins-balance">0</span>
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
                            <th><?php echo __('th_price') ?: 'Precio'; ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($coinPackages as $pkg): ?>
                        <tr class="component-table-row clickable" data-action="selectCoinPackage" data-amount="<?= $pkg['amount'] ?>" data-price="<?= $pkg['price_usd'] ?>">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded"><?= $pkg['icon'] ?></span>
                                    </div>
                                    <span class="component-text-bold"><?= $pkg['name'] ?></span>
                                </div>
                            </td>
                            <td>
                                <span><?= \App\Core\Helpers\Utils::formatNumber($pkg['amount']) ?> <?= __('coins') ?: 'Monedas'; ?></span>
                                <?php if (!empty($pkg['bonus_text'])): ?>
                                <span class="component-badge component-badge--success component-badge--sm ml-2">
                                    <span class="material-symbols-rounded">stars</span> <?= $pkg['bonus_text'] ?>
                                </span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <span class="component-text-bold">$<?= \App\Core\Helpers\Utils::formatNumber($pkg['price_usd'], 2) ?> USD</span>
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
