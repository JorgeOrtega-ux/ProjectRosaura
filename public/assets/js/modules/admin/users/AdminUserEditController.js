// public/assets/js/modules/admin/users/AdminUserEditController.js
import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminUserEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        this.selectedFile = null;
        this.isDefaultAvatar = false;
        this.config = window.AppServerConfig || {};
        
        this.langMap = {
            'en-US': 'English (United States)',
            'en-GB': 'English (United Kingdom)',
            'fr-FR': 'Français (France)',
            'de-DE': 'Deutsch (Deutschland)',
            'it-IT': 'Italiano (Italia)',
            'es-419': 'Español (Latinoamérica)',
            'es-MX': 'Español (México)',
            'es-ES': 'Español (España)',
            'pt-BR': 'Português (Brasil)',
            'pt-PT': 'Português (Portugal)'
        };

        this.themeMap = {
            'system': 'Sincronizar con el sistema',
            'light': 'Tema claro',
            'dark': 'Tema oscuro'
        };
    }

    init() {
        this.bindEvents();
        
        if (window.location.pathname.includes('/admin/edit-user')) {
            const urlParams = new URLSearchParams(window.location.search);
            this.targetUserId = urlParams.get('id');
            if (this.targetUserId) {
                this.loadUserData();
            } else {
                if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
                else window.location.href = '/ProjectRosaura/admin/manage-users';
            }
        }
    }

    bindEvents() {
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/edit-user')) {
                const urlParams = new URLSearchParams(window.location.search);
                this.targetUserId = urlParams.get('id');
                if (this.targetUserId) {
                    this.loadUserData();
                } else {
                    if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/edit-user')) return;

            if (e.target.closest('#admin-btn-change-avatar') || e.target.closest('#admin-profile-avatar-overlay')) {
                const input = document.getElementById('admin-input-avatar-file');
                if (input) input.click();
            }

            if (e.target.closest('#admin-btn-cancel-avatar')) this.cancelAvatarPreview();
            
            const btnSaveAvatar = e.target.closest('#admin-btn-save-avatar');
            if (btnSaveAvatar) this.saveAvatar(btnSaveAvatar);

            const btnDelAvatar = e.target.closest('#admin-btn-delete-avatar');
            if (btnDelAvatar) this.deleteAvatar(btnDelAvatar);

            const btnSaveUsername = e.target.closest('[data-action="adminSaveUsername"]');
            if (btnSaveUsername) this.saveUsername(btnSaveUsername);

            const btnSaveEmail = e.target.closest('[data-action="adminSaveEmail"]');
            if (btnSaveEmail) this.saveEmail(btnSaveEmail);

            // --- EVENTOS DE PREFERENCIAS ---
            const btnLang = e.target.closest('[data-action="adminToggleModuleLanguage"]');
            if (btnLang) {
                if (window.appInstance) window.appInstance.toggleModule('adminModuleLanguage');
            }

            const btnTheme = e.target.closest('[data-action="adminToggleModuleTheme"]');
            if (btnTheme) {
                if (window.appInstance) window.appInstance.toggleModule('adminModuleTheme');
            }

            const btnSetPref = e.target.closest('[data-action="adminSetPref"]');
            if (btnSetPref) this.savePrefFromDropdown(btnSetPref);
        });

        document.addEventListener('change', (e) => {
            if (!window.location.pathname.includes('/admin/edit-user')) return;
            if (e.target && e.target.id === 'admin-input-avatar-file') this.handleFileSelection(e);

            if (e.target.matches('[data-action="adminTogglePreference"]')) {
                const key = e.target.getAttribute('data-key');
                const value = e.target.checked ? 1 : 0;
                this.savePreference(key, value);
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

    async loadUserData() {
        const loader = document.getElementById('admin-edit-loader');
        
        const res = await this.api.post(ApiRoutes.Admin.GetUser, { target_user_id: this.targetUserId });
        
        if (res.success) {
            const user = res.user;
            const prefs = res.preferences;
            
            // Re-hidratar Avatar
            const imgEl = document.getElementById('admin-profile-avatar-img');
            const avatarContainer = document.getElementById('admin-profile-avatar-container');
            const formattedAvatar = `/ProjectRosaura/${user.profile_picture.replace(/^\//, '')}`;
            
            if (imgEl) {
                imgEl.src = formattedAvatar;
                imgEl.setAttribute('data-original-src', formattedAvatar);
            }
            if (avatarContainer) {
                avatarContainer.className = `component-avatar role-${user.role}`;
            }
            
            this.isDefaultAvatar = formattedAvatar.includes('/default/');
            this.toggleAvatarButtons(false);

            // Re-hidratar Usuario
            const dispUser = document.getElementById('admin-display-username');
            const inpUser = document.getElementById('input-admin-username');
            if (dispUser) dispUser.textContent = user.username;
            if (inpUser) {
                inpUser.value = user.username;
                inpUser.setAttribute('data-original-value', user.username);
            }

            // Re-hidratar Correo
            const dispEmail = document.getElementById('admin-display-email');
            const inpEmail = document.getElementById('input-admin-email');
            if (dispEmail) dispEmail.textContent = user.email;
            if (inpEmail) {
                inpEmail.value = user.email;
                inpEmail.setAttribute('data-original-value', user.email);
            }

            // Re-hidratar Preferencias
            if (prefs) {
                const toggleLinks = document.getElementById('admin-toggle-links');
                const toggleAlerts = document.getElementById('admin-toggle-alerts');
                if (toggleLinks) toggleLinks.checked = (prefs.open_links_new_tab == 1);
                if (toggleAlerts) toggleAlerts.checked = (prefs.extended_alerts == 1);

                const langText = document.getElementById('admin-lang-text');
                if (langText) langText.textContent = this.langMap[prefs.language] || prefs.language;

                const themeText = document.getElementById('admin-theme-text');
                if (themeText) themeText.textContent = this.themeMap[prefs.theme] || prefs.theme;

                document.querySelectorAll('[data-action="adminSetPref"]').forEach(item => {
                    if (item.getAttribute('data-key') === 'language') {
                        item.classList.toggle('active', item.getAttribute('data-value') === prefs.language);
                    }
                    if (item.getAttribute('data-key') === 'theme') {
                        item.classList.toggle('active', item.getAttribute('data-value') === prefs.theme);
                    }
                });
            }

            if (loader) loader.classList.add('disabled');
            document.querySelectorAll('.admin-edit-group').forEach(el => el.classList.remove('disabled'));

        } else {
            this.showMessage(res.message, 'error');
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
        }
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
            const imgEl = document.getElementById('admin-profile-avatar-img');
            if (imgEl) imgEl.src = ev.target.result;
            this.toggleAvatarButtons(true);
        };
        reader.readAsDataURL(file);
    }

    cancelAvatarPreview() {
        const imgEl = document.getElementById('admin-profile-avatar-img');
        const fileInput = document.getElementById('admin-input-avatar-file');
        if (imgEl) imgEl.src = imgEl.getAttribute('data-original-src');
        if (fileInput) fileInput.value = '';
        this.selectedFile = null;
        this.toggleAvatarButtons(false);
    }

    toggleAvatarButtons(isPreview) {
        const btnChange = document.getElementById('admin-btn-change-avatar');
        const btnDelete = document.getElementById('admin-btn-delete-avatar');
        const btnCancel = document.getElementById('admin-btn-cancel-avatar');
        const btnSave = document.getElementById('admin-btn-save-avatar');
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
                btnChange.textContent = 'Subir foto';
            } else {
                btnDelete.classList.remove('disabled');
                btnChange.textContent = 'Cambiar foto';
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
        formData.append('target_user_id', this.targetUserId);

        const result = await this.api.postForm(ApiRoutes.Admin.UpdateAvatar, formData);
        this.restoreButton(btn);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            const imgEl = document.getElementById('admin-profile-avatar-img');
            if (imgEl) { 
                imgEl.src = result.new_avatar; 
                imgEl.setAttribute('data-original-src', result.new_avatar); 
            }
            const fileInput = document.getElementById('admin-input-avatar-file');
            if (fileInput) fileInput.value = '';
            
            this.selectedFile = null;
            this.isDefaultAvatar = false; 
            this.toggleAvatarButtons(false);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async deleteAvatar(btn) {
        if (!confirm('¿Estás seguro de que deseas eliminar la foto de perfil de este usuario?')) return;
        
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Admin.DeleteAvatar, { target_user_id: this.targetUserId });
        this.restoreButton(btn);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            const imgEl = document.getElementById('admin-profile-avatar-img');
            if (imgEl) { 
                imgEl.src = result.new_avatar; 
                imgEl.setAttribute('data-original-src', result.new_avatar); 
            }
            
            this.isDefaultAvatar = true; 
            this.toggleAvatarButtons(false);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async saveUsername(btn) {
        const input = document.getElementById('input-admin-username');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('admin-username'); return; }
        
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Admin.UpdateUsername, { target_user_id: this.targetUserId, username: val });
        this.restoreButton(btn);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            document.getElementById('admin-display-username').textContent = result.new_username;
            input.setAttribute('data-original-value', result.new_username);
            window.appInstance.toggleEditState('admin-username');
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async saveEmail(btn) {
        const input = document.getElementById('input-admin-email');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('admin-email'); return; }
        
        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Admin.UpdateEmail, { target_user_id: this.targetUserId, email: val });
        this.restoreButton(btn);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            document.getElementById('admin-display-email').textContent = result.new_email;
            input.setAttribute('data-original-value', result.new_email);
            window.appInstance.toggleEditState('admin-email');
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async savePrefFromDropdown(btn) {
        const key = btn.getAttribute('data-key');
        const value = btn.getAttribute('data-value');

        document.querySelectorAll(`[data-action="adminSetPref"][data-key="${key}"]`).forEach(el => el.classList.remove('active'));
        btn.classList.add('active');

        if (key === 'language') {
            const langText = document.getElementById('admin-lang-text');
            if (langText) langText.textContent = btn.querySelector('.component-menu-link-text span').textContent;
            if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleLanguage"]'));
        } else if (key === 'theme') {
            const themeText = document.getElementById('admin-theme-text');
            if (themeText) themeText.textContent = btn.querySelector('.component-menu-link-text span').textContent;
            if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleTheme"]'));
        }

        await this.savePreference(key, value);
    }

    async savePreference(key, value) {
        const result = await this.api.post(ApiRoutes.Admin.UpdatePreference, { target_user_id: this.targetUserId, key: key, value: value });
        if (result.success) {
            this.showMessage(result.message, 'success');
        } else {
            this.showMessage(result.message, 'error');
        }
    }
}