export class WatchController {
    constructor() {
        this.container = document.querySelector('.view-content');
    }

    async init() {
        // 1. Extraer el ID del video directamente de la URL
        const urlPath = window.location.pathname;
        const pathSegments = urlPath.split('/');
        
        // Buscar dónde está "watch" y tomar el siguiente segmento como ID
        const watchIndex = pathSegments.indexOf('watch');
        const videoId = (watchIndex !== -1 && pathSegments.length > watchIndex + 1) 
                        ? pathSegments[watchIndex + 1] 
                        : 'ID_NO_ENCONTRADO';

        // 2. Revisar si viene de una playlist mediante parámetros URL (ej: ?list=abc-123)
        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = urlParams.get('list');

        // 3. Inyectar la información en la vista (Simulación para testing)
        this.renderTestingInfo(videoId, playlistId);
        
        // Aquí en el futuro harás el fetch() a tu API:
        // const response = await ApiServices.get(`/api/app/video/${videoId}`);
        // this.renderRealData(response.data);
    }

    renderTestingInfo(videoId, playlistId) {
        // Título temporal usando el ID
        const titleEl = document.getElementById('watch-video-title');
        if(titleEl) titleEl.textContent = `Video Test (ID: ${videoId})`;

        // Fecha actual como prueba
        const dateEl = document.getElementById('watch-video-date');
        if(dateEl) dateEl.textContent = new Date().toLocaleDateString();

        // Estado de la playlist
        const playlistEl = document.getElementById('watch-video-playlist-status');
        if(playlistEl) {
            if (playlistId) {
                playlistEl.innerHTML = `SÍ (ID Playlist: <strong style="color:var(--text-brand)">${playlistId}</strong>)`;
            } else {
                playlistEl.textContent = 'NO (Video individual)';
            }
        }

        // Simulación de etiquetas de modelos
        const modelsEl = document.getElementById('watch-video-models');
        if(modelsEl) {
            modelsEl.innerHTML = `
                <span style="background: var(--bg-surface); padding: 4px 8px; border-radius: 4px; font-size: 14px;">Modelo A</span>
                <span style="background: var(--bg-surface); padding: 4px 8px; border-radius: 4px; font-size: 14px;">Modelo B</span>
            `;
        }

        // Simulación de etiquetas de categorías
        const categoriesEl = document.getElementById('watch-video-categories');
        if(categoriesEl) {
            categoriesEl.innerHTML = `
                <span style="background: var(--bg-surface); padding: 4px 8px; border-radius: 4px; font-size: 14px;">Categoría Test 1</span>
            `;
        }

        // Descripción
        const descEl = document.getElementById('watch-video-description');
        if(descEl) {
            descEl.textContent = "Información de testing. El reproductor fue eliminado temporalmente para verificar el correcto enrutamiento del SPA, la recuperación del ID en la URL y los parámetros de Playlist.";
        }
    }

    destroy() {
        // Lógica de limpieza cuando el usuario cambia de vista en tu SPA
    }
}