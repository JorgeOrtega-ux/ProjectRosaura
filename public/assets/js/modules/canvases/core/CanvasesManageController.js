// public/assets/js/modules/canvases/CanvasesManageController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasesManageController {
    constructor() {
        this.api = new ApiService();
        this.selectedCanvasIds = new Set();
        this.selectedCanvasUuid = null;
        this.currentCanvasSize = null;
        this.basePath = window.AppBasePath || '';
        
        this.abortController = null;
        this.isInitialized = false; 
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handlePaginationClickBound = this.handlePaginationClick.bind(this);
        this.handleGlobalInputBound = this.handleGlobalInput.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        this.bindEvents();
        this.resetViewState();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handlePaginationClickBound, true);
        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('input', this.handleGlobalInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        
        this.selectedCanvasIds.clear();
        this.selectedCanvasUuid = null;
        this.currentCanvasSize = null;
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handlePaginationClickBound, true);
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handlePaginationClick(e) {
        const target = e.target.closest('a[href], button[data-nav]');
        if (!target) return;

        const url = target.getAttribute('href') || target.getAttribute('data-nav') || '';
        const isPaginationLink = url.includes('page=') || target.closest('[class*="pagin"]') || target.closest('[data-ref="pagination-container"]') || target.hasAttribute('data-action', 'paginate');

        if (isPaginationLink && url !== '#' && !url.includes('javascript:')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.handlePagination(url);
        }
    }

    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchCanvas"]');
        const selectTargetRow = e.target.closest('[data-action="selectCanvas"]');
        const deselectBtn = e.target.closest('[data-action="deselectCanvas"]');
        
        const editCanvasBtn = e.target.closest('[data-action="editSelectedCanvas"]');
        const manageMembersBtn = e.target.closest('[data-action="manageCanvasMembers"]');
        const manageResetsBtn = e.target.closest('[data-action="manageCanvasResets"]');
        const viewSnapshotsBtn = e.target.closest('[data-action="viewCanvasSnapshots"]');
        const deleteCanvasesBtn = e.target.closest('[data-action="deleteSelectedCanvases"]');
        const viewRequestsBtn = e.target.closest('[data-action="viewCanvasRequests"]');
        const createCanvasBtn = e.target.closest('[data-action="createCanvas"]');
        
        const resizeCanvasBtn = e.target.closest('[data-action="goToResizeCanvas"]');

        if (searchBtn) this.toggleSearchToolbar();

        if (selectTargetRow && !e.target.closest('button')) {
            this.handleCanvasSelection(selectTargetRow);
        }

        if (deselectBtn) this.deselectCanvas();
        
        if (editCanvasBtn && !editCanvasBtn.classList.contains('disabled-interactive')) this.editSelectedCanvas();
        if (manageMembersBtn && !manageMembersBtn.classList.contains('disabled-interactive')) this.manageCanvasMembers();
        if (manageResetsBtn && !manageResetsBtn.classList.contains('disabled-interactive')) this.manageCanvasResets();
        if (viewSnapshotsBtn && !viewSnapshotsBtn.classList.contains('disabled-interactive')) this.viewCanvasSnapshots();
        if (deleteCanvasesBtn && !deleteCanvasesBtn.classList.contains('disabled-interactive')) this.deleteSelectedCanvases(deleteCanvasesBtn);
        if (viewRequestsBtn && !viewRequestsBtn.classList.contains('disabled-interactive')) this.viewCanvasRequests();
        if (createCanvasBtn && !createCanvasBtn.classList.contains('disabled-interactive')) this.createCanvas(createCanvasBtn);

        if (resizeCanvasBtn && !resizeCanvasBtn.classList.contains('disabled-interactive')) this.goToResizeCanvas();

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    goToResizeCanvas() {
        if (this.selectedCanvasIds.size !== 1 || !this.selectedCanvasUuid) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/canvases/resize/${this.selectedCanvasUuid}`);
        } else {
            window.location.href = `${this.basePath}/canvases/resize/${this.selectedCanvasUuid}`;
        }
    }

    async createCanvas(btn) {
        const nameInput = document.querySelector('[data-ref="input-canvasname"]');
        const descInput = document.querySelector('[data-ref="input-canvas-desc"]');
        
        const privacyText = document.querySelector('[data-ref="text-privacy"]');
        const sizeText = document.querySelector('[data-ref="text-size"]');
        const approvalText = document.querySelector('[data-ref="text-approval"]');
        const paletteText = document.querySelector('[data-ref="text-palette"]');
        const cooldownBatchVal = document.querySelector('[data-ref="val_cooldown_batch"]');
        const cooldownSecVal = document.querySelector('[data-ref="val_cooldown_seconds"]');
        const limitVal = document.querySelector('[data-ref="val_limit"]');
        
        const scopeTypeText = document.querySelector('[data-ref="text-scope-type"]');
        
        const payload = {
            name: nameInput ? nameInput.value : 'Nuevo Lienzo',
            description: descInput ? descInput.value : '',
            privacy: (privacyText && privacyText.textContent.toLowerCase().includes('público')) ? 'public' : 'private',
            requires_approval: (approvalText && approvalText.textContent.toLowerCase().includes('verdadero')),
            size: sizeText ? sizeText.textContent.split('x')[0] : '64',
            limit: limitVal ? parseInt(limitVal.textContent) : 10,
            palette_id: 'default', 
            cooldown_pixels_batch: cooldownBatchVal ? parseInt(cooldownBatchVal.textContent) : 5,
            cooldown_seconds: cooldownSecVal ? parseInt(cooldownSecVal.textContent) : 10,
            scope_type: (scopeTypeText && !scopeTypeText.textContent.includes('Personal')) ? 'global' : 'personal'
        };

        setButtonLoading(btn);

        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.Create ? ApiRoutes.Canvases.Create : 'canvases.create';
        const result = await this.api.post(route, payload, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/manage`);
                else window.location.href = `${this.basePath}/canvases/manage`;
            }, 1000);
        } else {
            if (result.error_code === 'UPGRADE_REQUIRED' || result.http_code === 403) {
                const banner = document.querySelector('[data-ref="limit-reached-banner"]');
                if (banner) {
                    banner.style.display = 'flex';
                    banner.classList.remove('disabled');
                }
                btn.classList.add('disabled-interactive');
            } else {
                showMessage(result.message, 'error');
            }
        }
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'canvas-search-input') {
            this.applyLocalSearch();
        }
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/canvases/manage')) {
            this.resetViewState();
        }
    }

    resetViewState() {
        const searchInput = document.querySelector('[data-ref="canvas-search-input"]');
        if (searchInput) searchInput.value = '';
        
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar) {
            searchToolbar.classList.remove('active');
            searchToolbar.classList.add('disabled');
        }

        this.applyLocalSearch();
        this.deselectCanvas(); 
    }

    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="view-table"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"], [class*="pagin"]');

        if (tableContainer) {
            tableContainer.style.transition = 'opacity 0.2s ease';
            tableContainer.style.opacity = '0.5';
            tableContainer.style.pointerEvents = 'none';
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
            this.resetViewState();

        } catch (error) {
            if (error.name === 'AbortError') return;
            if (window.spaRouter) window.spaRouter.navigate(url);
            else window.location.href = url;
        } finally {
            if (tableContainer) {
                tableContainer.style.opacity = '1';
                tableContainer.style.pointerEvents = 'auto';
            }
        }
    }

    editSelectedCanvas() {
        if (this.selectedCanvasIds.size !== 1 || !this.selectedCanvasUuid) return;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/edit/${this.selectedCanvasUuid}`);
        else window.location.href = `${this.basePath}/canvases/edit/${this.selectedCanvasUuid}`;
    }

    manageCanvasMembers() {
        if (this.selectedCanvasIds.size !== 1 || !this.selectedCanvasUuid) return;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/members/${this.selectedCanvasUuid}`);
        else window.location.href = `${this.basePath}/canvases/members/${this.selectedCanvasUuid}`;
    }

    manageCanvasResets() {
        if (this.selectedCanvasIds.size !== 1 || !this.selectedCanvasUuid) return;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/manage/resets/${this.selectedCanvasUuid}`);
        else window.location.href = `${this.basePath}/canvases/manage/resets/${this.selectedCanvasUuid}`;
    }

    viewCanvasSnapshots() {
        if (this.selectedCanvasIds.size !== 1 || !this.selectedCanvasUuid) return;
        if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/design/s/${this.selectedCanvasUuid}`);
        else window.location.href = `${this.basePath}/design/s/${this.selectedCanvasUuid}`;
    }

    viewCanvasRequests() {
        if (this.selectedCanvasIds.size !== 1 || !this.selectedCanvasUuid) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/canvases/manage/requests/${this.selectedCanvasUuid}`);
        } else {
            window.location.href = `${this.basePath}/canvases/manage/requests/${this.selectedCanvasUuid}`;
        }
    }

    async deleteSelectedCanvases(btn) {
        if (this.selectedCanvasIds.size === 0) return;

        const resultDialog = await window.dialogSystem.show('verifyPasswordDeleteCanvases', { count: this.selectedCanvasIds.size });

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';
        if (!password) { showMessage(__('err_password_required'), 'error'); return; }

        setButtonLoading(btn);

        const payload = {
            canvas_ids: Array.from(this.selectedCanvasIds),
            password: password
        };

        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.Delete ? ApiRoutes.Canvases.Delete : 'canvases.delete';
        const result = await this.api.post(route, payload, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
            this.selectedCanvasIds.clear();
            this.selectedCanvasUuid = null;
            this.currentCanvasSize = null;

            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/manage`, { forceReload: true });
                else window.location.reload();
            }, 2000);
        } else {
            showMessage(result.message, 'error');
        }
    }

    handleCanvasSelection(rowElement) {
        const canvasId = rowElement.getAttribute('data-canvas-id');
        const uuid = rowElement.getAttribute('data-uuid');
        const size = parseInt(rowElement.getAttribute('data-size')); 
        
        if (this.selectedCanvasIds.has(canvasId)) {
            this.selectedCanvasIds.delete(canvasId);
            this.selectedCanvasUuid = null;
            this.currentCanvasSize = null;
            rowElement.classList.remove('selected');
        } else {
            this.selectedCanvasIds.add(canvasId);
            this.selectedCanvasUuid = uuid;
            this.currentCanvasSize = size;
            rowElement.classList.add('selected');
        }

        this.updateSelectionUI();
    }

    deselectCanvas() {
        this.selectedCanvasIds.clear();
        this.selectedCanvasUuid = null;
        this.currentCanvasSize = null;
        document.querySelectorAll('[data-action="selectCanvas"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');

        const btnEdit = document.querySelector('[data-action="editSelectedCanvas"]');
        const btnMembers = document.querySelector('[data-action="manageCanvasMembers"]');
        const btnResets = document.querySelector('[data-action="manageCanvasResets"]');
        const btnSnapshots = document.querySelector('[data-action="viewCanvasSnapshots"]');
        const btnRequests = document.querySelector('[data-action="viewCanvasRequests"]');
        const btnResize = document.querySelector('[data-action="goToResizeCanvas"]');

        if (this.selectedCanvasIds.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');

            if (this.selectedCanvasIds.size > 1) {
                [btnEdit, btnMembers, btnResets, btnSnapshots, btnRequests, btnResize].forEach(btn => {
                    if (btn) btn.classList.add('disabled-interactive');
                });
            } else {
                [btnEdit, btnMembers, btnResets, btnSnapshots, btnRequests, btnResize].forEach(btn => {
                    if (btn) btn.classList.remove('disabled-interactive');
                });
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="canvas-search-input"]');

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

    applyLocalSearch() {
        const queryInput = document.querySelector('[data-ref="canvas-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }

        const container = document.querySelector(`[data-ref="view-table"]`);
        if (!container) return;

        let visibleCount = 0;
        let lastVisibleItem = null;
        const items = container.querySelectorAll('[data-action="selectCanvas"]');
        
        items.forEach(item => {
            item.classList.remove('last-visible-row');
            
            const textContent = Array.from(item.querySelectorAll('.search-target'))
                .map(el => el.textContent.toLowerCase())
                .join(' ');
            
            if (textContent.includes(query)) {
                item.classList.remove('disabled');
                visibleCount++;
                lastVisibleItem = item;
            } else {
                item.classList.add('disabled');
            }
        });

        if (lastVisibleItem) lastVisibleItem.classList.add('last-visible-row');

        const emptyElement = document.querySelector(`[data-ref="empty-search-table"]`);
        if (emptyElement) {
            if (visibleCount === 0 && items.length > 0) emptyElement.classList.remove('disabled');
            else emptyElement.classList.add('disabled');
        }
    }
}

export { CanvasesManageController };