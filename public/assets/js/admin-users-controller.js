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
            
            if (searchBtn) this.toggleSearchToolbar();
            if (toggleFiltersBtn) this.toggleFiltersModule();
            if (viewBtn) this.toggleViewMode(viewBtn);

            if (selectTarget && !e.target.closest('button') && !e.target.closest('.component-dropdown-wrapper')) {
                this.handleUserSelection(selectTarget);
            }

            if (deselectBtn) this.deselectUser();

            // Clic fuera para cerrar el módulo de filtros
            const filtersModule = document.getElementById('moduleUserFilters');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                if (!e.target.closest('#moduleUserFilters') && !e.target.closest('[data-action="toggleUserFilters"]')) {
                    filtersModule.classList.add('disabled');
                }
            }
        });

        // Eventos para filtros (Buscar y Selects)
        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'user-search-input') this.applyAllFilters();
        });

        document.addEventListener('change', (e) => {
            if (e.target && (e.target.id === 'filter-role' || e.target.id === 'filter-status')) {
                this.applyAllFilters();
            }
        });

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/manage-users')) {
                const searchInput = document.getElementById('user-search-input');
                const roleSelect = document.getElementById('filter-role');
                const statusSelect = document.getElementById('filter-status');
                
                if (searchInput) searchInput.value = '';
                if (roleSelect) roleSelect.value = 'all';
                if (statusSelect) statusSelect.value = 'all';
                
                this.applyAllFilters();
                this.deselectUser(); 
            }
        });
    }

    toggleFiltersModule() {
        const filtersModule = document.getElementById('moduleUserFilters');
        if (filtersModule) {
            filtersModule.classList.toggle('disabled');
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
        const roleSelect = document.getElementById('filter-role');
        const statusSelect = document.getElementById('filter-status');
        
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        const role = roleSelect ? roleSelect.value : 'all';
        const status = statusSelect ? statusSelect.value : 'all';

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
                const matchesRole = (role === 'all' || itemRole === role);
                const matchesStatus = (status === 'all' || itemStatus === status);

                if (matchesSearch && matchesRole && matchesStatus) {
                    item.style.display = '';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            const emptyElement = document.getElementById(emptyId);
            if (emptyElement) {
                // Como es una tabla usamos table-row, para cards usamos block
                const displayType = emptyId === 'empty-search-table' ? 'table-row' : 'block';
                emptyElement.style.display = (visibleCount === 0 && items.length > 0) ? displayType : 'none';
            }
        };

        processContainer('view-cards', 'empty-search-cards');
        processContainer('view-table', 'empty-search-table');
    }
}