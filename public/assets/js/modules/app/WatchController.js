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
                
                // Obtener las rutas desde la base de datos
                const hlsPath = response.data.hls_path;
                const fallbackPath = response.data.temp_file_path;
                let videoSourceUrl = '';
                
                // Armar la URL absoluta concatenando tu AppBasePath (ej. http://192.168.8.13/ProjectRosaura)
                if (hlsPath) {
                    const cleanPath = hlsPath.startsWith('/') ? hlsPath : '/' + hlsPath;
                    videoSourceUrl = window.AppBasePath + cleanPath;
                } else if (fallbackPath) {
                    const cleanPath = fallbackPath.startsWith('/') ? fallbackPath : '/' + fallbackPath;
                    videoSourceUrl = window.AppBasePath + cleanPath;
                }

                if (videoSourceUrl !== '') {
                    this.playerSystem.loadVideo(videoSourceUrl);
                } else {
                    console.error('[WatchController] El video no tiene una ruta HLS o MP4 válida generada.');
                }

            } else {
                this.showError404(response.message || 'El video que buscas no existe o es privado.');
            }
        } catch (error) {
            console.error('[WatchController] Error fetching video:', error);
            this.showError404('Ocurrió un error de red al intentar cargar el video.');
        }
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
                    // Extraer nombre por si viene como objeto {name: '...'} o string directo
                    const tagName = (typeof t === 'object') ? t.name : t;
                    return `<span class="watch-tag-item">
                        <span class="material-symbols-rounded">tag</span> ${tagName}
                    </span>`;
                }).join('');

                customTagsContainer.innerHTML = customTagsHTML;
                customTagsSection.style.display = 'block';

                // Si no hubo modelos ni categorías, ocultamos la línea divisora superior para mantener estética
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