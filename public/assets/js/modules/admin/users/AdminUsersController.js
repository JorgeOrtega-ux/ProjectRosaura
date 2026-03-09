// public/assets/js/modules/admin/users/AdminUsersController.js

export class AdminUsersController {
    constructor() {
        this.selectedUserId = null; 
        this.basePath = window.AppBasePath || '';
        
        // 1. Bindear los manejadores de eventos al contexto de la clase
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    // 2. Método destroy para limpiar memoria cuando se cambia de ruta
    destroy() {
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
        document.removeEventListener('change', this.handleChangeBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    init() {
        this.bindEvents();
        console.log("AdminUsersController inicializado.");
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
        document.addEventListener('change', this.handleChangeBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    // 3. Funciones manejadoras extraídas
    handleClick(e) {
        const searchBtn = e.target.closest('[data-action="searchUser"]');
        const toggleFiltersBtn = e.target.closest('[data-action="toggleUserFilters"]');
        const viewBtn = e.target.closest('[data-action="toggleViewMode"]');
        const selectTarget = e.target.closest('[data-action="selectUser"]');
        const deselectBtn = e.target.closest('[data-action="deselectUser"]');
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
        
        const editUserBtn = e.target.closest('[data-action="editSelectedUser"]');
        const editRoleBtn = e.target.closest('[data-action="editSelectedUserRole"]');
        const editStatusBtn = e.target.closest('[data-action="editSelectedUserStatus"]');
        
        if (searchBtn) this.toggleSearchToolbar();
        if (toggleFiltersBtn) this.toggleFiltersModule();
        if (viewBtn) this.toggleViewMode(viewBtn);

        if (openSubMenuBtn) this.openFilterSubMenu(openSubMenuBtn);
        if (backToMainFiltersBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.backToMainFilters();
        }

        if (selectTarget && !e.target.closest('button') && !e.target.closest('.component-dropdown-wrapper')) {
            this.handleUserSelection(selectTarget);
        }

        if (deselectBtn) this.deselectUser();
        if (editUserBtn) this.editSelectedUser();
        if (editRoleBtn) this.editSelectedUserRole();
        if (editStatusBtn) this.editSelectedUserStatus();
    }

    handleInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'user-search-input') {
            this.applyAllFilters();
        }
    }

    handleChange(e) {
        if (e.target && e.target.classList.contains('filter-checkbox')) {
            this.applyAllFilters();
        }
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/manage-users')) {
            const searchInput = document.querySelector('[data-ref="user-search-input"]');
            if (searchInput) searchInput.value = '';
            
            document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = true);
            
            this.backToMainFilters();
            this.applyAllFilters();
            this.deselectUser(); 
        }
    }

    // 4. Lógica de negocio y ruteo
    editSelectedUser() {
        if (!this.selectedUserId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/edit-user?id=${this.selectedUserId}`);
        } else {
            window.location.href = `${this.basePath}/admin/edit-user?id=${this.selectedUserId}`;
        }
    }

    editSelectedUserRole() {
        if (!this.selectedUserId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/edit-role?id=${this.selectedUserId}`);
        } else {
            window.location.href = `${this.basePath}/admin/edit-role?id=${this.selectedUserId}`;
        }
    }

