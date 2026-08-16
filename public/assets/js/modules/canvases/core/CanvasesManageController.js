import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton, catchPaginationClick, closeAllDropdowns } from '../../../core/utils/uiUtils.js';

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
        catchPaginationClick(e, url => this.handlePagination(url));
    }

    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchCanvas"]');
        const selectTargetRow = e.target.closest('[data-action="selectCanvas"]');
        const deselectBtn = e.target.closest('[data-action="deselectCanvas"]');
        const deleteCanvasesBtn = e.target.closest('[data-action="deleteSelectedCanvases"]');
        const createCanvasBtn = e.target.closest('[data-action="createCanvas"]');
        const createSnapshotBtn = e.target.closest('[data-action="createSnapshotSelected"]');
        
        if (searchBtn) this.toggleSearchToolbar();

        if (selectTargetRow && !e.target.closest('button')) {
            this.handleCanvasSelection(selectTargetRow);
        }

        if (deselectBtn) this.deselectCanvas();
        if (deleteCanvasesBtn && !deleteCanvasesBtn.classList.contains('disabled-interaction')) this.deleteSelectedCanvases(deleteCanvasesBtn);
        if (createCanvasBtn && !createCanvasBtn.classList.contains('disabled-interaction')) this.createCanvas(createCanvasBtn);
        if (createSnapshotBtn && !createSnapshotBtn.classList.contains('disabled-interaction')) {
            e.preventDefault();
            this.createSnapshotSelected(createSnapshotBtn);
        }

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    async createCanvas(btn) {
        const nameInput = document.querySelector('[data-ref="input-canvasname"]');
        const privacyText = document.querySelector('[data-ref="text-privacy"]');
        const sizeText = document.querySelector('[data-ref="text-size"]');
        const approvalText = document.querySelector('[data-ref="text-approval"]');
        const paletteText = document.querySelector('[data-ref="text-palette"]');
        const cooldownBatchVal = document.querySelector('[data-ref="val_cooldown_batch"]');
        const cooldownSecVal = document.querySelector('[data-ref="val_cooldown_seconds"]');
        const limitVal = document.querySelector('[data-ref="val_limit"]');

        const payload = {
            name: nameInput ? nameInput.value : __('default_canvas_name_new'),
            privacy: (privacyText && privacyText.textContent.toLowerCase().includes(__('lbl_public').toLowerCase())) ? 'public' : 'private',
            requires_approval: (approvalText && approvalText.textContent.toLowerCase().includes(__('lbl_true').toLowerCase())),
            size: sizeText ? sizeText.textContent.trim() : '64x64',
            limit: limitVal ? parseInt(limitVal.textContent) : 10,
            palette_id: 'default', 
            cooldown_pixels_batch: cooldownBatchVal ? parseInt(cooldownBatchVal.textContent) : 5,
            cooldown_seconds: cooldownSecVal ? parseInt(cooldownSecVal.textContent) : 10
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
                    banner.classList.remove('disabled'); banner.classList.add('active');
                    banner.classList.remove('disabled');
                }
                btn.classList.add('disabled-interaction');
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
                tableContainer.classList.remove('disabled-interaction');
                
            }
        }
    }

    async deleteSelectedCanvases(btn) {
        if (this.selectedCanvasIds.size === 0) return;

        const resultDialog = await window.modalSystem.show('verifyPasswordDeleteCanvases', {
            count: this.selectedCanvasIds.size,
            asyncConfirm: true
        });

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';
        const credential = resultDialog.data['credential'] || resultDialog.data['google_token'] || '';
        if (!password && !credential) {
            resultDialog.failure(window.__('err_identity_verification_required') || window.__('err_password_required'));
            return;
        }

        const payload = {
            canvas_ids: Array.from(this.selectedCanvasIds),
            password: password,
            credential: credential,
            google_token: credential
        };

        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.Delete ? ApiRoutes.Canvases.Delete : 'canvases.delete';
        try {
            const result = await this.api.post(route, payload, this.abortController.signal);
            
            if (result.aborted) return;

            if (result.success) {
                resultDialog.success();
                showMessage(result.message, 'success');
                this.selectedCanvasIds.clear();
                this.selectedCanvasUuid = null;
                this.currentCanvasSize = null;

                setTimeout(() => {
                    if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/manage`, { forceReload: true });
                    else window.location.reload();
                }, 2000);
            } else {
                resultDialog.failure(result.message);
            }
        } catch (error) {
            resultDialog.failure(window.__('err_connection'));
        }
    }

    async createSnapshotSelected(btn) {
        if (this.selectedCanvasIds.size !== 1) return;
        const canvasId = Array.from(this.selectedCanvasIds)[0];

        const executeSnapshot = async () => {
            setButtonLoading(btn);
            closeAllDropdowns();

            try {
                const route = (ApiRoutes.Canvases && ApiRoutes.Canvases.CreateSnapshot) ? ApiRoutes.Canvases.CreateSnapshot : 'canvases.create_snapshot';
                const result = await this.api.post(route, { id: parseInt(canvasId, 10) }, this.abortController.signal);

                if (result.aborted) return;

                if (result.success) {
                    showMessage(result.message, 'success');
                    this.pollSnapshotStatus(canvasId);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    showMessage(window.__('general_save_network_error'), 'error');
                }
            } finally {
                restoreButton(btn);
            }
        };

        if (window.adManager) {
            await window.adManager.showInterstitial({
                actionName: 'canvas_snapshot',
                onComplete: executeSnapshot
            });
        } else {
            await executeSnapshot();
        }
    }

    async pollSnapshotStatus(canvasId) {
        const maxAttempts = 15;
        const intervalMs = 2000;
        const signal = this.abortController ? this.abortController.signal : null;
        
        setTimeout(async () => {
            if (signal && signal.aborted) return;
            showMessage(window.__('msg_captura_processing') || 'Procesando captura del lienzo...', 'info');
        }, 1500);

        const route = (ApiRoutes.Canvases && ApiRoutes.Canvases.SnapshotStatus) ? ApiRoutes.Canvases.SnapshotStatus : 'canvases.snapshot_status';

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            
            if (signal && signal.aborted) return;
            
            try {
                const res = await this.api.post(route, { id: parseInt(canvasId, 10) }, signal);
                if (res && res.success) {
                    if (res.status === 'idle') {
                        showMessage(window.__('msg_captura_success') || '¡Captura generada y guardada con éxito!', 'success');
                        window.dispatchEvent(new CustomEvent('snapshot-created', { detail: { canvasId } }));
                        return;
                    }
                }
            } catch (err) {
                console.error('Error checking snapshot status:', err);
            }
        }
        
        if (signal && signal.aborted) return;
        showMessage(window.__('msg_captura_timeout') || 'La captura está tardando más de lo esperado en procesarse, se completará en segundo plano.', 'warning');
    }

    handleCanvasSelection(rowElement) {
        const canvasId = rowElement.getAttribute('data-canvas-id');
        const uuid = rowElement.getAttribute('data-uuid');
        const size = rowElement.getAttribute('data-size'); 
        
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
        closeAllDropdowns();
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');

        const btnEdit = document.querySelector('[data-ref="btn-nav-edit"]');
        const btnMembers = document.querySelector('[data-ref="btn-nav-members"]');
        const btnSanctions = document.querySelector('[data-ref="btn-nav-sanctions"]');
        const btnRoles = document.querySelector('[data-ref="btn-nav-roles"]');
        const btnInvites = document.querySelector('[data-ref="btn-nav-invites"]');
        const btnResets = document.querySelector('[data-ref="btn-nav-resets"]');
        const btnSnapshots = document.querySelector('[data-ref="btn-nav-snapshots"]');
        const btnResize = document.querySelector('[data-ref="btn-nav-resize"]');
        
        const btnCreateSnapshot = document.querySelector('[data-ref="btn-action-create-snapshot"]');
        const btnDelete = document.querySelector('[data-ref="btn-action-delete"]');

        const navButtons = [btnEdit, btnMembers, btnSanctions, btnRoles, btnInvites, btnResets, btnSnapshots, btnResize];

        if (this.selectedCanvasIds.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');

            if (this.selectedCanvasIds.size > 1) {
                navButtons.forEach(btn => {
                    if (btn) {
                        btn.classList.add('disabled-interaction');
                        btn.setAttribute('data-nav', '');
                    }
                });
                if (btnCreateSnapshot) btnCreateSnapshot.classList.add('disabled-interaction');
                // El botón eliminar SÍ soporta múltiple selección — no bloquearlo
                if (btnDelete) btnDelete.classList.remove('disabled-interaction');
            } else {
                navButtons.forEach(btn => {
                    if (btn) btn.classList.remove('disabled-interaction');
                });
                if (btnCreateSnapshot) btnCreateSnapshot.classList.remove('disabled-interaction');
                if (btnDelete) btnDelete.classList.remove('disabled-interaction');

                let activeUuid = this.selectedCanvasUuid;
                let activeSize = this.currentCanvasSize;
                let isOwner = false;
                let perms = [];

                const activeRow = document.querySelector('[data-action="selectCanvas"].selected');
                if (activeRow) {
                    if (!activeUuid && this.selectedCanvasIds.size === 1) {
                        activeUuid = activeRow.getAttribute('data-uuid');
                        activeSize = activeRow.getAttribute('data-size');
                        this.selectedCanvasUuid = activeUuid;
                        this.currentCanvasSize = activeSize;
                    }
                    isOwner = activeRow.getAttribute('data-is-owner') === '1';
                    try { perms = JSON.parse(activeRow.getAttribute('data-user-permissions') || '[]'); } catch(e){}
                }

                if (btnEdit) {
                    if (!isOwner && !perms.includes(2)) btnEdit.classList.add('disabled-interaction');
                    else btnEdit.setAttribute('data-nav', `${this.basePath}/canvases/edit/${activeUuid}`);
                }
                if (btnMembers) {
                    if (!isOwner && !perms.includes(3)) btnMembers.classList.add('disabled-interaction');
                    else btnMembers.setAttribute('data-nav', `${this.basePath}/canvases/members/${activeUuid}`);
                }
                if (btnSanctions) {
                    if (!isOwner && !perms.includes(8)) btnSanctions.classList.add('disabled-interaction');
                    else btnSanctions.setAttribute('data-nav', `${this.basePath}/canvases/manage/sanctions/${activeUuid}`);
                }
                if (btnRoles) {
                    if (!isOwner && !perms.includes(4)) btnRoles.classList.add('disabled-interaction');
                    else btnRoles.setAttribute('data-nav', `${this.basePath}/canvases/manage/roles/${activeUuid}`);
                }
                if (btnInvites) {
                    if (!isOwner && !perms.includes(9)) btnInvites.classList.add('disabled-interaction');
                    else btnInvites.setAttribute('data-nav', `${this.basePath}/canvases/manage/invites/${activeUuid}`);
                }
                
                if (btnResets) {
                    if (!isOwner && !perms.includes(7)) {
                        btnResets.classList.add('disabled-interaction');
                    } else {
                        btnResets.classList.remove('disabled-interaction');
                        btnResets.setAttribute('data-nav', `${this.basePath}/canvases/manage/resets/${activeUuid}`);
                    }
                }
                if (btnSnapshots) {
                    if (!isOwner && !perms.includes(6)) {
                        btnSnapshots.classList.add('disabled-interaction');
                    } else {
                        btnSnapshots.classList.remove('disabled-interaction');
                        btnSnapshots.setAttribute('data-nav', `${this.basePath}/design/s/${activeUuid}`);
                    }
                }
                if (btnCreateSnapshot) {
                    if (!isOwner && !perms.includes(10)) btnCreateSnapshot.classList.add('disabled-interaction');
                }
                
                if (btnDelete) {
                    if (!isOwner) btnDelete.classList.add('disabled-interaction');
                }
                
                if (btnResize) {
                    if (!isOwner && !perms.includes(2)) btnResize.classList.add('disabled-interaction');
                    else btnResize.setAttribute('data-nav', `${this.basePath}/canvases/manage/resize/${activeUuid}`);
                }
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
            
            navButtons.forEach(btn => {
                if (btn) btn.setAttribute('data-nav', '');
            });
            if (btnCreateSnapshot) btnCreateSnapshot.classList.add('disabled-interaction');
            if (btnDelete) btnDelete.classList.add('disabled-interaction');
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