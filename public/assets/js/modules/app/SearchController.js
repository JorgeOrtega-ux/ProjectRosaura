import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export default class SearchController {
    constructor() {
        console.log('🟡 [SearchController] Constructor iniciado. (Enterprise Mode)');
        this.currentTab = 'all';
        this.lastData = null;
    }

    cacheDOM() {
        this.loadingState = document.getElementById('search-loading-state');
        this.emptyState = document.getElementById('search-empty-state');
        
        this.channelsSection = document.getElementById('search-channels-section');
        this.channelsGrid = document.getElementById('search-channels-grid');
        
        this.videosSection = document.getElementById('search-videos-section');
        this.videosGrid = document.getElementById('search-videos-grid');

        this.tabBtns = document.querySelectorAll('.component-search-tab-btn');
        
        // Elementos de Filtros
        this.btnToggleFilters = document.getElementById('search-toggle-filters');
        this.filtersPanel = document.getElementById('search-filters-panel');
        this.btnApplyFilters = document.getElementById('search-apply-filters');
        this.btnClearFilters = document.getElementById('search-clear-filters');
        
        this.inputSort = document.getElementById('search-sort-select');
        this.inputCategory = document.getElementById('search-category-input');
        this.inputTags = document.getElementById('search-tags-input');
        this.inputModels = document.getElementById('search-models-input');
    }

    async init() {
        this.basePath = window.AppBasePath || '/ProjectRosaura';
        this.cacheDOM();
        
        // Extraer query y filtros de la URL actual
        const urlParams = new URLSearchParams(window.location.search);
        this.query = urlParams.get('search_query') || '';
        
        // Autocompletar los inputs con lo que venga en la URL
        if (this.inputCategory) this.inputCategory.value = urlParams.get('category') || '';
        if (this.inputTags) this.inputTags.value = urlParams.get('tags') || '';
        if (this.inputModels) this.inputModels.value = urlParams.get('models') || '';
        if (this.inputSort) this.inputSort.value = urlParams.get('sort') || 'created_at:desc';

        this.bindEvents();

        if (!this.query && !this.inputCategory.value && !this.inputTags.value && !this.inputModels.value) {
            this.showEmptyState("Ingresa un término de búsqueda o selecciona un filtro.");
            return;
        }

        document.title = `${this.query || 'Búsqueda'} - ProjectRosaura`;

        await this.fetchResults();
    }

    bindEvents() {
        // Pestañas (Todo, Canales, Videos)
        if (this.tabBtns) {
            this.tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.tabBtns.forEach(b => b.classList.remove('component-search-tab-active'));
                    e.target.classList.add('component-search-tab-active');
                    this.currentTab = e.target.getAttribute('data-type') || 'all';
                    this.renderTabs();
                });
            });
        }

        // Mostrar/Ocultar Panel de Filtros
        if (this.btnToggleFilters) {
            this.btnToggleFilters.addEventListener('click', () => {
                const isHidden = this.filtersPanel.style.display === 'none';
                this.filtersPanel.style.display = isHidden ? 'block' : 'none';
                this.btnToggleFilters.classList.toggle('active', isHidden);
            });
        }

        // Botón Limpiar Filtros
        if (this.btnClearFilters) {
            this.btnClearFilters.addEventListener('click', () => {
                this.inputCategory.value = '';
                this.inputTags.value = '';
                this.inputModels.value = '';
                this.inputSort.value = 'created_at:desc';
                this.applyFiltersAndFetch();
            });
        }

        // Botón Aplicar Filtros
        if (this.btnApplyFilters) {
            this.btnApplyFilters.addEventListener('click', () => {
                this.applyFiltersAndFetch();
            });
        }
        
        // Presionar Enter en los inputs de filtro
        [this.inputCategory, this.inputTags, this.inputModels].forEach(input => {
            if(input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.applyFiltersAndFetch();
                });
            }
        });
    }

    applyFiltersAndFetch() {
        // Actualizar la URL dinámicamente sin recargar la página (History API)
        const currentUrl = new URL(window.location);
        
        const setOrDelete = (key, value) => {
            if (value && value.trim() !== '') {
                currentUrl.searchParams.set(key, value.trim());
            } else {
                currentUrl.searchParams.delete(key);
            }
        };

        setOrDelete('category', this.inputCategory.value);
        setOrDelete('tags', this.inputTags.value);
        setOrDelete('models', this.inputModels.value);
        
        if (this.inputSort.value !== 'created_at:desc') {
            currentUrl.searchParams.set('sort', this.inputSort.value);
        } else {
            currentUrl.searchParams.delete('sort');
        }

        window.history.pushState({}, '', currentUrl);
        
        // Volver a buscar con los nuevos parámetros
        this.fetchResults();
    }

    async fetchResults() {
        this.showLoadingState();
        
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            // Construir Query String para la API
            const params = new URLSearchParams();
            if (this.query) params.append('q', this.query);
            if (this.inputCategory?.value) params.append('category', this.inputCategory.value.trim());
            if (this.inputTags?.value) params.append('tags', this.inputTags.value.trim());
            if (this.inputModels?.value) params.append('models', this.inputModels.value.trim());
            if (this.inputSort?.value) params.append('sort', this.inputSort.value);

            const apiUrl = `${this.basePath}/api/index.php?route=${ApiRoutes?.Search?.Get || 'search.get'}&${params.toString()}`;
            
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
            try { result = JSON.parse(rawText); } 
            catch (jsonError) { throw new Error("Respuesta inválida del servidor."); }

            if (result.success) {
                this.lastData = result.data;
                this.renderTabs();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('💥 [SearchController] Error fetching:', error);
            this.showEmptyState("Hubo un error al conectar con el motor de búsqueda.");
        }
    }

    renderTabs() {
        if (!this.lastData) return;
        
        this.hideAll();
        
        const data = this.lastData;
        const hasChannels = data.channels && data.channels.length > 0;
        const hasVideos = data.videos && data.videos.length > 0;
        let showedAnything = false;

        if ((this.currentTab === 'all' || this.currentTab === 'channels') && hasChannels) {
            if (this.channelsSection) this.channelsSection.style.display = 'block';
            this.renderChannels(data.channels);
            showedAnything = true;
        }

        if ((this.currentTab === 'all' || this.currentTab === 'videos') && hasVideos) {
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
            
            const createdDate = video.created_at ? new Date(video.created_at * 1000) : new Date();
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
                        <img src="${thumbPath}" alt="Miniatura" class="component-video-card__thumbnail" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}'">
                        <video data-src="${videoSrc}" data-uuid="${uuid}" class="component-video-card__player" muted loop playsinline></video>
                        <span class="component-video-card__duration">${formattedDuration}</span>
                    </div>
                    <div class="component-video-card__bottom">
                        <div class="component-video-card__avatar">
                            <img src="${avatarSrc}" alt="Perfil" loading="lazy" onerror="this.onerror=null; this.src='${this.basePath}/public/storage/profilePictures/default/default.png'">
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
        return h > 0 ? `${h}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
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

    hideAll() {
        if (this.channelsSection) this.channelsSection.style.display = 'none';
        if (this.videosSection) this.videosSection.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'none';
        if (this.loadingState) this.loadingState.style.display = 'none';
    }

    showLoadingState() {
        this.hideAll();
        if (this.loadingState) this.loadingState.style.display = 'flex';
    }

    showEmptyState(customTitle = null) {
        this.hideAll();
        if (this.emptyState) {
            this.emptyState.style.display = 'flex';
            if(customTitle) {
                const titleEl = document.getElementById('search-empty-title');
                if(titleEl) titleEl.textContent = customTitle;
            }
        }
    }
}