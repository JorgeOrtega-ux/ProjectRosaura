// public/assets/js/core/api-services.js

export class ApiService {
    constructor() {
        this.baseUrl = '/ProjectRosaura/api/index.php'; 
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
                // Interceptar explícitamente el 401 (Sesión Revocada)
                if (response.status === 401) {
                    window.location.href = '/ProjectRosaura/login';
                    return { success: false, message: 'Sesión revocada.' };
                }

                if (response.status === 403) return await response.json(); 
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[ApiService] Fallo en JSON hacia '${route}':`, error);
            return { success: false, message: 'Error de conexión con el servidor.' };
        }
    }

    // MÉTODO PARA ENVIAR FORMDATA (Archivos)
    async postForm(route, formData) {
        // Añadimos la ruta al FormData
        formData.append('route', route);
        
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    // Importante: No establecer Content-Type, el navegador lo genera con el boundary
                    'X-CSRF-Token': csrfToken
                },
                body: formData
            });

            if (!response.ok) {
                // Interceptar explícitamente el 401 (Sesión Revocada)
                if (response.status === 401) {
                    window.location.href = '/ProjectRosaura/login';
                    return { success: false, message: 'Sesión revocada.' };
                }

                if (response.status === 403) return await response.json(); 
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[ApiService] Fallo en FormData hacia '${route}':`, error);
            return { success: false, message: 'Error de conexión con el servidor.' };
        }
    }
}