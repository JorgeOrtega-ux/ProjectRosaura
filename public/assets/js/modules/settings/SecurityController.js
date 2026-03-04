// public/assets/js/modules/settings/SecurityController.js
import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class SecurityController {
    constructor() {
        this.api = new ApiService();
        this.config = window.AppServerConfig || {};
        this.basePath = window.AppBasePath || '';
        this.eventsBound = false; // <-- BANDERA DE BLINDAJE
    }

    init() {
        this.bindEvents();
        console.log("SecurityController inicializado.");
    }

    bindEvents() {
        if (this.eventsBound) return; // <-- EVITA DUPLICAR EVENTOS

        document.addEventListener('click', (e) => {
            const btnVerifyPass = e.target.closest('[data-action="submitVerifyCurrentPassword"]');
            if (btnVerifyPass) this.verifyCurrentPassword(btnVerifyPass);

            const btnUpdatePass = e.target.closest('[data-action="submitUpdatePassword"]');
            if (btnUpdatePass) this.updatePassword(btnUpdatePass);

            const btnDeleteAccount = e.target.closest('[data-action="submitDeleteAccount"]');
            if (btnDeleteAccount) this.deleteAccount(btnDeleteAccount);
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'chk_confirm_delete') {
                const passArea = document.getElementById('delete_password_area');
                if (passArea) {
                    if (e.target.checked) passArea.classList.remove('disabled');
                    else passArea.classList.add('disabled');
                }
            }
        });

        this.eventsBound = true; // <-- SELLA LOS EVENTOS
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
        
        const valNew = newPass.value; 
        const valConfirm = confirmPass.value;
        
        if (valNew !== valConfirm) { 
            this.showMessage('Las contraseñas no coinciden.', 'error'); 
            return; 
        }

        const minPass = this.config.min_password_length || 8;
        const maxPass = this.config.max_password_length || 64;

        if (valNew.length < minPass || valNew.length > maxPass) { 
            this.showMessage(`La contraseña debe tener entre ${minPass} y ${maxPass} caracteres.`, 'error'); 
            return; 
        }

        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdatePassword, { new_password: valNew, confirm_password: valConfirm });
        this.restoreButton(btn);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/settings/security');
                else window.location.href = this.basePath + '/settings/security';
            }, 1000);
        } else this.showMessage(result.message, 'error');
    }

    async deleteAccount(btn) {
        const input = document.getElementById('delete_account_password');
        if (!input) return;
        const pass = input.value;
        if (!pass) {
            this.showMessage('Debes ingresar tu contraseña para confirmar.', 'error');
            return;
        }

        this.setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.DeleteAccount, { password: pass });
        
        if (res.success) {
            window.location.href = this.basePath + '/';
        } else {
            this.restoreButton(btn);
            this.showMessage(res.message, 'error');
        }
    }
}