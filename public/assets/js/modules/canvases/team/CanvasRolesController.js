import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasRolesController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;
        
        this.selectedRoleId = null;
        this.selectedRoleUuid = null;
        this.selectedRoleWeight = null;
        this.selectedIsSystem = 0;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        const wrapper = document.querySelector('[data-ref="canvasRolesView"]');
        if (!wrapper) return;
        
        this.canvasId = wrapper.getAttribute('data-canvas-id');
        this.canvasUuid = wrapper.getAttribute('data-canvas-uuid');
        this.userWeight = parseInt(wrapper.getAttribute('data-user-weight')) || 0;
        this.isOwner = wrapper.getAttribute('data-is-owner') === '1';

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
        const selectRow = e.target.closest('[data-action="selectRoleRow"]');
        const deselectBtn = e.target.closest('[data-action="deselectRole"]');
        const addBtn = e.target.closest('[data-action="addRole"]');
        const editBtn = e.target.closest('[data-action="editRole"]');
        const permsBtn = e.target.closest('[data-action="editPermissions"]');
        const deleteBtn = e.target.closest('[data-action="deleteRole"]');

        if (selectRow && !e.target.closest('button')) {
            this.handleRoleSelection(selectRow);
        }
        
        if (deselectBtn) this.deselectRole();
        if (addBtn) this.navigateToAddRole();
        if (editBtn && !editBtn.classList.contains('disabled-interaction')) this.navigateToEditRole();
        if (permsBtn && !permsBtn.classList.contains('disabled-interaction')) this.navigateToEditPermissions();
        if (deleteBtn && !deleteBtn.classList.contains('disabled-interaction')) this.deleteRole(deleteBtn);
    }

    handleRoleSelection(target) {
        const roleId = target.getAttribute('data-role-id');
        const roleUuid = target.getAttribute('data-role-uuid');
        const weight = parseInt(target.getAttribute('data-role-weight'));
        const isSystem = parseInt(target.getAttribute('data-is-system'));
        
        if (this.selectedRoleId === roleId) {
            this.deselectAll();
            return;
        }

        document.querySelectorAll('[data-action="selectRoleRow"]').forEach(el => el.classList.remove('selected'));
        this.selectedRoleId = roleId;
        this.selectedRoleUuid = roleUuid;
        this.selectedRoleWeight = weight;
        this.selectedIsSystem = isSystem;
        target.classList.add('selected');

        this.updateSelectionUI();
    }

    deselectAll() {
        this.selectedRoleId = null;
        this.selectedRoleUuid = null;
        this.selectedRoleWeight = null;
        this.selectedIsSystem = 0;
        document.querySelectorAll('[data-action="selectRoleRow"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="role-selection-actions"]');

        const btnEdit = document.querySelector('[data-action="editRole"]');
        const btnPerms = document.querySelector('[data-action="editPermissions"]');
        const btnDelete = document.querySelector('[data-action="deleteRole"]');

        if (this.selectedRoleId) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');

            const canEdit = this.isOwner || (this.userWeight > this.selectedRoleWeight);
            const isSystem = this.selectedIsSystem === 1;

            if (canEdit && !isSystem) {
                if (btnEdit) btnEdit.classList.remove('disabled-interaction');
                if (btnPerms) btnPerms.classList.remove('disabled-interaction');
                if (btnDelete) btnDelete.classList.remove('disabled-interaction');
            } else {
                if (btnEdit) btnEdit.classList.add('disabled-interaction');

                if (btnPerms) {
                    if (canEdit) btnPerms.classList.remove('disabled-interaction');
                    else btnPerms.classList.add('disabled-interaction');
                }
                if (btnDelete) btnDelete.classList.add('disabled-interaction');
            }

            if (isSystem && btnDelete) btnDelete.classList.add('disabled-interaction');

        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    navigateToAddRole() {
        const url = `${this.basePath}/canvases/manage/role-builder/${this.canvasUuid}`;
        if (window.spaRouter) window.spaRouter.navigate(url);
        else window.location.href = url;
    }

    navigateToEditRole() {
        if (!this.selectedRoleUuid) return;
        const url = `${this.basePath}/canvases/manage/role-builder/${this.canvasUuid}/${this.selectedRoleUuid}`;
        if (window.spaRouter) {
            window.spaRouter.navigate(url);
        } else {
            window.location.href = url;
        }
    }

    navigateToEditPermissions() {
        if (!this.selectedRoleUuid) return;
        const url = `${this.basePath}/canvases/manage/role-permissions/${this.canvasUuid}/${this.selectedRoleUuid}`;
        if (window.spaRouter) {
            window.spaRouter.navigate(url);
        } else {
            window.location.href = url;
        }
    }

    async deleteRole(btn) {
        if (!this.selectedRoleId) return;
        
        const resultDialog = await window.dialogSystem.show('confirmAction', { 
            title: window.__('delete_role'), 
            message: window.__('confirm_delete_role') 
        });
        if (!resultDialog.confirmed) return;

        setButtonLoading(btn);

        try {
            const response = await this.api.post('canvases.delete_role', {
                canvas_id: this.canvasId,
                role_id: this.selectedRoleId
            });

            if (response.success) {
                showMessage(response.message, "success");
                setTimeout(() => {
                    if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/manage/roles/${this.canvasUuid}`, {forceReload: true});
                    else window.location.reload();
                }, 1000);
            } else {
                showMessage(response.message, "error");
                restoreButton(btn);
            }
        } catch (error) {
            showMessage('Error de conexión.', "error");
            restoreButton(btn);
        }
    }
}

export { CanvasRolesController };
