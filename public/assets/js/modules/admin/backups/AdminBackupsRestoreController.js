// public/assets/js/modules/admin/backups/AdminBackupsRestoreController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

class AdminBackupsRestoreController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.isRestoring = false;
        this.pollInterval = null;
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
        }
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
    }

    handleChange(e) {
        if (!window.location.pathname.includes('/admin/backups/restore')) return;

        const toggleLock = e.target.closest('[data-action="toggleRestoreLock"]');
        if (toggleLock) {
            const confirmBtn = document.querySelector('[data-action="confirmRestore"]');
            if (confirmBtn) {
                if (toggleLock.checked) {
                    confirmBtn.classList.remove('disabled-interaction');
                } else {
                    confirmBtn.classList.add('disabled-interaction');
                }
            }
        }
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/backups/restore')) return;

        const confirmBtn = e.target.closest('[data-action="confirmRestore"]');

        if (confirmBtn) {
            this.handleConfirmRestore(confirmBtn);
        }
    }

    async handleConfirmRestore(btn) {
        const urlParams = new URLSearchParams(window.location.search);
        const backupId = urlParams.get('id');

        if (!backupId) {
            showMessage(__('err_backup_id_missing'), 'error');
            return;
        }

        const resultDialog = await window.dialogSystem.show('verifyPasswordDialog', {
            title: __('admin_verify_identity_title'),
            desc: __('msg_confirm_restore_password'),
            confirmText: __('btn_confirm_restore')
        });

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['dialog_verify_password'] ? resultDialog.data['dialog_verify_password'].trim() : '';

        if (!password) {
            showMessage(__('err_password_authorize_restore'), 'error');
            return;
        }

        if (this.isRestoring) return;
        this.isRestoring = true;

        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-rounded spin-icon" style="color: white;">autorenew</span>';
        btn.classList.add('disabled-interaction');

        showMessage('Initiating lockdown protocol...', 'success');

        const res = await this.api.post(ApiRoutes.Admin.RestoreBackup, { backup_id: backupId, password: password }, this.abortController.signal);

        if (res.aborted) return;

        if (res.success && res.job_id) {
            this.pollRestoreStatus(res.job_id, btn, originalText);
        } else {
            this.resetRestoreUI(btn, originalText);
            showMessage(res.message || __('err_start_restore'), 'error');
        }
    }

    async pollRestoreStatus(jobId, btn, originalText) {
        if (this.pollInterval) clearInterval(this.pollInterval);

        this.pollInterval = setInterval(async () => {
            const res = await this.api.post('admin.backups.check_worker_status', {}, this.abortController.signal);
            
            if (res.aborted) return;
            
            if (res.success) {
                if (res.status === 'finished') {
                    clearInterval(this.pollInterval);
                    this.resetRestoreUI(btn, originalText);
                    showMessage(__('success_db_restored'), 'success');
                    
                    window.location.href = this.basePath + '/login';

                } else if (res.status === 'restoring') {
                    // Seguimos esperando en la pantalla
                }
            } else {
                clearInterval(this.pollInterval);
                this.resetRestoreUI(btn, originalText);
                showMessage(res.message || __('err_connection'), 'error');
            }
        }, 2500);
    }

    resetRestoreUI(btn, originalText) {
        this.isRestoring = false;
        if (btn) {
            btn.innerHTML = originalText;
            btn.classList.remove('disabled-interaction');
        }
    }
}

export { AdminBackupsRestoreController };