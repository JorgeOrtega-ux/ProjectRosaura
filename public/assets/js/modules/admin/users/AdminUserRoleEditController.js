// public/assets/js/modules/admin/users/AdminUserRoleEditController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

const _t = (key, fallback) => typeof window.__ === 'function' ? window.__(key) : fallback;

class AdminUserRoleEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        this.basePath = window.AppBasePath || '';
        
        this.abortController = null;

        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        
        this.bindEvents();
        if (window.location.pathname.includes('/admin/edit-user-role')) {
            this.setupInitialState();
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/edit-user-role')) {
            this.setupInitialState();
        }
    }

    setupInitialState() {
        const viewContent = document.querySelector('.view-content[data-user-id]');
        if (viewContent) {
            this.targetUserId = viewContent.getAttribute('data-user-id');
        }
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/edit-user-role')) return;

        const btnCancelUpdate = e.target.closest('[data-action="cancelRoleUpdate"]');
        if (btnCancelUpdate) this.cancelRoleUpdate();

        const btnSubmitUpdate = e.target.closest('[data-action="submitMultipleRolesUpdate"]') || e.target.closest('[data-action="submitRoleUpdate"]');
        if (btnSubmitUpdate) this.submitRoleUpdate(btnSubmitUpdate);
    }

    cancelRoleUpdate() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/manage-users`);
        } else {
            window.location.href = `${this.basePath}/admin/manage-users`;
        }
    }

    async submitRoleUpdate(btn) {
        const checkboxes = document.querySelectorAll('.admin-role-checkbox:checked');
        const selectedRoles = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

        if (selectedRoles.length === 0) {
            showMessage(_t('err_require_role', 'Debes seleccionar al menos un rol. El rol User es obligatorio.'), 'warning');
            return;
        }

        const resultDialog = await window.dialogSystem.show('verifyPasswordUpdateRole');

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';

        if (!password) {
            showMessage(_t('err_require_password_to_confirm', 'Contraseña requerida'), 'error');
            return;
        }

        setButtonLoading(btn);

        const result = await this.api.post(ApiRoutes.Admin.UpdateRole, { 
            target_user_id: this.targetUserId, 
            roles: selectedRoles, 
            password: password
        }, this.abortController.signal);

        if (result.aborted) return;

        restoreButton(btn);

        if (result.success) {
            showMessage(result.message || _t('admin.role_updated', 'Roles actualizados correctamente.'), 'success');
            setTimeout(() => {
                this.cancelRoleUpdate();
            }, 1000);
        } else {
            const errorMessage = window.Translations && window.Translations[result.message_key] 
                                 ? window.Translations[result.message_key] 
                                 : (result.message_key || result.message || 'Error al actualizar roles.');
            showMessage(errorMessage, 'error');
        }
    }
}

export { AdminUserRoleEditController };