import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { 
    renderSkeleton, 
    appendInfiniteScrollSkeletons, 
    removeInfiniteScrollSkeletons, 
    renderVirtualGridItems, 
    setupGridInfiniteScroll 
} from '../../../core/utils/uiUtils.js';
import { VirtualGridObserver } from '../../../core/utils/VirtualGridObserver.js';

export class SearchController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.searchAbortController = null;
        this.cardInteractions = null;

        this.contentArea = null;
        this.title = null;

        this.currentPage = 1;
        this.limit = 20;
        this.allCanvases = [];
        this.isLoadingMore = false;
        this.hasMore = true;
        this.totalFound = 0;
        this.query = '';

        this.observer = null;
        this.virtualObserver = null;

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    async init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);

        this.virtualObserver = new VirtualGridObserver((canvas) => {
            if (canvas && canvas.is_ad) {
                return CardTemplates.nativeAdCard(canvas, { basePath: this.basePath });
            }
            return CardTemplates.canvasCard(canvas, { basePath: this.basePath });
        });

        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        this.title = document.querySelector('[data-ref="search-title"]');

        this.bindEvents();

        const params = new URLSearchParams(window.location.search);
        this.query = params.get('q') || '';
        
        const globalSearchInput = document.getElementById('globalSearchInput');
        if (globalSearchInput) {
            globalSearchInput.value = this.query;
        }
        
        if (!this.query.trim()) {
            if (this.title) this.title.textContent = window.__('msg_enter_search_term');
            if (this.contentArea) {
                this.contentArea.innerHTML = CardTemplates.emptyState(window.__('msg_no_search_term'), 'search_off');
            }
            return;
        }

        this.loadSearchResults(false);
    }

    async loadSearchResults(isLoadMore = false) {
        if (!isLoadMore) {
            if (this.searchAbortController) {
                this.searchAbortController.abort();
            }
            this.searchAbortController = new AbortController();

            this.currentPage = 1;
            this.allCanvases = [];
            this.hasMore = true;
            this.isLoadingMore = false;
            this.totalFound = 0;

            if (this.contentArea) {
                this.contentArea.innerHTML = '<div class="component-grid" data-ref="search-results-grid"></div>';
                renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            }
        }

        if (!this.hasMore || this.isLoadingMore) return;

        this.isLoadingMore = true;

        if (isLoadMore && this.contentArea) {
            appendInfiniteScrollSkeletons(this.contentArea, 4);
        }

        try {
            const signal = this.searchAbortController ? this.searchAbortController.signal : this.abortController.signal;
            const resData = await this.api.post(ApiRoutes.Search.Query, {
                q: this.query,
                page: this.currentPage,
                limit: this.limit
            }, signal);

            if (signal.aborted) {
                this.isLoadingMore = false;
                return;
            }

            removeInfiniteScrollSkeletons(this.contentArea);

            if (resData && resData.success) {
                let newCanvases = resData.data || [];
                this.totalFound = typeof resData.total === 'number' ? resData.total : (this.allCanvases.length + newCanvases.length);

                if (this.title) {
                    const template = window.__('search_results_for', { count: this.totalFound, query: this.query }) || `${this.totalFound} resultados para "${this.query}"`;
                    this.title.textContent = template
                        .replace(':count', this.totalFound)
                        .replace(':query', this.query);
                }

                if (!isLoadMore && newCanvases.length === 0) {
                    this.hasMore = false;
                    if (this.contentArea) {
                        this.contentArea.innerHTML = CardTemplates.emptyState(window.__('msg_no_search_results'), 'search_off');
                    }
                    this.isLoadingMore = false;
                    return;
                }

                if (newCanvases.length > 0) {
                    if (window.adManager && typeof window.adManager.injectFeedAds === 'function') {
                        newCanvases = window.adManager.injectFeedAds(newCanvases, 8);
                    }
                }

                renderVirtualGridItems(this.contentArea, newCanvases, this.virtualObserver, isLoadMore, 'home-all-canvases');

                this.allCanvases = this.allCanvases.concat(newCanvases);

                if (typeof resData.has_more === 'boolean') {
                    this.hasMore = resData.has_more;
                } else {
                    this.hasMore = newCanvases.length >= this.limit;
                }

                this.currentPage++;
                this.isLoadingMore = false;

                this.reinitializeUI();
                this.observer = setupGridInfiniteScroll({
                    container: this.contentArea,
                    hasMore: this.hasMore,
                    currentObserver: this.observer,
                    onIntersect: () => this.loadSearchResults(true)
                });
            } else {
                if (!isLoadMore) {
                    if (this.title) this.title.textContent = window.__('err_search_failed');
                    if (this.contentArea) {
                        this.contentArea.innerHTML = CardTemplates.emptyState(window.__('err_search_problem'), 'error');
                    }
                }
                this.isLoadingMore = false;
            }
        } catch (e) {
            if (e.name === 'AbortError') return;

            removeInfiniteScrollSkeletons(this.contentArea);

            if (!isLoadMore) {
                if (this.title) this.title.textContent = window.__('err_search_problem');
                if (this.contentArea) {
                    this.contentArea.innerHTML = CardTemplates.emptyState(window.__('err_search_network'), 'wifi_off');
                }
            }
            this.isLoadingMore = false;
        }
    }

    reinitializeUI() {
        if (!this.contentArea) return;
        const grid = this.contentArea.querySelector('.component-grid');
        if (!grid) return;

        if (window.app && typeof window.app.initModules === 'function') window.app.initModules(grid);
        else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') window.uiUtils.initDropdowns(grid);
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
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
        if (this.searchAbortController) this.searchAbortController.abort();
        if (this.observer) this.observer.disconnect();
        if (this.virtualObserver) this.virtualObserver.disconnect();
        document.removeEventListener('click', this.handleGlobalClickBound);
    }
}