import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton, catchPaginationClick } from '../../../core/utils/uiUtils.js';

class CanvasRolesController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false;
        
        this.selectedRoleId = null;
        this.selectedRoleUuid = null;
        this.selectedRoleWeight = null;
        this.selectedIsSystem = 0;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        
        const wrapper = document.querySelector('[data-ref="canvasRolesView"]');
        if (!wrapper) return;
        
        this.canvasId = wrapper.getAttribute('data-canvas-id');
        this.canvasUuid = wrapper.getAttribute('data-canvas-uuid');
        this.userWeight = parseInt(wrapper.getAttribute('data-user-weight')) || 0;
        this.isOwner = wrapper.getAttribute('data-is-owner') === '1';

        this.bindEvents();
        this.deselectAll();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handlePaginationClickBound, true);
        document.removeEventListener('click', this.handleGlobalClickBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.deselectAll();
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handlePaginationClick(e) {
        catchPaginationClick(e, url => this.handlePagination(url));
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/canvases/manage/roles/')) {
            const wrapper = document.querySelector('[data-ref="canvasRolesView"]');
            if (wrapper) {
                this.canvasId = wrapper.getAttribute('data-canvas-id');
                this.canvasUuid = wrapper.getAttribute('data-canvas-uuid');
                this.userWeight = parseInt(wrapper.getAttribute('data-user-weight')) || 0;
                this.isOwner = wrapper.getAttribute('data-is-owner') === '1';
            }
            this.deselectAll();
        }
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

    deselectRole() {
        this.deselectAll();
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
                if (btnPerms) btnPerms.classList.add('disabled-interaction');
                if (btnDelete) btnDelete.classList.add('disabled-interaction');
            }

        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    async handlePagination(url) {
        const bottom = document.querySelector('.component-bottom');
        if (bottom) {
            bottom.classList.add('disabled-interaction');
        }

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : null });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newBottom = doc.querySelector('.component-bottom');
            if (newBottom && bottom) {
                bottom.innerHTML = newBottom.innerHTML;
            }

            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            this.deselectAll();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.reload();
            else window.location.href = url;
        } finally {
            if (bottom) {
                bottom.classList.remove('disabled-interaction');
            }
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
        
        const resultDialog = await window.modalSystem.show('confirmAction', { 
            title: window.__('delete_role'), 
            message: window.__('confirm_delete_role') 
        });
        if (!resultDialog.confirmed) return;

        setButtonLoading(btn);

        try {
            const response = await this.api.post(ApiRoutes.Canvases.DeleteRole, {
                canvas_id: this.canvasId,
                role_id: this.selectedRoleId
            });

            if (response.success) {
                showMessage(response.message, "success");
                this.deselectAll();
                await this.handlePagination(window.location.href);
            } else {
                showMessage(response.message, "error");
                restoreButton(btn);
            }
        } catch (error) {
            showMessage(window.__('err_connection'), 'error');
            restoreButton(btn);
        }
    }
}

export { CanvasRolesController };
