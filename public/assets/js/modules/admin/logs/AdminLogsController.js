import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton, debounce, catchPaginationClick } from '../../../core/utils/uiUtils.js';
class AdminLogsController {
    constructor() {
        this.selectedLogs = new Set();
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = new AbortController();
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.filterTimeout = null;
        this.applyAllFilters = debounce(this.executeServerFilters.bind(this), 400);
    }
    init() {
        this.bindEvents();
        this.initializeFiltersFromURL();
    }
    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        document.removeEventListener('click', this.handlePaginationClickBound, true);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
        document.removeEventListener('change', this.handleChangeBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
    }
    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
        document.addEventListener('change', this.handleChangeBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }
    handlePaginationClick(e) {
        if (!window.location.pathname.includes('/admin/logs') || window.location.pathname.includes('viewer')) return;
        catchPaginationClick(e, url => this.handlePagination(url));
    }
    async handlePagination(url) {

        const tableContainer = document.querySelector('[data-ref="view-table"]');
        const cardsContainer = document.querySelector('[data-ref="view-cards"]'); 
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        if (tableContainer) {
            tableContainer.classList.add('disabled-interaction');
        }
        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController.signal });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newTable = doc.querySelector('[data-ref="view-table"]');
            if (newTable && tableContainer) {
                tableContainer.innerHTML = newTable.innerHTML;
            }
            const newCards = doc.querySelector('[data-ref="view-cards"]');
            if (newCards && cardsContainer) {
                cardsContainer.innerHTML = newCards.innerHTML;
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
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) {
                window.spaRouter.navigate(url);
            } else {
                window.location.href = url;
            }
        } finally {
            if (tableContainer) {
                tableContainer.classList.remove('disabled-interaction');
            }
        }
    }
    resetViewState() {
        this.deselectLogs();
    }
    handleClick(e) {
        if (!window.location.pathname.includes('/admin/logs') || window.location.pathname.includes('viewer')) return;
        const searchBtn = e.target.closest('[data-action="searchLog"]');
        const toggleFiltersBtn = e.target.closest('[data-action="toggleLogFilters"]');
        const viewBtn = e.target.closest('[data-action="toggleViewMode"]');
        const selectTarget = e.target.closest('[data-action="selectLog"]');
        const deselectBtn = e.target.closest('[data-action="deselectLog"]');
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
        const viewLogsBtn = e.target.closest('[data-action="viewSelectedLogs"]');
        const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
        if (searchBtn) this.toggleSearchToolbar();
        if (toggleFiltersBtn) this.toggleFiltersModule();
        if (viewBtn) this.toggleViewMode(viewBtn);
        if (openSubMenuBtn) this.openFilterSubMenu(openSubMenuBtn);
        if (backToMainFiltersBtn) {
            e.preventDefault();
            this.backToMainFilters();
        }
        if (selectTarget && !e.target.closest('button') && !e.target.closest('.component-dropdown-wrapper')) {
            this.handleLogSelection(selectTarget);
        }
        if (deselectBtn) this.deselectLogs();
        if (viewLogsBtn) this.viewSelectedLogs();
        if (togglePassBtn) {
            const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
            if (inputField && inputField.getAttribute('data-ref') === 'log_action_password') {
                if (inputField.type === 'password') {
                    inputField.type = 'text';
                    togglePassBtn.textContent = 'visibility';
                } else {
                    inputField.type = 'password';
                    togglePassBtn.textContent = 'visibility_off';
                }
            }
        }

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }
    handleInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'log-search-input') {
            this.applyAllFilters();
        }
    }
    handleChange(e) {
        if (!window.location.pathname.includes('/admin/logs')) return;
        if (e.target && e.target.classList.contains('filter-checkbox')) {
            this.applyAllFilters();
        }
    }
    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/logs') && !e.detail.url.includes('viewer')) {
            this.initializeFiltersFromURL();
        }
    }
    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const searchInput = document.querySelector('[data-ref="log-search-input"]');
        if (searchInput) searchInput.value = urlParams.get('q') || '';
        
        const catParam = urlParams.get('category');
        const catList = catParam ? catParam.split(',') : null;
        document.querySelectorAll('.filter-checkbox[data-filter-type="category"]').forEach(cb => {
            cb.checked = catList ? catList.includes(cb.value) : true;
        });

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && searchInput && searchInput.value !== '') {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
        }

        this.backToMainFilters();
        this.updateFilterButtonsState();
        this.deselectLogs();
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
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        const passInput = document.querySelector('[data-ref="log_action_password"]');
        if (this.selectedLogs.size > 0) {
            if (defaultMode && selectionMode) {
                defaultMode.classList.replace('active', 'disabled');
                selectionMode.classList.replace('disabled', 'active');
            }
        } else {
            if (defaultMode && selectionMode) {
                selectionMode.classList.replace('active', 'disabled');
                defaultMode.classList.replace('disabled', 'active');
            }
            if (passInput) passInput.value = '';
        }
    }
    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="log-search-input"]');
        const filtersModule = document.querySelector('[data-module="moduleLogFilters"]');
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
    toggleViewMode(btn) {
        const wrapper = document.querySelector('[data-ref="manage-logs-wrapper"]');
        const header = document.querySelector('[data-ref="manage-logs-header"]');
        const viewCards = document.querySelector('[data-ref="view-cards"]');
        const viewTable = document.querySelector('[data-ref="view-table"]');
        const dynamicTitle = document.querySelector('[data-ref="toolbar-dynamic-title"]');
        const iconElement = btn.querySelector('.material-symbols-rounded');
        if (!wrapper || !viewCards || !viewTable) return;
        if (viewCards.classList.contains('active')) {
            viewCards.classList.replace('active', 'disabled');
            viewTable.classList.replace('disabled', 'active');
            if(header) header.classList.add('disabled');
            wrapper.classList.add('component-wrapper--full');
            if (dynamicTitle) dynamicTitle.classList.remove('disabled');
            if (iconElement) iconElement.textContent = 'grid_view';
        } else {
            viewTable.classList.replace('active', 'disabled');
            viewCards.classList.replace('disabled', 'active');
            if(header) header.classList.remove('disabled');
            wrapper.classList.remove('component-wrapper--full');
            if (dynamicTitle) dynamicTitle.classList.add('disabled');
            if (iconElement) iconElement.textContent = 'table_rows';
        }
    }
    updateFilterButtonsState() {
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
    }


    executeServerFilters() {
        const queryInput = document.querySelector('[data-ref="log-search-input"]');
        const query = (queryInput ? queryInput.value : '').trim();
        const catCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="category"]'));
        const checkedCats = catCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        
        this.updateFilterButtonsState();
        
        const urlParams = new URLSearchParams();
        urlParams.set('page', '1');
        
        if (query) urlParams.set('q', query);
        
        if (checkedCats.length < catCheckboxes.length) {
            urlParams.set('category', checkedCats.join(','));
        }
        
        const url = `${this.basePath}/admin/logs?${urlParams.toString()}`;
        this.handlePagination(url);
    }
    viewSelectedLogs() {
        if (this.selectedLogs.size === 0) return;
        if (this.selectedLogs.size > 10) {
            showMessage(__('err_max_logs_view'), 'error');
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
}
export { AdminLogsController };