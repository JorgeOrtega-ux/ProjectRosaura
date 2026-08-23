import { isAdFreeUser } from '../utils/uiUtils.js';
import { ApiRoutes } from '../api/ApiRoutes.js';
import { ApiService } from '../api/ApiService.js';

export const PromoType = {
    FEED: 'feed',
    MODULE: 'module'
};

class PromoCardService {
    constructor() {
        this.api = new ApiService();
        this.feedPromos = [];
        this.modulePromos = {};
        this.hasLoadedFromApi = false;
        this.loadPromise = null;
        this.trackedImpressions = new Set();
        this.trackedVideos = new Set();
        this.visibleTimers = new Map();
        this.impressionObserver = null;
        this.initGlobalListeners();
    }

    async ensureLoaded() {
        if (this.hasLoadedFromApi) return true;
        if (this.loadPromise) {
            await this.loadPromise;
            return true;
        }
        await this.loadActiveAds();
        return true;
    }

    async loadActiveAds(forceRefresh = false) {
        if (this.isExempt()) {
            this.feedPromos = [];
            this.modulePromos = {};
            this.hasLoadedFromApi = true;
            return;
        }

        if (this.hasLoadedFromApi && !forceRefresh) {
            return;
        }

        this.loadPromise = (async () => {
            try {
                const res = await this.api.post(ApiRoutes.Advertisements.GetActiveFeed, {});
                if (res && res.success) {
                    this.hasLoadedFromApi = true;
                    if (Array.isArray(res.feed_promos)) {
                        this.feedPromos = res.feed_promos;
                    }
                    if (res.module_promos && typeof res.module_promos === 'object') {
                        this.modulePromos = res.module_promos;
                    }
                } else {
                    this.feedPromos = [];
                    this.modulePromos = {};
                }
            } catch (_) {
                this.feedPromos = [];
                this.modulePromos = {};
            }
        })();

        await this.loadPromise;
    }

    isExempt() {
        return isAdFreeUser();
    }

    injectFeedCards(canvasList, currentRealCount = 0) {
        if (!Array.isArray(canvasList) || canvasList.length === 0) {
            return canvasList || [];
        }

        if (this.isExempt() || !this.feedPromos || this.feedPromos.length === 0) {
            return canvasList;
        }

        const result = [];
        let realCounter = currentRealCount;
        let promoIndex = Math.floor(currentRealCount / 8);

        canvasList.forEach((canvas) => {
            result.push(canvas);
            realCounter++;

            if (realCounter % 8 === 0 && this.feedPromos.length > 0) {
                const promo = this.feedPromos[promoIndex % this.feedPromos.length];
                const promoUuid = promo.uuid || promo.id;
                result.push({
                    ...promo,
                    is_promo: true,
                    promo_uuid: promoUuid,
                    id: `promo-card-${realCounter}-${promoUuid}`
                });
                promoIndex++;
            }
        });

        return result;
    }

    getModulePromo(moduleKey) {
        if (this.isExempt()) return null;
        const entry = this.modulePromos[moduleKey];
        if (!entry) return null;

        if (Array.isArray(entry)) {
            if (entry.length === 0) return null;
            return entry[Math.floor(Math.random() * entry.length)];
        }

        return entry;
    }

    trackImpression(adUuid) {
        if (!adUuid || this.isExempt() || this.trackedImpressions.has(adUuid)) return;
        this.trackedImpressions.add(adUuid);
        this.api.post(ApiRoutes.Advertisements.TrackEvent, {
            ad_uuid: adUuid,
            event_type: 'impression'
        }).catch(() => {});
    }

    trackVideoView(adUuid) {
        if (!adUuid || this.isExempt() || this.trackedVideos.has(adUuid)) return;
        this.trackedVideos.add(adUuid);
        this.api.post(ApiRoutes.Advertisements.TrackEvent, {
            ad_uuid: adUuid,
            event_type: 'video_view'
        }).catch(() => {});
    }

