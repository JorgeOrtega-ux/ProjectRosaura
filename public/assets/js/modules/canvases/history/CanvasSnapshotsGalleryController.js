import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

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
        document.addEventListener('click', this.handleClickBound);
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
        if (btn.classList.contains('disabled-interactive')) return;
        
        const snapshotUuid = btn.getAttribute('data-id'); // Using snapshot_uuid from php
        if (!snapshotUuid) return;

        const wasLiked = btn.classList.contains('is-favorite');

        if (wasLiked) {
            btn.classList.remove('is-favorite');
        } else {
            btn.classList.add('is-favorite');
        }

        btn.classList.add('disabled-interactive');

        const res = await this.api.post(ApiRoutes.Canvases.ToggleSnapshotLike, { id: snapshotUuid }, this.abortController.signal);

        btn.classList.remove('disabled-interactive');

        if (res && res.success) {
            if (res.data.action === 'added') {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
        } else {
            // Revert on failure
            if (wasLiked) {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
            showMessage(res.message || (window.__('err_default')), 'error');
        }
    }

    closeDropdowns() {
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            el.classList.remove('active');
            el.classList.add('disabled');
        });
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
                if (textSpan) textSpan.textContent = window.__('make_public') || 'Hacer público';
            } else {
                if (iconSpan) iconSpan.textContent = 'visibility_off';
                if (textSpan) textSpan.textContent = window.__('make_private') || 'Hacer privado';
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

        let confirmed = false;
        if (window.dialogSystem && window.dialogSystem.show) {
            const confirmRes = await window.dialogSystem.show('confirmActionModal', {
                title: window.__('delete_snapshot') || 'Eliminar Snapshot',
                message: window.__('confirm_delete_snapshot') || '¿Estás seguro de que deseas eliminar este snapshot? Esta acción no se puede deshacer.',
                inputPlaceholder: 'ELIMINAR',
                expectedInput: 'ELIMINAR'
            });
            if (confirmRes && confirmRes.confirmed) {
                const userInput = confirmRes.data && confirmRes.data.confirm_input ? confirmRes.data.confirm_input.trim().toUpperCase() : '';
                if (userInput === 'ELIMINAR') {
                    confirmed = true;
                } else {
                    showMessage('Debes escribir ELIMINAR', 'error');
                }
            }
        } else {
            const ans = prompt("Escribe ELIMINAR para borrar este snapshot permanentemente.");
            if (ans === 'ELIMINAR') confirmed = true;
        }

        if (!confirmed) return;

        const res = await this.api.post(ApiRoutes.Canvases.DeleteSnapshot, { id: snapshotUuid }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(res.message, 'success');
            const card = document.querySelector(`.component-module[data-module="snapshot-menu-${cardId}"]`)?.closest('.component-gallery-card');
            if (card) {
                card.remove();
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
                showMessage(window.__('msg_link_copied') || 'Enlace copiado', 'success');
                this.closeDropdowns();
            } catch (err) {
                showMessage(window.__('err_default'), 'error');
            }
        }
    }
}

export { CanvasSnapshotsGalleryController };
