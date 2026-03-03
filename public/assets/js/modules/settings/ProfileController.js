// public/assets/js/modules/settings/ProfileController.js
import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class ProfileController {
    constructor() {
        this.api = new ApiService();
        this.selectedFile = null;
        this.isDefaultAvatar = false;
        this.config = window.AppServerConfig || {};
    }

    init() {
        this.bindEvents();
        console.log("ProfileController inicializado.");

        const imgEl = document.getElementById('profile-avatar-img');
        if (imgEl && imgEl.src.includes('/default/')) {
            this.isDefaultAvatar = true;
        }
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btn-change-avatar') || e.target.closest('#profile-avatar-overlay')) {
                const input = document.getElementById('input-avatar-file');
                if (input) input.click();
            }

            if (e.target.closest('#btn-cancel-avatar')) this.cancelAvatarPreview();
            
            const btnSaveAvatar = e.target.closest('#btn-save-avatar');
            if (btnSaveAvatar) this.saveAvatar(btnSaveAvatar);

            const btnDelAvatar = e.target.closest('#btn-delete-avatar');
            if (btnDelAvatar) this.deleteAvatar(btnDelAvatar);

            const btnSaveUsername = e.target.closest('[data-action="saveUsername"]');
            if (btnSaveUsername) this.saveUsername(btnSaveUsername);

            const btnRequestEmail = e.target.closest('[data-action="requestEmailUpdate"]');
            if (btnRequestEmail) this.handleEmailUpdateRequest();

            const btnResendDialog = e.target.closest('#btn-dialog-resend-code');
            if (btnResendDialog) this.resendEmailUpdateCode(btnResendDialog);

            const btnSaveEmail = e.target.closest('[data-action="saveEmail"]');
            if (btnSaveEmail) this.saveEmail(btnSaveEmail);
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'input-avatar-file') this.handleFileSelection(e);
        });

        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'dialog_email_code') {
                let val = e.target.value.replace(/\D/g, ''); 
                let formatted = '';
                for (let i = 0; i < val.length; i++) {
                    if (i > 0 && i % 4 === 0) formatted += '-';
                    formatted += val[i];
                }
                e.target.value = formatted;
            }
        });
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else alert(msg);
    }

    setButtonLoading(btn) {
        if (btn.disabled) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;
    }

    restoreButton(btn) {
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }

    handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const maxSizeMb = this.config.max_avatar_size_mb || 2;
        if (file.size > maxSizeMb * 1024 * 1024) { 
            this.showMessage(`La imagen no debe superar los ${maxSizeMb}MB.`, 'error'); 
            e.target.value = ''; 
            return; 
        }

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) { 
            this.showMessage('Solo se permiten imágenes en formato PNG o JPG.', 'error'); 
            e.target.value = ''; 
            return; 
        }

        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const imgEl = document.getElementById('profile-avatar-img');
            if (imgEl) imgEl.src = ev.target.result;
            this.toggleAvatarButtons(true);
        };
        reader.readAsDataURL(file);
    }

    cancelAvatarPreview() {
        const imgEl = document.getElementById('profile-avatar-img');
        const fileInput = document.getElementById('input-avatar-file');
        if (imgEl) imgEl.src = imgEl.getAttribute('data-original-src');
        if (fileInput) fileInput.value = '';
        this.selectedFile = null;
        this.toggleAvatarButtons(false);
    }

    toggleAvatarButtons(isPreview) {
        const btnChange = document.getElementById('btn-change-avatar');
        const btnDelete = document.getElementById('btn-delete-avatar');
        const btnCancel = document.getElementById('btn-cancel-avatar');
        const btnSave = document.getElementById('btn-save-avatar');
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
        this.setButtonLoading(btn);
        const formData = new FormData();
        formData.append('avatar', this.selectedFile);
        const result = await this.api.postForm(ApiRoutes.Settings.UpdateAvatar, formData);
        this.restoreButton(btn);
        if (result.success) {
            this.showMessage(result.message, 'success');
            const imgEl = document.getElementById('profile-avatar-img');
            if (imgEl) { imgEl.src = result.new_avatar; imgEl.setAttribute('data-original-src', result.new_avatar); }
            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;
            const fileInput = document.getElementById('input-avatar-file');
            if (fileInput) fileInput.value = '';
            
            this.selectedFile = null;
            this.isDefaultAvatar = false; 
            this.toggleAvatarButtons(false);
            
            const btnChange = document.getElementById('btn-change-avatar');
            if (btnChange && typeof window.__ === 'function') {
                btnChange.textContent = __('btn_change_avatar');
            }
        } else this.showMessage(result.message, 'error');
    }

    async deleteAvatar(btn) {
        const isConfirmed = await window.dialogSystem.show('confirmDeleteAvatar');
        if (!isConfirmed.confirmed) return;
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.DeleteAvatar);
        this.restoreButton(btn);
        if (result.success) {
            this.showMessage(result.message, 'success');
            const imgEl = document.getElementById('profile-avatar-img');
            if (imgEl) { imgEl.src = result.new_avatar; imgEl.setAttribute('data-original-src', result.new_avatar); }
            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;
            
            this.isDefaultAvatar = true; 
            this.toggleAvatarButtons(false);
            
            const btnChange = document.getElementById('btn-change-avatar');
            if (btnChange && typeof window.__ === 'function') {
                btnChange.textContent = __('btn_upload_avatar');
            }
        } else this.showMessage(result.message, 'error');
    }

    async saveUsername(btn) {
        const input = document.getElementById('input-username');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('username'); return; }
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdateUsername, { username: val });
        this.restoreButton(btn);
        if (result.success) {
            this.showMessage(result.message, 'success');
            document.getElementById('display-username').textContent = result.new_username;
            input.setAttribute('data-original-value', result.new_username);
            window.appInstance.toggleEditState('username');
        } else this.showMessage(result.message, 'error');
    }

    async handleEmailUpdateRequest() {
        window.dialogSystem.show('loadingEmailCode');
        const res = await this.api.post(ApiRoutes.Settings.RequestEmailCode);
        window.dialogSystem.closeCurrent(false);
        await new Promise(resolve => setTimeout(resolve, 350));
        
        if (res.success) {
            if (res.skip_verification) { window.appInstance.toggleEditState('email'); return; }
            this.showMessage(res.message, 'success');
            
            const currentEmail = document.getElementById('display-email').textContent.trim();
            const verifyDialogPromise = window.dialogSystem.show('verifyEmailCode', { email: currentEmail });
            
            const resendBtn = document.getElementById('btn-dialog-resend-code');
            if (resendBtn) {
                let elapsed = res.elapsed || 0;
                let remainingTime = Math.max(0, 60 - elapsed);
                this.startDialogResendTimer(resendBtn, remainingTime);
            }

            const verifyDialog = await verifyDialogPromise;
            
            if (this.dialogResendInterval) clearInterval(this.dialogResendInterval);

            if (verifyDialog.confirmed) {
                const code = verifyDialog.data['dialog_email_code'];
                if (!code) { this.showMessage('El código de verificación es obligatorio.', 'error'); return; }
                const verifyRes = await this.api.post(ApiRoutes.Settings.VerifyEmailCode, { code });
                if (verifyRes.success) { 
                    this.showMessage(verifyRes.message, 'success'); 
                    window.appInstance.toggleEditState('email'); 
                } 
                else this.showMessage(verifyRes.message, 'error');
            }
        } else {
            this.showMessage(res.message, 'error');
        }
    }

    async resendEmailUpdateCode(btn) {
        if (btn.classList.contains('disabled-interaction')) return;
        
        btn.classList.add('disabled-interaction', 'component-text-notice--muted', 'disabled');

        const result = await this.api.post(ApiRoutes.Settings.ResendEmailCode);

        if (result.success) {
            this.showMessage(result.message, 'success');
            this.startDialogResendTimer(btn, 60);
        } else {
            this.showMessage(result.message, 'error');
            if (result.cooldown) {
                this.startDialogResendTimer(btn, result.cooldown);
            } else {
                btn.classList.remove('disabled-interaction', 'component-text-notice--muted', 'disabled');
                btn.textContent = typeof window.__ === 'function' ? __('btn_resend_code') : 'Reenviar código de verificación';
            }
        }
    }

    startDialogResendTimer(element, seconds) {
        if (this.dialogResendInterval) clearInterval(this.dialogResendInterval);
        let timeLeft = seconds;
        const defaultText = typeof window.__ === 'function' ? __('btn_resend_code') : 'Reenviar código de verificación';
        
        const updateUI = () => {
            if (timeLeft <= 0) {
                clearInterval(this.dialogResendInterval);
                element.classList.remove('disabled-interaction', 'component-text-notice--muted', 'disabled');
                element.textContent = defaultText;
            } else {
                element.classList.add('disabled-interaction', 'component-text-notice--muted', 'disabled');
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
        const input = document.getElementById('input-email');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('email'); return; }
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdateEmail, { email: val });
        this.restoreButton(btn);
        if (result.success) {
            this.showMessage(result.message, 'success');
            document.getElementById('display-email').textContent = result.new_email;
            input.setAttribute('data-original-value', result.new_email);
            window.appInstance.toggleEditState('email');
        } else this.showMessage(result.message, 'error');
    }
}