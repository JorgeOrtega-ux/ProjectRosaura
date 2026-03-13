import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export default class SearchController {
    constructor() {
        console.log('🟡 [SearchController] Constructor iniciado.');
        const urlParams = new URLSearchParams(window.location.search);
        this.query = urlParams.get('search_query') || '';
        console.log(`🟡 [SearchController] Query extraída de URL: "${this.query}"`);
        
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        console.log('🟡 [SearchController] Ejecutando cacheDOM...');
        this.queryDisplay = document.getElementById('search-query-display');
        this.loadingState = document.getElementById('search-loading-state');
        this.emptyState = document.getElementById('search-empty-state');
        
        this.channelsSection = document.getElementById('search-channels-section');
        this.channelsGrid = document.getElementById('search-channels-grid');
        
        this.videosSection = document.getElementById('search-videos-section');
        this.videosGrid = document.getElementById('search-videos-grid');

        console.log('🟡 [SearchController] Elementos DOM cacheados:', {
            queryDisplay: !!this.queryDisplay,
            loadingState: !!this.loadingState,
            emptyState: !!this.emptyState,
            channelsSection: !!this.channelsSection,
            channelsGrid: !!this.channelsGrid,
            videosSection: !!this.videosSection,
            videosGrid: !!this.videosGrid
        });
    }

    async init() {
        console.log('🟡 [SearchController] Ejecutando init()...');
        if (!this.query) {
            console.warn('🟡 [SearchController] Consulta vacía. Mostrando estado vacío y abortando búsqueda.');
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
        console.group(`🚨 [DEEP LOG - SEARCH] Iniciando flujo de búsqueda exhaustivo para: "${this.query}"`);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const basePath = window.AppBasePath || '/ProjectRosaura';
            
            console.log(`[🔍 Configuración] AppBasePath: "${basePath}", CSRF Token: "${csrfToken ? 'Encontrado' : 'Faltante'}"`);
            
            // Verificar si ApiRoutes existe y tiene la propiedad
            if (!ApiRoutes || !ApiRoutes.Search || !ApiRoutes.Search.Get) {
                console.error('❌ [Error Crítico] ApiRoutes.Search.Get NO está definido. Revisa ApiRoutes.js');
                console.log('Contenido de ApiRoutes:', ApiRoutes);
            }

            const apiUrl = `${basePath}/api/index.php?route=${ApiRoutes?.Search?.Get || 'search.get'}&q=${encodeURIComponent(this.query)}`;
            
            console.log(`[Paso 1] 🌐 Endpoint objetivo construido EXACTO:`, apiUrl);

            const fetchOptions = {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };
            console.log(`[Paso 1.5] 📦 Opciones de Fetch enviadas:`, fetchOptions);

            const response = await fetch(apiUrl, fetchOptions);
            
            console.log(`[Paso 2] 📡 Objeto Response Completo:`, response);
            console.log(`[Paso 2.1] 📡 Estado HTTP Recibido: ${response.status} ${response.statusText}`);
            console.log(`[Paso 2.2] 📡 Headers de la respuesta:`, Object.fromEntries(response.headers.entries()));
            
            const rawText = await response.text();
            console.log(`[Paso 3] 📄 RESPUESTA CRUDA DEL SERVIDOR (Longitud: ${rawText.length} caracteres):\n`, rawText);

            if (!response.ok) {
                console.error(`❌ [Paso 3.1] La respuesta NO fue OK (Status: ${response.status}).`);
                throw new Error(`HTTP Error ${response.status}. Revisa la respuesta cruda en la consola.`);
            }
            
            let result;
            try {
                result = JSON.parse(rawText);
                console.log(`[Paso 4] 🧩 JSON Parseado con éxito:`, result);
            } catch (jsonError) {
                console.error("❌ [Paso 4] Error CRÍTICO al parsear JSON:", jsonError.message);
                console.error("❌ [Paso 4] El texto que PHP devolvió y falló al parsear fue:", rawText);
                throw new Error("Respuesta inválida del servidor (No es un JSON válido). Revisa el Paso 3 para ver qué imprimió PHP.");
            }

            if (result.success) {
                console.log(`[Paso 5] ✅ Búsqueda procesada en backend con éxito. Datos:`, result.data);
                this.renderResults(result.data);
            } else {
                console.error('🔴 [Paso 5] Backend devolvió success: false. Mensaje del servidor:', result.message);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('💥 [SearchController - fetchResults] Excepción capturada en el bloque catch:', error);
            console.error('💥 [Stack Trace]:', error.stack);
            this.showEmptyState();
        } finally {
            console.log('🏁 [DEEP LOG - SEARCH] Finalizando ejecución de fetchResults.');
            console.groupEnd();
        }
    }

    renderResults(data) {
        console.log('🟡 [SearchController] Ejecutando renderResults() con data:', data);
        if (this.loadingState) this.loadingState.style.display = 'none';

        const hasChannels = data.channels && data.channels.length > 0;
        const hasVideos = data.videos && data.videos.length > 0;

        console.log(`🟡 [SearchController] Resultados analizados para render: Canales(${hasChannels ? data.channels.length : 0}), Videos(${hasVideos ? data.videos.length : 0})`);

        if (!hasChannels && !hasVideos) {
            console.log('🟡 [SearchController] No hay resultados de videos ni canales. Mostrando empty state.');
            this.showEmptyState();
            return;
        }

        if (hasChannels && this.channelsSection) {
            console.log('🟡 [SearchController] Renderizando sección de canales...');
            this.channelsSection.style.display = 'block';
            this.renderChannels(data.channels);
        }

        if (hasVideos && this.videosSection) {
            console.log('🟡 [SearchController] Renderizando sección de videos...');
            this.videosSection.style.display = 'block';
            this.renderVideos(data.videos);
        }
    }

    renderChannels(channels) {
        if (!this.channelsGrid) {
            console.error('❌ [SearchController] No se encontró this.channelsGrid en el DOM para renderizar canales.');
            return;
        }
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
        console.log(`✅ [SearchController] Renderizados ${channels.length} canales en el DOM exitosamente.`);
    }

    renderVideos(videos) {
        if (!this.videosGrid) {
            console.error('❌ [SearchController] No se encontró this.videosGrid en el DOM para renderizar videos.');
            return;
        }
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
        console.log(`✅ [SearchController] Renderizados ${videos.length} videos en el DOM exitosamente.`);
    }

    showEmptyState() {
        if (this.loadingState) this.loadingState.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'flex';
        console.log('🟡 [SearchController] Estado vacío mostrado visualmente al usuario.');
    }
}