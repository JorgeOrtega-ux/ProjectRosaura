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
        this.playlistsData = []; // Guardamos los datos localmente para editarlos
        this.selectedPlaylistId = null;

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
        const btnEdit = document.getElementById('btnEditPlaylist');
        const btnDelete = document.getElementById('btnDeletePlaylist');

        if (btnCreate) {
            btnCreate.addEventListener('click', () => {
                this.openPlaylistDialog('create');
            });
        }
        if (btnEdit) {
            btnEdit.addEventListener('click', () => {
                if(this.selectedPlaylistId) this.openPlaylistDialog('edit', this.selectedPlaylistId);
            });
        }
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                if(this.selectedPlaylistId) this.deletePlaylist(this.selectedPlaylistId);
            });
        }
    }

    updateActionButtons() {
        const btnCreate = document.getElementById('btnCreatePlaylist');
        const btnEdit = document.getElementById('btnEditPlaylist');
        const btnDelete = document.getElementById('btnDeletePlaylist');

        if (this.selectedPlaylistId) {
            if(btnCreate) btnCreate.style.display = 'none';
            if(btnEdit) btnEdit.style.display = 'inline-flex';
            if(btnDelete) btnDelete.style.display = 'inline-flex';
        } else {
            if(btnCreate) btnCreate.style.display = 'inline-flex';
            if(btnEdit) btnEdit.style.display = 'none';
            if(btnDelete) btnDelete.style.display = 'none';
        }
    }

    async initManagePlaylistView() {
        const tbody = document.getElementById('managePlaylistTableBody');
        if (!tbody) return;

        this.selectedPlaylistId = null;
        this.updateActionButtons();

        try {
            console.log("[StudioManagePlaylistController] Solicitando playlists al servidor...");
            const response = await this.api.post(ApiRoutes.Studio.GetPlaylists);
            
            if (response && response.status === 'success') {
                this.playlistsData = response.data;
                
                if (!this.playlistsData || this.playlistsData.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">playlist_play</span>
                                    <p class="component-empty-state-text">No has creado ninguna lista de reproducción aún.</p>
                                </div>
                            </td>
                        </tr>`;
                    return;
                }
                
                tbody.innerHTML = '';
                this.playlistsData.forEach(p => {
                    const tr = document.createElement('tr');
                    const date = new Date(p.created_at).toLocaleDateString();
                    
                    let visText = 'Pública';
                    if(p.visibility === 'unlisted') visText = 'No listada';
                    if(p.visibility === 'private') visText = 'Privada';

                    tr.innerHTML = `
                        <td>
                            <input type="checkbox" class="playlist-checkbox component-checkbox" data-id="${p.id}">
                        </td>
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

                // Attach events for checkboxes
                const checkboxes = tbody.querySelectorAll('.playlist-checkbox');
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const id = e.target.getAttribute('data-id');
                        if (e.target.checked) {
                            // Uncheck others (only allow one selection)
                            checkboxes.forEach(otherCb => {
                                if (otherCb !== e.target) otherCb.checked = false;
                            });
                            this.selectedPlaylistId = id;
                        } else {
                            this.selectedPlaylistId = null;
                        }
                        this.updateActionButtons();
                    });
                });

            } else {
                console.error("[StudioManagePlaylistController] Respuesta del servidor no fue exitosa:", response);
            }
        } catch (error) {
            console.error("[StudioManagePlaylistController] Error de conexión o red al cargar listas:", error);
        }
    }

    openPlaylistDialog(mode = 'create', playlistId = null) {
        if (!window.dialogSystem) return;

        window.dialogSystem.show('createPlaylistTemplate', {
            onRender: (box) => {
                // Hacemos un fallback por clase en caso de que el ID no exista
                const titleNode = box.querySelector('#playlistModalTitle') || box.querySelector('h3.dialog-title') || box.querySelector('h3');
                const submitBtn = box.querySelector('#btnSubmitPlaylist');
                const pTitle = box.querySelector('#playlistTitle');
                const pDesc = box.querySelector('#playlistDesc');
                const pVis = box.querySelector('#playlistVisibility');
                const pOrder = box.querySelector('#playlistOrder');
                
                // Si pIdInput no existe, lo creamos dinámicamente para que no tire error "null"
                let pIdInput = box.querySelector('#playlistId');
                if (!pIdInput) {
                    pIdInput = document.createElement('input');
                    pIdInput.type = 'hidden';
                    pIdInput.id = 'playlistId';
                    box.appendChild(pIdInput);
                }

                if (mode === 'edit' && playlistId) {
                    const data = this.playlistsData.find(p => p.id == playlistId);
                    if (data) {
                        if (titleNode) titleNode.textContent = 'Editar lista de reproducción';
                        pIdInput.value = data.id;
                        if (pTitle) pTitle.value = data.title;
                        if (pDesc) pDesc.value = data.description || '';
                        if (pVis) pVis.value = data.visibility || 'public';
                        if (pOrder) pOrder.value = data.video_order || 'manual';
                    }
                }
                
                if (submitBtn) {
                    submitBtn.addEventListener('click', async () => {
                        if (!pTitle) return;
                        
                        const title = pTitle.value;
                        const desc = pDesc ? pDesc.value : '';
                        const vis = pVis ? pVis.value : 'public';
                        const order = pOrder ? pOrder.value : 'manual';

                        if (!title.trim()) {
                            alert("El título de la lista es obligatorio.");
                            return;
                        }

                        submitBtn.classList.add('loading');
                        submitBtn.disabled = true;

                        try {
                            const endpoint = mode === 'edit' ? ApiRoutes.Studio.UpdatePlaylist : ApiRoutes.Studio.CreatePlaylist;
                            const payload = {
                                title: title,
                                description: desc,
                                visibility: vis,
                                video_order: order
                            };

                            if (mode === 'edit') {
                                payload.playlist_id = pIdInput.value;
                            }

                            const response = await this.api.post(endpoint, payload);

                            if (response && response.status === 'success') {
                                window.dialogSystem.closeCurrent(true); 
                                this.initManagePlaylistView(); 
                            } else {
                                submitBtn.classList.remove('loading');
                                submitBtn.disabled = false;
                                alert("Error: " + (response ? response.message : 'Error desconocido'));
                            }
                        } catch (error) {
                            submitBtn.classList.remove('loading');
                            submitBtn.disabled = false;
                            console.error("[StudioManagePlaylistController] Error crítico:", error);
                            alert("Error crítico de red.");
                        }
                    });
                }
            }
        });
    }

    async deletePlaylist(playlistId) {
        if (!confirm("¿Estás seguro de que deseas eliminar esta lista de reproducción? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            const response = await this.api.post(ApiRoutes.Studio.DeletePlaylist, {
                playlist_id: playlistId
            });

            if (response && response.status === 'success') {
                this.initManagePlaylistView(); // Recarga la tabla
            } else {
                alert("Error al eliminar la lista: " + (response ? response.message : 'Error desconocido'));
            }
        } catch (error) {
            console.error("[StudioManagePlaylistController] Error de red al intentar eliminar:", error);
            alert("Ocurrió un error al intentar eliminar la playlist.");
        }
    }
}