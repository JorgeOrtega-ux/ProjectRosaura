// public/assets/js/modules/canvases/team/CanvasRoleBuilderController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasRoleBuilderController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        const wrapper = document.querySelector('[data-ref="canvasRoleBuilderView"]');
        if (!wrapper) return;
        
        this.canvasId = wrapper.getAttribute('data-canvas-id');
        this.canvasUuid = wrapper.getAttribute('data-canvas-uuid');
        this.roleId = wrapper.getAttribute('data-role-id');

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

        if (saveBtn) {
            e.preventDefault();
            this.saveRole(saveBtn);
        }
    }

    async saveRole(btn) {
        if (!this.canvasId) return;

        const nameInput = document.querySelector('input[name="role_name"]');
        const roleName = nameInput ? nameInput.value.trim() : '';

        if (!roleName) {
            showMessage('El nombre del rol es obligatorio', 'error');
            if (nameInput) nameInput.focus();
            return;
        }

        const weightInput = document.querySelector('input[name="role_weight"]');
        const roleWeight = weightInput ? parseInt(weightInput.value) : 10;

        if (isNaN(roleWeight) || roleWeight < 0 || roleWeight > 99) {
            showMessage('El peso debe ser un número entre 0 y 99', 'error');
            if (weightInput) weightInput.focus();
            return;
        }

        const permissionCheckboxes = document.querySelectorAll('input[name="permissions[]"]:checked');
        const permissions = Array.from(permissionCheckboxes).map(cb => parseInt(cb.value));

        setButtonLoading(btn);

        const isEdit = !!this.roleId;
        const endpoint = isEdit ? 'canvases.update_role' : 'canvases.create_role';
        
        const payload = {
            canvas_id: this.canvasId,
            name: roleName,
            weight: roleWeight,
            permissions: permissions
        };

        if (isEdit) {
            payload.role_id = this.roleId;
        }

        try {
            const response = await this.api.post(endpoint, payload);

            if (response.success) {
                showMessage(response.message, "success");
                setTimeout(() => {
                    const url = `${this.basePath}/canvases/manage/roles/${this.canvasUuid}`;
                    if (window.spaRouter) window.spaRouter.navigate(url, {forceReload: true});
                    else window.location.href = url;
                }, 1000);
            } else {
                showMessage(response.message, "error");
                restoreButton(btn);
            }
        } catch (error) {
            showMessage('Error al guardar el rol.', "error");
            restoreButton(btn);
        }
    }
}

export { CanvasRoleBuilderController };
