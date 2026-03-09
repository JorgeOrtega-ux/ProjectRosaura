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

    resolveThumbUrl(pathOrUrl) {
        const basePath = window.AppBasePath || '';
        if (!pathOrUrl) return `${basePath}/public/assets/img/default_thumb.jpg`;
        if (pathOrUrl.startsWith('http')) return pathOrUrl;
        
        let cleanPath = pathOrUrl.replace(/^\//, '');
        let baseNoSlash = basePath.replace(/^\//, '');
        if (baseNoSlash && cleanPath.startsWith(baseNoSlash + '/')) {
            cleanPath = cleanPath.substring(baseNoSlash.length + 1);
        }
        return `${basePath}/${cleanPath}`;
    }

    renderDetails(playlist) {
        if (!this.detailsContainer || !playlist) return;

        const title = playlist.title || 'Lista sin título';
        const description = playlist.description || 'Sin descripción';
        const videoCount = playlist.video_count || 0;
        const author = playlist.username || 'Usuario desconocido';
        const firstVideoUuid = playlist.first_video_uuid || null; 

        const basePath = window.AppBasePath || '';

        const playAllAction = firstVideoUuid 
            ? `onclick="window.spaRouter.navigate('${basePath}/watch/${firstVideoUuid}?list=${this.playlistId}')"` 
            : 'disabled';

        const thumbSrc = this.resolveThumbUrl(playlist.thumbnail_url || playlist.thumbnail_path);

        this.detailsContainer.innerHTML = `
            <img src="${thumbSrc}" alt="Miniatura de ${title}" class="playlist-sidebar-thumb">
            
            <h1 class="playlist-sidebar-title">${title}</h1>
            
            <p class="playlist-sidebar-author">${author}</p>
            
            <div class="playlist-sidebar-meta">
                <span>${videoCount} videos</span>
                <span>•</span>
                <span>Actualizada recientemente</span>
            </div>

            <div class="playlist-sidebar-actions">
                <button ${playAllAction} class="playlist-btn-play">
                    <span class="material-symbols-rounded">play_arrow</span> Reproducir todo
                </button>
            </div>

            <p class="playlist-sidebar-desc">${description}</p>
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

            const thumbSrc = this.resolveThumbUrl(video.thumbnail_url || video.thumbnail_path);
            const clickAction = `window.spaRouter.navigate('${basePath}/watch/${video.uuid}?list=${this.playlistId}')`;

            html += `
                <div class="playlist-video-item" onclick="${clickAction}">
                    
                    <div class="playlist-video-item-index">
                        ${index + 1}
                    </div>
                    
                    <div class="playlist-video-item-thumbnail">
                        <img src="${thumbSrc}" alt="${title}">
                        <span class="playlist-video-item-duration">${duration}</span>
                    </div>
                    
                    <div class="playlist-video-item-info">
                        <h3 class="playlist-video-item-title">${title}</h3>
                        <p class="playlist-video-item-meta">${author}</p>
                        <p class="playlist-video-item-meta">${views} vistas</p>
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