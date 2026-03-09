// public/assets/js/modules/app/WatchController.js

import { ApiService } from '../../core/api/ApiServices.js';

export class WatchController {
    constructor() {
        this.container = document.querySelector('.view-content');
        this.api = new ApiService();
    }

    async init() {
        // 1. Extraer el ID del video directamente de la URL
        const urlPath = window.location.pathname;
        const pathSegments = urlPath.split('/');
        
        // Buscar dónde está "watch" y tomar el siguiente segmento como ID
        const watchIndex = pathSegments.indexOf('watch');
        const videoId = (watchIndex !== -1 && pathSegments.length > watchIndex + 1) 
                        ? pathSegments[watchIndex + 1] 
                        : null;

        // 2. Revisar si viene de una playlist mediante parámetros URL (ej: ?list=abc-123)
        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = urlParams.get('list');

        // Validar que realmente se capturó un ID
        if (!videoId) {
            this.showError404('Identificador de video no proporcionado en la URL.');
            return;
        }

        // 3. Hacer la petición real a la API pública
        try {
            // Llamamos al nuevo endpoint público
            const response = await this.api.post('app.get_video_details', { video_uuid: videoId });

            if (response && response.success) {
                this.renderRealData(response.data, playlistId);
            } else {
                // Si la API dice success: false, forzamos el 404
                this.showError404(response.message || 'El video que buscas no existe o es privado.');
            }
        } catch (error) {
            console.error('[WatchController] Error fetching video:', error);
            this.showError404('Ocurrió un error de red al intentar cargar el video.');
        }
    }

    renderRealData(data, playlistId) {
        // Título del video
        const titleEl = document.getElementById('watch-video-title');
        if (titleEl) titleEl.textContent = data.title || 'Sin Título';

        // Fecha de publicación
        const dateEl = document.getElementById('watch-video-date');
        if (dateEl) {
            const pubDate = new Date(data.published_at || data.created_at);
            dateEl.textContent = pubDate.toLocaleDateString();
        }

        // Estado de la playlist
        const playlistEl = document.getElementById('watch-video-playlist-status');
        if (playlistEl) {
            if (playlistId) {
                playlistEl.innerHTML = `SÍ (ID Playlist: <strong style="color:var(--text-brand)">${playlistId}</strong>)`;
            } else {
                playlistEl.textContent = 'NO (Video individual)';
            }
        }

        // Etiquetas de modelos
        const modelsEl = document.getElementById('watch-video-models');
        if (modelsEl) {
            if (data.models && data.models.length > 0) {
                modelsEl.innerHTML = data.models.map(m => 
                    `<span style="background: var(--bg-surface); padding: 4px 8px; border-radius: 4px; font-size: 14px;">${m.name}</span>`
                ).join('');
            } else {
                modelsEl.innerHTML = '<span style="font-size: 14px; color: var(--text-secondary);">Ninguno</span>';
            }
        }

        // Etiquetas de categorías
        const categoriesEl = document.getElementById('watch-video-categories');
        if (categoriesEl) {
            if (data.categories && data.categories.length > 0) {
                categoriesEl.innerHTML = data.categories.map(c => 
                    `<span style="background: var(--bg-surface); padding: 4px 8px; border-radius: 4px; font-size: 14px;">${c.name}</span>`
                ).join('');
            } else {
                categoriesEl.innerHTML = '<span style="font-size: 14px; color: var(--text-secondary);">Sin categorías</span>';
            }
        }

        // Descripción
        const descEl = document.getElementById('watch-video-description');
        if (descEl) {
            descEl.textContent = data.description || 'Este video no tiene una descripción.';
        }
    }

    showError404(message = 'El video solicitado no fue encontrado.') {
        // Verificamos si el Enrutador SPA global tiene el nuevo método público de renderizado de errores
        if (window.AppRouter && typeof window.AppRouter.renderHttpError === 'function') {
            window.AppRouter.renderHttpError(404, 'Video No Encontrado', message);
        } else if (this.container) {
            // Fallback: Inyectarlo directamente en la vista si el router no está accesible
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
        // Lógica de limpieza cuando el usuario cambia de vista en tu SPA
    }
}