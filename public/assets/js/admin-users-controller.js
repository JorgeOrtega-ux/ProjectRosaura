// public/assets/js/admin-users-controller.js

export class AdminUsersController {
    constructor() {
        this.selectedUserId = null; 
        this.init();
    }

    init() {
        this.bindEvents();
        console.log("AdminUsersController inicializado.");
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const searchBtn = e.target.closest('[data-action="searchUser"]');
            const toggleFiltersBtn = e.target.closest('[data-action="toggleUserFilters"]');
            const viewBtn = e.target.closest('[data-action="toggleViewMode"]');
            const selectTarget = e.target.closest('[data-action="selectUser"]');
            const deselectBtn = e.target.closest('[data-action="deselectUser"]');
            const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
            const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
            
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

            // Clic fuera para cerrar el módulo de filtros
            const filtersModule = document.getElementById('moduleUserFilters');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                if (!e.target.closest('#moduleUserFilters') && !e.target.closest('[data-action="toggleUserFilters"]')) {
                    filtersModule.classList.add('disabled');
                    this.backToMainFilters(); // Resetear el estado para la próxima vez
                }
            }
        });

        // Eventos para filtros (Buscar y Checkboxes)
        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'user-search-input') this.applyAllFilters();
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('filter-checkbox')) {
                this.applyAllFilters();
            }
        });

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/manage-users')) {
                const searchInput = document.getElementById('user-search-input');
                if (searchInput) searchInput.value = '';
                
                document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = true);
                
                this.backToMainFilters();
                this.applyAllFilters();
                this.deselectUser(); 
            }
        });
    }

    openFilterSubMenu(btn) {
        const targetId = btn.getAttribute('data-target');
        const targetMenu = document.getElementById(targetId);
        const mainFilters = document.getElementById('menuMainFilters');
        
        if (targetMenu && mainFilters) {
            mainFilters.classList.add('disabled');
            mainFilters.classList.remove('active');
            
            targetMenu.classList.remove('disabled');
            targetMenu.classList.add('active');
        }
    }

    backToMainFilters() {
        const mainFilters = document.getElementById('menuMainFilters');
        const subMenus = document.querySelectorAll('#moduleUserFilters .component-menu:not(#menuMainFilters)');
        
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
        const filtersModule = document.getElementById('moduleUserFilters');
        if (filtersModule) {
            filtersModule.classList.toggle('disabled');
            if (!filtersModule.classList.contains('disabled')) {
                this.backToMainFilters(); // Asegurar que abra en el menú principal
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

        const defaultMode = document.getElementById('toolbar-default-mode');
        const selectionMode = document.getElementById('toolbar-selection-mode');
        const secondaryToolbar = document.getElementById('secondary-toolbar');

        if (defaultMode && selectionMode) {
            defaultMode.classList.replace('active', 'disabled');
            selectionMode.classList.replace('disabled', 'active');
        }

        if (secondaryToolbar && secondaryToolbar.classList.contains('active')) {
            secondaryToolbar.classList.remove('active');
        }
        
        const filtersModule = document.getElementById('moduleUserFilters');
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            filtersModule.classList.add('disabled');
        }
    }

    deselectUser() {
        this.selectedUserId = null;

        document.querySelectorAll('[data-action="selectUser"]').forEach(el => {
            el.classList.remove('selected');
        });

        const defaultMode = document.getElementById('toolbar-default-mode');
        const selectionMode = document.getElementById('toolbar-selection-mode');

        if (defaultMode && selectionMode) {
            selectionMode.classList.replace('active', 'disabled');
            defaultMode.classList.replace('disabled', 'active');
        }
    }

    toggleSearchToolbar() {
        const secondaryToolbar = document.getElementById('secondary-toolbar');
        const searchInput = document.getElementById('user-search-input');
        const filtersModule = document.getElementById('moduleUserFilters');
        
        // Cerrar módulo de filtros al abrir el buscador para que no choquen visualmente
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            filtersModule.classList.add('disabled');
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
        const wrapper = document.getElementById('manage-users-wrapper');
        const header = document.getElementById('manage-users-header');
        const viewCards = document.getElementById('view-cards');
        const viewTable = document.getElementById('view-table');
        const dynamicTitle = document.getElementById('toolbar-dynamic-title');
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
        const queryInput = document.getElementById('user-search-input');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        
        const roleCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="role"]'));
        const statusCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="status"]'));
        
        const checkedRoles = roleCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedStatuses = statusCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        // --- ACTUALIZAR INDICADORES DE ESTADO ACTIVO EN TOOLBAR ---
        const searchBtn = document.getElementById('btn-toggle-search');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }

        const filtersBtn = document.getElementById('btn-toggle-filters');
        if (filtersBtn) {
            // Si hay algun checkbox desmarcado, significa que hay un filtro activo limitando resultados
            const hasRoleFilter = checkedRoles.length < roleCheckboxes.length;
            const hasStatusFilter = checkedStatuses.length < statusCheckboxes.length;
            if (hasRoleFilter || hasStatusFilter) {
                filtersBtn.classList.add('has-active-filter');
            } else {
                filtersBtn.classList.remove('has-active-filter');
            }
        }
        // ------------------------------------------------------------

        const processContainer = (containerId, emptyId) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            let visibleCount = 0;
            const items = container.querySelectorAll('.user-card-item');
            
            items.forEach(item => {
                const itemRole = item.getAttribute('data-role');
                const itemStatus = item.getAttribute('data-status');
                
                const textContent = Array.from(item.querySelectorAll('.search-target'))
                    .map(el => el.textContent.toLowerCase())
                    .join(' ');
                
                const matchesSearch = textContent.includes(query);
                const matchesRole = checkedRoles.includes(itemRole);
                const matchesStatus = checkedStatuses.includes(itemStatus);

                if (matchesSearch && matchesRole && matchesStatus) {
                    item.style.display = '';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            const emptyElement = document.getElementById(emptyId);
            if (emptyElement) {
                const displayType = emptyId === 'empty-search-table' ? 'table-row' : 'block';
                emptyElement.style.display = (visibleCount === 0 && items.length > 0) ? displayType : 'none';
            }
        };

        processContainer('view-cards', 'empty-search-cards');
        processContainer('view-table', 'empty-search-table');
    }
}