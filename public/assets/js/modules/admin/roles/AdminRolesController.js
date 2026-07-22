import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';
const _t = (key, fallback) => {
    if (typeof window.__ === 'function') {
        const trans = window.__(key);
        if (trans && trans !== key) return trans;
    }
    return fallback;
};
class AdminRolesController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 
        this.selectedRoleId = null;
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleGlobalInputBound = this.handleGlobalInput.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.filterTimeout = null;
    }
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
    }
    destroy() {
        if (!this.isInitialized) return;
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('input', this.handleGlobalInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.selectedRoleId = null;
        this.isInitialized = false;
    }
    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }
    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/roles') && !e.detail.url.includes('/admin/role-')) {
            this.initializeFiltersFromURL();
        }
    }
    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchInput = document.querySelector('[data-ref="role-search-input"]');
        if (searchInput) searchInput.value = urlParams.get('q') || '';
        
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && searchInput && searchInput.value !== '') {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
        }

        this.updateFilterButtonsState();
        this.deselectAll();
    }
    handlePaginationClick(e) {
        const target = e.target.closest('a[href], button[data-nav]');
        if (!target) return;
        const url = target.getAttribute('href') || target.getAttribute('data-nav') || '';
        const isPaginationLink = url.includes('page=') || target.closest('[class*="pagin"]') || target.closest('[data-ref="pagination-container"]');
        
        if (isPaginationLink && url !== '#' && !url.includes('javascript:')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.handlePagination(url);
        }
    }
    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="roles-table-wrapper"]');
        const emptyState = document.querySelector('[data-ref="roles-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        
        const containerToDisable = tableContainer || emptyState;
        if (containerToDisable) {
            containerToDisable.classList.add('disabled-interaction');
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

            const viewContent = document.querySelector('[data-ref="manageRolesView"]');
            const newContent = doc.querySelector('[data-ref="manageRolesView"]');

            if (viewContent && newContent) {
                const bottomContainer = viewContent.querySelector('.component-bottom');
                const newBottomContainer = newContent.querySelector('.component-bottom');
                if (bottomContainer && newBottomContainer) {
                    bottomContainer.innerHTML = newBottomContainer.innerHTML;
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
            }
            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            this.updateFilterButtonsState();
            this.deselectAll();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (containerToDisable) {
                containerToDisable.classList.remove('disabled-interaction');
            }
        }
    }
    handleGlobalClick(e) {
        const selectTarget = e.target.closest('[data-action="selectRoleRow"]');
        const searchBtn = e.target.closest('[data-action="searchRole"]');
        const addBtn = e.target.closest('[data-action="addRole"]');
        const editBtn = e.target.closest('[data-action="editRole"]');
        const permsBtn = e.target.closest('[data-action="editPermissions"]');
        const deleteBtn = e.target.closest('[data-action="deleteRole"]');
        if (selectTarget) this.handleRowSelection(selectTarget);
        if (searchBtn) this.toggleSearchToolbar();
        if (addBtn) this.navigateToAddRole();
        if (editBtn) this.navigateToEditRole();
        if (permsBtn) this.navigateToEditPermissions();
        if (deleteBtn) this.openDeleteRoleDialog();
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
    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="role-search-input"]');
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
        const queryInput = document.querySelector('[data-ref="role-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }
    }
    
    applyAllFilters() {
        if (this.filterTimeout) clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.executeServerFilters();
        }, 400);
    }
    
    executeServerFilters() {
        const queryInput = document.querySelector('[data-ref="role-search-input"]');
        const query = (queryInput ? queryInput.value : '').trim();
        
        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        
        if (query) {
            urlParams.set('q', query);
        } else {
            urlParams.delete('q');
        }

        const url = `${this.basePath}/admin/roles?${urlParams.toString()}`;
        this.handlePagination(url);
    }
    navigateToAddRole() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/role-create`);
        } else {
            window.location.href = `${this.basePath}/admin/role-create`;
        }
    }
    navigateToEditRole() {
        if (!this.selectedRoleId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/role-edit/${this.selectedRoleId}`);
        } else {
            window.location.href = `${this.basePath}/admin/role-edit/${this.selectedRoleId}`;
        }
    }
    navigateToEditPermissions() {
        if (!this.selectedRoleId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/role-permissions/${this.selectedRoleId}`);
        } else {
            window.location.href = `${this.basePath}/admin/role-permissions/${this.selectedRoleId}`;
        }
    }
    handleRowSelection(target) {
        const roleId = parseInt(target.getAttribute('data-role-id'), 10);
        if (this.selectedRoleId === roleId) {
            this.deselectAll();
            return;
        }
        this.selectedRoleId = roleId;
        document.querySelectorAll('[data-action="selectRoleRow"]').forEach(row => {
            if(row.getAttribute('data-role-id') == roleId) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="role-selection-actions"]');
        if (defaultMode && selectionMode) {
            defaultMode.classList.replace('active', 'disabled');
            selectionMode.classList.replace('disabled', 'active');
        }
        const isSystem = parseInt(target.getAttribute('data-is-system') || 0, 10) === 1;
        const roleWeight = parseInt(target.getAttribute('data-role-weight') || 0, 10);
        const view = document.querySelector('[data-ref="manageRolesView"]');
        const currentUserWeight = parseInt(view ? view.getAttribute('data-current-user-weight') : 0, 10);
        const deleteBtn = document.querySelector('[data-action="deleteRole"]');
        const editBtn = document.querySelector('[data-action="editRole"]');
        const permsBtn = document.querySelector('[data-action="editPermissions"]');
        if (deleteBtn) { deleteBtn.classList.remove('disabled-interaction');  deleteBtn.removeAttribute('title'); }
        if (editBtn) { editBtn.classList.remove('disabled-interaction');  editBtn.removeAttribute('title'); }
        if (permsBtn) { permsBtn.classList.remove('disabled-interaction');  permsBtn.removeAttribute('title'); }
        if (currentUserWeight < 100 && roleWeight >= currentUserWeight) {
            if (deleteBtn) {
                deleteBtn.classList.add('disabled-interaction'); 
                deleteBtn.setAttribute('title', _t());
            }
            if (editBtn) {
                editBtn.classList.add('disabled-interaction'); 
                editBtn.setAttribute('title', _t());
            }
            if (permsBtn) {
                permsBtn.classList.add('disabled-interaction'); 
                permsBtn.setAttribute('title', _t());
            }
            return; 
        }
        if (isSystem) {
            if (deleteBtn) {
                deleteBtn.classList.add('disabled-interaction');
                deleteBtn.setAttribute('title', _t());
            }
            if (editBtn) {
                editBtn.setAttribute('title', _t());
            }
        }
    }
    deselectAll() {
        this.selectedRoleId = null;
        document.querySelectorAll('[data-action="selectRoleRow"]').forEach(row => row.classList.remove('selected'));
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="role-selection-actions"]');
        if (defaultMode && selectionMode) {
            selectionMode.classList.replace('active', 'disabled');
            defaultMode.classList.replace('disabled', 'active');
        }
    }
    async openDeleteRoleDialog() {
        if (!this.selectedRoleId || !window.dialogSystem) return;
        const roleId = parseInt(this.selectedRoleId, 10);
        const selectedRow = document.querySelector(`[data-action="selectRoleRow"][data-role-id="${roleId}"]`);
        if (selectedRow && parseInt(selectedRow.getAttribute('data-is-system'), 10) === 1) {
            showMessage(_t(), 'error');
            return; 
        }
        const roleName = selectedRow ? selectedRow.getAttribute('data-role-name') : _t();
        const response = await window.dialogSystem.show('confirmDeleteRole', { roleName: roleName });
        if (response.confirmed) {
            await this.executeApiAction(ApiRoutes.Admin.DeleteRole, { id: roleId });
        }
    }
    async executeApiAction(apiRoute, payload) {
        const res = await this.api.post(apiRoute, payload, this.abortController.signal);
        if (res.aborted) return;
        if (res.success) {
            showMessage(_t(), 'success');
            if (window.spaRouter) {
                window.spaRouter.navigate(window.location.pathname + window.location.search);
            } else {
                window.location.reload();
            }
        } else {
            showMessage(_t() + res.message_key, 'error');
        }
    }
}
export { AdminRolesController };