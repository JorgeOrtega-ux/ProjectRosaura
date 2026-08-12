import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

export class CanvasSanctionsController {
    constructor() {
        this.api = new ApiService();
        this.selectedUserId = null;
        this.selectedUserUuid = null;
        this.selectedUsername = '';
        this.canvasId = null;
        this.canvasUuid = null;
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
        this.deselectSanctionRow();
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
        const isPaginationLink = url.includes('page=') || target.closest('[data-ref="pagination-container"]');

        if (isPaginationLink && url !== '#' && !url.includes('javascript:')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.handlePagination(url);
        }
    }

    handleGlobalClick(e) {
        const searchBtn = e.target.closest('[data-action="searchSanctionUser"]');
        const selectRow = e.target.closest('[data-action="selectSanctionRow"]');
        const editBtn = e.target.closest('[data-action="editSanction"]');
        const liftBtn = e.target.closest('[data-action="liftSanction"]');

        if (searchBtn) this.toggleSearchToolbar();

        if (selectRow && !e.target.closest('button')) {
            this.handleRowSelection(selectRow);
        }

        if (editBtn && !editBtn.classList.contains('disabled-interaction')) {
            this.openEditSanctionModal();
        }

        if (liftBtn && !liftBtn.classList.contains('disabled-interaction')) {
            this.liftSanction();
        }

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'sanction-search-input') {
            this.applyLocalSearch();
        }
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/canvases/manage/sanctions')) {
            this.resetViewState();
        }
    }

    resetViewState() {
        const wrapper = document.querySelector('[data-ref="manage-sanctions-wrapper"]');
        if (wrapper) {
            this.canvasId = wrapper.getAttribute('data-canvas-id');
            this.canvasUuid = wrapper.getAttribute('data-canvas-uuid');
        }

        const searchInput = document.querySelector('[data-ref="sanction-search-input"]');
        if (searchInput) searchInput.value = '';

        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar) {
            searchToolbar.classList.remove('active');
            searchToolbar.classList.add('disabled');
        }

        this.applyLocalSearch();
        this.deselectSanctionRow();
    }

    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="sanction-search-input"]');
        if (!searchToolbar) return;

        if (searchToolbar.classList.contains('disabled')) {
            searchToolbar.classList.remove('disabled');
            searchToolbar.classList.add('active');
            if (searchInput) searchInput.focus();
        } else {
            searchToolbar.classList.remove('active');
            searchToolbar.classList.add('disabled');
        }
    }

    applyLocalSearch() {
        const searchInput = document.querySelector('[data-ref="sanction-search-input"]');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');

        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }

        const rows = document.querySelectorAll('.component-table-row');
        let visibleCount = 0;

        rows.forEach(row => {
            const targets = row.querySelectorAll('.search-target');
            let text = '';
            targets.forEach(t => { text += t.textContent + ' '; });
            text = text.toLowerCase();

            if (!query || text.includes(query)) {
                row.classList.remove('disabled');
                visibleCount++;
            } else {
                row.classList.add('disabled');
            }
        });

        const emptySearchRow = document.querySelector('[data-ref="empty-search-table"]');
        if (emptySearchRow) {
            if (visibleCount === 0 && rows.length > 0) emptySearchRow.classList.remove('disabled');
            else emptySearchRow.classList.add('disabled');
        }
    }

    handleRowSelection(row) {
        const userId = row.getAttribute('data-user-id');
        const userUuid = row.getAttribute('data-user-uuid');
        const username = row.getAttribute('data-username');
        const hasSanction = row.getAttribute('data-has-sanction') === '1';

        const allRows = document.querySelectorAll('.component-table-row');
        const isSelected = row.classList.contains('selected');

        allRows.forEach(r => r.classList.remove('selected'));

        if (isSelected) {
            this.deselectSanctionRow();
        } else {
            row.classList.add('selected');
            this.selectedUserId = userId;
            this.selectedUserUuid = userUuid;
            this.selectedUsername = username;
            this.updateHeaderActions(true, hasSanction);
        }
    }

    deselectSanctionRow() {
        this.selectedUserId = null;
        this.selectedUserUuid = null;
        this.selectedUsername = '';
        const allRows = document.querySelectorAll('.component-table-row');
        allRows.forEach(r => r.classList.remove('selected'));
        this.updateHeaderActions(false, false);
    }

    updateHeaderActions(active, hasSanction = false) {
        const selectionActions = document.querySelector('[data-ref="header-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');
        const liftBtn = document.querySelector('[data-action="liftSanction"]');

        if (active) {
            if (selectionActions) selectionActions.classList.replace('disabled', 'active');
            if (defaultActions) defaultActions.classList.replace('active', 'disabled');
            if (liftBtn) {
                if (hasSanction) liftBtn.classList.remove('disabled-interaction');
                else liftBtn.classList.add('disabled-interaction');
            }
        } else {
            if (selectionActions) selectionActions.classList.replace('active', 'disabled');
            if (defaultActions) defaultActions.classList.replace('disabled', 'active');
            if (liftBtn) liftBtn.classList.add('disabled-interaction');
        }
    }

    formatDateForDB(dateStr) {
        if (!dateStr) return null;
        return dateStr.replace('T', ' ') + ':00';
    }

    async openEditSanctionModal() {
        if (!this.selectedUserId) return;

        const selectedRow = document.querySelector(`[data-user-id="${this.selectedUserId}"].selected`) || document.querySelector(`[data-user-id="${this.selectedUserId}"]`);
        const hasSanction = selectedRow ? (selectedRow.getAttribute('data-has-sanction') === '1') : false;
        const currentScope = selectedRow ? (selectedRow.getAttribute('data-sanction-scope') || 'chat_mute') : 'chat_mute';
        const currentType = selectedRow ? (selectedRow.getAttribute('data-suspension-type') || 'temporary') : 'temporary';
        const currentReason = selectedRow && hasSanction ? (selectedRow.getAttribute('data-suspension-reason') || '') : '';
        const currentEndDate = selectedRow && hasSanction ? (selectedRow.getAttribute('data-end-date') || '') : '';

        const resultDialog = await window.modalSystem.show('manageSanctionModal', {
            username: this.selectedUsername,
            sanctionScope: currentScope,
            suspensionType: currentType,
            suspensionReason: currentReason,
            endDate: currentEndDate
        });

        if (!resultDialog.confirmed) return;

        const formData = resultDialog.data || {};
        const passwordDialog = await window.modalSystem.show('verifyPasswordUpdateStatus', { asyncConfirm: true });
        if (!passwordDialog.confirmed) return;

        const password = passwordDialog.data['modal_verify_password'] ? passwordDialog.data['modal_verify_password'].trim() : '';
        if (!password) {
            passwordDialog.failure(window.__('err_admin_password_required'));
            return;
        }

        if (!formData.suspension_reason) {
            passwordDialog.failure(window.__('err_select_suspension_reason'));
            return;
        }

        const payload = {
            canvas_id: this.canvasUuid || this.canvasId,
            target_user_id: this.selectedUserUuid || this.selectedUserId,
            is_suspended: '1',
            sanction_scope: formData.sanction_scope || 'chat_mute',
            suspension_type: formData.suspension_type || 'temporary',
            suspension_reason: formData.suspension_reason,
            end_date: (formData.suspension_type === 'temporary' && formData.end_date) ? this.formatDateForDB(formData.end_date) : null,
            notify_user: false,
            password: password
        };

        try {
            const res = await this.api.post(ApiRoutes.Canvases.UpdateChatRestriction, payload, this.abortController.signal);
            if (res.aborted) return;
            
            if (res.success) {
                passwordDialog.success();
                showMessage(res.message, 'success');
                await this.handlePagination(window.location.href);
            } else {
                passwordDialog.failure(res.message);
            }
        } catch (err) {
            passwordDialog.failure(window.__('err_update_canvas'));
        }
    }

    async liftSanction(btn) {
        if (!this.selectedUserId) return;

        const passwordDialog = await window.modalSystem.show('verifyPasswordUpdateStatus', { asyncConfirm: true });
        if (!passwordDialog.confirmed) return;

        const password = passwordDialog.data['modal_verify_password'] ? passwordDialog.data['modal_verify_password'].trim() : '';
        if (!password) {
            passwordDialog.failure(window.__('err_admin_password_required'));
            return;
        }

        const selectedRow = document.querySelector(`[data-user-id="${this.selectedUserId}"].selected`);
        const sanctionScope = selectedRow ? selectedRow.getAttribute('data-sanction-scope') : 'chat_mute';

        const payload = {
            canvas_id: this.canvasUuid || this.canvasId,
            target_user_id: this.selectedUserUuid || this.selectedUserId,
            is_suspended: '0',
            sanction_scope: sanctionScope,
            password: password
        };

        try {
            const result = await this.api.post(ApiRoutes.Canvases.UpdateChatRestriction, payload, this.abortController.signal);
            if (result.aborted) return;
            if (result.success || result.status === 'success') {
                passwordDialog.success();
                showMessage(result.message || window.__('msg_sanction_removed'), 'success');
                this.handlePagination(window.location.href);
            } else {
                passwordDialog.failure(result.message || window.__('err_sanction_remove_failed'));
            }
        } catch (err) {
            passwordDialog.failure(window.__('err_sanction_remove_failed'));
        }
    }

    async handlePagination(url) {
        const tableContainer = document.querySelector('[data-ref="view-table"]');
        const currentPaginations = document.querySelectorAll('[data-ref="pagination-container"]');

        if (tableContainer) tableContainer.classList.add('disabled-interaction');

        try {
            const html = await this.api.fetchHtml(url, { signal: this.abortController ? this.abortController.signal : null });
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newTable = doc.querySelector('[data-ref="view-table"]');
            if (newTable && tableContainer) {
                tableContainer.innerHTML = newTable.innerHTML;
            }

            const newPaginations = doc.querySelectorAll('[data-ref="pagination-container"]');
            if (newPaginations.length > 0 && currentPaginations.length > 0) {
                currentPaginations.forEach((container, index) => {
                    if (newPaginations[index]) {
                        container.innerHTML = newPaginations[index].innerHTML;
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
            if (tableContainer) tableContainer.classList.remove('disabled-interaction');
        }
    }
}
