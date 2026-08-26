import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton, formatNumber } from '../../core/utils/uiUtils.js';

export class UserProfileController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
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
    }

    async handleBannerFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;

        const maxMb = 5;
        if (file.size > maxMb * 1024 * 1024) {
            showMessage(window.__('upload.size_exceeded') || `El archivo supera el límite de ${maxMb}MB`, 'error');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('banner', file);

        const bannerImg = document.querySelector('[data-ref="profile-banner-img"]');
        const placeholder = document.querySelector('[data-ref="profile-banner-placeholder"]');

        try {
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
        } catch (err) {
            showMessage('Error al subir banner', 'error');
        } finally {
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
}
