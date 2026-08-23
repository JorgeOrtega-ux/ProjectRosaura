import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
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

class CanvasTrashController {
    constructor() {
        this.api = new ApiService();
        this.selectedCanvasIds = new Set();
        this.selectedCanvasUuids = new Set();
        this.selectedCanvasUuid = null;
        this.selectedTemplateIds = new Set();
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

        this.clearSelection();
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
        catchPaginationClick(e, url => this.handlePagination(url, false));
    }

    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchTrash"]');
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
        const selectTargetCard = e.target.closest('[data-action="selectTrashCard"], [data-action="selectTrashCanvas"], [data-action="selectTrashTemplate"]');
        const deselectBtn = e.target.closest('[data-action="deselectTrashCard"], [data-action="deselectTrashCanvas"]');
        
        // Single Actions - Canvas
        const restoreSingleCanvasBtn = e.target.closest('[data-action="restoreSingleCanvas"]');
        const permDeleteSingleCanvasBtn = e.target.closest('[data-action="permDeleteSingleCanvas"]');
        
        // Single Actions - Template
        const restoreSingleTemplateBtn = e.target.closest('[data-action="restoreSingleTemplate"]');
        const permDeleteSingleTemplateBtn = e.target.closest('[data-action="permDeleteSingleTemplate"]');
        
        // Selection Actions
        const restoreBtn = e.target.closest('[data-action="restoreSelectedTrash"], [data-action="restoreSelectedCanvases"], [data-action="restoreSelectedTemplates"]');
        const permDeleteBtn = e.target.closest('[data-action="permanentDeleteSelectedTrash"], [data-action="permanentDeleteSelectedCanvases"], [data-action="permanentDeleteSelectedTemplates"]');

        if (searchBtn) toggleSearchToolbar('[data-ref="search-toolbar"]', '[data-ref="trash-search-input"]');
        if (openSubMenuBtn) openFilterSubMenu(openSubMenuBtn);
        if (backToMainFiltersBtn) {
            e.preventDefault();
            backToMainFilters('menuMainFilters', 'moduleTrashFilters');
        }

        if (restoreSingleCanvasBtn && !restoreSingleCanvasBtn.classList.contains('disabled-interaction')) {
            e.stopPropagation();
            this.restoreSingleCanvas(restoreSingleCanvasBtn);
            return;
        }

        if (permDeleteSingleCanvasBtn && !permDeleteSingleCanvasBtn.classList.contains('disabled-interaction')) {
            e.stopPropagation();
            this.permanentDeleteSingleCanvas(permDeleteSingleCanvasBtn);
            return;
        }

        if (restoreSingleTemplateBtn && !restoreSingleTemplateBtn.classList.contains('disabled-interaction')) {
            e.stopPropagation();
            this.restoreSingleTemplate(restoreSingleTemplateBtn);
            return;
        }

        if (permDeleteSingleTemplateBtn && !permDeleteSingleTemplateBtn.classList.contains('disabled-interaction')) {
            e.stopPropagation();
            this.permanentDeleteSingleTemplate(permDeleteSingleTemplateBtn);
            return;
        }

        if (selectTargetCard && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.component-dropdown-wrapper')) {
            this.handleCardSelection(selectTargetCard, e);
        }

        if (deselectBtn) this.clearSelection();
        if (restoreBtn && !restoreBtn.classList.contains('disabled-interaction')) this.restoreSelected(restoreBtn);
        if (permDeleteBtn && !permDeleteBtn.classList.contains('disabled-interaction')) this.permanentDeleteSelected(permDeleteBtn);

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

        const typeParam = urlParams.get('type');
        const typeList = typeParam ? typeParam.split(',') : null;
        document.querySelectorAll('.filter-checkbox[data-filter-type="type"]').forEach(cb => {
            cb.checked = typeList ? typeList.includes(cb.value) : true;
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
        this.clearSelection();
    }

    resetViewState() {
        this.clearSelection();
    }

    async handlePagination(url, updateHistory = false) {
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

            if (updateHistory) {
                window.history.pushState({ path: url, fromDynamicPagination: true }, '', url);
            }
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

        const typeCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="type"]'));
        const privacyCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="privacy"]'));

