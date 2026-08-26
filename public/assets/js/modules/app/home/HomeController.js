import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { PromoService } from '../../../core/services/PromoCardService.js';
import { CanvasStorageEngine } from '../design/utils/CanvasStorageEngine.js';
import {
    appendInfiniteScrollSkeletons,
    initCarouselScroll,
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
        this.currentServerOffset = 0;
        this.allCanvases = [];
        this.isLoadingMore = false;
        this.hasMore = true;
        this.currentViewMode = 'explore';
        this.currentPersonalFilter = 'mine';
        this.currentTag = 'all';
        this.initialMode = null;
        this.initialKey = null;
        this.observer = null;
        this.virtualObserver = null;
        this._filterThrottle = null;

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
            if (item && item.is_publication) {
                return CardTemplates.publicationCard(item, { basePath: this.basePath });
            }
            return CardTemplates.canvasCard(item, { basePath: this.basePath });
        });

        this.bindEvents();

        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');

        if (this.contentArea) {
            this.initialMode = this.contentArea.getAttribute('data-initial-mode');
            this.initialKey = this.contentArea.getAttribute('data-initial-key');
            this.contentArea.removeAttribute('data-initial-mode');
            this.contentArea.removeAttribute('data-initial-key');

            const initialData = this.contentArea.getAttribute('data-initial-canvases');
            if (initialData) {
                try {
                    window.initialHomeCanvases = JSON.parse(initialData);
                    this.contentArea.removeAttribute('data-initial-canvases');
                } catch (e) {}
            }

            if (!window.initialHomeCanvases) {
                this.contentArea.innerHTML = '<div class="component-grid" data-ref="home-canvases"></div>';
                renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            }
        }

        this.syncSelectionFromDom();
        this.loadCanvases();
        this.checkCheckoutSuccess();
        this.setupCarouselDrag();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.feedAbortController) this.feedAbortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        if (this._onLocalCanvasSynced) {
            document.removeEventListener('localCanvasSynced', this._onLocalCanvasSynced);
        }
        const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
        if (carousel) {
            carousel.removeEventListener('scroll', this.updateCarouselButtonsBound);
        }
        window.removeEventListener('resize', this.updateCarouselButtonsBound);
        if (this.observer) this.observer.disconnect();
        if (this.virtualObserver) this.virtualObserver.disconnect();
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);

        // Actualizar allCanvases cuando un lienzo local se sincroniza desde la galería
        this._onLocalCanvasSynced = (e) => {
            const { oldUuid, newCanvas } = e.detail || {};
            if (!oldUuid || !newCanvas) return;
            const idx = this.allCanvases.findIndex(c => c.uuid === oldUuid || c.id === oldUuid);
            if (idx !== -1) {
                this.allCanvases[idx] = newCanvas;
            } else {
                // Si el observer no lo tenía registrado, simplemente eliminarlo del tracking
                this.allCanvases = this.allCanvases.filter(c => c.uuid !== oldUuid && c.id !== oldUuid);
            }
        };
        document.addEventListener('localCanvasSynced', this._onLocalCanvasSynced);

        const wrapper = document.querySelector('.component-tags-carousel-wrapper');
        if (wrapper) {
            initCarouselScroll(wrapper);
        }
    }

    syncSelectionFromDom() {
        const selection = this.getActiveSelection();
        this.currentViewMode = selection.mode;
        if (selection.mode === 'personal') {
            this.currentPersonalFilter = selection.key;
        } else {
            this.currentTag = selection.key;
        }
    }

    getActiveSelection() {
        const active = document.querySelector('[data-ref="home-tags-carousel"] .component-badge.active');
        if (!active) {
            return { mode: 'explore', key: 'all' };
        }
        const action = active.getAttribute('data-action');
        if (action === 'filterHomePublications') {
            return { mode: 'publications', key: 'all' };
        }
        if (action === 'filterHomePersonal') {
            return { mode: 'personal', key: active.getAttribute('data-filter') || 'mine' };
        }
        return { mode: 'explore', key: active.getAttribute('data-tag') || 'all' };
    }

    activateBadge(actionBtn) {
        document.querySelectorAll('[data-ref="home-tags-carousel"] .component-badge').forEach(btn => btn.classList.remove('active'));
        actionBtn.classList.add('active');
        this.syncSelectionFromDom();
    }

    resetGridWithSkeleton() {
        this.contentArea.innerHTML = '<div class="component-grid" data-ref="home-canvases"></div>';
        renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
    }

    scheduleReload() {
        if (this._filterThrottle) clearTimeout(this._filterThrottle);
        this._filterThrottle = setTimeout(() => {
            this._filterThrottle = null;
            this.loadCanvases();
        }, 400);
    }

    updateCarouselButtons() {
        const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
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
        const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
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

        if (action === 'reloadHome') {
            e.preventDefault();
            this.loadCanvases();
            return;
        }

        if (action === 'filterHomePersonal') {
            const selectedFilter = actionBtn.getAttribute('data-filter') || 'mine';
            if (this.currentViewMode === 'personal' && this.currentPersonalFilter === selectedFilter) return;

            this.activateBadge(actionBtn);
            this.resetGridWithSkeleton();
            this.scheduleReload();
            return;
        }

        if (action === 'filterHomePublications') {
            if (this.currentViewMode === 'publications') return;

            this.activateBadge(actionBtn);
            this.resetGridWithSkeleton();
            this.scheduleReload();
            return;
        }

        if (action === 'filterHomeTag') {
            const selectedTag = actionBtn.getAttribute('data-tag') || 'all';
            if (this.currentViewMode === 'explore' && this.currentTag === selectedTag) return;

            this.activateBadge(actionBtn);
            this.resetGridWithSkeleton();
            this.scheduleReload();
            return;
        }

        const pubLikeBtn = e.target.closest('[data-action="togglePublicationLike"]');
        if (pubLikeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const pubUuid = pubLikeBtn.getAttribute('data-uuid');
            this.togglePublicationLike(pubUuid, pubLikeBtn);
            return;
        }

        if (action === 'scrollTagsLeft') {
            const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
            if (carousel) carousel.scrollBy({ left: -200, behavior: 'smooth' });
            return;
        }

        if (action === 'scrollTagsRight') {
            const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
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

    canUseInitialData(isLoadMore) {
        if (!window.initialHomeCanvases || isLoadMore) return false;
        const selection = this.getActiveSelection();
        return selection.mode === this.initialMode && selection.key === this.initialKey;
    }

    getPersonalEmptyState(filter) {
        const createBtn = `
            <a class="component-button component-button--h40" data-nav="${this.basePath}/canvases/create">
                <span class="material-symbols-rounded">add</span>
                <span>${window.__('btn_create_canvas')}</span>
            </a>
        `;
        const exploreBtn = `
            <button class="component-button component-button--secondary component-button--h40" data-action="filterHomeTag" data-tag="all">
                <span class="material-symbols-rounded">explore</span>
                <span>${window.__('btn_explore_canvases')}</span>
            </button>
        `;

        if (filter === 'mine') {
            return {
                title: window.__('home_empty_mine_title'),
                message: window.__('home_empty_mine_desc'),
                actions: createBtn
            };
        }
        if (filter === 'favorites') {
            return {
                title: window.__('home_empty_favorites_title'),
                message: window.__('home_empty_favorites_desc'),
                actions: exploreBtn
            };
        }
        if (filter === 'joined') {
            return {
                title: window.__('home_empty_joined_title'),
                message: window.__('home_empty_joined_desc'),
                actions: exploreBtn
            };
        }
        return {
            title: window.__('home_empty_all_title'),
            message: window.__('home_empty_all_desc'),
            actions: `${createBtn}${exploreBtn}`
        };
    }

    async loadCanvases(isLoadMore = false) {
        if (!isLoadMore) {
            if (this.feedAbortController) {
                this.feedAbortController.abort();
            }
            this.feedAbortController = new AbortController();

            this.currentOffset = 0;
            this.currentServerOffset = 0;
            this.allCanvases = [];
            this.hasMore = true;
            this.isLoadingMore = false;
        }

        if (!this.hasMore || this.isLoadingMore) return;

        this.syncSelectionFromDom();
        const isPersonal = this.currentViewMode === 'personal';

        this.isLoadingMore = true;
        if (isLoadMore && this.contentArea) {
            appendInfiniteScrollSkeletons(this.contentArea, 4);
        }

        let newCanvases = [];
        let isError = false;
        let res = null;
        const limit = isPersonal ? 50 : 20;

        let localCanvases = [];
        if (isPersonal && this.currentPersonalFilter === 'mine' && !isLoadMore) {
            try {
                localCanvases = await CanvasStorageEngine.getAllLocalCanvases();
            } catch (e) {
                localCanvases = [];
            }
        }

        if (this.canUseInitialData(isLoadMore)) {
            const serverCanvases = window.initialHomeCanvases || [];
            window.initialHomeCanvases = null;
            this.initialMode = null;
            this.initialKey = null;
            this.currentServerOffset = serverCanvases.length;
            if (serverCanvases.length < limit) {
                this.hasMore = false;
            }
            newCanvases = [...localCanvases, ...serverCanvases];
        } else {
            const signal = this.feedAbortController ? this.feedAbortController.signal : this.abortController.signal;

            if (this.currentViewMode === 'publications') {
                res = await this.api.post(
                    ApiRoutes.Publications.GetFeed,
                    { limit, offset: this.currentServerOffset, sort: 'recent' },
                    signal
                ).catch(() => null);

                if (signal.aborted) {
                    this.isLoadingMore = false;
                    return;
                }

                if (res && res.success) {
                    const serverData = (res.data || []).map(p => ({ ...p, is_publication: true }));
                    this.currentServerOffset += serverData.length;
                    if (serverData.length < limit) {
                        this.hasMore = false;
                    }
                    newCanvases = serverData;
                } else {
                    isError = true;
                }
            } else if (isPersonal) {
                if (this.currentPersonalFilter === 'mine') {
                    if (window.activeUserId) {
                        res = await this.api.post(
                            ApiRoutes.Canvases.GetMine,
                            { limit, offset: this.currentServerOffset, filter: this.currentPersonalFilter },
                            signal
                        ).catch(() => null);

                        if (signal.aborted) {
                            this.isLoadingMore = false;
                            return;
                        }

                        if (res && res.success) {
                            const serverData = res.data || [];
                            this.currentServerOffset += serverData.length;
                            if (serverData.length < limit) {
                                this.hasMore = false;
                            }
                            newCanvases = isLoadMore ? serverData : [...localCanvases, ...serverData];
                        } else {
                            if (!isLoadMore && localCanvases.length > 0) {
                                newCanvases = localCanvases;
                                this.hasMore = false;
                            } else {
                                isError = true;
                            }
                        }
                    } else {
                        // Usuario sin sesión (Guest): cargar desde IndexedDB
                        newCanvases = localCanvases;
                        this.hasMore = false;
                    }
                } else {
                    // favorites o joined
                    if (!window.activeUserId) {
                        newCanvases = [];
                        this.hasMore = false;
                    } else {
                        res = await this.api.post(
                            ApiRoutes.Canvases.GetMine,
                            { limit, offset: this.currentServerOffset, filter: this.currentPersonalFilter },
                            signal
                        ).catch(() => null);

                        if (signal.aborted) {
                            this.isLoadingMore = false;
                            return;
                        }

                        if (res && res.success) {
                            const serverData = res.data || [];
                            this.currentServerOffset += serverData.length;
                            if (serverData.length < limit) {
                                this.hasMore = false;
                            }
                            newCanvases = serverData;
                        } else {
                            isError = true;
                        }
                    }
                }
            } else {
                res = await this.api.post(
                    ApiRoutes.Canvases.GetHomeFeed,
                    { limit, offset: this.currentServerOffset, tag: this.currentTag },
                    signal
                ).catch(() => null);

                if (signal.aborted) {
                    this.isLoadingMore = false;
                    return;
                }

                if (res && res.success) {
                    const serverData = res.data || [];
                    this.currentServerOffset += serverData.length;
                    if (serverData.length < limit) {
                        this.hasMore = false;
                    }
                    newCanvases = serverData;
                } else {
                    isError = true;
                }
            }
        }

        removeInfiniteScrollSkeletons(this.contentArea);

        let finalItems = newCanvases;
        if (!isPersonal && this.currentViewMode !== 'publications') {
            await PromoService.ensureLoaded();
            finalItems = PromoService.injectFeedCards(newCanvases, this.currentOffset);
        }

        if (finalItems.length > 0 || (this.allCanvases.length > 0 && isLoadMore)) {
            renderVirtualGridItems(
                this.contentArea,
                isLoadMore ? finalItems : (this.allCanvases.length ? this.allCanvases.concat(finalItems) : finalItems),
                this.virtualObserver,
                isLoadMore,
                'home-canvases'
            );
            this.allCanvases = this.allCanvases.concat(finalItems);
        } else if (isError && !isLoadMore) {
            this.showError(this.contentArea, (res && res.message) ? res.message : window.__('err_load_canvases'));
        } else if (!isLoadMore) {
            if (this.currentViewMode === 'publications') {
                this.contentArea.innerHTML = CardTemplates.emptyState({
                    type: 'palette',
                    title: 'No hay publicaciones todavía',
                    message: 'Sé el primero en compartir tu pixel art con la comunidad.'
                });
            } else if (isPersonal) {
                const empty = this.getPersonalEmptyState(this.currentPersonalFilter);
                this.contentArea.innerHTML = CardTemplates.emptyState({
                    type: 'canvas',
                    title: empty.title,
                    message: empty.message,
                    actions: empty.actions
                });
            } else {
                this.contentArea.innerHTML = CardTemplates.emptyState({
                    type: 'explore',
                    title: window.__('explore_empty_title'),
                    message: window.__('explore_empty_desc')
                });
            }
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

        if (this.currentViewMode === 'explore') {
            PromoService.initCardInteractions(this.contentArea);
        }
    }

    async togglePublicationLike(pubUuid, buttonEl) {
        if (!pubUuid) return;
        try {
            const res = await this.api.post(ApiRoutes.Publications.ToggleLike, { uuid: pubUuid });
            if (res && res.success) {
                buttonEl.classList.toggle('is-favorite', res.liked);
                const card = buttonEl.closest('.component-publication-card');
                if (card) {
                    const countEl = card.querySelector('.pub-like-count');
                    if (countEl) {
                        countEl.textContent = (res.likes_count || 0).toLocaleString();
                    }
                }
            } else if (res && res.message) {
                if (typeof showMessage === 'function') showMessage(res.message, 'error');
            }
        } catch (err) {
            console.error('Error toggling like:', err);
        }
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
