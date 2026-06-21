<?php
// includes/views/canvases/snapshots-gallery.php
?>
<div class="view-content" style="position: relative;">
    <div class="component-wrapper component-wrapper--full h-full-flex">
        
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
            <div class="component-grid" data-ref="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
                <?php for($i=0; $i<8; $i++): ?>
                    <div class="component-card component-card--skeleton">
                        <div class="skeleton-image"></div>
                        <div class="component-card-content">
                            <div class="skeleton-text" style="width: 60%"></div>
                        </div>
                    </div>
                <?php endfor; ?>
            </div>
            
            <div class="component-empty-state disabled" data-ref="gallery-empty-state">
                <span class="material-symbols-rounded component-empty-state-icon">collections</span>
                <p class="component-empty-state-text"><?php echo __('empty_snapshots_gallery') ?: 'Aún no hay reinicios registrados para este lienzo.'; ?></p>
            </div>
        </div>

    </div>
</div>

<style>
/* Estilos adaptados para las cards de la galería emulando el home */
.component-card--snapshot {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.component-card--snapshot:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.component-card-image-wrapper {
    width: 100%;
    aspect-ratio: 1/1;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    border-bottom: 1px solid var(--border-color);
}

.component-card-image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated; /* Ideal para lienzos pixel art */
}

.component-card-content {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.component-card-content span.material-symbols-rounded {
    color: var(--text-secondary);
    font-size: 18px;
}

.component-card-date {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
}

.skeleton-image {
    width: 100%;
    aspect-ratio: 1/1;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: loadingSkeleton 1.5s infinite;
}

.skeleton-text {
    height: 14px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: loadingSkeleton 1.5s infinite;
    border-radius: 4px;
}
</style>