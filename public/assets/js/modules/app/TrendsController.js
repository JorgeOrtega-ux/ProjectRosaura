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
        const thumbnailUrl = video.thumbnail;
        
        // Extraemos el color dominante
        const dominantColor = video.thumbnail_dominant_color && video.thumbnail_dominant_color !== 'transparent' ? video.thumbnail_dominant_color : '#333333';
        
        // Limpiamos estilos viejos y aplicamos la variable del color
        this.heroContainer.style.backgroundImage = 'none';
        this.heroContainer.style.setProperty('--local-dominant-color', dominantColor);
        this.heroContainer.classList.remove('skeleton-loading');
        
        // Agregamos la imagen como un tag <img> independiente para poder hacerle el efecto zoom
        this.heroContainer.innerHTML = `
            <img src="${thumbnailUrl}" alt="${this.escapeHTML(video.title)}" class="trends-hero-bg-img">
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

        // Evento hover para el resplandor de fondo global (igual que cards de video)
        this.heroContainer.onmouseenter = () => {
            const domColor = this.heroContainer.style.getPropertyValue('--local-dominant-color');
            if (domColor && domColor.trim() !== '') {
                document.documentElement.style.setProperty('--global-dominant-color', domColor);
            }
        };
    }

    renderRisingVideos(videos) {
        if (!this.risingContainer) return;
        this.risingContainer.innerHTML = '';
        
        if (!videos || videos.length === 0) {
            this.risingContainer.innerHTML = `
                <div class="component-empty-state" style="border: none;">
                    <span class="material-symbols-rounded component-empty-state-icon">trending_down</span>
                    <p class="component-empty-state-text">No hay videos en tendencia en este momento.</p>
                </div>`;
            return;
        }

        let html = '';
        videos.forEach(video => {
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

        const fallbackBannerSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%232a2a2a'/%3E%3C/svg%3E";
        const defaultAvatar = `${basePath}/public/storage/profilePictures/default/default.png`;
        const defaultBanner = `${basePath}/public/assets/img/default-banner.jpg`;

        const getImageUrl = (path, type, fallback) => {
            if (!path) return fallback;
            if (path.startsWith('http')) return path;
            
            if (!path.includes('/')) {
                if (type === 'banner') return `${basePath}/public/storage/banners/${path}`;
                if (type === 'avatar') return `${basePath}/public/storage/profilePictures/uploaded/${path}`;
            }
            
            const clean = path.replace(/^\/?public\//, '');
            return `${basePath}/public/${clean}`;
        };

        creators.forEach(creator => {
            const username = creator.username || 'Usuario';
            const handle = creator.handle || username.toLowerCase().replace(/\s+/g, '');
            
            const rawAvatar = creator.avatar_path || creator.avatar_url || creator.avatar;
            const rawBanner = creator.banner_path || creator.banner_url || creator.banner;

            const avatarUrl = getImageUrl(rawAvatar, 'avatar', defaultAvatar);
            const bannerUrl = getImageUrl(rawBanner, 'banner', defaultBanner);
            
            const html = `
                <div class="component-channel-card-modern" style="--local-dominant-color: #333333;" onclick="if(window.spaRouter) window.spaRouter.navigate('${basePath}/@${handle}'); else window.location.href='${basePath}/@${handle}';">
                    <div class="channel-card-banner">
                        <img src="${bannerUrl}" alt="Banner de ${username}" onerror="this.onerror=null; this.src='${fallbackBannerSVG}'">
                    </div>
                    <div class="channel-card-avatar">
                        <img src="${avatarUrl}" alt="${username}" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                    </div>
                    <div class="channel-card-info">
                        <h4 class="channel-card-name" title="${username}">${this.escapeHTML(username)}</h4>
                        <p class="channel-card-handle">@${this.escapeHTML(handle)}</p>
                    </div>
                    <div class="channel-card-actions">
                        <span class="component-badge stat-badge">🔥 En tendencia</span>
                        <button class="component-badge btn-channel-subscribe">Visitar canal</button>
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
    // UTILERÍAS
    // ==========================================

    createCardHTML(video) {
        const title = video.title || 'Video sin título';
        const views = video.views || 0;
        const timeAgo = this.timeSince(new Date(video.created_at));
        const formattedDuration = this.formatDuration(video.duration);
        const dominantColor = video.thumbnail_dominant_color !== 'transparent' ? video.thumbnail_dominant_color : '#333'; 
        const videoSrc = video.video_url || ''; 

        const isVertical = video.orientation === 'vertical';
        const basePath = window.AppBasePath || '';
        const navUrl = isVertical ? `${basePath}/shorts/${video.uuid}` : `${basePath}/watch/${video.uuid}`; 

        return `
            <div class="component-video-card" style="--local-dominant-color: ${dominantColor}; cursor: pointer;" data-nav="${navUrl}">
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
            
            card.addEventListener('click', (e) => {
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