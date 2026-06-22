// public/assets/js/modules/app/HomeController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { renderSkeleton } from '../../core/utils/uiUtils.js';
import { CardTemplates } from '../../core/components/CardTemplates.js';

class HomeController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.container = null;
        
        // REGLA 1: Solo bindings aquí
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        // REGLA 7: AbortController inicializado en init()
        this.abortController = new AbortController();
        this.bindEvents();
        
        // Búsqueda de DOM aquí, no en constructor
        this.container = document.querySelector('[data-ref="home-public-canvases"]');
        
        if (this.container) {
            // Renderizamos el skeleton desde JS usando tu sistema centralizado
            renderSkeleton(this.container, 'homeCanvasGrid');
            this.loadPublicCanvases();
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        // Delegación global pura. Si en el home se ocupan clicks extra (ej: recargar cards),
        // se interceptan aquí. Por ahora, CardTemplates ya maneja data-actions en CanvasesController.
        const btnReload = e.target.closest('[data-action="reloadHome"]');
        if (btnReload) {
            e.preventDefault();
            this.loadPublicCanvases();
        }
    }

    async loadPublicCanvases() {
        // REGLA 7 y 9: Sin console.logs en caso de error, sin try catch basura, paso de signal.
        const response = await this.api.post(ApiRoutes.Canvases.GetPublic, { limit: 20 }, this.abortController.signal);
        
        // Si el usuario navegó a otra página a mitad de la petición, detenemos todo
        if (response.aborted) return;
        
        if (response && response.success) {
            this.renderCanvases(response.data);
        } else {
            if (this.container) {
                // REGLA 9: Cero strings duros, usando traducciones obligatorias
                this.container.innerHTML = CardTemplates.emptyState(__('err_load_public_canvases'));
            }
        }
    }

    renderCanvases(canvases) {
        if (!this.container) return;

        if (!canvases || canvases.length === 0) {
            this.container.innerHTML = CardTemplates.emptyState(__('empty_public_canvases'));
            return;
        }

        const html = canvases.map(canvas => CardTemplates.canvasCard(canvas, { basePath: this.basePath })).join('');
        this.container.innerHTML = html;

        this.reinitializeUI();
    }

    reinitializeUI() {
        if (window.app && typeof window.app.initModules === 'function') {
            window.app.initModules(this.container);
        } else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') {
            window.uiUtils.initDropdowns(this.container);
        }

        if (window.router && typeof window.router.bindLinks === 'function') {
            window.router.bindLinks(this.container);
        }
    }
}

export { HomeController };