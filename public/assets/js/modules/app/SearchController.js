import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export default class SearchController {
    constructor() {
        console.log('🟡 [SearchController] Constructor iniciado.');
        this.currentFilter = 'all';
        this.currentSort = 'relevant';
        this.lastData = null;
    }

    cacheDOM() {
        this.loadingState = document.getElementById('search-loading-state');
        this.emptyState = document.getElementById('search-empty-state');
        
        this.channelsSection = document.getElementById('search-channels-section');
        this.channelsGrid = document.getElementById('search-channels-grid');
        
        this.videosSection = document.getElementById('search-videos-section');
        this.videosGrid = document.getElementById('search-videos-grid');

        this.filterBtns = document.querySelectorAll('.component-search-filter-btn');
        
        // Elementos del Dropdown de Filtros
        this.toggleFiltersBtn = document.getElementById('search-toggle-filters');
        this.filtersModule = document.getElementById('moduleSearchFilters');
        this.sortInputs = document.querySelectorAll('input[name="sortSearch"]');
        this.openSubMenuBtns = document.querySelectorAll('[data-action="openFilterSubMenu"]');
        this.backToMainBtns = document.querySelectorAll('[data-action="backToMainFilters"]');
    }

    async init() {
        this.basePath = window.AppBasePath || '/ProjectRosaura';

        const urlParams = new URLSearchParams(window.location.search);
        this.query = urlParams.get('search_query') || '';
        
        this.cacheDOM();
        this.bindEvents();

        if (!this.query) {
            this.showEmptyState();
            return;
        }

        document.title = `${this.query} - Búsqueda`;

        await this.fetchResults();
    }

    bindEvents() {
        if (this.filterBtns) {
            this.filterBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (e.target.closest('#search-toggle-filters') || e.target.closest('#moduleSearchFilters')) return;

                    this.filterBtns.forEach(b => {
                        if (b.id !== 'search-toggle-filters') {
                            b.classList.remove('component-search-filter-active');
                        }
                    });
                    
                    e.target.classList.add('component-search-filter-active');
                    
                    this.currentFilter = e.target.getAttribute('data-filter') || 'all';
                    this.applyFilter();
                });
            });
        }

        // Lógica para abrir/cerrar el Dropdown principal
        if (this.toggleFiltersBtn && this.filtersModule) {
            this.toggleFiltersBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = this.filtersModule.style.display === 'block';
                this.filtersModule.style.display = isVisible ? 'none' : 'block';

                if (!isVisible) {
                    // Resetear vista al menú principal al abrir
                    this.showMenuSection('menuMainFilters');
                }
            });

            // Cerrar el dropdown al hacer click fuera
            document.addEventListener('click', (e) => {
                if (this.filtersModule.style.display === 'block') {
                    if (!this.filtersModule.contains(e.target) && !this.toggleFiltersBtn.contains(e.target)) {
                        this.filtersModule.style.display = 'none';
                    }
                }
            });
        }

        // Navegación dentro del Dropdown (Submenús)
        if (this.openSubMenuBtns) {
            this.openSubMenuBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = btn.getAttribute('data-target');
                    this.showMenuSection(targetId);
                });
            });
        }

        if (this.backToMainBtns) {
            this.backToMainBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showMenuSection('menuMainFilters');
                });
            });
        }

        // Detectar cambios en el Radio Button de Ordenar
        if (this.sortInputs) {
            this.sortInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    this.currentSort = e.target.value;
                    // Forzar re-búsqueda con el nuevo filtro
                    this.fetchResults(); 
                });
            });
        }
    }

    showMenuSection(targetRef) {
        // Ocultar todas las secciones
        document.querySelectorAll('#moduleSearchFilters .component-menu').forEach(m => {
            m.classList.remove('active');
            m.classList.add('disabled');
            m.style.display = 'none';
        });

        // Mostrar la solicitada
        const targetMenu = document.querySelector(`[data-ref="${targetRef}"]`);
        if (targetMenu) {
            targetMenu.classList.remove('disabled');
            targetMenu.classList.add('active');
            targetMenu.style.display = 'block';
        }
    }

    async fetchResults() {
        try {
            // Activar loader en caso de que sea un re-fetch (por cambio de filtro)
            if (this.loadingState) this.loadingState.style.display = 'block';
            if (this.emptyState) this.emptyState.style.display = 'none';
            if (this.channelsSection) this.channelsSection.style.display = 'none';
            if (this.videosSection) this.videosSection.style.display = 'none';

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const apiUrl = `${this.basePath}/api/index.php?route=${ApiRoutes?.Search?.Get || 'search.get'}&q=${encodeURIComponent(this.query)}&sort=${encodeURIComponent(this.currentSort)}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            const rawText = await response.text();

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            
            let result;
            try {
                result = JSON.parse(rawText);
            } catch (jsonError) {
                throw new Error("Respuesta inválida del servidor.");
            }

            if (result.success) {
                this.renderResults(result.data);
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('💥 [SearchController] Error fetching:', error);
            this.showEmptyState();
        }
    }

    renderResults(data) {
        if (this.loadingState) this.loadingState.style.display = 'none';
        this.lastData = data;
        this.applyFilter();
    }

    applyFilter() {
        if (!this.lastData) return;
        const data = this.lastData;

        const hasChannels = data.channels && data.channels.length > 0;
        const hasVideos = data.videos && data.videos.length > 0;

        if (this.channelsSection) this.channelsSection.style.display = 'none';
        if (this.videosSection) this.videosSection.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'none';

        let showedAnything = false;

        if ((this.currentFilter === 'all' || this.currentFilter === 'channels') && hasChannels) {
            if (this.channelsSection) this.channelsSection.style.display = 'block';
            this.renderChannels(data.channels);
            showedAnything = true;
        }

        if ((this.currentFilter === 'all' || this.currentFilter === 'videos') && hasVideos) {
            if (this.videosSection) this.videosSection.style.display = 'block';
            this.renderVideos(data.videos);
            showedAnything = true;
        }

        if (!showedAnything) {
            this.showEmptyState();
        }
    }

    renderChannels(channels) {
        if (!this.channelsGrid) return;
        this.channelsGrid.innerHTML = '';
        
        channels.forEach((channel, index) => {
            const channelCard = document.createElement('div');
            channelCard.classList.add('component-group-item');
            
            const buildUrl = (path, defaultUrl) => {
                if (!path) return defaultUrl;
                if (path.startsWith('http')) return path;
                const clean = path.replace(/^\/?public\//, '');
                return `${this.basePath}/public/${clean}`;
            };

            const avatarSrc = buildUrl(channel.avatar_path, `${this.basePath}/public/storage/profilePictures/default/default.png`);

            channelCard.innerHTML = `
                <div class="component-group-item__content">
                    <div class="component-avatar">
                        <img src="${avatarSrc}" alt="${channel.username}" onerror="this.onerror=null; this.src='${this.basePath}/public/storage/profilePictures/default/default.png'">
                    </div>
                    <div class="component-group-item__text">
                        <h4 class="component-group-item__title">${channel.username}</h4>
                        <p class="component-group-item__desc">@${channel.handle}</p>
                    </div>
                </div>
                <div class="component-group-item__actions">
                    <button class="component-button component-button--pill component-button--h34">Ver canal</button>
                </div>
            `;

            channelCard.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    if (window.SpaRouter) window.SpaRouter.navigate(`/@${channel.handle}`);
                } else {
                    if (window.SpaRouter) window.SpaRouter.navigate(`/@${channel.handle}`);
                }
            });

            this.channelsGrid.appendChild(channelCard);

            if (index < channels.length - 1) {
                const divider = document.createElement('hr');
                divider.classList.add('component-divider');
                this.channelsGrid.appendChild(divider);
            }
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
            
            const createdDate = video.created_at ? new Date(video.created_at * 1000) : new Date();
            const timeAgo = this.timeSince(createdDate);
            const formattedDuration = this.formatDuration(video.duration || 0);
            const dominantColor = video.thumbnail_dominant_color && video.thumbnail_dominant_color !== 'transparent' ? video.thumbnail_dominant_color : '#1C1C1E';
            
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
                <div class="component-video-card " style="--local-dominant-color: ${dominantColor}; cursor: pointer;" data-nav="${navUrl}">
                    
                    <div class="component-video-card__top">
                        <img src="${thumbPath}" alt="Miniatura de ${title}" class="component-video-card__thumbnail" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}'">
                        
                        <video data-src="${videoSrc}" data-uuid="${uuid}" class="component-video-card__player" muted="" loop="" playsinline=""></video>

                        <span class="component-video-card__duration">${formattedDuration}</span>
                    </div>

                    <div class="component-video-card__bottom">
                        
                        <div class="component-video-card__avatar">
                            <img src="${avatarSrc}" alt="Perfil de ${video.channel_name || video.username || 'Usuario'}" loading="lazy" onerror="this.onerror=null; this.src='${this.basePath}/public/storage/profilePictures/default/default.png'">
                        </div>
                        
                        <div class="component-video-card__info">
                            <h3 class="component-video-card__title" title="${title}">${title}</h3>
                            <p class="component-video-card__user">${video.channel_name || video.username || 'Usuario Desconocido'}</p>
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