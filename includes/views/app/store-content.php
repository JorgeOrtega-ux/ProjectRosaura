<?php
// includes/views/app/store-content.php
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
.store-card-note {
    font-size: 12px;
    color: var(--color-warning);
    text-align: center;
    margin-top: -12px;
    margin-bottom: 24px;
    font-weight: 600;
}
</style>

<div class="view-content" data-ref="store-content-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title">Tienda de Contenido</h1>
        </div>
        <div class="component-top-right">
        </div>
    </div>

    <div class="component-bottom">
        <div class="store-grid">
            <!-- Perk 1 -->
            <div class="store-card">
                <div class="store-card-icon"><span class="material-symbols-rounded">timer_off</span></div>
                <div class="store-card-title">Sin Cooldown (10s)</div>
                <div class="store-card-desc">Elimina tu tiempo de espera por 10 segundos en un lienzo oficial. Una vez activo, el tiempo no podrá pausarse.</div>
                <div class="store-card-note">Un solo uso por compra</div>
                <div class="component-button component-button--full component-button--h45 disabled" style="margin-top: auto; text-align: center; justify-content: center;">Próximamente</div>
            </div>
            
            <!-- Perk 2 -->
            <div class="store-card">
                <div class="store-card-icon"><span class="material-symbols-rounded">security</span></div>
                <div class="store-card-title">Protección de Píxel</div>
                <div class="store-card-desc">Otorga protección contra sobrescritura para un máximo de 25 píxeles en un lienzo oficial.</div>
                <div class="store-card-note">Un solo uso por compra</div>
                <div class="component-button component-button--full component-button--h45 disabled" style="margin-top: auto; text-align: center; justify-content: center;">Próximamente</div>
            </div>
        </div>
    </div>
</div>
