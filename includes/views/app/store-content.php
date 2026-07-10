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
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    text-align: left;
    margin-bottom: 4px;
}
.store-card-desc {
    font-size: 13px;
    color: var(--text-secondary);
    text-align: left;
    margin-bottom: 0;
    line-height: 1.4;
}
.store-card-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    flex-grow: 1;
}
.store-card-icon {
    font-size: 28px;
    color: var(--text-primary);
    margin-bottom: 0;
    padding: 8px;
    border: 1px solid #00000020;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.store-badges-container {
    display: flex;
    gap: 8px;
    margin-top: auto;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
}
.store-badge-interactive {
    cursor: pointer;
    background: var(--text-primary);
    color: var(--bg-surface);
    font-weight: 600;
    border-color: transparent;
}
.store-badge-fill {
    flex: 1;
    justify-content: center;
    text-align: center;
}
.store-badge-full {
    flex: 1 1 100%;
    justify-content: center;
    text-align: center;
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

<div class="view-content" data-ref="store-content-wrapper">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title">Tienda de Contenido</h1>
        </div>
        <div class="component-top-right">
            <div class="store-coins-balance">
                🪙 <span data-ref="user-coins-balance">...</span>
            </div>
        </div>
    </div>

    <div class="component-bottom">
        <?php if (empty($contentPackages)): ?>
        <div class="component-empty-state" data-ref="empty-state-rendered" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center; height: 100%;">
            <span class="material-symbols-rounded component-empty-state-icon" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px;">search_off</span>
            <p class="component-empty-state-text" style="color: var(--text-secondary); font-size: 16px; font-weight: 500;">No hay paquetes de contenido disponibles en este momento. Vuelve más tarde.</p>
        </div>
        <?php else: ?>
        <div class="component-grid" data-ref="" style="padding: 24px;">
            <?php foreach ($contentPackages as $pkg): ?>
            <div class="store-card">
                <div class="store-card-header">
                    <div class="store-card-icon"><span class="material-symbols-rounded"><?= $pkg['icon'] ?></span></div>
                    <div class="store-card-text">
                        <div class="store-card-title"><?= $pkg['name'] ?></div>
                        <div class="store-card-desc"><?= $pkg['description'] ?></div>
                    </div>
                </div>
                
                <div class="store-badges-container">
                    <div class="component-badge store-badge-fill">
                        <span class="material-symbols-rounded">toll</span> <?= number_format($pkg['price_coins']) ?> Monedas
                    </div>
                    <?php if ($pkg['is_single_use']): ?>
                    <div class="component-badge component-badge--warning store-badge-fill">
                        <span class="material-symbols-rounded">info</span> Un solo uso
                    </div>
                    <?php endif; ?>
                    <div data-action="buyPerk" data-perkid="<?= $pkg['id'] ?>" class="btn-buy-perk component-badge store-badge-interactive store-badge-full">
                        <span class="material-symbols-rounded" style="color: inherit;">shopping_cart</span> Comprar
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    </div>
</div>

<div id="store-content-data" data-accepted="<?= $acceptedContentTerms ? 'true' : 'false' ?>" style="display: none;"></div>
