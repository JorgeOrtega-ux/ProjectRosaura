// public/assets/js/modules/admin/users/AdminRoleEditController.js
import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminRoleEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        this.pendingRole = null; 
        
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
                if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
                else window.location.href = '/ProjectRosaura/admin/manage-users';
            }
        }
    }

    bindEvents() {
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/edit-role')) {
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

            // Reutilizamos el botón del "Ojo" genérico para mostrar/ocultar contraseña
            const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
            if (togglePassBtn) {
                const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
                if (inputField && inputField.id === 'admin_role_confirm_password') {
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
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else alert(msg);
    }

    async loadUserData() {
        const loader = document.getElementById('admin-role-loader');
        const form = document.getElementById('admin-role-form');
        const passArea = document.getElementById('admin-role-password-area');
        const passInput = document.getElementById('admin_role_confirm_password');
        
        // Limpiamos estados visuales al cargar/recargar
        this.pendingRole = null;
        if (passArea) passArea.classList.add('disabled');
        if (passInput) passInput.value = '';

        const res = await this.api.post(ApiRoutes.Admin.GetUser, { target_user_id: this.targetUserId });
        
        if (res.success) {
            const user = res.user;
            
            const roleText = document.getElementById('admin-role-text');
            if (roleText) roleText.textContent = this.roleMap[user.role] || user.role;

            document.querySelectorAll('[data-action="adminSetRole"]').forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-value') === user.role);
            });

            // --- REGLA 1: BLOQUEAR INTERACCIÓN SI EL TARGET ES FUNDADOR ---
            const trigger = document.querySelector('[data-action="adminToggleModuleRole"]');
            const desc = document.getElementById('admin-role-desc');

            if (user.role === 'founder') {
                if (trigger) trigger.classList.add('disabled-interaction');
                if (desc) desc.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Esta cuenta pertenece a un Fundador. Su rol no puede ser modificado por seguridad.</span>';
            } else {
                if (trigger) trigger.classList.remove('disabled-interaction');
                if (desc) desc.textContent = 'Selecciona el rol que deseas asignar a este usuario en la plataforma.';
            }

            if (loader) loader.classList.add('disabled');
            if (form) form.classList.remove('disabled');
        } else {
            this.showMessage(res.message, 'error');
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
        }
    }

    selectRoleFromDropdown(btn) {
        const value = btn.getAttribute('data-value');
        this.pendingRole = value;

        document.querySelectorAll(`[data-action="adminSetRole"]`).forEach(el => el.classList.remove('active'));
        btn.classList.add('active');

        const roleText = document.getElementById('admin-role-text');
        const roleLabel = btn.querySelector('.component-menu-link-text span').textContent;
        if (roleText) roleText.textContent = roleLabel;
        
        if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleRole"]'));

        const passArea = document.getElementById('admin-role-password-area');
        const rolePreview = document.getElementById('admin-role-preview');
        
        if (rolePreview) rolePreview.textContent = roleLabel;
        if (passArea) {
            passArea.classList.remove('disabled');
            setTimeout(() => {
                const passInput = document.getElementById('admin_role_confirm_password');
                if (passInput) passInput.focus();
            }, 100);
        }
    }

    cancelRoleUpdate() {
        this.loadUserData(); // Restaura el estado visual a lo que dice la DB
    }

    async submitRoleUpdate(btn) {
        if (!this.pendingRole) return;

        const passInput = document.getElementById('admin_role_confirm_password');
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
}