import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

class CanvasInvitesController {
    constructor() {
        this.api = new ApiService();
        this.selectedInviteIds = new Set();
        this.isInitialized = false;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        this.wrapper = document.querySelector('[data-ref="manage-invites-wrapper"]');
        if (this.wrapper) {
            this.canvasId = this.wrapper.dataset.canvasId;
            this.canvasUuid = this.wrapper.dataset.canvasUuid;
        }
        
        document.addEventListener('click', this.handleGlobalClickBound);
        this.deselectInvite();
    }

    destroy() {
        document.removeEventListener('click', this.handleGlobalClickBound);
        this.selectedInviteIds.clear();
        this.isInitialized = false;
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

    async revokeSelectedInvites() {
        if (this.selectedInviteIds.size === 0) return;
        
        const resultDialog = await window.modalSystem.show('confirmAction', {
            titleKey: 'Revocar invitación',
            descHtml: `¿Estás seguro de que deseas revocar ${this.selectedInviteIds.size} invitación(es)?`,
            confirmKey: 'Revocar',
            confirmClass: 'component-button--danger'
        });
        
        if (!resultDialog.confirmed) return;

        let successCount = 0;
        let failCount = 0;

        try {
            for (const inviteId of this.selectedInviteIds) {
                const response = await this.api.post('canvases.revoke_invite', {
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
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${window.AppBasePath || ''}/canvases/manage/invites/${this.canvasUuid}`);
                } else {
                    window.location.reload();
                }
            }
            if (failCount > 0) {
                showMessage(__('err_invites_revoke').replace(':count', failCount), 'warning');
            }
        } catch (error) {
            
            showMessage(__('err_connection'), 'error');
        }
    }

    copySelectedInvite() {
        if (this.selectedInviteIds.size !== 1) return;
        
        const targetInviteId = Array.from(this.selectedInviteIds)[0];
        const selectedRow = document.querySelector(`[data-invite-id="${targetInviteId}"]`);
        
        if (selectedRow) {
            const code = selectedRow.getAttribute('data-invite-code');
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    showMessage(__('msg_code_copied'), 'success');
                }).catch(err => {
                    
                    showMessage(__('err_copy_code'), 'error');
                });
            }
        }
    }
}

export { CanvasInvitesController };
