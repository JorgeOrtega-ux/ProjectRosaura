// public/assets/js/modules/app/FeedPlaylistsController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { PlaylistCardSystem } from '../../core/components/PlaylistCardSystem.js';

export class FeedPlaylistsController {
    constructor() {
        this.api = new ApiService();
        this.containerId = 'feed-playlists-grid';
    }

    destroy() {
        // Limpieza de eventos si los hubiera
    }

    async init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) return;

        await this.loadPlaylists();
    }

    async loadPlaylists() {
        try {
            // Buscamos la ruta en el mapa centralizado, si no existe usamos un fallback seguro
            const basePath = window.AppBasePath || '';
            const route = (ApiRoutes.App && ApiRoutes.App.GetAllPlaylists) 
                ? ApiRoutes.App.GetAllPlaylists 
                : `${basePath}/api/playlist/all`;
            
            const response = await this.api.post(route, {});
            
            if (response && response.success) {
                this.renderPlaylists(response.data);
            } else {
                if (response.code === 401) {
                    if (window.spaRouter) window.spaRouter.navigate(`${basePath}/login`);
                    else window.location.href = `${basePath}/login`;
                    return;
                }
                this.showError(response.message || 'No se pudieron cargar tus listas de reproducción.');
            }
        } catch (error) {
            console.error('[FeedPlaylistsController] Error cargando las playlists:', error);
            this.showError('Ocurrió un error de red al intentar cargar el contenido.');
        }
    }

    renderPlaylists(playlists) {
        if (!this.container) return;

        if (!playlists || playlists.length === 0) {
            this.container.innerHTML = `
                <div class="component-empty-state" style="grid-column: 1 / -1; margin-top: 40px;">
                    <span class="material-symbols-rounded component-empty-state-icon">playlist_remove</span>
                    <p class="component-empty-state-text">${__('feed_playlists_empty', 'Aún no tienes listas de reproducción.')}</p>
                </div>
            `;
            return;
        }

        this.container.innerHTML = '';
        
        playlists.forEach(playlist => {
            const cardHTML = PlaylistCardSystem.createCard(playlist);
            this.container.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    showError(msg) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="component-message-box" style="grid-column: 1 / -1; text-align: center; margin-top: 40px;">
                    <span class="material-symbols-rounded" style="font-size: 48px; color: var(--status-danger);">error</span>
                    <p class="component-text-notice component-text-notice--error" style="margin-top: 16px;">${msg}</p>
                </div>
            `;
        }
    }
}