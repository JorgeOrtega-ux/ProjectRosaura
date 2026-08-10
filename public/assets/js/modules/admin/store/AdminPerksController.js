import { ApiRoutes }           from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { BaseListController }   from '../../../core/base/BaseListController.js';
import { applySelectableTable } from '../../../core/mixins/SelectableTableMixin.js';

class AdminPerksController extends BaseListController {
    constructor() {
        super();
        this.selectedPerkId = null;
    }

    // ─── Métodos abstractos de BaseListController ─────────────────────────────

    getViewPath()      { return '/admin/store-perks'; }
    getExcludePath()   { return '/admin/store-perk-'; }
    getSearchInputRef(){ return 'perk-search-input'; }

    // ─── Paginación ───────────────────────────────────────────────────────────

    async handlePagination(url) {
        const tableContainer     = document.querySelector('[data-ref="perks-table-wrapper"]');
        const emptyState         = document.querySelector('[data-ref="perks-empty-state"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        const containerToDisable = tableContainer || emptyState;

        if (containerToDisable) containerToDisable.classList.add('disabled-interaction');

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController?.signal ?? null });
            const doc  = new DOMParser().parseFromString(html, 'text/html');

            const viewContent = document.querySelector('[data-ref="managePerksView"]');
            const newContent  = doc.querySelector('[data-ref="managePerksView"]');

            if (viewContent && newContent) {
                const bottomContainer    = viewContent.querySelector('.component-bottom');
                const newBottomContainer = newContent.querySelector('.component-bottom');
                if (bottomContainer && newBottomContainer) {
                    bottomContainer.innerHTML = newBottomContainer.innerHTML;
                }

                currentPaginations.forEach(container => {
                    const selector      = `[data-ref="${container.getAttribute('data-ref')}"]`;
                    const newPagination = newContent.querySelector(selector) || doc.querySelector(selector);
                    if (newPagination) {
                        container.innerHTML  = newPagination.innerHTML;
                        container.className  = newPagination.className;
                        container.setAttribute('data-tooltip', newPagination.getAttribute('data-tooltip') || '');
                    }
                });

                if (window.spaRouter) {
                    window.spaRouter.updateHistory(url.replace(window.location.origin, ''));
                } else {
                    window.history.pushState({}, '', url);
                }

                this.initializeFiltersFromURL();
            } else {
                throw new Error('Main container was not found in the response.');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Pagination error:', error);
                showMessage(window.__('err_load_canvases'), 'error');
            }
        } finally {
            if (containerToDisable) containerToDisable.classList.remove('disabled-interaction');
        }
    }

    // ─── Manejadores de eventos ───────────────────────────────────────────────

    handleGlobalClick(e) {
        const target    = e.target;
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
            if (this.selectedPerkId === perkId) this.deselectAll();
            else this.selectTableRow(perkId, tr);
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

    // ─── Búsqueda ─────────────────────────────────────────────────────────────

    handleSearchInput(value) {
        if (this.filterTimeout) clearTimeout(this.filterTimeout);

        const currentSearch = new URL(window.location.href).searchParams.get('q') || '';
        const searchBtn     = document.querySelector('[data-ref="btn-toggle-search"]');

        if (value.trim() === currentSearch.trim()) {
            if (searchBtn) searchBtn.classList.toggle('has-active-filter', value.trim() !== '');
            return;
        }

        this.filterTimeout = setTimeout(() => this.applyFilters(value), 500);
    }

    applyFilters(searchQuery = '') {
        const urlParams = new URLSearchParams();
        if (searchQuery.trim() !== '') urlParams.set('q', searchQuery.trim());
        this.handlePagination(`${this.basePath}/admin/store-perks?${urlParams.toString()}`);
    }

    searchPerk(btn) {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput   = document.querySelector('[data-ref="perk-search-input"]');
        if (!searchToolbar) return;

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

    // ─── Navegación y acciones ────────────────────────────────────────────────

    addPerk() {
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/store-perk-create`);
        else window.location.href = `${this.basePath}/admin/store-perk-create`;
    }

    editPerk(btn) {
        if (!this.selectedPerkId) return;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/admin/store-perk-edit/${this.selectedPerkId}`);
        else window.location.href = `${this.basePath}/admin/store-perk-edit/${this.selectedPerkId}`;
    }

    async toggleVisibilityPerk(btn) {
        if (!this.selectedPerkId) return;
        setButtonLoading(btn);
        try {
            const data = await this.api.post(ApiRoutes.Admin.ToggleStorePerk, { uuid: this.selectedPerkId }, this.abortController?.signal);
            if (data.success) { showMessage(data.message, 'success'); this.handlePagination(window.location.href); }
            else showMessage(data.message || window.__('err_update_canvas'), 'error');
        } catch (error) {
            if (error.name !== 'AbortError') showMessage(window.__('err_connection') + ': ' + error.message, 'error');
        } finally {
            restoreButton(btn);
        }
    }

    async deletePerk(btn) {
        if (!this.selectedPerkId) return;
        const confirmRes = await window.modalSystem.show('confirmActionModal', { title: window.__('delete_canvas'), message: window.__('msg_confirm_delete_perk') });
        if (!confirmRes || !confirmRes.confirmed) return;

        setButtonLoading(btn);
        try {
            const data = await this.api.post(ApiRoutes.Admin.DeleteStorePerk, { uuid: this.selectedPerkId }, this.abortController?.signal);
            if (data.success) { showMessage(data.message, 'success'); this.handlePagination(window.location.href); }
            else showMessage(data.message || window.__('err_delete'), 'error');
        } catch (error) {
            if (error.name !== 'AbortError') showMessage(window.__('err_connection') + ': ' + error.message, 'error');
        } finally {
            restoreButton(btn);
        }
    }
}

// Genera: selectTableRow(), deselectAll(), _toggleSelectionBar()
applySelectableTable(AdminPerksController, {
    idProp:       'selectedPerkId',
    selectionRef: 'perk-selection-actions',
    rowSelector:  '[data-ref="perks-table-body"] tr.selected',
});

export { AdminPerksController };
