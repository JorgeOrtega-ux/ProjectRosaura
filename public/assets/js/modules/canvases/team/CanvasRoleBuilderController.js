import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasRoleBuilderController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;
        
        this.roleId = null; 
        this.isEditing = false;
        this.isSystemRole = false; 
        this.currentUserWeight = 0; 
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        const view = document.querySelector('[data-ref="canvasRoleBuilderView"]');
        if (!view) return;
        
        this.canvasId = view.getAttribute('data-canvas-id');
        this.canvasUuid = view.getAttribute('data-canvas-uuid');
        
        const roleIdStr = view.getAttribute('data-role-id');
        const roleId = parseInt(roleIdStr, 10) || 0;
        
        if (roleId > 0) {
            this.isEditing = true;
            this.roleId = roleId;
        } else {
            this.isEditing = false;
            this.roleId = null;
        }
        
        const isSystemStr = view.getAttribute('data-is-system');
        this.isSystemRole = parseInt(isSystemStr, 10) === 1;
        
        this.currentUserWeight = parseInt(view.getAttribute('data-user-weight') || 0, 10);

        this.bindEvents();
    }

    destroy() {
        if (!this.isInitialized) return;
        document.removeEventListener('click', this.handleGlobalClickBound);
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        if (e.target.closest('[data-action="saveRoleData"]')) {
            e.preventDefault();
            this.saveRole(e.target.closest('[data-action="saveRoleData"]'));
        }

        if (e.target.closest('[data-action="applyRoleName"]')) {
            this.handleApplyRoleName(e.target.closest('[data-action="applyRoleName"]'));
        }

        const adjustWeightBtn = e.target.closest('[data-action="adjustWeight"]');
        if (adjustWeightBtn) this.handleAdjustWeight(adjustWeightBtn);
    }

    handleApplyRoleName(btn) {
        if (this.isSystemRole) return;

        const input = document.querySelector('[data-ref="roleNameInput"]');
        const display = document.querySelector('[data-ref="display-role-name"]');
        if (input && display) display.textContent = input.value.trim() || 'Sin definir';

        const viewState = document.querySelector('[data-state="role-name-view"]');
        const editState = document.querySelector('[data-state="role-name-edit"]');
        
        if (viewState && editState) {
            editState.classList.remove('active');
            editState.classList.add('disabled');
            
            viewState.classList.remove('disabled');
            viewState.classList.add('active'); 
        }
    }

    handleAdjustWeight(btn) {
        if (this.isSystemRole) return;

        const step = parseInt(btn.dataset.step, 10);
        const display = document.querySelector('[data-ref="val_role_weight"]');
        
        if (!display) return;
        
        const safeWeight = this.currentUserWeight > 0 ? this.currentUserWeight : 100;
        
        const min = 1;
        const dynamicMax = safeWeight === 100 ? 100 : Math.max(1, safeWeight - 1);
        
        let currentVal = parseInt(display.dataset.val, 10) || 1;
        let newVal = currentVal + step;

        if (newVal < min) newVal = min;
        if (newVal > dynamicMax) newVal = dynamicMax;

        display.dataset.val = newVal;
        display.textContent = newVal;
    }

    async saveRole(btn) {
        if (!this.canvasId) return;

        const nameInput = document.querySelector('[data-ref="roleNameInput"]');
        const weightDisplay = document.querySelector('[data-ref="val_role_weight"]');
        
        const roleName = nameInput ? nameInput.value.trim() : '';
        const roleWeight = weightDisplay ? parseInt(weightDisplay.dataset.val, 10) : 1;

        if (!roleName && !this.isSystemRole) {
            showMessage(window.__('err_role_name_required'), 'error');
            return;
        }

        if (isNaN(roleWeight) || roleWeight < 0 || roleWeight > 99) {
            showMessage('El peso debe ser un número entre 0 y 99', 'error');
            return;
        }

        setButtonLoading(btn);

        const endpoint = this.isEditing ? 'canvases.update_role' : 'canvases.create_role';
        
        const payload = {
            canvas_id: this.canvasId,
            name: roleName,
            weight: roleWeight
        };

        if (this.isEditing) {
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
            showMessage(window.__('err_save_role'), 'error');
            restoreButton(btn);
        }
    }
}

export { CanvasRoleBuilderController };
