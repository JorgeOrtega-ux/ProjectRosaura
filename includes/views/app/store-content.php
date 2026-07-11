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

$userPrefs = $_SESSION['user_prefs'] ?? [];
$acceptedContentTerms = !empty($userPrefs['accepted_content_store_terms']);
?>
<div class="view-content" data-ref="store-content-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title">Tienda de Contenido</h1>
        </div>
        <div class="component-top-right">
            <div class="component-badge component-badge--warning">
                🪙 <span data-ref="user-coins-balance">...</span>
            </div>
        </div>
    </div>

    <div class="component-bottom">
        <?php if (empty($contentPackages)): ?>
        <div class="component-empty-state" data-ref="empty-state-rendered">
            <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
            <p class="component-empty-state-text">No hay paquetes de contenido disponibles en este momento. Vuelve más tarde.</p>
        </div>
        <?php else: ?>
        <div class="component-grid" data-ref="">
            <?php foreach ($contentPackages as $pkg): ?>
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
                
                <div class="component-card__actions component-badge-group">
                    <div class="component-badge">
                        <span class="material-symbols-rounded">toll</span> <?= number_format($pkg['price_coins']) ?> Monedas
                    </div>
                    <?php if ($pkg['is_single_use']): ?>
                    <div class="component-badge component-badge--warning">
                        <span class="material-symbols-rounded">info</span> Un solo uso
                    </div>
                    <?php endif; ?>
                    <div data-action="buyPerk" data-perkid="<?= $pkg['id'] ?>" class="btn-buy-perk component-badge component-badge--dark component-badge--interactive component-badge--full">
                        <span class="material-symbols-rounded">shopping_cart</span> Comprar
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    </div>
</div>

<div id="store-content-data" data-accepted="<?= $acceptedContentTerms ? 'true' : 'false' ?>" class="component-d-none"></div>