    editSelectedUserStatus() {
        if (!this.selectedUserId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/edit-status?id=${this.selectedUserId}`);
        } else {
            window.location.href = `${this.basePath}/admin/edit-status?id=${this.selectedUserId}`;
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

    handleUserSelection(target) {
        const userId = target.getAttribute('data-user-id');
        
        if (this.selectedUserId === userId) {
            this.deselectUser();
            return;
        }

        this.selectedUserId = userId;

        document.querySelectorAll('[data-action="selectUser"]').forEach(el => {
            el.classList.remove('selected');
        });

        document.querySelectorAll(`[data-action="selectUser"][data-user-id="${userId}"]`).forEach(el => {
            el.classList.add('selected');
        });

        const defaultMode = document.querySelector('[data-ref="toolbar-default-mode"]');
        const selectionMode = document.querySelector('[data-ref="toolbar-selection-mode"]');
        const secondaryToolbar = document.querySelector('[data-ref="secondary-toolbar"]');

        if (defaultMode && selectionMode) {
            defaultMode.classList.replace('active', 'disabled');
            selectionMode.classList.replace('disabled', 'active');
        }

        if (secondaryToolbar && secondaryToolbar.classList.contains('active')) {
            secondaryToolbar.classList.remove('active');
        }
        
        const filtersModule = document.querySelector('[data-module="moduleUserFilters"]');
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            if (window.appInstance) window.appInstance.closeModule(filtersModule);
        }
    }

    deselectUser() {
        this.selectedUserId = null;

        document.querySelectorAll('[data-action="selectUser"]').forEach(el => {
            el.classList.remove('selected');
        });

        const defaultMode = document.querySelector('[data-ref="toolbar-default-mode"]');
        const selectionMode = document.querySelector('[data-ref="toolbar-selection-mode"]');

        if (defaultMode && selectionMode) {
            selectionMode.classList.replace('active', 'disabled');
            defaultMode.classList.replace('disabled', 'active');
        }
    }

    toggleSearchToolbar() {
        const secondaryToolbar = document.querySelector('[data-ref="secondary-toolbar"]');
        const searchInput = document.querySelector('[data-ref="user-search-input"]');
        const filtersModule = document.querySelector('[data-module="moduleUserFilters"]');
        
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            if (window.appInstance) window.appInstance.closeModule(filtersModule);
        }

        if (secondaryToolbar) {
            secondaryToolbar.classList.toggle('active');
            
            if (secondaryToolbar.classList.contains('active')) {
                if (searchInput) setTimeout(() => searchInput.focus(), 50);
            } else {
                if (searchInput) {
                    searchInput.value = '';
                    this.applyAllFilters();
                }
            }
        }
    }

    toggleViewMode(btn) {
        const wrapper = document.querySelector('[data-ref="manage-users-wrapper"]');
        const header = document.querySelector('[data-ref="manage-users-header"]');
        const viewCards = document.querySelector('[data-ref="view-cards"]');
        const viewTable = document.querySelector('[data-ref="view-table"]');
        const dynamicTitle = document.querySelector('[data-ref="toolbar-dynamic-title"]');
        const iconElement = btn.querySelector('.material-symbols-rounded');

        if (!wrapper || !header || !viewCards || !viewTable) return;

        if (viewCards.classList.contains('active')) {
            viewCards.classList.replace('active', 'disabled');
            viewTable.classList.replace('disabled', 'active');
            
            header.classList.add('disabled');
            wrapper.classList.add('component-wrapper--full');
            if (dynamicTitle) dynamicTitle.classList.remove('disabled');
            
            if (iconElement) iconElement.textContent = 'grid_view';
        } else {
            viewTable.classList.replace('active', 'disabled');
            viewCards.classList.replace('disabled', 'active');
            
            header.classList.remove('disabled');
            wrapper.classList.remove('component-wrapper--full');
            if (dynamicTitle) dynamicTitle.classList.add('disabled');
            
            if (iconElement) iconElement.textContent = 'table_rows';
        }
    }

    applyAllFilters() {
        const queryInput = document.querySelector('[data-ref="user-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        
        const roleCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="role"]'));
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

        const processContainer = (containerRef, emptyRef) => {
            const container = document.querySelector(`[data-ref="${containerRef}"]`);
            if (!container) return;

            let visibleCount = 0;
            let lastVisibleItem = null;
            const items = container.querySelectorAll('.user-card-item');
            
            items.forEach(item => {
                item.classList.remove('last-visible-row');
                const itemRole = item.getAttribute('data-role');
                const itemStatus = item.getAttribute('data-status');
                
                const textContent = Array.from(item.querySelectorAll('.search-target'))
                    .map(el => el.textContent.toLowerCase())
                    .join(' ');
                
                const matchesSearch = textContent.includes(query);
                const matchesRole = checkedRoles.includes(itemRole);
                const matchesStatus = checkedStatuses.includes(itemStatus);

                if (matchesSearch && matchesRole && matchesStatus) {
                    item.classList.remove('disabled');
                    visibleCount++;
                    lastVisibleItem = item;
                } else {
                    item.classList.add('disabled');
                }
            });

            if (lastVisibleItem) {
                lastVisibleItem.classList.add('last-visible-row');
            }

            const emptyElement = document.querySelector(`[data-ref="${emptyRef}"]`);
            if (emptyElement) {
                if (visibleCount === 0 && items.length > 0) {
                    emptyElement.classList.remove('disabled');
                } else {
                    emptyElement.classList.add('disabled');
                }
            }
        };

        processContainer('view-cards', 'empty-search-cards');
        processContainer('view-table', 'empty-search-table');
    }
}