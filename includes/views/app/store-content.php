<?php
use App\Api\Services\App\AppViewService;

$viewService = new AppViewService();
$contentPackages = $viewService->getStoreContentData();
?>
<div class="view-content" data-ref="store-content-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('store_content_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <button class="component-button component-button--primary component-button--h40" data-nav="/store/coins">
                    <span class="material-symbols-rounded">toll</span> 
                    <span data-ref="user-coins-balance">0</span>
                </button>

                <div class="component-actions disabled" data-ref="store-content-selection-actions">
                    <button class="component-button component-button--primary component-button--h40" data-action="buySelectedPerk" data-tooltip="<?php echo __('buy'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">shopping_cart</span>
                        <span><?php echo __('buy'); ?></span>
                    </button>
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
                            <th><?php echo __('th_usage'); ?></th>
                            <th><?php echo __('th_price'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($contentPackages as $pkg): ?>
                        <tr class="component-table-row clickable" data-action="selectContentPackage" data-perkid="<?= $pkg['id'] ?>" data-price="<?= $pkg['price_coins'] ?>" data-name="<?= htmlspecialchars($pkg['name'], ENT_QUOTES, 'UTF-8') ?>" data-icon="<?= htmlspecialchars($pkg['icon'], ENT_QUOTES, 'UTF-8') ?>">
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
                                    <span><?= $pkg['description'] ?></span>
                                </div>
                            </td>
                            <td>
                                <?php if (!empty($pkg['is_single_use'])): ?>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">info</span>
                                    <span><?= __('single_use'); ?></span>
                                </div>
                                <?php else: ?>
                                <div class="component-badge component-badge--sm component-badge--muted">
                                    <span>-</span>
                                </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm component-badge--warning">
                                    <span class="material-symbols-rounded">toll</span>
                                    <span><?= \App\Core\Helpers\Utils::formatNumber($pkg['price_coins']) ?></span>
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
