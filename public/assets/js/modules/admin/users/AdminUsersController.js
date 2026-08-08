import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton, debounce, catchPaginationClick } from '../../../core/utils/uiUtils.js';
class AdminUsersController {
    constructor() {
        this.api = new ApiService();
        this.selectedUserIds = new Set();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false; 
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleGlobalInputBound = this.handleGlobalInput.bind(this);
        this.handleGlobalChangeBound = this.handleGlobalChange.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.filterTimeout = null;
        this.applyAllFilters = debounce(this.executeServerFilters.bind(this), 400);
    }
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
        this.initializeFiltersFromURL();
        this.translateRolesInTable(); 
    }
    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handlePaginationClickBound, true);
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('input', this.handleGlobalInputBound);
        document.removeEventListener('change', this.handleGlobalChangeBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.selectedUserIds.clear();
        this.isInitialized = false;
    }
    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        document.addEventListener('change', this.handleGlobalChangeBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }
    generateRoleKey(name) {
        if (!name) return 'role.unknown';
        return 'role.' + name.toLowerCase().trim().replace(/[\s\W_]+/g, '_');
    }
    translateRolesInTable() {
        const roleElements = document.querySelectorAll('[data-role-original-name]');
        roleElements.forEach(el => {
            const originalName = el.getAttribute('data-role-original-name');
            if (originalName) {
                const key = this.generateRoleKey(originalName);
                el.textContent = typeof window.__ === 'function' ? window.__(key) : key;
            }
        });
    }
    handlePaginationClick(e) {
        catchPaginationClick(e, url => this.handlePagination(url));
    }
    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchUser"]');
        const toggleFiltersBtn = e.target.closest('[data-action="toggleUserFilters"]');
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
        const selectTargetRow = e.target.closest('[data-action="selectUser"]');
        const deselectBtn = e.target.closest('[data-action="deselectUser"]');
        const editUserBtn = e.target.closest('[data-action="editSelectedUser"]');
        const editRoleBtn = e.target.closest('[data-action="editSelectedUserRole"]');
        const editStatusBtn = e.target.closest('[data-action="editSelectedUserStatus"]');
        const viewHistoryBtn = e.target.closest('[data-action="viewUserHistory"]');
        const deleteUsersBtn = e.target.closest('[data-action="deleteSelectedUsers"]');
        if (searchBtn) this.toggleSearchToolbar();
        if (toggleFiltersBtn) this.toggleFiltersModule();
        if (openSubMenuBtn) this.openFilterSubMenu(openSubMenuBtn);
        if (backToMainFiltersBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.backToMainFilters();
        }
        if (selectTargetRow && !e.target.closest('button') && !e.target.closest('.component-dropdown-wrapper')) {
            this.handleUserSelection(selectTargetRow);
        }
        if (deselectBtn) this.deselectUser();
        if (editUserBtn && !editUserBtn.classList.contains('disabled-interaction')) this.editSelectedUser();
        if (editRoleBtn && !editRoleBtn.classList.contains('disabled-interaction')) this.editSelectedUserRole(editRoleBtn);
        if (editStatusBtn && !editStatusBtn.classList.contains('disabled-interaction')) this.editSelectedUserStatus();
        if (viewHistoryBtn && !viewHistoryBtn.classList.contains('disabled-interaction')) this.viewSelectedUserHistory();
        if (deleteUsersBtn && !deleteUsersBtn.classList.contains('disabled-interaction')) this.deleteSelectedUsers(deleteUsersBtn);
        const submitMultipleRolesUpdateBtn = e.target.closest('[data-action="submitMultipleRolesUpdate"]');
        if (submitMultipleRolesUpdateBtn) {
            e.preventDefault();
            this.submitRoleUpdate(submitMultipleRolesUpdateBtn);
        }
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }
    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'user-search-input') {
            this.applyAllFilters();
        }
    }
    handleGlobalChange(e) {
        if (e.target && e.target.classList.contains('filter-checkbox')) {
            this.applyAllFilters();
        }
        if (e.target && e.target.classList.contains('admin-role-checkbox')) {
            this.updateRolesDropdownText();
        }
    }
    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/users')) {
            this.initializeFiltersFromURL();
            this.translateRolesInTable();
        }
    }
    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const searchInput = document.querySelector('[data-ref="user-search-input"]');
        if (searchInput) searchInput.value = urlParams.get('q') || '';
        
        const rolesParam = urlParams.get('roles');
        const rolesList = rolesParam ? rolesParam.split(',') : null;
        document.querySelectorAll('.filter-checkbox[data-filter-type="role_id"]').forEach(cb => {
            cb.checked = rolesList ? rolesList.includes(cb.value) : true;
        });

        const statusParam = urlParams.get('status');
        const statusList = statusParam ? statusParam.split(',') : null;
        document.querySelectorAll('.filter-checkbox[data-filter-type="status"]').forEach(cb => {
            cb.checked = statusList ? statusList.includes(cb.value) : true;
        });

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && searchInput && searchInput.value !== '') {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
        }

        this.backToMainFilters();
        this.updateFilterButtonsState();
        this.deselectUser();
    }
    resetViewState() {
        this.deselectUser(); 
    }
    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="view-table"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        if (tableContainer) {
            tableContainer.classList.add('disabled-interaction');
        }
        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : null });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newTable = doc.querySelector('[data-ref="view-table"]');
            if (newTable && tableContainer) {
                tableContainer.innerHTML = newTable.innerHTML;
            }
            const newPaginations = doc.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
            if (newPaginations.length > 0 && currentPaginations.length > 0) {
                currentPaginations.forEach((container, index) => {
                    if(newPaginations[index]) {
                        container.innerHTML = newPaginations[index].innerHTML;
                        if (newPaginations[index].hasAttribute('data-tooltip')) {
                            container.setAttribute('data-tooltip', newPaginations[index].getAttribute('data-tooltip'));
                        }
                    }
                });
            }
            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            this.resetViewState();
            this.updateFilterButtonsState();
            this.translateRolesInTable();
            if (typeof window.applyRoleDynamicColors === 'function') window.applyRoleDynamicColors();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (tableContainer) {
                tableContainer.classList.remove('disabled-interaction');
            }
        }
    }
    editSelectedUser() {
        if (this.selectedUserIds.size !== 1) return;
        const id = Array.from(this.selectedUserIds)[0];
        const row = document.querySelector(`tr[data-user-id="${id}"]`);
        const uuid = row ? row.getAttribute('data-user-uuid') : id;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/user-profile/${uuid}`);
        else window.location.href = `${this.basePath}/admin/user-profile/${uuid}`;
    }
    async editSelectedUserRole(btn) {
        if (this.selectedUserIds.size !== 1) return;
        const id = Array.from(this.selectedUserIds)[0];
        const row = document.querySelector(`tr[data-user-id="${id}"]`);
        const uuid = row ? row.getAttribute('data-user-uuid') : id;
        if (btn) setButtonLoading(btn);
        try {
            const html = await this.api.fetchHtml(`${this.basePath}/admin/user-roles/${uuid}`, {
                headers: { 'X-SPA-Request': 'true' }
            });
            if (btn) restoreButton(btn);
            await window.modalSystem.show('dynamicHtmlModal', { html: html });
            this.updateRolesDropdownText();
        } catch (error) {
            if (btn) restoreButton(btn);
            showMessage(window.__('err_update_roles') || 'Error al cargar los roles', 'error');
        }
    }
    editSelectedUserStatus() {
        if (this.selectedUserIds.size !== 1) return;
        const id = Array.from(this.selectedUserIds)[0];
        const row = document.querySelector(`tr[data-user-id="${id}"]`);
        const uuid = row ? row.getAttribute('data-user-uuid') : id;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/user-moderation/${uuid}`);
        else window.location.href = `${this.basePath}/admin/user-moderation/${uuid}`;
    }
    viewSelectedUserHistory() {
        if (this.selectedUserIds.size !== 1) return;
        const id = Array.from(this.selectedUserIds)[0];
        const row = document.querySelector(`tr[data-user-id="${id}"]`);
        const uuid = row ? row.getAttribute('data-user-uuid') : id;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/user-activity/${uuid}`);
        else window.location.href = `${this.basePath}/admin/user-activity/${uuid}`;
    }
    async deleteSelectedUsers(btn) {
        if (this.selectedUserIds.size === 0) return;
        const resultDialog = await window.modalSystem.show('verifyPasswordDeleteUsers', {
            count: this.selectedUserIds.size
        });
        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';
        if (!password) { showMessage(__('err_admin_password_required'), 'error'); return; }
        setButtonLoading(btn);
        const payload = {
            user_ids: Array.from(this.selectedUserIds),
            password: password
        };
        const result = await this.api.post(ApiRoutes.Admin.DeleteUsers, payload, this.abortController.signal);
        if (result.aborted) return;
        restoreButton(btn);
        if (result.success) {
            if (result.failed_count > 0) {
                showMessage(`Deleted ${result.deleted_count} user(s). Skipped ${result.failed_count} due to lack of permissions.`, 'warning');
            } else {
                showMessage(window.__('users_deleted_success').replace('{deleted}', result.deleted_count), 'success');
            }
            this.selectedUserIds.clear();
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/users`, { forceReload: true });
                else window.location.reload();
            }, 2500);
        } else {
            showMessage(result.message, 'error');
        }
    }
    openFilterSubMenu(btn) {
        const targetId = btn.getAttribute('data-target');
        const targetMenu = document.querySelector(`[data-ref="${targetId}"]`);
        const mainFilters = document.querySelector('[data-ref="menuMainFilters"]');
        if (targetMenu && mainFilters) {
            mainFilters.classList.add('disabled');
            mainFilters.classList.remove('active');
            targetMenu.classList.remove('disabled');
            targetMenu.classList.add('active');
        }
    }
    backToMainFilters() {
        const mainFilters = document.querySelector('[data-ref="menuMainFilters"]');
        const subMenus = document.querySelectorAll('[data-module="moduleUserFilters"] .component-menu:not([data-ref="menuMainFilters"])');
        if (mainFilters) {
            subMenus.forEach(menu => {
                menu.classList.add('disabled');
                menu.classList.remove('active');
            });
            mainFilters.classList.remove('disabled');
            mainFilters.classList.add('active');
        }
    }
    toggleFiltersModule() {
        if (window.appInstance) {
            window.appInstance.toggleModule('moduleUserFilters');
            const filtersModule = document.querySelector('[data-module="moduleUserFilters"]');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                this.backToMainFilters(); 
            }
        }
    }
    handleUserSelection(rowElement) {
        const userId = rowElement.getAttribute('data-user-id');
        if (this.selectedUserIds.has(userId)) {
            this.selectedUserIds.delete(userId);
            rowElement.classList.remove('selected');
        } else {
            this.selectedUserIds.add(userId);
            rowElement.classList.add('selected');
        }
        this.updateSelectionUI();
    }
    deselectUser() {
        this.selectedUserIds.clear();
        document.querySelectorAll('[data-action="selectUser"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }
    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        const btnEditAccount = document.querySelector('[data-action="editSelectedUser"]');
        const btnEditRole = document.querySelector('[data-action="editSelectedUserRole"]');
        const btnEditStatus = document.querySelector('[data-action="editSelectedUserStatus"]');
        const btnHistory = document.querySelector('[data-action="viewUserHistory"]');
        if (this.selectedUserIds.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');
            if (this.selectedUserIds.size > 1) {
                [btnEditAccount, btnEditRole, btnEditStatus, btnHistory].forEach(btn => {
                    if (btn) btn.classList.add('disabled-interaction');
                });
            } else {
                [btnEditAccount, btnEditRole, btnEditStatus, btnHistory].forEach(btn => {
                    if (btn) btn.classList.remove('disabled-interaction');
                });
            }
            const filtersModule = document.querySelector('[data-module="moduleUserFilters"]');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                if (window.appInstance) window.appInstance.closeModule(filtersModule);
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }
    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="user-search-input"]');
        const filtersModule = document.querySelector('[data-module="moduleUserFilters"]');
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            if (window.appInstance) window.appInstance.closeModule(filtersModule);
        }
        if (searchToolbar) {
            if (searchToolbar.classList.contains('disabled')) {
                searchToolbar.classList.remove('disabled');
                searchToolbar.classList.add('active');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 50);
                }
            } else {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }
    updateFilterButtonsState() {
        const queryInput = document.querySelector('[data-ref="user-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        const roleCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="role_id"]'));
        const statusCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="status"]'));
        
        const checkedRoles = roleCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedStatuses = statusCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }
        
        const filtersBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
        if (filtersBtn) {
            const hasRoleFilter = checkedRoles.length < roleCheckboxes.length;
            const hasStatusFilter = checkedStatuses.length < statusCheckboxes.length;
            if (hasRoleFilter || hasStatusFilter) {
                filtersBtn.classList.add('has-active-filter');
            } else {
                filtersBtn.classList.remove('has-active-filter');
            }
        }
    }


    executeServerFilters() {
        const queryInput = document.querySelector('[data-ref="user-search-input"]');
        const query = (queryInput ? queryInput.value : '').trim();
        const roleCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="role_id"]'));
        const statusCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="status"]'));
        
        const checkedRoles = roleCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedStatuses = statusCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        
        this.updateFilterButtonsState();
        
        const urlParams = new URLSearchParams();
        urlParams.set('page', '1');
        
        if (query) urlParams.set('q', query);
        
        if (checkedRoles.length < roleCheckboxes.length) {
            urlParams.set('roles', checkedRoles.join(','));
        }
        if (checkedStatuses.length < statusCheckboxes.length) {
            urlParams.set('status', checkedStatuses.join(','));
        }
        
        const url = `${this.basePath}/admin/users?${urlParams.toString()}`;
        this.handlePagination(url);
    }
    updateRolesDropdownText() {
        const dropdownText = document.querySelector('[data-ref="roles-dropdown-text"]');
        if (!dropdownText) return;
        const checkedCheckboxes = document.querySelectorAll('.admin-role-checkbox:checked');
        if (checkedCheckboxes.length === 0) {
            dropdownText.textContent = window.__('lbl_select_roles') || 'Seleccionar Roles';
        } else {
            const names = Array.from(checkedCheckboxes).map(cb => {
                const label = cb.closest('label');
                const span = label ? label.querySelector('span') : null;
                return span ? span.textContent.trim() : '';
            }).filter(Boolean);
            dropdownText.textContent = names.join(', ');
        }
    }
    async submitRoleUpdate(btn) {
        const modalBody = document.querySelector('[data-ref="admin-roles-form"]');
        if (!modalBody) return;
        const targetUserId = modalBody.getAttribute('data-target-user-id');
        
        const checkboxes = document.querySelectorAll('.admin-role-checkbox:checked');
        const selectedRoles = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
        if (selectedRoles.length === 0) {
            showMessage(window.__('err_select_role') || 'Debe seleccionar al menos un rol', 'warning');
            return;
        }
        
        const resultDialog = await window.modalSystem.show('verifyPasswordUpdateRole');
        if (!resultDialog.confirmed) return;
        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';
        if (!password) {
            showMessage(window.__('err_password_authorize_roles') || 'Contraseña requerida', 'error');
            return;
        }
        
        setButtonLoading(btn);
        try {
            const result = await this.api.post(ApiRoutes.Admin.UpdateRole, { 
                target_user_id: targetUserId, 
                roles: selectedRoles, 
                password: password
            }, this.abortController.signal);
            
            if (result.aborted) return;
            restoreButton(btn);
            
            if (result.success) {
                showMessage(result.message || window.__('success_roles_updated'), 'success');
                window.modalSystem.closeCurrent();
                this.applyAllFilters();
            } else {
                const errorMessage = window.Translations && window.Translations[result.message_key] 
                                     ? window.Translations[result.message_key] 
                                     : (result.message_key || result.message || window.__('err_update_roles'));
                showMessage(errorMessage, 'error');
            }
        } catch (error) {
            showMessage(window.__('err_connection_role') || 'Error de conexión', 'error');
            restoreButton(btn);
        }
    }
}
export { AdminUsersController };