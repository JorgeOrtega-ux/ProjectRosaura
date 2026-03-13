import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export default class SearchController {
    constructor() {
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
            console.warn('🟡 [SearchController] Consulta vacía. Mostrando estado vacío.');
            this.showEmptyState();
            return;
        }

        if (this.queryDisplay) {
            this.queryDisplay.textContent = `"${this.query}"`;
        }
        document.title = `${this.query} - Búsqueda`;

        await this.fetchResults();
    }

    async fetchResults() {
        try {
            console.groupCollapsed(`🚨 [DEEP LOG - SEARCH] Iniciando búsqueda de: "${this.query}"`);
            
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const basePath = window.AppBasePath || '/ProjectRosaura';
            
            // USANDO API ROUTES AQUÍ
            const apiUrl = `${basePath}/api/index.php?route=${ApiRoutes.Search.Get}&q=${encodeURIComponent(this.query)}`;
            
            console.log(`[Paso 1] 🌐 Endpoint objetivo construido:`, apiUrl);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`[Paso 2] 📡 Estado HTTP Recibido: ${response.status} ${response.statusText}`);
            
            const rawText = await response.text();
            console.log(`[Paso 3] 📄 RESPUESTA CRUDA DEL SERVIDOR:\n`, rawText);

            if (!response.ok) {
                // Al imprimir rawText, si es un 500, ahora veremos el error exacto de PHP.
                throw new Error(`HTTP Error ${response.status}. Revisa la respuesta cruda arriba.`);
            }
            
            let result;
            try {
                result = JSON.parse(rawText);
            } catch (jsonError) {
                throw new Error("Respuesta inválida del servidor (No es JSON).");
            }

            if (result.success) {
                this.renderResults(result.data);
            } else {
                console.error('🔴 [Paso 4] Error devuelto por el backend:', result.message);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('💥 [SearchController] Excepción capturada:', error);
            this.showEmptyState();
        } finally {
            console.groupEnd();
        }
    }

    renderResults(data) {
        if (this.loadingState) this.loadingState.style.display = 'none';

        const hasChannels = data.channels && data.channels.length > 0;
        const hasVideos = data.videos && data.videos.length > 0;

        if (!hasChannels && !hasVideos) {
            this.showEmptyState();
            return;
        }

        if (hasChannels && this.channelsSection) {
            this.channelsSection.style.display = 'block';
            this.renderChannels(data.channels);
        }

        if (hasVideos && this.videosSection) {
            this.videosSection.style.display = 'block';
            this.renderVideos(data.videos);
        }
    }

    renderChannels(channels) {
        if (!this.channelsGrid) return;
        this.channelsGrid.innerHTML = '';
        
        channels.forEach(channel => {
            const channelCard = document.createElement('div');
            channelCard.classList.add('component-search-channel-card');
            
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
                if (window.SpaRouter) window.SpaRouter.navigate(`/@${channel.handle}`);
            });

            this.channelsGrid.appendChild(channelCard);
        });
    }

    renderVideos(videos) {
        if (!this.videosGrid) return;
        this.videosGrid.innerHTML = '';
        
        videos.forEach(video => {
            const videoCard = document.createElement('div');
            videoCard.classList.add('component-search-video-card');
            
            const thumbPath = `/public/storage/thumbnails/${video.id_video}.jpg`;
            
            videoCard.innerHTML = `
                <div class="component-search-video-thumbnail">
                    <img src="${thumbPath}" alt="${video.title}" onerror="this.src='/public/assets/images/default-thumbnail.jpg'">
                </div>
                <div class="component-search-video-details">
                    <h4 class="component-search-video-title">${video.title}</h4>
                    <p class="component-search-video-desc">${video.description ? video.description.substring(0, 120) + '...' : 'Sin descripción'}</p>
                </div>
            `;

            videoCard.addEventListener('click', () => {
                if (window.SpaRouter) window.SpaRouter.navigate(`/watch/${video.id_video}`);
            });

            this.videosGrid.appendChild(videoCard);
        });
    }

    showEmptyState() {
        if (this.loadingState) this.loadingState.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'flex';
    }
}