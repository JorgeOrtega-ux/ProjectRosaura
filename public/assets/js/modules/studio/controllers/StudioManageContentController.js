import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class StudioManageContentController {
    constructor(api, state, wsManager) {
        if (window._studioManageContentInstance) {
            window._studioManageContentInstance.destroy();
        }
        window._studioManageContentInstance = this;

        this.api = api;
        this.state = state;
        this.wsManager = wsManager;
        
        this.updateRowStatusBound = this.updateRowStatus.bind(this);
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.handleRouteChangeBound = this.destroy.bind(this);

        this.initManageContentView();
        this.attachEvents();
    }

    attachEvents() {
        window.addEventListener('studioVideoProgress', this.updateRowStatusBound);
        document.addEventListener('click', this.handleDocumentClickBound);
        window.addEventListener('routeChange', this.handleRouteChangeBound);
    }

    destroy() {
        window.removeEventListener('studioVideoProgress', this.updateRowStatusBound);
        document.removeEventListener('click', this.handleDocumentClickBound);
        window.removeEventListener('routeChange', this.handleRouteChangeBound);
        
        if (window._studioManageContentInstance === this) {
            window._studioManageContentInstance = null;
        }
    }

    handleDocumentClick(e) {
        const toggleBtn = e.target.closest('[data-action="toggleQuickVisibility"]');
        if (toggleBtn) {
            if (toggleBtn.hasAttribute('disabled') || toggleBtn.classList.contains('disabled')) return;
            const menuId = toggleBtn.getAttribute('data-target');
            const menu = document.getElementById(menuId);
            if (menu) {
                const isClosing = menu.classList.contains('active');
                document.querySelectorAll('.component-module--dropdown').forEach(m => {
                    m.classList.remove('active');
                    m.classList.add('disabled');
                });
                
                if (!isClosing) {
                    menu.classList.remove('disabled');
                    menu.classList.add('active');
                }
            }
            return;
        }

        const selectOption = e.target.closest('[data-action="selectQuickVisibility"]');
        if (selectOption) {
            const value = selectOption.getAttribute('data-value');
            const icon = selectOption.getAttribute('data-icon');
            this.updateVideoVisibility(value, icon);
            
            const menu = selectOption.closest('.component-module');
            if (menu) {
                menu.classList.remove('active');
                menu.classList.add('disabled');
            }
            return;
        }

        if (!e.target.closest('.component-module--dropdown') && !e.target.closest('[data-action="toggleQuickVisibility"]')) {
            document.querySelectorAll('.component-module--dropdown').forEach(m => {
                m.classList.remove('active');
                m.classList.add('disabled');
            });
        }
    }

    async updateVideoVisibility(newVisibility, iconText) {
        const id = this.state.selectedManageVideoId;
        if (!id) return;
        
        const video = this.state.getVideo(id);
        if (!video) return;

        const btnIcon = document.getElementById('quickVisibilityBtnIcon');
        if (btnIcon) btnIcon.textContent = iconText;

        const menu = document.getElementById('quickVisibilityMenu');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-value') === newVisibility) {
                    link.classList.add('active');
                }
            });
        }

        const updateRoute = ApiRoutes.Studio?.UpdateTitle || 'studio.update_title';
        
        let models = [];
        let categories = [];
        if (Array.isArray(video.tags)) {
            models = video.tags.filter(t => t.type === 'modelo').map(t => t.id);
            categories = video.tags.filter(t => t.type === 'category').map(t => t.id);
        }

        const payload = {
            video_id: id,
            title: video.title || video.original_filename || '',
            description: video.description || '',
            visibility: newVisibility,
            models: JSON.stringify(models),
            categories: JSON.stringify(categories)
        };

        const response = await this.api.post(updateRoute, payload);
        
        if (response.status === 'success') {
            video.visibility = newVisibility;
            this.updateRowVisibilityIcon(video);
        } else {
            alert('Error al actualizar visibilidad: ' + (response.message || 'Desconocido'));
            this.syncQuickVisibilityUI(video.visibility || 'public');
        }
    }

    syncQuickVisibilityUI(visibility) {
        const menu = document.getElementById('quickVisibilityMenu');
        let matchedIcon = 'public';
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-value') === visibility) {
                    link.classList.add('active');
                    matchedIcon = link.getAttribute('data-icon');
                }
            });
        }
        const btnIcon = document.getElementById('quickVisibilityBtnIcon');
        if (btnIcon) btnIcon.textContent = matchedIcon;
    }

    updateRowVisibilityIcon(video) {
        const row = document.getElementById(`video-row-${video.id}`);
        if (row && row.children[2]) {
            row.children[2].innerHTML = this.getCombinedBadge(video);
        }
    }

    getCombinedBadge(video) {
        let statusText = video.status;
        if(video.status === 'queued') statusText = 'En cola';
        else if(video.status === 'processing') statusText = `Procesando ${video.processing_progress || 0}%`;
        else if(video.status === 'processed') statusText = 'Borrador';
        else if(video.status === 'published') statusText = 'Publicado';
        else if(video.status === 'failed') statusText = 'Error';

        let visText = 'Público';
        if(video.visibility === 'unlisted') visText = 'No listado';
        if(video.visibility === 'private') visText = 'Privado';

        return `<span class="component-badge component-badge--sm" style="display: inline-flex; align-items: center; gap: 4px;">${statusText} / ${visText}</span>`;
    }

    async initManageContentView() {
        const routeName = ApiRoutes.Studio?.GetAllVideos || 'studio.get_all_videos';
        const response = await this.api.post(routeName);
        
        const tbody = document.getElementById('manageContentTableBody');
        const template = document.getElementById('emptyTableTemplate');
        
        if (!tbody) return;
        
        if (response.status === 'success') {
            const videos = response.data;
            if (videos.length === 0) {
                if (template) tbody.innerHTML = template.innerHTML;
                return;
            }
            tbody.innerHTML = '';
            this.state.clear();
            
            videos.forEach(v => {
                this.state.setVideo(v.id, v);
                const tr = this.createVideoRow(v);
                tbody.appendChild(tr);
            });
        } else {
            if (template) tbody.innerHTML = template.innerHTML;
        }
    }

    createVideoRow(video) {
        const tr = document.createElement('tr');
        tr.id = `video-row-${video.id}`;
        tr.onclick = () => this.selectManageContentVideo(video.id);

        let combinedBadge = this.getCombinedBadge(video);
        
        let thumbUrl = video.thumbnail_path ? video.thumbnail_path : '';
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
        
        const thumbHtml = thumbUrl ? `<img src="${thumbUrl}" class="table-video-thumb" alt="Miniatura">` : `<div class="table-video-thumb empty"><span class="material-symbols-rounded">video_file</span></div>`;
        const title = video.title || video.original_filename || 'Sin título';
        const date = video.created_at ? new Date(video.created_at).toLocaleDateString() : '-';

        const badgeStyle = 'display: inline-flex; align-items: center; gap: 4px;';
        let orientationBadge = video.orientation === 'vertical' 
            ? '<span class="material-symbols-rounded" style="font-size: 14px; margin-right: 4px;">smartphone</span> Vertical' 
            : '<span class="material-symbols-rounded" style="font-size: 14px; margin-right: 4px;">desktop_windows</span> Normal';

        tr.innerHTML = `
            <td>
                <div class="table-video-info">
                    ${thumbHtml}
                    <div class="table-video-details">
                        <span class="table-video-title">${title}</span>
                        <span class="table-video-desc">${video.description ? video.description.substring(0, 30) + '...' : 'Sin descripción'}</span>
                    </div>
                </div>
            </td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">${orientationBadge}</span></td>
            <td>${combinedBadge}</td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">Ninguna</span></td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">${date}</span></td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">0</span></td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">0</span></td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">0</span></td>
        `;
        return tr;
    }

    selectManageContentVideo(id) {
        const row = document.getElementById(`video-row-${id}`);
        const isAlreadySelected = row && row.classList.contains('component-table-row--selected');

        this.state.selectedManageVideoId = null;
        document.querySelectorAll('#manageContentTableBody tr').forEach(r => r.classList.remove('component-table-row--selected'));

        const editBtn = document.getElementById('btnEditSelectedVideo');
        const visBtn = document.getElementById('btnQuickVisibility');

        if (isAlreadySelected) {
            if (editBtn) { editBtn.setAttribute('disabled', 'true'); editBtn.classList.add('disabled'); }
            if (visBtn) { visBtn.setAttribute('disabled', 'true'); visBtn.classList.add('disabled'); }
            return;
        }

        this.state.selectedManageVideoId = id;
        if (row) row.classList.add('component-table-row--selected');

        if (editBtn) {
            editBtn.removeAttribute('disabled');
            editBtn.classList.remove('disabled');
            editBtn.onclick = () => {
                const video = this.state.getVideo(id);
                if (video) {
                    if (video.status === 'processing' || video.status === 'queued') window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/uploading' }}));
                    else {
                        let base = window.AppBasePath || '';
                        let userUuid = this.wsManager.getUserId();
                        window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: `${base}/studio/edit/${userUuid}/${video.uuid}` }}));
                    }
                }
            };
        }

        if (visBtn) {
            const video = this.state.getVideo(id);
            if (video) {
                visBtn.removeAttribute('disabled');
                visBtn.classList.remove('disabled');
                this.syncQuickVisibilityUI(video.visibility || 'public');
            }
        }
    }

    updateRowStatus(e) {
        const data = e.detail;
        const matchedKey = data.matchedKey;
        const row = document.getElementById(`video-row-${matchedKey}`);
        if (row && row.children[2]) {
            const video = this.state.getVideo(matchedKey);
            if (video) {
                video.status = data.status;
                if (data.progress !== undefined) video.processing_progress = data.progress;
                row.children[2].innerHTML = this.getCombinedBadge(video);
            }
        }
    }
}