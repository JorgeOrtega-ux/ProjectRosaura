import { ApiService } from '../../../core/api/ApiServices.js';
import { debounce } from '../../../core/utils/uiUtils.js';

export class AdminSupportTicketsController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.selectedUuid = null;
        this.currentStatus = '';

        this._boundClick = this.handleClick.bind(this);
        this._boundInput = this.handleInput.bind(this);
        this.applyFilters = debounce(this.executeFilters.bind(this), 350);
    }

    init() {
        this.container = document.querySelector('[data-ref="admin-support-tickets-wrapper"]');
        this.abortController = new AbortController();
        this._initFiltersFromURL();
        this.bindEvents();
    }

    bindEvents() {
        if (this.container) {
            this.container.addEventListener('input', this._boundInput);
        }
        document.body.addEventListener('click', this._boundClick);
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        if (this.container) {
            this.container.removeEventListener('input', this._boundInput);
        }
        document.body.removeEventListener('click', this._boundClick);
        this.selectedUuid = null;
    }

    _initFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentStatus = urlParams.get('status') || '';
        const searchQuery = urlParams.get('q') || '';

        const searchInput = document.querySelector('[data-ref="tickets-search-input"]');
        if (searchInput && searchQuery) {
            searchInput.value = searchQuery;
            const toolbar = document.querySelector('[data-ref="search-toolbar"]');
            if (toolbar) {
                toolbar.classList.remove('disabled');
                toolbar.classList.add('active');
            }
        }
    }

    handleInput(e) {
        const searchInput = e.target.closest('[data-ref="tickets-search-input"]');
        if (searchInput) {
            this.applyFilters();
        }
    }

    handleClick(e) {
        const toggleSearchBtn = e.target.closest('[data-action="toggleSearch"]');
        if (toggleSearchBtn) {
            e.preventDefault();
            this._toggleSearchToolbar();
            return;
        }

        const filterBtn = e.target.closest('[data-action="filterTicketStatus"]');
        if (filterBtn) {
            e.preventDefault();
            this._handleStatusFilter(filterBtn);
            return;
        }

        const selectRow = e.target.closest('[data-action="selectTicketRow"]');
        if (selectRow && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.component-dropdown-wrapper')) {
            e.preventDefault();
            const uuid = selectRow.getAttribute('data-uuid');
            if (this.selectedUuid === uuid) {
                this.deselectTicket();
            } else {
                this.selectedUuid = uuid;
                const tbody = document.querySelector('[data-ref="admin-tickets-table-body"]');
                if (tbody) {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                }
                selectRow.classList.add('selected');
                this._updateSelectionUI();
            }
            return;
        }

        const followUpBtn = e.target.closest('[data-action="followUpSelectedTicket"]');
        if (followUpBtn) {
            e.preventDefault();
            if (this.selectedUuid) {
                const targetUrl = `${this.basePath}/admin/support/ticket/${this.selectedUuid}`;
                if (window.spaRouter) {
                    window.spaRouter.navigate(targetUrl);
                } else {
                    window.location.href = targetUrl;
                }
            }
            return;
        }
    }

    _toggleSearchToolbar() {
        const toolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (toolbar) {
            const isHidden = toolbar.classList.contains('disabled');
            if (isHidden) {
                toolbar.classList.remove('disabled');
                toolbar.classList.add('active');
                const input = toolbar.querySelector('[data-ref="tickets-search-input"]');
                if (input) input.focus();
            } else {
                toolbar.classList.remove('active');
                toolbar.classList.add('disabled');
            }
        }
    }

    _handleStatusFilter(btn) {
        const status = btn.getAttribute('data-status') || '';
        this.currentStatus = status;

        const allPills = document.querySelectorAll('[data-action="filterTicketStatus"]');
        allPills.forEach(b => {
            if (b === btn) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        const filterModule = document.querySelector('[data-module="moduleTicketFilters"]');
        if (filterModule && window.appInstance) {
            window.appInstance.closeModule(filterModule);
        }

        this.executeFilters();
    }

    executeFilters() {
        const searchInput = document.querySelector('[data-ref="tickets-search-input"]');
        const query = searchInput ? searchInput.value.trim() : '';

        const urlParams = new URLSearchParams();
        if (query) urlParams.set('q', query);
        if (this.currentStatus) urlParams.set('status', this.currentStatus);

        const queryString = urlParams.toString();
        const url = `${this.basePath}/admin/support/tickets${queryString ? '?' + queryString : ''}`;

        this.handlePagination(url);
    }

    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="admin-tickets-table-wrapper"]');
        if (tableContainer) {
            tableContainer.classList.add('disabled-interaction');
        }

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : undefined });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newTable = doc.querySelector('[data-ref="admin-tickets-table-wrapper"]');
            if (newTable && tableContainer) {
                tableContainer.innerHTML = newTable.innerHTML;
            }

            window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            this.deselectTicket();

            if (window.applySubscriptionDynamicColors) {
                try {
                    window.applySubscriptionDynamicColors();
                } catch (e) {}
            }
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

    deselectTicket() {
        this.selectedUuid = null;
        const tbody = document.querySelector('[data-ref="admin-tickets-table-body"]');
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        }
        this._updateSelectionUI();
    }

    _updateSelectionUI() {
        const selectionActions = document.querySelector('[data-ref="header-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');

        if (this.selectedUuid) {
            if (selectionActions) {
                selectionActions.classList.remove('disabled');
                selectionActions.classList.add('active');
            }
            if (defaultActions) {
                defaultActions.classList.remove('active');
                defaultActions.classList.add('disabled');
            }
        } else {
            if (selectionActions) {
                selectionActions.classList.remove('active');
                selectionActions.classList.add('disabled');
            }
            if (defaultActions) {
                defaultActions.classList.remove('disabled');
                defaultActions.classList.add('active');
            }
        }
    }
}
