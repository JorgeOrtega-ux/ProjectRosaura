// public/assets/js/modules/studio/controllers/StudioManagePlaylistController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class StudioManagePlaylistController {
    constructor(api, state) {
        if (window._studioManagePlaylistInstance) {
            window._studioManagePlaylistInstance.destroy();
        }
        window._studioManagePlaylistInstance = this;

        this.api = api;
        this.state = state;

        this.handleRouteChangeBound = this.destroy.bind(this);
        window.addEventListener('routeChange', this.handleRouteChangeBound);

        console.log("[StudioManagePlaylistController] Inicializado correctamente.");
        this.initManagePlaylistView();
        this.attachEvents();
    }

    destroy() {
        window.removeEventListener('routeChange', this.handleRouteChangeBound);
        if (window._studioManagePlaylistInstance === this) {
            window._studioManagePlaylistInstance = null;
        }
    }

    attachEvents() {
        const btnCreate = document.getElementById('btnCreatePlaylist');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => {
                console.log("[StudioManagePlaylistController] Clic en Crear Playlist detectado.");
                this.openCreatePlaylistDialog();
            });
        } else {
            console.error("[StudioManagePlaylistController] No se encontró el botón btnCreatePlaylist en el DOM.");
        }
    }

    async initManagePlaylistView() {
        const tbody = document.getElementById('managePlaylistTableBody');
        if (!tbody) {
            console.warn("[StudioManagePlaylistController] No se encontró managePlaylistTableBody.");
            return;
        }

        try {
            console.log("[StudioManagePlaylistController] Solicitando playlists al servidor...");
            const response = await this.api.post(ApiRoutes.Studio.GetPlaylists);
            
            if (response && response.status === 'success') {
                const playlists = response.data;
                if (!playlists || playlists.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">playlist_play</span>
                                    <p class="component-empty-state-text">No has creado ninguna lista de reproducción aún.</p>
                                </div>
                            </td>
                        </tr>`;
                    return;
                }
                
                tbody.innerHTML = '';
                playlists.forEach(p => {
                    const tr = document.createElement('tr');
                    const date = new Date(p.created_at).toLocaleDateString();
                    
                    let visText = 'Pública';
                    if(p.visibility === 'unlisted') visText = 'No listada';
                    if(p.visibility === 'private') visText = 'Privada';

                    tr.innerHTML = `
                        <td>
                            <div class="table-video-info">
                                <div class="table-video-thumb empty"><span class="material-symbols-rounded">playlist_play</span></div>
                                <div class="table-video-details">
                                    <span class="table-video-title">${p.title}</span>
                                    <span class="table-video-desc">${p.description ? p.description.substring(0, 30) + '...' : 'Sin descripción'}</span>
                                </div>
                            </div>
                        </td>
                        <td><span class="component-badge component-badge--sm">Playlist</span></td>
                        <td><span class="component-badge component-badge--sm">${visText}</span></td>
                        <td><span class="component-badge component-badge--sm">${date}</span></td>
                        <td><span class="component-badge component-badge--sm">0 videos</span></td>
                        <td><span class="component-badge component-badge--sm">0</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                console.error("[StudioManagePlaylistController] Respuesta del servidor no fue exitosa:", response);
            }
        } catch (error) {
            console.error("[StudioManagePlaylistController] Error de conexión o red al cargar listas:", error);
        }
    }

    openCreatePlaylistDialog() {
        if (!window.dialogSystem) {
            console.error("[StudioManagePlaylistController] El objeto window.dialogSystem no está disponible.");
            return;
        }

        // Llamamos a la plantilla de forma correcta por su nombre en string
        window.dialogSystem.show('createPlaylistTemplate', {
            onRender: (box) => {
                const submitBtn = box.querySelector('#btnSubmitPlaylist');
                
                if (submitBtn) {
                    submitBtn.addEventListener('click', async () => {
                        const title = box.querySelector('#playlistTitle').value;
                        const desc = box.querySelector('#playlistDesc').value;
                        const vis = box.querySelector('#playlistVisibility').value;
                        const order = box.querySelector('#playlistOrder').value;

                        if (!title.trim()) {
                            alert("El título de la lista es obligatorio.");
                            return;
                        }

                        submitBtn.classList.add('loading');
                        submitBtn.disabled = true;

                        try {
                            const response = await this.api.post(ApiRoutes.Studio.CreatePlaylist, {
                                title: title,
                                description: desc,
                                visibility: vis,
                                video_order: order
                            });

                            if (response && response.status === 'success') {
                                // Cerramos la ventana modal programáticamente porque fue un éxito
                                window.dialogSystem.closeCurrent(true); 
                                this.initManagePlaylistView(); 
                            } else {
                                submitBtn.classList.remove('loading');
                                submitBtn.disabled = false;
                                alert("Error al crear la playlist: " + (response ? response.message : 'Error desconocido'));
                            }
                        } catch (error) {
                            submitBtn.classList.remove('loading');
                            submitBtn.disabled = false;
                            console.error("[StudioManagePlaylistController] Error crítico al crear:", error);
                            alert("Error crítico de red al intentar crear la playlist.");
                        }
                    });
                }
            }
        });
    }
}