        const checkedTypes = typeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedPrivacy = privacyCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        updateFilterIndicator(searchBtn, query.length > 0);

        const filtersBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
        if (filtersBtn) {
            const hasTypeFilter = typeCheckboxes.length > 0 && checkedTypes.length < typeCheckboxes.length;
            const hasPrivacyFilter = privacyCheckboxes.length > 0 && checkedPrivacy.length < privacyCheckboxes.length;
            updateFilterIndicator(filtersBtn, hasTypeFilter || hasPrivacyFilter);
        }
    }

    executeServerFilters() {
        const queryInput = document.querySelector('[data-ref="trash-search-input"]');
        const query = (queryInput ? queryInput.value : '').trim();

        const typeCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="type"]'));
        const privacyCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="privacy"]'));

        const checkedTypes = typeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedPrivacy = privacyCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        this.updateFilterButtonsState();

        const urlParams = new URLSearchParams();
        urlParams.set('page', '1');

        if (query) urlParams.set('q', query);

        if (checkedTypes.length > 0 && checkedTypes.length < typeCheckboxes.length) {
            urlParams.set('type', checkedTypes.join(','));
        }
        if (checkedPrivacy.length > 0 && checkedPrivacy.length < privacyCheckboxes.length) {
            urlParams.set('privacy', checkedPrivacy.join(','));
        }

        const url = `${this.basePath}/trash?${urlParams.toString()}`;
        this.handlePagination(url, false);
    }

    handleCardSelection(card, event) {
        const cardType = card.getAttribute('data-card-type') || (card.hasAttribute('data-template-id') ? 'template' : 'canvas');
        const isTemplate = (cardType === 'template');

        if (isTemplate) {
            const templateId = parseInt(card.getAttribute('data-template-id') || card.getAttribute('data-id'), 10);
            if (event && (event.ctrlKey || event.metaKey)) {
                if (this.selectedTemplateIds.has(templateId)) {
                    this.selectedTemplateIds.delete(templateId);
                    card.classList.remove('selected');
                } else {
                    this.selectedTemplateIds.add(templateId);
                    card.classList.add('selected');
                }
            } else {
                const isAlreadySelected = this.selectedTemplateIds.has(templateId) && (this.selectedTemplateIds.size + this.selectedCanvasIds.size === 1);
                this.clearSelectionVisuals();

                if (!isAlreadySelected) {
                    this.selectedTemplateIds.add(templateId);
                    card.classList.add('selected');
                }
            }
        } else {
            const canvasId = parseInt(card.getAttribute('data-canvas-id') || card.getAttribute('data-id'), 10);
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
                const isAlreadySelected = this.selectedCanvasIds.has(canvasId) && (this.selectedCanvasIds.size + this.selectedTemplateIds.size === 1);
                this.clearSelectionVisuals();

                if (!isAlreadySelected) {
                    this.selectedCanvasIds.add(canvasId);
                    this.selectedCanvasUuids.add(uuid);
                    this.selectedCanvasUuid = uuid;
                    card.classList.add('selected');
                }
            }

            if (this.selectedCanvasIds.size === 1 && this.selectedTemplateIds.size === 0) {
                const activeCard = document.querySelector('.component-gallery-card.selected');
                if (activeCard) {
                    this.selectedCanvasUuid = activeCard.getAttribute('data-uuid');
                }
            } else {
                this.selectedCanvasUuid = null;
            }
        }

        this.updateSelectionUI();
    }

    clearSelectionVisuals() {
        document.querySelectorAll('.component-gallery-card').forEach(el => el.classList.remove('selected'));
        this.selectedCanvasIds.clear();
        this.selectedCanvasUuids.clear();
        this.selectedCanvasUuid = null;
        this.selectedTemplateIds.clear();
    }

    clearSelection() {
        this.clearSelectionVisuals();
        closeAllDropdowns();
        this.updateSelectionUI();
    }

    deselectCanvas() {
        this.clearSelection();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');

        const btnRestore = document.querySelector('[data-ref="btn-action-restore"]');
        const btnPermDelete = document.querySelector('[data-ref="btn-action-perm-delete"]');

        const totalSelected = this.selectedCanvasIds.size + this.selectedTemplateIds.size;

        if (totalSelected > 0) {
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

    // =========================================================================
    // ACCIONES PARA LIENZOS
    // =========================================================================

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
                this.clearSelection();
                this.executeServerFilters();
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
            count: 1
        });

        if (!resultDialog || !resultDialog.confirmed) return;

        const password = resultDialog.data?.['modal_verify_password']?.trim() || '';
        const credential = resultDialog.data?.credential || resultDialog.data?.google_token || '';

        if (!password && !credential) {
            showMessage(window.__('err_password_required') || window.__('err_identity_verification_required'), 'error');
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
            setButtonLoading(btn);
            const result = await this.api.post(ApiRoutes.Canvases.PermanentDelete, payload, this.abortController ? this.abortController.signal : null);
            restoreButton(btn);

            if (result.aborted) return;

            if (result.success) {
                showMessage(result.message || window.__('msg_canvas_permanent_deleted'), 'success');
                this.clearSelection();
                this.executeServerFilters();
            } else {
                showMessage(result.message || window.__('err_canvas_permanent_delete_failed'), 'error');
            }
        } catch (error) {
            restoreButton(btn);
            if (error && error.name !== 'AbortError') {
                showMessage(window.__('err_connection'), 'error');
            }
        }
    }

    // =========================================================================
    // ACCIONES PARA PLANTILLAS
    // =========================================================================

    async restoreSingleTemplate(btn) {
        const templateId = parseInt(btn.getAttribute('data-id'), 10);
        if (!templateId) return;

        setButtonLoading(btn);

        try {
            const result = await this.api.post(ApiRoutes.Canvases.RestoreTemplate, { id: templateId }, this.abortController ? this.abortController.signal : null);
            restoreButton(btn);

            if (result.aborted) return;

            if (result.success) {
                showMessage(result.message || window.__('msg_template_restored'), 'success');
                this.clearSelection();
                this.executeServerFilters();
            } else {
                showMessage(result.message || window.__('err_template_restore_failed'), 'error');
            }
        } catch (error) {
            restoreButton(btn);
            if (error && error.name !== 'AbortError') {
                showMessage(window.__('err_connection'), 'error');
            }
        }
    }

    async permanentDeleteSingleTemplate(btn) {
        const templateId = parseInt(btn.getAttribute('data-id'), 10);
        if (!templateId) return;

        const resultDialog = await window.modalSystem.show('verifyPasswordPermanentDeleteTemplates', {
            count: 1
        });

        if (!resultDialog || !resultDialog.confirmed) return;

        const password = resultDialog.data?.['modal_verify_password']?.trim() || '';
        const credential = resultDialog.data?.credential || resultDialog.data?.google_token || '';

        if (!password && !credential) {
            showMessage(window.__('err_password_required') || window.__('err_identity_verification_required'), 'error');
            return;
        }

        const payload = {
            id: templateId,
            password: password,
            credential: credential,
            google_token: credential
        };

        try {
            setButtonLoading(btn);
            const result = await this.api.post(ApiRoutes.Canvases.PermanentDeleteTemplate, payload, this.abortController ? this.abortController.signal : null);
            restoreButton(btn);

            if (result.aborted) return;

            if (result.success) {
                showMessage(result.message || window.__('msg_template_permanent_deleted'), 'success');
                this.clearSelection();
                this.executeServerFilters();
            } else {
                showMessage(result.message || window.__('err_template_permanent_delete_failed'), 'error');
            }
        } catch (error) {
            restoreButton(btn);
            if (error && error.name !== 'AbortError') {
                showMessage(window.__('err_connection'), 'error');
            }
        }
    }

    // =========================================================================
    // ACCIONES MASIVAS (RESTAURACIÓN Y BORRADO DEFINITIVO)
    // =========================================================================

    async restoreSelected(btn) {
        const totalSelected = this.selectedCanvasIds.size + this.selectedTemplateIds.size;
        if (totalSelected === 0) return;

        setButtonLoading(btn);

        try {
            let successCount = 0;
            let lastMessage = '';

            if (this.selectedCanvasIds.size > 0) {
                const canvasIds = Array.from(this.selectedCanvasIds);
                const result = await this.api.post(ApiRoutes.Canvases.Restore, { canvas_ids: canvasIds }, this.abortController ? this.abortController.signal : null);
                if (result.aborted) return;
                if (result.success) {
                    successCount++;
                    lastMessage = result.message;
                }
            }

            if (this.selectedTemplateIds.size > 0) {
                const templateIds = Array.from(this.selectedTemplateIds);
                const result = await this.api.post(ApiRoutes.Canvases.RestoreTemplate, { template_ids: templateIds }, this.abortController ? this.abortController.signal : null);
                if (result.aborted) return;
                if (result.success) {
                    successCount++;
                    lastMessage = result.message;
                }
            }

            restoreButton(btn);

            if (successCount > 0) {
                showMessage(lastMessage || window.__('msg_canvas_restored'), 'success');
                this.clearSelection();
                this.executeServerFilters();
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

    async permanentDeleteSelected(btn) {
        const totalSelected = this.selectedCanvasIds.size + this.selectedTemplateIds.size;
        if (totalSelected === 0) return;

        let modalName = 'verifyPasswordPermanentDeleteCanvases';
        if (this.selectedCanvasIds.size > 0 && this.selectedTemplateIds.size > 0) {
            modalName = 'verifyPasswordPermanentDeleteTrash';
        } else if (this.selectedTemplateIds.size > 0) {
            modalName = 'verifyPasswordPermanentDeleteTemplates';
        }

        const resultDialog = await window.modalSystem.show(modalName, {
            count: totalSelected
        });

        if (!resultDialog || !resultDialog.confirmed) return;

        const password = resultDialog.data?.['modal_verify_password']?.trim() || '';
        const credential = resultDialog.data?.credential || resultDialog.data?.google_token || '';

        if (!password && !credential) {
            showMessage(window.__('err_password_required') || window.__('err_identity_verification_required'), 'error');
            return;
        }

        setButtonLoading(btn);

        try {
            if (this.selectedCanvasIds.size > 0) {
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
                const result = await this.api.post(ApiRoutes.Canvases.PermanentDelete, payload, this.abortController ? this.abortController.signal : null);
                if (result.aborted) return;
                if (!result.success) {
                    restoreButton(btn);
                    showMessage(result.message || window.__('err_canvas_permanent_delete_failed'), 'error');
                    return;
                }
            }

            if (this.selectedTemplateIds.size > 0) {
                const payload = {
                    template_ids: Array.from(this.selectedTemplateIds),
                    password: password,
                    credential: credential,
                    google_token: credential
                };
                const result = await this.api.post(ApiRoutes.Canvases.PermanentDeleteTemplate, payload, this.abortController ? this.abortController.signal : null);
                if (result.aborted) return;
                if (!result.success) {
                    restoreButton(btn);
                    showMessage(result.message || window.__('err_template_permanent_delete_failed'), 'error');
                    return;
                }
            }

            restoreButton(btn);
            showMessage(window.__('msg_canvases_permanent_deleted') || window.__('msg_canvas_permanent_deleted'), 'success');
            this.clearSelection();
            this.executeServerFilters();
        } catch (error) {
            restoreButton(btn);
            if (error && error.name !== 'AbortError') {
                showMessage(window.__('err_connection'), 'error');
            }
        }
    }
}

export { CanvasTrashController };

