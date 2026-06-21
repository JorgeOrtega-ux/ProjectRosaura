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
                    <div class="component-snapshot-skeleton"></div>
                <?php endfor; ?>
            </div>
            
            <div class="component-empty-state disabled" data-ref="gallery-empty-state" style="padding: 40px; text-align: center;">
                <span class="material-symbols-rounded component-empty-state-icon" style="font-size: 48px; color: var(--text-tertiary);">collections</span>
                <p class="component-empty-state-text" style="color: var(--text-secondary); margin-top: 16px;"><?php echo __('empty_snapshots_gallery') ?: 'Aún no hay reinicios registrados para este lienzo.'; ?></p>
            </div>
        </div>

    </div>
</div>