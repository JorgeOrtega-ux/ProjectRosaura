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
?>
<div class="view-content" data-ref="store-content-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('store_content_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="store-content-selection-actions">
                    <button class="component-button component-button--primary component-button--h40" data-action="buySelectedPerk" data-tooltip="<?php echo __('buy'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">shopping_cart</span>
                        <span><?php echo __('buy'); ?></span>
                    </button>
                </div>

                <div class="component-badge component-badge--warning">
                    <span class="material-symbols-rounded">toll</span> <span data-ref="user-coins-balance">0</span>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <?php if (empty($contentPackages)): ?>
            <div class="component-empty-state" data-ref="empty-state-rendered">
                <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                <p class="component-empty-state-text"><?php echo __('store_content_empty'); ?></p>
            </div>
            <?php else: ?>
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('th_item') ?: 'Ítem / Ventaja'; ?></th>
                            <th><?php echo __('th_description') ?: 'Descripción'; ?></th>
                            <th><?php echo __('th_price') ?: 'Precio (Monedas)'; ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($contentPackages as $pkg): ?>
                        <tr class="component-table-row clickable" data-action="selectContentPackage" data-perkid="<?= $pkg['id'] ?>" data-price="<?= $pkg['price_coins'] ?>">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded"><?= $pkg['icon'] ?></span>
                                    </div>
                                    <span class="component-text-bold"><?= $pkg['name'] ?></span>
                                </div>
                            </td>
                            <td>
                                <span><?= $pkg['description'] ?></span>
                                <?php if (!empty($pkg['is_single_use'])): ?>
                                <span class="component-badge component-badge--sm ml-2">
                                    <span class="material-symbols-rounded">info</span> <?= __('single_use') ?>
                                </span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <span class="component-badge component-badge--warning">
                                    <span class="material-symbols-rounded">toll</span> <?= \App\Core\Helpers\Utils::formatNumber($pkg['price_coins']) ?>
                                </span>
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
