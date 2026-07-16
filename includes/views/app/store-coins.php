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
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('store_coins_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <div class="component-badge component-badge--warning">
                🪙 <span data-ref="user-coins-balance">...</span>
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
        <div class="component-grid" data-ref="">
            <?php foreach ($coinPackages as $pkg): ?>
            <div class="component-card component-card--grouped component-card--p18">
                <div class="component-card__content component-mb-4">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded"><?= $pkg['icon'] ?></span>
                    </div>
                    <div class="component-card__text">
                        <div class="component-card__title"><?= $pkg['name'] ?></div>
                        <div class="component-card__description"><?= $pkg['description'] ?></div>
                    </div>
                </div>
                
                <div class="component-badge-group component-mt-16">
                    <div class="component-badge">
                        <span class="material-symbols-rounded">payments</span> $<?= \App\Core\Helpers\Utils::formatNumber($pkg['price_usd'], 2) ?> USD
                    </div>
                    <div data-action="buyCoins" data-amount="<?= $pkg['amount'] ?>" class="btn-buy-coins component-badge component-badge--dark component-badge--interactive">
                        <span class="material-symbols-rounded">shopping_cart</span> <?php echo __('btn_buy'); ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    <div class="component-store-disclaimer">
        Al realizar una compra, aceptas que <strong>no hay reembolsos</strong> bajo ninguna circunstancia y que la adquisición de monedas es de carácter final. Asegúrate de revisar tu selección antes de proceder con el pago.
    </div>
    </div>
</div>
