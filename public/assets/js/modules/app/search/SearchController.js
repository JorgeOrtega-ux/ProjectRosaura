import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { renderSkeleton } from '../../../core/utils/uiUtils.js';

export class SearchController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.cardInteractions = null;

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    async init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);

        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        this.title = document.querySelector('[data-ref="search-title"]');

        document.addEventListener('click', this.handleGlobalClickBound);

        const params = new URLSearchParams(window.location.search);
        const query = params.get('q') || '';
        
        const globalSearchInput = document.getElementById('globalSearchInput');
        if (globalSearchInput) {
            globalSearchInput.value = query;
        }
        
        if (!query.trim()) {
            if (this.title) this.title.textContent = window.__('msg_enter_search_term');
            if (this.contentArea) {
                this.contentArea.innerHTML = CardTemplates.emptyState(window.__('msg_no_search_term'), 'search_off');
            }
            return;
        }

        
        try {
            if (this.contentArea) {
                this.contentArea.innerHTML = '<div class="component-grid" data-ref="search-results-grid"></div>';
                renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            }

            const resData = await this.api.post(ApiRoutes.Search.Query, { q: query }, this.abortController ? this.abortController.signal : null);

            if (resData && resData.success) {
                const results = resData.data || [];
                const count = results.length;
                
                if (this.title) {
                    this.title.textContent = window.__('search_results_for')
                        .replace(':count', count)
                        .replace(':query', query);
                }

                if (this.contentArea) {
                    if (count === 0) {
                        this.contentArea.innerHTML = CardTemplates.emptyState(window.__('msg_no_search_results'), 'search_off');
                    } else {
                        const cardsHtml = results.map(canvas => 
                            CardTemplates.canvasCard(canvas, { basePath: this.basePath })
                        ).join('');
                        
                        this.contentArea.innerHTML = `<div class="component-grid" data-ref="home-all-canvases">${cardsHtml}</div>`;
                    }
                }
            } else {
                if (this.title) this.title.textContent = window.__('err_search_failed');
                if (this.contentArea) {
                    this.contentArea.innerHTML = CardTemplates.emptyState(window.__('err_search_problem'), 'error');
                }
            }
        } catch (e) {
            if (this.title) this.title.textContent = window.__('err_search_problem');
            if (this.contentArea) {
                this.contentArea.innerHTML = CardTemplates.emptyState(window.__('err_search_network'), 'wifi_off');
            }
        }
    }

    handleGlobalClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        if (this.cardInteractions && this.cardInteractions.handleAction(action, actionBtn)) {
            return;
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
    }
}