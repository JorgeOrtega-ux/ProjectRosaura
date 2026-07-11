import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class ChatViewerController {
    constructor() {
        this.api = new ApiService();
        this.images = [];
        this.currentIndex = 0;
        this.isInitialized = false;

        this.handleClickBound = this.handleClick.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.bindEvents();
        this.loadState();
        this.updateView();
    }

    destroy() {
        document.removeEventListener('click', this.handleClickBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleViewLoaded(e) {
        if (e && e.detail && !e.detail.cleanUrl.includes('/canvases/chat-viewer')) return;
        this.loadState();
        this.updateView();
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/canvases/chat-viewer')) return;

        const btnPrev = e.target.closest('#cv-btn-prev');
        if (btnPrev) {
            if (btnPrev.classList.contains('disabled-interaction')) return;
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.updateView();
            }
            return;
        }

        const btnNext = e.target.closest('#cv-btn-next');
        if (btnNext) {
            if (btnNext.classList.contains('disabled-interaction')) return;
            if (this.currentIndex < this.images.length - 1) {
                this.currentIndex++;
                this.updateView();
            }
            return;
        }

        const btnDownload = e.target.closest('#cv-btn-download');
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
                const msgId = urlParams.get('msg');
                if (msgId) {
                    const stored = sessionStorage.getItem('chat_viewer_images_' + msgId);
                    if (stored) {
                        this.images = JSON.parse(stored);
                    }
                }
            }
        } catch(err) {
            console.error('Error parseando imágenes del visor:', err);
        }
        
        this.currentIndex = parseInt(wrapper.dataset.idx, 10) || 0;
    }

    updateView() {
        const mainImg = document.getElementById('cv-main-image');
        const counter = document.getElementById('cv-counter');
        const btnPrev = document.getElementById('cv-btn-prev');
        const btnNext = document.getElementById('cv-btn-next');
        
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
            const response = await fetch(currentUrl);
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
            
            const uploadRes = await this.api.postForm(ApiRoutes.Canvases.UploadTemplate, formData);
            
            if (uploadRes.success || uploadRes.status === 'success') {
                showMessage(__('plantilla_guardada_exito') || 'Plantilla guardada exitosamente', 'success');
            } else {
                showMessage(uploadRes.message || __('error_guardar_plantilla') || 'Error al guardar la plantilla', 'error');
            }
        } catch (error) {
            console.error('Error descargando plantilla:', error);
            showMessage(__('error_red_guardar_plantilla') || 'Error de red al guardar la plantilla', 'error');
        } finally {
            restoreButton(btn);
        }
    }
}

export { ChatViewerController };
