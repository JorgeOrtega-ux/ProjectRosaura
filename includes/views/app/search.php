<div class="component-search-wrapper">
    <div class="component-search-top">
        <h1 class="component-search-header">
            Resultados para: <span id="search-query-display" class="component-search-term"></span>
        </h1>
        <div class="component-search-filters">
            <button class="component-search-filter-btn component-search-filter-active">Todo</button>
            <button class="component-search-filter-btn">Canales</button>
            <button class="component-search-filter-btn">Videos</button>
        </div>
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