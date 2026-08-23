import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiService.js';
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
        const btnPromptChangePassword = e.target.closest('[data-action="promptChangePassword"]');
        if (btnPromptChangePassword) this.promptChangePassword(btnPromptChangePassword);

        const btnVerifyPass = e.target.closest('[data-action="submitVerifyCurrentPassword"]');
        if (btnVerifyPass) this.verifyCurrentPassword(btnVerifyPass);

        const btnUpdatePass = e.target.closest('[data-action="submitUpdatePassword"]');
        if (btnUpdatePass) this.updatePassword(btnUpdatePass);

        const btnPromptDelete = e.target.closest('[data-action="promptDeleteAccount"]');
        if (btnPromptDelete) this.promptDeleteAccount(btnPromptDelete);

        const btnLogoutAll = e.target.closest('[data-action="logoutAllDevices"]');
        if (btnLogoutAll) this.logoutAllDevices(btnLogoutAll);
    }

    async promptChangePassword(btn) {
        if (!window.modalSystem) return;
        await window.modalSystem.show('changePasswordModal');
    }

    handleChange(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'chk_confirm_delete') {
            const topDeleteBtn = document.querySelector('[data-ref="btn-top-delete"]');
            if (topDeleteBtn) {
                if (e.target.checked) {
                    topDeleteBtn.classList.remove('disabled-interaction');
                } else {
                    topDeleteBtn.classList.add('disabled-interaction');
                }
            }
        }
    }

    async verifyCurrentPassword(btn) {
        const input = document.querySelector('[data-ref="cp_current_password"]');
        const googleTokenInp = document.querySelector('[data-ref="google_token"]');
        const credentialInp = document.querySelector('[data-ref="credential"]');
        
        const val = input ? input.value.trim() : '';
        const googleToken = (googleTokenInp && (googleTokenInp.value || googleTokenInp.getAttribute('data-value'))) || 
                            (credentialInp && (credentialInp.value || credentialInp.getAttribute('data-value'))) || '';

        if (val === '' && !googleToken) { 
            showMessage(window.__('err_identity_verification_required') || window.__('err_current_password_required'), 'error'); 
            return; 
        }
        
        const googleBadge = document.querySelector('.google-verify-badge');
        
        setButtonLoading(btn);
        if (googleBadge && googleToken) {
            setButtonLoading(googleBadge);
        }

        const payload = googleToken ? { credential: googleToken, google_token: googleToken } : { current_password: val };
        const result = await this.api.post(ApiRoutes.Settings.VerifyCurrentPassword, payload, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);
        if (googleBadge) {
            restoreButton(googleBadge);
        }
        
        if (result.success) {
            if (googleBadge && googleToken) {
                googleBadge.classList.add('google-verify-badge--verified');
                const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
                googleBadge.innerHTML = `
                    <span class="material-symbols-rounded component-icon-sm">check_circle</span>
                    <span class="google-verify-text">${__('google_session_verified')}</span>
                `;
            }
            setTimeout(() => {
                const step1 = document.querySelector('[data-ref="step-1-current-password"]');
                const step2 = document.querySelector('[data-ref="step-2-new-password"]');
                if (step1 && step2) {
                    step1.classList.replace('active', 'disabled');
                    step2.classList.replace('disabled', 'active');
                }
                const nextInput = document.querySelector('[data-ref="cp_new_password"]');
                if (nextInput) nextInput.focus();
            }, 300);
        } else {
            if (googleTokenInp) { googleTokenInp.value = ''; googleTokenInp.removeAttribute('data-value'); }
            if (credentialInp) { if ('value' in credentialInp) credentialInp.value = ''; credentialInp.removeAttribute('data-value'); }
            showMessage(result.message, 'error');
        }
    }

    async updatePassword(btn) {
        const newPass = document.querySelector('[data-ref="cp_new_password"]');
        const confirmPass = document.querySelector('[data-ref="cp_confirm_password"]');
        if (!newPass || !confirmPass) return;
        
        const valNew = newPass.value; 
        const valConfirm = confirmPass.value;
        
        if (valNew !== valConfirm) { 
            showMessage(window.__('err_password_mismatch'), 'error'); 
            return; 
        }

        const minPass = this.config.min_password_length || 8;
        const maxPass = this.config.max_password_length || 64;

        if (valNew.length < minPass || valNew.length > maxPass) { 
            let msg = window.__('err_password_length');
            if (msg.includes(':min')) {
                msg = msg.replace(':min', minPass).replace(':max', maxPass);
            }
            showMessage(msg, 'error'); 
            return; 
        }

        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdatePassword, { new_password: valNew, confirm_password: valConfirm }, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);
        
        if (result.success) {
            showMessage(result.message, 'success');
            if (window.modalSystem) {
                window.modalSystem.closeCurrent(true);
            }
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/settings/security');
                else window.location.href = this.basePath + '/settings/security';
            }, 1000);
        } else showMessage(result.message, 'error');
    }

    async promptDeleteAccount(btn) {
        if (btn.classList.contains('disabled-interaction')) return;

        const dialog = await window.modalSystem.show('confirmDeleteAccountDialog', { asyncConfirm: true });

        if (dialog.confirmed) {
            const passInput = dialog.data['modal_delete_password'];
            const credential = dialog.data['credential'] || dialog.data['google_token'];
            if (!passInput && !credential) {
                dialog.failure(window.__('err_identity_verification_required') || window.__('err_password_required'));
                return;
            }

            const data = credential ? { credential: credential, google_token: credential } : { password: passInput };
            try {
                const result = await this.api.post(ApiRoutes.Settings.DeleteAccount, data, this.abortController.signal);

                if (result.aborted) return;

                if (result.success) {
                    showMessage(result.message || window.__('msg_deletion_started'), "success");
                    dialog.success();
                    setTimeout(() => {
                        window.location.href = this.basePath + '/login';
                    }, 1500);
                } else {
                    dialog.failure(result.message);
                }
            } catch (error) {
                dialog.failure(window.__('err_connection'));
            }
        }
    }

    async logoutAllDevices(btn) {
        if (!window.modalSystem) return;

        const resultDialog = await window.modalSystem.show('confirmRevokeAllDevices');

        if (resultDialog && resultDialog.confirmed) {
            setButtonLoading(btn);

            try {
                const res = await this.api.post(ApiRoutes.Settings.RevokeAllDevices, { type: 'revoke_all' }, this.abortController?.signal);

                if (res.aborted) return;

                if (res.success) {
                    showMessage(res.message || window.__('msg_devices_revoked'), 'success');
                    setTimeout(() => {
                        window.location.href = this.basePath + '/login';
                    }, 1000);
                } else {
                    showMessage(res.message || window.__('err_logout_sessions'), 'error');
                }
            } catch (err) {
                showMessage(window.__('err_communication'), 'error');
            } finally {
                restoreButton(btn);
            }
        }
    }
}

export { SecurityController };