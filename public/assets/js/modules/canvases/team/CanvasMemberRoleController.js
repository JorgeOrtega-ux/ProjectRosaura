// public/assets/js/modules/canvases/team/CanvasMemberRoleController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasMemberRoleController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        const wrapper = document.querySelector('[data-ref="change-role-wrapper"]');
        if (!wrapper) return;
        
        this.canvasId = wrapper.getAttribute('data-canvas-id');
        this.canvasUuid = wrapper.getAttribute('data-canvas-uuid');
        this.targetUserId = wrapper.getAttribute('data-target-user-id');

        this.bindEvents();
    }

    destroy() {
        document.removeEventListener('click', this.handleGlobalClickBound);
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        const saveBtn = e.target.closest('[data-action="saveRole"]');
        const cancelBtn = e.target.closest('[data-action="cancelRole"]');

        if (saveBtn) {
            e.preventDefault();
            this.saveMemberRole(saveBtn);
        }

        if (cancelBtn) {
            e.preventDefault();
            this.navigateBack();
        }
    }

    async saveMemberRole(btn) {
        if (!this.canvasId || !this.targetUserId) {
            showMessage(__('err_missing_data') || 'Datos incompletos para actualizar el rol.', 'error');
            return;
        }

        const selectedRoleInput = document.querySelector('input[name="new_member_role"]:checked');
        if (!selectedRoleInput) {
            showMessage(__('err_select_role') || 'Por favor, selecciona un rol.', 'warning');
            return;
        }

        const newRole = selectedRoleInput.value;

        setButtonLoading(btn);

        try {
            const response = await this.api.post('canvases.change_member_role', {
                canvas_id: this.canvasId,
                target_user_id: this.targetUserId,
                role: newRole
            });

            if (response.success) {
                showMessage(response.message, "success");
                setTimeout(() => {
                    this.navigateBack();
                }, 1000);
            } else {
                showMessage(response.message, "error");
                restoreButton(btn);
            }
        } catch (error) {
            showMessage(__('err_connection_role') || 'Error de conexión al cambiar el rol.', "error");
            restoreButton(btn);
        }
    }

    navigateBack() {
        const url = `${this.basePath}/canvases/members/${this.canvasUuid}`;
        if (window.spaRouter) {
            window.spaRouter.navigate(url);
        } else {
            window.location.href = url;
        }
    }
}

export { CanvasMemberRoleController };