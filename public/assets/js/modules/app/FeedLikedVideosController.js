// public/assets/js/modules/app/FeedLikedVideosController.js

import { ApiService } from '../../core/api/ApiServices.js';

export class FeedLikedVideosController {
    constructor() {
        this.container = document.getElementById('view-liked-videos');
        this.listContainer = document.getElementById('liked-videos-container');
        this.loader = document.getElementById('liked-videos-loader');
        this.emptyState = document.getElementById('liked-videos-empty');
        this.api = new ApiService();
    }

    async init() {
        try {
            // Utilizamos el endpoint de detalles de playlist pasando el alias 'LV' que hemos creado en el Backend.
            const response = await this.api.post('app.get_playlist_details', { id: 'LV' });
            
            if (response && response.success && response.data) {
                const videos = response.data.videos || [];
                const playlist = response.data.playlist || {};
                
                this.loader.classList.add('hidden');
                
                if (videos.length === 0) {
                    this.emptyState.classList.remove('hidden');
                } else {
                    this.renderVideos(videos, playlist.uuid);
                    this.listContainer.classList.remove('hidden');
                }
            } else {
                this.showError('No se pudo cargar la lista de videos que te gustan.');
            }
        } catch (error) {
            console.error('[FeedLikedVideosController] Error:', error);
            this.showError('Ocurrió un error de red al contactar al servidor.');
        }
    }

    renderVideos(videos, playlistUuid) {
        let html = '';
        const basePath = window.AppBasePath || '';
        
        videos.forEach((video, index) => {
            const title = video.title || 'Video sin título';
            const channelName = video.username || 'Usuario';
            
            let duration = '00:00';
            if (video.duration) {
                const totalSeconds = parseInt(video.duration, 10);
                const m = Math.floor(totalSeconds / 60);
                const s = totalSeconds % 60;
                duration = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            
            const thumbUrl = video.thumbnail_path 
                ? `${basePath}/${video.thumbnail_path}` 
                : `${basePath}/public/assets/images/default-thumb.png`;
                
            // Usamos el UUID de la playlist 'LV' si existe, o 'LV' si falta para que WatchController lo procese
            const listParam = playlistUuid || 'LV';
            const watchUrl = `${basePath}/watch/${video.uuid}?list=${listParam}`;
            
            html += `
                <a href="${watchUrl}" class="component-video-card component-video-card--horizontal nav-item" style="display: flex; gap: 16px; margin-bottom: 16px; text-decoration: none; color: inherit;" onclick="event.preventDefault(); window.spaRouter.navigate('${watchUrl}');">
                    <div class="component-video-card__index" style="display: flex; align-items: center; justify-content: center; width: 32px; color: var(--text-secondary); font-weight: 500; font-size: 14px;">
                        ${index + 1}
                    </div>
                    <div class="component-video-card__thumbnail-container" style="position: relative; width: 160px; min-width: 160px; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; background-color: #222;">
                        <img src="${thumbUrl}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;">
                        <span class="component-video-card__duration" style="position: absolute; bottom: 4px; right: 4px; background-color: rgba(0,0,0,0.8); color: white; font-size: 12px; padding: 2px 4px; border-radius: 4px;">
                            ${duration}
                        </span>
                    </div>
                    <div class="component-video-card__info" style="display: flex; flex-direction: column; justify-content: flex-start; padding-top: 4px;">
                        <h3 class="component-video-card__title" style="font-size: 16px; font-weight: 500; margin: 0 0 6px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.4;">
                            ${title}
                        </h3>
                        <div class="component-video-card__meta" style="font-size: 13px; color: var(--text-secondary);">
                            <span style="display: block;">${channelName}</span>
                        </div>
                    </div>
                </a>
            `;
        });
        
        this.listContainer.innerHTML = html;
    }

    showError(message) {
        this.loader.classList.add('hidden');
        this.emptyState.classList.remove('hidden');
        this.emptyState.innerHTML = `
            <span class="material-symbols-rounded component-empty-state__icon" style="color: var(--status-danger);">error_outline</span>
            <h3 class="component-empty-state__title">Vaya, algo salió mal</h3>
            <p class="component-empty-state__text">${message}</p>
        `;
    }

    destroy() {
        this.container = null;
        this.listContainer = null;
        this.api = null;
    }
}