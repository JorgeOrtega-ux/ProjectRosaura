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
        const deleteCanvasesBtn = e.target.closest('[data-action="deleteSelectedCanvases"]');
        const createCanvasBtn = e.target.closest('[data-action="createCanvas"]');
        const createSnapshotBtn = e.target.closest('[data-action="createSnapshotSelected"]');
        
        if (searchBtn) this.toggleSearchToolbar();

        if (selectTargetRow && !e.target.closest('button')) {
            this.handleCanvasSelection(selectTargetRow);
        }

        const syncBtn = e.target.closest('[data-action="syncOfflineSandboxes"]');
        if (syncBtn && !syncBtn.classList.contains('disabled-interaction')) {
            this.syncOfflineSandboxes(syncBtn);
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
        const inputOfficial = document.querySelector('[data-ref="val_is_official"]');

        const payload = {
            name: nameInput ? nameInput.value : __('default_canvas_name_new'),
            privacy: (privacyText && privacyText.textContent.toLowerCase().includes(__('lbl_public').toLowerCase())) ? 'public' : 'private',
            requires_approval: (approvalText && approvalText.textContent.toLowerCase().includes(__('lbl_true').toLowerCase())),
            size: sizeText ? sizeText.textContent.trim() : '64x64',
            limit: limitVal ? parseInt(limitVal.textContent) : 10,
            palette_id: 'default', 
            cooldown_pixels_batch: cooldownBatchVal ? parseInt(cooldownBatchVal.textContent) : 5,
            cooldown_seconds: cooldownSecVal ? parseInt(cooldownSecVal.textContent) : 10,
            is_official: inputOfficial ? (inputOfficial.checked ? 1 : 0) : 0
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

        this.insertSandboxRows();
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
                tableContainer.classList.remove('disabled-interaction');
                
            }
        }
    }

    async deleteSelectedCanvases(btn) {
        if (this.selectedCanvasIds.size === 0) return;

        const activeUuid = this.selectedCanvasUuid;
        const isSandbox = activeUuid && activeUuid.startsWith('sandbox_');

        if (isSandbox) {
            const resultDialog = await window.modalSystem.show('confirmDeleteSandbox');
            if (!resultDialog.confirmed) return;

            setButtonLoading(btn);

            const realUuid = activeUuid.replace('sandbox_', '');

            // 1. Delete from localStorage list
            let localList = [];
            try {
                const listJson = localStorage.getItem('rosaura_sandboxes_list');
                if (listJson) localList = JSON.parse(listJson);
            } catch (e) {}

            const filteredList = localList.filter(s => s.uuid !== realUuid);
            localStorage.setItem('rosaura_sandboxes_list', JSON.stringify(filteredList));

            // 2. Delete from IndexedDB
            try {
                const DesignSandboxDbModule = await import('../../app/design/DesignSandboxDb.js');
                const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;
                await DesignSandboxDb.deleteSandboxData(realUuid);
            } catch (e) {
                console.error('[Sandbox Delete] Failed to delete from IndexedDB:', e);
            }

            // 3. Optional: Delete from server if logged in
            const activeUserId = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
            if (activeUserId) {
                try {
                    await this.api.post('sandbox.delete', { uuid: realUuid });
                } catch (e) {}
            }

            restoreButton(btn);
            showMessage('Lienzo Sandbox eliminado con éxito', 'success');
            
            this.selectedCanvasIds.clear();
            this.selectedCanvasUuid = null;
            this.currentCanvasSize = null;

            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/manage`, { forceReload: true });
                else window.location.reload();
            }, 1000);
            return;
        }

        const resultDialog = await window.modalSystem.show('verifyPasswordDeleteCanvases', { count: this.selectedCanvasIds.size });

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

    async createSnapshotSelected(btn) {
        if (this.selectedCanvasIds.size !== 1) return;
        const canvasId = Array.from(this.selectedCanvasIds)[0];
        setButtonLoading(btn);

        try {
            const route = (ApiRoutes.Canvases && ApiRoutes.Canvases.CreateSnapshot) ? ApiRoutes.Canvases.CreateSnapshot : 'canvases.create_snapshot';
            const result = await this.api.post(route, { id: parseInt(canvasId, 10) }, this.abortController.signal);

            if (result.aborted) return;

            if (result.success) {
                showMessage(result.message, 'success');
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(window.__('general_save_network_error') || 'Error', 'error');
        } finally {
            restoreButton(btn);
        }
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
        const cloudOnlyButtons = [btnMembers, btnSanctions, btnRoles, btnInvites, btnResets, btnSnapshots, btnResize, btnCreateSnapshot];

        if (this.selectedCanvasIds.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');

            if (this.selectedCanvasIds.size > 1) {
                // If multiple selected, check if any is a sandbox
                let hasSandbox = false;
                document.querySelectorAll('[data-action="selectCanvas"].selected').forEach(row => {
                    if (row.getAttribute('data-is-sandbox') === 'true') {
                        hasSandbox = true;
                    }
                });

                navButtons.forEach(btn => {
                    if (btn) {
                        btn.classList.add('disabled-interaction');
                        btn.setAttribute('data-nav', '');
                    }
                });
                if (btnCreateSnapshot) btnCreateSnapshot.classList.add('disabled-interaction');
                if (btnDelete) {
                    if (hasSandbox) {
                        btnDelete.classList.add('disabled-interaction');
                    } else {
                        btnDelete.classList.remove('disabled-interaction');
                    }
                }
            } else {
                const activeRow = document.querySelector('[data-action="selectCanvas"].selected');
                const isSandbox = activeRow && activeRow.getAttribute('data-is-sandbox') === 'true';

                if (isSandbox) {
                    // Hide all cloud-only buttons by adding .disabled class
                    cloudOnlyButtons.forEach(btn => {
                        if (btn) btn.classList.add('disabled');
                    });

                    // Ensure edit and delete are NOT hidden and are active
                    if (btnEdit) {
                        btnEdit.classList.remove('disabled');
                        btnEdit.classList.remove('disabled-interaction');
                        btnEdit.setAttribute('data-nav', `${this.basePath}/canvases/edit/${this.selectedCanvasUuid}`);
                    }
                    if (btnDelete) {
                        btnDelete.classList.remove('disabled');
                        btnDelete.classList.remove('disabled-interaction');
                    }
                } else {
                    // Ensure cloud buttons are visible (remove .disabled)
                    cloudOnlyButtons.forEach(btn => {
                        if (btn) btn.classList.remove('disabled');
                    });
                    if (btnEdit) btnEdit.classList.remove('disabled');

                    navButtons.forEach(btn => {
                        if (btn) btn.classList.remove('disabled-interaction');
                    });
                    if (btnCreateSnapshot) btnCreateSnapshot.classList.remove('disabled-interaction');
                    if (btnDelete) btnDelete.classList.remove('disabled-interaction');

                    let activeUuid = this.selectedCanvasUuid;
                    let activeSize = this.currentCanvasSize;
                    let isOwner = false;
                    let perms = [];

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
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
            
            // Remove all .disabled overrides so the default state looks clean
            cloudOnlyButtons.forEach(btn => {
                if (btn) btn.classList.remove('disabled');
            });
            if (btnEdit) btnEdit.classList.remove('disabled');

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

    insertSandboxRows() {
        const tbody = document.querySelector('[data-ref="view-table"] tbody');
        if (!tbody) return;

        // Remove any existing sandbox rows to avoid duplication
        tbody.querySelectorAll('[data-is-sandbox="true"]').forEach(row => row.remove());

        let localList = [];
        try {
            const listJson = localStorage.getItem('rosaura_sandboxes_list');
            if (listJson) localList = JSON.parse(listJson);
        } catch (e) {}

        if (localList.length === 0) return;

        const activeUserId = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;

        // Insert at the beginning of the table body
        localList.forEach(sb => {
            const row = document.createElement('tr');
            row.className = 'component-table-row';
            row.setAttribute('data-action', 'selectCanvas');
            row.setAttribute('data-canvas-id', `sandbox_${sb.uuid}`);
            row.setAttribute('data-uuid', `sandbox_${sb.uuid}`);
            row.setAttribute('data-size', `${sb.width || sb.size || 64}x${sb.height || sb.size || 64}`);
            row.setAttribute('data-is-owner', '1');
            row.setAttribute('data-is-sandbox', 'true');
            row.setAttribute('data-user-permissions', '[]');

            // Format date
            let dateStr = '-';
            if (sb.createdAt) {
                const date = new Date(sb.createdAt);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                dateStr = `${day}/${month}/${year}`;
            }

            // Sync status and tooltip
            let syncStatusHtml = '';
            let syncTooltip = 'No sincronizado con la nube';
            const isSynced = activeUserId && sb.syncedAt;
            if (isSynced) {
                const syncDate = new Date(sb.syncedAt);
                const day = String(syncDate.getDate()).padStart(2, '0');
                const month = String(syncDate.getMonth() + 1).padStart(2, '0');
                const year = syncDate.getFullYear();
                const hours = String(syncDate.getHours()).padStart(2, '0');
                const minutes = String(syncDate.getMinutes()).padStart(2, '0');
                syncTooltip = `Sincronizado: ${day}/${month}/${year} ${hours}:${minutes}`;
                
                syncStatusHtml = `
                    <div class="component-badge component-badge--sm" data-tooltip="${syncTooltip}" data-position="top">
                        <span class="material-symbols-rounded" style="color: #4caf50; font-weight: bold;">cloud_done</span>
                        <span class="search-target">Sincronizado</span>
                    </div>
                `;
            } else {
                syncStatusHtml = `
                    <div class="component-badge component-badge--sm" data-tooltip="${syncTooltip}" data-position="top">
                        <span class="material-symbols-rounded" style="color: #ff9800; font-weight: bold;">cloud_off</span>
                        <span class="search-target">Local</span>
                    </div>
                `;
            }

            row.innerHTML = `
                <td>
                    <div class="td-user-info">
                        <div class="component-badge component-badge--sm component-badge--warning">
                            <span class="material-symbols-rounded">science</span>
                            <span class="search-target">${this.escapeHtml(sb.name || 'Sandbox')}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="component-badge component-badge--sm component-badge--primary">
                        <span>Propietario</span>
                    </div>
                </td>
                <td>
                    <div class="component-badge component-badge--sm component-badge--warning">
                        <span class="material-symbols-rounded">science</span>
                        <span class="search-target">Sandbox</span>
                    </div>
                </td>
                <td>
                    ${syncStatusHtml}
                </td>
                <td>
                    <div class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">aspect_ratio</span>
                        <span class="search-target">${sb.width || sb.size || 64}x${sb.height || sb.size || 64}</span>
                    </div>
                </td>
                <td>
                    <div class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">groups</span>
                        <span class="search-target">-</span>
                    </div>
                </td>
                <td>
                    <div class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">favorite</span>
                        <span class="search-target">-</span>
                    </div>
                </td>
                <td>
                    <div class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">calendar_month</span>
                        <span>${dateStr}</span>
                    </div>
                </td>
            `;
            // Insert at top of tbody
            tbody.insertBefore(row, tbody.firstChild);
        });

        // Initialize tooltips on dynamically added elements
        if (window.TooltipSystem && typeof window.TooltipSystem.initialize === 'function') {
            window.TooltipSystem.initialize();
        }
    }

    syncOfflineSandboxes(btn) {
        const activeUserId = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
        if (!activeUserId) {
            showMessage('Inicia sesión para sincronizar tus sandboxes en la nube.', 'warning');
            return;
        }

        setButtonLoading(btn);

        this.api.post('sandbox.sync_list', { sandboxes: [] })
            .then(async response => {
                if (response && response.success && response.sandboxes) {
                    let localList = [];
                    try {
                        const listJson = localStorage.getItem('rosaura_sandboxes_list');
                        if (listJson) localList = JSON.parse(listJson);
                    } catch (e) {}

                    const sandboxesToSync = localList.map(sb => ({
                        uuid: sb.uuid,
                        name: sb.name || 'Sandbox',
                        width: parseInt(sb.size || sb.width || 64, 10),
                        height: parseInt(sb.size || sb.height || 64, 10),
                        palette: sb.palette || 'default',
                        cooldownBatch: parseInt(sb.cooldownBatch || sb.cooldown_batch || 100, 10)
                    }));

                    const syncRes = await this.api.post('sandbox.sync_list', { sandboxes: sandboxesToSync });

                    if (syncRes && syncRes.success && syncRes.sandboxes) {
                        const cloudList = syncRes.sandboxes;
                        const DesignSandboxDbModule = await import('../../app/design/DesignSandboxDb.js');
                        const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

                        const updatedLocalList = [];

                        for (const cloudSb of cloudList) {
                            const localMatch = localList.find(s => s.uuid === cloudSb.uuid);
                            
                            if (!localMatch) {
                                try {
                                    const stateRes = await this.api.post('sandbox.get_state', { uuid: cloudSb.uuid });
                                    if (stateRes && stateRes.success && stateRes.settings) {
                                        await DesignSandboxDb.saveSettings(stateRes.settings, cloudSb.uuid);
                                        if (stateRes.chunks) {
                                            for (const [key, base64Data] of Object.entries(stateRes.chunks)) {
                                                await DesignSandboxDb.saveChunk(key, base64Data, cloudSb.uuid);
                                            }
                                        }
                                    }
                                } catch (err) {
                                    console.warn('[Lobby Sync] Failed to download state for sandbox:', cloudSb.uuid, err);
                                }
                            }

                            updatedLocalList.push({
                                uuid: cloudSb.uuid,
                                name: cloudSb.name,
                                size: cloudSb.width,
                                width: cloudSb.width,
                                height: cloudSb.height,
                                palette: cloudSb.palette,
                                cooldownBatch: cloudSb.cooldownBatch,
                                createdAt: localMatch ? (localMatch.createdAt || Date.now()) : Date.now(),
                                syncedAt: Date.now()
                            });
                        }

                        localStorage.setItem('rosaura_sandboxes_list', JSON.stringify(updatedLocalList));
                        
                        this.insertSandboxRows();
                        showMessage('Sincronización de sandboxes completada con éxito', 'success');
                    } else {
                        showMessage('Error al sincronizar con la nube', 'error');
                    }
                } else {
                    showMessage('Error al sincronizar con la nube', 'error');
                }
            })
            .catch(e => {
                console.error('[Sync] Error synchronizing sandboxes:', e);
                showMessage('Error al sincronizar con la nube', 'error');
            })
            .finally(() => {
                restoreButton(btn);
            });
    }

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

export { CanvasesManageController };