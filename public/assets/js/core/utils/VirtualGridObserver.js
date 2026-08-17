import { PromoService } from '../services/PromoCardService.js';

export class VirtualGridObserver {
    constructor(renderCallback, options = {}) {
        this.renderCallback = renderCallback;
        this.rootMargin = options.rootMargin || '150% 0px 150% 0px';
        this.virtualCards = new Map(); // DOM Element -> Canvas Data
        this.observer = null;

        this.initObserver();
    }

    initObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const el = entry.target;
                const canvasData = this.virtualCards.get(el);
                
                if (!canvasData) return;

                if (entry.isIntersecting) {
                    // Element entered viewport (or rootMargin)
                    // Render actual content
                    if (!el.dataset.rendered || el.dataset.rendered === 'false') {
                        el.innerHTML = this.renderCallback(canvasData);
                        el.dataset.rendered = 'true';

                        if (canvasData.is_promo) {
                            const promoUuid = canvasData.promo_uuid || canvasData.uuid || canvasData.id;
                            if (promoUuid) {
                                PromoService.trackImpression(promoUuid);
                            }
                        }
                    }
                } else {
                    // Element left viewport
                    // Keep height to prevent scroll jumps, then clear innerHTML
                    if (el.dataset.rendered === 'true') {
                        // Measure exact height before clearing so layout doesn't shift
                        const rect = el.getBoundingClientRect();
                        if (rect.height > 0) {
                            el.style.minHeight = `${rect.height}px`;
                        }
                        
                        el.innerHTML = ''; // Unmount DOM nodes to save memory
                        el.dataset.rendered = 'false';
                    }
                }
            });
        }, { rootMargin: this.rootMargin });
    }

    observe(element, canvasData) {
        if (!element || !canvasData) return;
        
        // Ensure the element has absolute basics for virtualization
        element.classList.add('virtual-card-container');
        element.dataset.rendered = 'false';
        
        this.virtualCards.set(element, canvasData);
        this.observer.observe(element);
    }

    unobserve(element) {
        if (!element) return;
        this.observer.unobserve(element);
        this.virtualCards.delete(element);
    }

    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.virtualCards.clear();
    }
}
