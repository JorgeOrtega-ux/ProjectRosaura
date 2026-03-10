// public/assets/js/modules/app/WatchController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { VideoPlayerSystem } from '../../core/components/VideoPlayerSystem.js';

export class WatchController {
    constructor() {
        this.container = document.querySelector('.view-content');
        this.api = new ApiService();
        this.playerSystem = null;
    }

    async init() {
        const urlPath = window.location.pathname;
        const pathSegments = urlPath.split('/');
        
        const watchIndex = pathSegments.indexOf('watch');
        const videoId = (watchIndex !== -1 && pathSegments.length > watchIndex + 1) 
                        ? pathSegments[watchIndex + 1] 
                        : null;

        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = urlParams.get('list');

        if (!videoId) {
            this.showError404('Identificador de video no proporcionado en la URL.');
            return;
        }

        // Inicializar el sistema del reproductor
        this.playerSystem = new VideoPlayerSystem();

        try {
            const response = await this.api.post('app.get_video_details', { video_uuid: videoId });

            if (response && response.success) {
                this.renderRealData(response.data, playlistId);
                
                // Le pasamos el UUID del video y forzamos (true) la solicitud del token firmado al backend.
                if (videoId) {
                    this.playerSystem.loadVideo(videoId, true);
                } else {
                    console.error('[WatchController] El video no tiene un ID válido generado.');
                }

                // Si detectamos que hay un listId, cargamos la playlist para la barra lateral
                if (playlistId) {
                    this.loadPlaylistData(playlistId, videoId);
                }

                // Cargar videos recomendados de la sidebar
                this.loadRecommendedVideos(videoId);

            } else {
                this.showError404(response.message || 'El video que buscas no existe o es privado.');
            }
        } catch (error) {
            console.error('[WatchController] Error fetching video:', error);
            this.showError404('Ocurrió un error de red al intentar cargar el video.');
        }
    }

    async loadPlaylistData(playlistId, currentVideoId) {
        try {
            // Suponemos que registrarás este endpoint en ApiRoutes.js y tu backend
            const response = await this.api.post('app.get_playlist_queue', { playlist_uuid: playlistId });
            
            if (response && response.success && response.data) {
                this.renderPlaylistPanel(response.data, currentVideoId, playlistId);
            }
        } catch (error) {
            console.error('[WatchController] Error fetching playlist queue:', error);
            // El panel simplemente se mantendrá oculto si ocurre un error o no se encuentra
        }
    }

