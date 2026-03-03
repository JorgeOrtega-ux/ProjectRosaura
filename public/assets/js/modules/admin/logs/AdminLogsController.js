// public/assets/js/modules/admin/logs/AdminLogsController.js
import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminLogsController {
    constructor() {
        this.selectedLogs = new Set();
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/logs') || window.location.pathname.includes('viewer')) return;

            const searchBtn = e.target.closest('[data-action="searchLog"]');
            const toggleFiltersBtn = e.target.closest('[data-action="toggleLogFilters"]');
            const viewBtn = e.target.closest('[data-action="toggleViewMode"]');
            const selectTarget = e.target.closest('[data-action="selectLog"]');
            const deselectBtn = e.target.closest('[data-action="deselectLog"]');
            const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
            const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
            
            const viewLogsBtn = e.target.closest('[data-action="viewSelectedLogs"]');
            const deleteLogsBtn = e.target.closest('[data-action="deleteSelectedLogs"]');
            const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
            
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
                this.handleLogSelection(selectTarget);
            }

            if (deselectBtn) this.deselectLogs();
            if (viewLogsBtn) this.viewSelectedLogs();
            if (deleteLogsBtn) this.deleteSelectedLogs();

            if (togglePassBtn) {
                const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
                if (inputField && inputField.id === 'log_action_password') {
                    if (inputField.type === 'password') {
                        inputField.type = 'text';
                        togglePassBtn.textContent = 'visibility';
                    } else {
                        inputField.type = 'password';
                        togglePassBtn.textContent = 'visibility_off';
                    }
                }
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target && e.target.getAttribute('data-ref') === 'log-search-input') {
                this.applyAllFilters();
            }
        });

        document.addEventListener('change', (e) => {
            if (!window.location.pathname.includes('/admin/logs')) return;
            if (e.target && e.target.classList.contains('filter-checkbox')) {
                this.applyAllFilters();
            }
        });

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/logs') && !e.detail.url.includes('viewer')) {
                const searchInput = document.querySelector('[data-ref="log-search-input"]');
                if (searchInput) searchInput.value = '';
                
                document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = true);
                
                this.backToMainFilters();
                this.applyAllFilters();
                this.deselectLogs(); 
            }
        });
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
        const subMenus = document.querySelectorAll('[data-module="moduleLogFilters"] .component-menu:not([data-ref="menuMainFilters"])');
        
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
            window.appInstance.toggleModule('moduleLogFilters');
            const filtersModule = document.querySelector('[data-module="moduleLogFilters"]');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                this.backToMainFilters(); 
            }
        }
    }

    handleLogSelection(target) {
        const logId = target.getAttribute('data-log-id');
        
        if (this.selectedLogs.has(logId)) {
            this.selectedLogs.delete(logId);
        } else {
            this.selectedLogs.add(logId);
        }

        this.updateSelectionUI();
    }

    deselectLogs() {
        this.selectedLogs.clear();
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        document.querySelectorAll('[data-action="selectLog"]').forEach(el => {
            const id = el.getAttribute('data-log-id');
            if (this.selectedLogs.has(id)) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });

        const defaultMode = document.querySelector('[data-ref="toolbar-default-mode"]');
        const selectionMode = document.querySelector('[data-ref="toolbar-selection-mode"]');
        const countBadge = document.getElementById('logs-selection-count');
        const passInput = document.getElementById('log_action_password');

        if (this.selectedLogs.size > 0) {
            if (defaultMode && selectionMode) {
                defaultMode.classList.replace('active', 'disabled');
                selectionMode.classList.replace('disabled', 'active');
            }
            if (countBadge) countBadge.textContent = `${this.selectedLogs.size} seleccionado${this.selectedLogs.size > 1 ? 's' : ''}`;
        } else {
            if (defaultMode && selectionMode) {
                selectionMode.classList.replace('active', 'disabled');
                defaultMode.classList.replace('disabled', 'active');
            }
            if (passInput) passInput.value = '';
        }
    }

    toggleSearchToolbar() {
        const secondaryToolbar = document.querySelector('[data-ref="secondary-toolbar"]');
        const searchInput = document.querySelector('[data-ref="log-search-input"]');
        const filtersModule = document.querySelector('[data-module="moduleLogFilters"]');
        
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
        const wrapper = document.querySelector('[data-ref="manage-logs-wrapper"]');
        const header = document.querySelector('[data-ref="manage-logs-header"]');
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
        const queryInput = document.querySelector('[data-ref="log-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        
        const catCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="category"]'));
        const checkedCats = catCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }

        const filtersBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
        if (filtersBtn) {
            if (checkedCats.length < catCheckboxes.length) filtersBtn.classList.add('has-active-filter');
            else filtersBtn.classList.remove('has-active-filter');
        }

        const processContainer = (containerRef, emptyRef) => {
            const container = document.querySelector(`[data-ref="${containerRef}"]`);
            if (!container) return;

            let visibleCount = 0;
            const items = container.querySelectorAll('.log-card-item');
            
            items.forEach(item => {
                const itemCat = item.getAttribute('data-category');
                
                const textContent = Array.from(item.querySelectorAll('.search-target'))
                    .map(el => el.textContent.toLowerCase())
                    .join(' ');
                
                const matchesSearch = textContent.includes(query);
                const matchesCat = checkedCats.includes(itemCat);

                if (matchesSearch && matchesCat) {
                    item.classList.remove('disabled');
                    visibleCount++;
                } else {
                    item.classList.add('disabled');
                }
            });

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

    viewSelectedLogs() {
        if (this.selectedLogs.size === 0) return;
        
        if (this.selectedLogs.size > 10) {
            if (window.appInstance) window.appInstance.showToast('Solo puedes visualizar un máximo de 10 archivos a la vez.', 'warning');
            return;
        }

        const filesArray = Array.from(this.selectedLogs);
        const urlParams = new URLSearchParams();
        urlParams.set('files', filesArray.join(','));
        
        const url = `${this.basePath}/admin/logs/viewer?${urlParams.toString()}`;
        
        if (window.spaRouter) {
            window.spaRouter.navigate(url);
        } else {
            window.location.href = url;
        }
    }

    async deleteSelectedLogs() {
        if (this.selectedLogs.size === 0) return;
        
        const passInput = document.getElementById('log_action_password');
        const password = passInput ? passInput.value.trim() : '';

        if (!password) {
            if (window.appInstance) window.appInstance.showToast('Ingresa tu contraseña admin para autorizar la eliminación.', 'error');
            return;
        }

        if (confirm(`¿Estás seguro de que deseas eliminar ${this.selectedLogs.size} archivo(s) de log de forma permanente?`)) {
            const filesArray = Array.from(this.selectedLogs);
            const res = await this.api.post(ApiRoutes.Admin.DeleteLogs, { files: filesArray, password: password });
            
            if (res.success) {
                if (window.appInstance) window.appInstance.showToast(res.message, 'success');
                if (passInput) passInput.value = '';
                this.deselectLogs();
                if (window.spaRouter) window.spaRouter.loadRoute(this.basePath + '/admin/logs');
                else window.location.reload();
            } else {
                if (window.appInstance) window.appInstance.showToast(res.message, 'error');
            }
        }
    }
}