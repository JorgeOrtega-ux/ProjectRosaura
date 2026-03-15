// public/assets/js/modules/admin/users/AdminRoleEditController.js
import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminRoleEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        this.pendingRole = null; 
        this.basePath = window.AppBasePath || '';
        this.eventsBound = false; 
        
        this.roleMap = {
            'founder': 'Fundador',
            'administrator': 'Administrador',
            'moderator': 'Moderador',
            'user': 'Usuario'
        };
    }

    init() {
        this.bindEvents();
        
        if (window.location.pathname.includes('/admin/edit-role')) {
            const urlParams = new URLSearchParams(window.location.search);
            this.targetUserId = urlParams.get('id');
            if (this.targetUserId) {
                this.loadUserData();
            } else {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/admin/manage-users');
                else window.location.href = this.basePath + '/admin/manage-users';
            }
        }
    }

    bindEvents() {
        if (this.eventsBound) return;

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/edit-role')) {
                const urlParams = new URLSearchParams(window.location.search);
                this.targetUserId = urlParams.get('id');
                if (this.targetUserId) {
                    this.loadUserData();
                } else {
                    if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/admin/manage-users');
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/edit-role')) return;

            const btnToggleRole = e.target.closest('[data-action="adminToggleModuleRole"]');
            if (btnToggleRole && !btnToggleRole.classList.contains('disabled-interaction')) {
                if (window.appInstance) window.appInstance.toggleModule('adminModuleRole');
            }

            const btnSetRole = e.target.closest('[data-action="adminSetRole"]');
            if (btnSetRole && !btnSetRole.classList.contains('disabled-interaction')) {
                this.selectRoleFromDropdown(btnSetRole);
            }

            const btnCancelUpdate = e.target.closest('[data-action="cancelRoleUpdate"]');
            if (btnCancelUpdate) this.cancelRoleUpdate();

            const btnSubmitUpdate = e.target.closest('[data-action="submitRoleUpdate"]');
            if (btnSubmitUpdate) this.submitRoleUpdate(btnSubmitUpdate);

            const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
            if (togglePassBtn) {
                const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
                if (inputField && inputField.getAttribute('data-ref') === 'admin_role_confirm_password') {
                    if (inputField.type === 'password') {
                        inputField.type = 'text';
                        togglePassBtn.textContent = 'visibility';
                    } else {
                        inputField.type = 'password';
                        togglePassBtn.textContent = 'visibility_off';
                    }
                }
            }
        });

        // NUEVO LISTENER: Capturar el cambio del toggle de permisos de video
        document.addEventListener('change', (e) => {
            if (!window.location.pathname.includes('/admin/edit-role')) return;

            if (e.target.matches('[data-action="adminToggleUploadPermission"]')) {
                const value = e.target.checked ? 1 : 0;
                this.saveUploadPermission(value);
            }
        });

        this.eventsBound = true;
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else alert(msg);
    }

    async loadUserData() {
        const loader = document.querySelector('[data-ref="admin-role-loader"]');
        const form = document.querySelector('[data-ref="admin-role-form"]');
        const passArea = document.querySelector('[data-ref="admin-role-password-area"]');
        const passInput = document.querySelector('[data-ref="admin_role_confirm_password"]');
        
        this.pendingRole = null;
        if (passArea) passArea.classList.add('disabled');
        if (passInput) passInput.value = '';

        const res = await this.api.post(ApiRoutes.Admin.GetUser, { target_user_id: this.targetUserId });
        
        if (res.success) {
            const user = res.user;
            
            const roleText = document.querySelector('[data-ref="admin-role-text"]');
            if (roleText) roleText.textContent = this.roleMap[user.role] || user.role;

            document.querySelectorAll('[data-action="adminSetRole"]').forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-value') === user.role);
            });

            // Lógica de deshabilitación del rol si es fundador
            const trigger = document.querySelector('[data-action="adminToggleModuleRole"]');
            const desc = document.querySelector('[data-ref="admin-role-desc"]');

            if (user.role === 'founder') {
                if (trigger) trigger.classList.add('disabled-interaction');
                if (desc) desc.innerHTML = '<span class="component-text-notice--error">Esta cuenta pertenece a un Fundador. Su rol no puede ser modificado por seguridad.</span>';
            } else {
                if (trigger) trigger.classList.remove('disabled-interaction');
                if (desc) desc.textContent = 'Selecciona el rol que deseas asignar a este usuario en la plataforma.';
            }

            // NUEVO: Hidratar el estado del toggle de subida de videos
            const toggleUpload = document.querySelector('[data-ref="admin-toggle-upload-permission"]');
            if (toggleUpload) {
                toggleUpload.checked = (user.can_upload_videos == 1);
                
                // Si es admin o fundador, deshabilitamos el toggle porque ya tienen el permiso implícito
                if (user.role === 'founder' || user.role === 'administrator') {
                    toggleUpload.disabled = true;
                    toggleUpload.closest('.component-group-item').style.opacity = '0.5';
                } else {
                    toggleUpload.disabled = false;
                    toggleUpload.closest('.component-group-item').style.opacity = '1';
                }
            }

            if (loader) loader.classList.add('disabled');
            if (form) form.classList.remove('disabled');
        } else {
            this.showMessage(res.message, 'error');
            if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/admin/manage-users');
        }
    }

    selectRoleFromDropdown(btn) {
        const value = btn.getAttribute('data-value');
        this.pendingRole = value;

        document.querySelectorAll(`[data-action="adminSetRole"]`).forEach(el => el.classList.remove('active'));
        btn.classList.add('active');

        const roleText = document.querySelector('[data-ref="admin-role-text"]');
        const roleLabel = btn.querySelector('.component-menu-link-text span').textContent;
        if (roleText) roleText.textContent = roleLabel;
        
        if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleRole"]'));

        const passArea = document.querySelector('[data-ref="admin-role-password-area"]');
        const rolePreview = document.querySelector('[data-ref="admin-role-preview"]');
        
        if (rolePreview) rolePreview.textContent = roleLabel;
        if (passArea) {
            passArea.classList.remove('disabled');
            setTimeout(() => {
                const passInput = document.querySelector('[data-ref="admin_role_confirm_password"]');
                if (passInput) passInput.focus();
            }, 100);
        }
    }

    cancelRoleUpdate() {
        this.loadUserData(); 
    }

    async submitRoleUpdate(btn) {
        if (!this.pendingRole) return;

        const passInput = document.querySelector('[data-ref="admin_role_confirm_password"]');
        const password = passInput ? passInput.value.trim() : '';

        if (!password) {
            this.showMessage('Debes ingresar tu contraseña actual para confirmar.', 'error');
            return;
        }

        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;

        const result = await this.api.post(ApiRoutes.Admin.UpdateRole, { 
            target_user_id: this.targetUserId, 
            role: this.pendingRole,
            password: password
        });

        btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;

        if (result.success) {
            this.showMessage(result.message, 'success');
            this.loadUserData(); 
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    // NUEVO: Método para enviar la petición al servidor del permiso de subida
    async saveUploadPermission(value) {
        // En caso de no tener ApiRoutes actualizado, resolvemos el endpoint crudo
        const route = (ApiRoutes.Admin && ApiRoutes.Admin.UpdateUploadPermission) ? ApiRoutes.Admin.UpdateUploadPermission : (this.basePath + '/api/admin/update_upload_permission');
        
        const result = await this.api.post(route, { 
            target_user_id: this.targetUserId, 
            can_upload_videos: value 
        });

        if (result.success) {
            this.showMessage(result.message, 'success');
        } else {
            this.showMessage(result.message, 'error');
            // Revertir el estado visual en caso de error
            const toggle = document.querySelector('[data-ref="admin-toggle-upload-permission"]');
            if (toggle) toggle.checked = !value;
        }
    }
}