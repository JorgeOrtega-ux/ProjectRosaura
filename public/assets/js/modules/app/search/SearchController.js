import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { PromoService } from '../../../core/services/PromoCardService.js';
import { 
    appendInfiniteScrollSkeletons, 
    formatNumber,
    removeInfiniteScrollSkeletons, 
    renderSkeleton, 
    renderVirtualGridItems, 
    setupGridInfiniteScroll,
    showMessage
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

        this.virtualObserver = new VirtualGridObserver((item) => {
            if (item && item.is_promo) {
                return CardTemplates.promoCard(item, { basePath: this.basePath });
            }
            return CardTemplates.canvasCard(item, { basePath: this.basePath });
        });

        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        this.title = document.querySelector('[data-ref="search-title"]');

        this.bindEvents();

        const params = new URLSearchParams(window.location.search);
        this.query = params.get('q') || '';
        
        const globalSearchInput = document.querySelector('[data-ref="global-search-input"]');
        if (globalSearchInput) {
            globalSearchInput.value = this.query;
        }
        
        if (!this.query.trim()) {
            if (this.title) this.title.textContent = window.__('msg_enter_search_term');
            if (this.contentArea) {
                this.contentArea.innerHTML = CardTemplates.emptyState({
                    type: 'search',
                    title: window.__('search_empty_initial_title'),
                    message: window.__('search_empty_initial_desc')
                });
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
                this.contentArea.innerHTML = `
                    <div class="component-search-sections" data-ref="search-sections-wrapper">
                        <div class="component-search-section disabled" data-ref="search-users-section">
                            <div class="component-search-section__header">
                                <span class="material-symbols-rounded">group</span>
                                <h2 class="component-search-section__title">${window.__('search_section_users') || 'Usuarios'}</h2>
                            </div>
                            <div class="component-grid component-grid--users" data-ref="search-users-grid"></div>
                        </div>
                        <div class="component-search-section" data-ref="search-canvases-section">
                            <div class="component-grid" data-ref="search-results-grid"></div>
                        </div>
                    </div>
                `;
                const canvasesGrid = this.contentArea.querySelector('[data-ref="search-results-grid"]');
                if (canvasesGrid) {
                    renderSkeleton(canvasesGrid, 'homeCanvasGrid');
                }
            }
        }

        if (!this.hasMore || this.isLoadingMore) return;

        this.isLoadingMore = true;

        const canvasesGrid = this.contentArea ? this.contentArea.querySelector('[data-ref="search-results-grid"]') : null;

        if (isLoadMore && canvasesGrid) {
            appendInfiniteScrollSkeletons(canvasesGrid, 4);
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

            if (canvasesGrid) {
                removeInfiniteScrollSkeletons(canvasesGrid);
            }

            if (resData && resData.success) {
                let newCanvases = resData.data || [];
                let users = resData.users || [];
                this.totalFound = typeof resData.total === 'number' ? resData.total : (this.allCanvases.length + newCanvases.length);
                const totalUsersCount = Array.isArray(users) ? users.length : 0;

                if (!isLoadMore) {
                    const usersSection = this.contentArea.querySelector('[data-ref="search-users-section"]');
                    const usersGrid = this.contentArea.querySelector('[data-ref="search-users-grid"]');
                    if (users.length > 0 && usersSection && usersGrid) {
                        usersSection.classList.remove('disabled');
                        usersGrid.innerHTML = users.map(u => CardTemplates.userCard(u, { basePath: this.basePath })).join('');
                    }

                    if (this.title) {
                        const totalCombined = this.totalFound + totalUsersCount;
                        const template = window.__('search_results_for', { count: totalCombined, query: this.query });
                        this.title.textContent = template
                            .replace(':count', totalCombined)
                            .replace(':query', this.query);
                    }

                    if (newCanvases.length === 0 && users.length === 0) {
                        this.hasMore = false;
                        if (this.contentArea) {
                            this.contentArea.innerHTML = CardTemplates.emptyState({
                                type: 'search',
                                title: window.__('search_empty_no_results_title'),
                                message: window.__('search_empty_no_results_desc')
                            });
                        }
                        this.isLoadingMore = false;
                        return;
                    }

                    if (newCanvases.length === 0 && users.length > 0) {
                        this.hasMore = false;
                        const canvasesSection = this.contentArea.querySelector('[data-ref="search-canvases-section"]');
                        if (canvasesSection) {
                            canvasesSection.classList.add('disabled');
                        }
                        this.isLoadingMore = false;
                        return;
                    }
                }

                if (newCanvases.length > 0 && canvasesGrid) {
                    await PromoService.ensureLoaded();
                    const itemsWithPromos = PromoService.injectFeedCards(newCanvases, this.allCanvases.length);

                    renderVirtualGridItems(canvasesGrid, itemsWithPromos, this.virtualObserver, isLoadMore, 'home-all-canvases');
                    this.allCanvases = this.allCanvases.concat(itemsWithPromos);
                }

                if (typeof resData.has_more === 'boolean') {
                    this.hasMore = resData.has_more;
                } else {
                    this.hasMore = newCanvases.length >= this.limit;
                }

                this.currentPage++;
                this.isLoadingMore = false;

                this.reinitializeUI();
                if (canvasesGrid) {
                    this.observer = setupGridInfiniteScroll({
                        container: canvasesGrid,
                        hasMore: this.hasMore,
                        currentObserver: this.observer,
                        onIntersect: () => this.loadSearchResults(true)
                    });
                }
            } else {
                if (!isLoadMore) {
                    if (this.title) this.title.textContent = window.__('err_search_failed');
                    if (this.contentArea) {
                        this.contentArea.innerHTML = CardTemplates.emptyState({
                            type: 'error',
                            title: window.__('search_error_title'),
                            message: window.__('search_error_desc')
                        });
                    }
                }
                this.isLoadingMore = false;
            }
        } catch (e) {
            if (e.name === 'AbortError') return;

            if (canvasesGrid) {
                removeInfiniteScrollSkeletons(canvasesGrid);
            }

            if (!isLoadMore) {
                if (this.title) this.title.textContent = window.__('err_search_problem');
                if (this.contentArea) {
                    this.contentArea.innerHTML = CardTemplates.emptyState({
                        type: 'error',
                        title: window.__('search_error_title'),
                        message: window.__('err_search_network')
                    });
                }
            }
            this.isLoadingMore = false;
        }
    }

    reinitializeUI() {
        if (!this.contentArea) return;
        const grid = this.contentArea.querySelector('[data-ref="search-results-grid"]');
        if (grid && window.app && typeof window.app.initModules === 'function') {
            window.app.initModules(grid);
        }

        PromoService.initCardInteractions(this.contentArea);
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        if (action === 'toggleUserFollow') {
            e.preventDefault();
            e.stopPropagation();
            const userId = actionBtn.getAttribute('data-user-id');
            if (userId) {
                this._toggleUserFollow(userId, actionBtn);
            }
            return;
        }

        if (action === 'openExternalPromo') {
            e.preventDefault();
            const targetUrl = actionBtn.getAttribute('data-target-url');
            if (targetUrl) {
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        if (this.cardInteractions && this.cardInteractions.handleAction(action, actionBtn)) {
            return;
        }
    }

    async _toggleUserFollow(userId, btnEl) {
        if (!userId || btnEl.disabled) return;
        btnEl.disabled = true;

        try {
            const signal = this.abortController ? this.abortController.signal : null;
            const res = await this.api.post(ApiRoutes.User.ToggleFollow, { user_id: userId }, signal);

            if (res && res.success) {
                const isFollowing = res.is_following;
                btnEl.classList.toggle('component-button--secondary', isFollowing);
                btnEl.classList.toggle('component-button--primary', !isFollowing);

                const icon = btnEl.querySelector('.material-symbols-rounded');
                if (icon) icon.textContent = isFollowing ? 'person_remove' : 'person_add';

                const text = btnEl.querySelector('.btn-text');
                if (text) text.textContent = isFollowing ? (window.__('profile.unfollow') || 'Dejar de seguir') : (window.__('profile.follow') || 'Seguir');

                const card = btnEl.closest('.component-user-card');
                if (card) {
                    const countEl = card.querySelector('.user-followers-count');
                    if (countEl && typeof res.followers_count === 'number') {
                        countEl.textContent = formatNumber(res.followers_count);
                    }
                }

                if (res.message) showMessage(res.message, 'success');
            } else if (res && res.message) {
                showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage(window.__('err_follow_failed') || 'Error al actualizar seguimiento.', 'error');
        } finally {
            btnEl.disabled = false;
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