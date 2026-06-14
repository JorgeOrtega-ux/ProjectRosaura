import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

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
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
        this.resetViewState();
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
        const target = e.target.closest('a[href], button[data-nav]');
        if (!target) return;

        const url = target.getAttribute('href') || target.getAttribute('data-nav') || '';
        const isPaginationLink = url.includes('page=') || target.closest('[class*="pagin"]') || target.closest('[data-ref="pagination-container"]') || target.hasAttribute('data-action', 'paginate');

        if (isPaginationLink && url !== '#' && !url.includes('javascript:')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.handlePagination(url);
        }
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
        
        if (editUserBtn && !editUserBtn.classList.contains('disabled-interactive')) this.editSelectedUser();
        if (editRoleBtn && !editRoleBtn.classList.contains('disabled-interactive')) this.editSelectedUserRole();
        if (editStatusBtn && !editStatusBtn.classList.contains('disabled-interactive')) this.editSelectedUserStatus();
        if (viewHistoryBtn && !viewHistoryBtn.classList.contains('disabled-interactive')) this.viewSelectedUserHistory();
        if (deleteUsersBtn && !deleteUsersBtn.classList.contains('disabled-interactive')) this.deleteSelectedUsers(deleteUsersBtn);

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
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/manage-users')) {
            this.resetViewState();
            this.translateRolesInTable();
        }
    }

    resetViewState() {
        const searchInput = document.querySelector('[data-ref="user-search-input"]');
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = true);
        
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar) {
            searchToolbar.classList.remove('active');
            searchToolbar.classList.add('disabled');
        }

        this.backToMainFilters();
        this.applyAllFilters();
        this.deselectUser(); 
    }

    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="view-table"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');

        if (tableContainer) {
            tableContainer.style.transition = 'opacity 0.2s ease';
            tableContainer.style.opacity = '0.5';
            tableContainer.style.pointerEvents = 'none';
        }

        try {
            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/html' },
                signal: this.abortController.signal
            });
            
            if (!response.ok) throw new Error(`HTTP Status ${response.status}`);
            const html = await response.text();
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
            this.translateRolesInTable(); 

        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (tableContainer) {
                tableContainer.style.opacity = '1';
                tableContainer.style.pointerEvents = 'auto';
            }
        }
    }

    editSelectedUser() {
        if (this.selectedUserIds.size !== 1) return;
        const id = Array.from(this.selectedUserIds)[0];
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/edit-user?id=${id}`);
        else window.location.href = `${this.basePath}/admin/edit-user?id=${id}`;
    }

    editSelectedUserRole() {
        if (this.selectedUserIds.size !== 1) return;
        const id = Array.from(this.selectedUserIds)[0];
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/edit-user-role?id=${id}`);
        else window.location.href = `${this.basePath}/admin/edit-user-role?id=${id}`;
    }

    editSelectedUserStatus() {
        if (this.selectedUserIds.size !== 1) return;
        const id = Array.from(this.selectedUserIds)[0];
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/edit-status?id=${id}`);
        else window.location.href = `${this.basePath}/admin/edit-status?id=${id}`;
    }

    viewSelectedUserHistory() {
        if (this.selectedUserIds.size !== 1) return;
        const id = Array.from(this.selectedUserIds)[0];
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/user-history?id=${id}`);
        else window.location.href = `${this.basePath}/admin/user-history?id=${id}`;
    }

    async deleteSelectedUsers(btn) {
        if (this.selectedUserIds.size === 0) return;

        const resultDialog = await window.dialogSystem.show('verifyPasswordDialog', {
            title: "Verificación de Seguridad para Borrado",
            desc: `Ingresa tu contraseña para autorizar la destrucción de ${this.selectedUserIds.size} usuario(s). Esta acción es irreversible.`,
            confirmText: "Destruir Usuarios"
        });

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['dialog_verify_password'] ? resultDialog.data['dialog_verify_password'].trim() : '';
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
                showMessage(`Se eliminaron ${result.deleted_count} usuario(s). Se omitieron ${result.failed_count} por falta de permisos.`, 'warning');
            } else {
                showMessage(`Se han eliminado ${result.deleted_count} usuario(s) exitosamente.`, 'success');
            }
            
            this.selectedUserIds.clear();

            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/manage-users`, { forceReload: true });
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
                    if (btn) btn.classList.add('disabled-interactive');
                });
            } else {
                [btnEditAccount, btnEditRole, btnEditStatus, btnHistory].forEach(btn => {
                    if (btn) btn.classList.remove('disabled-interactive');
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

    applyAllFilters() {
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

        const container = document.querySelector(`[data-ref="view-table"]`);
        if (!container) return;

        let visibleCount = 0;
        let lastVisibleItem = null;
        const items = container.querySelectorAll('[data-action="selectUser"]');
        
        items.forEach(item => {
            item.classList.remove('last-visible-row');
            
            const itemRolesStr = item.getAttribute('data-roles-ids') || '';
            const itemRoleIds = itemRolesStr.split(',').map(id => id.trim());
            const itemStatus = item.getAttribute('data-status');
            
            const textContent = Array.from(item.querySelectorAll('.search-target'))
                .map(el => el.textContent.toLowerCase())
                .join(' ');
            
            const matchesSearch = textContent.includes(query);
            
            const matchesRole = itemRoleIds.some(id => checkedRoles.includes(id));
            const matchesStatus = checkedStatuses.includes(itemStatus);

            if (matchesSearch && matchesRole && matchesStatus) {
                item.classList.remove('disabled');
                visibleCount++;
                lastVisibleItem = item;
            } else {
                item.classList.add('disabled');
            }
        });

        if (lastVisibleItem) lastVisibleItem.classList.add('last-visible-row');

        const emptyElement = document.querySelector(`[data-ref="empty-search-table"]`);
        if (emptyElement) {
            if (visibleCount === 0 && items.length > 0) emptyElement.classList.remove('disabled');
            else emptyElement.classList.add('disabled');
        }
    }
}

export { AdminUsersController };