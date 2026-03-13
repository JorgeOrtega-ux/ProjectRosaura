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
        this.playlistsData = []; 
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
        const btnManageVideos = document.getElementById('btnManageVideos');

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
        if (btnManageVideos) {
            btnManageVideos.addEventListener('click', () => {
                if(this.selectedPlaylistId) this.openManageVideosDialog();
            });
        }
    }

    updateActionButtons() {
        const btnEdit = document.getElementById('btnEditPlaylist');
        const btnDelete = document.getElementById('btnDeletePlaylist');
        const btnManageVideos = document.getElementById('btnManageVideos');

        if (this.selectedPlaylistId) {
            if(btnEdit) { btnEdit.removeAttribute('disabled'); btnEdit.classList.remove('disabled'); }
            if(btnDelete) { btnDelete.removeAttribute('disabled'); btnDelete.classList.remove('disabled'); }
            if(btnManageVideos) { btnManageVideos.removeAttribute('disabled'); btnManageVideos.classList.remove('disabled'); }
        } else {
            if(btnEdit) { btnEdit.setAttribute('disabled', 'true'); btnEdit.classList.add('disabled'); }
            if(btnDelete) { btnDelete.setAttribute('disabled', 'true'); btnDelete.classList.add('disabled'); }
            if(btnManageVideos) { btnManageVideos.setAttribute('disabled', 'true'); btnManageVideos.classList.add('disabled'); }
        }
    }

    selectPlaylist(id) {
        const row = document.getElementById(`playlist-row-${id}`);
        const isAlreadySelected = row && row.classList.contains('component-table-row--selected');

        this.selectedPlaylistId = null;
        document.querySelectorAll('#managePlaylistTableBody tr').forEach(r => r.classList.remove('component-table-row--selected'));

        if (isAlreadySelected) {
            this.updateActionButtons();
            return;
        }

        this.selectedPlaylistId = id;
        if (row) row.classList.add('component-table-row--selected');

        this.updateActionButtons();
    }

    async initManagePlaylistView() {
        const tbody = document.getElementById('managePlaylistTableBody');
        const table = document.querySelector('.component-table--media');
        if (!tbody || !table) return;

        // Capa de seguridad visual: Si la tabla tiene prevent-system, no renderizamos listas no custom.
        const preventSystem = table.getAttribute('data-prevent-system') === 'true';

        this.selectedPlaylistId = null;
        this.updateActionButtons();

        try {
            console.log("[StudioManagePlaylistController] Solicitando playlists al servidor...");
            const response = await this.api.post(ApiRoutes.Studio.GetPlaylists);
            
            if (response && response.status === 'success') {
                
                // Filtrado extra en frontend (aunque el backend ya las filtra, es seguridad en cascada)
                let dataToRender = response.data || [];
                if (preventSystem) {
                    dataToRender = dataToRender.filter(p => p.type === 'custom' || !p.type);
                }
                
                this.playlistsData = dataToRender;
                
                if (!this.playlistsData || this.playlistsData.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">playlist_play</span>
                                    <p class="component-empty-state-text">No has creado ninguna lista de reproducción (custom) aún.</p>
                                </div>
                            </td>
                        </tr>`;
                    return;
                }
                
                tbody.innerHTML = '';
                
                // CAPA 2 (Fallback UI config para Playlists)
                const fallbackPlaylistImg = window.AppConfig?.Images?.Fallbacks?.playlistEmpty || 'https://placehold.co/1280x720/2d2d2d/a0a0a0?text=Playlist+Vacia';
                const onErrorHTML = `onerror="this.onerror=null; this.src='${fallbackPlaylistImg}';"`;

                this.playlistsData.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.id = `playlist-row-${p.id}`;
                    tr.onclick = () => this.selectPlaylist(p.id);

                    const date = new Date(p.created_at).toLocaleDateString();
                    const videoCount = parseInt(p.video_count) || 0;
                    
                    let visText = 'Pública';
                    if(p.visibility === 'unlisted') visText = 'No listada';
                    if(p.visibility === 'private') visText = 'Privada';

                    let thumbUrl = p.thumbnail_path ? p.thumbnail_path : '';
                    if (thumbUrl && !thumbUrl.startsWith('http')) {
                        let base = window.AppBasePath || '';
                        if (!base.startsWith('http')) base = window.location.origin + (base.startsWith('/') ? '' : '/') + base;
                        if (base.endsWith('/')) base = base.slice(0, -1);
                        let cleanPath = thumbUrl.replace(/^\//, '');
                        let baseNoSlash = (window.AppBasePath || '').replace(/^\//, '');
                        if (baseNoSlash && cleanPath.startsWith(baseNoSlash + '/')) cleanPath = cleanPath.substring(baseNoSlash.length + 1);
                        if (!cleanPath.startsWith('public/')) cleanPath = 'public/' + cleanPath;
                        thumbUrl = base + '/' + cleanPath;
                    }

                    // CAPA 1: Aplicación de Fallback por data vacía o 0 videos
                    if (!thumbUrl || videoCount === 0) {
                        thumbUrl = fallbackPlaylistImg;
                    }
                    
                    const countBadge = `
                        <div style="position: absolute; bottom: 4px; right: 4px; background: rgba(0, 0, 0, 0.8); color: white; padding: 2px 4px; border-radius: 4px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 2px; line-height: 1; pointer-events: none;">
                            <span class="material-symbols-rounded" style="font-size: 14px;">playlist_play</span>${videoCount}
                        </div>`;

                    let thumbHtml = `
                        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 120px; height: 68px; flex-shrink: 0; border-radius: 4px; overflow: hidden; background-color: var(--bg-surface);">
                            <img src="${thumbUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Miniatura" ${onErrorHTML}>
                            ${countBadge}
                        </div>`;

                    tr.innerHTML = `
                        <td>
                            <div class="table-video-info">
                                ${thumbHtml}
                                <div class="table-video-details">
                                    <span class="table-video-title">${p.title}</span>
                                    <span class="table-video-desc">${p.description ? p.description.substring(0, 30) + '...' : 'Sin descripción'}</span>
                                </div>
                            </div>
                        </td>
                        <td><span class="component-badge component-badge--sm">Personalizada</span></td>
                        <td><span class="component-badge component-badge--sm">${visText}</span></td>
                        <td><span class="component-badge component-badge--sm">${date}</span></td>
                        <td><span class="component-badge component-badge--sm">${videoCount} videos</span></td>
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

    openPlaylistDialog(mode = 'create', playlistId = null) {
        if (!window.dialogSystem) return;

        window.dialogSystem.show('createPlaylistTemplate', {
            onRender: (box) => {
                const titleNode = box.querySelector('#playlistModalTitle') || box.querySelector('h3.dialog-title') || box.querySelector('h3');
                const submitBtn = box.querySelector('#btnSubmitPlaylist');
                const pTitle = box.querySelector('#playlistTitle');
                const pDesc = box.querySelector('#playlistDesc');
                const pVis = box.querySelector('#playlistVisibility');
                const pOrder = box.querySelector('#playlistOrder');
                
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
                this.initManagePlaylistView(); 
            } else {
                alert("Error al eliminar la lista: " + (response ? response.message : 'Error desconocido'));
            }
        } catch (error) {
            console.error("[StudioManagePlaylistController] Error de red al intentar eliminar:", error);
            alert("Ocurrió un error al intentar eliminar la playlist.");
        }
    }

    async openManageVideosDialog() {
        if (!window.dialogSystem || !this.selectedPlaylistId) return;

        window.dialogSystem.show('managePlaylistVideosTemplate', {
            onRender: async (box) => {
                const container = box.querySelector('#playlistVideosContainer');
                const btnSave = box.querySelector('#btnSavePlaylistVideos');

                try {
                    const allVideosRes = await this.api.fetchAllVideos();
                    const playlistVideosRes = await this.api.fetchPlaylistVideos(this.selectedPlaylistId);

                    if (allVideosRes.status === 'success' && playlistVideosRes.status === 'success') {
                        const allVideos = allVideosRes.data || [];
                        const playlistVideos = playlistVideosRes.data || [];
                        
                        const playlistVideoIds = playlistVideos.map(v => v.id);

                        container.innerHTML = ''; 

                        if (allVideos.length === 0) {
                            container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-secondary);">No tienes videos subidos aún.</p>';
                            return;
                        }

                        // CAPA 2 (Fallback UI config para modal de videos)
                        const fallbackVideoImg = window.AppConfig?.Images?.Fallbacks?.videoThumbnail || 'https://placehold.co/1280x720/1a1a1a/e0e0e0?text=Video+No+Disponible';
                        const onErrorHTML = `onerror="this.onerror=null; this.src='${fallbackVideoImg}';"`;

                        allVideos.forEach(v => {
                            const isChecked = playlistVideoIds.includes(v.id) ? 'checked' : '';
                            const basePath = window.AppBasePath || '';
                            // Capa 1: Fallback if path empty
                            const thumbPath = v.thumbnail_path ? `${basePath}/${v.thumbnail_path}` : fallbackVideoImg;
                            
                            const row = document.createElement('label');
                            row.style.display = 'flex';
                            row.style.alignItems = 'center';
                            row.style.gap = '12px';
                            row.style.padding = '8px';
                            row.style.borderBottom = '1px solid var(--border-color, #f0f0f0)';
                            row.style.cursor = 'pointer';
                            row.style.borderRadius = '4px';

                            row.innerHTML = `
                                <input type="checkbox" class="component-checkbox video-select-cb" value="${v.id}" ${isChecked}>
                                <img src="${thumbPath}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px; background: #000;" ${onErrorHTML}>
                                <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; color: var(--text-primary);">
                                    ${v.title || 'Sin título'}
                                </div>
                            `;

                            row.addEventListener('mouseover', () => row.style.backgroundColor = 'var(--bg-hover, #f9f9f9)');
                            row.addEventListener('mouseout', () => row.style.backgroundColor = 'transparent');

                            container.appendChild(row);
                        });

                        if (btnSave) {
                            btnSave.addEventListener('click', async () => {
                                btnSave.classList.add('loading');
                                btnSave.disabled = true;

                                const checkboxes = container.querySelectorAll('.video-select-cb:checked');
                                const selectedIds = Array.from(checkboxes).map(cb => cb.value);

                                const syncRes = await this.api.syncPlaylistVideos(this.selectedPlaylistId, selectedIds);

                                if (syncRes.status === 'success') {
                                    window.dialogSystem.closeCurrent(true);
                                    this.initManagePlaylistView();
                                } else {
                                    alert("Error al sincronizar videos: " + (syncRes.message || 'Desconocido'));
                                    btnSave.classList.remove('loading');
                                    btnSave.disabled = false;
                                }
                            });
                        }

                    } else {
                        container.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Error al cargar los videos.</p>';
                    }

                } catch (error) {
                    console.error("[StudioManagePlaylistController] Error obteniendo videos:", error);
                    container.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Error de red o conexión.</p>';
                }
            }
        });
    }
}