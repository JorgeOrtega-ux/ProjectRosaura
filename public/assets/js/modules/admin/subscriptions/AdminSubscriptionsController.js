import { ApiRoutes }           from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { BaseListController }   from '../../../core/base/BaseListController.js';
import { applySelectableTable } from '../../../core/mixins/SelectableTableMixin.js';

function _t(key, fallback = '') {
    return typeof window.__ === 'function' ? window.__(key) : fallback;
}

class AdminSubscriptionsController extends BaseListController {
    constructor() {
        super();
        this.selectedTierId = null;
    }

    // ─── Métodos abstractos de BaseListController ─────────────────────────────

    getViewPath()      { return '/admin/subscriptions'; }
    getExcludePath()   { return '/admin/subscription-'; }
    getSearchInputRef(){ return 'tier-search-input'; }

    // ─── Paginación ───────────────────────────────────────────────────────────

    async handlePagination(url) {
        const tableContainer     = document.querySelector('[data-ref="tiers-table-wrapper"]');
        const emptyState         = document.querySelector('[data-ref="tiers-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        const containerToDisable = tableContainer || emptyState;

        if (containerToDisable) containerToDisable.classList.add('disabled-interaction');

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController?.signal ?? null });
            const doc  = new DOMParser().parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="manageSubscriptionsView"]');
            const newContent  = doc.querySelector('[data-ref="manageSubscriptionsView"]');

            if (viewContent && newContent) {
                const bottomContainer    = viewContent.querySelector('.component-bottom');
                const newBottomContainer = newContent.querySelector('.component-bottom');
                if (bottomContainer && newBottomContainer) {
                    bottomContainer.innerHTML = newBottomContainer.innerHTML;
                }

                const newPaginations = doc.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
                if (newPaginations.length > 0 && currentPaginations.length > 0) {
                    currentPaginations.forEach((container, index) => {
                        if (newPaginations[index]) {
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
            if (typeof window.applySubscriptionDynamicColors === 'function') window.applySubscriptionDynamicColors();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (containerToDisable) containerToDisable.classList.remove('disabled-interaction');
        }
    }

    executeServerFilters() {
        const queryInput = document.querySelector('[data-ref="tier-search-input"]');
        const query      = (queryInput ? queryInput.value : '').trim();
        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        if (query) urlParams.set('q', query);
        else       urlParams.delete('q');

        this.handlePagination(`${this.basePath}/admin/subscriptions?${urlParams.toString()}`);
    }

    // ─── Manejadores de eventos ───────────────────────────────────────────────

    handleGlobalClick(e) {
        const selectTarget  = e.target.closest('[data-action="selectTierRow"]');
        const searchBtn     = e.target.closest('[data-action="searchTier"]');
        const addBtn        = e.target.closest('[data-action="addTier"]');
        const editBtn       = e.target.closest('[data-action="editTier"]');
        const delBtn        = e.target.closest('[data-action="deleteTier"]');
        const toggleVisBtn  = e.target.closest('[data-action="toggleVisibilityTier"]');
        const setPopBtn     = e.target.closest('[data-action="setPopularTier"]');

        if (selectTarget)   this.handleRowSelection(selectTarget);
        if (searchBtn)      this.toggleSearchToolbar();
        if (addBtn)         this.navigateToAddTier();
        if (editBtn)        this.navigateToEditTier();
        if (delBtn)         this.deleteTier(delBtn);
        if (toggleVisBtn)   this.toggleVisibilityTier(toggleVisBtn);
        if (setPopBtn)      this.setPopularTier(setPopBtn);

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

    // ─── Selección de fila ────────────────────────────────────────────────────

    handleRowSelection(target) {
        const tierId = target.getAttribute('data-tier-id');
        if (this.selectedTierId === tierId) { this.deselectAll(); return; }

        this.selectedTierId = tierId;
        document.querySelectorAll('[data-action="selectTierRow"]').forEach(row => {
            row.classList.toggle('selected', row.getAttribute('data-tier-id') === tierId);
        });
        this._toggleSelectionBar(true);

        // Lógica específica: deshabilitar botones para tiers del sistema
        const isSystem  = parseInt(target.getAttribute('data-is-system') || 0, 10) === 1;
        const deleteBtn = document.querySelector('[data-action="deleteTier"]');
        const editBtn   = document.querySelector('[data-action="editTier"]');

        if (deleteBtn) { deleteBtn.classList.remove('disabled-interaction'); deleteBtn.removeAttribute('title'); }
        if (editBtn)   { editBtn.classList.remove('disabled-interaction');   editBtn.removeAttribute('title'); }

        if (isSystem) {
            if (deleteBtn) { deleteBtn.classList.add('disabled-interaction'); deleteBtn.setAttribute('title', _t()); }
            if (editBtn)   { editBtn.setAttribute('title', _t()); }
        }
    }

    // ─── Navegación ───────────────────────────────────────────────────────────

    navigateToAddTier() {
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/subscription-create`);
        else window.location.href = `${this.basePath}/admin/subscription-create`;
    }

    navigateToEditTier() {
        if (!this.selectedTierId) return;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/subscription-edit/${this.selectedTierId}`);
        else window.location.href = `${this.basePath}/admin/subscription-edit/${this.selectedTierId}`;
    }

    // ─── Acciones API ─────────────────────────────────────────────────────────

    async toggleVisibilityTier(btn = null) {
        if (!this.selectedTierId) return;
        if (btn) setButtonLoading(btn);
        try {
            const res = await this.api.post(ApiRoutes.Admin.ToggleVisibilityTier, { uuid: this.selectedTierId }, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) { showMessage(_t('visibility_updated', 'Visibilidad actualizada'), 'success'); await this.handlePagination(window.location.href); }
            else showMessage(res.message || window.__('err_default'), 'error');
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(window.__('err_update_canvas'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async setPopularTier(btn = null) {
        if (!this.selectedTierId) return;
        if (btn) setButtonLoading(btn);
        try {
            const res = await this.api.post(ApiRoutes.Admin.SetPopularTier, { uuid: this.selectedTierId }, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) { showMessage(window.__('subscription_popular_marked'), 'success'); await this.handlePagination(window.location.href); }
            else showMessage(res.message || window.__('err_default'), 'error');
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(window.__('err_update_canvas'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async deleteTier(btn = null) {
        if (!this.selectedTierId || !window.modalSystem) return;
        const tierId      = this.selectedTierId;
        const selectedRow = document.querySelector(`[data-action="selectTierRow"][data-tier-id="${tierId}"]`);

        if (selectedRow && parseInt(selectedRow.getAttribute('data-is-system'), 10) === 1) {
            showMessage(window.__('cannot_delete_system_tier'), 'error');
            return;
        }

        const tierName = selectedRow ? selectedRow.getAttribute('data-tier-name') : window.__('unknown_tier');
        const response = await window.modalSystem.show('confirmDeleteTier', { tierName });
        if (response.confirmed) await this.executeApiAction(btn, ApiRoutes.Admin.DeleteTier, { uuid: tierId });
    }

    async executeApiAction(btn = null, apiRoute, payload) {
        if (btn) setButtonLoading(btn);
        try {
            const res = await this.api.post(apiRoute, payload, this.abortController.signal);
            if (res.aborted) return;
            if (res.success) { showMessage(res.message || window.__('subscription_deleted_success') || 'Plan eliminado', 'success'); await this.handlePagination(window.location.href); }
            else showMessage(res.message || window.__('err_default'), 'error');
        } catch (err) {
            if (err.name !== 'AbortError') showMessage(window.__('err_delete'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }
}

// Genera: selectTableRow(), deselectAll(), _toggleSelectionBar()
applySelectableTable(AdminSubscriptionsController, {
    idProp:       'selectedTierId',
    selectionRef: 'subscription-selection-actions',
    rowSelector:  '[data-action="selectTierRow"]',
});

export { AdminSubscriptionsController };