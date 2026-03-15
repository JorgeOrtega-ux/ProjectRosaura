// public/assets/js/modules/app/FeedPlaylistsController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { PlaylistCardSystem } from './PlaylistCardSystem.js';

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
            // Utilizamos la ruta correctamente declarada en ApiRoutes
            const route = ApiRoutes.Playlist.GetAllPlaylists;
            
            // Hacemos el post mandando el objeto vacío (el backend no necesita parámetros extra aquí)
            const response = await this.api.post(route, {});
            
            if (response && response.success) {
                this.renderPlaylists(response.data);
            } else {
                if (response.code === 401) {
                    const basePath = window.AppBasePath || '';
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

        // NUEVO: Ejecutamos el extractor de colores para pintar las pestañas acordes al video
        this.extractDominantColors();
    }

    // Método para extraer el color promedio de la imagen de cada miniatura
    extractDominantColors() {
        if (!this.container) return;
        
        const cards = this.container.querySelectorAll('.playlist-folder-style');
        
        cards.forEach(card => {
            const img = card.querySelector('.component-video-card__thumbnail');
            
            // Si la playlist tiene un color ya asignado en duro por HTML (ej. desde BD), lo omitimos
            if (card.style.getPropertyValue('--local-dominant-color')) return;

            if (img && img.src) {
                // Creamos una imagen virtual en memoria para evitar modificar el DOM
                // y prevenir que problemas de Cross-Origin rompan la UI
                const memImg = new Image();
                memImg.crossOrigin = 'Anonymous';
                
                memImg.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        // Truco de rendimiento: Comprimir todo a 1x1 interpola todos los colores
                        // dándonos de forma instantánea el color promedio real
                        canvas.width = 1;
                        canvas.height = 1;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(memImg, 0, 0, 1, 1);
                        
                        const data = ctx.getImageData(0, 0, 1, 1).data;
                        
                        // Si no es un pixel totalmente transparente, aplicamos el color
                        if (data[3] > 0) {
                            const color = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
                            card.style.setProperty('--local-dominant-color', color);
                        }
                    } catch (e) {
                        // Si ocurre un error de CORS o similar, lo ignoramos de forma segura.
                        // El sistema usará el gris de respaldo del CSS nativamente.
                        console.warn('[FeedPlaylistsController] Aviso: No se pudo procesar el color de la miniatura.', e);
                    }
                };
                
                memImg.src = img.src;
            }
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