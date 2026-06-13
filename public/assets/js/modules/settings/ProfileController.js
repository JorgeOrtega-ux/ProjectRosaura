// public/assets/js/modules/settings/ProfileController.js
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class ProfileController {
    constructor() {
        this.api = new ApiService();
        this.selectedFile = null;
        this.isDefaultAvatar = false;
        this.config = window.AppServerConfig || {};
        this.dialogResendInterval = null;
        this.basePath = window.AppBasePath || '';
        
        this.abortController = null;
        
        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        
        this.bindEvents();

        const imgEl = document.querySelector('[data-ref="profile-avatar-img"]');
        if (imgEl && imgEl.src.includes('/default/')) {
            this.isDefaultAvatar = true;
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }

        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
        document.removeEventListener('input', this.handleInputBound);
        
        if (this.dialogResendInterval) {
            clearInterval(this.dialogResendInterval);
            this.dialogResendInterval = null;
        }
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
        document.addEventListener('input', this.handleInputBound);
    }

    handleClick(e) {
        if (e.target.closest('[data-ref="btn-change-avatar"]') || e.target.closest('[data-ref="profile-avatar-overlay"]')) {
            const input = document.querySelector('[data-ref="input-avatar-file"]');
            if (input) input.click();
        }

        if (e.target.closest('[data-ref="btn-cancel-avatar"]')) this.cancelAvatarPreview();
        
        const btnSaveAvatar = e.target.closest('[data-ref="btn-save-avatar"]');
        if (btnSaveAvatar) this.saveAvatar(btnSaveAvatar);

        const btnDelAvatar = e.target.closest('[data-ref="btn-delete-avatar"]');
        if (btnDelAvatar) this.deleteAvatar(btnDelAvatar);

        const btnSaveUsername = e.target.closest('[data-action="saveUsername"]');
        if (btnSaveUsername) this.saveUsername(btnSaveUsername);

        const btnRequestEmail = e.target.closest('[data-action="requestEmailUpdate"]');
        if (btnRequestEmail) this.handleEmailUpdateRequest();

        const btnResendDialog = e.target.closest('[data-action="dialogResendCode"]');
        if (btnResendDialog) this.resendEmailUpdateCode(btnResendDialog);

        const btnSaveEmail = e.target.closest('[data-action="saveEmail"]');
        if (btnSaveEmail) this.saveEmail(btnSaveEmail);
        
        const btnDeleteAccount = e.target.closest('[data-action="submitDeleteAccount"]');
        if (btnDeleteAccount) this.deleteAccount(btnDeleteAccount);
    }

    handleChange(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'input-avatar-file') {
            this.handleFileSelection(e);
        }
        
        if (e.target && e.target.getAttribute('data-ref') === 'chk_confirm_delete') {
            const passwordArea = document.querySelector('[data-ref="delete_password_area"]');
            if (passwordArea) {
                if (e.target.checked) {
                    passwordArea.classList.remove('disabled');
                } else {
                    passwordArea.classList.add('disabled');
                }
            }
        }
    }

    handleInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'modal_email_code') {
            let val = e.target.value.replace(/\D/g, ''); 
            let formatted = '';
            for (let i = 0; i < val.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += '-';
                formatted += val[i];
            }
            e.target.value = formatted;
        }
    }

    handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const maxSizeMb = this.config.max_avatar_size_mb || 2;
        if (file.size > maxSizeMb * 1024 * 1024) { 
            showMessage(__('err_file_size_mb').replace(':size', maxSizeMb), 'error'); 
            e.target.value = ''; 
            return; 
        }

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) { 
            showMessage(__('err_file_type_img'), 'error'); 
            e.target.value = ''; 
            return; 
        }

        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const imgEl = document.querySelector('[data-ref="profile-avatar-img"]');
            if (imgEl) imgEl.src = ev.target.result;
            this.toggleAvatarButtons(true);
        };
        reader.readAsDataURL(file);
    }

    cancelAvatarPreview() {
        const imgEl = document.querySelector('[data-ref="profile-avatar-img"]');
        const fileInput = document.querySelector('[data-ref="input-avatar-file"]');
        if (imgEl) imgEl.src = imgEl.getAttribute('data-original-src');
        if (fileInput) fileInput.value = '';
        this.selectedFile = null;
        this.toggleAvatarButtons(false);
    }

    toggleAvatarButtons(isPreview) {
        const btnChange = document.querySelector('[data-ref="btn-change-avatar"]');
        const btnDelete = document.querySelector('[data-ref="btn-delete-avatar"]');
        const btnCancel = document.querySelector('[data-ref="btn-cancel-avatar"]');
        const btnSave = document.querySelector('[data-ref="btn-save-avatar"]');
        if (!btnChange || !btnDelete || !btnCancel || !btnSave) return;
        
        if (isPreview) {
            btnChange.classList.add('disabled');
            btnDelete.classList.add('disabled');
            btnCancel.classList.remove('disabled');
            btnSave.classList.remove('disabled');
        } else {
            btnChange.classList.remove('disabled');
            if (this.isDefaultAvatar) {
                btnDelete.classList.add('disabled');
            } else {
                btnDelete.classList.remove('disabled');
            }
            btnCancel.classList.add('disabled');
            btnSave.classList.add('disabled');
        }
    }

    async saveAvatar(btn) {
        if (!this.selectedFile) return;
        setButtonLoading(btn);
        const formData = new FormData();
        formData.append('avatar', this.selectedFile);
        
        const result = await this.api.postForm(ApiRoutes.Settings.UpdateAvatar, formData, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);
        
        if (result.success) {
            showMessage(result.message, 'success');
            const imgEl = document.querySelector('[data-ref="profile-avatar-img"]');
            if (imgEl) { imgEl.src = result.new_avatar; imgEl.setAttribute('data-original-src', result.new_avatar); }
            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;
            const fileInput = document.querySelector('[data-ref="input-avatar-file"]');
            if (fileInput) fileInput.value = '';
            
            this.selectedFile = null;
            this.isDefaultAvatar = false; 
            this.toggleAvatarButtons(false);
            
            const btnChange = document.querySelector('[data-ref="btn-change-avatar"]');
            if (btnChange) {
                btnChange.textContent = __('btn_change_avatar');
            }
        } else showMessage(result.message, 'error');
    }

    async deleteAvatar(btn) {
        const isConfirmed = await window.dialogSystem.show('confirmDeleteAvatar');
        if (!isConfirmed.confirmed) return;
        
        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.DeleteAvatar, {}, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);
        
        if (result.success) {
            showMessage(result.message, 'success');
            const imgEl = document.querySelector('[data-ref="profile-avatar-img"]');
            if (imgEl) { imgEl.src = result.new_avatar; imgEl.setAttribute('data-original-src', result.new_avatar); }
            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;
            
            this.isDefaultAvatar = true; 
            this.toggleAvatarButtons(false);
            
            const btnChange = document.querySelector('[data-ref="btn-change-avatar"]');
            if (btnChange) {
                btnChange.textContent = __('btn_upload_avatar');
            }
        } else showMessage(result.message, 'error');
    }

    async saveUsername(btn) {
        const input = document.querySelector('[data-ref="input-username"]');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('username'); return; }
        
        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdateUsername, { username: val }, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);
        
        if (result.success) {
            showMessage(result.message, 'success');
            document.querySelector('[data-ref="display-username"]').textContent = result.new_username;
            input.setAttribute('data-original-value', result.new_username);
            window.appInstance.toggleEditState('username');
        } else showMessage(result.message, 'error');
    }

    async handleEmailUpdateRequest() {
        window.dialogSystem.show('loadingEmailCode');
        const res = await this.api.post(ApiRoutes.Settings.RequestEmailCode, {}, this.abortController.signal);
        
        if (res.aborted) {
            window.dialogSystem.closeCurrent(false);
            return;
        }
        
        window.dialogSystem.closeCurrent(false);
        await new Promise(resolve => setTimeout(resolve, 350));
        
        if (res.success) {
            if (res.skip_verification) { window.appInstance.toggleEditState('email'); return; }
            showMessage(res.message, 'success');
            
            const currentEmail = document.querySelector('[data-ref="display-email"]').textContent.trim();
            const verifyDialogPromise = window.dialogSystem.show('verifyEmailCode', { email: currentEmail });
            
            const resendBtn = document.querySelector('[data-action="dialogResendCode"]');
            if (resendBtn) {
                let elapsed = res.elapsed || 0;
                let remainingTime = Math.max(0, 60 - elapsed);
                this.startDialogResendTimer(resendBtn, remainingTime);
            }

            const verifyDialog = await verifyDialogPromise;
            
            if (this.dialogResendInterval) clearInterval(this.dialogResendInterval);

            if (verifyDialog.confirmed) {
                const code = verifyDialog.data['modal_email_code'];
                if (!code) { 
                    showMessage(__('err_code_required'), 'error'); 
                    return; 
                }
                const verifyRes = await this.api.post(ApiRoutes.Settings.VerifyEmailCode, { code }, this.abortController.signal);
                
                if (verifyRes.aborted) return;
                
                if (verifyRes.success) { 
                    showMessage(verifyRes.message, 'success'); 
                    window.appInstance.toggleEditState('email'); 
                } 
                else showMessage(verifyRes.message, 'error');
            }
        } else {
            showMessage(res.message, 'error');
        }
    }

    async resendEmailUpdateCode(btn) {
        if (btn.classList.contains('disabled-interactive')) return;
        
        btn.classList.add('disabled-interactive', 'component-text-notice--muted');

        const result = await this.api.post(ApiRoutes.Settings.ResendEmailCode, {}, this.abortController.signal);
        
        if (result.aborted) return;

        if (result.success) {
            showMessage(result.message, 'success');
            this.startDialogResendTimer(btn, 60);
        } else {
            showMessage(result.message, 'error');
            if (result.cooldown) {
                this.startDialogResendTimer(btn, result.cooldown);
            } else {
                btn.classList.remove('disabled-interactive', 'component-text-notice--muted');
                btn.textContent = __('btn_resend_code');
            }
        }
    }

    startDialogResendTimer(element, seconds) {
        if (this.dialogResendInterval) clearInterval(this.dialogResendInterval);
        let timeLeft = seconds;
        const defaultText = __('btn_resend_code');
        
        const updateUI = () => {
            if (timeLeft <= 0) {
                clearInterval(this.dialogResendInterval);
                element.classList.remove('disabled-interactive', 'component-text-notice--muted');
                element.textContent = defaultText;
            } else {
                element.classList.add('disabled-interactive', 'component-text-notice--muted');
                element.textContent = `${defaultText} (${timeLeft})`;
            }
        };
        
        updateUI(); 
        
        if (timeLeft > 0) {
            this.dialogResendInterval = setInterval(() => {
                timeLeft--;
                updateUI();
            }, 1000);
        }
    }

    async saveEmail(btn) {
        const input = document.querySelector('[data-ref="input-email"]');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('email'); return; }
        
        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdateEmail, { email: val }, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);
        
        if (result.success) {
            showMessage(result.message, 'success');
            document.querySelector('[data-ref="display-email"]').textContent = result.new_email;
            input.setAttribute('data-original-value', result.new_email);
            window.appInstance.toggleEditState('email');
        } else showMessage(result.message, 'error');
    }

    async deleteAccount(btn) {
        const chkConfirm = document.querySelector('[data-ref="chk_confirm_delete"]');
        const passInput = document.querySelector('[data-ref="delete_account_password"]');

        if (!chkConfirm || !chkConfirm.checked) {
            showMessage("Debes confirmar la eliminación.", "error");
            return;
        }

        if (!passInput || !passInput.value) {
            showMessage(__('err_password_required'), "error");
            return;
        }

        setButtonLoading(btn);

        const data = { password: passInput.value };
        const result = await this.api.post(ApiRoutes.Settings.DeleteAccount, data, this.abortController.signal);

        if (result.aborted) return;

        restoreButton(btn);

        if (result.success) {
            showMessage("Proceso de eliminación iniciado con éxito.", "success");
            setTimeout(() => {
                window.location.href = this.basePath + '/login';
            }, 2000);
        } else {
            showMessage(result.message, "error");
        }
    }
}

export { ProfileController };