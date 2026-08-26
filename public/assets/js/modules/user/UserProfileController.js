import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton, formatNumber } from '../../core/utils/uiUtils.js';

export class UserProfileController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        this.updateGlider();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
        window.removeEventListener('resize', this.handleResizeBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
        window.addEventListener('resize', this.handleResizeBound);
    }

    handleResize() {
        this.updateGlider();
    }

    handleClick(e) {
        // Tab switching
        const tabBtn = e.target.closest('[data-action="switchProfileTab"]');
        if (tabBtn) {
            const targetTab = tabBtn.getAttribute('data-tab');
            this.switchTab(targetTab, tabBtn);
            return;
        }

        // Trigger banner upload
        if (e.target.closest('[data-action="triggerBannerUpload"]')) {
            const fileInput = document.querySelector('[data-ref="input-profile-banner-file"]');
            if (fileInput) fileInput.click();
            return;
        }

        // Copy profile link
        if (e.target.closest('[data-action="copyProfileLink"]')) {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showMessage(window.__('link_copied') || 'Enlace copiado al portapapeles', 'success');
            }).catch(() => {
                showMessage('Error al copiar enlace', 'error');
            });
            return;
        }

        // Toggle publication like
        const likeBtn = e.target.closest('[data-action="togglePublicationLike"]');
        if (likeBtn) {
            const pubUuid = likeBtn.getAttribute('data-uuid');
            this.toggleLike(pubUuid, likeBtn);
            return;
        }

        // Toggle canvas favorite
        const favBtn = e.target.closest('[data-action="toggleFavorite"]');
        if (favBtn) {
            const canvasId = favBtn.getAttribute('data-id');
            this.toggleCanvasFavorite(canvasId, favBtn);
            return;
        }
    }

    handleChange(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'input-profile-banner-file') {
            this.handleBannerFileSelected(e);
        }
    }

    switchTab(tabName, activeBtn) {
        const tabs = document.querySelectorAll('[data-action="switchProfileTab"]');
        tabs.forEach(t => t.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');

        const contents = document.querySelectorAll('.component-profile-tab-content');
        contents.forEach(c => {
            c.classList.add('disabled');
            c.classList.remove('active');
        });

        const targetContent = document.querySelector(`[data-ref="tab-content-${tabName}"]`);
        if (targetContent) {
            targetContent.classList.remove('disabled');
            targetContent.classList.add('active');
        }

        this.updateGlider(activeBtn);
    }

    updateGlider(activeBtn = null) {
        const pill = document.querySelector('[data-ref="profile-toggle-pill"]');
        const glider = document.querySelector('[data-ref="profile-glider"]');
        if (!pill || !glider) return;

        const target = activeBtn || pill.querySelector('[data-action="switchProfileTab"].active');
        if (!target) return;

        const pillRect = pill.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const offsetLeft = targetRect.left - pillRect.left;
        glider.style.width = `${targetRect.width}px`;
        glider.style.transform = `translateX(${offsetLeft - 4}px)`;
    }

    async handleBannerFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;

        const maxMb = 10;
        if (file.size > maxMb * 1024 * 1024) {
            showMessage(window.__('upload.size_exceeded') || `El archivo supera el límite de ${maxMb}MB`, 'error');
            e.target.value = '';
            return;
        }

        const imageSrc = URL.createObjectURL(file);

        try {
            const modalRes = await window.modalSystem.show('bannerCropperModal', {
                imageSrc: imageSrc,
                fileName: file.name
            });

            if (modalRes && modalRes.confirmed && modalRes.data && modalRes.data.blob) {
                const croppedBlob = modalRes.data.blob;
                const formData = new FormData();
                const rawName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'banner';
                const uploadFileName = `${rawName}.webp`;
                formData.append('banner', croppedBlob, uploadFileName);

                const bannerImg = document.querySelector('[data-ref="profile-banner-img"]');
                const placeholder = document.querySelector('[data-ref="profile-banner-placeholder"]');

                showMessage(window.__('uploading') || 'Subiendo banner...', 'info');
                const res = await this.api.post(ApiRoutes.Settings.UpdateBanner, formData);

                if (res && res.success) {
                    if (bannerImg) {
                        bannerImg.src = res.new_banner;
                        bannerImg.classList.remove('disabled');
                    }
                    if (placeholder) {
                        placeholder.classList.add('disabled');
                    }
                    showMessage(res.message || 'Banner actualizado', 'success');
                } else {
                    showMessage((res && res.message) || 'Error al actualizar banner', 'error');
                }
            }
        } catch (err) {
            console.error('Error cropping/uploading banner:', err);
            showMessage('Error al procesar banner', 'error');
        } finally {
            URL.revokeObjectURL(imageSrc);
            e.target.value = '';
        }
    }

    async toggleLike(pubUuid, buttonEl) {
        if (!pubUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Publications.ToggleLike, { uuid: pubUuid });
            if (res && res.success) {
                if (res.liked) {
                    buttonEl.classList.add('is-favorite');
                } else {
                    buttonEl.classList.remove('is-favorite');
                }

                const card = buttonEl.closest('.component-publication-card');
                if (card) {
                    const countEl = card.querySelector('.pub-like-count');
                    if (countEl) {
                        countEl.textContent = formatNumber(res.likes_count);
                    }
                }
            } else {
                if (res && res.message) showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage('Error al procesar Me Gusta', 'error');
        }
    }

    async toggleCanvasFavorite(canvasId, buttonEl) {
        if (!canvasId) return;

        try {
            const res = await this.api.post(ApiRoutes.Canvases.ToggleFavorite, { canvas_id: canvasId });
            if (res && res.success) {
                buttonEl.classList.toggle('is-favorite', res.is_favorite);
                if (res.message) showMessage(res.message, 'success');
            } else {
                if (res && res.message) showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage('Error al procesar favorito', 'error');
        }
    }
}
