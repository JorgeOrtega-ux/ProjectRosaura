<?php
use App\Core\System\StorePackagesConfig;

$contentPackages = [];
if (class_exists(StorePackagesConfig::class) && method_exists(StorePackagesConfig::class, 'getContentPackages')) {
    try {
        $contentPackages = StorePackagesConfig::getContentPackages();
        if (!is_array($contentPackages)) $contentPackages = [];
    } catch (\Throwable $e) {
        $contentPackages = [];
    }
}
$isFirst = true;
?>
<div class="view-content" data-ref="store-content-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('store_content_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <div class="component-badge component-badge--warning">
                <span class="material-symbols-rounded">toll</span> <span data-ref="user-coins-balance">0</span>
            </div>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-header-card">
                    <h1 class="component-page-title"><?php echo __('store_content_title'); ?></h1>
                    <p class="component-page-description"><?php echo __('store_content_desc'); ?></p>
                </div>

                <?php if (empty($contentPackages)): ?>
                <div class="component-empty-state" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                    <p class="component-empty-state-text"><?php echo __('store_content_empty'); ?></p>
                </div>
                <?php else: ?>
                <div class="component-card--grouped">
                    <?php foreach ($contentPackages as $pkg): ?>
                    <?php if (!$isFirst): ?>
                    <hr class="component-divider">
                    <?php endif; $isFirst = false; ?>
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-badge-group component-badge-group--center">
                                <div class="component-card__icon-container component-card__icon-container--bordered">
                                    <span class="material-symbols-rounded"><?= $pkg['icon'] ?></span>
                                </div>
                                <div class="component-badge component-badge--grouped-item">
                                    <span class="component-text-bold"><?= $pkg['name'] ?></span>
                                </div>
                                <div class="component-badge component-badge--grouped-item">
                                    <span><?= $pkg['description'] ?></span>
                                </div>
                                <?php if ($pkg['is_single_use']): ?>
                                <div class="component-badge component-badge--grouped-item">
                                    <span class="material-symbols-rounded">info</span> <span><?= __('single_use') ?></span>
                                </div>
                                <?php endif; ?>
                                
                                <div class="component-badge component-badge--grouped-item component-badge--interactive component-badge--min-w130" data-action="addToCart" data-perkid="<?= $pkg['id'] ?>">
                                    <span class="material-symbols-rounded">add_shopping_cart</span> <span><?= __('add_to_cart') ?></span>
                                </div>

                                <div class="component-badge component-badge--dark component-badge--grouped-item component-badge--min-w130 btn-buy-perk" data-action="buyPerk" data-perkid="<?= $pkg['id'] ?>">
                                    <span class="price-text">
                                        <span class="material-symbols-rounded">toll</span> <span><?= \App\Core\Helpers\Utils::formatNumber($pkg['price_coins']) ?></span>
                                    </span>
                                    <span class="pay-text">
                                        <span class="material-symbols-rounded">shopping_cart</span> <span><?php echo __('buy'); ?></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

                <div class="component-disclaimer">
                    <?php echo __('store_content_disclaimer'); ?>
                </div>

            </div>
        </div>
    </div>
</div>
