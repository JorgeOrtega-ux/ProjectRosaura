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
class AdminSubscriptionsController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 
        this.selectedTierId = null;
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
        this.selectedTierId = null;
        this.isInitialized = false;
    }
    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }
    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/subscriptions') && !e.detail.url.includes('/admin/subscription-')) {
            this.initializeFiltersFromURL();
        }
    }
    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchInput = document.querySelector('[data-ref="tier-search-input"]');
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
        const tableContainer = document.querySelector('[data-ref="tiers-table-wrapper"]');
        const emptyState = document.querySelector('[data-ref="tiers-empty-state"]');
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

            const viewContent = document.querySelector('[data-ref="manageSubscriptionsView"]');
            const newContent = doc.querySelector('[data-ref="manageSubscriptionsView"]');

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
        const selectTarget = e.target.closest('[data-action="selectTierRow"]');
        const searchBtn = e.target.closest('[data-action="searchTier"]');
        const addBtn = e.target.closest('[data-action="addTier"]');
        const editBtn = e.target.closest('[data-action="editTier"]');
        const delBtn = e.target.closest('[data-action="deleteTier"]');
        
        const toggleVisBtn = e.target.closest('[data-action="toggleVisibilityTier"]');
        const setPopBtn = e.target.closest('[data-action="setPopularTier"]');
        
        if (selectTarget) this.handleRowSelection(selectTarget);
        if (searchBtn) this.toggleSearchToolbar();
        if (addBtn) this.navigateToAddTier();
        if (editBtn) this.navigateToEditTier();
        if (delBtn) this.deleteTier();
        if (toggleVisBtn) this.toggleVisibilityTier();
        if (setPopBtn) this.setPopularTier();
        
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }
    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'tier-search-input') {
            this.applyAllFilters();
        }
    }
    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="tier-search-input"]');
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
        const queryInput = document.querySelector('[data-ref="tier-search-input"]');
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
        const queryInput = document.querySelector('[data-ref="tier-search-input"]');
        const query = (queryInput ? queryInput.value : '').trim();
        
        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        
        if (query) {
            urlParams.set('q', query);
        } else {
            urlParams.delete('q');
        }

        const url = `${this.basePath}/admin/subscriptions?${urlParams.toString()}`;
        this.handlePagination(url);
    }
    navigateToAddTier() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/subscription-create`);
        } else {
            window.location.href = `${this.basePath}/admin/subscription-create`;
        }
    }
    navigateToEditTier() {
        if (!this.selectedTierId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/subscription-edit/${this.selectedTierId}`);
        } else {
            window.location.href = `${this.basePath}/admin/subscription-edit/${this.selectedTierId}`;
        }
    }
    handleRowSelection(target) {
        const tierId = target.getAttribute('data-tier-id'); // UUID
        if (this.selectedTierId === tierId) {
            this.deselectAll();
            return;
        }
        this.selectedTierId = tierId;
        document.querySelectorAll('[data-action="selectTierRow"]').forEach(row => {
            if(row.getAttribute('data-tier-id') === tierId) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="subscription-selection-actions"]');
        if (defaultMode && selectionMode) {
            defaultMode.classList.replace('active', 'disabled');
            selectionMode.classList.replace('disabled', 'active');
        }
        const isSystem = parseInt(target.getAttribute('data-is-system') || 0, 10) === 1;
        const tierLevel = parseInt(target.getAttribute('data-tier-level') || 0, 10);
        const view = document.querySelector('[data-ref="manageSubscriptionsView"]');
        const currentUserWeight = parseInt(view ? view.getAttribute('data-current-user-weight') : 0, 10);
        const deleteBtn = document.querySelector('[data-action="deleteTier"]');
        const editBtn = document.querySelector('[data-action="editTier"]');
        if (deleteBtn) { deleteBtn.classList.remove('disabled-interaction');  deleteBtn.removeAttribute('title'); }
        if (editBtn) { editBtn.classList.remove('disabled-interaction');  editBtn.removeAttribute('title'); }
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
        this.selectedTierId = null;
        document.querySelectorAll('[data-action="selectTierRow"]').forEach(row => row.classList.remove('selected'));
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="subscription-selection-actions"]');
        if (defaultMode && selectionMode) {
            selectionMode.classList.replace('active', 'disabled');
            defaultMode.classList.replace('disabled', 'active');
        }
    }

    async toggleVisibilityTier() {
        if (!this.selectedTierId) return;
        const payload = { uuid: this.selectedTierId };
        const res = await this.api.post(ApiRoutes.Admin.ToggleVisibilityTier, payload, this.abortController.signal);
        if (res.aborted) return;
        if (res.success) {
            showMessage(_t('visibility_updated', 'Visibilidad actualizada'), 'success');
            setTimeout(() => window.location.reload(), 500);
        } else {
            showMessage(res.message || _t('error', 'Error'), 'error');
        }
    }

    async setPopularTier() {
        if (!this.selectedTierId) return;
        const payload = { uuid: this.selectedTierId };
        const res = await this.api.post(ApiRoutes.Admin.SetPopularTier, payload, this.abortController.signal);
        if (res.aborted) return;
        if (res.success) {
            showMessage(_t('subscription_popular_marked', 'Suscripción marcada como popular'), 'success');
            setTimeout(() => window.location.reload(), 500);
        } else {
            showMessage(res.message || _t('error', 'Error'), 'error');
        }
    }

    async deleteTier() {
        if (!this.selectedTierId || !window.dialogSystem) return;
        const tierId = this.selectedTierId;
        const selectedRow = document.querySelector(`[data-action="selectTierRow"][data-tier-id="${tierId}"]`);
        if (selectedRow && parseInt(selectedRow.getAttribute('data-is-system'), 10) === 1) {
            showMessage(_t('cannot_delete_system_tier', 'No se puede eliminar una suscripción del sistema'), 'error');
            return; 
        }
        const tierName = selectedRow ? selectedRow.getAttribute('data-tier-name') : _t('unknown_tier', 'Suscripción desconocida');
        const response = await window.dialogSystem.show('confirmDeleteTier', { tierName: tierName });
        if (response.confirmed) {
            await this.executeApiAction(ApiRoutes.Admin.DeleteTier, { uuid: tierId });
        }
    }
    async executeApiAction(apiRoute, payload) {
        const res = await this.api.post(apiRoute, payload, this.abortController.signal);
        if (res.aborted) return;
        if (res.success) {
            showMessage(_t('action_success', 'Acción realizada con éxito'), 'success');
            if (window.spaRouter) {
                window.spaRouter.navigate(window.location.pathname + window.location.search);
            } else {
                window.location.reload();
            }
        } else {
            showMessage(res.message || _t('error', 'Error'), 'error');
        }
    }
}
export { AdminSubscriptionsController };