import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminMessagesController {
    constructor() {
        this.api = new ApiService();
        this.selectedMessageId = null;
        this.isInitialized = false;
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleGlobalInputBound = this.handleGlobalInput.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.filterTimeout = null;
    }
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.bindEvents();
        this.initializeFiltersFromURL();
    }
    destroy() {
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('input', this.handleGlobalInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.selectedMessageId = null;
        this.isInitialized = false;
    }
    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }
    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchMessages"]');
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
        const selectTargetRow = e.target.closest('[data-action="selectMessage"]');
        const deselectBtn = e.target.closest('[data-action="deselectMessage"]');
        const viewReportsBtn = e.target.closest('[data-action="viewMessageReports"]');

        if (searchBtn) this.toggleSearchToolbar();
        if (openSubMenuBtn) this.openFilterSubMenu(openSubMenuBtn);
        if (backToMainFiltersBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.backToMainFilters();
        }

        if (selectTargetRow && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.component-dropdown-wrapper')) {
            this.handleMessageSelection(selectTargetRow);
        }
        if (deselectBtn) this.deselectMessage();
        if (viewReportsBtn && !viewReportsBtn.classList.contains('disabled-interaction')) this.viewMessageReports();

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
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
        const subMenus = document.querySelectorAll('[data-module="moduleMessageFilters"] .component-menu:not([data-ref="menuMainFilters"])');
        if (mainFilters) {
            subMenus.forEach(menu => {
                menu.classList.add('disabled');
                menu.classList.remove('active');
            });
            mainFilters.classList.remove('disabled');
            mainFilters.classList.add('active');
        }
    }
    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="message-search-input"]');
        const filtersModule = document.querySelector('[data-module="moduleMessageFilters"]');
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
    updateFilterButtonsState() {
        const queryInput = document.querySelector('[data-ref="message-search-input"]');
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

        const basePath = window.AppBasePath || '';
        const url = `${basePath}/admin/messages?${urlParams.toString()}`;
        
        if (window.spaRouter) {
            window.spaRouter.navigate(url);
        } else {
            window.location.href = url;
        }
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
    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        const viewReportsBtn = document.querySelector('[data-action="viewMessageReports"]');
        
        if (this.selectedMessageId) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');
            
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
