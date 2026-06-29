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
                </div>
        </div>

        <div class="component-bottom" data-ref="dynamic-content-area">
            <!-- Renderizado inicial por servidor para UX (Skeleton) -->
            <div class="component-grid" data-ref="gallery-grid">
                <?php for($i=0; $i<8; $i++): ?>
                    <div class="component-snapshot-skeleton"></div>
                <?php endfor; ?>
            </div>
        </div>

    </div>
</div>