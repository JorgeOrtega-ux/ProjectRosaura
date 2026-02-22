// public/assets/js/core/api-services.js

export class ApiService {
    constructor() {
        // Apuntamos al nuevo receptor central del backend
        this.baseUrl = '/ProjectRosaura/api/endpoint.php';
    }

    /**
     * @param {string} route - La ruta con notación de punto (ej. 'auth.login')
     * @param {object} data - Los parámetros
     */
    async post(route, data = {}) {
        // Formamos el JSON exactamente como lo espera endpoint.php
        const payload = {
            route: route,
            ...data
        };

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
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