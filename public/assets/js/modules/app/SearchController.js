export default class SearchController {
    constructor() {
        // Extraemos la variable de la URL generada por el router o el header
        const urlParams = new URLSearchParams(window.location.search);
        this.query = urlParams.get('search_query') || '';
        
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        this.queryDisplay = document.getElementById('search-query-display');
        this.loadingState = document.getElementById('search-loading-state');
        this.emptyState = document.getElementById('search-empty-state');
        
        this.channelsSection = document.getElementById('search-channels-section');
        this.channelsGrid = document.getElementById('search-channels-grid');
        
        this.videosSection = document.getElementById('search-videos-section');
        this.videosGrid = document.getElementById('search-videos-grid');
    }

    async init() {
        if (!this.query) {
            this.showEmptyState();
            return;
        }

        // Actualizamos el DOM del header top
        this.queryDisplay.textContent = `"${this.query}"`;
        document.title = `${this.query} - Búsqueda`;

        await this.fetchResults();
    }

 async fetchResults() {
        try {
            // 1. Obtenemos el token de seguridad global (asumiendo que lo tienes en un meta tag en tu header.php o app.php)
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            // 2. Apuntamos al index.php de la API usando la ruta mapeada 'search.get'
            const apiUrl = `/ProjectRosaura/api/index.php?route=search.get&q=${encodeURIComponent(this.query)}`;

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const result = await response.json();

            if (result.success) {
                this.renderResults(result.data);
            } else {
                console.error('Error del servidor:', result.message);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Fallo al obtener resultados:', error);
            this.showEmptyState();
        }
    }

    renderResults(data) {
        // Ocultar spinner
        this.loadingState.style.display = 'none';

        const hasChannels = data.channels && data.channels.length > 0;
        const hasVideos = data.videos && data.videos.length > 0;

        if (!hasChannels && !hasVideos) {
            this.showEmptyState();
            return;
        }

        if (hasChannels) {
            this.channelsSection.style.display = 'block';
            this.renderChannels(data.channels);
        }

        if (hasVideos) {
            this.videosSection.style.display = 'block';
            this.renderVideos(data.videos);
        }
    }

    renderChannels(channels) {
        this.channelsGrid.innerHTML = '';
        channels.forEach(channel => {
            const channelCard = document.createElement('div');
            channelCard.classList.add('component-search-channel-card');
            
            // Asumiendo que el avatar tiene una ruta default si es nulo
            const avatarSrc = channel.avatar_path ? `/public/storage/profilePictures/uploaded/${channel.avatar_path}` : `/public/storage/profilePictures/default/default.png`;

            channelCard.innerHTML = `
                <div class="component-search-channel-avatar">
                    <img src="${avatarSrc}" alt="${channel.username}">
                </div>
                <div class="component-search-channel-info">
                    <h4 class="component-search-channel-name">${channel.username}</h4>
                    <span class="component-search-channel-handle">@${channel.handle}</span>
                </div>
                <button class="component-search-channel-btn">Ver canal</button>
            `;

            channelCard.addEventListener('click', () => {
                window.SpaRouter.navigate(`/channel/${channel.handle}`);
            });

            this.channelsGrid.appendChild(channelCard);
        });
    }

    renderVideos(videos) {
        this.videosGrid.innerHTML = '';
        videos.forEach(video => {
            // Aquí puedes reemplazar la creación manual integrando tu 'VideoCardSystem' si tienes un método estático
            const videoCard = document.createElement('div');
            videoCard.classList.add('component-search-video-card');
            
            videoCard.innerHTML = `
                <div class="component-search-video-thumbnail">
                    <img src="/public/storage/thumbnails/${video.id_video}.jpg" alt="${video.title}" onerror="this.src='/public/assets/images/default-thumbnail.jpg'">
                </div>
                <div class="component-search-video-details">
                    <h4 class="component-search-video-title">${video.title}</h4>
                    <p class="component-search-video-desc">${video.description ? video.description.substring(0, 120) + '...' : 'Sin descripción'}</p>
                </div>
            `;

            videoCard.addEventListener('click', () => {
                window.SpaRouter.navigate(`/watch?v=${video.id_video}`);
            });

            this.videosGrid.appendChild(videoCard);
        });
    }

    showEmptyState() {
        this.loadingState.style.display = 'none';
        this.emptyState.style.display = 'flex';
    }
}