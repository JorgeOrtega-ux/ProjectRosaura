import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class StudioUploadController {
    constructor(api, state) {
        this.api = api;
        this.state = state;
        
        const path = window.location.pathname;
        if (path.includes('/studio/uploading')) this.initUploadingView();
        
        this.attachEvents();
        window.addEventListener('studioVideoProgress', this.updateUploadBadges.bind(this));
    }

    async handleFilesSelection(files) {
        if (!files || files.length === 0) return;
        const routeName = ApiRoutes.Studio?.UploadVideo || 'studio.upload_video';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const preCheckRes = await this.api.post(routeName, { pre_check: true, total_size: file.size });
                if (preCheckRes.status !== 'success') {
                    alert(`No se puede subir "${file.name}": ${preCheckRes.message}`);
                    return; 
                }
            } catch (error) {
                console.error(error); alert(`Error verificando permisos para "${file.name}".`); return;
            }
        }
        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        const uploadProgressBar = document.getElementById('uploadProgressBar');
        if(uploadProgressContainer) uploadProgressContainer.style.display = 'block';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const result = await this.api.uploadFileInChunks(
                    routeName, file, 'video', { total_size: file.size },
                    (percent) => { if(uploadProgressBar) uploadProgressBar.style.width = `${percent}%`; }
                );
                if (result.status !== 'success') alert(`Error subiendo ${file.name}: ${result.message}`);
            } catch (error) { console.error(error); }
        }
        window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/uploading' }}));
    }

    async initUploadingView() {
        const routeName = ApiRoutes.Studio?.GetActiveUploads || 'studio.get_active_uploads';
        const response = await this.api.post(routeName);
        if (response.status === 'success') {
            const videos = response.data;
            if (videos.length === 0) {
                window.dispatchEvent(new CustomEvent('routeChange', { detail: { url: '/studio/upload' }}));
                return;
            }
            this.state.clear();
            videos.forEach(v => { this.state.setVideo(v.id, { ...v, id: String(v.id) }); });
            this.renderBadges();
            this.selectVideo(String(videos[0].id));
        }
    }

    renderBadges() {
        const container = document.getElementById('badgesContainer');
        if (!container) return;
        container.innerHTML = '';
        this.state.currentVideos.forEach(video => {
            const badge = document.createElement('div');
            badge.className = `studio-badge ${this.state.selectedVideoId === video.id ? 'active' : ''}`;
            badge.setAttribute('data-id', video.id);
            badge.onclick = () => this.selectVideo(String(video.id));

            let statusText = video.status === 'queued' ? 'En cola' : 
                             video.status === 'processing' ? `${video.processing_progress}%` : 
                             video.status === 'processed' ? '100% OK' : 'Error';

            badge.innerHTML = `<span class="name">${video.original_filename}</span><span class="status" id="badge-status-${video.id}">${statusText}</span>`;
            container.appendChild(badge);
        });
    }

    selectVideo(id) {
        this.state.selectedVideoId = String(id);
        this.renderBadges(); 
        
        const video = this.state.getVideo(this.state.selectedVideoId);
        if (!video) return;

        const displayTitle = document.querySelector('[data-ref="display-title"]');
        if(displayTitle) displayTitle.textContent = video.title || video.original_filename || '';

        const previewOriginalFilename = document.getElementById('previewOriginalFilename');
        if(previewOriginalFilename) previewOriginalFilename.textContent = video.original_filename;

        const cancelBtn = document.getElementById('btnCancelVideo');
        if (cancelBtn) {
            cancelBtn.classList.remove('disabled');
            cancelBtn.removeAttribute('disabled');
        }
    }

    updateUploadBadges(e) {
        const data = e.detail;
        const matchedKey = data.matchedKey;
        const statusSpan = document.getElementById(`badge-status-${matchedKey}`);
        if (statusSpan) {
            if (data.status === 'processing') statusSpan.textContent = `${data.progress}%`;
            else if (data.status === 'processed') statusSpan.textContent = '100% OK';
            else if (data.status === 'failed') statusSpan.textContent = 'Error';
        }
    }

    attachEvents() {
        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'videoFileInput') this.handleFilesSelection(e.target.files);
        });

        document.addEventListener('dragover', (e) => { const dropZone = e.target.closest('#videoDropZone'); if (dropZone) { e.preventDefault(); dropZone.classList.add('dragover'); }});
        document.addEventListener('dragleave', (e) => { const dropZone = e.target.closest('#videoDropZone'); if (dropZone) dropZone.classList.remove('dragover');});
        document.addEventListener('drop', (e) => {
            const dropZone = e.target.closest('#videoDropZone');
            if (dropZone) {
                e.preventDefault(); dropZone.classList.remove('dragover');
                this.handleFilesSelection(e.dataTransfer.files);
            }
        });
    }
}