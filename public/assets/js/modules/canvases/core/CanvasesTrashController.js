import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { 
    backToMainFilters,
    catchPaginationClick,
    closeAllDropdowns,
    debounce,
    handleOutsideSearchToolbarClick,
    openFilterSubMenu,
    restoreButton,
    setButtonLoading, 
    showMessage, 
    toggleSearchToolbar,
    updateFilterIndicator
} from '../../../core/utils/uiUtils.js';

class CanvasesTrashController {
    constructor() {
        this.api = new ApiService();
        this.selectedCanvasIds = new Set();
        this.selectedCanvasUuids = new Set();
        this.selectedCanvasUuid = null;
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false;

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleGlobalInputBound = this.handleGlobalInput.bind(this);
        this.handleGlobalChangeBound = this.handleGlobalChange.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);

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
        document.removeEventListener('change', this.handleGlobalChangeBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);

        this.selectedCanvasIds.clear();
        this.selectedCanvasUuids.clear();
        this.selectedCanvasUuid = null;
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        document.addEventListener('change', this.handleGlobalChangeBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handlePaginationClick(e) {
        catchPaginationClick(e, url => this.handlePagination(url));
    }

    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchTrash"]');
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
        const selectTargetCard = e.target.closest('[data-action="selectTrashCanvas"]');
        const deselectBtn = e.target.closest('[data-action="deselectTrashCanvas"]');
        const restoreSingleBtn = e.target.closest('[data-action="restoreSingleCanvas"]');
        const permDeleteSingleBtn = e.target.closest('[data-action="permDeleteSingleCanvas"]');
        const restoreBtn = e.target.closest('[data-action="restoreSelectedCanvases"]');
        const permDeleteBtn = e.target.closest('[data-action="permanentDeleteSelectedCanvases"]');

        if (searchBtn) toggleSearchToolbar('[data-ref="search-toolbar"]', '[data-ref="trash-search-input"]');
        if (openSubMenuBtn) openFilterSubMenu(openSubMenuBtn);
        if (backToMainFiltersBtn) {
            e.preventDefault();
            backToMainFilters('menuMainFilters', 'moduleTrashFilters');
        }

        if (restoreSingleBtn && !restoreSingleBtn.classList.contains('disabled-interaction')) {
            e.stopPropagation();
            this.restoreSingleCanvas(restoreSingleBtn);
            return;
        }

        if (permDeleteSingleBtn && !permDeleteSingleBtn.classList.contains('disabled-interaction')) {
            e.stopPropagation();
            this.permanentDeleteSingleCanvas(permDeleteSingleBtn);
            return;
        }

        if (selectTargetCard && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.component-dropdown-wrapper')) {
            this.handleCanvasSelection(selectTargetCard, e);
        }

        if (deselectBtn) this.deselectCanvas();
        if (restoreBtn && !restoreBtn.classList.contains('disabled-interaction')) this.restoreSelectedCanvases(restoreBtn);
        if (permDeleteBtn && !permDeleteBtn.classList.contains('disabled-interaction')) this.permanentDeleteSelectedCanvases(permDeleteBtn);

        handleOutsideSearchToolbarClick(e, searchBtn);
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'trash-search-input') {
            this.applyAllFilters();
        }
    }

    handleGlobalChange(e) {
        if (e.target && e.target.classList.contains('filter-checkbox') && !e.target.closest('.component-modal-body')) {
            this.applyAllFilters();
        }
    }

    handleViewLoaded(e) {
        if (e.detail && e.detail.url && (e.detail.url.includes('/trash') || e.detail.url.includes('/canvases/trash'))) {
            this.initializeFiltersFromURL();
        }
    }

    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);

        const searchInput = document.querySelector('[data-ref="trash-search-input"]');
        if (searchInput) searchInput.value = urlParams.get('q') || '';

        const sizeParam = urlParams.get('size');
        const sizeList = sizeParam ? sizeParam.split(',') : null;
        document.querySelectorAll('.filter-checkbox[data-filter-type="size"]').forEach(cb => {
            cb.checked = sizeList ? sizeList.includes(cb.value) : true;
        });

        const privacyParam = urlParams.get('privacy');
        const privacyList = privacyParam ? privacyParam.split(',') : null;
        document.querySelectorAll('.filter-checkbox[data-filter-type="privacy"]').forEach(cb => {
            cb.checked = privacyList ? privacyList.includes(cb.value) : true;
        });

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && searchInput && searchInput.value !== '') {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
        }

        this.updateFilterButtonsState();
        this.deselectCanvas();
    }

    resetViewState() {
        this.deselectCanvas();
    }

    async handlePagination(url) {
        const gridContainer = document.querySelector('[data-ref="view-grid"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');

        if (gridContainer) {
            gridContainer.classList.add('disabled-interaction');
        }

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : null });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newGrid = doc.querySelector('[data-ref="view-grid"]');
            if (newGrid && gridContainer) {
                gridContainer.innerHTML = newGrid.innerHTML;
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
            if (gridContainer) {
                gridContainer.classList.remove('disabled-interaction');
            }
        }
    }

    updateFilterButtonsState() {
        const queryInput = document.querySelector('[data-ref="trash-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        const sizeCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="size"]'));
        const privacyCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="privacy"]'));

        const checkedSizes = sizeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedPrivacy = privacyCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        updateFilterIndicator(searchBtn, query.length > 0);

        const filtersBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
        const hasSizeFilter = checkedSizes.length < sizeCheckboxes.length;
        const hasPrivacyFilter = checkedPrivacy.length < privacyCheckboxes.length;
        updateFilterIndicator(filtersBtn, hasSizeFilter || hasPrivacyFilter);
    }

    executeServerFilters() {
        const queryInput = document.querySelector('[data-ref="trash-search-input"]');
        const query = (queryInput ? queryInput.value : '').trim();
        const sizeCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="size"]'));
        const privacyCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="privacy"]'));

        const checkedSizes = sizeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedPrivacy = privacyCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams();
        urlParams.set('page', '1');

        if (query) urlParams.set('q', query);

        if (checkedSizes.length < sizeCheckboxes.length) {
            urlParams.set('size', checkedSizes.join(','));
        }
        if (checkedPrivacy.length < privacyCheckboxes.length) {
            urlParams.set('privacy', checkedPrivacy.join(','));
        }

        const url = `${this.basePath}/trash?${urlParams.toString()}`;
        this.handlePagination(url);
    }

    handleCanvasSelection(card, event) {
        const canvasId = parseInt(card.getAttribute('data-canvas-id'), 10);
        const uuid = card.getAttribute('data-uuid');

        if (event && (event.ctrlKey || event.metaKey)) {
            if (this.selectedCanvasIds.has(canvasId)) {
                this.selectedCanvasIds.delete(canvasId);
                this.selectedCanvasUuids.delete(uuid);
                card.classList.remove('selected');
            } else {
                this.selectedCanvasIds.add(canvasId);
                this.selectedCanvasUuids.add(uuid);
                card.classList.add('selected');
            }
        } else {
            const isAlreadySelected = this.selectedCanvasIds.has(canvasId) && this.selectedCanvasIds.size === 1;

            document.querySelectorAll('[data-action="selectTrashCanvas"]').forEach(el => el.classList.remove('selected'));
            this.selectedCanvasIds.clear();
            this.selectedCanvasUuids.clear();

            if (!isAlreadySelected) {
                this.selectedCanvasIds.add(canvasId);
                this.selectedCanvasUuids.add(uuid);
                this.selectedCanvasUuid = uuid;
                card.classList.add('selected');
            }
        }

        if (this.selectedCanvasIds.size === 1) {
            const activeCard = document.querySelector('[data-action="selectTrashCanvas"].selected');
            if (activeCard) {
                this.selectedCanvasUuid = activeCard.getAttribute('data-uuid');
            }
        } else {
            this.selectedCanvasUuid = null;
        }

        this.updateSelectionUI();
    }

    deselectCanvas() {
        this.selectedCanvasIds.clear();
        this.selectedCanvasUuids.clear();
        this.selectedCanvasUuid = null;
        document.querySelectorAll('[data-action="selectTrashCanvas"]').forEach(el => el.classList.remove('selected'));
        closeAllDropdowns();
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');

        const btnRestore = document.querySelector('[data-ref="btn-action-restore"]');
        const btnPermDelete = document.querySelector('[data-ref="btn-action-perm-delete"]');

        if (this.selectedCanvasIds.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');

            if (btnRestore) btnRestore.classList.remove('disabled-interaction');
            if (btnPermDelete) btnPermDelete.classList.remove('disabled-interaction');

            const filtersModule = document.querySelector('[data-module="moduleTrashFilters"]');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                if (window.appInstance) window.appInstance.closeModule(filtersModule);
            }
        } else {
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');

            if (btnRestore) btnRestore.classList.add('disabled-interaction');
            if (btnPermDelete) btnPermDelete.classList.add('disabled-interaction');
        }
    }

    async restoreSingleCanvas(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        setButtonLoading(btn);

        try {
            const result = await this.api.post(ApiRoutes.Canvases.Restore, { uuid: uuid }, this.abortController ? this.abortController.signal : null);
            restoreButton(btn);

            if (result.aborted) return;

            if (result.success) {
                showMessage(result.message || window.__('msg_canvas_restored'), 'success');
                this.deselectCanvas();
                await this.handlePagination(window.location.href);
            } else {
                showMessage(result.message || window.__('err_canvas_restore_failed'), 'error');
            }
        } catch (error) {
            restoreButton(btn);
            if (error && error.name !== 'AbortError') {
                showMessage(window.__('err_connection'), 'error');
            }
        }
    }

    async permanentDeleteSingleCanvas(btn) {
        const canvasId = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!canvasId && !uuid) return;

        const resultDialog = await window.modalSystem.show('verifyPasswordPermanentDeleteCanvases', {
            count: 1,
            asyncConfirm: true
        });

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';
        const credential = resultDialog.data['credential'] || resultDialog.data['google_token'] || '';
        if (!password && !credential) {
            resultDialog.failure(window.__('err_identity_verification_required'));
            return;
        }

        const payload = {
            canvas_ids: canvasId ? [parseInt(canvasId, 10)] : [],
            uuid: uuid,
            id: uuid,
            password: password,
            credential: credential,
            google_token: credential
        };

        try {
            const result = await this.api.post(ApiRoutes.Canvases.PermanentDelete, payload, this.abortController ? this.abortController.signal : null);

            if (result.aborted) return;

            if (result.success) {
                resultDialog.success();
                showMessage(result.message, 'success');
                this.deselectCanvas();
                await this.handlePagination(window.location.href);
            } else {
                resultDialog.failure(result.message);
            }
        } catch (error) {
            resultDialog.failure(window.__('err_connection'));
        }
    }

    async restoreSelectedCanvases(btn) {
        if (this.selectedCanvasIds.size === 0) return;

        setButtonLoading(btn);

        try {
            let successCount = 0;
            let lastMessage = '';

            for (const uuid of this.selectedCanvasUuids) {
                const result = await this.api.post(ApiRoutes.Canvases.Restore, { uuid: uuid }, this.abortController ? this.abortController.signal : null);
                if (result.aborted) return;
                if (result.success) {
                    successCount++;
                    lastMessage = result.message;
                }
            }

            restoreButton(btn);

            if (successCount > 0) {
                showMessage(lastMessage || window.__('msg_canvas_restored'), 'success');
                this.deselectCanvas();
                await this.handlePagination(window.location.href);
            } else {
                showMessage(window.__('err_canvas_restore_failed'), 'error');
            }
        } catch (error) {
            restoreButton(btn);
            if (error && error.name !== 'AbortError') {
                showMessage(window.__('err_connection'), 'error');
            }
        }
    }

    async permanentDeleteSelectedCanvases(btn) {
        if (this.selectedCanvasIds.size === 0) return;

        const resultDialog = await window.modalSystem.show('verifyPasswordPermanentDeleteCanvases', {
            count: this.selectedCanvasIds.size,
            asyncConfirm: true
        });

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';
        const credential = resultDialog.data['credential'] || resultDialog.data['google_token'] || '';
        if (!password && !credential) {
            resultDialog.failure(window.__('err_identity_verification_required'));
            return;
        }

        const payload = {
            canvas_ids: Array.from(this.selectedCanvasIds),
            password: password,
            credential: credential,
            google_token: credential
        };

        if (this.selectedCanvasIds.size === 1 && this.selectedCanvasUuid) {
            payload.uuid = this.selectedCanvasUuid;
            payload.id = this.selectedCanvasUuid;
        }

        try {
            const result = await this.api.post(ApiRoutes.Canvases.PermanentDelete, payload, this.abortController ? this.abortController.signal : null);

            if (result.aborted) return;

            if (result.success) {
                resultDialog.success();
                showMessage(result.message, 'success');
                this.deselectCanvas();
                await this.handlePagination(window.location.href);
            } else {
                resultDialog.failure(result.message);
            }
        } catch (error) {
            resultDialog.failure(window.__('err_connection'));
        }
    }
}

export { CanvasesTrashController };

