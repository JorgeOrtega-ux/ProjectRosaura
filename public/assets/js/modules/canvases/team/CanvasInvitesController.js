import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, catchPaginationClick, copyToClipboard } from '../../../core/utils/uiUtils.js';

class CanvasInvitesController {
    constructor() {
        this.api = new ApiService();
        this.selectedInviteIds = new Set();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        
        this.wrapper = document.querySelector('[data-ref="manage-invites-wrapper"]');
        if (this.wrapper) {
            this.canvasId = this.wrapper.dataset.canvasId;
            this.canvasUuid = this.wrapper.dataset.canvasUuid;
        }
        
        this.bindEvents();
        this.deselectInvite();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handlePaginationClickBound, true);
        document.removeEventListener('click', this.handleGlobalClickBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.selectedInviteIds.clear();
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handlePaginationClick(e) {
        catchPaginationClick(e, url => this.handlePagination(url));
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/canvases/manage/invites/')) {
            this.wrapper = document.querySelector('[data-ref="manage-invites-wrapper"]');
            if (this.wrapper) {
                this.canvasId = this.wrapper.dataset.canvasId;
                this.canvasUuid = this.wrapper.dataset.canvasUuid;
            }
            this.deselectInvite();
        }
    }

    handleGlobalClick(e) {
        if (!this.wrapper) return;

        const btnCopy = e.target.closest('[data-action="copySelectedInvite"]');
        const selectTargetRow = e.target.closest('[data-action="selectInvite"]');
        const deselectBtn = e.target.closest('[data-action="deselectInvite"]');
        const revokeSelectedBtn = e.target.closest('[data-action="revokeSelectedInvites"]');

        if (btnCopy) this.copySelectedInvite();
        
        if (selectTargetRow && !e.target.closest('button')) {
            this.handleInviteSelection(selectTargetRow);
        }

        if (deselectBtn) this.deselectInvite();
        if (revokeSelectedBtn) this.revokeSelectedInvites();
    }

    handleInviteSelection(rowElement) {
        const inviteId = rowElement.getAttribute('data-invite-id');
        
        if (this.selectedInviteIds.has(inviteId)) {
            this.selectedInviteIds.delete(inviteId);
            rowElement.classList.remove('selected');
        } else {
            this.selectedInviteIds.add(inviteId);
            rowElement.classList.add('selected');
        }

        this.updateSelectionUI();
    }

    deselectInvite() {
        this.selectedInviteIds.clear();
        document.querySelectorAll('[data-action="selectInvite"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        const copyBtn = document.querySelector('[data-action="copySelectedInvite"]');

        if (this.selectedInviteIds.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');
            
            if (this.selectedInviteIds.size > 1) {
                if (copyBtn) copyBtn.classList.add('disabled-interaction');
            } else {
                if (copyBtn) copyBtn.classList.remove('disabled-interaction');
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="view-table"]');
        if (tableContainer) {
            tableContainer.classList.add('disabled-interaction');
        }

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : null });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newTable = doc.querySelector('[data-ref="view-table"]');
            if (newTable && tableContainer) {
                tableContainer.innerHTML = newTable.innerHTML;
            }

            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            this.deselectInvite();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.reload();
            else window.location.href = url;
        } finally {
            if (tableContainer) {
                tableContainer.classList.remove('disabled-interaction');
            }
        }
    }

    async revokeSelectedInvites() {
        if (this.selectedInviteIds.size === 0) return;
        
        const resultDialog = await window.modalSystem.show('confirmAction', {
            titleKey: 'title_revoke_invite',
            descHtml: window.__('msg_confirm_revoke_invites').replace(':count', this.selectedInviteIds.size),
            confirmKey: 'btn_revoke',
            confirmClass: 'component-button--danger'
        });
        
        if (!resultDialog.confirmed) return;

        let successCount = 0;
        let failCount = 0;

        try {
            for (const inviteId of this.selectedInviteIds) {
                const response = await this.api.post(ApiRoutes.Canvases.RevokeInvite, {
                    canvas_id: this.canvasId,
                    invite_id: inviteId
                });
                
                if (response && response.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            if (successCount > 0) {
                showMessage(__('msg_invites_revoked').replace(':count', successCount), 'success');
                this.deselectInvite();
                await this.handlePagination(window.location.href);
            }
            if (failCount > 0) {
                showMessage(__('err_invites_revoke').replace(':count', failCount), 'warning');
            }
        } catch (error) {
            showMessage(__('err_connection'), 'error');
        }
    }

    async copySelectedInvite() {
        if (this.selectedInviteIds.size !== 1) return;
        
        const targetInviteId = Array.from(this.selectedInviteIds)[0];
        const selectedRow = document.querySelector(`[data-invite-id="${targetInviteId}"]`);
        
        if (selectedRow) {
            const code = selectedRow.getAttribute('data-invite-code');
            if (code) {
                await copyToClipboard(code, __('msg_code_copied'), __('err_copy_code'));
            }
        }
    }
}

export { CanvasInvitesController };