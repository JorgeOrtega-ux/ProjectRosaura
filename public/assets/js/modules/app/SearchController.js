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
            console.warn('[SearchController] Consulta vacía. Mostrando estado vacío.');
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
            console.group(`[SearchController] Ejecutando búsqueda: "${this.query}"`);
            
            // 1. Obtenemos el token de seguridad global
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            if (!csrfToken) console.warn('[SearchController] No se encontró el token CSRF en el DOM.');

            // 2. Ruta restaurada a la subcarpeta del proyecto local en XAMPP/WAMP
            const apiUrl = `/ProjectRosaura/api/index.php?route=search.get&q=${encodeURIComponent(this.query)}`;
            
            console.log(`[SearchController] Endpoint objetivo: ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`[SearchController] Estado de la respuesta HTTP: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                // Leemos como texto en caso de que un 404 o 500 devuelva HTML de Apache/Nginx
                const errorHtml = await response.text();
                console.error('[SearchController] Fallo en la red. Respuesta del servidor:', errorHtml);
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }
            
            // Inspección del parseo JSON (clave para evitar errores de corrupción)
            const result = await response.json();
            console.log('[SearchController] Payload recibido del servidor:', result);

            if (result.success) {
                this.renderResults(result.data);
            } else {
                console.error('[SearchController] Error lógico del backend:', result.message);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('[SearchController] Excepción capturada durante el flujo de la petición:', error);
            this.showEmptyState();
        } finally {
            console.groupEnd();
        }
    }

    renderResults(data) {
        this.loadingState.style.display = 'none';

        const hasChannels = data.channels && data.channels.length > 0;
        const hasVideos = data.videos && data.videos.length > 0;

        if (!hasChannels && !hasVideos) {
            console.info('[SearchController] La búsqueda no arrojó resultados para canales ni videos.');
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
                window.SpaRouter.navigate(`/@${channel.handle}`);
            });

            this.channelsGrid.appendChild(channelCard);
        });
    }

    renderVideos(videos) {
        this.videosGrid.innerHTML = '';
        videos.forEach(video => {
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
                window.SpaRouter.navigate(`/watch/${video.id_video}`);
            });

            this.videosGrid.appendChild(videoCard);
        });
    }

    showEmptyState() {
        this.loadingState.style.display = 'none';
        this.emptyState.style.display = 'flex';
    }
}