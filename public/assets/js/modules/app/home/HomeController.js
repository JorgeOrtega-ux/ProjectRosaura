import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { PromoService } from '../../../core/services/PromoCardService.js';
import { 
    appendInfiniteScrollSkeletons, 
    removeInfiniteScrollSkeletons, 
    renderSkeleton, 
    renderVirtualGridItems, 
    setupGridInfiniteScroll 
} from '../../../core/utils/uiUtils.js';
import { VirtualGridObserver } from '../../../core/utils/VirtualGridObserver.js';

class HomeController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.feedAbortController = null;
        
        this.contentArea = null;
        this.cardInteractions = null;
        
        this.currentOffset = 0;
        this.allCanvases = [];
        this.isLoadingMore = false;
        this.hasMore = true;
        this.currentFilter = 'all';
        this.observer = null;
        this.virtualObserver = null;
        this._filterThrottle = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);
        
        this.virtualObserver = new VirtualGridObserver((item) => {
            if (item && item.is_promo) {
                return CardTemplates.promoCard(item, { basePath: this.basePath });
            }
            return CardTemplates.canvasCard(item, { basePath: this.basePath });
        });
        
        this.bindEvents();
        
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        
        const isGuest = !window.activeUserId;
        if (isGuest && this.contentArea) {
            this.contentArea.innerHTML = CardTemplates.emptyState({
                type: 'canvas',
                title: window.__('home_empty_guest_title', [], 'Tus murales aparecerán aquí'),
                message: window.__('home_empty_guest_desc', [], 'Cuando crees o administres un lienzo de píxeles, podrás acceder a ellos directamente desde esta sección.'),
                actions: `
                    <a class="component-button component-button--h40" data-nav="${this.basePath}/login">
                        <span class="material-symbols-rounded">login</span>
                        <span>${window.__('link_login', [], 'Iniciar sesión')}</span>
                    </a>
                    <a class="component-button component-button--secondary component-button--h40" data-nav="${this.basePath}/explore">
                        <span class="material-symbols-rounded">explore</span>
                        <span>${window.__('btn_explore_canvases', [], 'Explorar murales')}</span>
                    </a>
                `
            });
            this.reinitializeUI();
            this.checkCheckoutSuccess();
            return;
        }

        if (this.contentArea) {
            const initialData = this.contentArea.getAttribute('data-initial-canvases');
            if (initialData) {
                try {
                    window.initialHomeCanvases = JSON.parse(initialData);
                    this.contentArea.removeAttribute('data-initial-canvases');
                } catch(e) {}
            }

            if (!window.initialHomeCanvases) {
                this.contentArea.innerHTML = '<div class="component-grid" data-ref="home-user-canvases"></div>';
                renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            }
        }
        
        this.loadCanvases();
        this.checkCheckoutSuccess();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.feedAbortController) this.feedAbortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        if (this.observer) this.observer.disconnect();
        if (this.virtualObserver) this.virtualObserver.disconnect();
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

        if (action === 'filterHomeCategory') {
            const selectedFilter = actionBtn.getAttribute('data-filter') || 'all';
            
            if (selectedFilter === this.currentFilter) return;
            
            const menu = actionBtn.closest('.component-menu-list');
            if (menu) {
                menu.querySelectorAll('.component-menu-link').forEach(btn => btn.classList.remove('active'));
            }
            actionBtn.classList.add('active');

            const filterBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
            if (filterBtn) {
                if (selectedFilter !== 'all') {
                    filterBtn.classList.add('has-active-filter');
                } else {
                    filterBtn.classList.remove('has-active-filter');
                }
            }

            const moduleEl = actionBtn.closest('.component-module');
            if (moduleEl) {
                moduleEl.classList.add('disabled');
                if (window.appInstance?.moduleManager?.resetToMainMenu) {
                    window.appInstance.moduleManager.resetToMainMenu(moduleEl);
                }
            }
            
            this.currentFilter = selectedFilter;
            
            if (this.contentArea) {
                this.contentArea.innerHTML = '<div class="component-grid" data-ref="home-user-canvases"></div>';
                renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            }
            
            if (this._filterThrottle) clearTimeout(this._filterThrottle);
            this._filterThrottle = setTimeout(() => {
                this._filterThrottle = null;
                this.loadCanvases();
            }, 300);
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

    async loadCanvases(isLoadMore = false) {
        if (!window.activeUserId) return;

        if (!isLoadMore) {
            if (this.feedAbortController) {
                this.feedAbortController.abort();
            }
            this.feedAbortController = new AbortController();
            
            this.currentOffset = 0;
            this.allCanvases = [];
            this.hasMore = true;
            this.isLoadingMore = false;
        }

        if (!this.hasMore || this.isLoadingMore) return;

        this.isLoadingMore = true;
        if (isLoadMore && this.contentArea) {
            appendInfiniteScrollSkeletons(this.contentArea, 4);
        }

        let newCanvases = [];
        let isError = false;
        let res = null;
        const limit = 50;

        if (window.initialHomeCanvases && this.currentFilter === 'all' && !isLoadMore) {
            newCanvases = window.initialHomeCanvases;
            window.initialHomeCanvases = null; 
        } else {
            const signal = this.feedAbortController ? this.feedAbortController.signal : this.abortController.signal;
            res = await this.api.post(ApiRoutes.Canvases.GetMine, { limit: limit, offset: this.currentOffset, filter: this.currentFilter }, signal).catch(() => null);
            
            if (signal.aborted) {
                this.isLoadingMore = false;
                return;
            }
            
            if (res && res.success) {
                newCanvases = res.data || [];
            } else {
                isError = true;
            }
        }

        removeInfiniteScrollSkeletons(this.contentArea);

        let finalItems = newCanvases;

        if (finalItems.length > 0 || (this.allCanvases.length > 0 && isLoadMore)) {
            renderVirtualGridItems(this.contentArea, isLoadMore ? finalItems : (this.allCanvases.length ? this.allCanvases.concat(finalItems) : finalItems), this.virtualObserver, isLoadMore, 'home-user-canvases');
            this.allCanvases = this.allCanvases.concat(finalItems);
        } else if (isError && !isLoadMore) {
            this.showError(this.contentArea, (res && res.message) ? res.message : window.__('err_load_canvases'));
        } else if (!isLoadMore) {
            let emptyTitle = window.__('home_empty_all_title');
            let emptyDesc = window.__('home_empty_all_desc');
            let emptyActions = `
                <a class="component-button component-button--h40" data-nav="${this.basePath}/canvases/create">
                    <span class="material-symbols-rounded">add</span>
                    <span>${window.__('btn_create_canvas')}</span>
                </a>
                <a class="component-button component-button--secondary component-button--h40" data-nav="${this.basePath}/explore">
                    <span class="material-symbols-rounded">explore</span>
                    <span>${window.__('btn_explore_canvases')}</span>
                </a>
            `;

            if (this.currentFilter === 'mine') {
                emptyTitle = window.__('home_empty_mine_title');
                emptyDesc = window.__('home_empty_mine_desc');
                emptyActions = `
                    <a class="component-button component-button--h40" data-nav="${this.basePath}/canvases/create">
                        <span class="material-symbols-rounded">add</span>
                        <span>${window.__('btn_create_canvas')}</span>
                    </a>
                `;
            } else if (this.currentFilter === 'joined') {
                emptyTitle = window.__('home_empty_joined_title');
                emptyDesc = window.__('home_empty_joined_desc');
                emptyActions = `
                    <a class="component-button component-button--secondary component-button--h40" data-nav="${this.basePath}/explore">
                        <span class="material-symbols-rounded">explore</span>
                        <span>${window.__('btn_explore_canvases')}</span>
                    </a>
                `;
            } else if (this.currentFilter === 'managed') {
                emptyTitle = window.__('home_empty_managed_title');
                emptyDesc = window.__('home_empty_managed_desc');
                emptyActions = `
                    <a class="component-button component-button--secondary component-button--h40" data-nav="${this.basePath}/explore">
                        <span class="material-symbols-rounded">explore</span>
                        <span>${window.__('btn_explore_canvases')}</span>
                    </a>
                `;
            }

            this.contentArea.innerHTML = CardTemplates.emptyState({
                type: 'canvas',
                title: emptyTitle,
                message: emptyDesc,
                actions: emptyActions
            });
        }
        
        if (newCanvases.length < limit) {
            this.hasMore = false;
        }
        this.currentOffset += newCanvases.length;
        this.isLoadingMore = false;

        this.reinitializeUI();
        this.observer = setupGridInfiniteScroll({
            container: this.contentArea,
            hasMore: this.hasMore,
            currentObserver: this.observer,
            onIntersect: () => this.loadCanvases(true)
        });
    }

    showError(container, message) {
        if (container) {
            container.innerHTML = CardTemplates.emptyState(message, 'error');
        }
    }

    reinitializeUI() {
        if (!this.contentArea) return;
        const grid = this.contentArea.querySelector('.component-grid');
        if (!grid) return; 
        
        if (window.app && typeof window.app.initModules === 'function') window.app.initModules(grid);
        
        if (window.router && typeof window.router.bindLinks === 'function') window.router.bindLinks(grid);
    }

    async checkCheckoutSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        if (urlParams.get('checkout') === 'success' && sessionId) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            for (let i = 0; i < 5; i++) {
                try {
                    const result = await this.api.post(ApiRoutes.Stripe.GetSubscriptionStatus, { session_id: sessionId }, this.abortController.signal);
                    if (result && result.success && result.data && (result.data.status === 'active' || result.data.tier > 0)) {
                        window.appUserTier = result.data.tier;
                        window.dispatchEvent(new CustomEvent('subscription-updated', { detail: result.data }));
                        if (window.modalSystem) {
                            window.modalSystem.show('purchaseSuccessModal', { ...result.data, item_type: 'subscription' });
                        }
                        break;
                    }
                } catch (e) {
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
}

export { HomeController };