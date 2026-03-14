<div class="component-search-wrapper">
    
    <div class="component-search-top">
        <div class="component-search-filters">
            <button class="component-search-filter-btn component-search-filter-active" data-filter="all">Todo</button>
            <button class="component-search-filter-btn" data-filter="channels">Canales</button>
            <button class="component-search-filter-btn" data-filter="videos">Videos</button>
        </div>
        
        <button id="search-toggle-filters" class="component-search-filter-btn" style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filtros
        </button>
    </div>

    <div class="component-search-bottom" id="search-results-area">
        
        <div class="component-search-loading" id="search-loading-state">
            <div class="component-search-spinner"></div>
            <span class="component-search-loading-text">Buscando en la plataforma...</span>
        </div>

        <section class="component-search-section" id="search-channels-section" style="display: none;">
            <h2 class="component-search-section-title">Canales</h2>
            <div class="component-search-channels-grid" id="search-channels-grid"></div>
        </section>

        <section class="component-search-section" id="search-videos-section" style="display: none;">
            <h2 class="component-search-section-title">Videos</h2>
            <div class="component-search-videos-grid" id="search-videos-grid"></div>
        </section>

        <div class="component-search-empty" id="search-empty-state" style="display: none;">
            <div class="component-search-empty-icon">🔍</div>
            <h3 class="component-search-empty-title">No encontramos nada</h3>
            <p class="component-search-empty-desc">Intenta buscando con palabras clave diferentes o revisa la ortografía.</p>
        </div>

    </div>
</div>