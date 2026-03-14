import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export default class SearchController {
    constructor() {
        console.log('🟡 [SearchController] Constructor iniciado.');
        this.currentFilter = 'all';
        this.lastData = null;
    }

    cacheDOM() {
        console.log('🟡 [SearchController] Ejecutando cacheDOM...');
        this.loadingState = document.getElementById('search-loading-state');
        this.emptyState = document.getElementById('search-empty-state');
        
        this.channelsSection = document.getElementById('search-channels-section');
        this.channelsGrid = document.getElementById('search-channels-grid');
        
        this.videosSection = document.getElementById('search-videos-section');
        this.videosGrid = document.getElementById('search-videos-grid');

        this.filterBtns = document.querySelectorAll('.component-search-filter-btn');
    }

    async init() {
        console.log('🟡 [SearchController] Ejecutando init()...');
        
        this.basePath = window.AppBasePath || '/ProjectRosaura';

        const urlParams = new URLSearchParams(window.location.search);
        this.query = urlParams.get('search_query') || '';
        console.log(`🟡 [SearchController] Query extraída de URL: "${this.query}"`);
        
        this.cacheDOM();
        this.bindEvents();

        if (!this.query) {
            console.warn('🟡 [SearchController] Consulta vacía. Mostrando estado vacío y abortando búsqueda.');
            this.showEmptyState();
            return;
        }

        document.title = `${this.query} - Búsqueda`;

        await this.fetchResults();
    }

    bindEvents() {
        if (!this.filterBtns) return;
        
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Quitar clase activa a todos
                this.filterBtns.forEach(b => b.classList.remove('component-search-filter-active'));
                
                // Agregar clase activa al presionado
                e.target.classList.add('component-search-filter-active');
                
                // Setear filtro y re-renderizar
                this.currentFilter = e.target.getAttribute('data-filter') || 'all';
                this.applyFilter();
            });
        });
    }

    async fetchResults() {
        console.group(`🚨 [DEEP LOG - SEARCH] Iniciando flujo de búsqueda exhaustivo para: "${this.query}"`);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            if (!ApiRoutes || !ApiRoutes.Search || !ApiRoutes.Search.Get) {
                console.error('❌ [Error Crítico] ApiRoutes.Search.Get NO está definido. Revisa ApiRoutes.js');
            }

            const apiUrl = `${this.basePath}/api/index.php?route=${ApiRoutes?.Search?.Get || 'search.get'}&q=${encodeURIComponent(this.query)}`;
            
            const fetchOptions = {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const response = await fetch(apiUrl, fetchOptions);
            const rawText = await response.text();

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}. Revisa la respuesta cruda en la consola.`);
            }
            
            let result;
            try {
                result = JSON.parse(rawText);
            } catch (jsonError) {
                throw new Error("Respuesta inválida del servidor (No es un JSON válido).");
            }

            if (result.success) {
                this.renderResults(result.data);
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('💥 [SearchController - fetchResults] Excepción capturada:', error);
            this.showEmptyState();
        } finally {
            console.log('🏁 [DEEP LOG - SEARCH] Finalizando ejecución de fetchResults.');
            console.groupEnd();
        }
    }

    renderResults(data) {
        if (this.loadingState) this.loadingState.style.display = 'none';
        
        // Guardamos los datos para poder filtrarlos en caliente (sin consultar de nuevo la API)
        this.lastData = data;
        this.applyFilter();
    }

    applyFilter() {
        if (!this.lastData) return;
        const data = this.lastData;

        const hasChannels = data.channels && data.channels.length > 0;
        const hasVideos = data.videos && data.videos.length > 0;

        // Ocultar todo inicialmente
        if (this.channelsSection) this.channelsSection.style.display = 'none';
        if (this.videosSection) this.videosSection.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'none';

        let showedAnything = false;

        // Lógica: Mostrar canales si filtro es 'all' o 'channels' y hay data
        if ((this.currentFilter === 'all' || this.currentFilter === 'channels') && hasChannels) {
            if (this.channelsSection) this.channelsSection.style.display = 'block';
            this.renderChannels(data.channels);
            showedAnything = true;
        }

        // Lógica: Mostrar videos si filtro es 'all' o 'videos' y hay data
        if ((this.currentFilter === 'all' || this.currentFilter === 'videos') && hasVideos) {
            if (this.videosSection) this.videosSection.style.display = 'block';
            this.renderVideos(data.videos);
            showedAnything = true;
        }

        // Si después de aplicar el filtro no hay nada visible (Ej: Filtro "canales" pero solo hay "videos")
        if (!showedAnything) {
            this.showEmptyState();
        }
    }

    renderChannels(channels) {
        if (!this.channelsGrid) return;
        this.channelsGrid.innerHTML = '';
        
        channels.forEach(channel => {
            const channelCard = document.createElement('div');
            channelCard.classList.add('component-search-channel-card');
            
            const buildUrl = (path, defaultUrl) => {
                if (!path) return defaultUrl;
                if (path.startsWith('http')) return path;
                const clean = path.replace(/^\/?public\//, '');
                return `${this.basePath}/public/${clean}`;
            };

            const avatarSrc = buildUrl(channel.avatar_path, `${this.basePath}/public/storage/profilePictures/default/default.png`);

            channelCard.innerHTML = `
                <div class="component-search-channel-avatar">
                    <img src="${avatarSrc}" alt="${channel.username}" onerror="this.onerror=null; this.src='${this.basePath}/public/storage/profilePictures/default/default.png'">
                </div>
                <div class="component-search-channel-info">
                    <h4 class="component-search-channel-name">${channel.username}</h4>
                    <span class="component-search-channel-handle">@${channel.handle}</span>
                </div>
                <button class="component-search-channel-btn">Ver canal</button>
            `;

            channelCard.addEventListener('click', () => {
                if (window.SpaRouter) window.SpaRouter.navigate(`/@${channel.handle}`);
            });

            this.channelsGrid.appendChild(channelCard);
        });
    }

    renderVideos(videos) {
        if (!this.videosGrid) return;
        
        this.videosGrid.className = 'component-video-grid';
        this.videosGrid.innerHTML = '';
        
        videos.forEach(video => {
            const title = video.title || 'Video sin título';
            const views = video.views || 0;
            const uuid = video.uuid || video.id_video;
            
            const createdDate = video.created_at ? new Date(video.created_at) : new Date();
            const timeAgo = this.timeSince(createdDate);
            const formattedDuration = this.formatDuration(video.duration || 0);
            const dominantColor = video.thumbnail_dominant_color && video.thumbnail_dominant_color !== 'transparent' ? video.thumbnail_dominant_color : '#333';
            
            const fallbackThumb = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23111'/%3E%3Ctext x='50%25' y='50%25' fill='%23777' font-family='sans-serif' font-size='14' text-anchor='middle' dy='.3em'%3ESin miniatura%3C/text%3E%3C/svg%3E";
            
            const buildUrl = (path, fallback) => {
                if (!path) return fallback;
                if (path.startsWith('http')) return path;
                const clean = path.replace(/^\/?public\//, '');
                return `${this.basePath}/public/${clean}`;
            };

            const thumbPath = buildUrl(video.thumbnail_path, fallbackThumb);
            const avatarSrc = buildUrl(video.avatar_path, `${this.basePath}/public/storage/profilePictures/default/default.png`);
            
            const videoSrc = buildUrl(video.hls_path, '');
            const navUrl = `${this.basePath}/watch/${uuid}`;

            const cardHTML = `
                <div class="component-video-card" style="--local-dominant-color: ${dominantColor}; cursor: pointer;" data-nav="${navUrl}">
                    <div class="component-video-card__top">
                        <img src="${thumbPath}" alt="Miniatura de ${title}" class="component-video-card__thumbnail" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}'">
                        
                        <video 
                            data-src="${videoSrc}" 
                            data-uuid="${uuid}"
                            class="component-video-card__player" 
                            muted 
                            loop 
                            playsinline>
                        </video>

                        <span class="component-video-card__duration">${formattedDuration}</span>
                    </div>

                    <div class="component-video-card__bottom">
                        <div class="component-video-card__avatar">
                            <img src="${avatarSrc}" alt="Perfil de ${video.username || 'Usuario'}" loading="lazy" onerror="this.onerror=null; this.src='${this.basePath}/public/storage/profilePictures/default/default.png'">
                        </div>
                        <div class="component-video-card__info">
                            <h3 class="component-video-card__title" title="${title}">${title}</h3>
                            <p class="component-video-card__user">${video.username || 'Usuario Desconocido'}</p>
                            <p class="component-video-card__meta">${views} vistas • ${timeAgo}</p>
                        </div>
                    </div>
                </div>
            `;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardHTML.trim();
            const cardElement = tempDiv.firstChild;

            cardElement.addEventListener('click', () => {
                if (window.SpaRouter) window.SpaRouter.navigate(`/watch/${uuid}`);
            });

            cardElement.addEventListener('mouseenter', () => {
                const domColor = cardElement.style.getPropertyValue('--local-dominant-color');
                if (domColor && domColor.trim() !== '') {
                    document.documentElement.style.setProperty('--global-dominant-color', domColor);
                }
            });

            this.videosGrid.appendChild(cardElement);
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

    showEmptyState() {
        if (this.loadingState) this.loadingState.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'flex';
    }
}