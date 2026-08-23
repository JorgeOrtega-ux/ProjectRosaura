import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { closeAllDropdowns, showMessage } from '../../../core/utils/uiUtils.js';

class CanvasSnapshotsGalleryController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false;

        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        if (this.isInitialized) {
            this.destroy();
        }
        
        this.abortController = new AbortController();
        this.bindEvents();
        this.isInitialized = true;
    }

    destroy() {
        document.removeEventListener('click', this.handleClickBound);
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    async handleClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');

        if (action === 'toggleSnapshotLike') {
            e.preventDefault();
            this.toggleLike(btn);
        } else if (action === 'toggleSnapshotPrivacy') {
            e.preventDefault();
            this.togglePrivacy(btn);
        } else if (action === 'deleteSnapshot') {
            e.preventDefault();
            this.deleteSnapshot(btn);
        } else if (action === 'openSnapshotNewTab') {
            e.preventDefault();
            this.openSnapshotNewTab(btn);
        } else if (action === 'copySnapshotLink') {
            e.preventDefault();
            this.copySnapshotLink(btn);
        }
    }

    async toggleLike(btn) {
        if (btn.classList.contains('disabled-interaction')) return;
        
        const snapshotUuid = btn.getAttribute('data-id');
        if (!snapshotUuid) return;

        const wasLiked = btn.classList.contains('is-favorite');

        if (wasLiked) {
            btn.classList.remove('is-favorite');
        } else {
            btn.classList.add('is-favorite');
        }

        btn.classList.add('disabled-interaction');

        const res = await this.api.post(ApiRoutes.Canvases.ToggleSnapshotLike, { id: snapshotUuid }, this.abortController.signal);

        btn.classList.remove('disabled-interaction');

        if (res && res.success) {
            if (res.data.action === 'added') {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
        } else {
            if (wasLiked) {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
            showMessage(res.message || (window.__('err_default')), 'error');
        }
    }

    closeDropdowns() {
        closeAllDropdowns();
    }

    async togglePrivacy(btn) {
        const snapshotUuid = btn.getAttribute('data-id');
        if (!snapshotUuid) return;

        this.closeDropdowns();

        const res = await this.api.post(ApiRoutes.Canvases.ToggleSnapshotPrivacy, { id: snapshotUuid }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(res.message, 'success');
            const newPrivacy = res.data.privacy;
            const iconSpan = btn.querySelector('.component-menu-link-icon span');
            const textSpan = btn.querySelector('.privacy-text');
            
            if (newPrivacy === 'private') {
                if (iconSpan) iconSpan.textContent = 'visibility';
                if (textSpan) textSpan.textContent = window.__('make_public');
            } else {
                if (iconSpan) iconSpan.textContent = 'visibility_off';
                if (textSpan) textSpan.textContent = window.__('make_private');
            }

            const card = btn.closest('.component-gallery-card');
            if (card) {
                const badgesContainer = card.querySelector('.component-gallery-badges-container');
                if (badgesContainer) {
                    if (newPrivacy === 'private') {
                        if (!badgesContainer.querySelector('.component-badge--danger')) {
                            const badge = document.createElement('div');
                            badge.className = 'component-badge component-badge--danger';
                            badge.innerHTML = `<span class="material-symbols-rounded">lock</span><span>${window.__('canvas_privacy_private')}</span>`;
                            badgesContainer.appendChild(badge);
                        }
                    } else {
                        const badge = badgesContainer.querySelector('.component-badge--danger');
                        if (badge) badge.remove();
                    }
                }
            }
        } else {
            showMessage(res.message, 'error');
        }
    }

    async deleteSnapshot(btn) {
        const snapshotUuid = btn.getAttribute('data-id');
        const cardId = btn.getAttribute('data-card-id');
        if (!snapshotUuid) return;

        this.closeDropdowns();

        const confirmRes = await window.modalSystem.show('confirmActionModal', {
            title: window.__('delete_captura'),
            message: window.__('confirm_delete_captura')
        });
        if (!confirmRes || !confirmRes.confirmed) return;

        const res = await this.api.post(ApiRoutes.Canvases.DeleteSnapshot, { id: snapshotUuid }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(res.message, 'success');
            const card = document.querySelector(`.component-module[data-module="snapshot-menu-${cardId}"]`)?.closest('.component-gallery-card');
            if (card) {
                const grid = card.closest('.component-grid');
                card.remove();

                if (grid && grid.querySelectorAll('.component-gallery-card:not([data-card-role="promo"])').length === 0) {
                    const bottomArea = document.querySelector('[data-ref="dynamic-content-area"]');
                    if (bottomArea) {
                        bottomArea.innerHTML = CardTemplates.emptyState({
                            type: 'snapshots',
                            title: window.__('snapshots_empty_title'),
                            message: window.__('snapshots_empty_desc')
                        });
                    }
                }
            }
        } else {
            showMessage(res.message, 'error');
        }
    }

    openSnapshotNewTab(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            window.open(`${this.basePath}/snapshot/view/${uuid}`, '_blank');
            this.closeDropdowns();
        }
    }

    async copySnapshotLink(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            const url = `${window.location.origin}${this.basePath}/snapshot/view/${uuid}`;
            try {
                await navigator.clipboard.writeText(url);
                showMessage(window.__('msg_link_copied'), 'success');
                this.closeDropdowns();
            } catch (err) {
                showMessage(window.__('err_default'), 'error');
            }
        }
    }
}

export { CanvasSnapshotsGalleryController };