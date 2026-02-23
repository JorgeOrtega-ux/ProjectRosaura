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
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btn-change-avatar') || e.target.closest('#profile-avatar-overlay')) {
                const input = document.getElementById('input-avatar-file');
                if (input) input.click();
            }

            if (e.target.closest('#btn-cancel-avatar')) {
                this.cancelAvatarPreview();
            }

            const btnSaveAvatar = e.target.closest('#btn-save-avatar');
            if (btnSaveAvatar) {
                this.saveAvatar(btnSaveAvatar);
            }

            const btnDelAvatar = e.target.closest('#btn-delete-avatar');
            if (btnDelAvatar) {
                this.deleteAvatar(btnDelAvatar);
            }

            const btnSaveUsername = e.target.closest('[data-action="saveUsername"]');
            if (btnSaveUsername) {
                this.saveUsername(btnSaveUsername);
            }

            // Nueva acción interceptada desde HTML para pedir código del email en lugar de abrir la vista de una
            const btnRequestEmail = e.target.closest('[data-action="requestEmailUpdate"]');
            if (btnRequestEmail) {
                this.handleEmailUpdateRequest();
            }

            const btnSaveEmail = e.target.closest('[data-action="saveEmail"]');
            if (btnSaveEmail) {
                this.saveEmail(btnSaveEmail);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'input-avatar-file') {
                this.handleFileSelection(e);
            }
        });

        // Formato para el diálogo de verificación de correo
        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'dialog_email_code') {
                let val = e.target.value.replace(/\D/g, ''); 
                let formatted = '';
                for (let i = 0; i < val.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formatted += '-';
                    }
                    formatted += val[i];
                }
                e.target.value = formatted;
            }
        });
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else {
            alert(msg);
        }
    }

    setButtonLoading(btn) {
        if (btn.disabled) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;
    }

    restoreButton(btn) {
        if (btn.dataset.originalText) {
            btn.innerHTML = btn.dataset.originalText;
        }
        btn.disabled = false;
    }

    handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            this.showMessage('La imagen no debe superar los 2MB.', 'error');
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
        if (imgEl) {
            imgEl.src = imgEl.getAttribute('data-original-src');
        }
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
            btnChange.style.display = 'none';
            btnDelete.style.display = 'none';
            btnCancel.style.display = 'inline-flex';
            btnSave.style.display = 'inline-flex';
        } else {
            btnChange.style.display = 'inline-flex';
            btnDelete.style.display = 'inline-flex';
            btnCancel.style.display = 'none';
            btnSave.style.display = 'none';
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
            if (imgEl) {
                imgEl.src = result.new_avatar;
                imgEl.setAttribute('data-original-src', result.new_avatar);
            }

            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;

            const fileInput = document.getElementById('input-avatar-file');
            if (fileInput) fileInput.value = '';
            this.selectedFile = null;
            this.toggleAvatarButtons(false);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async deleteAvatar(btn) {
        const isConfirmed = await window.dialogSystem.show('confirmDeleteAvatar');
        
        // Ahora requires.confirmed porque devuelve un objeto
        if (!isConfirmed.confirmed) return;

        this.setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Settings.DeleteAvatar);
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');

            const imgEl = document.getElementById('profile-avatar-img');
            if (imgEl) {
                imgEl.src = result.new_avatar;
                imgEl.setAttribute('data-original-src', result.new_avatar);
            }

            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async saveUsername(btn) {
        const input = document.getElementById('input-username');
        if (!input) return;

        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');

        if (val === originalVal) {
            window.appInstance.toggleEditState('username');
            return;
        }

        this.setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Settings.UpdateUsername, { username: val });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            document.getElementById('display-username').textContent = result.new_username;
            input.setAttribute('data-original-value', result.new_username);
            window.appInstance.toggleEditState('username');
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async handleEmailUpdateRequest() {
        // 1. Mostrar diálogo de carga
        window.dialogSystem.show('loadingEmailCode');

        // 2. Pedir enviar código
        const res = await this.api.post(ApiRoutes.Settings.RequestEmailCode);
        
        // 3. Ocultar el diálogo de carga forzosamente y esperar a que las animaciones terminen
        window.dialogSystem.closeCurrent(false);
        await new Promise(resolve => setTimeout(resolve, 350));

        if (res.success) {
            
            // LÓGICA ANTI-BUCLES: Si el backend informa que ya estaba autorizado, abrimos la vista y detenemos el modal
            if (res.skip_verification) {
                window.appInstance.toggleEditState('email');
                return;
            }

            this.showMessage(res.message, 'success');

            // 4. Mostrar input para capturar el código enviado
            const verifyDialog = await window.dialogSystem.show('verifyEmailCode');
            
            if (verifyDialog.confirmed) {
                const code = verifyDialog.data['dialog_email_code'];
                if (!code) {
                    this.showMessage('El código de verificación es obligatorio.', 'error');
                    return;
                }

                // 5. Validar en API
                const verifyRes = await this.api.post(ApiRoutes.Settings.VerifyEmailCode, { code });
                
                if (verifyRes.success) {
                    this.showMessage(verifyRes.message, 'success');
                    
                    // 6. Finalmente, desatar la vista de Edición del HTML
                    window.appInstance.toggleEditState('email');
                } else {
                    this.showMessage(verifyRes.message, 'error');
                }
            }
        } else {
            this.showMessage(res.message, 'error');
        }
    }

    async saveEmail(btn) {
        const input = document.getElementById('input-email');
        if (!input) return;

        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');

        if (val === originalVal) {
            window.appInstance.toggleEditState('email');
            return;
        }

        this.setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Settings.UpdateEmail, { email: val });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            document.getElementById('display-email').textContent = result.new_email;
            input.setAttribute('data-original-value', result.new_email);
            window.appInstance.toggleEditState('email');
        } else {
            this.showMessage(result.message, 'error');
        }
    }
}