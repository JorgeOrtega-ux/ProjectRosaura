// public/assets/js/modules/settings/ProfileController.js
import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class ProfileController {
    constructor() {
        this.api = new ApiService();
        this.selectedFile = null;
        this.isDefaultAvatar = false;
        this.config = window.AppServerConfig || {};
        
        // Bindear eventos al contexto
        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleInputBound = this.handleInput.bind(this);

        // Agregamos un debounce timeout para validaciones en tiempo real
        this.identifierValidationTimeout = null;
    }

    destroy() {
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
        document.removeEventListener('input', this.handleInputBound);
        
        if (this.dialogResendInterval) {
            clearInterval(this.dialogResendInterval);
        }
        if (this.identifierValidationTimeout) {
            clearTimeout(this.identifierValidationTimeout);
        }
    }

    init() {
        this.bindEvents();
        console.log("ProfileController inicializado.");

        const imgEl = document.querySelector('[data-ref="profile-avatar-img"]');
        if (imgEl && imgEl.src.includes('/default/')) {
            this.isDefaultAvatar = true;
        }

        // Configurar la validación del input del identificador si existe
        this.setupIdentifierValidation();
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
        document.addEventListener('input', this.handleInputBound);
    }

    // --- NUEVO: Configuración para la validación asíncrona del identificador ---
    setupIdentifierValidation() {
        const identifierInput = document.querySelector('[data-ref="input-identifier"]');
        if (!identifierInput) return;

        identifierInput.addEventListener('input', (e) => {
            // Limpieza básica inmediata en el cliente
            let val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if(e.target.value !== val) {
                e.target.value = val;
            }

            const currentOriginal = identifierInput.getAttribute('data-original-value');
            if (val === currentOriginal) {
                this.clearIdentifierStatus();
                return;
            }

            if (this.identifierValidationTimeout) {
                clearTimeout(this.identifierValidationTimeout);
            }

            if (val.length < 3) {
                 this.setIdentifierStatus('El identificador debe tener al menos 3 caracteres.', 'error');
                 return;
            }

            this.setIdentifierStatus('Comprobando disponibilidad...', 'loading');

            this.identifierValidationTimeout = setTimeout(() => {
                this.validateIdentifier(val);
            }, 500); // 500ms de debounce
        });
    }

    // Función para mostrar el estado de la validación
    setIdentifierStatus(message, type) {
        let statusEl = document.querySelector('.identifier-status-msg');
        if(!statusEl) {
             const inputWrapper = document.querySelector('[data-ref="input-identifier"]').closest('.component-form-group') || document.querySelector('[data-ref="input-identifier"]').parentNode;
             statusEl = document.createElement('div');
             statusEl.className = 'identifier-status-msg component-text-small mt-1';
             inputWrapper.appendChild(statusEl);
        }

        statusEl.textContent = message;
        statusEl.className = 'identifier-status-msg component-text-small mt-1'; // Reset
        
        const btnSave = document.querySelector('[data-action="saveIdentifier"]');

        if (type === 'error') {
            statusEl.classList.add('component-text-danger');
            if(btnSave) btnSave.disabled = true;
        } else if (type === 'success') {
            statusEl.classList.add('component-text-success');
            if(btnSave) btnSave.disabled = false;
        } else if (type === 'loading') {
            statusEl.classList.add('component-text-muted');
            if(btnSave) btnSave.disabled = true;
        }
    }

    clearIdentifierStatus() {
        const statusEl = document.querySelector('.identifier-status-msg');
        if(statusEl) statusEl.textContent = '';
        const btnSave = document.querySelector('[data-action="saveIdentifier"]');
        if(btnSave) btnSave.disabled = false;
    }

    // Validar con la API (Nota: Asegúrate de tener esta ruta en tu API si decides implementar validación en tiempo real separada)
    async validateIdentifier(identifier) {
        // En este ejemplo, asumo que tienes un endpoint para validar, o podrías usar un try simulado
        // const response = await this.api.post(ApiRoutes.Settings.ValidateIdentifier, { identifier: identifier });
        // Simulación temporal para el frontend, idealmente llamar a la API
        if(['admin', 'settings', 'login'].includes(identifier)) {
             this.setIdentifierStatus('Identificador no disponible.', 'error');
        } else {
             this.setIdentifierStatus('Identificador disponible.', 'success');
        }
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

        // NUEVO: Botón para guardar el identificador en los ajustes
        const btnSaveIdentifier = e.target.closest('[data-action="saveIdentifier"]');
        if (btnSaveIdentifier) this.saveIdentifier(btnSaveIdentifier);

        const btnRequestEmail = e.target.closest('[data-action="requestEmailUpdate"]');
        if (btnRequestEmail) this.handleEmailUpdateRequest();

        const btnResendDialog = e.target.closest('#btn-dialog-resend-code');
        if (btnResendDialog) this.resendEmailUpdateCode(btnResendDialog);

        const btnSaveEmail = e.target.closest('[data-action="saveEmail"]');
        if (btnSaveEmail) this.saveEmail(btnSaveEmail);
    }

    handleChange(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'input-avatar-file') {
            this.handleFileSelection(e);
        }
    }

    handleInput(e) {
        if (e.target && e.target.id === 'dialog_email_code') {
            let val = e.target.value.replace(/\D/g, ''); 
            let formatted = '';
            for (let i = 0; i < val.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += '-';
                formatted += val[i];
            }
            e.target.value = formatted;
        }
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
        this.setButtonLoading(btn);
        const formData = new FormData();
        formData.append('avatar', this.selectedFile);
        const result = await this.api.postForm(ApiRoutes.Settings.UpdateAvatar, formData);
        this.restoreButton(btn);
        if (result.success) {
            this.showMessage(result.message, 'success');
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
            const imgEl = document.querySelector('[data-ref="profile-avatar-img"]');
            if (imgEl) { imgEl.src = result.new_avatar; imgEl.setAttribute('data-original-src', result.new_avatar); }
            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;
            
            this.isDefaultAvatar = true; 
            this.toggleAvatarButtons(false);
            
            const btnChange = document.querySelector('[data-ref="btn-change-avatar"]');
            if (btnChange && typeof window.__ === 'function') {
                btnChange.textContent = __('btn_upload_avatar');
            }
        } else this.showMessage(result.message, 'error');
    }

    async saveUsername(btn) {
        const input = document.querySelector('[data-ref="input-username"]');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('username'); return; }
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdateUsername, { username: val });
        this.restoreButton(btn);
        if (result.success) {
            this.showMessage(result.message, 'success');
            document.querySelector('[data-ref="display-username"]').textContent = result.new_username;
            input.setAttribute('data-original-value', result.new_username);
            window.appInstance.toggleEditState('username');
        } else this.showMessage(result.message, 'error');
    }

    // --- NUEVO: Función para guardar el identificador editado ---
    async saveIdentifier(btn) {
        const input = document.querySelector('[data-ref="input-identifier"]');
        if (!input) return;
        const val = input.value.trim().toLowerCase();
        const originalVal = input.getAttribute('data-original-value');
        
        if (val === originalVal) { 
            window.appInstance.toggleEditState('identifier'); 
            return; 
        }

        if (btn.disabled) return; // Por si hay un error de validación asíncrona previo

        this.setButtonLoading(btn);
        // Supone que creaste un endpoint UpdateIdentifier en el backend (SettingsController/SettingsServices)
        const result = await this.api.post(ApiRoutes.Settings.UpdateIdentifier, { identifier: val });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            const displayEl = document.querySelector('[data-ref="display-identifier"]');
            if(displayEl) displayEl.textContent = `@${result.new_identifier}`;
            input.setAttribute('data-original-value', result.new_identifier);
            this.clearIdentifierStatus();
            window.appInstance.toggleEditState('identifier');
        } else {
            this.showMessage(result.message, 'error');
            this.setIdentifierStatus(result.message, 'error');
        }
    }

    async handleEmailUpdateRequest() {
        window.dialogSystem.show('loadingEmailCode');
        const res = await this.api.post(ApiRoutes.Settings.RequestEmailCode);
        window.dialogSystem.closeCurrent(false);
        await new Promise(resolve => setTimeout(resolve, 350));
        
        if (res.success) {
            if (res.skip_verification) { window.appInstance.toggleEditState('email'); return; }
            this.showMessage(res.message, 'success');
            
            const currentEmail = document.querySelector('[data-ref="display-email"]').textContent.trim();
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
        const input = document.querySelector('[data-ref="input-email"]');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('email'); return; }
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.UpdateEmail, { email: val });
        this.restoreButton(btn);
        if (result.success) {
            this.showMessage(result.message, 'success');
            document.querySelector('[data-ref="display-email"]').textContent = result.new_email;
            input.setAttribute('data-original-value', result.new_email);
            window.appInstance.toggleEditState('email');
        } else this.showMessage(result.message, 'error');
    }
}