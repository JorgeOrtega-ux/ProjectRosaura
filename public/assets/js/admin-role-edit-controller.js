// public/assets/js/admin-role-edit-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class AdminRoleEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        
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
            if (btnToggleRole) {
                if (window.appInstance) window.appInstance.toggleModule('adminModuleRole');
            }

            const btnSetRole = e.target.closest('[data-action="adminSetRole"]');
            if (btnSetRole) this.saveRoleFromDropdown(btnSetRole);
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
        
        const res = await this.api.post(ApiRoutes.Admin.GetUser, { target_user_id: this.targetUserId });
        
        if (res.success) {
            const user = res.user;
            
            const roleText = document.getElementById('admin-role-text');
            if (roleText) roleText.textContent = this.roleMap[user.role] || user.role;

            document.querySelectorAll('[data-action="adminSetRole"]').forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-value') === user.role);
            });

            if (loader) loader.classList.add('disabled');
            if (form) form.classList.remove('disabled');
        } else {
            this.showMessage(res.message, 'error');
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
        }
    }

    async saveRoleFromDropdown(btn) {
        const value = btn.getAttribute('data-value');

        document.querySelectorAll(`[data-action="adminSetRole"]`).forEach(el => el.classList.remove('active'));
        btn.classList.add('active');

        const roleText = document.getElementById('admin-role-text');
        if (roleText) roleText.textContent = btn.querySelector('.component-menu-link-text span').textContent;
        
        if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleRole"]'));

        const result = await this.api.post(ApiRoutes.Admin.UpdateRole, { target_user_id: this.targetUserId, role: value });
        if (result.success) {
            this.showMessage(result.message, 'success');
        } else {
            this.showMessage(result.message, 'error');
        }
    }
}