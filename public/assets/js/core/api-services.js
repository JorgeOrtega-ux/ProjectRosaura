// public/assets/js/core/api-services.js

export class ApiService {
    constructor() {
        // Apuntamos al nuevo receptor central del backend (index.php)
        this.baseUrl = '/ProjectRosaura/api/index.php'; 
    }

    /**
     * @param {string} route - La ruta con notación de punto (ej. 'auth.login')
     * @param {object} data - Los parámetros
     */
    async post(route, data = {}) {
        // Formamos el JSON exactamente como lo espera index.php
        const payload = {
            route: route,
            ...data
        };

        // Obtenemos el token CSRF inyectado en el HTML
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken // Enviamos el token en las cabeceras
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Si el servidor responde 403 (Token inválido), podemos capturarlo aquí
                if (response.status === 403) {
                    const errorData = await response.json();
                    return errorData; 
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[ApiService] Fallo en la petición a '${route}':`, error);
            return {
                success: false,
                message: 'Error de conexión con el servidor. Inténtalo de nuevo.'
            };
        }
    }
}