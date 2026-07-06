<?php
// includes/views/app/store-coins.php
?>
<style>
.store-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    padding-bottom: 16px;
}
.store-card {
    background-color: var(--bg-surface);
    border: var(--border-dynamic);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
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
    font-size: 40px;
    color: var(--text-primary);
    margin-bottom: 16px;
    text-align: center;
}
.store-card-icon span {
    font-size: 48px !important;
}
.store-card-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    text-align: center;
    margin-bottom: 8px;
}
.store-card-desc {
    font-size: 14px;
    color: var(--text-secondary);
    text-align: center;
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
    white-space: nowrap;
    text-transform: uppercase;
}
</style>

<div class="view-content" data-ref="store-coins-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title">Tienda de Monedas</h1>
        </div>
        <div class="component-top-right">
        </div>
    </div>

    <div class="component-bottom">
        <div class="store-grid">
            <!-- Card 1 -->
            <div class="store-card">
                <div class="store-card-icon"><span class="material-symbols-rounded">monetization_on</span></div>
                <div class="store-card-title">🪙 1,000</div>
                <div class="store-card-desc">Paquete básico de monedas.</div>
                <div class="component-button component-button--full component-button--h45 disabled" style="margin-top: auto; text-align: center; justify-content: center;">Próximamente</div>
            </div>
            
            <!-- Card 2 -->
            <div class="store-card featured">
                <div class="featured-badge">BONUS +750</div>
                <div class="store-card-icon"><span class="material-symbols-rounded">monetization_on</span></div>
                <div class="store-card-title">🪙 2,750</div>
                <div class="store-card-desc">2,000 + 750 de bonificación</div>
                <div class="component-button component-button--dark component-button--full component-button--h45 disabled" style="margin-top: auto; text-align: center; justify-content: center;">Próximamente</div>
            </div>
            
            <!-- Card 3 -->
            <div class="store-card featured">
                <div class="featured-badge" style="background-color: var(--color-success);">BONUS +1,250</div>
                <div class="store-card-icon"><span class="material-symbols-rounded">diamond</span></div>
                <div class="store-card-title">🪙 5,750</div>
                <div class="store-card-desc">4,500 + 1,250 de bonificación</div>
                <div class="component-button component-button--dark component-button--full component-button--h45 disabled" style="margin-top: auto; text-align: center; justify-content: center;">Próximamente</div>
            </div>
            
            <!-- Card 4 -->
            <div class="store-card featured" style="border-color: #8b5cf6;">
                <div class="featured-badge" style="background-color: #8b5cf6;">BONUS +3,250</div>
                <div class="store-card-icon"><span class="material-symbols-rounded" style="color: #8b5cf6;">workspace_premium</span></div>
                <div class="store-card-title">🪙 13,250</div>
                <div class="store-card-desc">10,000 + 3,250 de bonificación</div>
                <div class="component-button component-button--dark component-button--full component-button--h45 disabled" style="margin-top: auto; text-align: center; justify-content: center;">Próximamente</div>
            </div>
        </div>
    </div>
</div>
