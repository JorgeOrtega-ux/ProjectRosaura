import { isAdFreeUser } from '../utils/uiUtils.js';

export const PromoType = {
    FEED: 'feed',
    MODULE: 'module'
};

const FEED_PROMOS = [
    {
        id: 'promo-tools-01',
        type: PromoType.FEED,
        sponsor: 'PixelCraft Pro',
        title: 'Herramientas Creativas 2D',
        description: 'Pinceles inteligentes, capas avanzadas y exportación de spritesheets en tiempo real.',
        url: '/upgrade',
        media: [
            { type: 'image', url: '/assets/img/showcase/creative_tools.jpg', alt: 'PixelCraft Tools' },
            { type: 'image', url: '/assets/img/showcase/drawing_pad.jpg', alt: 'ChromaPad Studio' },
            { type: 'video', url: '/assets/media/sample_promo.mp4', alt: 'PixelCraft Demo' }
        ]
    },
    {
        id: 'promo-tablet-02',
        type: PromoType.FEED,
        sponsor: 'ChromaPad X',
        title: 'Tabletas Digitales Profesionales',
        description: 'Sensibilidad de presión de 8192 niveles con control RGB para artistas de pixel.',
        url: '/upgrade',
        media: [
            { type: 'image', url: '/assets/img/showcase/drawing_pad.jpg', alt: 'ChromaPad X' },
            { type: 'image', url: '/assets/img/showcase/palette_master.jpg', alt: 'Color Match' }
        ]
    },
    {
        id: 'promo-palette-03',
        type: PromoType.FEED,
        sponsor: 'Palette Master AI',
        title: 'Generador de Paletas Armónicas',
        description: 'Extracción instantánea de degradados y paletas cromáticas para tu lienzo.',
        url: '/upgrade',
        media: [
            { type: 'image', url: '/assets/img/showcase/palette_master.jpg', alt: 'Palette Master' },
            { type: 'image', url: '/assets/img/showcase/templates_pro.jpg', alt: 'Templates Pro' },
            { type: 'video', url: '/assets/media/sample_promo.mp4', alt: 'Palette Demo' }
        ]
    },
    {
        id: 'promo-templates-04',
        type: PromoType.FEED,
        sponsor: 'NeoRetro Assets',
        title: 'Librería de Plantillas 16-Bit',
        description: 'Más de 5,000 mapas isométricos, tilesets y planos listos para colocar.',
        url: '/upgrade',
        media: [
            { type: 'image', url: '/assets/img/showcase/templates_pro.jpg', alt: 'NeoRetro Assets' },
            { type: 'image', url: '/assets/img/showcase/creative_tools.jpg', alt: 'Creative Studio' }
        ]
    }
];

const MODULE_PROMOS = {
    colors: {
        id: 'promo-mod-colors',
        type: PromoType.MODULE,
        sponsor: 'Chroma Studio',
        title: 'Paletas y Armonías Exclusivas',
        description: 'Descubre combinaciones de colores únicas y degradados profesionales para tus obras.',
        url: '/upgrade',
        media: [
            { type: 'image', url: '/assets/img/showcase/palette_master.jpg', alt: 'Chroma Studio' },
            { type: 'image', url: '/assets/img/showcase/creative_tools.jpg', alt: 'Tools UI' },
            { type: 'video', url: '/assets/media/sample_promo.mp4', alt: 'Color Demo' }
        ]
    },
    templates: {
        id: 'promo-mod-templates',
        type: PromoType.MODULE,
        sponsor: 'RetroCraft Blueprints',
        title: 'Pack de Plantillas Pixel Art',
        description: 'Inyecta estructuras, mapas y esquemas de referencia directamente en tu lienzo.',
        url: '/upgrade',
        media: [
            { type: 'image', url: '/assets/img/showcase/templates_pro.jpg', alt: 'RetroCraft Blueprints' },
            { type: 'image', url: '/assets/img/showcase/drawing_pad.jpg', alt: 'Drawing Tablet' },
            { type: 'video', url: '/assets/media/sample_promo.mp4', alt: 'Templates Demo' }
        ]
    },
    info: {
        id: 'promo-mod-info',
        type: PromoType.MODULE,
        sponsor: 'PixelCraft Studio Pro',
        title: 'Herramientas de Animación 2D',
        description: 'Pinceles inteligentes, capas avanzadas y exportación de spritesheets en tiempo real.',
        url: '/upgrade',
        media: [
            { type: 'image', url: '/assets/img/showcase/creative_tools.jpg', alt: 'PixelCraft Studio' },
            { type: 'image', url: '/assets/img/showcase/drawing_pad.jpg', alt: 'ChromaPad Studio' },
            { type: 'video', url: '/assets/media/sample_promo.mp4', alt: 'PixelCraft Demo' }
        ]
    }
};

class PromoCardService {
    constructor() {
        this.initGlobalListeners();
    }

    isExempt() {
        return isAdFreeUser();
    }

    /**
     * Injects 1 promo card every 8 real canvas items into a feed list.
     * @param {Array} canvasList List of canvases from API
     * @param {number} currentRealCount Current count of real canvases already loaded
     * @returns {Array} Combined array with promo cards inserted
     */
    injectFeedCards(canvasList, currentRealCount = 0) {
        if (!Array.isArray(canvasList) || canvasList.length === 0) {
            return canvasList || [];
        }

        if (this.isExempt()) {
            return canvasList;
        }

        const result = [];
        let realCounter = currentRealCount;
        let promoIndex = Math.floor(currentRealCount / 8);

        canvasList.forEach((canvas) => {
            result.push(canvas);
            realCounter++;

            if (realCounter % 8 === 0) {
                const promo = FEED_PROMOS[promoIndex % FEED_PROMOS.length];
                result.push({
                    ...promo,
                    is_promo: true,
                    id: `promo-card-${realCounter}-${promo.id}`
                });
                promoIndex++;
            }
        });

        return result;
    }

    /**
     * Returns the promo definition for a specific sidebar tool module ('colors', 'templates').
     */
    getModulePromo(moduleKey) {
        if (this.isExempt()) return null;
        return MODULE_PROMOS[moduleKey] || null;
    }

    /**
     * Advances/switches the active slide of a promo card.
     */
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

    /**
     * Initializes global event delegation on document so ANY card (virtualized,
     * dynamically loaded, in home, search, or sidebars) works automatically.
     */
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

            const extPromo = e.target.closest('[data-action="openExternalPromo"]');
            if (extPromo) {
                e.preventDefault();
                const url = extPromo.getAttribute('data-target-url');
                if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            }
        });
    }

    initCardInteractions() {
        // Kept for backward compatibility if called manually
    }
}

export const PromoService = new PromoCardService();
