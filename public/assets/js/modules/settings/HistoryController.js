// public/assets/js/modules/settings/HistoryController.js

import { ApiService } from '../../core/api/ApiServices.js';

export class HistoryController {
    constructor() {
        this.api = new ApiService();
        this.currentTab = 'watch-history';
        
        // Paginación
        this.watchPage = 1;
        this.searchPage = 1;
        this.hasMoreWatch = true;
        this.hasMoreSearch = true;
        this.isLoading = false;

        // Elementos del DOM
        this.tabs = document.querySelectorAll('.component-toolbar__tab');
        this.watchContainer = document.getElementById('watch-history-container');
        this.searchContainer = document.getElementById('search-history-container');
        this.watchList = document.getElementById('watch-history-list');
        this.searchList = document.getElementById('search-history-list');
        this.btnClear = document.getElementById('btn-clear-history');
        this.watchLoading = document.getElementById('watch-loading');
        this.searchLoading = document.getElementById('search-loading');
    }

    init() {
        this.bindEvents();
        this.loadWatchHistory();
        this.loadSearchHistory();
        this.setupInfiniteScroll();
    }

    destroy() {
        window.removeEventListener('scroll', this.scrollHandler);
    }

    bindEvents() {
        // Cambio de pestañas
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                this.currentTab = e.currentTarget.getAttribute('data-tab');
                
                if (this.currentTab === 'watch-history') {
                    this.watchContainer.style.display = 'block';
                    this.searchContainer.style.display = 'none';
                } else {
                    this.watchContainer.style.display = 'none';
                    this.searchContainer.style.display = 'block';
                }
            });
        });

        // Botón Borrar Historial
        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => this.clearCurrentHistory());
        }

        // Delegación de eventos para botones de eliminar individuales
        document.addEventListener('click', (e) => {
            const btnRemoveWatch = e.target.closest('.btn-remove-watch');
            if (btnRemoveWatch) {
                const videoId = btnRemoveWatch.getAttribute('data-id');
                this.removeWatchItem(videoId, btnRemoveWatch.closest('.history-card'));
            }

            const btnRemoveSearch = e.target.closest('.btn-remove-search');
            if (btnRemoveSearch) {
                const searchId = btnRemoveSearch.getAttribute('data-id');
                this.removeSearchItem(searchId, btnRemoveSearch.closest('.history-search-item'));
            }
        });
    }

    setupInfiniteScroll() {
        this.scrollHandler = () => {
            if (this.isLoading) return;
            
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - 200) {
                if (this.currentTab === 'watch-history' && this.hasMoreWatch) {
                    this.watchPage++;
                    this.loadWatchHistory();
                } else if (this.currentTab === 'search-history' && this.hasMoreSearch) {
                    this.searchPage++;
                    this.loadSearchHistory();
                }
            }
        };
        window.addEventListener('scroll', this.scrollHandler);
    }

    async loadWatchHistory() {
        if (this.isLoading || !this.hasMoreWatch) return;
        this.isLoading = true;
        if (this.watchLoading) this.watchLoading.style.display = 'block';

        const response = await this.api.getWatchHistory(this.watchPage);
        
        if (this.watchLoading) this.watchLoading.style.display = 'none';
        this.isLoading = false;

        if (response.success && response.data) {
            if (response.data.length === 0) {
                this.hasMoreWatch = false;
                if (this.watchPage === 1) {
                    this.watchList.innerHTML = '<div class="component-empty-state"><span class="material-symbols-rounded">history_toggle_off</span><p>No tienes videos en tu historial.</p></div>';
                }
            } else {
                response.data.forEach(video => {
                    this.watchList.insertAdjacentHTML('beforeend', this.createWatchCard(video));
                });
            }
        }
    }

    async loadSearchHistory() {
        if (this.isLoading || !this.hasMoreSearch) return;
        this.isLoading = true;
        if (this.searchLoading) this.searchLoading.style.display = 'block';

        const response = await this.api.getSearchHistory(this.searchPage);
        
        if (this.searchLoading) this.searchLoading.style.display = 'none';
        this.isLoading = false;

        if (response.success && response.data) {
            if (response.data.length === 0) {
                this.hasMoreSearch = false;
                if (this.searchPage === 1) {
                    this.searchList.innerHTML = '<div class="component-empty-state"><span class="material-symbols-rounded">search_off</span><p>No tienes búsquedas recientes.</p></div>';
                }
            } else {
                response.data.forEach(search => {
                    this.searchList.insertAdjacentHTML('beforeend', this.createSearchItem(search));
                });
            }
        }
    }

    async clearCurrentHistory() {
        if (!confirm('¿Estás seguro de que deseas borrar este historial? Esta acción no se puede deshacer.')) return;

        if (this.currentTab === 'watch-history') {
            const res = await this.api.clearWatchHistory();
            if (res.success) {
                this.watchList.innerHTML = '<div class="component-empty-state"><span class="material-symbols-rounded">history_toggle_off</span><p>Historial de reproducción borrado.</p></div>';
                this.hasMoreWatch = false;
            }
        } else {
            const res = await this.api.clearSearchHistory();
            if (res.success) {
                this.searchList.innerHTML = '<div class="component-empty-state"><span class="material-symbols-rounded">search_off</span><p>Historial de búsqueda borrado.</p></div>';
                this.hasMoreSearch = false;
            }
        }
    }

    async removeWatchItem(videoId, element) {
        element.style.opacity = '0.5';
        const res = await this.api.removeWatchItem(videoId);
        if (res.success) {
            element.remove();
        } else {
            element.style.opacity = '1';
        }
    }

    async removeSearchItem(searchId, element) {
        element.style.opacity = '0.5';
        const res = await this.api.removeSearchItem(searchId);
        if (res.success) {
            element.remove();
        } else {
            element.style.opacity = '1';
        }
    }

    createWatchCard(video) {
        const thumbUrl = video.thumbnail_path ? `${window.AppBasePath || ''}${video.thumbnail_path}` : '';
        const profileUrl = video.profile_picture ? `${window.AppBasePath || ''}${video.profile_picture}` : '';
        
        // Formatear duración
        const h = Math.floor(video.duration / 3600);
        const m = Math.floor((video.duration % 3600) / 60);
        const s = video.duration % 60;
        const durationStr = h > 0 ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}` : `${m}:${s < 10 ? '0' : ''}${s}`;

        // Formatear fecha
        const dateObj = new Date(video.last_watched_at);
        const dateStr = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

        return `
            <div class="history-card" style="display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-start; position: relative;">
                <a href="${window.AppBasePath || ''}/watch/${video.uuid}" class="history-card__thumb" style="width: 240px; flex-shrink: 0; position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 16/9; display: block; background-color: ${video.thumbnail_dominant_color || '#222'};">
                    <img src="${thumbUrl}" alt="Thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
                    <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 500;">${durationStr}</span>
                </a>
                <div class="history-card__info" style="flex-grow: 1; padding-right: 40px;">
                    <a href="${window.AppBasePath || ''}/watch/${video.uuid}" style="text-decoration: none; color: inherit;">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${video.title}</h3>
                    </a>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <img src="${profileUrl}" style="width: 24px; height: 24px; border-radius: 50%;">
                        <a href="${window.AppBasePath || ''}/@${video.channel_identifier}" style="color: var(--text-secondary); text-decoration: none; font-size: 14px;">${video.username}</a>
                        ${video.channel_verified == 1 ? '<span class="material-symbols-rounded" style="font-size: 14px; color: var(--text-secondary);">check_circle</span>' : ''}
                    </div>
                    <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Visto el ${dateStr}</p>
                </div>
                <button type="button" class="btn-remove-watch" data-id="${video.id}" style="position: absolute; right: 0; top: 0; background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 8px;">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
        `;
    }

    createSearchItem(search) {
        const dateObj = new Date(search.created_at);
        const dateStr = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

        return `
            <div class="history-search-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--border-color); border-radius: 8px; transition: background-color 0.2s;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <span class="material-symbols-rounded" style="color: var(--text-secondary);">history</span>
                    <div>
                        <a href="${window.AppBasePath || ''}/results?search_query=${encodeURIComponent(search.search_query)}" style="font-size: 16px; font-weight: 500; color: inherit; text-decoration: none; display: block; margin-bottom: 4px;">${search.search_query}</a>
                        <span style="font-size: 12px; color: var(--text-secondary);">${dateStr}</span>
                    </div>
                </div>
                <button type="button" class="btn-remove-search" data-id="${search.id}" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 8px; border-radius: 50%;">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
        `;
    }
}