    renderPlaylistPanel(playlistData, currentVideoId, playlistId) {
        const panel = document.getElementById('watch-playlist-panel');
        const titleEl = document.getElementById('watch-playlist-title');
        const countEl = document.getElementById('watch-playlist-count');
        const itemsContainer = document.getElementById('watch-playlist-items');
        const header = document.querySelector('.watch-playlist-header');
        
        if (!panel || !itemsContainer) return;

        // Mostrar panel quitando la clase hidden
        panel.style.display = 'flex';
        panel.classList.remove('hidden');

        // Llenar Textos
        titleEl.textContent = playlistData.title || window.AppSystem?.Translator?.get('watch_playlist_title') || 'Lista de reproducción';
        
        const videos = playlistData.videos || [];
        const total = videos.length;
        let currentIndex = videos.findIndex(v => v.uuid === currentVideoId);
        let displayIndex = currentIndex !== -1 ? currentIndex + 1 : 1;

        // Utilizamos la clave del traductor si la armaste así, o manual:
        let countTextTemplate = window.AppSystem?.Translator?.get('watch_playlist_videos_count') || '{current} de {total}';
        countEl.textContent = countTextTemplate.replace('{current}', displayIndex).replace('{total}', total);

        // Renderizar items de la lista
        let html = '';
        videos.forEach((video, index) => {
            const isActive = video.uuid === currentVideoId;
            const itemNumber = index + 1;
            const thumbnailUrl = video.thumbnail_url || video.thumbnail || '/ProjectRosaura/public/assets/images/default-thumb.png';
            const title = video.title || 'Video sin título';
            const author = video.username || (video.author && video.author.username) || 'Canal Rosaura';
            
            let duration = '00:00';
            if (video.duration_formatted) {
                duration = video.duration_formatted;
            } else if (video.duration) {
                const totalSeconds = parseInt(video.duration, 10);
                const m = Math.floor(totalSeconds / 60);
                const s = totalSeconds % 60;
                duration = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }

            // Url para ir al video pero manteniendo el contexto de la playlist
            const watchUrl = `/ProjectRosaura/watch/${video.uuid}?list=${playlistId}`;

            html += `
                <a href="${watchUrl}" class="watch-playlist-item ${isActive ? 'active' : ''}" data-uuid="${video.uuid}">
                    <div class="watch-playlist-item-index">${itemNumber}</div>
                    <div class="watch-playlist-item-playing-icon">
                        <span class="material-symbols-rounded" style="font-size: 16px;">play_arrow</span>
                    </div>
                    <div class="watch-playlist-item-thumb">
                        <img src="${thumbnailUrl}" alt="${title}">
                        <span class="watch-playlist-item-duration">${duration}</span>
                    </div>
                    <div class="watch-playlist-item-info">
                        <h4 class="watch-playlist-item-title" title="${title}">${title}</h4>
                        <span class="watch-playlist-item-author">${author}</span>
                    </div>
                </a>
            `;
        });

        itemsContainer.innerHTML = html;

        // Activar Toggle Expand/Collapse (solo una vez)
        if (header && !header.hasAttribute('data-listener-attached')) {
            header.addEventListener('click', () => {
                panel.classList.toggle('collapsed');
            });
            header.setAttribute('data-listener-attached', 'true');
        }

        // Auto-scroll al item activo una vez renderizado
        setTimeout(() => {
            const activeItem = itemsContainer.querySelector('.watch-playlist-item.active');
            if (activeItem) {
                // Restamos un poco (e.g. 10px) para que no quede totalmente pegado arriba
                itemsContainer.scrollTop = activeItem.offsetTop - itemsContainer.offsetTop - 10;
            }
        }, 300);
    }

    // FUNCIÓN ACTUALIZADA: Extrae específicamente de response.data.horizontal
    async loadRecommendedVideos(currentVideoId) {
        try {
            const response = await this.api.post('app.get_feed', { limit: 12 });
            
            if (response && response.success) {
                let videoList = [];
                
                // Extraemos exactamente el arreglo "horizontal" que manda el FeedController
                if (response.data && Array.isArray(response.data.horizontal)) {
                    videoList = response.data.horizontal;
                } else if (Array.isArray(response.data)) {
                    videoList = response.data;
                }

                // Filtrar para que el video que estamos viendo no salga en sugeridos
                if (currentVideoId) {
                    videoList = videoList.filter(v => v.uuid !== currentVideoId);
                }

                this.renderRecommendedVideos(videoList);
            } else {
                this.renderRecommendedVideos([]);
            }
        } catch (error) {
            console.error('[WatchController] Error fetching recommended videos:', error);
            this.renderRecommendedVideos([]);
        }
    }

