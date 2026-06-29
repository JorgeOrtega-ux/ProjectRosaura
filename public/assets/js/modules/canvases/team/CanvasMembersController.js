// public/assets/js/modules/canvases/CanvasMembersController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasMembersController {
    constructor() {
        this.api = new ApiService();
        this.selectedMemberIds = new Set();
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
        this.selectedMemberIds.clear();
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
            if(url.includes('/canvases/manage')) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.handlePagination(url);
        }
    }

    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchMember"]');
        const selectTargetRow = e.target.closest('[data-action="selectMember"]');
        const deselectBtn = e.target.closest('[data-action="deselectMember"]');
        
        const changeRoleBtn = e.target.closest('[data-action="changeMemberRole"]');
        const removeMemberBtn = e.target.closest('[data-action="removeMember"]');

        if (searchBtn) this.toggleSearchToolbar();

        if (selectTargetRow && !e.target.closest('button')) {
            this.handleMemberSelection(selectTargetRow);
        }

        if (deselectBtn) this.deselectMember();
        
        if (changeRoleBtn && !changeRoleBtn.classList.contains('disabled-interactive')) this.changeMemberRole();
        if (removeMemberBtn && !removeMemberBtn.classList.contains('disabled-interactive')) this.removeMember();

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'member-search-input') {
            this.applyLocalSearch();
        }
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/canvases/members')) {
            this.resetViewState();
        }
    }

    resetViewState() {
        const searchInput = document.querySelector('[data-ref="member-search-input"]');
        if (searchInput) searchInput.value = '';
        
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar) {
            searchToolbar.classList.remove('active');
            searchToolbar.classList.add('disabled');
        }

        this.applyLocalSearch();
        this.deselectMember(); 
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
    
    changeMemberRole() {
        if (this.selectedMemberIds.size !== 1) return;
        
        const targetUserId = Array.from(this.selectedMemberIds)[0];
        const selectedRow = document.querySelector(`[data-member-id="${targetUserId}"]`);
        
        // Obtenemos el UUID en lugar del ID numérico para la URL
        const targetUserUuid = selectedRow ? selectedRow.getAttribute('data-member-uuid') : null;

        if (!targetUserUuid) {
            showMessage("Error: No se pudo obtener el identificador del usuario.", "error");
            return;
        }
        
        const pathParts = window.location.pathname.split('/');
        let uuid = pathParts[pathParts.length - 1];
        if (uuid.includes('?')) {
            uuid = uuid.split('?')[0];
        }

        if (!uuid) {
            showMessage(__('err_missing_canvas_id'), "error");
            return;
        }

        // Redirección utilizando el UUID del usuario
        const routeUrl = `${this.basePath}/canvases/members/${uuid}/role/${targetUserUuid}`;
        if (window.spaRouter) {
            window.spaRouter.navigate(routeUrl);
        } else {
            window.location.href = routeUrl;
        }
    }

    async removeMember() {
        if (this.selectedMemberIds.size === 0) return;
        
        const wrapper = document.querySelector('[data-ref="manage-members-wrapper"]');
        const canvasId = wrapper ? wrapper.getAttribute('data-canvas-id') : null;

        if (!canvasId) {
            showMessage(__('err_missing_canvas_id'), "error");
            return;
        }

        const resultDialog = await window.dialogSystem.show('confirmRemoveMembers', { count: this.selectedMemberIds.size });
        if (!resultDialog.confirmed) return;

        try {
            let successCount = 0;
            let failCount = 0;

            for (const targetUserId of this.selectedMemberIds) {
                const response = await this.api.post('canvases.remove_member', {
                    canvas_id: canvasId,
                    target_user_id: targetUserId
                });
                
                if (response.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            if (successCount > 0) {
                showMessage(__('msg_members_removed').replace(':count', successCount), "success");
                this.selectedMemberIds.clear();
                this.handlePagination(window.location.href); 
            }
            if (failCount > 0) {
                showMessage(__('err_members_remove_failed').replace(':count', failCount), "warning");
            }
            
        } catch (error) {
            showMessage(__('err_connection_remove'), "error");
        }
    }

    handleMemberSelection(rowElement) {
        const memberId = rowElement.getAttribute('data-member-id');
        
        if (this.selectedMemberIds.has(memberId)) {
            this.selectedMemberIds.delete(memberId);
            rowElement.classList.remove('selected');
        } else {
            this.selectedMemberIds.add(memberId);
            rowElement.classList.add('selected');
        }

        this.updateSelectionUI();
    }

    deselectMember() {
        this.selectedMemberIds.clear();
        document.querySelectorAll('[data-action="selectMember"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');

        const btnChangeRole = document.querySelector('[data-action="changeMemberRole"]');
        const btnRemove = document.querySelector('[data-action="removeMember"]');

        if (this.selectedMemberIds.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');

            if (this.selectedMemberIds.size > 1) {
                if (btnChangeRole) btnChangeRole.classList.add('disabled-interactive');
                if (btnRemove) btnRemove.classList.remove('disabled-interactive'); 
            } else {
                if (btnChangeRole) btnChangeRole.classList.remove('disabled-interactive');
                if (btnRemove) btnRemove.classList.remove('disabled-interactive');
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="member-search-input"]');

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
        const queryInput = document.querySelector('[data-ref="member-search-input"]');
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
        const items = container.querySelectorAll('[data-action="selectMember"]');
        
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

export { CanvasMembersController };