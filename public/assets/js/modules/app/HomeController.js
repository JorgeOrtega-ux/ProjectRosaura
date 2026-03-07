// public/assets/js/modules/app/HomeController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class HomeController {
    constructor() {
        this.api = new ApiService();
        this.horizontalContainer = document.getElementById('video-feed-container');
        this.verticalContainer = document.getElementById('vertical-feed-container');
        
        // Elementos del carrusel de Shorts
        this.btnLeft = document.getElementById('btn-scroll-left');
        this.btnRight = document.getElementById('btn-scroll-right');
    }

    async init() {
        if (this.horizontalContainer || this.verticalContainer) {
            await this.loadFeed();
        }
    }

    async loadFeed() {
        try {
            const response = await this.api.post(ApiRoutes.App.GetFeed, { limit: 20, offset: 0 });
            
            if (response && response.success) {
                // Renderizamos ambos feeds pasándole su contenedor y orientación
                this.renderFeed(response.data.vertical, this.verticalContainer, 'vertical');
                this.renderFeed(response.data.horizontal, this.horizontalContainer, 'horizontal');
                
                // Inicializamos la lógica del carrusel solo si hay contenido vertical
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
                // Buscamos el contenedor padre completo para ocultar toda la sección y que no queden bordes vacíos
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

        // Actualizar estado de los botones si el usuario hace scroll manual (touchpad o teléfono)
        this.verticalContainer.addEventListener('scroll', () => this.updateCarouselButtons());
        
        // Actualizar si cambia el tamaño de la ventana
        window.addEventListener('resize', () => this.updateCarouselButtons());

        // Evento para desplazar a la izquierda
        this.btnLeft.addEventListener('click', () => {
            const scrollAmount = this.getScrollAmount();
            this.verticalContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });

        // Evento para desplazar a la derecha
        this.btnRight.addEventListener('click', () => {
            const scrollAmount = this.getScrollAmount();
            this.verticalContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });

        // Verificamos el estado inicial de las flechas
        // (Pequeño timeout para permitir que el DOM calcule los anchos tras pintar el HTML)
        setTimeout(() => this.updateCarouselButtons(), 150);
    }

    getScrollAmount() {
        // Obtenemos el ancho total visible del contenedor
        const visibleWidth = this.verticalContainer.clientWidth;
        
        // El desplazamiento matemáticamente perfecto es el ancho visible menos un padding (16px).
        // Esto equivale exactamente al ancho del grupo de videos para que no se desfase.
        const padding = 16; 
        
        return visibleWidth - padding; 
    }

    updateCarouselButtons() {
        const scrollLeft = this.verticalContainer.scrollLeft;
        // Calculamos el máximo scroll posible (ancho total menos ancho visible)
        const maxScrollLeft = this.verticalContainer.scrollWidth - this.verticalContainer.clientWidth;

        // Si estamos al inicio, ocultamos el botón izquierdo
        if (scrollLeft <= 0) {
            this.btnLeft.classList.add('disabled');
        } else {
            this.btnLeft.classList.remove('disabled');
        }

        // Si llegamos al final (con un pixel de margen por redondeo de navegadores), ocultamos el derecho
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

        // Evaluamos si es vertical para inyectar clases y estilos específicos
        const isVertical = orientation === 'vertical';
        const cardModifierClass = isVertical ? 'video-card--vertical' : '';
        // Para los verticales, la altura y ancho se controlan estrictamente en CSS, no inyectamos aspect-ratio
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