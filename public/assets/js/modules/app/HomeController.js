// public/assets/js/modules/app/HomeController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class HomeController {
    constructor() {
        this.api = new ApiService();
        this.container = document.getElementById('video-feed-container');
    }

    async init() {
        if (this.container) {
            await this.loadFeed();
        }
    }

    async loadFeed() {
        try {
            const response = await this.api.post(ApiRoutes.App.GetFeed, { limit: 20, offset: 0 });
            
            if (response && response.success) {
                this.renderFeed(response.data);
            } else {
                this.showError('No se pudieron cargar los videos en este momento.');
            }
        } catch (error) {
            console.error('Error cargando el feed:', error);
            this.showError('Ocurrió un error de red al intentar cargar el contenido.');
        }
    }

    renderFeed(videos) {
        if (!videos || videos.length === 0) {
            this.container.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">videocam_off</span>
                    <p class="component-empty-state-text">No hay videos publicados aún. ¡Sé el primero en subir uno!</p>
                </div>
            `;
            return;
        }

        let html = '';
        videos.forEach(video => {
            html += this.createCardHTML(video);
        });

        this.container.innerHTML = html;
    }

    createCardHTML(video) {
        const title = video.title || 'Video sin título';
        const views = video.views || 0;
        const timeAgo = this.timeSince(new Date(video.created_at));

        return `
            <div class="video-card" onclick="window.location.href='${window.AppBasePath || ''}/watch/${video.uuid}'">
                <div class="video-card__top">
                    <img src="${video.thumbnail_url}" alt="Miniatura de ${title}" class="video-card__thumbnail" loading="lazy">
                </div>
                <div class="video-card__bottom">
                    <div class="video-card__avatar">
                        <img src="${video.avatar_url}" alt="Perfil de ${video.username}" loading="lazy">
                    </div>
                    <div class="video-card__info">
                        <h3 class="video-card__title" title="${title}">${title}</h3>
                        <p class="video-card__user">${video.username}</p>
                        <p class="video-card__meta">${views} vistas • ${timeAgo}</p>
                    </div>
                </div>
            </div>
        `;
    }

    showError(msg) {
        this.container.innerHTML = `<p class="component-text-notice component-text-notice--error">${msg}</p>`;
    }

    timeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " años";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " meses";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " días";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " horas";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutos";
        return "Hace unos instantes";
    }
}