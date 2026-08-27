import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiService.js';
import { formatNumber, showMessage } from '../../core/utils/uiUtils.js';

export class UserProfileController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;

        this._boundClick = this.handleClick.bind(this);
        this._boundChange = this.handleChange.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="profile-container"]') || document.querySelector('.component-profile-view') || document.body;
        this.abortController = new AbortController();
        this.bindEvents();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.container) {
            this.container.removeEventListener('click', this._boundClick);
            this.container.removeEventListener('change', this._boundChange);
        }
    }

    bindEvents() {
        if (this.container) {
            this.container.addEventListener('click', this._boundClick);
            this.container.addEventListener('change', this._boundChange);
        }
    }

    handleClick(e) {
        const tabBtn = e.target.closest('[data-action="switchProfileTab"]');
        if (tabBtn) {
            const targetTab = tabBtn.getAttribute('data-tab');
            this._switchTab(targetTab, tabBtn);
            return;
        }

        const profileFollowBtn = e.target.closest('[data-action="toggleProfileFollow"]');
        if (profileFollowBtn) {
            const userId = profileFollowBtn.getAttribute('data-user-id');
            this._toggleProfileFollow(userId, profileFollowBtn);
            return;
        }

        const userFollowBtn = e.target.closest('[data-action="toggleUserFollow"]');
        if (userFollowBtn) {
            const userId = userFollowBtn.getAttribute('data-user-id');
            this._toggleFollow(userId, userFollowBtn);
            return;
        }

        if (e.target.closest('[data-action="triggerBannerUpload"]')) {
            const fileInput = document.querySelector('[data-ref="input-profile-banner-file"]');
            if (fileInput) fileInput.click();
            return;
        }

        if (e.target.closest('[data-action="copyProfileLink"]')) {
            this._copyProfileLink();
            return;
        }

        const likeBtn = e.target.closest('[data-action="togglePublicationLike"]');
        if (likeBtn) {
            const pubUuid = likeBtn.getAttribute('data-uuid');
            this._toggleLike(pubUuid, likeBtn);
            return;
        }

        const favBtn = e.target.closest('[data-action="toggleFavorite"]');
        if (favBtn) {
            const canvasId = favBtn.getAttribute('data-id');
            this._toggleCanvasFavorite(canvasId, favBtn);
            return;
        }
    }

    handleChange(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'input-profile-banner-file') {
            this._handleBannerFileSelected(e);
        }
    }

    _switchTab(tabName, activeBtn) {
        const tabs = document.querySelectorAll('[data-action="switchProfileTab"]');
        tabs.forEach(t => {
            if (t.classList.contains('component-tab-btn')) {
                t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
            }
        });

        const contents = document.querySelectorAll('.component-profile-tab-content');
        contents.forEach(c => {
            c.classList.remove('active');
        });

        const targetContent = document.querySelector(`[data-ref="tab-content-${tabName}"]`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    async _toggleProfileFollow(userId, buttonEl) {
        if (!userId || buttonEl.disabled) return;
        buttonEl.disabled = true;

        try {
            const res = await this.api.post(ApiRoutes.User.ToggleFollow, { user_id: userId }, this.abortController.signal);
            if (res && res.success) {
                const isFollowing = res.is_following;
                buttonEl.classList.toggle('component-button--secondary', isFollowing);
                buttonEl.classList.toggle('component-button--primary', !isFollowing);

                const icon = buttonEl.querySelector('.material-symbols-rounded');
                if (icon) icon.textContent = isFollowing ? 'person_remove' : 'person_add';

                const text = buttonEl.querySelector('.btn-text');
                if (text) text.textContent = isFollowing ? (window.__('profile.unfollow') || 'Dejar de seguir') : (window.__('profile.follow') || 'Seguir');

                if (typeof res.followers_count === 'number') {
                    const formatted = formatNumber(res.followers_count);
                    const headCount = document.querySelector('[data-ref="profile-followers-count"]');
                    if (headCount) headCount.textContent = formatted;

                    const tabBadge = document.querySelector('[data-ref="tab-badge-followers"]');
                    if (tabBadge) tabBadge.textContent = formatted;

                    const statFollowers = document.querySelector('[data-ref="stat-followers"]');
                    if (statFollowers) statFollowers.textContent = formatted;
                }

                if (res.message) showMessage(res.message, 'success');
            } else if (res && res.message) {
                showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage(window.__('err_follow_failed') || 'Error al actualizar seguimiento.', 'error');
        } finally {
            buttonEl.disabled = false;
        }
    }

    async _toggleFollow(userId, buttonEl) {
        if (!userId || buttonEl.disabled) return;
        buttonEl.disabled = true;

        try {
            const res = await this.api.post(ApiRoutes.User.ToggleFollow, { user_id: userId }, this.abortController.signal);
            if (res && res.success) {
                const isFollowing = res.is_following;
                buttonEl.classList.toggle('component-button--secondary', isFollowing);
                buttonEl.classList.toggle('component-button--primary', !isFollowing);

                const icon = buttonEl.querySelector('.material-symbols-rounded');
                if (icon) icon.textContent = isFollowing ? 'person_remove' : 'person_add';

                const text = buttonEl.querySelector('.btn-text');
                if (text) text.textContent = isFollowing ? (window.__('profile.unfollow') || 'Dejar de seguir') : (window.__('profile.follow') || 'Seguir');

                const card = buttonEl.closest('.component-user-card');
                if (card) {
                    const countEl = card.querySelector('.user-followers-count');
                    if (countEl && typeof res.followers_count === 'number') {
                        countEl.textContent = formatNumber(res.followers_count);
                    }
                }

                if (res.message) showMessage(res.message, 'success');
            } else if (res && res.message) {
                showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage(window.__('err_follow_failed') || 'Error al actualizar seguimiento.', 'error');
        } finally {
            buttonEl.disabled = false;
        }
    }

    async _handleBannerFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;

        const maxMb = 10;
        if (file.size > maxMb * 1024 * 1024) {
            showMessage(window.__('profile.banner_size_exceeded'), 'error');
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

                showMessage(window.__('profile.banner_uploading'), 'info');
                const res = await this.api.postForm(ApiRoutes.Settings.UpdateBanner, formData, this.abortController.signal);

                if (res && res.success) {
                    if (bannerImg) {
                        bannerImg.src = res.new_banner;
                        bannerImg.classList.remove('disabled');
                    }
                    if (placeholder) {
                        placeholder.classList.add('disabled');
                    }
                    showMessage(res.message, 'success');
                } else {
                    showMessage(res.message, 'error');
                }
            }
        } catch (err) {
            showMessage(window.__('profile.banner_processing_error'), 'error');
        } finally {
            URL.revokeObjectURL(imageSrc);
            e.target.value = '';
        }
    }

    _copyProfileLink() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showMessage(window.__('profile.link_copied'), 'success');
        }).catch(() => {
            showMessage(window.__('profile.copy_link_error'), 'error');
        });
    }

    async _toggleLike(pubUuid, buttonEl) {
        if (!pubUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Publications.ToggleLike, { uuid: pubUuid }, this.abortController.signal);
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
            } else if (res && res.message) {
                showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage(window.__('profile.like_error'), 'error');
        }
    }

    async _toggleCanvasFavorite(canvasId, buttonEl) {
        if (!canvasId) return;

        try {
            const res = await this.api.post(ApiRoutes.Canvases.ToggleFavorite, { canvas_id: canvasId }, this.abortController.signal);
            if (res && res.success) {
                buttonEl.classList.toggle('is-favorite', res.is_favorite);
                if (res.message) showMessage(res.message, 'success');
            } else if (res && res.message) {
                showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage(window.__('profile.favorite_error'), 'error');
        }
    }
}

export { UserProfileController as ProfileModuleController };