    // FUNCIÓN ACTUALIZADA: Lee las variables thumbnail_url y formatea duration
    renderRecommendedVideos(videos) {
        const container = document.getElementById('watch-recommended-videos');
        if (!container) return;

        if (!Array.isArray(videos)) {
            videos = []; 
        }

        if (videos.length === 0) {
            container.innerHTML = '<p class="watch-placeholder-text">No hay videos sugeridos disponibles por el momento.</p>';
            return;
        }

        let html = '';
        videos.forEach(video => {
            const title = video.title || 'Sin Título';
            
            // Adaptado por si el FeedController manda username directo
            const channelName = video.username || (video.author && video.author.username) || 'Canal Rosaura';
            
            const views = video.views ? parseInt(video.views).toLocaleString('es-MX') : Math.floor(Math.random() * 50000).toLocaleString('es-MX');
            
            // Lógica para formatear la duración que viene del FeedController (generalmente en segundos)
            let duration = '00:00';
            if (video.duration_formatted) {
                duration = video.duration_formatted;
            } else if (video.duration) {
                const totalSeconds = parseInt(video.duration, 10);
                const m = Math.floor(totalSeconds / 60);
                const s = totalSeconds % 60;
                duration = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            
            // Usamos thumbnail_url (la variable que arma el FeedController)
            const thumbnailUrl = video.thumbnail_url || video.thumbnail || '/ProjectRosaura/public/assets/images/default-thumb.png'; 
            
            // Enlaces
            const watchUrl = `/ProjectRosaura/watch/${video.uuid}`;
            const streamUrl = `/ProjectRosaura/api/media/stream?uuid=${video.uuid}`;

            // ! IMPORTANTE: Aquí forzamos display flex y flex-direction row con !important
            html += `
                <a href="${watchUrl}" class="component-video-card component-video-card--horizontal" style="display: flex !important; flex-direction: row !important; align-items: flex-start; gap: 10px; text-decoration: none; color: inherit; width: 100%; border-radius: 8px; cursor: pointer;">
                    <div class="component-video-card__thumbnail-container" style="position: relative; width: 168px; min-width: 168px; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; background-color: #222; flex-shrink: 0;">
                        <img src="${thumbnailUrl}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 1;" alt="${title}">
                        
                        <video class="component-video-card__player" data-src="${streamUrl}" preload="none" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 2; opacity: 0; transition: opacity 0.3s;" onplay="this.style.opacity=1;" onpause="this.style.opacity=0;"></video>
                        
                        <span class="component-video-card__duration" style="position: absolute; bottom: 4px; right: 4px; background-color: rgba(0,0,0,0.8); color: white; font-size: 12px; padding: 2px 4px; border-radius: 4px; z-index: 3; font-weight: 500;">
                            ${duration}
                        </span>
                    </div>
                    
                    <div class="component-video-card__info" style="display: flex; flex-direction: column; overflow: hidden; padding-top: 2px; width: 100%;">
                        <h3 class="component-video-card__title" title="${title}" style="font-size: 14px; margin: 0 0 4px 0; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                            ${title}
                        </h3>
                        <div class="component-video-card__meta" style="font-size: 12px; color: var(--text-secondary, #AAAAAA); line-height: 1.4;">
                            <div class="component-video-card__channel" style="margin-bottom: 2px;">${channelName}</div>
                            <div class="component-video-card__views-date">${views} visualizaciones</div>
                        </div>
                    </div>
                </a>
            `;
        });

        container.innerHTML = html;
    }

    renderRealData(data, playlistId) {
        // --- DIV 1: TÍTULO ---
        const titleEl = document.getElementById('watch-video-title');
        if (titleEl) titleEl.textContent = data.title || 'Sin Título';

        // --- DIV 2: CANAL Y ACCIONES (IZQUIERDA) ---
        const channelNameEl = document.getElementById('watch-channel-name');
        if (channelNameEl) channelNameEl.textContent = (data.author && data.author.username) ? data.author.username : 'Canal Rosaura';
        
        const channelAvatarEl = document.getElementById('watch-channel-avatar');
        if (channelAvatarEl) {
            channelAvatarEl.src = '/ProjectRosaura/public/storage/profilePictures/default/3494f2fb-46da-4804-9519-11f40a512c49.png';
        }

        const channelSubsEl = document.getElementById('watch-channel-subs');
        if (channelSubsEl) {
            const randomSubs = Math.floor(Math.random() * 900) + 10;
            channelSubsEl.textContent = `${randomSubs} mil suscriptores`;
        }

        // --- DIV 2: CANAL Y ACCIONES (DERECHA) ---
        const randomViews = Math.floor(Math.random() * (900000 - 10000 + 1)) + 10000;
        
        const likesEl = document.getElementById('watch-like-count');
        if (likesEl) {
            const randomLikes = Math.floor(randomViews * 0.05);
            likesEl.textContent = randomLikes.toLocaleString('es-MX');
        }

        // --- DIV 3: CAJA DE DETALLES ---
        const viewsEl = document.getElementById('watch-video-views');
        if (viewsEl) {
            viewsEl.textContent = `${randomViews.toLocaleString('es-MX')} visualizaciones`;
        }

        const dateEl = document.getElementById('watch-video-date');
        if (dateEl) {
            const pubDate = new Date(data.published_at || data.created_at);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = pubDate.toLocaleDateString('es-ES', options);
        }

        const descEl = document.getElementById('watch-video-description');
        if (descEl) {
            descEl.textContent = data.description || 'Este video no tiene una descripción.';
        }

        // --- DIV 4: CAJA DE ETIQUETAS (Modelos y Categorías) ---
        const tagsContainer = document.getElementById('watch-video-tags-container');
        let hasModelsOrCategories = false;

        if (tagsContainer) {
            let tagsHTML = '';

            // Renderizar Modelos
            if (data.models && data.models.length > 0) {
                tagsHTML += data.models.map(m => 
                    `<span class="watch-tag-item">
                        <span class="material-symbols-rounded">star</span> ${m.name}
                    </span>`
                ).join('');
                hasModelsOrCategories = true;
            }

            // Renderizar Categorías
            if (data.categories && data.categories.length > 0) {
                tagsHTML += data.categories.map(c => 
                    `<span class="watch-tag-item">
                        <span class="material-symbols-rounded">label</span> ${c.name}
                    </span>`
                ).join('');
                hasModelsOrCategories = true;
            }

            if (tagsHTML === '') {
                tagsContainer.innerHTML = '<span class="watch-tag-item" style="opacity: 0.5;">Sin modelos ni categorías</span>';
            } else {
                tagsContainer.innerHTML = tagsHTML;
            }
        }

        // --- DIV 5: ETIQUETAS LIBRES (Custom) ---
        const customTagsSection = document.getElementById('watch-custom-tags-section');
        const customTagsContainer = document.getElementById('watch-video-custom-tags-container');
        const tagsDivider = document.getElementById('watch-tags-divider');
        
        const customTags = data.tags || []; 

        if (customTagsSection && customTagsContainer) {
            if (customTags && customTags.length > 0) {
                let customTagsHTML = customTags.map(t => {
                    const tagName = (typeof t === 'object') ? t.name : t;
                    return `<span class="watch-tag-item">
                        <span class="material-symbols-rounded">tag</span> ${tagName}
                    </span>`;
                }).join('');

                customTagsContainer.innerHTML = customTagsHTML;
                customTagsSection.style.display = 'block';

                if (tagsDivider) {
                    tagsDivider.style.display = hasModelsOrCategories ? 'block' : 'none';
                }
            } else {
                customTagsSection.style.display = 'none';
            }
        }

        // --- EXTRA: COLOR DE HOVER DINÁMICO ---
        const primaryColor = data.dominant_color || data.color; 
        
        if (primaryColor) {
            const detailBoxes = document.querySelectorAll('.watch-details-box');
            
            detailBoxes.forEach(box => {
                if (primaryColor.startsWith('#') && primaryColor.length === 7) {
                    box.style.setProperty('--hover-bg-color', primaryColor + '1A');
                } else {
                    box.style.setProperty('--hover-bg-color', primaryColor);
                }
            });
        }
    }

    showError404(message = 'El video solicitado no fue encontrado.') {
        if (window.AppRouter && typeof window.AppRouter.renderHttpError === 'function') {
            window.AppRouter.renderHttpError(404, 'Video No Encontrado', message);
        } else if (this.container) {
            this.container.innerHTML = `
                <div class="component-message-layout" style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
                    <div class="component-message-box" style="text-align: center;">
                        <div class="component-message-icon-wrapper" style="margin-bottom: 16px;">
                            <span class="material-symbols-rounded component-message-icon" style="font-size: 48px; color: var(--text-secondary);">error</span>
                        </div>
                        <h1 class="component-message-title" style="font-size: 24px; margin-bottom: 8px;">Error 404</h1>
                        <p class="component-message-desc" style="color: var(--text-secondary);">${message}</p>
                    </div>
                </div>
            `;
        }
    }

    destroy() {
        if (this.playerSystem) {
            this.playerSystem.destroy();
            this.playerSystem = null;
        }
    }
}