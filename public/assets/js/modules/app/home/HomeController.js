// public/assets/js/modules/app/HomeController.js

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
        
        this.containerAll = null;
        this.cardInteractions = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);
        
        this.bindEvents();
        
        this.containerAll = document.querySelector('[data-ref="home-all-canvases"]');
        
        if (this.containerAll) renderSkeleton(this.containerAll, 'homeCanvasGrid');
        
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

        // Corrección de la lógica de error y estado vacío
        if (allCanvases.length > 0) {
            this.renderCanvases(this.containerAll, allCanvases, 'Aún no hay lienzos disponibles.');
        } else if (isError) {
            this.showError(this.containerAll, window.__ ? __('err_load_public_canvases') : 'Error al cargar lienzos. El servidor no responde.');
        } else {
            // Succeeded pero la base de datos está vacía (0 lienzos)
            this.renderCanvases(this.containerAll, [], 'Aún no hay lienzos disponibles para explorar.');
        }

        this.reinitializeUI();
    }

    showError(container, message) {
        if (container) {
            container.innerHTML = CardTemplates.emptyState(message);
        }
    }

    renderCanvases(container, canvases, emptyMessage) {
        if (!container) return;

        if (!canvases || canvases.length === 0) {
            container.innerHTML = CardTemplates.emptyState(emptyMessage);
            return;
        }

        const html = canvases.map(canvas => CardTemplates.canvasCard(canvas, { basePath: this.basePath })).join('');
        container.innerHTML = html;
    }

    reinitializeUI() {
        if (!this.containerAll) return;
        if (window.app && typeof window.app.initModules === 'function') window.app.initModules(this.containerAll);
        else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') window.uiUtils.initDropdowns(this.containerAll);
        
        if (window.router && typeof window.router.bindLinks === 'function') window.router.bindLinks(this.containerAll);
    }
}

export { HomeController };