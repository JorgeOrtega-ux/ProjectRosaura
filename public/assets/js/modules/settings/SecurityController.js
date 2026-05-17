// public/assets/js/modules/settings/SecurityController.js
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class SecurityController {
    constructor() {
        this.api = new ApiService();
        this.config = window.AppServerConfig || {};
        this.basePath = window.AppBasePath || '';

        this.abortController = null;

        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
    }

    init() {
        // Corrección del ciclo de vida del AbortController
        this.abortController = new AbortController();
        
        this.bindEvents();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }

        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
    }

    handleClick(e) {
        const btnVerifyPass = e.target.closest('[data-action="submitVerifyCurrentPassword"]');
        if (btnVerifyPass) this.verifyCurrentPassword(btnVerifyPass);

        const btnUpdatePass = e.target.closest('[data-action="submitUpdatePassword"]');
        if (btnUpdatePass) this.updatePassword(btnUpdatePass);

        const btnDeleteAccount = e.target.closest('[data-action="submitDeleteAccount"]');
        if (btnDeleteAccount) this.deleteAccount(btnDeleteAccount);
    }

    handleChange(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'chk_confirm_delete') {
            const passArea = document.querySelector('[data-ref="delete_password_area"]');
            if (passArea) {
                if (e.target.checked) passArea.classList.remove('disabled');
                else passArea.classList.add('disabled');
            }
        }
    }

    async verifyCurrentPassword(btn) {
        const input = document.querySelector('[data-ref="cp_current_password"]');
        if (!input) return;
        const val = input.value.trim();
        if (val === '') { 
            showMessage(__('err_current_password_required'), 'error'); 
            return; 
        }
        
        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.VerifyCurrentPassword, { current_password: val }, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);
        
        if (result.success) {
            document.querySelector('[data-ref="step-1-current-password"]').classList.replace('active', 'disabled');
            document.querySelector('[data-ref="step-2-new-password"]').classList.replace('disabled', 'active');
            setTimeout(() => { const nextInput = document.querySelector('[data-ref="cp_new_password"]'); if (nextInput) nextInput.focus(); }, 50);
        } else showMessage(result.message, 'error');
    }

    async updatePassword(btn) {
        const newPass = document.querySelector('[data-ref="cp_new_password"]');
        const confirmPass = document.querySelector('[data-ref="cp_confirm_password"]');
        if (!newPass || !confirmPass) return;
        
        const valNew = newPass.value; 
        const valConfirm = confirmPass.value;
        
        if (valNew !== valConfirm) { 
            showMessage(__('err_password_mismatch'), 'error'); 
            return; 
        }

        const minPass = this.config.min_password_length || 8;
        const maxPass = this.config.max_password_length || 64;

        if (valNew.length < minPass || valNew.length > maxPass) { 
            showMessage(__('err_password_length').replace(':min', minPass).replace(':max', maxPass), 'error'); 
            return; 
        }

        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdatePassword, { new_password: valNew, confirm_password: valConfirm }, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);
        
        if (result.success) {
            showMessage(result.message, 'success');
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/settings/security');
                else window.location.href = this.basePath + '/settings/security';
            }, 1000);
        } else showMessage(result.message, 'error');
    }

    async deleteAccount(btn) {
        const input = document.querySelector('[data-ref="delete_account_password"]');
        if (!input) return;
        const pass = input.value;
        if (!pass) {
            showMessage(__('err_password_confirm_required'), 'error');
            return;
        }

        setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.DeleteAccount, { password: pass }, this.abortController.signal);
        
        if (res.aborted) return;
        
        if (res.success) {
            window.location.href = this.basePath + '/';
        } else {
            restoreButton(btn);
            showMessage(res.message, 'error');
        }
    }
}

export { SecurityController };