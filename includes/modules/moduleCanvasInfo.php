<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleCanvasInfo">
    <div class="component-menu component-menu--w335 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-canvas-info">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box component-details-header-box">
                <div class="chat-header-title-box" data-ref="canvas-info-header-content">
                    <span class="material-symbols-rounded component-details-header-icon">info</span>
                    <span class="component-menu-header-title component-details-header-title" data-ref="canvas-info-title">Información del lienzo</span>
                </div>
                <div class="component-skeleton component-skeleton--h16 component-skeleton--w140 component-details-header-skeleton disabled" data-ref="canvas-info-header-skeleton"></div>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-details-section-parent">
            <!-- Loader (populates dynamic Skeleton via JS) -->
            <div data-ref="canvas-info-loader" class="component-details-loader-container"></div>

            <!-- Content Container -->
            <div data-ref="canvas-info-content" class="component-details-content-container">
                <!-- First Div: Photo / Image -->
                <div class="component-details-image-card">
                    <img data-ref="canvas-info-image" src="" alt="Lienzo">
                    <div data-ref="canvas-info-image-fallback" class="component-details-image-fallback">
                        <span class="material-symbols-rounded">image</span>
                    </div>
                </div>

                <!-- Second Div: Details (Expandable) -->
                <div class="component-details-card">
                    <div class="component-details-card-top">
                        <button type="button" class="component-menu-link component-menu-link--bordered nav-item component-details-toggle-btn" data-action="toggleInfoDetails">
                            <span>Detalles del lienzo</span>
                            <span class="material-symbols-rounded component-details-toggle-arrow">expand_more</span>
                        </button>
                    </div>
                    
                    <div class="component-details-rows-container collapsed">
                        <div class="component-details-row">
                            <span class="component-details-label">Tipo</span>
                            <span data-ref="canvas-info-type" class="component-details-value">-</span>
                        </div>
                        <div class="component-details-row">
                            <span class="component-details-label">Dimensiones</span>
                            <span data-ref="canvas-info-dimensions" class="component-details-value">-</span>
                        </div>
                        <div class="component-details-row">
                            <span class="component-details-label">Titular</span>
                            <span data-ref="canvas-info-owner" class="component-details-value">-</span>
                        </div>
                        <div class="component-details-row">
                            <span class="component-details-label">Fecha de creación</span>
                            <span data-ref="canvas-info-created" class="component-details-value">-</span>
                        </div>
                        <div class="component-details-row">
                            <span class="component-details-label">Miembros</span>
                            <span data-ref="canvas-info-members" class="component-details-value">-</span>
                        </div>
                        <div class="component-details-row">
                            <span class="component-details-label">Tiempo de recarga</span>
                            <span data-ref="canvas-info-cooldown" class="component-details-value">-</span>
                        </div>
                        <div class="component-details-row">
                            <span class="component-details-label">Privacidad</span>
                            <span data-ref="canvas-info-privacy" class="component-details-value">-</span>
                        </div>
                        <div class="component-details-row">
                            <span class="component-details-label">Favoritos</span>
                            <span data-ref="canvas-info-favorites" class="component-details-value">-</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
