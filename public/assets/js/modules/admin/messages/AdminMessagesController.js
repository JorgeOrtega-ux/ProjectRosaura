import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { 
    showMessage, 
    setButtonLoading, 
    restoreButton, 
    debounce, 
    catchPaginationClick,
    toggleSearchToolbar,
    handleOutsideSearchToolbarClick,
    openFilterSubMenu,
    backToMainFilters,
    updateFilterIndicator
} from '../../../core/utils/uiUtils.js';

class AdminMessagesController {
    constructor() {
        this.api = new ApiService();
        this.selectedMessageId = null;
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false;
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleGlobalInputBound = this.handleGlobalInput.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.filterTimeout = null;
        this.applyAllFilters = debounce(this.executeServerFilters.bind(this), 400);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
        this.initializeFiltersFromURL();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handlePaginationClickBound, true);
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('input', this.handleGlobalInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.selectedMessageId = null;
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handlePaginationClick(e) {
        if (!window.location.pathname.includes('/admin/messages') || 
            window.location.pathname.includes('/admin/messages/visibility') || 
            window.location.pathname.includes('/admin/messages/reports')) return;
        catchPaginationClick(e, url => this.handlePagination(url));
    }

    handleGlobalClick(e) {
        if (!window.location.pathname.includes('/admin/messages') || 
            window.location.pathname.includes('/admin/messages/visibility') || 
            window.location.pathname.includes('/admin/messages/reports')) return;

        const searchBtn = e.target.closest('[data-action="searchMessages"]');
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
        const selectTargetRow = e.target.closest('[data-action="selectMessage"]');
        const deselectBtn = e.target.closest('[data-action="deselectMessage"]');
        const viewReportsBtn = e.target.closest('[data-action="viewMessageReports"]');

        const changeVisBtn = e.target.closest('[data-action="changeMessageVisibility"]');

        if (searchBtn) toggleSearchToolbar('[data-ref="search-toolbar"]', '[data-ref="message-search-input"]');
        if (openSubMenuBtn) openFilterSubMenu(openSubMenuBtn);
        if (backToMainFiltersBtn) {
            e.preventDefault();
            backToMainFilters('menuMainFilters', 'moduleMessageFilters');
        }

        if (changeVisBtn) {
            e.preventDefault();
            const val = changeVisBtn.getAttribute('data-value');
            this.changeSelectedMessageVisibility(val, changeVisBtn);
        }

        if (selectTargetRow && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.component-dropdown-wrapper')) {
            this.handleMessageSelection(selectTargetRow);
        }
        if (deselectBtn) this.deselectMessage();
        if (viewReportsBtn && !viewReportsBtn.classList.contains('disabled-interaction')) this.viewMessageReports();

        handleOutsideSearchToolbarClick(e, searchBtn);
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'message-search-input') {
            this.applyAllFilters();
        }
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/messages') && !e.detail.url.includes('/admin/messages/visibility') && !e.detail.url.includes('/admin/messages/reports')) {
            this.initializeFiltersFromURL();
        }
    }

    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchInput = document.querySelector('[data-ref="message-search-input"]');
        if (searchInput) searchInput.value = urlParams.get('q') || '';
        
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && searchInput && searchInput.value !== '') {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
        }

        this.backToMainFilters();
        this.updateFilterButtonsState();
        this.deselectMessage();
    }

    resetViewState() {
        this.deselectMessage();
    }

    updateFilterButtonsState() {
        const queryInput = document.querySelector('[data-ref="message-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        updateFilterIndicator(searchBtn, query.length > 0);
    }

    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="view-table"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        if (tableContainer) {
            tableContainer.classList.add('disabled-interaction');
        }
        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : null });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newTable = doc.querySelector('[data-ref="view-table"]');
            if (newTable && tableContainer) {
                tableContainer.innerHTML = newTable.innerHTML;
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
            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            this.resetViewState();
            this.updateFilterButtonsState();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (tableContainer) {
                tableContainer.classList.remove('disabled-interaction');
            }
        }
    }

    executeServerFilters() {
        const queryInput = document.querySelector('[data-ref="message-search-input"]');
        const query = (queryInput ? queryInput.value : '').trim();

        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        
        if (query) {
            urlParams.set('q', query);
        } else {
            urlParams.delete('q');
        }

        const url = `${this.basePath}/admin/messages?${urlParams.toString()}`;
        this.handlePagination(url);
    }

    handleMessageSelection(rowElement) {
        const messageUuid = rowElement.getAttribute('data-message-uuid');
        if (this.selectedMessageId === messageUuid) {
            this.selectedMessageId = null;
            rowElement.classList.remove('selected');
        } else {
            this.selectedMessageId = messageUuid;
            document.querySelectorAll('[data-action="selectMessage"]').forEach(el => el.classList.remove('selected'));
            rowElement.classList.add('selected');
        }
        this.updateSelectionUI();
    }

    deselectMessage() {
        this.selectedMessageId = null;
        document.querySelectorAll('[data-action="selectMessage"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }

    syncVisibilityDropdown(visibility) {
        const options = document.querySelectorAll('[data-action="changeMessageVisibility"]');
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === visibility) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    async changeSelectedMessageVisibility(newVisibility, btnElement) {
        if (!this.selectedMessageId) return;
        try {
            const response = await this.api.post(ApiRoutes.Admin.UpdateMessageVisibility, {
                uuid: this.selectedMessageId,
                visibility: newVisibility
            }, this.abortController ? this.abortController.signal : null);

            if (response && response.success !== false) {
                showMessage(response.message || (typeof window.__ === 'function' ? window.__('msg_visibility_updated', [], 'Visibilidad actualizada') : 'Visibilidad actualizada'), 'success');

                const selectedRow = document.querySelector(`tr[data-message-uuid="${this.selectedMessageId}"]`);
                if (selectedRow) {
                    selectedRow.setAttribute('data-visibility', newVisibility);
                    const badgeCell = selectedRow.children[3];
                    if (badgeCell) {
                        const badgeClass = newVisibility === 'visible' ? 'success' : (newVisibility === 'deleted' ? 'danger' : 'warning');
                        badgeCell.innerHTML = `<span class="component-badge component-badge--sm component-badge--${badgeClass}">${newVisibility}</span>`;
                    }
                }

                this.syncVisibilityDropdown(newVisibility);

                const module = btnElement ? btnElement.closest('[data-module]') : null;
                if (module) module.classList.add('disabled');
            } else {
                showMessage(response?.message || 'Error al actualizar visibilidad', 'error');
            }
        } catch (err) {
            showMessage(err.message || 'Error al actualizar visibilidad', 'error');
        }
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        const viewReportsBtn = document.querySelector('[data-action="viewMessageReports"]');
        
        if (this.selectedMessageId) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');
            
            const selectedRow = document.querySelector(`tr[data-message-uuid="${this.selectedMessageId}"]`);
            if (selectedRow) {
                const currentVis = selectedRow.getAttribute('data-visibility') || 'visible';
                this.syncVisibilityDropdown(currentVis);
            }

            const isRedis = this.selectedMessageId.startsWith('REDIS-');
            if (viewReportsBtn) {
                if (isRedis) {
                    viewReportsBtn.classList.add('disabled-interaction');
                    viewReportsBtn.style.opacity = '0.5';
                    viewReportsBtn.style.cursor = 'not-allowed';
                } else {
                    viewReportsBtn.classList.remove('disabled-interaction');
                    viewReportsBtn.style.opacity = '';
                    viewReportsBtn.style.cursor = '';
                }
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    viewMessageReports() {
        if (!this.selectedMessageId) return;
        const basePath = window.AppBasePath || '';
        if (window.spaRouter) {
            window.spaRouter.navigate(`${basePath}/admin/messages/reports/${this.selectedMessageId}`);
        } else {
            window.location.href = `${basePath}/admin/messages/reports/${this.selectedMessageId}`;
        }
    }
}

export { AdminMessagesController };
