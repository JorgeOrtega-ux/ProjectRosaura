// public/assets/js/modules/app/PlaylistController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class PlaylistController {
    constructor() {
        this.api = new ApiService();
        this.playlistId = null;
    }

    destroy() {
        // Limpieza de eventos si existieran listeners globales
    }

    async init() {
        this.detailsContainer = document.getElementById('playlist-details-container');
        this.videosContainer = document.getElementById('playlist-videos-container');
        
        // 1. Extraer el ID de la URL amigable (ej: /ProjectRosaura/playlist/UUID)
        const path = window.location.pathname;
        const match = path.match(/\/playlist\/([a-zA-Z0-9\-]+)/);
        
        if (match && match[1]) {
            this.playlistId = match[1];
        } else {
            // 2. Fallback de seguridad por si en algún momento usas query params (?list=UUID)
            const urlParams = new URLSearchParams(window.location.search);
            this.playlistId = urlParams.get('list');
        }

        if (!this.playlistId) {
            this.showError('No se especificó ninguna lista de reproducción.');
            return;
        }

        await this.loadPlaylist();
    }

    async loadPlaylist() {
        try {
            // Aseguramos que la ruta fallback contenga el basePath si la constante no existe aún
            const basePath = window.AppBasePath || '';
            const route = (ApiRoutes.App && ApiRoutes.App.GetPlaylistDetails) 
                ? ApiRoutes.App.GetPlaylistDetails 
                : `${basePath}/api/playlist/details`; // Asegúrate de que este string coincida con la ruta en tu route-map.php
            
            const response = await this.api.post(route, { id: this.playlistId });
            
            if (response && response.success) {
                this.renderDetails(response.data.playlist);
                this.renderVideos(response.data.videos);
            } else {
                this.showError('No se pudo cargar la lista de reproducción.');
            }
        } catch (error) {
            console.error('Error cargando la playlist:', error);
            this.showError('Ocurrió un error de red al intentar cargar el contenido.');
        }
    }

    renderDetails(playlist) {
        if (!this.detailsContainer || !playlist) return;

        const title = playlist.title || 'Lista sin título';
        const description = playlist.description || 'Sin descripción';
        const videoCount = playlist.video_count || 0;
        const author = playlist.username || 'Usuario desconocido';
        const firstVideoUuid = playlist.first_video_uuid || null; // Útil para "Reproducir todo"

        const basePath = window.AppBasePath || '';

        // CORRECCIÓN: Usar window.spaRouter y respetar la ruta amigable /watch/UUID
        const playAllAction = firstVideoUuid 
            ? `onclick="window.spaRouter.navigate('${basePath}/watch/${firstVideoUuid}?list=${this.playlistId}')"` 
            : 'disabled';

        this.detailsContainer.innerHTML = `
            <img src="${playlist.thumbnail_url}" alt="Miniatura de ${title}" style="width: 100%; border-radius: 12px; aspect-ratio: 16/9; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            
            <h1 style="font-size: 26px; font-weight: 700; margin: 8px 0 0 0; color: #fff;">${title}</h1>
            
            <p style="margin: 0; font-weight: 600; color: #fff; margin-top: 12px;">${author}</p>
            
            <div style="display: flex; align-items: center; gap: 6px; color: #aaa; font-size: 13px; margin-top: 4px;">
                <span>${videoCount} videos</span>
                <span>•</span>
                <span>Actualizada recientemente</span>
            </div>

            <div style="margin-top: 16px; display: flex; gap: 12px;">
                <button ${playAllAction} style="flex: 1; padding: 10px; border-radius: 24px; display: flex; justify-content: center; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; border: none; background-color: #fff; color: #0f0f0f; transition: background 0.2s;">
                    <span class="material-symbols-rounded" style="font-size: 20px;">play_arrow</span> Reproducir todo
                </button>
            </div>

            <p style="color: #ddd; font-size: 14px; margin-top: 16px; line-height: 1.5;">${description}</p>
        `;
    }

    renderVideos(videos) {
        if (!this.videosContainer) return;

        if (!videos || videos.length === 0) {
            this.videosContainer.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">videocam_off</span>
                    <p class="component-empty-state-text">Esta lista de reproducción no tiene videos aún.</p>
                </div>
            `;
            return;
        }

        const basePath = window.AppBasePath || '';
        let html = '';
        
        videos.forEach((video, index) => {
            const title = video.title || 'Video sin título';
            const views = video.views || 0;
            const duration = this.formatDuration(video.duration);
            const author = video.username || 'Desconocido';

            // CORRECCIÓN: Usar window.spaRouter y la ruta amigable /watch/UUID
            const clickAction = `window.spaRouter.navigate('${basePath}/watch/${video.uuid}?list=${this.playlistId}')`;

            html += `
                <div class="playlist-video-item" onclick="${clickAction}" style="display: flex; gap: 16px; padding: 8px; border-radius: 12px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                    
                    <div style="display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 14px; min-width: 24px;">
                        ${index + 1}
                    </div>
                    
                    <div style="position: relative; flex-shrink: 0;">
                        <img src="${video.thumbnail_url}" alt="${title}" style="width: 160px; height: 90px; border-radius: 8px; object-fit: cover;">
                        <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.8); color: white; padding: 2px 4px; border-radius: 4px; font-size: 12px; font-weight: 500;">${duration}</span>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; justify-content: flex-start; flex-grow: 1; padding-top: 2px;">
                        <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 500; color: #fff; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${title}</h3>
                        <p style="margin: 0; color: #aaa; font-size: 13px;">${author}</p>
                        <p style="margin: 2px 0 0 0; color: #aaa; font-size: 13px;">${views} vistas</p>
                    </div>

                </div>
            `;
        });

        this.videosContainer.innerHTML = html;
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

    showError(msg) {
        if (this.detailsContainer) {
            this.detailsContainer.innerHTML = `<p class="component-text-notice component-text-notice--error">${msg}</p>`;
        }
        if (this.videosContainer) {
            this.videosContainer.innerHTML = '';
        }
    }
}