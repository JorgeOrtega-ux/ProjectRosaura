import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasRolePermissionsController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        
        const wrapper = document.querySelector('[data-ref="canvasRolePermissionsView"]');
        if (!wrapper) return;

        this.canvasId = wrapper.getAttribute('data-canvas-id');
        this.canvasUuid = wrapper.getAttribute('data-canvas-uuid');
        this.roleId = wrapper.getAttribute('data-role-id');
        this.isSystem = wrapper.getAttribute('data-is-system') === '1';

        if (this.isSystem) {
            showMessage(window.__('err_edit_system_role'), 'warning');
            return;
        }

        this.isInitialized = true;
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
        const saveBtn = e.target.closest('[data-action="savePermissions"]');
        if (saveBtn) {
            e.preventDefault();
            this.savePermissions(saveBtn);
        }
    }

    async savePermissions(btn) {
        if (!this.canvasId || !this.roleId) return;

        const wrapper = document.querySelector('[data-ref="canvasRolePermissionsView"]');
        if (!wrapper) return;

        const checkboxes = wrapper.querySelectorAll('input[data-ref="permCheckbox"]:checked');
        const permissions = Array.from(checkboxes).map(cb => parseInt(cb.value));

        setButtonLoading(btn);

        const payload = {
            role_id: this.roleId,
            canvas_id: this.canvasId,
            permissions: permissions
        };

        try {
            const response = await this.api.post(ApiRoutes.Canvases.UpdateRolePermissions, payload);
            
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
            showMessage(window.__('err_save_permissions'), 'error');
            restoreButton(btn);
        }
    }
}

export { CanvasRolePermissionsController };
