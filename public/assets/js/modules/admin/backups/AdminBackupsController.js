// public/assets/js/modules/admin/backups/AdminBackupsController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminBackupsController {
    constructor() {
        this.selectedBackupId = null; 
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';

        this.abortController = null;
        this.isInitialized = false; 

        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
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
        
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
        document.addEventListener('change', this.handleChangeBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handlePaginationClick(e) {
        if (!window.location.pathname.includes('/admin/backups') || 
            window.location.pathname.includes('/admin/backups/automation') || 
            window.location.pathname.includes('/admin/backups/create') ||
            window.location.pathname.includes('/admin/backups/restore')) return;

        const target = e.target.closest('a[href], button[data-nav]');
        if (!target) return;

        const url = target.getAttribute('href') || target.getAttribute('data-nav') || '';

        const isPaginationLink = 
            url.includes('page=') || 
            target.closest('[class*="pagin"]') || 
            target.closest('[data-ref="pagination-container"]') ||
            target.hasAttribute('data-action', 'paginate');

        if (isPaginationLink && url !== '#' && !url.includes('javascript:')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.handlePagination(url);
        }
    }

    async handleClick(e) {
        if (!window.location.pathname.includes('/admin/backups') || 
            window.location.pathname.includes('/admin/backups/automation') || 
            window.location.pathname.includes('/admin/backups/create') ||
            window.location.pathname.includes('/admin/backups/restore')) return;

        const searchBtn = e.target.closest('[data-action="searchBackup"]');
        const toggleFiltersBtn = e.target.closest('[data-action="toggleBackupFilters"]');
        const selectTarget = e.target.closest('[data-action="selectBackup"]');
        const deselectBtn = e.target.closest('[data-action="deselectBackup"]');
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
        
        const prepareRestoreBtn = e.target.closest('[data-action="prepareRestore"]');
        
        if (searchBtn) this.toggleSearchToolbar();
        if (toggleFiltersBtn) this.toggleFiltersModule();

        if (openSubMenuBtn) this.openFilterSubMenu(openSubMenuBtn);
        if (backToMainFiltersBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.backToMainFilters();
        }

        if (selectTarget && !e.target.closest('button') && !e.target.closest('.component-dropdown-wrapper')) {
            this.handleBackupSelection(selectTarget);
        }

        if (deselectBtn) this.deselectBackup();
        if (prepareRestoreBtn) this.prepareRestore(prepareRestoreBtn);

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    handleInput(e) {
        if (!window.location.pathname.includes('/admin/backups') || window.location.pathname.includes('/admin/backups/automation') || window.location.pathname.includes('/admin/backups/create') || window.location.pathname.includes('/admin/backups/restore')) return;
        if (e.target && e.target.getAttribute('data-ref') === 'backup-search-input') {
            this.applyAllFilters();
        }
    }

    handleChange(e) {
        if (!window.location.pathname.includes('/admin/backups') || window.location.pathname.includes('/admin/backups/automation') || window.location.pathname.includes('/admin/backups/create') || window.location.pathname.includes('/admin/backups/restore')) return;
        
        if (e.target && e.target.classList.contains('filter-checkbox')) {
            this.applyAllFilters();
        }
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/backups') && !e.detail.url.includes('/admin/backups/automation') && !e.detail.url.includes('/admin/backups/create') && !e.detail.url.includes('/admin/backups/restore')) {
            this.resetViewState();
        }
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
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'text/html'
                },
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

    resetViewState() {
        const searchInput = document.querySelector('[data-ref="backup-search-input"]');
        if (searchInput) searchInput.value = '';
        
        document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = true);
        
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar) {
            searchToolbar.classList.remove('active');
            searchToolbar.classList.add('disabled');
        }

        this.backToMainFilters();
        this.deselectBackup();
        this.applyAllFilters();
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
        const subMenus = document.querySelectorAll('[data-module="moduleBackupFilters"] .component-menu:not([data-ref="menuMainFilters"])');
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
            window.appInstance.toggleModule('moduleBackupFilters');
            const filtersModule = document.querySelector('[data-module="moduleBackupFilters"]');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                this.backToMainFilters(); 
            }
        }
    }

    handleBackupSelection(target) {
        const backupId = target.getAttribute('data-backup-id');
        if (this.selectedBackupId === backupId) {
            this.deselectBackup();
            return;
        }
        this.selectedBackupId = backupId;
        document.querySelectorAll('[data-action="selectBackup"]').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll(`[data-action="selectBackup"][data-backup-id="${backupId}"]`).forEach(el => el.classList.add('selected'));
        
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        
        if (defaultMode && selectionMode) {
            defaultMode.classList.replace('active', 'disabled');
            selectionMode.classList.replace('disabled', 'active');
        }
        
        const filtersModule = document.querySelector('[data-module="moduleBackupFilters"]');
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            if (window.appInstance) window.appInstance.closeModule(filtersModule);
        }
    }

    deselectBackup() {
        this.selectedBackupId = null;
        document.querySelectorAll('[data-action="selectBackup"]').forEach(el => el.classList.remove('selected'));
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        
        if (defaultMode && selectionMode) {
            selectionMode.classList.replace('active', 'disabled');
            defaultMode.classList.replace('disabled', 'active');
        }
    }

    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="backup-search-input"]');
        const filtersModule = document.querySelector('[data-module="moduleBackupFilters"]');
        
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
        const queryInput = document.querySelector('[data-ref="backup-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        const typeCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="type"]'));
        const statusCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="status"]'));
        const checkedTypes = typeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedStatuses = statusCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }

        const filtersBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
        if (filtersBtn) {
            const hasTypeFilter = checkedTypes.length < typeCheckboxes.length;
            const hasStatusFilter = checkedStatuses.length < statusCheckboxes.length;
            if (hasTypeFilter || hasStatusFilter) filtersBtn.classList.add('has-active-filter');
            else filtersBtn.classList.remove('has-active-filter');
        }

        const container = document.querySelector(`[data-ref="view-table"]`);
        if (!container) return;

        let visibleCount = 0;
        let lastVisibleItem = null;
        const items = container.querySelectorAll('[data-action="selectBackup"]');
        
        items.forEach(item => {
            item.classList.remove('last-visible-row');
            const itemType = item.getAttribute('data-type');
            const itemStatus = item.getAttribute('data-status');
            
            const textContent = Array.from(item.querySelectorAll('.search-target'))
                .map(el => el.textContent.toLowerCase()).join(' ');
            
            const matchesSearch = textContent.includes(query);
            const matchesType = checkedTypes.includes(itemType);
            const matchesStatus = checkedStatuses.includes(itemStatus);

            if (matchesSearch && matchesType && matchesStatus) {
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

    prepareRestore(btn) {
        if (!this.selectedBackupId) return;
        
        if (window.spaRouter) {
            window.spaRouter.navigate(this.basePath + '/admin/backups/restore?id=' + encodeURIComponent(this.selectedBackupId));
        } else {
            window.location.href = this.basePath + '/admin/backups/restore?id=' + encodeURIComponent(this.selectedBackupId);
        }
    }
}

export { AdminBackupsController };