import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

const _t = (key, fallback) => {
    if (typeof window.__ === 'function') {
        const trans = window.__(key);
        if (trans && trans !== key) return trans;
    }
    return fallback;
};

class AdminPerksController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 
        this.selectedPerkId = null;
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
        this.selectedPerkId = null;
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/store-perks') && !e.detail.url.includes('/admin/store-perk-')) {
            this.initializeFiltersFromURL();
        }
    }

    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchInput = document.querySelector('[data-ref="perk-search-input"]');
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
        const tableContainer = document.querySelector('[data-ref="perks-table-wrapper"]');
        const emptyState = document.querySelector('[data-ref="perks-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        
        const containerToDisable = tableContainer || emptyState;
        if (containerToDisable) {
            containerToDisable.classList.add('disabled-interaction');
        }

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : null });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="managePerksView"]');
            const newContent = doc.querySelector('[data-ref="managePerksView"]');

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
                throw new Error("No se encontró el contenedor principal en la respuesta.");
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Pagination error:', error);
                showMessage('Error al cargar la página', 'error');
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
        if (tr && tr.hasAttribute('data-perk-id')) {
            e.preventDefault();
            const perkId = tr.getAttribute('data-perk-id');
            
            if (this.selectedPerkId === perkId) {
                this.deselectAll();
            } else {
                const perkName = tr.getAttribute('data-perk-name');
                this.selectPerk(perkId, perkName, tr);
            }
            return;
        }

        const tableBody = document.querySelector('[data-ref="perks-table-body"]');
        if (tableBody && !tableBody.contains(target) && !target.closest('.component-top-right')) {
            this.deselectAll();
        }
    }

    handleGlobalInput(e) {
        const target = e.target;
        if (target.matches('[data-ref="perk-search-input"]')) {
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
        
        const url = `${this.basePath}/admin/store-perks?${urlParams.toString()}`;
        this.handlePagination(url);
    }

    searchPerk(btn) {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="perk-search-input"]');
        
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
        const searchInput = document.querySelector('[data-ref="perk-search-input"]');
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');

        if (searchInput && searchBtn) {
            if (searchInput.value.trim() !== '') {
                searchBtn.classList.add('has-active-filter');
            } else {
                searchBtn.classList.remove('has-active-filter');
            }
        }
    }

    selectPerk(id, name, trElement) {
        this.deselectAll();
        this.selectedPerkId = id;
        trElement.classList.add('selected');
        const selectionActions = document.querySelector('[data-ref="perk-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');
        
        if (selectionActions && defaultActions) {
            selectionActions.classList.remove('disabled');
            selectionActions.classList.add('active');
            defaultActions.classList.remove('active');
            defaultActions.classList.add('disabled');
        }
    }

    deselectAll() {
        this.selectedPerkId = null;
        document.querySelectorAll('[data-ref="perks-table-body"] tr.selected').forEach(tr => {
            tr.classList.remove('selected');
        });
        
        const selectionActions = document.querySelector('[data-ref="perk-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');
        
        if (selectionActions && defaultActions) {
            selectionActions.classList.remove('active');
            selectionActions.classList.add('disabled');
            defaultActions.classList.remove('disabled');
            defaultActions.classList.add('active');
        }
    }

    addPerk() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/store-perk-create`);
        } else {
            window.location.href = `${this.basePath}/admin/store-perk-create`;
        }
    }

    editPerk(btn) {
        if (!this.selectedPerkId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/store-perk-edit/${this.selectedPerkId}`);
        } else {
            window.location.href = `${this.basePath}/admin/store-perk-edit/${this.selectedPerkId}`;
        }
    }

    async toggleVisibilityPerk(btn) {
        if (!this.selectedPerkId) return;
        setButtonLoading(btn);
        try {
            const data = await this.api.post(ApiRoutes.Admin.ToggleStorePerk, { uuid: this.selectedPerkId }, this.abortController?.signal);
            if (data.success) {
                showMessage(data.message, 'success');
                this.handlePagination(window.location.href);
            } else {
                showMessage(data.message || 'Error al actualizar', 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage('Error de conexión: ' + error.message, 'error');
            }
        } finally {
            restoreButton(btn);
        }
    }

    async deletePerk(btn) {
        if (!this.selectedPerkId) return;
        if (!confirm('¿Estás seguro de que deseas eliminar esta ventaja de forma permanente?')) return;
        
        setButtonLoading(btn);
        try {
            const data = await this.api.post(ApiRoutes.Admin.DeleteStorePerk, { uuid: this.selectedPerkId }, this.abortController?.signal);
            if (data.success) {
                showMessage(data.message, 'success');
                this.handlePagination(window.location.href);
            } else {
                showMessage(data.message || 'Error al eliminar', 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage('Error de conexión: ' + error.message, 'error');
            }
        } finally {
            restoreButton(btn);
        }
    }
}

export { AdminPerksController };
