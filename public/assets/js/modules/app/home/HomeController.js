// public/assets/js/modules/app/home/HomeController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { renderSkeleton } from '../../../core/utils/uiUtils.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';

class HomeController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        
        this.contentArea = null;
        this.cardInteractions = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);
        
        this.bindEvents();
        
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        
        if (this.contentArea) {
            // Inicializa un grid temporal para el skeleton
            this.contentArea.innerHTML = '<div class="component-grid" data-ref="home-all-canvases"></div>';
            renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
        }
        
        this.loadCanvases();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        
        const action = actionBtn.getAttribute('data-action');

        if (action === 'reloadHome') {
            e.preventDefault();
            this.loadCanvases();
            return;
        }

        // Delegar interacciones de las tarjetas al helper
        if (this.cardInteractions && this.cardInteractions.handleAction(action, actionBtn)) {
            return;
        }
    }

    async loadCanvases() {
        const [publicRes, officialRes] = await Promise.all([
            this.api.post(ApiRoutes.Canvases.GetPublic, { limit: 50 }, this.abortController.signal).catch(() => null),
            this.api.post(ApiRoutes.Canvases.GetOfficial, {}, this.abortController.signal).catch(() => null)
        ]);
        
        if (this.abortController.signal.aborted) return;
        
        let allCanvases = [];
        let isError = false;

        // Integrar los oficiales
        if (officialRes && officialRes.success) {
            allCanvases = allCanvases.concat(officialRes.data || []);
        } else if (!officialRes) {
            isError = true;
        }

        // Integrar los públicos, evitando duplicados
        if (publicRes && publicRes.success) {
            const existingIds = new Set(allCanvases.map(c => c.id));
            const newPublics = (publicRes.data || []).filter(c => !existingIds.has(c.id));
            allCanvases = allCanvases.concat(newPublics);
        } else if (!publicRes) {
            isError = true;
        }

        const msgEmpty = window.__ ? window.__('empty_home_gallery') : 'Aún no hay lienzos disponibles para explorar.';

        // Lógica de inyección dinámica mutua
        if (allCanvases.length > 0) {
            this.renderCanvases(this.contentArea, allCanvases);
        } else if (isError) {
            this.showError(this.contentArea, window.__ ? window.__('err_load_public_canvases') : 'Error al cargar lienzos. El servidor no responde.');
        } else {
            this.contentArea.innerHTML = CardTemplates.emptyState(msgEmpty, 'collections');
        }

        this.reinitializeUI();
    }

    showError(container, message) {
        if (container) {
            container.innerHTML = CardTemplates.emptyState(message, 'error');
        }
    }

    renderCanvases(container, canvases) {
        if (!container) return;
        const cardsHtml = canvases.map(canvas => CardTemplates.canvasCard(canvas, { basePath: this.basePath })).join('');
        // Se reemplaza todo el HTML por el GRID puro
        container.innerHTML = `<div class="component-grid" data-ref="home-all-canvases">${cardsHtml}</div>`;
    }

    reinitializeUI() {
        if (!this.contentArea) return;
        const grid = this.contentArea.querySelector('.component-grid');
        if (!grid) return; // Si no hay grid (estado vacío), omitimos.
        
        if (window.app && typeof window.app.initModules === 'function') window.app.initModules(grid);
        else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') window.uiUtils.initDropdowns(grid);
        
        if (window.router && typeof window.router.bindLinks === 'function') window.router.bindLinks(grid);
    }
}

export { HomeController };