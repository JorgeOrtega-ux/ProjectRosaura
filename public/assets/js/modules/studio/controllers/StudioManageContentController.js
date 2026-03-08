import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class StudioManageContentController {
    constructor(api, state, wsManager) {
        this.api = api;
        this.state = state;
        this.wsManager = wsManager;
        this.initManageContentView();
        
        // Escucha el evento global de progreso de WS
        window.addEventListener('studioVideoProgress', this.updateRowStatus.bind(this));
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

        let statusBadge = '';
        switch(video.status) {
            case 'queued': statusBadge = '<span class="status-badge status-queued">En cola</span>'; break;
            case 'processing': statusBadge = `<span class="status-badge status-processing">Procesando ${video.processing_progress || 0}%</span>`; break;
            case 'processed': statusBadge = '<span class="status-badge status-processed">Procesado / Borrador</span>'; break;
            case 'published': statusBadge = '<span class="status-badge status-published">Publicado</span>'; break;
            case 'failed': statusBadge = '<span class="status-badge status-failed">Error</span>'; break;
            default: statusBadge = `<span class="status-badge">${video.status}</span>`;
        }
        
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
            <td>${statusBadge}</td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">Ninguna</span></td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">${date}</span></td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">0</span></td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">0</span></td>
            <td><span class="component-badge component-badge--sm" style="${badgeStyle}">0</span></td>
        `;
        return tr;
    }

    selectManageContentVideo(id) {
        this.state.selectedManageVideoId = id;
        document.querySelectorAll('#manageContentTableBody tr').forEach(row => row.classList.remove('component-table-row--selected'));
        const row = document.getElementById(`video-row-${id}`);
        if (row) row.classList.add('component-table-row--selected');

        const editBtn = document.getElementById('btnEditSelectedVideo');
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
    }

    updateRowStatus(e) {
        const data = e.detail;
        const matchedKey = data.matchedKey;
        const row = document.getElementById(`video-row-${matchedKey}`);
        if (row && row.children[1]) {
            const statusCell = row.children[1];
            if (data.status === 'processing') statusCell.innerHTML = `<span class="status-badge status-processing">Procesando ${data.progress || 0}%</span>`;
            else if (data.status === 'processed') statusCell.innerHTML = '<span class="status-badge status-processed">Procesado / Borrador</span>';
            else if (data.status === 'failed') statusCell.innerHTML = '<span class="status-badge status-failed">Error</span>';
            else if (data.status === 'published') statusCell.innerHTML = '<span class="status-badge status-published">Publicado</span>';
        }
    }
}