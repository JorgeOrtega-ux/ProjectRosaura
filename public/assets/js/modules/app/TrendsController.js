// public/assets/js/modules/app/TrendsController.js

import { ApiService } from '../../core/api/ApiServices.js';

export class TrendsController {
    constructor() {
        this.api = new ApiService();
    }

    async init() {
        this.initElements();

        if (!this.heroContainer || !this.risingContainer) {
            console.warn('[TrendsController] Contenedores no encontrados en el DOM.');
            return;
        }

        try {
            // Mostrar spinners mientras carga
            const spinnerHTML = '<div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>';
            this.risingContainer.innerHTML = spinnerHTML;
            this.creatorsContainer.innerHTML = spinnerHTML;
            this.tagsContainer.innerHTML = spinnerHTML;

            // Cargar datos del servidor
            await this.loadDashboardData();

        } catch (error) {
            console.error('[TrendsController] Error inicializando:', error);
            if (this.risingContainer) {
                this.risingContainer.innerHTML = '<p class="component-text-notice component-text-notice--error">Error al cargar las tendencias.</p>';
            }
        }
    }

    initElements() {
        this.heroContainer = document.getElementById('trends-hero-container');
        this.risingContainer = document.getElementById('trends-rising-container');
        this.creatorsContainer = document.getElementById('trends-creators-container');
        this.tagsContainer = document.getElementById('trends-tags-container');
    }

    async loadDashboardData() {
        const response = await this.api.getDashboardTrends();
        
        if (response && response.success && response.data) {
            this.renderHero(response.data.hero);
            this.renderRisingVideos(response.data.rising);
            this.renderCreators(response.data.creators);
            this.renderTags(response.data.tags);
        } else {
            console.error('[TrendsController] Error al obtener datos:', response?.message || 'Error desconocido');
            this.risingContainer.innerHTML = '<p class="component-text-notice">No se pudieron cargar las tendencias.</p>';
        }
    }

  renderHero(video) {
        if (!video || !this.heroContainer) return;
        
        const basePath = window.AppBasePath || '';
        
        // CORRECCIÓN AQUÍ: Tomamos la URL directo como viene del backend
        const thumbnailUrl = video.thumbnail;
        
        this.heroContainer.style.backgroundImage = `url('${thumbnailUrl}')`;
        this.heroContainer.classList.remove('skeleton-loading');
        
        this.heroContainer.innerHTML = `
            <div class="trends-hero-overlay">
                <span class="trends-hero-badge">#1 EN TENDENCIAS</span>
                <h1 class="trends-hero-title">${this.escapeHTML(video.title)}</h1>
                <p class="trends-hero-meta">${this.escapeHTML(video.channel_name)} • ${video.views_count} vistas</p>
            </div>
        `;
        
        this.heroContainer.onclick = () => {
            if (window.spaRouter) window.spaRouter.navigate(`${basePath}/watch/${video.uuid}`);
            else window.location.href = `${basePath}/watch/${video.uuid}`;
        };
    }

