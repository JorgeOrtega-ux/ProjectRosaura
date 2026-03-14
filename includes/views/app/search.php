<div class="component-search-wrapper">
    
    <div class="component-search-top">
        <div class="component-search-tabs">
            <button class="component-search-tab-btn component-search-tab-active" data-type="all">Todo</button>
            <button class="component-search-tab-btn" data-type="channels">Canales</button>
            <button class="component-search-tab-btn" data-type="videos">Videos</button>
        </div>
        <button id="search-toggle-filters" class="component-search-toggle-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filtros
        </button>
    </div>

    <div id="search-filters-panel" class="component-search-filters-panel" style="display: none;">
        <div class="component-search-filters-grid">
            
            <div class="component-search-filter-group">
                <label for="search-sort-select">Ordenar por</label>
                <select id="search-sort-select" class="component-search-input">
                    <option value="created_at:desc">Más recientes primero</option>
                    <option value="created_at:asc">Más antiguos primero</option>
                    <option value="views:desc">Más vistos</option>
                    <option value="views:asc">Menos vistos</option>
                </select>
            </div>

            <div class="component-search-filter-group">
                <label for="search-category-input">Categoría</label>
                <input type="text" id="search-category-input" class="component-search-input" placeholder="Ej. Mascotas, Gaming...">
            </div>

            <div class="component-search-filter-group">
                <label for="search-tags-input">Tags (separados por coma)</label>
                <input type="text" id="search-tags-input" class="component-search-input" placeholder="Ej. gracioso, hd, 4k">
            </div>

            <div class="component-search-filter-group">
                <label for="search-models-input">Modelos (separados por coma)</label>
                <input type="text" id="search-models-input" class="component-search-input" placeholder="Ej. Maria, Juan...">
            </div>

        </div>
        <div class="component-search-filters-actions">
            <button id="search-clear-filters" class="component-search-btn-secondary">Limpiar Filtros</button>
            <button id="search-apply-filters" class="component-search-btn-primary">Aplicar Búsqueda</button>
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
            <h3 class="component-search-empty-title" id="search-empty-title">No encontramos nada</h3>
            <p class="component-search-empty-desc">Intenta quitando algunos filtros o usando palabras clave diferentes.</p>
        </div>

    </div>
</div>