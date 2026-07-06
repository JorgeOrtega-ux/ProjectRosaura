<?php
// includes/views/app/store-coins.php
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
<style>
.store-card {
    background-color: var(--bg-surface);
    border: 1px solid #00000020;
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: relative;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.store-card:hover {
    border-color: var(--border-color-hover);
}
.store-card.featured {
    border: 2px solid var(--action-primary);
    box-shadow: var(--shadow-card);
}
.store-card-icon {
    font-size: 28px;
    color: var(--text-primary);
    margin-bottom: 16px;
    border: 1px solid #00000020;
    border-radius: 10px;
    padding: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.store-card-icon span {
    font-size: 28px !important;
}
.store-card-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    text-align: left;
    margin-bottom: 8px;
}
.store-card-desc {
    font-size: 14px;
    color: var(--text-secondary);
    text-align: left;
    margin-bottom: 24px;
    line-height: 1.5;
    flex-grow: 1;
}
.featured-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--action-primary);
    color: var(--text-inverse);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
}

.store-coins-balance {
    background: var(--bg-surface);
    border: var(--border-dynamic);
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
}
</style>

<div class="view-content" data-ref="store-coins-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title">Tienda de Monedas</h1>
        </div>
        <div class="component-top-right">
            <div class="store-coins-balance">
                🪙 <span data-ref="user-coins-balance">...</span>
            </div>
        </div>
    </div>

    <div class="component-bottom">
        <?php if (empty($coinPackages)): ?>
        <div class="component-empty-state" data-ref="empty-state-rendered" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center; height: 100%;">
            <span class="material-symbols-rounded component-empty-state-icon" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px;">search_off</span>
            <p class="component-empty-state-text" style="color: var(--text-secondary); font-size: 16px; font-weight: 500;">No hay paquetes de monedas disponibles en este momento. Vuelve más tarde.</p>
        </div>
        <?php else: ?>
        <div class="component-grid" data-ref="" style="padding: 24px;">
            <?php foreach ($coinPackages as $pkg): ?>
            <div class="store-card <?= $pkg['is_featured'] ? 'featured' : '' ?>" <?= $pkg['border_color'] ? 'style="border-color: '.$pkg['border_color'].';"' : '' ?>>
                <?php if ($pkg['bonus_text']): ?>
                <div class="featured-badge" <?= $pkg['badge_color'] ? 'style="background-color: '.$pkg['badge_color'].';"' : '' ?>><?= $pkg['bonus_text'] ?></div>
                <?php endif; ?>
                <div class="store-card-icon"><span class="material-symbols-rounded" <?= $pkg['icon_color'] ? 'style="color: '.$pkg['icon_color'].';"' : '' ?>><?= $pkg['icon'] ?></span></div>
                <div class="store-card-title"><?= $pkg['name'] ?></div>
                <div class="store-card-desc"><?= $pkg['description'] ?></div>
                
                <div style="display: flex; gap: 8px; margin-top: auto; margin-bottom: 16px; flex-wrap: wrap;">
                    <div class="component-badge">
                        <span class="material-symbols-rounded">payments</span> $<?= number_format($pkg['price_usd'], 2) ?> USD
                    </div>
                </div>
                
                <div data-action="buyCoins" data-amount="<?= $pkg['amount'] ?>" class="btn-buy-coins component-button <?= $pkg['is_featured'] ? 'component-button--dark' : '' ?> component-button--full component-button--h45" style="text-align: center; justify-content: center; cursor: pointer;">Comprar</div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    </div>
</div>

