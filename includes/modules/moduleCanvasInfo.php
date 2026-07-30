<div class="component-module component-module--sidebar component-module--sidebar-responsive component-module--sidebar-right disabled" data-module="moduleCanvasInfo">
    <div class="component-menu component-menu--w335 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-canvas-info">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box canvas-info-header-box">
                <div class="chat-header-title-box" data-ref="canvas-info-header-content">
                    <span class="material-symbols-rounded canvas-info-header-icon">info</span>
                    <span class="component-menu-header-title canvas-info-header-title" data-ref="canvas-info-title">Información del lienzo</span>
                </div>
                <div class="component-skeleton component-skeleton--h16 component-skeleton--w140 canvas-info-header-skeleton disabled" data-ref="canvas-info-header-skeleton"></div>
            </div>
        </div>
        
        <div class="component-menu-section-parent canvas-info-section-parent">
            <!-- Loader (populates dynamic Skeleton via JS) -->
            <div data-ref="canvas-info-loader" class="canvas-info-loader-container"></div>

            <!-- Content Container -->
            <div data-ref="canvas-info-content" class="canvas-info-content-container">
                <!-- First Div: Photo / Image -->
                <div class="canvas-info-image-card">
                    <img data-ref="canvas-info-image" src="" alt="Lienzo">
                    <div data-ref="canvas-info-image-fallback" class="canvas-info-fallback">
                        <span class="material-symbols-rounded">image</span>
                    </div>
                </div>

                <!-- Second Div: Details (Expandable) -->
                <div class="canvas-info-details-card">
                    <div class="canvas-info-details-top">
                        <button type="button" class="component-menu-link component-menu-link--bordered nav-item canvas-info-toggle-btn" data-action="toggleInfoDetails">
                            <span>Detalles del lienzo</span>
                            <span class="material-symbols-rounded canvas-info-toggle-arrow">expand_more</span>
                        </button>
                    </div>
                    
                    <div class="canvas-info-details-rows-container collapsed">
                        <div class="canvas-info-row">
                            <span class="canvas-info-label">Tipo</span>
                            <span data-ref="canvas-info-type" class="canvas-info-value">-</span>
                        </div>
                        <div class="canvas-info-row">
                            <span class="canvas-info-label">Dimensiones</span>
                            <span data-ref="canvas-info-dimensions" class="canvas-info-value">-</span>
                        </div>
                        <div class="canvas-info-row">
                            <span class="canvas-info-label">Titular</span>
                            <span data-ref="canvas-info-owner" class="canvas-info-value">-</span>
                        </div>
                        <div class="canvas-info-row">
                            <span class="canvas-info-label">Fecha de creación</span>
                            <span data-ref="canvas-info-created" class="canvas-info-value">-</span>
                        </div>
                        <div class="canvas-info-row">
                            <span class="canvas-info-label">Miembros</span>
                            <span data-ref="canvas-info-members" class="canvas-info-value">-</span>
                        </div>
                        <div class="canvas-info-row">
                            <span class="canvas-info-label">Tiempo de recarga</span>
                            <span data-ref="canvas-info-cooldown" class="canvas-info-value">-</span>
                        </div>
                        <div class="canvas-info-row">
                            <span class="canvas-info-label">Privacidad</span>
                            <span data-ref="canvas-info-privacy" class="canvas-info-value">-</span>
                        </div>
                        <div class="canvas-info-row">
                            <span class="canvas-info-label">Favoritos</span>
                            <span data-ref="canvas-info-favorites" class="canvas-info-value">-</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
