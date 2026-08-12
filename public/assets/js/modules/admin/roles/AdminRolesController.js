import { ApiRoutes }             from '../../../core/api/ApiRoutes.js';
import { showMessage }            from '../../../core/utils/uiUtils.js';
import { BaseListController }     from '../../../core/base/BaseListController.js';
import { applySelectableTable }   from '../../../core/mixins/SelectableTableMixin.js';

function _t(key, fallback = '') {
    return typeof window.__ === 'function' ? window.__(key) : fallback;
}

class AdminRolesController extends BaseListController {
    constructor() {
        super();
        this.selectedRoleId   = null;
        this.selectedRoleUuid = null;
    }

    // ─── Métodos abstractos de BaseListController ─────────────────────────────

    getViewPath()      { return '/admin/roles'; }
    getExcludePath()   { return '/admin/role-'; }
    getSearchInputRef(){ return 'role-search-input'; }

    // ─── Limpieza extra al deseleccionar (hook del mixin) ─────────────────────

    _onDeselect() {
        this.selectedRoleUuid = null;
    }

    // ─── Manejadores de eventos ───────────────────────────────────────────────

    handleGlobalClick(e) {
        const selectTarget = e.target.closest('[data-action="selectRoleRow"]');
        const searchBtn    = e.target.closest('[data-action="searchRole"]');
        const addBtn       = e.target.closest('[data-action="addRole"]');
        const editBtn      = e.target.closest('[data-action="editRole"]');
        const permsBtn     = e.target.closest('[data-action="editPermissions"]');
        const deleteBtn    = e.target.closest('[data-action="deleteRole"]');

        if (selectTarget) this.handleRowSelection(selectTarget);
        if (searchBtn)    this.toggleSearchToolbar();
        if (addBtn)       this.navigateToAddRole();
        if (editBtn)      this.navigateToEditRole();
        if (permsBtn)     this.navigateToEditPermissions();
        if (deleteBtn)    this.openDeleteRoleDialog();

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'role-search-input') {
            this.applyAllFilters();
        }
    }

    // ─── Paginación ───────────────────────────────────────────────────────────

    async handlePagination(url) {
        const tableContainer    = document.querySelector('[data-ref="roles-table-wrapper"]');
        const emptyState        = document.querySelector('[data-ref="roles-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        const containerToDisable = tableContainer || emptyState;

        if (containerToDisable) containerToDisable.classList.add('disabled-interaction');

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController?.signal ?? null });
            const doc  = new DOMParser().parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="manageRolesView"]');
            const newContent  = doc.querySelector('[data-ref="manageRolesView"]');

            if (viewContent && newContent) {
                const bottomContainer    = viewContent.querySelector('.component-bottom');
                const newBottomContainer = newContent.querySelector('.component-bottom');
                if (bottomContainer && newBottomContainer) {
                    bottomContainer.innerHTML = newBottomContainer.innerHTML;
                }

                const newPaginations = doc.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
                if (newPaginations.length > 0 && currentPaginations.length > 0) {
                    currentPaginations.forEach((container, index) => {
                        if (newPaginations[index]) {
                            container.innerHTML = newPaginations[index].innerHTML;
                            if (newPaginations[index].hasAttribute('data-tooltip')) {
                                container.setAttribute('data-tooltip', newPaginations[index].getAttribute('data-tooltip'));
                            }
                        }
                    });
                }
            }

            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            this.updateFilterButtonsState();
            this.deselectAll();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (containerToDisable) containerToDisable.classList.remove('disabled-interaction');
        }
    }

    executeServerFilters() {
        const queryInput = document.querySelector('[data-ref="role-search-input"]');
        const query      = (queryInput ? queryInput.value : '').trim();
        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        if (query) urlParams.set('q', query);
        else       urlParams.delete('q');

        this.handlePagination(`${this.basePath}/admin/roles?${urlParams.toString()}`);
    }

    // ─── Selección de fila ────────────────────────────────────────────────────

    handleRowSelection(target) {
        const roleId = parseInt(target.getAttribute('data-role-id'), 10);
        const roleUuid = target.getAttribute('data-role-uuid');

        if (this.selectedRoleId === roleId) { this.deselectAll(); return; }

        this.selectedRoleId   = roleId;
        this.selectedRoleUuid = roleUuid;

        document.querySelectorAll('[data-action="selectRoleRow"]').forEach(row => {
            row.classList.toggle('selected', row.getAttribute('data-role-id') == roleId);
        });

        this._toggleSelectionBar(true);

        // Lógica específica de roles: permisos por peso y roles del sistema
        const isSystem          = parseInt(target.getAttribute('data-is-system') || 0, 10) === 1;
        const roleWeight        = parseInt(target.getAttribute('data-role-weight') || 0, 10);
        const view              = document.querySelector('[data-ref="manageRolesView"]');
        const currentUserWeight = parseInt(view ? view.getAttribute('data-current-user-weight') : 0, 10);
        const deleteBtn = document.querySelector('[data-action="deleteRole"]');
        const editBtn   = document.querySelector('[data-action="editRole"]');
        const permsBtn  = document.querySelector('[data-action="editPermissions"]');

        if (deleteBtn) { deleteBtn.classList.remove('disabled-interaction'); deleteBtn.removeAttribute('title'); }
        if (editBtn)   { editBtn.classList.remove('disabled-interaction');   editBtn.removeAttribute('title'); }
        if (permsBtn)  { permsBtn.classList.remove('disabled-interaction');  permsBtn.removeAttribute('title'); }

        if (currentUserWeight < 100 && roleWeight >= currentUserWeight) {
            if (deleteBtn) { deleteBtn.classList.add('disabled-interaction'); deleteBtn.setAttribute('title', _t('cannot_delete_higher_role', 'No puedes eliminar un rol de igual o mayor peso')); }
            if (editBtn)   { editBtn.classList.add('disabled-interaction');   editBtn.setAttribute('title', _t('cannot_edit_higher_role', 'No puedes editar un rol de igual o mayor peso')); }
            if (permsBtn)  { permsBtn.classList.add('disabled-interaction');  permsBtn.setAttribute('title', _t('cannot_edit_higher_role_perms', 'No puedes editar permisos de un rol de igual o mayor peso')); }
            return;
        }

        if (isSystem) {
            if (deleteBtn) { deleteBtn.classList.add('disabled-interaction'); deleteBtn.setAttribute('title', _t('system_role_cannot_delete', 'Los roles del sistema no pueden eliminarse')); }
            if (editBtn)   { editBtn.classList.add('disabled-interaction'); editBtn.setAttribute('title', _t('system_role_cannot_edit', 'Los roles del sistema no pueden editarse')); }
            if (permsBtn)  { permsBtn.classList.add('disabled-interaction'); permsBtn.setAttribute('title', _t('system_role_cannot_edit_perms', 'Los permisos de los roles del sistema no pueden modificarse')); }
        }
    }

    // ─── Navegación ───────────────────────────────────────────────────────────

    navigateToAddRole() {
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/role-create`);
        else window.location.href = `${this.basePath}/admin/role-create`;
    }

    navigateToEditRole() {
        if (!this.selectedRoleUuid) return;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/role-edit/${this.selectedRoleUuid}`);
        else window.location.href = `${this.basePath}/admin/role-edit/${this.selectedRoleUuid}`;
    }

    navigateToEditPermissions() {
        if (!this.selectedRoleUuid) return;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/role-permissions/${this.selectedRoleUuid}`);
        else window.location.href = `${this.basePath}/admin/role-permissions/${this.selectedRoleUuid}`;
    }

    // ─── Acciones ─────────────────────────────────────────────────────────────

    async openDeleteRoleDialog() {
        if (!this.selectedRoleId || !window.modalSystem) return;
        const roleId      = parseInt(this.selectedRoleId, 10);
        const selectedRow = document.querySelector(`[data-action="selectRoleRow"][data-role-id="${roleId}"]`);

        if (selectedRow && parseInt(selectedRow.getAttribute('data-is-system'), 10) === 1) {
            showMessage(_t('system_role_cannot_delete', 'Los roles del sistema no pueden eliminarse'), 'error');
            return;
        }

        const roleName = selectedRow ? selectedRow.getAttribute('data-role-name') : '';
        const response = await window.modalSystem.show('confirmDeleteRole', { roleName });
        if (response.confirmed) await this.executeApiAction(ApiRoutes.Admin.DeleteRole, { id: roleId });
    }

    async executeApiAction(apiRoute, payload) {
        const res = await this.api.post(apiRoute, payload, this.abortController.signal);
        if (res.aborted) return;
        if (res.success) {
            showMessage(window.__('msg_joined_successfully'), 'success');
            if (window.spaRouter) window.spaRouter.navigate(window.location.pathname + window.location.search);
            else window.location.reload();
        } else {
            showMessage(res.message || window.__('err_update_canvas'), 'error');
        }
    }
}

// Aplica el mixin de selección. Genera: selectTableRow(), deselectAll(), _toggleSelectionBar()
applySelectableTable(AdminRolesController, {
    idProp:       'selectedRoleId',
    selectionRef: 'role-selection-actions',
    rowSelector:  '[data-action="selectRoleRow"]',
});

export { AdminRolesController };