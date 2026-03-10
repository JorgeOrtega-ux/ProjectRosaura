// public/assets/js/core/api/ApiServices.js

export class ApiService {
    constructor() {
        this.baseUrl = (window.AppBasePath || '') + '/api/index.php'; 
    }

    async post(route, data = {}) {
        const payload = {
            route: route,
            ...data
        };

        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = (window.AppBasePath || '') + '/login';
                    return { success: false, message: 'Sesión revocada.' };
                }
                try {
                    return await response.json();
                } catch (jsonError) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
            }

            return await response.json();
        } catch (error) {
            console.error(`[ApiService] Fallo en JSON hacia '${route}':`, error);
            return { success: false, message: 'Error de conexión con el servidor. Verifica la consola.' };
        }
    }

    async postForm(route, formData) {
        formData.append('route', route);
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrfToken },
                body: formData
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = (window.AppBasePath || '') + '/login';
                    return { success: false, message: 'Sesión revocada.' };
                }
                try {
                    return await response.json();
                } catch (jsonError) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
            }
            return await response.json();
        } catch (error) {
            console.error(`[ApiService] Fallo en FormData hacia '${route}':`, error);
            return { success: false, message: 'Error de conexión con el servidor.' };
        }
    }

    // --- NUEVO MÉTODO PARA OBTENER TOKEN DE VIDEO ---
    async getMediaToken(videoUuid) {
        return await this.post('media.get_token', { video_uuid: videoUuid });
    }

    uploadFileWithProgress(route, file, inputName, extraData = {}, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('route', route);
            formData.append(inputName, file);
            for (const key in extraData) formData.append(key, extraData[key]);

            const xhr = new XMLHttpRequest();
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

            xhr.open('POST', this.baseUrl, true);
            if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    if (onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try { resolve(JSON.parse(xhr.responseText)); } 
                    catch (e) { reject('Error parseando JSON'); }
                } else {
                    try { resolve(JSON.parse(xhr.responseText)); } 
                    catch (e) { reject(`Error HTTP: ${xhr.status}`); }
                }
            };
            xhr.onerror = () => reject('Error de red durante la subida');
            xhr.send(formData);
        });
    }

    async toggleSubscription(username) { return await this.post('channel.toggle_subscription', { username }); }
    async fetchModels() { return await this.post('studio.get_models'); }
    async fetchCategories() { return await this.post('studio.get_categories'); }

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

                xhr.open('POST', this.baseUrl, true);
                if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const chunkPercent = event.loaded / event.total;
                        onProgress(Math.round(((chunkIndex + chunkPercent) / totalChunks) * 100));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); } 
                        catch (e) { reject('Error parseando JSON'); }
                    } else {
                        try { resolve(JSON.parse(xhr.responseText)); } 
                        catch (e) { reject(`Error HTTP: ${xhr.status}`); }
                    }
                };
                xhr.onerror = () => reject('Error de red durante la subida');
                xhr.send(formData);
            });

            if (finalResponse && finalResponse.status === 'error') return finalResponse; 
        }
        return finalResponse;
    }

    async fetchAllVideos() { return await this.post('studio.get_all_videos'); }
    async fetchPlaylistVideos(playlistId) { return await this.post('studio.get_playlist_videos', { playlist_id: playlistId }); }
    async syncPlaylistVideos(playlistId, videoIdsArray) { return await this.post('studio.sync_playlist_videos', { playlist_id: playlistId, video_ids: videoIdsArray }); }
    async getPlaylistDetails(playlistId) { return await this.post('app.get_playlist_details', { id: playlistId }); }
}