// public/assets/js/core/api/ApiServices.js

import { ApiRoutes } from './ApiRoutes.js';

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
                
                // Leemos como texto primero para poder debugear errores HTTP
                const rawErrorText = await response.text();
                try {
                    return JSON.parse(rawErrorText);
                } catch (jsonError) {
                    console.error(`🚨 [ApiService] HTTP ${response.status} en '${route}'. Respuesta cruda:`, rawErrorText);
                    throw new Error(`Error HTTP: ${response.status}`);
                }
            }

            // -------------------------------------------------------------
            // 🔥 AQUÍ ESTÁ EL LOG DIAGNÓSTICO 🔥
            // 1. Leemos la respuesta como texto plano primero
            const rawText = await response.text();
            
            try {
                // 2. Intentamos convertir ese texto a JSON
                return JSON.parse(rawText);
            } catch (jsonError) {
                // 3. Si falla, imprimimos EXACTAMENTE qué devolvió PHP
                console.error(`🚨 [ApiService] ERROR DE SINTAXIS JSON en la ruta: '${route}'`);
                console.error(`👉 EL SERVIDOR DEVOLVIÓ ESTO (mira lo que hay antes o después de las llaves {}): \n`, rawText);
                
                return { success: false, message: 'El servidor devolvió un formato inválido. Revisa la consola.' };
            }
            // -------------------------------------------------------------

        } catch (error) {
            console.error(`[ApiService] Fallo general hacia '${route}':`, error);
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

    // --- MÉTODOS DE INTERACCIÓN Y VISITAS ---
    async postView(videoUuid) {
        return await this.post(ApiRoutes.Video.RegisterView, { video_uuid: videoUuid });
    }

    async postLike(videoUuid, type) {
        return await this.post(ApiRoutes.Video.ToggleLike, { video_uuid: videoUuid, type: type });
    }

    async postSubscribe(identifier) {
        return await this.post(ApiRoutes.Channel.ToggleSubscription, { identifier: identifier });
    }

    // --- MÉTODOS DE RETENCIÓN DE VIDEO (HEATMAP) ---
    async sendRetentionBatch(videoId, data) {
        return await this.post(ApiRoutes.Metrics.IngestRetention, { videoId: videoId, data: data });
    }

    async getVideoHeatmap(videoId) {
        // En este caso forzamos la petición por GET mediante query params ya que el PHP lo lee por $_GET
        const url = `${this.baseUrl}?route=${ApiRoutes.Metrics.GetRetention}&videoId=${videoId}`;
        
        // EXTRAEMOS EL TOKEN CSRF (Esta es la corrección al Error 403)
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        try {
            // AÑADIMOS LOS HEADERS A LA PETICIÓN FETCH
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-CSRF-Token': csrfToken
                }
            });
            
            if (!response.ok) return { success: false, data: [] };
            return await response.json();
        } catch (error) {
            console.error("[ApiService] Error fetching heatmap:", error);
            return { success: false, data: [] };
        }
    }

    async getMediaToken(videoUuid) {
        return await this.post(ApiRoutes.Media.GetMediaToken, { video_uuid: videoUuid });
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

    // Nota: Mantenemos este por retrocompatibilidad si algún archivo viejo lo usa, 
    // pero el nuevo estándar es postSubscribe(identifier)
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

    async fetchAllVideos() { return await this.post(ApiRoutes.Studio.GetAllVideos); }
    async fetchPlaylistVideos(playlistId) { return await this.post(ApiRoutes.Studio.GetPlaylistVideos, { playlist_id: playlistId }); }
    async syncPlaylistVideos(playlistId, videoIdsArray) { return await this.post(ApiRoutes.Studio.SyncPlaylistVideos, { playlist_id: playlistId, video_ids: videoIdsArray }); }
    async getPlaylistDetails(playlistId) { return await this.post(ApiRoutes.App.GetPlaylistDetails, { id: playlistId }); }
    async getPlaylistQueue(playlistUuid) { return await this.post(ApiRoutes.App.GetPlaylistQueue, { playlist_uuid: playlistUuid }); }
}