// public/assets/js/modules/app/HomeController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class HomeController {
    constructor() {
        this.api = new ApiService();
        
        // Bindear eventos globales para poder removerlos luego
        this.handleResizeBound = this.updateCarouselButtons.bind(this);
        this.handleScrollBound = this.updateCarouselButtons.bind(this);
        this.handleLeftClickBound = this.scrollLeft.bind(this);
        this.handleRightClickBound = this.scrollRight.bind(this);
    }

    // Método destroy para prevenir cálculos infinitos al cambiar de vista
    destroy() {
        window.removeEventListener('resize', this.handleResizeBound);
        
        if (this.verticalContainer) {
            this.verticalContainer.removeEventListener('scroll', this.handleScrollBound);
        }
        if (this.btnLeft) {
            this.btnLeft.removeEventListener('click', this.handleLeftClickBound);
        }
        if (this.btnRight) {
            this.btnRight.removeEventListener('click', this.handleRightClickBound);
        }
    }

    async init() {
        this.horizontalContainer = document.getElementById('video-feed-container');
        this.verticalContainer = document.getElementById('vertical-feed-container');
        this.btnLeft = document.getElementById('btn-scroll-left');
        this.btnRight = document.getElementById('btn-scroll-right');

        if (this.horizontalContainer || this.verticalContainer) {
            await this.loadFeed();
        }
    }

    async loadFeed() {
        try {
            const response = await this.api.post(ApiRoutes.App.GetFeed, { limit: 20, offset: 0 });
            
            if (response && response.success) {
                this.renderFeed(response.data.vertical, this.verticalContainer, 'vertical');
                this.renderFeed(response.data.horizontal, this.horizontalContainer, 'horizontal');
                
                if (this.verticalContainer && response.data.vertical && response.data.vertical.length > 0) {
                    this.initCarousel();
                }
            } else {
                this.showError('No se pudieron cargar los videos en este momento.');
            }
        } catch (error) {
            console.error('Error cargando el feed:', error);
            this.showError('Ocurrió un error de red al intentar cargar el contenido.');
        }
    }

    renderFeed(videos, container, orientation) {
        if (!container) return;

        if (!videos || videos.length === 0) {
            if (orientation === 'vertical') {
                const sectionWrapper = container.closest('.feed-section-wrapper');
                if (sectionWrapper) {
                    sectionWrapper.style.display = 'none';
                } else {
                    container.style.display = 'none';
                }
            } else {
                container.innerHTML = `
                    <div class="component-empty-state">
                        <span class="material-symbols-rounded component-empty-state-icon">videocam_off</span>
                        <p class="component-empty-state-text">No hay videos publicados aún. ¡Sé el primero en subir uno!</p>
                    </div>
                `;
            }
            return;
        }

        let html = '';
        videos.forEach(video => {
            html += this.createCardHTML(video, orientation);
        });

        container.innerHTML = html;
        this.attachHoverEvents(container);
    }

    initCarousel() {
        if (!this.verticalContainer || !this.btnLeft || !this.btnRight) return;

        this.verticalContainer.addEventListener('scroll', this.handleScrollBound);
        window.addEventListener('resize', this.handleResizeBound);
        this.btnLeft.addEventListener('click', this.handleLeftClickBound);
        this.btnRight.addEventListener('click', this.handleRightClickBound);

        setTimeout(() => this.updateCarouselButtons(), 150);
    }
    
    scrollLeft() {
        const scrollAmount = this.getScrollAmount();
        this.verticalContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
    
    scrollRight() {
        const scrollAmount = this.getScrollAmount();
        this.verticalContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    getScrollAmount() {
        const visibleWidth = this.verticalContainer.clientWidth;
        const padding = 16; 
        return visibleWidth - padding; 
    }

    updateCarouselButtons() {
        if (!this.verticalContainer || !this.btnLeft || !this.btnRight) return;
        
        const scrollLeft = this.verticalContainer.scrollLeft;
        const maxScrollLeft = this.verticalContainer.scrollWidth - this.verticalContainer.clientWidth;

        if (scrollLeft <= 0) {
            this.btnLeft.classList.add('disabled');
        } else {
            this.btnLeft.classList.remove('disabled');
        }

        if (Math.ceil(scrollLeft) >= maxScrollLeft - 1) {
            this.btnRight.classList.add('disabled');
        } else {
            this.btnRight.classList.remove('disabled');
        }
    }

    createCardHTML(video, orientation) {
        const title = video.title || 'Video sin título';
        const views = video.views || 0;
        const timeAgo = this.timeSince(new Date(video.created_at));
        const formattedDuration = this.formatDuration(video.duration);
        const dominantColor = video.thumbnail_dominant_color !== 'transparent' ? video.thumbnail_dominant_color : '#333'; 
        const videoSrc = video.video_url || ''; 

        const isVertical = orientation === 'vertical';
        const cardModifierClass = isVertical ? 'video-card--vertical' : '';
        const aspectStyle = isVertical ? '' : 'aspect-ratio: 16/9;';

        return `
            <div class="video-card component-video-card ${cardModifierClass}" style="--local-dominant-color: ${dominantColor};" onclick="window.location.href='${window.AppBasePath || ''}/watch/${video.uuid}'">
                
                <div class="video-card__top" style="${aspectStyle} position: relative; overflow: hidden;">
                    
                    <img src="${video.thumbnail_url}" alt="Miniatura de ${title}" class="component-video-card__thumbnail video-card__thumbnail" loading="lazy">
                    
                    <video 
                        data-src="${videoSrc}" 
                        class="component-video-card__player" 
                        muted 
                        loop 
                        playsinline>
                    </video>

                    <div class="component-video-card__duration-badge">
                        <span class="component-video-card__duration">${formattedDuration}</span>
                    </div>
                </div>

                <div class="video-card__bottom">
                    ${!isVertical ? `
                    <div class="video-card__avatar">
                        <img src="${video.avatar_url}" alt="Perfil de ${video.username}" loading="lazy">
                    </div>
                    ` : ''}
                    <div class="video-card__info">
                        <h3 class="video-card__title" title="${title}">${title}</h3>
                        <p class="video-card__user">${video.username}</p>
                        <p class="video-card__meta">${views} vistas • ${timeAgo}</p>
                    </div>
                </div>
            </div>
        `;
    }

    attachHoverEvents(container) {
        const cards = container.querySelectorAll('.component-video-card');
        
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                const dominantColor = card.style.getPropertyValue('--local-dominant-color');
                if (dominantColor && dominantColor.trim() !== '') {
                    document.documentElement.style.setProperty('--global-dominant-color', dominantColor);
                }
            });
        });
    }

    formatDuration(seconds) {
        const totalSeconds = parseInt(seconds, 10);
        if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        if (h > 0) {
            return `${h}:${mStr}:${sStr}`;
        }
        return `${mStr}:${sStr}`;
    }

    showError(msg) {
        if (this.horizontalContainer) {
            this.horizontalContainer.innerHTML = `<p class="component-text-notice component-text-notice--error">${msg}</p>`;
        }
    }

    timeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " años";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " meses";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " días";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " horas";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutos";
        return "Hace unos instantes";
    }
}