// public/assets/js/profile-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class ProfileController {
    constructor() {
        this.api = new ApiService();
        this.selectedFile = null;
    }

 init() {
        this.bindEvents();
        console.log("ProfileController inicializado.");

        // NUEVO: Si recargas la página directamente en la vista 2FA, forzamos la carga.
        if (document.getElementById('2fa-setup-container')) {
            this.init2FAView();
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

            const btnSaveEmail = e.target.closest('[data-action="saveEmail"]');
            if (btnSaveEmail) this.saveEmail(btnSaveEmail);

            const btnVerifyPass = e.target.closest('[data-action="submitVerifyCurrentPassword"]');
            if (btnVerifyPass) this.verifyCurrentPassword(btnVerifyPass);

            const btnUpdatePass = e.target.closest('[data-action="submitUpdatePassword"]');
            if (btnUpdatePass) this.updatePassword(btnUpdatePass);

            // --- EVENTOS 2FA ---
            const btnActivate2FA = e.target.closest('[data-action="submitActivate2FA"]');
            if (btnActivate2FA) this.enable2FA(btnActivate2FA);

            const btnDeactivate2FA = e.target.closest('[data-action="submitDeactivate2FA"]');
            if (btnDeactivate2FA) this.disable2FA(btnDeactivate2FA);

            const btnCopyRecovery = e.target.closest('[data-action="copyRecoveryCodes"]');
            if (btnCopyRecovery) this.copyRecoveryCodes(btnCopyRecovery);

            const btnFinish2FA = e.target.closest('[data-action="finish2FA"]');
            if (btnFinish2FA) {
                if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/settings/security');
                else window.location.href = '/ProjectRosaura/settings/security';
            }
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

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/settings/2fa')) {
                this.init2FAView();
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

    handleFileSelection(e) { /* Lógica existente */
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { this.showMessage('La imagen no debe superar los 2MB.', 'error'); e.target.value = ''; return; }
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) { this.showMessage('Solo se permiten imágenes en formato PNG o JPG.', 'error'); e.target.value = ''; return; }
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
            btnChange.style.display = 'none'; btnDelete.style.display = 'none';
            btnCancel.style.display = 'inline-flex'; btnSave.style.display = 'inline-flex';
        } else {
            btnChange.style.display = 'inline-flex'; btnDelete.style.display = 'inline-flex';
            btnCancel.style.display = 'none'; btnSave.style.display = 'none';
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
            this.toggleAvatarButtons(false);
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
            const verifyDialog = await window.dialogSystem.show('verifyEmailCode');
            if (verifyDialog.confirmed) {
                const code = verifyDialog.data['dialog_email_code'];
                if (!code) { this.showMessage('El código de verificación es obligatorio.', 'error'); return; }
                const verifyRes = await this.api.post(ApiRoutes.Settings.VerifyEmailCode, { code });
                if (verifyRes.success) { this.showMessage(verifyRes.message, 'success'); window.appInstance.toggleEditState('email'); } 
                else this.showMessage(verifyRes.message, 'error');
            }
        } else this.showMessage(res.message, 'error');
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

    async verifyCurrentPassword(btn) {
        const input = document.getElementById('cp_current_password');
        if (!input) return;
        const val = input.value.trim();
        if (val === '') { this.showMessage('Ingresa tu contraseña actual.', 'error'); return; }
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.VerifyCurrentPassword, { current_password: val });
        this.restoreButton(btn);
        if (result.success) {
            document.getElementById('step-1-current-password').classList.replace('active', 'disabled');
            document.getElementById('step-2-new-password').classList.replace('disabled', 'active');
            setTimeout(() => { const nextInput = document.getElementById('cp_new_password'); if (nextInput) nextInput.focus(); }, 50);
        } else this.showMessage(result.message, 'error');
    }

    async updatePassword(btn) {
        const newPass = document.getElementById('cp_new_password');
        const confirmPass = document.getElementById('cp_confirm_password');
        if (!newPass || !confirmPass) return;
        const valNew = newPass.value; const valConfirm = confirmPass.value;
        if (valNew !== valConfirm) { this.showMessage('Las contraseñas no coinciden.', 'error'); return; }
        if (valNew.length < 8 || valNew.length > 64) { this.showMessage('La contraseña debe tener entre 8 y 64 caracteres.', 'error'); return; }
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdatePassword, { new_password: valNew, confirm_password: valConfirm });
        this.restoreButton(btn);
        if (result.success) {
            this.showMessage(result.message, 'success');
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/settings/security');
                else window.location.href = '/ProjectRosaura/settings/security';
            }, 1000);
        } else this.showMessage(result.message, 'error');
    }

    // ==========================================
    // --- LÓGICA DE 2FA ---
    // ==========================================
    async init2FAView() {
        const setupContainer = document.getElementById('2fa-setup-container');
        if (setupContainer && setupContainer.classList.contains('active')) {
            const res = await this.api.post(ApiRoutes.Settings.Generate2FA);
            if (res.success) {
                document.getElementById('2fa-qr-img').src = res.qr_url;
                document.getElementById('2fa-secret-text').textContent = res.secret;
            } else {
                this.showMessage(res.message, 'error');
            }
        }
    }

    async enable2FA(btn) {
        const input = document.getElementById('2fa_app_code');
        if (!input) return;
        const code = input.value.trim();
        if (code.length !== 6) {
            this.showMessage('El código debe tener 6 dígitos.', 'error');
            return;
        }

        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.Enable2FA, { code: code });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            
            // Ocultar Setup
            document.getElementById('2fa-setup-container').classList.replace('active', 'disabled');
            
            // Mostrar Códigos de Recuperación
            const recoveryContainer = document.getElementById('2fa-recovery-container');
            recoveryContainer.classList.replace('disabled', 'active');
            
            // Llenar códigos
            const codeList = document.getElementById('2fa-recovery-codes-list');
            codeList.innerHTML = '';
            result.recovery_codes.forEach(c => {
                const span = document.createElement('span');
                span.style.padding = '8px 12px';
                span.style.background = '#f5f5fa';
                span.style.borderRadius = '4px';
                span.style.fontFamily = 'monospace';
                span.style.letterSpacing = '1px';
                span.textContent = c;
                codeList.appendChild(span);
            });
            
            // Guardar para poder copiar
            this.currentRecoveryCodes = result.recovery_codes.join('\n');
            
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async disable2FA(btn) {
        const input = document.getElementById('2fa_disable_password');
        if (!input) return;
        const pass = input.value;
        if (!pass) {
            this.showMessage('Debes ingresar tu contraseña.', 'error');
            return;
        }

        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.Disable2FA, { password: pass });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/settings/security');
                else window.location.href = '/ProjectRosaura/settings/security';
            }, 1000);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    copyRecoveryCodes(btn) {
        if (!this.currentRecoveryCodes) return;
        navigator.clipboard.writeText(this.currentRecoveryCodes).then(() => {
            const originalText = btn.textContent;
            btn.textContent = 'Copiado!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    }
}