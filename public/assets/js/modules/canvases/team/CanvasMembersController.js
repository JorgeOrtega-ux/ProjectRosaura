import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { 
    showMessage, 
    setButtonLoading, 
    restoreButton, 
    catchPaginationClick,
    toggleSearchToolbar,
    handleOutsideSearchToolbarClick,
    applyLocalTableSearch
} from '../../../core/utils/uiUtils.js';

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
        this.handleGlobalChangeBound = this.handleGlobalChange.bind(this);
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
        document.removeEventListener('change', this.handleGlobalChangeBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.selectedMemberIds.clear();
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
        catchPaginationClick(e, url => {
            if(url.includes('/canvases/manage')) return;
            this.handlePagination(url);
        });
    }

    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchMember"]');
        const selectTargetRow = e.target.closest('[data-action="selectMember"]');
        const deselectBtn = e.target.closest('[data-action="deselectMember"]');
        
        const changeRoleBtn = e.target.closest('[data-action="changeMemberRole"]');
        const manageChatRestrictionBtn = e.target.closest('[data-action="manageChatRestriction"]');
        const removeMemberBtn = e.target.closest('[data-action="removeMember"]');

        if (searchBtn) toggleSearchToolbar('[data-ref="search-toolbar"]', '[data-ref="member-search-input"]');

        if (selectTargetRow && !e.target.closest('button')) {
            this.handleMemberSelection(selectTargetRow);
        }

        if (deselectBtn) this.deselectMember();
        
        if (changeRoleBtn && !changeRoleBtn.classList.contains('disabled-interaction')) this.changeMemberRole(changeRoleBtn);
        if (manageChatRestrictionBtn && !manageChatRestrictionBtn.classList.contains('disabled-interaction')) this.manageChatRestriction();
        if (removeMemberBtn && !removeMemberBtn.classList.contains('disabled-interaction')) this.removeMember();
        const saveCanvasMemberRoleSubmitBtn = e.target.closest('[data-action="saveCanvasMemberRoleSubmit"]');
        if (saveCanvasMemberRoleSubmitBtn) {
            e.preventDefault();
            this.submitCanvasMemberRoleUpdate(saveCanvasMemberRoleSubmitBtn);
        }

        handleOutsideSearchToolbarClick(e, searchBtn);
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
    
    async changeMemberRole(btn) {
        if (this.selectedMemberIds.size !== 1) return;
        
        const targetUserId = Array.from(this.selectedMemberIds)[0];
        const selectedRow = document.querySelector(`[data-member-id="${targetUserId}"]`);

        const targetUserUuid = selectedRow ? selectedRow.getAttribute('data-member-uuid') : null;

        if (!targetUserUuid) {
            showMessage(__('err_missing_user_id'), "error");
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

        if (btn) setButtonLoading(btn);
        try {
            const res = await this.api.post(ApiRoutes.Canvases.GetMemberRoleData, {
                canvas_uuid: uuid,
                target_user_uuid: targetUserUuid
            });
            if (btn) restoreButton(btn);
            if (res.success && res.data) {
                await window.modalSystem.show('changeCanvasRoleModal', res.data);
                this.updateCanvasRolesDropdownText();
            } else {
                showMessage(res.message || __('err_connection_role'), 'error');
            }
        } catch (error) {
            if (btn) restoreButton(btn);
            showMessage(__('err_connection_role'), 'error');
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

        const resultDialog = await window.modalSystem.show('confirmRemoveMembers', { count: this.selectedMemberIds.size });
        if (!resultDialog.confirmed) return;

        try {
            let successCount = 0;
            let failCount = 0;

            for (const targetUserId of this.selectedMemberIds) {
                const response = await this.api.post(ApiRoutes.Canvases.RemoveMember, {
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
                if (btnChangeRole) btnChangeRole.classList.add('disabled-interaction');
                if (btnRemove) btnRemove.classList.remove('disabled-interaction'); 
            } else {
                if (btnChangeRole) btnChangeRole.classList.remove('disabled-interaction');
                if (btnRemove) btnRemove.classList.remove('disabled-interaction');
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    applyLocalSearch() {
        applyLocalTableSearch({
            inputRef: 'member-search-input',
            containerRef: 'view-table',
            rowSelector: '[data-action="selectMember"]'
        });
    }
    handleGlobalChange(e) {
        if (e.target && e.target.classList.contains('admin-role-checkbox') && document.querySelector('[data-ref="change-role-wrapper"]')) {
            this.updateCanvasRolesDropdownText();
        }
    }
    updateCanvasRolesDropdownText() {
        const dropdownText = document.querySelector('[data-module="dropdownCanvasRolesList"]').closest('.component-dropdown-wrapper').querySelector('.component-dropdown-text');
        if (!dropdownText) return;
        const checkedCheckboxes = document.querySelectorAll('input[name="new_member_roles[]"]:checked');
        if (checkedCheckboxes.length === 0) {
            dropdownText.textContent = window.__('lbl_select_roles');
        } else {
            const names = Array.from(checkedCheckboxes).map(cb => {
                const label = cb.closest('label');
                const span = label ? label.querySelector('span') : null;
                return span ? span.textContent.trim() : '';
            }).filter(Boolean);
            dropdownText.textContent = names.join(', ');
        }
    }
    async submitCanvasMemberRoleUpdate(btn) {
        const modalBody = document.querySelector('[data-ref="change-role-wrapper"]');
        if (!modalBody) return;
        const canvasId = modalBody.getAttribute('data-canvas-id');
        const targetUserId = modalBody.getAttribute('data-target-user-id');
        
        const selectedRoleInputs = document.querySelectorAll('input[name="new_member_roles[]"]:checked');
        if (selectedRoleInputs.length === 0) {
            showMessage(__('err_select_role'), 'warning');
            return;
        }
        const selectedRoles = Array.from(selectedRoleInputs).map(input => input.value);
        
        setButtonLoading(btn);
        try {
            const response = await this.api.post(ApiRoutes.Canvases.AssignMemberRole, {
                canvas_id: canvasId,
                target_user_id: targetUserId,
                roles: selectedRoles
            });
            
            if (response.success) {
                showMessage(response.message, "success");
                window.modalSystem.closeCurrent();
                this.handlePagination(window.location.href);
            } else {
                showMessage(response.message, "error");
                restoreButton(btn);
            }
        } catch (error) {
            showMessage(__('err_connection_role'), "error");
            restoreButton(btn);
        }
    }
}

export { CanvasMembersController };