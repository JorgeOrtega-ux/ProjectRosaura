import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasChatViewerController {
    constructor() {
        this.api = new ApiService();
        this.images = [];
        this.currentIndex = 0;
        this.isInitialized = false;
        this.abortController = null;

        this.handleClickBound = this.handleClick.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
        this.loadState();
        this.updateView();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        document.removeEventListener('click', this.handleClickBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleViewLoaded(e) {
        if (e && e.detail && !e.detail.cleanUrl.includes('/canvases/c/v/') && !e.detail.cleanUrl.includes('/canvases/chat-viewer')) return;
        this.loadState();
        this.updateView();
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/canvases/c/v/') && !window.location.pathname.includes('/canvases/chat-viewer')) return;

        const btnPrev = e.target.closest('[data-ref="cv-btn-prev"], [data-action="prevImage"]');
        if (btnPrev) {
            if (btnPrev.classList.contains('disabled-interaction')) return;
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.updateView();
            }
            return;
        }

        const btnNext = e.target.closest('[data-ref="cv-btn-next"], [data-action="nextImage"]');
        if (btnNext) {
            if (btnNext.classList.contains('disabled-interaction')) return;
            if (this.currentIndex < this.images.length - 1) {
                this.currentIndex++;
                this.updateView();
            }
            return;
        }

        const btnDownload = e.target.closest('[data-ref="cv-btn-download"], [data-action="downloadImage"]');
        if (btnDownload) {
            this.handleDownload(btnDownload);
            return;
        }
    }

    loadState() {
        const wrapper = document.querySelector('[data-ref="chat-viewer-wrapper"]');
        if (!wrapper) return;
        
        this.images = [];
        try {
            this.images = JSON.parse(wrapper.getAttribute('data-images') || '[]');
            if (this.images.length === 0) {
                const urlParams = new URLSearchParams(window.location.search);
                let msgId = urlParams.get('msg');
                if (!msgId) {
                    const parts = window.location.pathname.split('/');
                    if (parts.length >= 6) {
                        msgId = parts[5];
                    }
                }
                if (msgId) {
                    const stored = sessionStorage.getItem('chat_viewer_images_' + msgId);
                    if (stored) {
                        this.images = JSON.parse(stored);
                    }
                }
            }
        } catch(err) {
            
        }
        
        this.currentIndex = parseInt(wrapper.dataset.idx, 10) || 0;
    }

    updateView() {
        const mainImg = document.querySelector('[data-ref="cv-main-image"]');
        const counter = document.querySelector('[data-ref="cv-counter"]');
        const btnPrev = document.querySelector('[data-ref="cv-btn-prev"]');
        const btnNext = document.querySelector('[data-ref="cv-btn-next"]');
        
        if (!mainImg) return;
        
        mainImg.src = this.images[this.currentIndex];
        
        if (counter) {
            counter.innerText = `${this.currentIndex + 1} / ${Math.max(1, this.images.length)}`;
        }
        
        if (btnPrev) {
            if (this.currentIndex === 0) btnPrev.classList.add('disabled-interaction');
            else btnPrev.classList.remove('disabled-interaction');
        }
        
        if (btnNext) {
            if (this.currentIndex === this.images.length - 1 || this.images.length === 0) btnNext.classList.add('disabled-interaction');
            else btnNext.classList.remove('disabled-interaction');
        }
    }

    async handleDownload(btn) {
        if (btn.hasAttribute('disabled')) return;
        
        const currentUrl = this.images[this.currentIndex];
        if (!currentUrl) return;

        setButtonLoading(btn);

        try {
            const response = await fetch(currentUrl, { signal: this.abortController?.signal });
            const blob = await response.blob();
            
            let fileName = 'template.png';
            try {
                const urlObj = new URL(currentUrl, window.location.origin);
                if (urlObj.searchParams.has('file')) {
                    fileName = urlObj.searchParams.get('file');
                } else {
                    fileName = currentUrl.split('/').pop();
                }
            } catch(err) {}

            const file = new File([blob], fileName, { type: blob.type });
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadRes = await this.api.postForm(ApiRoutes.Canvases.UploadTemplate, formData, this.abortController?.signal);
            
            if (uploadRes.success || uploadRes.status === 'success') {
                showMessage(__('msg_template_saved'), 'success');
            } else {
                showMessage(uploadRes.message || __('err_save_template'), 'error');
            }
        } catch (error) {
            
            showMessage(__('err_network_save_template'), 'error');
        } finally {
            restoreButton(btn);
        }
    }
}

export { CanvasChatViewerController };
