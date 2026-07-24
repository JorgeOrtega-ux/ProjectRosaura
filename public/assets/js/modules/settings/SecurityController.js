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

        const btnPromptDelete = e.target.closest('[data-action="promptDeleteAccount"]');
        if (btnPromptDelete) this.promptDeleteAccount(btnPromptDelete);

        const btnLogoutAll = e.target.closest('[data-action="logoutAllDevices"]');
        if (btnLogoutAll) this.logoutAllDevices(btnLogoutAll);
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
        if (!input) return;
        const val = input.value.trim();
        if (val === '') { 
            showMessage(window.__('err_current_password_required'), 'error'); 
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
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/settings/security');
                else window.location.href = this.basePath + '/settings/security';
            }, 1000);
        } else showMessage(result.message, 'error');
    }

    async promptDeleteAccount(btn) {
        if (btn.classList.contains('disabled-interaction')) return;

        const dialog = await window.dialogSystem.show('confirmDeleteAccountDialog');

        if (dialog.confirmed) {
            const passInput = dialog.data['modal_delete_password'];
            if (!passInput) {
                showMessage(window.__('err_password_required') || 'Ingresa tu contraseña para confirmar', "error");
                return;
            }

            setButtonLoading(btn);

            const data = { password: passInput };
            const result = await this.api.post(ApiRoutes.Settings.DeleteAccount, data, this.abortController.signal);

            if (result.aborted) return;

            restoreButton(btn);

            if (result.success) {
                showMessage(result.message || window.__('msg_deletion_started') || 'Cuenta eliminada con éxito', "success");
                setTimeout(() => {
                    window.location.href = this.basePath + '/login';
                }, 1500);
            } else {
                showMessage(result.message, "error");
            }
        }
    }

    async logoutAllDevices(btn) {
        if (!window.dialogSystem) return;

        const resultDialog = await window.dialogSystem.show('confirmRevokeAllDevices');

        if (resultDialog && resultDialog.confirmed) {
            setButtonLoading(btn);

            try {
                const res = await this.api.post(ApiRoutes.Settings.RevokeAllDevices, { type: 'revoke_all' }, this.abortController?.signal);

                if (res.aborted) return;

                if (res.success) {
                    showMessage(res.message || window.__('msg_devices_revoked') || 'Sesiones cerradas con éxito', 'success');
                    setTimeout(() => {
                        window.location.href = this.basePath + '/login';
                    }, 1000);
                } else {
                    showMessage(res.message || 'Error al cerrar sesiones', 'error');
                }
            } catch (err) {
                showMessage('Error de comunicación', 'error');
            } finally {
                restoreButton(btn);
            }
        }
    }
}

export { SecurityController };