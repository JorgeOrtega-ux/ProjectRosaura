// public/assets/js/modules/app/HomeController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class HomeController {
    constructor() {
        this.api = new ApiService();
        
        this.handleResizeBound = this.updateCarouselButtons.bind(this);
        this.handleScrollBound = this.updateCarouselButtons.bind(this);
        this.handleLeftClickBound = this.scrollLeft.bind(this);
        this.handleRightClickBound = this.scrollRight.bind(this);
    }

    destroy() {
        window.removeEventListener('resize', this.handleResizeBound);
        if (this.verticalContainer) this.verticalContainer.removeEventListener('scroll', this.handleScrollBound);
        if (this.btnLeft) this.btnLeft.removeEventListener('click', this.handleLeftClickBound);
        if (this.btnRight) this.btnRight.removeEventListener('click', this.handleRightClickBound);
    }

    async init() {
        this.horizontalContainer = document.getElementById('video-feed-container');
        this.verticalContainer = document.getElementById('vertical-feed-container');
        this.playlistContainer = document.getElementById('playlist-feed-container');
        this.btnLeft = document.getElementById('btn-scroll-left');
        this.btnRight = document.getElementById('btn-scroll-right');

        if (this.horizontalContainer || this.verticalContainer || this.playlistContainer) {
            console.log("🚀 [HomeController] Iniciando carga de Feed...");
            await this.loadFeed();
        }
    }

    async loadFeed() {
        try {
            const response = await this.api.post(ApiRoutes.App.GetFeed, { limit: 20, offset: 0 });
            
            console.log("🔍 [HomeController] Respuesta completa del servidor recibida:", response);

            if (response && response.success) {
                // 🛠️ LOG DE DIAGNÓSTICO PROFUNDO PARA MULTI-IDIOMA
                if (response.data.horizontal && response.data.horizontal.length > 0) {
                    console.log("📺 [HomeController] Analizando títulos de videos horizontales:");
                    response.data.horizontal.forEach((v, index) => {
                        console.log(`  👉 Video ${index + 1}:`, {
                            titulo_final: v.title,
                            titulo_original: v.original_title || 'No modificado',
                            traducciones_db: v.localized_titles
                        });
                    });
                } else {
                    console.warn("⚠️ [HomeController] No llegaron videos horizontales.");
                }

                this.renderFeed(response.data.vertical, this.verticalContainer, 'vertical');
                this.renderFeed(response.data.horizontal, this.horizontalContainer, 'horizontal');
                this.renderPlaylistFeed(response.data.playlists, this.playlistContainer);
                
                if (this.verticalContainer && response.data.vertical && response.data.vertical.length > 0) {
                    this.initCarousel();
                }
            } else {
                console.error("❌ [HomeController] La API indicó éxito=false", response);
                this.showError('No se pudieron cargar los videos en este momento.');
            }
        } catch (error) {
            console.error('❌ [HomeController] Error crítico cargando el feed:', error);
            this.showError('Ocurrió un error de red al intentar cargar el contenido.');
        }
    }

    renderFeed(videos, container, orientation) {
        if (!container) return;

        if (!videos || videos.length === 0) {
            if (orientation === 'vertical') {
                const sectionWrapper = container.closest('.component-feed-section');
                if (sectionWrapper) sectionWrapper.style.display = 'none';
                else container.style.display = 'none';
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

    renderPlaylistFeed(playlists, container) {
        if (!container) return;

        if (!playlists || playlists.length === 0) {
            const sectionWrapper = container.closest('.component-feed-section');
            if (sectionWrapper) sectionWrapper.style.display = 'none';
            else container.style.display = 'none';
            return;
        }

        let html = '';
        playlists.forEach(playlist => {
            html += this.createPlaylistCardHTML(playlist);
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

        if (scrollLeft <= 0) this.btnLeft.classList.add('disabled');
        else this.btnLeft.classList.remove('disabled');

        if (Math.ceil(scrollLeft) >= maxScrollLeft - 1) this.btnRight.classList.add('disabled');
        else this.btnRight.classList.remove('disabled');
    }

    createCardHTML(video, orientation) {
        // AQUÍ ES DONDE SE INYECTA EL TÍTULO QUE PHP PROCESÓ
        const title = video.title || 'Video sin título';
        const views = video.views || 0;
        const timeAgo = this.timeSince(new Date(video.created_at));
        const formattedDuration = this.formatDuration(video.duration);
        const dominantColor = video.thumbnail_dominant_color !== 'transparent' ? video.thumbnail_dominant_color : '#333'; 
        const videoSrc = video.video_url || ''; 

        // DETECCIÓN DE CALIDAD 4K: Evaluamos múltiples posibles nombres de campos de la API de forma flexible
        const is4K = video.is_4k === true || video.is_4k === 1 || 
                     (video.quality && video.quality.toString().toLowerCase() === '4k') || 
                     (video.resolution && parseInt(video.resolution) >= 2160);

        const isVertical = orientation === 'vertical';
        const cardModifierClass = isVertical ? 'component-video-card--vertical' : '';
        
        const basePath = window.AppBasePath || '';
        const navUrl = isVertical ? `${basePath}/shorts/${video.uuid}` : `${basePath}/watch/${video.uuid}`; 

        return `
            <div class="component-video-card ${cardModifierClass}" style="--local-dominant-color: ${dominantColor}; cursor: pointer;" data-nav="${navUrl}">
                
                <div class="component-video-card__top">
                    ${is4K ? '<span class="component-video-card__badge-4k">4K</span>' : ''}
                    <img src="${video.thumbnail_url}" alt="Miniatura de ${title}" class="component-video-card__thumbnail" loading="lazy">
                    
                    <video 
                        data-src="${videoSrc}" 
                        data-uuid="${video.uuid}"
                        class="component-video-card__player" 
                        muted 
                        loop 
                        playsinline>
                    </video>

                    <span class="component-video-card__duration">${formattedDuration}</span>
                </div>

                <div class="component-video-card__bottom">
                    ${!isVertical ? `
                    <div class="component-video-card__avatar">
                        <img src="${video.avatar_url}" alt="Perfil de ${video.username}" loading="lazy">
                    </div>
                    ` : ''}
                    <div class="component-video-card__info">
                        <h3 class="component-video-card__title" title="${title}">${title}</h3>
                        ${!isVertical ? `<p class="component-video-card__user">${video.username}</p>` : ''}
                        <p class="component-video-card__meta">${views} vistas${!isVertical ? ` • ${timeAgo}` : ''}</p>
                    </div>
                </div>
            </div>
        `;
    }

    createPlaylistCardHTML(playlist) {
        const title = playlist.title || 'Lista sin título';
        const videoCount = playlist.video_count || 0;
        const timeAgo = this.timeSince(new Date(playlist.created_at));
        const dominantColor = playlist.thumbnail_dominant_color !== 'transparent' ? playlist.thumbnail_dominant_color : '#333'; 
        
        const basePath = window.AppBasePath || '';
        const navUrl = `${basePath}/playlist/${playlist.uuid}`;

        // SE AGREGÓ LA CLASE playlist-folder-style A ESTE CONTENEDOR
        return `
            <div class="component-video-card playlist-folder-style" style="--local-dominant-color: ${dominantColor}; cursor: pointer;" data-nav="${navUrl}">
                <div class="component-video-card__top">
                    <img src="${playlist.thumbnail_url}" alt="Miniatura de ${title}" class="component-video-card__thumbnail" loading="lazy">
                    <span class="component-video-card__duration" style="display: flex; align-items: center; gap: 4px; padding: 4px 8px;">
                        <span class="material-symbols-rounded" style="font-size: 14px;">playlist_play</span>
                        ${videoCount} videos
                    </span>
                </div>
                <div class="component-video-card__bottom">
                    <div class="component-video-card__avatar">
                        <img src="${playlist.avatar_url}" alt="Perfil de ${playlist.username}" loading="lazy">
                    </div>
                    <div class="component-video-card__info">
                        <h3 class="component-video-card__title" title="${title}">${title}</h3>
                        <p class="component-video-card__user">${playlist.username}</p>
                        <p class="component-video-card__meta">Actualizada hace ${timeAgo}</p>
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

        if (h > 0) return `${h}:${mStr}:${sStr}`;
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
        return "instantes";
    }
}