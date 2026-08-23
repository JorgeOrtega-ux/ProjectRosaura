import { ApiService }          from '../api/ApiService.js';
import { catchPaginationClick, debounce } from '../utils/uiUtils.js';

/**
 * BaseListController
 *
 * Clase base para controladores de vistas de lista (tabla + paginación + búsqueda).
 * Centraliza el boilerplate repetido en AdminRolesController, AdminPackagesController,
 * AdminPerksController y AdminSubscriptionsController:
 *
 *   - Ciclo de vida: constructor, init(), destroy(), bindEvents()
 *   - Manejo de paginación por clicks (handlePaginationClick)
 *   - Detección de navegación SPA (handleViewLoaded)
 *   - Inicialización de filtros desde URL (initializeFiltersFromURL)
 *   - Toggle de barra de búsqueda (toggleSearchToolbar)
 *   - Estado del botón de búsqueda (updateFilterButtonsState)
 *
 * Las subclases deben sobreescribir los métodos abstractos marcados con @abstract.
 */
class BaseListController {
    constructor() {
        this.api              = new ApiService();
        this.abortController  = null;
        this.basePath         = window.AppBasePath || '';
        this.isInitialized    = false;
        this.filterTimeout    = null;

        // Bound handlers — se crean una sola vez para poder removerlos limpiamente
        this.handleGlobalClickBound      = this.handleGlobalClick.bind(this);
        this.handlePaginationClickBound  = this.handlePaginationClick.bind(this);
        this.handleGlobalInputBound      = this.handleGlobalInput.bind(this);
        this.handleViewLoadedBound       = this.handleViewLoaded.bind(this);

        // Búsqueda con debounce (subclases lo usan via this.applyAllFilters())
        this.applyAllFilters = debounce(this.executeServerFilters.bind(this), 400);
    }

    // ─── Ciclo de vida ────────────────────────────────────────────────────────

    init() {
        if (this.isInitialized) return;
        this.isInitialized   = true;
        this.abortController = new AbortController();
        this.bindEvents();
    }

    destroy() {
        if (!this.isInitialized) return;
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handlePaginationClickBound, true);
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('input', this.handleGlobalInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    // ─── Paginación ───────────────────────────────────────────────────────────

    handlePaginationClick(e) {
        catchPaginationClick(e, url => this.handlePagination(url));
    }

    // ─── Navegación SPA ───────────────────────────────────────────────────────

    handleViewLoaded(e) {
        const viewPath    = this.getViewPath();
        const excludePath = this.getExcludePath();
        if (!viewPath || !e.detail?.url) return;
        if (e.detail.url.includes(viewPath) && (!excludePath || !e.detail.url.includes(excludePath))) {
            this.initializeFiltersFromURL();
        }
    }

    // ─── Filtros y búsqueda ───────────────────────────────────────────────────

    /**
     * Lee los filtros activos de la URL y los refleja en los inputs del DOM.
     * Al terminar llama a updateFilterButtonsState() y, si existe, a deselectAll().
     */
    initializeFiltersFromURL() {
        const searchRef   = this.getSearchInputRef();
        const urlParams   = new URLSearchParams(window.location.search);
        const searchInput = searchRef ? document.querySelector(`[data-ref="${searchRef}"]`) : null;

        if (searchInput) searchInput.value = urlParams.get('q') || '';

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && searchInput && searchInput.value !== '') {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
        }

        this.updateFilterButtonsState();
        if (typeof this.deselectAll === 'function') this.deselectAll();
    }

    /**
     * Abre/cierra la barra de búsqueda y enfoca el input al abrirla.
     */
    toggleSearchToolbar() {
        const searchRef     = this.getSearchInputRef();
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput   = searchRef ? document.querySelector(`[data-ref="${searchRef}"]`) : null;
        if (!searchToolbar) return;

        if (searchToolbar.classList.contains('disabled')) {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
            if (searchInput) setTimeout(() => searchInput.focus(), 50);
        } else {
            searchToolbar.classList.remove('active');
            searchToolbar.classList.add('disabled');
        }
    }

    /**
     * Marca/desmarca el botón de búsqueda según si hay texto en el input.
     */
    updateFilterButtonsState() {
        const searchRef   = this.getSearchInputRef();
        const queryInput  = searchRef ? document.querySelector(`[data-ref="${searchRef}"]`) : null;
        const query       = (queryInput ? queryInput.value : '').trim();
        const searchBtn   = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) searchBtn.classList.toggle('has-active-filter', query.length > 0);
    }

    // ─── Métodos abstractos (las subclases los implementan) ───────────────────

    /** @abstract @returns {string} Fragmento de URL que identifica esta vista (ej: '/admin/roles') */
    getViewPath() { return ''; }

    /** @abstract @returns {string} Fragmento de URL que excluye sub-rutas (ej: '/admin/role-') */
    getExcludePath() { return ''; }

    /** @abstract @returns {string} data-ref del input de búsqueda (ej: 'role-search-input') */
    getSearchInputRef() { return ''; }

    /** @abstract @returns {string} data-ref del contenedor principal de la tabla (por defecto 'view-table') */
    getTableContainerRef() { return 'view-table'; }

    /** @abstract Manejador de clicks globales — implementado en cada subclase */
    handleGlobalClick(e) {}

    /** @abstract Manejador de inputs globales — implementado en cada subclase */
    handleGlobalInput(e) {}

    /** @abstract Construye la URL de búsqueda/filtro y llama a handlePagination */
    executeServerFilters() {}

    /**
     * Carga de forma asíncrona una nueva página/filtro HTML y actualiza la tabla y paginación en el DOM.
     * @param {string} url - URL destino a cargar
     * @param {Object} [options]
     */
    async handlePagination(url, options = {}) {
        if (!url || typeof url !== 'string' || url === '#') return;

        const tableContainerRef = options.containerRef || this.getTableContainerRef() || 'view-table';
        const tableContainer = document.querySelector(`[data-ref="${tableContainerRef}"]`);
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"], .component-bottom');

        if (tableContainer) {
            tableContainer.classList.add('disabled-interaction');
        }

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController?.signal });
            if (!html) return;

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newTable = doc.querySelector(`[data-ref="${tableContainerRef}"]`);

            if (newTable && tableContainer) {
                tableContainer.innerHTML = newTable.innerHTML;
            }

            const newPaginations = doc.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"], .component-bottom');
            if (newPaginations.length > 0 && currentPaginations.length > 0) {
                currentPaginations.forEach((container, index) => {
                    if (newPaginations[index]) {
                        container.innerHTML = newPaginations[index].innerHTML;
                        if (newPaginations[index].hasAttribute('data-tooltip')) {
                            container.setAttribute('data-tooltip', newPaginations[index].getAttribute('data-tooltip'));
                        }
                    }
                });
            }

            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);

            if (typeof this.resetViewState === 'function') {
                this.resetViewState();
            } else if (typeof this.deselectAll === 'function') {
                this.deselectAll();
            }

            this.updateFilterButtonsState();
            if (typeof this.onPaginationUpdated === 'function') {
                this.onPaginationUpdated(doc);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                window.spaRouter.navigate(url);
            } else {
                window.location.href = url;
            }
        } finally {
            if (tableContainer) {
                tableContainer.classList.remove('disabled-interaction');
            }
        }
    }
}

export { BaseListController };
