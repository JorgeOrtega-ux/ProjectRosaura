<?php
// includes/views/canvases/snapshots-gallery.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title" data-ref="gallery-title">Cargando galería...</h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    <button class="component-button component-button--secondary" data-action="goBack">
                        <span class="material-symbols-rounded component-button-icon">arrow_back</span>
                        <?php echo __('btn_back') ?: 'Regresar'; ?>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-grid" data-ref="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; padding: 20px;">
                <?php for($i=0; $i<8; $i++): ?>
                    <div class="skeleton-card"></div>
                <?php endfor; ?>
            </div>
            
            <div class="component-empty-state disabled" data-ref="gallery-empty-state" style="padding: 40px; text-align: center;">
                <span class="material-symbols-rounded component-empty-state-icon" style="font-size: 48px; color: var(--text-tertiary);">collections</span>
                <p class="component-empty-state-text" style="color: var(--text-secondary); margin-top: 16px;"><?php echo __('empty_snapshots_gallery') ?: 'Aún no hay reinicios registrados para este lienzo.'; ?></p>
            </div>
        </div>

    </div>
</div>

<style>
/* Estilos adaptados para emular el layout de las cards en home.php */
.snapshot-card {
    height: 180px;
    background-color: #e9ecef;
    border-radius: 12px;
    position: relative;
    /* Sombra interna inferior */
    box-shadow: inset 0px -70px 50px -20px rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: flex-end;
    padding: 20px;
    /* Configuración inicial del borde separado (outline) */
    outline: 2px solid transparent;
    outline-offset: 0px;
    transition: outline 0.2s ease, outline-offset 0.2s ease, transform 0.2s ease;
    cursor: pointer;
    text-decoration: none; /* Al ser una etiqueta <a> */
    overflow: hidden;
}

.snapshot-card:hover {
    outline: 2px solid var(--text-primary, #000000);
    outline-offset: 2px;
}

.snapshot-card-title {
    margin: 0; 
    color: #ffffff; 
    font-size: 1.25rem; 
    font-family: inherit;
    z-index: 10;
    text-shadow: 0px 2px 4px rgba(0,0,0,0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
}

.snapshot-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 4px;
    backdrop-filter: blur(4px);
}

.snapshot-badge .material-symbols-rounded {
    font-size: 14px;
}

.skeleton-card {
    height: 180px;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: loadingSkeleton 1.5s infinite;
}
</style>