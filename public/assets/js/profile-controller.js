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
            // Abrir explorador de archivos
            if (e.target.closest('#btn-change-avatar') || e.target.closest('#profile-avatar-overlay')) {
                const input = document.getElementById('input-avatar-file');
                if (input) input.click();
            }

            // Cancelar previsualización
            if (e.target.closest('#btn-cancel-avatar')) {
                this.cancelAvatarPreview();
            }

            // Guardar foto
            const btnSaveAvatar = e.target.closest('#btn-save-avatar');
            if (btnSaveAvatar) {
                this.saveAvatar(btnSaveAvatar);
            }

            // Eliminar foto
            const btnDelAvatar = e.target.closest('#btn-delete-avatar');
            if (btnDelAvatar) {
                this.deleteAvatar(btnDelAvatar);
            }

            // Guardar Username
            const btnSaveUsername = e.target.closest('[data-action="saveUsername"]');
            if (btnSaveUsername) {
                this.saveUsername(btnSaveUsername);
            }

            // Guardar Email
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
    }

    showMessage(msg, type = 'error') {
        // En lugar de renderizar en divs estáticos de la vista de perfil,
        // ahora disparamos el Toast Global
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else {
            // Un respaldo en caso de que appInstance no haya cargado por alguna razón
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

    // --- MÉTODOS DE FOTO DE PERFIL ---

    handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamaño 2MB
        if (file.size > 2 * 1024 * 1024) {
            this.showMessage('La imagen no debe superar los 2MB.', 'error');
            e.target.value = ''; 
            return;
        }

        // Validar MIME types
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            this.showMessage('Solo se permiten imágenes en formato PNG o JPG.', 'error');
            e.target.value = ''; 
            return;
        }

        this.selectedFile = file;

        // FileReader para previsualizar
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
            
            // Actualizamos atributos DOM para que Cancelar sepa a dónde volver
            const imgEl = document.getElementById('profile-avatar-img');
            if (imgEl) {
                imgEl.src = result.new_avatar;
                imgEl.setAttribute('data-original-src', result.new_avatar);
            }

            // Actualizamos la foto en el Header SPA si existe
            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;

            // Reset UI states
            const fileInput = document.getElementById('input-avatar-file');
            if (fileInput) fileInput.value = '';
            this.selectedFile = null;
            this.toggleAvatarButtons(false);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async deleteAvatar(btn) {
        // Lanzamos la promesa y ESPERAMOS LA RESPUESTA de la UI sin bloquear el hilo de Javascript
        const isConfirmed = await window.dialogSystem.show('confirmDeleteAvatar');
        
        // Si el usuario cancela, no hacemos nada más
        if (!isConfirmed) return;

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

            // Actualizamos el Header global
            const headerAvatar = document.querySelector('.header .component-button--profile img');
            if (headerAvatar) headerAvatar.src = result.new_avatar;
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    // --- MÉTODOS DE TEXTOS ---

    async saveUsername(btn) {
        const input = document.getElementById('input-username');
        if (!input) return;

        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');

        // REGLA: Si no hay cambio, cerrar sin request.
        if (val === originalVal) {
            window.appInstance.toggleEditState('username');
            return;
        }

        this.setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Settings.UpdateUsername, { username: val });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            // Actualizar datos de display
            document.getElementById('display-username').textContent = result.new_username;
            input.setAttribute('data-original-value', result.new_username);
            
            // Cerrar modo edición
            window.appInstance.toggleEditState('username');
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async saveEmail(btn) {
        const input = document.getElementById('input-email');
        if (!input) return;

        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');

        // REGLA: Si no hay cambio, cerrar sin request.
        if (val === originalVal) {
            window.appInstance.toggleEditState('email');
            return;
        }

        this.setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Settings.UpdateEmail, { email: val });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            // Actualizar datos de display
            document.getElementById('display-email').textContent = result.new_email;
            input.setAttribute('data-original-value', result.new_email);
            
            // Cerrar modo edición
            window.appInstance.toggleEditState('email');
        } else {
            this.showMessage(result.message, 'error');
        }
    }
}