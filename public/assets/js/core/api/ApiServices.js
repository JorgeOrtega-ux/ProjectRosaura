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

                // Intentamos extraer el mensaje de error del backend (ej. error 400, 403, etc.)
                try {
                    const errorData = await response.json();
                    return errorData;
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
                headers: {
                    'X-CSRF-Token': csrfToken
                },
                body: formData
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = (window.AppBasePath || '') + '/login';
                    return { success: false, message: 'Sesión revocada.' };
                }

                // Intentamos extraer el mensaje de error del backend
                try {
                    const errorData = await response.json();
                    return errorData;
                } catch (jsonError) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
            }

            return await response.json();
        } catch (error) {
            console.error(`[ApiService] Fallo en FormData hacia '${route}':`, error);
            return { success: false, message: 'Error de conexión con el servidor. Verifica la consola.' };
        }
    }

    uploadFileWithProgress(route, file, inputName, extraData = {}, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('route', route);
            formData.append(inputName, file);
            
            for (const key in extraData) {
                formData.append(key, extraData[key]);
            }

            const xhr = new XMLHttpRequest();
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

            xhr.open('POST', this.baseUrl, true);
            if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    if (onProgress) onProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject('Error parseando JSON');
                    }
                } else {
                    // Si el servidor devolvió un error (ej. 400), intentamos leer el JSON
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response); // Lo resolvemos para que el controlador pueda leer success: false y el message
                    } catch (e) {
                        reject(`Error HTTP: ${xhr.status}`);
                    }
                }
            };

            xhr.onerror = () => reject('Error de red durante la subida');
            xhr.send(formData);
        });
    }
}