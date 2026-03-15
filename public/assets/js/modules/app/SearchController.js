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

        // BUSCAMOS DIRECTAMENTE POR EL ATRIBUTO DATA-FILTER DENTRO DE LA LISTA
        this.filterBtns = document.querySelectorAll('.component-badge-list [data-filter]');
        
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
                            b.classList.remove('active');
                        }
                    });
                    
                    e.target.classList.add('active');
                    
                    this.currentFilter = e.target.getAttribute('data-filter') || 'all';
                    this.applyFilter();
                });
            });
        }

        if (this.toggleFiltersBtn && this.filtersModule) {
            this.toggleFiltersBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = this.filtersModule.style.display === 'block';
                this.filtersModule.style.display = isVisible ? 'none' : 'block';

                if (!isVisible) {
                    this.showMenuSection('menuMainFilters');
                }
            });

            document.addEventListener('click', (e) => {
                if (this.filtersModule.style.display === 'block') {
                    if (!this.filtersModule.contains(e.target) && !this.toggleFiltersBtn.contains(e.target)) {
                        this.filtersModule.style.display = 'none';
                    }
                }
            });
        }

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

        if (this.sortInputs) {
            this.sortInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    this.currentSort = e.target.value;
                    this.fetchResults(); 
                });
            });
        }
    }

    showMenuSection(targetRef) {
        document.querySelectorAll('#moduleSearchFilters .component-menu').forEach(m => {
            m.classList.remove('active');
            m.classList.add('disabled');
            m.style.display = 'none';
        });

        const targetMenu = document.querySelector(`[data-ref="${targetRef}"]`);
        if (targetMenu) {
            targetMenu.classList.remove('disabled');
            targetMenu.classList.add('active');
            targetMenu.style.display = 'block';
        }
    }

    async fetchResults() {
        try {
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
        
        channels.forEach((channel) => {
            const channelCard = document.createElement('div');
            channelCard.classList.add('component-channel-card-modern');
            
            const dominantColor = channel.dominant_color && channel.dominant_color !== 'transparent' ? channel.dominant_color : '#333333';
            channelCard.style.setProperty('--local-dominant-color', dominantColor);
            
            const buildUrl = (path, defaultUrl) => {
                if (!path) return defaultUrl;
                if (path.startsWith('http')) return path;
                const clean = path.replace(/^\/?public\//, '');
                return `${this.basePath}/public/${clean}`;
            };

            const defaultAvatar = `${this.basePath}/public/storage/profilePictures/default/default.png`;
            const defaultBanner = `${this.basePath}/public/assets/img/default-banner.jpg`;

            const avatarSrc = buildUrl(channel.avatar_path, defaultAvatar);
            const bannerSrc = buildUrl(channel.banner_path, defaultBanner);
            
            const subCountStr = this.formatNumber(channel.subscribers_count || 0) + ' suscriptores';
            const videosCountStr = this.formatNumber(channel.videos_count || 0) + ' videos';
            const isSubbed = channel.is_subscribed ? 'subscribed' : '';
            const btnText = channel.is_subscribed ? 'Suscrito' : 'Suscribirse';
            const description = channel.description ? channel.description : '';

            channelCard.innerHTML = `
                <div class="channel-card-banner">
                    <img src="${bannerSrc}" alt="Banner de ${channel.username}" onerror="this.src='${defaultBanner}'">
                </div>
                <div class="channel-card-avatar">
                    <img src="${avatarSrc}" alt="${channel.username}" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                </div>
                <div class="channel-card-info">
                    <h4 class="channel-card-name" title="${channel.username}">${channel.username}</h4>
                    <p class="channel-card-handle">@${channel.handle}</p>
                    ${description ? `<p class="channel-card-description">${description}</p>` : ''}
                </div>
                <div class="channel-card-actions">
                    <span class="component-badge stat-badge">${subCountStr}</span>
                    <span class="component-badge stat-badge">${videosCountStr}</span>
                    <button class="component-badge btn-channel-subscribe ${isSubbed}" data-channel-id="${channel.id}">${btnText}</button>
                </div>
            `;

            channelCard.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-channel-subscribe')) {
                    if (window.SpaRouter) window.SpaRouter.navigate(`/@${channel.handle}`);
                }
            });

            channelCard.addEventListener('mouseenter', () => {
                const domColor = channelCard.style.getPropertyValue('--local-dominant-color');
                if (domColor && domColor.trim() !== '') {
                    document.documentElement.style.setProperty('--global-dominant-color', domColor);
                }
            });

            const subBtn = channelCard.querySelector('.btn-channel-subscribe');
            subBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                try {
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                    const response = await fetch(`${this.basePath}/api/index.php?route=channel.subscribe`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken
                        },
                        body: JSON.stringify({ channel_id: channel.id })
                    });
                    
                    const resData = await response.json();
                    
                    if (resData.success) {
                        channel.is_subscribed = !channel.is_subscribed;
                        if (channel.is_subscribed) {
                            subBtn.classList.add('subscribed');
                            subBtn.textContent = 'Suscrito';
                            channel.subscribers_count = (channel.subscribers_count || 0) + 1;
                        } else {
                            subBtn.classList.remove('subscribed');
                            subBtn.textContent = 'Suscribirse';
                            channel.subscribers_count = Math.max(0, (channel.subscribers_count || 0) - 1);
                        }
                        const statsBadge = channelCard.querySelectorAll('.stat-badge')[0];
                        if(statsBadge) {
                            statsBadge.textContent = this.formatNumber(channel.subscribers_count) + ' suscriptores';
                        }
                    } else {
                        console.error('Error al suscribirse:', resData.message);
                    }
                } catch (err) {
                    console.error('Error en red al intentar suscribirse:', err);
                }
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
                            <p class="component-video-card__meta">${this.formatNumber(views)} vistas • ${timeAgo}</p>
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

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + ' K';
        return num.toString();
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