    updateCardSlide(card, targetIndex) {
        const mediaItems = Array.from(card.querySelectorAll('.component-gallery-media-item'));
        const dots = Array.from(card.querySelectorAll('.component-gallery-dot'));
        if (mediaItems.length <= 1) return;

        const safeIndex = targetIndex % mediaItems.length;
        card.setAttribute('data-current-slide', safeIndex);

        mediaItems.forEach((item, idx) => {
            if (idx === safeIndex) {
                item.classList.add('active');
                item.classList.add('image-loaded');
                if (item.tagName === 'VIDEO') {
                    item.currentTime = 0;
                    const playPromise = item.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(() => {});
                    }
                    const promoId = card.getAttribute('data-promo-id');
                    if (promoId) {
                        this.trackVideoView(promoId);
                    }
                }
            } else {
                item.classList.remove('active');
                if (item.tagName === 'VIDEO') {
                    item.pause();
                    item.currentTime = 0;
                }
            }
        });

        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === safeIndex);
        });
    }

    startCardCycle(card) {
        this.stopCardCycle(card);
        const mediaItems = card.querySelectorAll('.component-gallery-media-item');
        if (mediaItems.length <= 1) return;

        card._promoTimer = setInterval(() => {
            const currentIdx = parseInt(card.getAttribute('data-current-slide') || '0', 10);
            const nextIdx = (currentIdx + 1) % mediaItems.length;
            this.updateCardSlide(card, nextIdx);
        }, 2000);
    }

    stopCardCycle(card) {
        if (card && card._promoTimer) {
            clearInterval(card._promoTimer);
            card._promoTimer = null;
        }
    }

    resetCard(card) {
        this.stopCardCycle(card);
        this.updateCardSlide(card, 0);
    }

    initGlobalListeners() {
        if (typeof document === 'undefined' || window._promoGlobalListenersBound) return;
        window._promoGlobalListenersBound = true;

        document.addEventListener('mouseover', (e) => {
            const card = e.target.closest('.component-gallery-card[data-card-role="promo"]');
            if (!card) return;

            const fromEl = e.relatedTarget;
            if (fromEl && card.contains(fromEl)) return;

            this.startCardCycle(card);
        }, true);

        document.addEventListener('mouseout', (e) => {
            const card = e.target.closest('.component-gallery-card[data-card-role="promo"]');
            if (!card) return;

            const toEl = e.relatedTarget;
            if (toEl && card.contains(toEl)) return;

            this.resetCard(card);
        }, true);

        document.addEventListener('click', (e) => {
            const dot = e.target.closest('.component-gallery-dot');
            if (dot) {
                const card = dot.closest('.component-gallery-card[data-card-role="promo"]');
                if (card) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.stopCardCycle(card);
                    const idx = parseInt(dot.getAttribute('data-index') || '0', 10);
                    this.updateCardSlide(card, idx);
                    return;
                }
            }

            const promoLink = e.target.closest('[data-action="openPromoLink"], [data-action="openExternalPromo"]');
            if (promoLink) {
                e.preventDefault();
                const targetUrl = promoLink.getAttribute('data-target-url') || promoLink.getAttribute('href') || '/upgrade';
                const card = promoLink.closest('[data-promo-id]');
                const promoId = card ? card.getAttribute('data-promo-id') : null;
                const isExternal = promoLink.getAttribute('data-is-external') === 'true' || targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

                if (promoId) {
                    this.api.post(ApiRoutes.Advertisements.TrackEvent, {
                        ad_uuid: promoId,
                        event_type: 'click'
                    }).catch(() => {});
                }

                if (isExternal) {
                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                } else {
                    const basePath = window.AppBasePath || '';
                    const navUrl = (basePath && targetUrl.startsWith('/') && !targetUrl.startsWith(basePath + '/')) 
                        ? `${basePath}${targetUrl}` 
                        : targetUrl;
                    if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                        window.spaRouter.navigate(navUrl);
                    } else {
                        window.location.href = navUrl;
                    }
                }
            }
        });
    }

    initCardInteractions(container = document) {
        if (!container) return;
        const promoCards = container.querySelectorAll('.component-gallery-card[data-card-role="promo"]');
        if (!promoCards.length) return;

        if (!this.impressionObserver && typeof IntersectionObserver !== 'undefined') {
            this.impressionObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const card = entry.target;
                    const promoId = card.getAttribute('data-promo-id');
                    if (!promoId) return;

                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        if (!this.visibleTimers.has(card)) {
                            const timer = setTimeout(() => {
                                this.trackImpression(promoId);
                                if (this.impressionObserver) {
                                    this.impressionObserver.unobserve(card);
                                }
                                this.visibleTimers.delete(card);
                            }, 1000);
                            this.visibleTimers.set(card, timer);
                        }
                    } else {
                        if (this.visibleTimers.has(card)) {
                            clearTimeout(this.visibleTimers.get(card));
                            this.visibleTimers.delete(card);
                        }
                    }
                });
            }, {
                threshold: 0.5
            });
        }

        promoCards.forEach((card) => {
            const promoId = card.getAttribute('data-promo-id');
            if (promoId && !this.trackedImpressions.has(promoId)) {
                if (this.impressionObserver) {
                    this.impressionObserver.observe(card);
                } else {
                    this.trackImpression(promoId);
                }
            }
        });
    }
}

export const PromoService = new PromoCardService();