    renderRisingVideos(videos) {
        if (!this.risingContainer) return;
        this.risingContainer.innerHTML = '';
        
        if (!videos || videos.length === 0) {
            this.risingContainer.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">trending_down</span>
                    <p class="component-empty-state-text">No hay videos en tendencia en este momento.</p>
                </div>`;
            return;
        }

        let html = '';
        videos.forEach(video => {
            // Usamos la función interna para crear la tarjeta
            html += this.createCardHTML(video);
        });
        
        this.risingContainer.innerHTML = html;
        this.attachHoverEvents(this.risingContainer);
    }

    renderCreators(creators) {
        if (!this.creatorsContainer) return;
        this.creatorsContainer.innerHTML = '';
        
        if (!creators || creators.length === 0) {
            this.creatorsContainer.innerHTML = '<p class="component-text-notice">No hay creadores destacados.</p>';
            return;
        }

        const basePath = window.AppBasePath || '';

        creators.forEach(creator => {
            const avatarUrl = creator.avatar ? `${basePath}/storage/profilePictures/${creator.avatar}` : `${basePath}/storage/profilePictures/default/default.png`;
            
            const html = `
                <div class="trends-creator-card" onclick="if(window.spaRouter) window.spaRouter.navigate('${basePath}/@${creator.username}'); else window.location.href='${basePath}/@${creator.username}';">
                    <img src="${avatarUrl}" class="trends-creator-avatar" alt="${creator.username}">
                    <div class="trends-creator-info">
                        <span class="trends-creator-name">${this.escapeHTML(creator.username)}</span>
                        <span class="trends-creator-stat">🔥 Subiendo de rango</span>
                    </div>
                </div>
            `;
            this.creatorsContainer.insertAdjacentHTML('beforeend', html);
        });
    }

    renderTags(tags) {
        if (!this.tagsContainer) return;
        this.tagsContainer.innerHTML = '';
        
        if (!tags || tags.length === 0) {
            this.tagsContainer.innerHTML = '<p class="component-text-notice">No hay etiquetas populares.</p>';
            return;
        }

        const basePath = window.AppBasePath || '';

        tags.forEach(tag => {
            const html = `<span class="trends-tag" onclick="if(window.spaRouter) window.spaRouter.navigate('${basePath}/results?search_query=%23${encodeURIComponent(tag.name)}'); else window.location.href='${basePath}/results?search_query=%23${encodeURIComponent(tag.name)}';">#${this.escapeHTML(tag.name)}</span>`;
            this.tagsContainer.insertAdjacentHTML('beforeend', html);
        });
    }

    // ==========================================
    // UTILERÍAS (Copiadas de HomeController para dibujar tarjetas)
    // ==========================================

    createCardHTML(video) {
        const title = video.title || 'Video sin título';
        const views = video.views || 0;
        const timeAgo = this.timeSince(new Date(video.created_at));
        const formattedDuration = this.formatDuration(video.duration);
        const dominantColor = video.thumbnail_dominant_color !== 'transparent' ? video.thumbnail_dominant_color : '#333'; 
        const videoSrc = video.video_url || ''; 

        // En Trends (Carrusel Rising), por ahora asumimos que todos son horizontales (o se adaptan a la tarjeta)
        const isVertical = video.orientation === 'vertical';
        const basePath = window.AppBasePath || '';
        const navUrl = isVertical ? `${basePath}/shorts/${video.uuid}` : `${basePath}/watch/${video.uuid}`; 

        return `
            <div class="component-video-card" style="--local-dominant-color: ${dominantColor}; cursor: pointer; min-width: 280px;" data-nav="${navUrl}">
                <div class="component-video-card__top">
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
                    <div class="component-video-card__avatar">
                        <img src="${video.avatar_url}" alt="Perfil de ${video.username}" loading="lazy">
                    </div>
                    <div class="component-video-card__info">
                        <h3 class="component-video-card__title" title="${title}">${title}</h3>
                        <p class="component-video-card__user">${video.username}</p>
                        <p class="component-video-card__meta">${views} vistas • ${timeAgo}</p>
                    </div>
                </div>
            </div>
        `;
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

    attachHoverEvents(container) {
        const cards = container.querySelectorAll('.component-video-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                const dominantColor = card.style.getPropertyValue('--local-dominant-color');
                if (dominantColor && dominantColor.trim() !== '') {
                    document.documentElement.style.setProperty('--global-dominant-color', dominantColor);
                }
            });
            
            // Adjuntamos evento de click global porque no estamos en HomeController
            card.addEventListener('click', (e) => {
                // Evitamos activar la navegación si se hace click en el menú de opciones del video
                if (e.target.closest('.component-video-card__menu')) return;
                const navUrl = card.getAttribute('data-nav');
                if (navUrl) {
                    if (window.spaRouter) window.spaRouter.navigate(navUrl);
                    else window.location.href = navUrl;
                }
            });
        });
    }

    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
}