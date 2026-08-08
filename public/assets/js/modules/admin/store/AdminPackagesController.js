import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';



class AdminPackagesController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 
        this.selectedPackageId = null;
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
        document.removeEventListener('click', this.handlePaginationClickBound, true);
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('input', this.handleGlobalInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.selectedPackageId = null;
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/store-packages') && !e.detail.url.includes('/admin/store-package-')) {
            this.initializeFiltersFromURL();
        }
    }

    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchInput = document.querySelector('[data-ref="package-search-input"]');
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
        const tableContainer = document.querySelector('[data-ref="packages-table-wrapper"]');
        const emptyState = document.querySelector('[data-ref="packages-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        
        const containerToDisable = tableContainer || emptyState;
        if (containerToDisable) {
            containerToDisable.classList.add('disabled-interaction');
        }

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : null });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="managePackagesView"]');
            const newContent = doc.querySelector('[data-ref="managePackagesView"]');

            if (viewContent && newContent) {
                const bottomContainer = viewContent.querySelector('.component-bottom');
                const newBottomContainer = newContent.querySelector('.component-bottom');
                if (bottomContainer && newBottomContainer) {
                    bottomContainer.innerHTML = newBottomContainer.innerHTML;
                }

                currentPaginations.forEach(container => {
                    const selector = `[data-ref="${container.getAttribute('data-ref')}"]`;
                    const newPagination = newContent.querySelector(selector) || doc.querySelector(selector);
                    if (newPagination) {
                        container.innerHTML = newPagination.innerHTML;
                        container.className = newPagination.className;
                        container.setAttribute('data-tooltip', newPagination.getAttribute('data-tooltip') || '');
                    }
                });

                if (window.spaRouter) {
                    const relativeUrl = url.replace(window.location.origin, '');
                    window.spaRouter.updateHistory(relativeUrl);
                } else {
                    window.history.pushState({}, '', url);
                }

                this.initializeFiltersFromURL();
            } else {
                throw new Error("Main container was not found in the response.");
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Pagination error:', error);
                showMessage(window.__('err_load_canvases'), 'error');
            }
        } finally {
            if (containerToDisable) {
                containerToDisable.classList.remove('disabled-interaction');
            }
        }
    }

    handleGlobalClick(e) {
        const target = e.target;
        const actionBtn = target.closest('[data-action]');
        
        if (actionBtn) {
            const action = actionBtn.getAttribute('data-action');
            if (typeof this[action] === 'function') {
                e.preventDefault();
                this[action](actionBtn, e);
                return;
            }
        }

        const tr = target.closest('tr.clickable');
        if (tr && tr.hasAttribute('data-package-id')) {
            e.preventDefault();
            const pkgId = tr.getAttribute('data-package-id');
            
            if (this.selectedPackageId === pkgId) {
                this.deselectAll();
            } else {
                const pkgName = tr.getAttribute('data-package-name');
                this.selectPackage(pkgId, pkgName, tr);
            }
            return;
        }

        const tableBody = document.querySelector('[data-ref="packages-table-body"]');
        if (tableBody && !tableBody.contains(target) && !target.closest('.component-top-right')) {
            this.deselectAll();
        }
    }

    handleGlobalInput(e) {
        const target = e.target;
        if (target.matches('[data-ref="package-search-input"]')) {
            this.handleSearchInput(target.value);
        }
    }

    handleSearchInput(value) {
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }

        const currentUrl = new URL(window.location.href);
        const currentSearch = currentUrl.searchParams.get('q') || '';
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');

        if (value.trim() === currentSearch.trim()) {
            if (value.trim() !== '') {
                if (searchBtn) searchBtn.classList.add('has-active-filter');
            } else {
                if (searchBtn) searchBtn.classList.remove('has-active-filter');
            }
            return;
        }

        this.filterTimeout = setTimeout(() => {
            this.applyFilters(value);
        }, 500);
    }

    applyFilters(searchQuery = '') {
        const urlParams = new URLSearchParams();
        if (searchQuery.trim() !== '') {
            urlParams.set('q', searchQuery.trim());
        }
        
        const url = `${this.basePath}/admin/store-packages?${urlParams.toString()}`;
        this.handlePagination(url);
    }

    searchPackage(btn) {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="package-search-input"]');
        
        if (searchToolbar.classList.contains('disabled')) {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
            if (searchInput) searchInput.focus();
        } else {
            searchToolbar.classList.add('disabled');
            searchToolbar.classList.remove('active');
            if (searchInput && searchInput.value.trim() !== '') {
                searchInput.value = '';
                this.applyFilters('');
            }
        }
        this.updateFilterButtonsState();
    }

    updateFilterButtonsState() {
        const searchInput = document.querySelector('[data-ref="package-search-input"]');
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');

        if (searchInput && searchBtn) {
            if (searchInput.value.trim() !== '') {
                searchBtn.classList.add('has-active-filter');
            } else {
                searchBtn.classList.remove('has-active-filter');
            }
        }
    }

    selectPackage(id, name, trElement) {
        this.deselectAll();
        this.selectedPackageId = id;
        trElement.classList.add('selected');
        const selectionActions = document.querySelector('[data-ref="package-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');
        
        if (selectionActions && defaultActions) {
            selectionActions.classList.remove('disabled');
            selectionActions.classList.add('active');
            defaultActions.classList.remove('active');
            defaultActions.classList.add('disabled');
        }
    }

    deselectAll() {
        this.selectedPackageId = null;
        document.querySelectorAll('[data-ref="packages-table-body"] tr.selected').forEach(tr => {
            tr.classList.remove('selected');
        });
        
        const selectionActions = document.querySelector('[data-ref="package-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');
        
        if (selectionActions && defaultActions) {
            selectionActions.classList.remove('active');
            selectionActions.classList.add('disabled');
            defaultActions.classList.remove('disabled');
            defaultActions.classList.add('active');
        }
    }

    addPackage() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/store-package-create`);
        } else {
            window.location.href = `${this.basePath}/admin/store-package-create`;
        }
    }

    editPackage(btn) {
        if (!this.selectedPackageId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/store-package-edit/${this.selectedPackageId}`);
        } else {
            window.location.href = `${this.basePath}/admin/store-package-edit/${this.selectedPackageId}`;
        }
    }

    async toggleVisibilityPackage(btn) {
        if (!this.selectedPackageId) return;
        setButtonLoading(btn);
        try {
            const data = await this.api.post(ApiRoutes.Admin.ToggleStorePackage, { uuid: this.selectedPackageId }, this.abortController?.signal);
            if (data.success) {
                showMessage(data.message, 'success');
                this.handlePagination(window.location.href);
            } else {
                showMessage(data.message || window.__('err_update_canvas'), 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_connection') + ': ' + error.message, 'error');
            }
        } finally {
            restoreButton(btn);
        }
    }

    async deletePackage(btn) {
        if (!this.selectedPackageId) return;
        const confirmRes = await window.modalSystem.show('confirmActionModal', { title: window.__('delete_canvas'), message: window.__('msg_confirm_delete_package') }); if (!confirmRes || !confirmRes.confirmed) return;
        
        setButtonLoading(btn);
        try {
            const data = await this.api.post(ApiRoutes.Admin.DeleteStorePackage, { uuid: this.selectedPackageId }, this.abortController?.signal);
            if (data.success) {
                showMessage(data.message, 'success');
                this.handlePagination(window.location.href);
            } else {
                showMessage(data.message || window.__('err_delete'), 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_connection') + ': ' + error.message, 'error');
            }
        } finally {
            restoreButton(btn);
        }
    }
}

export { AdminPackagesController };
