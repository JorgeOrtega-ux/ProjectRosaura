// public/assets/js/core/api/ApiServices.js

import { ApiRoutes } from './ApiRoutes.js';

export class ApiService {
    constructor() {
        this.baseUrl = (window.AppBasePath || '') + '/api/index.php'; 
    }

    getAppLanguage() {
        if (window.AppUserPrefs && window.AppUserPrefs.language) {
            return window.AppUserPrefs.language;
        }
        const localLang = localStorage.getItem('pr_language');
        if (localLang) return localLang;
        return 'es-419';
    }

    async post(route, data = {}) {
        const payload = { route: route, ...data };
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';
        const currentLang = this.getAppLanguage();

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                    'X-App-Language': currentLang
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = (window.AppBasePath || '') + '/login';
                    return { success: false, message: 'Sesión revocada.' };
                }
                const rawErrorText = await response.text();
                try {
                    return JSON.parse(rawErrorText);
                } catch (jsonError) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
            }
            const rawText = await response.text();
            try {
                return JSON.parse(rawText);
            } catch (jsonError) {
                return { success: false, message: 'El servidor devolvió un formato inválido.' };
            }
        } catch (error) {
            return { success: false, message: 'Error de conexión con el servidor.' };
        }
    }

    async postForm(route, formData) {
        formData.append('route', route);
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';
        const currentLang = this.getAppLanguage();

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 
                    'X-CSRF-Token': csrfToken,
                    'X-App-Language': currentLang 
                },
                body: formData
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = (window.AppBasePath || '') + '/login';
                    return { success: false, message: 'Sesión revocada.' };
                }
                try { return await response.json(); } catch (jsonError) { throw new Error(`Error HTTP: ${response.status}`); }
            }
            return await response.json();
        } catch (error) {
            return { success: false, message: 'Error de conexión con el servidor.' };
        }
    }

    // --- MÉTODOS DE INTERACCIÓN Y VISITAS ---
    async postView(videoUuid) { return await this.post(ApiRoutes.Video.RegisterView, { video_uuid: videoUuid }); }
    async postLike(videoUuid, type) { return await this.post(ApiRoutes.Video.ToggleLike, { video_uuid: videoUuid, type: type }); }
    async postSubscribe(identifier) { return await this.post(ApiRoutes.Channel.ToggleSubscription, { identifier: identifier }); }

    // --- MÉTODOS DE PLAYLIST PARA WATCH ---
    async getPlaylistsForVideo(videoId) { return await this.post(ApiRoutes.Playlist.GetForVideo, { video_id: videoId }); }
    async toggleVideoInPlaylist(playlistUuid, videoId) { return await this.post(ApiRoutes.Playlist.ToggleVideo, { playlist_uuid: playlistUuid, video_id: videoId }); }
    async createPlaylist(title, visibility) { return await this.post(ApiRoutes.Playlist.Create, { title: title, visibility: visibility }); }
    
    // --- MÉTODOS DE RETENCIÓN DE VIDEO (HEATMAP) ---
    async sendRetentionBatch(videoId, data) { return await this.post(ApiRoutes.Metrics.IngestRetention, { videoId: videoId, data: data }); }

    // ---> AÑADIDO: MÉTODO DE ENVÍO DE TELEMETRÍA <---
    async sendTelemetryPing(videoUuid, watchTime, percentage) {
        return await this.post(ApiRoutes.Telemetry.Ping, {
            video_uuid: videoUuid,
            watch_time: watchTime,
            percentage: percentage
        });
    }

    async getVideoHeatmap(videoId) {
        const url = `${this.baseUrl}?route=${ApiRoutes.Metrics.GetRetention}&videoId=${videoId}`;
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';
        const currentLang = this.getAppLanguage();

        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-Token': csrfToken,
                    'X-App-Language': currentLang
                }
            });
            if (!response.ok) return { success: false, data: [] };
            return await response.json();
        } catch (error) {
            return { success: false, data: [] };
        }
    }

    async getMediaToken(videoUuid) { return await this.post(ApiRoutes.Media.GetMediaToken, { video_uuid: videoUuid }); }

    uploadFileWithProgress(route, file, inputName, extraData = {}, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('route', route);
            formData.append(inputName, file);
            for (const key in extraData) formData.append(key, extraData[key]);

            const xhr = new XMLHttpRequest();
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';
            const currentLang = this.getAppLanguage();

            xhr.open('POST', this.baseUrl, true);
            xhr.withCredentials = true; 
            if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);
            xhr.setRequestHeader('X-App-Language', currentLang);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject('Error parseando JSON'); }
                } else {
                    try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(`Error HTTP: ${xhr.status}`); }
                }
            };
            xhr.onerror = () => reject('Error de red durante la subida');
            xhr.send(formData);
        });
    }

    async toggleSubscription(username) { return await this.post(ApiRoutes.Channel.ToggleSubscription, { identifier: username }); }
    async fetchModels() { return await this.post(ApiRoutes.Studio.GetModels); }
    async fetchCategories() { return await this.post(ApiRoutes.Studio.GetCategories); }

    async uploadFileInChunks(route, file, inputName, extraData = {}, onProgress) {
        const chunkSize = 10 * 1024 * 1024; 
        const totalChunks = Math.ceil(file.size / chunkSize);
        const uploadId = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
        let finalResponse = null;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append('route', route);
            formData.append(inputName, chunk, file.name);
            formData.append('upload_id', uploadId);
            formData.append('chunk_index', chunkIndex);
            formData.append('total_chunks', totalChunks);
            formData.append('original_filename', file.name);

            for (const key in extraData) formData.append(key, extraData[key]);

            finalResponse = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                const currentLang = this.getAppLanguage();

                xhr.open('POST', this.baseUrl, true);
                xhr.withCredentials = true;
                if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                xhr.setRequestHeader('X-App-Language', currentLang);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const chunkPercent = event.loaded / event.total;
                        onProgress(Math.round(((chunkIndex + chunkPercent) / totalChunks) * 100));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject('Error parseando JSON'); }
                    } else {
                        try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(`Error HTTP: ${xhr.status}`); }
                    }
                };
                xhr.onerror = () => reject('Error de red durante la subida');
                xhr.send(formData);
            });

            if (finalResponse && finalResponse.status === 'error') return finalResponse; 
        }
        return finalResponse;
    }

    async fetchAllVideos() { return await this.post(ApiRoutes.Studio.GetAllVideos); }
    async fetchPlaylistVideos(playlistId) { return await this.post(ApiRoutes.Studio.GetPlaylistVideos, { playlist_id: playlistId }); }
    async syncPlaylistVideos(playlistId, videoIdsArray) { return await this.post(ApiRoutes.Studio.SyncPlaylistVideos, { playlist_id: playlistId, video_ids: videoIdsArray }); }
    async getPlaylistDetails(playlistId) { return await this.post(ApiRoutes.App.GetPlaylistDetails, { id: playlistId }); }
    async getPlaylistQueue(playlistUuid) { return await this.post(ApiRoutes.App.GetPlaylistQueue, { playlist_uuid: playlistUuid }); }
    
    async getWatchHistory(page = 1) { return await this.post(ApiRoutes.History.GetWatch, { page: page }); }
    async getSearchHistory(page = 1) { return await this.post(ApiRoutes.History.GetSearch, { page: page }); }
    async clearWatchHistory() { return await this.post(ApiRoutes.History.ClearWatch); }
    async clearSearchHistory() { return await this.post(ApiRoutes.History.ClearSearch); }
    async removeWatchItem(videoId) { return await this.post(ApiRoutes.History.RemoveWatchItem, { video_id: videoId }); }
    async removeSearchItem(searchId) { return await this.post(ApiRoutes.History.RemoveSearchItem, { search_id: searchId }); }

    // --- MÉTODOS DE RANKING ---
    async getTopRankings() { return await this.post(ApiRoutes.Rankings.GetAll); }
    
    async getChannelRanking(userId) { 
        const url = `${this.baseUrl}?route=${ApiRoutes.Rankings.GetChannel}&user_id=${userId}`;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'X-CSRF-Token': csrfToken, 'X-App-Language': this.getAppLanguage() }
            });
            if (!response.ok) return { success: false };
            return await response.json();
        } catch (error) {
            return { success: false };
        }
    }
}