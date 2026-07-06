<?php
// includes/views/app/store-content.php
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
        <div class="component-grid" data-ref="" style="padding: 24px;">
            <!-- Perk 1 -->
            <div class="store-card">
                <div class="store-card-icon"><span class="material-symbols-rounded">timer_off</span></div>
                <div class="store-card-title">Sin Cooldown (10s)</div>
                <div class="store-card-desc">Elimina tu tiempo de espera por 10 segundos en un lienzo oficial. Una vez activo, el tiempo no podrá pausarse.</div>
                
                <div style="display: flex; gap: 8px; margin-top: auto; margin-bottom: 16px; flex-wrap: wrap;">
                    <div class="component-badge">
                        <span class="material-symbols-rounded">toll</span> 1,500 Monedas
                    </div>
                    <div class="component-badge component-badge--warning">
                        <span class="material-symbols-rounded">info</span> Un solo uso
                    </div>
                </div>
                
                <div data-action="buyPerk" data-perkid="no_cooldown_10s" class="btn-buy-perk component-button component-button--full component-button--h45" style="text-align: center; justify-content: center; cursor: pointer;">Comprar</div>
            </div>
            
            <!-- Perk 2 -->
            <div class="store-card">
                <div class="store-card-icon"><span class="material-symbols-rounded">security</span></div>
                <div class="store-card-title">Protección de Píxel</div>
                <div class="store-card-desc">Otorga protección contra sobrescritura para un máximo de 25 píxeles en un lienzo oficial.</div>
                
                <div style="display: flex; gap: 8px; margin-top: auto; margin-bottom: 16px; flex-wrap: wrap;">
                    <div class="component-badge">
                        <span class="material-symbols-rounded">toll</span> 3,000 Monedas
                    </div>
                    <div class="component-badge component-badge--warning">
                        <span class="material-symbols-rounded">info</span> Un solo uso
                    </div>
                </div>
                
                <div data-action="buyPerk" data-perkid="pixel_protection_25" class="btn-buy-perk component-button component-button--full component-button--h45" style="text-align: center; justify-content: center; cursor: pointer;">Comprar</div>
            </div>
        </div>
    </div>
</div>

