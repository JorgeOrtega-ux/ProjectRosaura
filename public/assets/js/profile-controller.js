// public/assets/js/profile-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

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

        if (document.getElementById('2fa-setup-container')) {
            this.init2FAView();
        }

        if (document.getElementById('devices-container')) {
            this.initDevicesView();
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
            
            const btnRegenerate2FA = e.target.closest('[data-action="submitRegenerateRecoveryCodes"]');
            if (btnRegenerate2FA) this.regenerateRecoveryCodes(btnRegenerate2FA);

            const btnCopyNewRecovery = e.target.closest('[data-action="copyNewRecoveryCodes"]');
            if (btnCopyNewRecovery) this.copyNewRecoveryCodes(btnCopyNewRecovery);

            const btnFinish2FA = e.target.closest('[data-action="finish2FA"]');
            if (btnFinish2FA) {
                if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/settings/security');
                else window.location.href = '/ProjectRosaura/settings/security';
            }

            // --- EVENTOS DISPOSITIVOS ---
            const btnRevokeAll = e.target.closest('[data-action="revokeAllDevices"]');
            if (btnRevokeAll) this.revokeAllDevices(btnRevokeAll);

            const btnRevoke = e.target.closest('[data-action="revokeDevice"]');
            if (btnRevoke) this.revokeDevice(btnRevoke);
            
            // --- EVENTOS ELIMINAR CUENTA ---
            const btnDeleteAccount = e.target.closest('[data-action="submitDeleteAccount"]');
            if (btnDeleteAccount) this.deleteAccount(btnDeleteAccount);
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'input-avatar-file') this.handleFileSelection(e);
            
            if (e.target && e.target.id === 'chk_confirm_delete') {
                const passArea = document.getElementById('delete_password_area');
                if (passArea) {
                    if (e.target.checked) passArea.classList.remove('disabled');
                    else passArea.classList.add('disabled');
                }
            }

            if (e.target && e.target.id === 'chk_confirm_deactivate_2fa') {
                const passArea = document.getElementById('deactivate_2fa_password_area');
                if (passArea) {
                    if (e.target.checked) passArea.classList.remove('disabled');
                    else passArea.classList.add('disabled');
                }
            }
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
            if (e.detail.url.includes('/settings/2fa') && !e.detail.url.includes('recovery') && !e.detail.url.includes('deactivate')) {
                this.init2FAView();
            }
            if (e.detail.url.includes('/settings/devices')) {
                this.initDevicesView();
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
                if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/settings/security');
                else window.location.href = '/ProjectRosaura/settings/security';
            }, 1000);
        } else this.showMessage(result.message, 'error');
    }

    async init2FAView() {
        const setupContainer = document.getElementById('2fa-setup-container');
        if (setupContainer && setupContainer.classList.contains('active')) {
            const res = await this.api.post(ApiRoutes.Settings.Generate2FA);
            if (res.success) {
                const qrContainer = document.getElementById('2fa-qr-container');
                if (qrContainer) {
                    try {
                        if (!window.QRCodeStyling) {
                            await new Promise((resolve, reject) => {
                                const script = document.createElement('script');
                                script.src = 'https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js';
                                script.onload = resolve;
                                script.onerror = reject;
                                document.head.appendChild(script);
                            });
                        }

                        qrContainer.innerHTML = '';
                        const qrCode = new window.QRCodeStyling({
                            width: 150, 
                            height: 150, 
                            type: "svg", 
                            data: res.qr_url,
                            margin: 0,
                            dotsOptions: { color: "#111111", type: "rounded" },
                            backgroundOptions: { color: "#ffffff" },
                            cornersSquareOptions: { type: "extra-rounded", color: "#111111" },
                            cornersDotOptions: { type: "dot", color: "#111111" }
                        });

                        qrCode.append(qrContainer);

                        const qrElement = qrContainer.querySelector('canvas, svg');
                        if (qrElement) {
                            qrElement.style.width = '100%';
                            qrElement.style.height = '100%';
                            qrElement.style.display = 'block';
                        }

                    } catch (error) {
                        console.error("No se pudo cargar qr-code-styling, utilizando fallback.", error);
                        qrContainer.innerHTML = `<p style="font-size: 12px; color: #d32f2f; text-align: center;">Error renderizando QR. Usa la clave secreta abajo.</p>`;
                    }
                }
                
                const secretText = document.getElementById('2fa-secret-text');
                if (secretText) {
                    secretText.textContent = res.secret;
                }
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
            
            document.getElementById('2fa-setup-container').classList.replace('active', 'disabled');
            const recoveryContainer = document.getElementById('2fa-recovery-container');
            recoveryContainer.classList.replace('disabled', 'active');
            
            const codeList = document.getElementById('2fa-recovery-codes-list');
            codeList.innerHTML = '';
            result.recovery_codes.forEach(c => {
                const div = document.createElement('div');
                div.className = 'component-recovery-code';
                div.innerHTML = `
                    <span class="material-symbols-rounded component-recovery-code-icon">key</span>
                    <span class="component-recovery-code-text">${c}</span>
                `;
                codeList.appendChild(div);
            });
            
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
                if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/settings/2fa');
                else window.location.href = '/ProjectRosaura/settings/2fa';
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

    async regenerateRecoveryCodes(btn) {
        const input = document.getElementById('2fa_regenerate_password');
        if (!input) return;
        const pass = input.value;
        if (!pass) {
            this.showMessage('Debes ingresar tu contraseña.', 'error');
            return;
        }

        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.RegenerateRecoveryCodes, { password: pass });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            
            const step1 = document.getElementById('step-1-generate-codes');
            const wrapper = document.getElementById('2fa-new-recovery-codes-wrapper');
            
            if (step1) step1.classList.replace('active', 'disabled');
            if (wrapper) wrapper.classList.replace('disabled', 'active');
            
            const codeList = document.getElementById('2fa-new-recovery-codes-list');
            if (codeList) {
                codeList.innerHTML = '';
                result.recovery_codes.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'component-recovery-code';
                    div.innerHTML = `
                        <span class="material-symbols-rounded component-recovery-code-icon">key</span>
                        <span class="component-recovery-code-text">${c}</span>
                    `;
                    codeList.appendChild(div);
                });
            }
            
            this.newRecoveryCodes = result.recovery_codes.join('\n');
            input.value = ''; 
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    copyNewRecoveryCodes(btn) {
        if (!this.newRecoveryCodes) return;
        navigator.clipboard.writeText(this.newRecoveryCodes).then(() => {
            const originalText = btn.textContent;
            btn.textContent = 'Copiado!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    }

    async initDevicesView() {
        const listContainer = document.getElementById('devices-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="component-spinner" style="margin: 0 auto;"></div>';

        const res = await this.api.post(ApiRoutes.Settings.GetDevices);
        if (res.success) {
            this.renderDevices(res.devices);
        } else {
            listContainer.innerHTML = `<p style="color: #d32f2f;">${res.message}</p>`;
        }
    }

    renderDevices(devices) {
        const listContainer = document.getElementById('devices-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (devices.length === 0) {
            listContainer.innerHTML = '<p class="component-card__description">No hay dispositivos activos.</p>';
            return;
        }

        devices.forEach(device => {
            const parsedUA = this.parseUserAgent(device.user_agent);
            
            const div = document.createElement('div');
            // Nota: Aquí se dejó un style para la maqueta generada dinámicamente desde JS por diseño simplificado, 
            // pero si deseas también lo podemos migrar a CSS en un futuro. Por ahora cumple tu indicación principal.
            div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #00000020; border-radius: 8px; flex-wrap: wrap; gap: 12px;';
            
            const btnHtml = !device.is_current ? `
                <button class="component-button component-button--icon component-button--h36 component-button--danger" data-action="revokeDevice" data-id="${device.id}" title="Cerrar sesión">
                    <span class="material-symbols-rounded">close</span>
                </button>
            ` : '';

            const statusText = device.is_current ? 
                '<p style="font-size: 13px; color: #16a34a; font-weight: 500; margin: 4px 0 0 0;">Este dispositivo (Actual)</p>' : 
                '<p style="font-size: 13px; color: #666; margin: 4px 0 0 0;">Activo</p>';

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">${parsedUA.icon}</span>
                    </div>
                    <div>
                        <h3 style="font-size: 15px; font-weight: 600; margin: 0; color: #111;">${parsedUA.os} - ${parsedUA.browser}</h3>
                        <p style="font-size: 13px; color: #666; margin: 4px 0 0 0;">IP: ${device.ip_address || 'Desconocida'}</p>
                        ${statusText}
                    </div>
                </div>
                <div>${btnHtml}</div>
            `;
            listContainer.appendChild(div);
        });
    }

    parseUserAgent(ua) {
        let browser = "Navegador Desconocido";
        let os = "OS Desconocido";
        let icon = "devices";

        if (!ua) return { browser, os, icon };

        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

        if (ua.includes("Win")) { os = "Windows"; icon = "computer"; }
        else if (ua.includes("Mac")) { os = "MacOS"; icon = "computer"; }
        else if (ua.includes("Linux")) { os = "Linux"; icon = "computer"; }
        else if (ua.includes("Android")) { os = "Android"; icon = "smartphone"; }
        else if (ua.includes("iPhone") || ua.includes("iPad")) { os = "iOS"; icon = "smartphone"; }

        return { browser, os, icon };
    }

    async revokeDevice(btn) {
        const id = btn.getAttribute('data-id');
        this.setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.RevokeDevice, { device_id: id });
        this.restoreButton(btn);

        if (res.success) {
            this.showMessage(res.message, 'success');
            this.initDevicesView(); 
        } else {
            this.showMessage(res.message, 'error');
        }
    }

    async revokeAllDevices(btn) {
        const isConfirmed = await window.dialogSystem.show('confirmRevokeAllDevices');
        if (!isConfirmed.confirmed) return;

        this.setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.RevokeAllDevices);
        this.restoreButton(btn);

        if (res.success) {
            this.showMessage(res.message, 'success');
            this.initDevicesView(); 
        } else {
            this.showMessage(res.message, 'error');
        }
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
            window.location.href = '/ProjectRosaura/';
        } else {
            this.restoreButton(btn);
            this.showMessage(res.message, 'error');
        }
    }
}