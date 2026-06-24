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
        
        this.containerGlobal = null;
        this.containerOfficial = null;
        this.containerPublic = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        
        this.containerGlobal = document.querySelector('[data-ref="home-global-canvases"]');
        this.containerOfficial = document.querySelector('[data-ref="home-official-canvases"]');
        this.containerPublic = document.querySelector('[data-ref="home-public-canvases"]');
        
        if (this.containerGlobal) renderSkeleton(this.containerGlobal, 'homeCanvasGrid');
        if (this.containerOfficial) renderSkeleton(this.containerOfficial, 'homeCanvasGrid');
        if (this.containerPublic) renderSkeleton(this.containerPublic, 'homeCanvasGrid');
        
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
        const btnReload = e.target.closest('[data-action="reloadHome"]');
        if (btnReload) {
            e.preventDefault();
            this.loadCanvases();
        }
    }

    async loadCanvases() {
        // Lanzamos las peticiones en paralelo para que sea súper rápido
        const [publicRes, officialRes] = await Promise.all([
            this.api.post(ApiRoutes.Canvases.GetPublic, { limit: 20 }, this.abortController.signal).catch(() => null),
            this.api.post(ApiRoutes.Canvases.GetOfficial, {}, this.abortController.signal).catch(() => null)
        ]);
        
        if (this.abortController.signal.aborted) return;
        
        // 1. Renderizar lienzos personales públicos
        if (publicRes && publicRes.success) {
            this.renderCanvases(this.containerPublic, publicRes.data, window.__ ? __('empty_public_canvases') : 'No hay lienzos públicos.');
        } else {
            this.showError(this.containerPublic, window.__ ? __('err_load_public_canvases') : 'Error al cargar lienzos.');
        }

        // 2. Renderizar lienzos globales y oficiales (País/Estado)
        if (officialRes && officialRes.success) {
            const globalCanvases = officialRes.data.filter(c => c.scope_type === 'global');
            const otherOfficial = officialRes.data.filter(c => c.scope_type !== 'global');

            this.renderCanvases(this.containerGlobal, globalCanvases, 'Aún no hay ningún lienzo global creado.');
            this.renderCanvases(this.containerOfficial, otherOfficial, 'Aún no hay lienzos de países, estados u organizaciones creados.');
        } else {
            this.showError(this.containerGlobal, 'Error al cargar lienzos.');
            this.showError(this.containerOfficial, 'Error al cargar lienzos.');
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
        [this.containerGlobal, this.containerOfficial, this.containerPublic].forEach(container => {
            if (!container) return;
            if (window.app && typeof window.app.initModules === 'function') window.app.initModules(container);
            else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') window.uiUtils.initDropdowns(container);
            
            if (window.router && typeof window.router.bindLinks === 'function') window.router.bindLinks(container);
        });
    }
}

export { HomeController };