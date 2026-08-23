import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { PromoService } from '../../../core/services/PromoCardService.js';
import { 
    appendInfiniteScrollSkeletons, 
    initCarouselScroll, 
    removeInfiniteScrollSkeletons, 
    renderSkeleton, 
    renderVirtualGridItems, 
    setupGridInfiniteScroll 
} from '../../../core/utils/uiUtils.js';
import { VirtualGridObserver } from '../../../core/utils/VirtualGridObserver.js';

class ExploreController {
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
        this.currentTag = 'all';
        this.observer = null;
        this.virtualObserver = null;
        this._tagThrottle = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.updateCarouselButtonsBound = this.updateCarouselButtons.bind(this);
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
        
        if (this.contentArea) {
            const initialData = this.contentArea.getAttribute('data-initial-canvases');
            if (initialData) {
                try {
                    window.initialExploreCanvases = JSON.parse(initialData);
                    this.contentArea.removeAttribute('data-initial-canvases');
                } catch(e) {}
            }

            if (!window.initialExploreCanvases) {
                this.contentArea.innerHTML = '<div class="component-grid" data-ref="explore-all-canvases"></div>';
                renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            }
        }
        
        this.loadCanvases();
        this.checkCheckoutSuccess();
        this.setupCarouselDrag();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.feedAbortController) this.feedAbortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        const carousel = document.querySelector('[data-ref="explore-tags-carousel"]');
        if (carousel) {
            carousel.removeEventListener('scroll', this.updateCarouselButtonsBound);
        }
        window.removeEventListener('resize', this.updateCarouselButtonsBound);
        if (this.observer) this.observer.disconnect();
        if (this.virtualObserver) this.virtualObserver.disconnect();
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        
        const wrapper = document.querySelector('.component-tags-carousel-wrapper');
        if (wrapper) {
            initCarouselScroll(wrapper);
        }
    }

    updateCarouselButtons() {
        const carousel = document.querySelector('[data-ref="explore-tags-carousel"]');
        const leftBtn = document.querySelector('.component-tag-nav-left');
        const rightBtn = document.querySelector('.component-tag-nav-right');
        
        if (!carousel || !leftBtn || !rightBtn) return;
        
        if (carousel.scrollLeft > 0) {
            leftBtn.classList.remove('disabled');
        } else {
            leftBtn.classList.add('disabled');
        }
        
        if (carousel.scrollWidth > carousel.clientWidth && Math.ceil(carousel.scrollLeft + carousel.clientWidth) < carousel.scrollWidth) {
            rightBtn.classList.remove('disabled');
        } else {
            rightBtn.classList.add('disabled');
        }
    }

    setupCarouselDrag() {
        const carousel = document.querySelector('[data-ref="explore-tags-carousel"]');
        if (!carousel) return;
        
        let isDown = false;
        let startX;
        let scrollLeft;
        let isDragging = false;

        carousel.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });
        
        carousel.addEventListener('mouseleave', () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
        });
        
        carousel.addEventListener('mouseup', () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
            setTimeout(() => { isDragging = false; }, 50);
        });
        
        carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2; 
            if (Math.abs(walk) > 5) {
                isDragging = true;
                carousel.classList.add('is-dragging');
            }
            if (isDragging) {
                carousel.scrollLeft = scrollLeft - walk;
            }
        });

        carousel.addEventListener('click', (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true });
    }

    handleGlobalClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        
        const action = actionBtn.getAttribute('data-action');

        if (action === 'reloadExplore') {
            e.preventDefault();
            this.loadCanvases();
            return;
        }

        if (action === 'filterExploreTag') {
            const selectedTag = actionBtn.getAttribute('data-tag') || 'all';
            
            if (selectedTag === this.currentTag) return;
            
            document.querySelectorAll('.component-tags-carousel .component-badge').forEach(btn => btn.classList.remove('active'));
            actionBtn.classList.add('active');
            
            this.contentArea.innerHTML = '<div class="component-grid" data-ref="explore-all-canvases"></div>';
            renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            
            if (this._tagThrottle) clearTimeout(this._tagThrottle);
            this._tagThrottle = setTimeout(() => {
                this._tagThrottle = null;
                this.loadCanvases();
            }, 400);
            return;
        }

        if (action === 'scrollTagsLeft') {
            const carousel = document.querySelector('[data-ref="explore-tags-carousel"]');
            if (carousel) carousel.scrollBy({ left: -200, behavior: 'smooth' });
            return;
        }
        
        if (action === 'scrollTagsRight') {
            const carousel = document.querySelector('[data-ref="explore-tags-carousel"]');
            if (carousel) carousel.scrollBy({ left: 200, behavior: 'smooth' });
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
        
        const activeTagEl = document.querySelector('.component-tags-carousel .component-badge.active');
        const currentTag = activeTagEl ? activeTagEl.getAttribute('data-tag') : 'all';
        this.currentTag = currentTag;

        this.isLoadingMore = true;
        if (isLoadMore && this.contentArea) {
            appendInfiniteScrollSkeletons(this.contentArea, 4);
        }

        let newCanvases = [];
        let isError = false;
        let res = null;
        const limit = 20;

        if (window.initialExploreCanvases && currentTag === 'all' && !isLoadMore) {
            newCanvases = window.initialExploreCanvases;
            window.initialExploreCanvases = null; 
        } else {
            const signal = this.feedAbortController ? this.feedAbortController.signal : this.abortController.signal;
            res = await this.api.post(ApiRoutes.Canvases.GetHomeFeed, { limit: limit, offset: this.currentOffset, tag: currentTag }, signal).catch(() => null);
            
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

        await PromoService.ensureLoaded();
        const itemsWithPromos = PromoService.injectFeedCards(newCanvases, this.currentOffset);

        if (itemsWithPromos.length > 0 || (this.allCanvases.length > 0 && isLoadMore)) {
            renderVirtualGridItems(this.contentArea, isLoadMore ? itemsWithPromos : (this.allCanvases.length ? this.allCanvases.concat(itemsWithPromos) : itemsWithPromos), this.virtualObserver, isLoadMore, 'explore-all-canvases');
            this.allCanvases = this.allCanvases.concat(itemsWithPromos);
        } else if (isError && !isLoadMore) {
            this.showError(this.contentArea, (res && res.message) ? res.message : window.__('err_load_canvases'));
        } else if (!isLoadMore) {
            this.contentArea.innerHTML = CardTemplates.emptyState({
                type: 'explore',
                title: window.__('explore_empty_title'),
                message: window.__('explore_empty_desc')
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

        PromoService.initCardInteractions(this.contentArea);
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

export { ExploreController };
