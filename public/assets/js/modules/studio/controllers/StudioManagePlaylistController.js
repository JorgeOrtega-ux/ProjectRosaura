// public/assets/js/modules/studio/controllers/StudioManagePlaylistController.js

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
            btnCreate.addEventListener('click', () => this.openCreatePlaylistDialog());
        }
    }

    async initManagePlaylistView() {
        const tbody = document.getElementById('managePlaylistTableBody');
        if (!tbody) return;

        // Se usa la cadena de ruta del mapa en PHP, asumiendo que el ApiRoutes no lo tiene mapeado
        const response = await this.api.post('studio.get_playlists');
        
        if (response.status === 'success') {
            const playlists = response.data;
            if (playlists.length === 0) {
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
        }
    }

    openCreatePlaylistDialog() {
        if (!window.DialogSystem) return;

        window.DialogSystem.show({
            template: 'createPlaylistTemplate',
            onConfirm: async (dialogContent) => {
                const title = dialogContent.querySelector('#playlistTitle').value;
                const desc = dialogContent.querySelector('#playlistDesc').value;
                const vis = dialogContent.querySelector('#playlistVisibility').value;
                const order = dialogContent.querySelector('#playlistOrder').value;

                if (!title.trim()) {
                    alert("El título de la lista es obligatorio.");
                    return;
                }

                // Deshabilitar botón visualmente durante carga (opcional)
                const confirmBtn = dialogContent.querySelector('[data-dialog-action="confirm"]');
                if(confirmBtn) confirmBtn.classList.add('loading');

                const response = await this.api.post('studio.create_playlist', {
                    title: title,
                    description: desc,
                    visibility: vis,
                    video_order: order
                });

                if (response.status === 'success') {
                    window.DialogSystem.hide();
                    this.initManagePlaylistView(); // Recargar la tabla con la nueva playlist
                } else {
                    if(confirmBtn) confirmBtn.classList.remove('loading');
                    alert("Error al crear la playlist: " + (response.message || 'Error desconocido'));
                }
            }
        });
    }
}