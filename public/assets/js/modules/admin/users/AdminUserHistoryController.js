class AdminUserHistoryController {
    constructor() {
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false; 
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleGlobalChangeBound = this.handleGlobalChange.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.filterTimeout = null;
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
        document.removeEventListener('change', this.handleGlobalChangeBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.isInitialized = false;
    }
    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('change', this.handleGlobalChangeBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
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
    handleGlobalClick(e) {

    }
    handleGlobalChange(e) {
        if (e.target && e.target.classList.contains('filter-checkbox')) {
            this.applyAllFilters();
        }
    }
    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/user-activity')) {
            this.initializeFiltersFromURL();
        }
    }
    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const catParam = urlParams.get('category');
        const catList = catParam ? catParam.split(',') : null;
        document.querySelectorAll('.filter-checkbox[data-filter-type="category"]').forEach(cb => {
            cb.checked = catList ? catList.includes(cb.value) : true;
        });

        this.updateFilterButtonsState();
    }
    resetViewState() {
        // Nothing to reset, selection state is managed by URL
    }
    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="view-table"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');
        if (tableContainer) {
            .classList.add('disabled-interaction');
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
            this.updateFilterButtonsState();
        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (tableContainer) {
                .classList.remove('disabled-interaction');
            }
        }
    }
    updateFilterButtonsState() {
        const categoryCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="category"]'));
        const checkedCategories = categoryCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const filtersBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
        if (filtersBtn) {
            const hasCategoryFilter = checkedCategories.length < categoryCheckboxes.length;
            if (hasCategoryFilter) {
                filtersBtn.classList.add('has-active-filter');
            } else {
                filtersBtn.classList.remove('has-active-filter');
            }
        }
    }

    applyAllFilters() {
        if (this.filterTimeout) clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.executeServerFilters();
        }, 400);
    }

    executeServerFilters() {
        const categoryCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="category"]'));
        const checkedCategories = categoryCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        
        this.updateFilterButtonsState();
        
        const viewContent = document.querySelector('.view-content');
        const targetUserUuid = viewContent ? viewContent.getAttribute('data-user-uuid') : null;
        if (!targetUserUuid) return;

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', '1');
        urlParams.delete('id');
        
        if (checkedCategories.length < categoryCheckboxes.length) {
            urlParams.set('category', checkedCategories.join(','));
        } else {
            urlParams.delete('category');
        }
        
        const url = `${this.basePath}/admin/user-activity/${targetUserUuid}?${urlParams.toString()}`;
        this.handlePagination(url);
    }
}
export { AdminUserHistoryController };