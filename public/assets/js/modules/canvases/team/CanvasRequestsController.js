// public/assets/js/modules/canvases/CanvasRequestsController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasRequestsController {
    constructor() {
        this.api = new ApiService();
        this.selectedRequestIds = new Set();
        this.canvasId = null;
        
        this.abortController = null;
        this.isInitialized = false; 
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        
        const container = document.querySelector('[data-ref="canvas-requests-container"]');
        if (container) {
            this.canvasId = container.getAttribute('data-canvas-id');
        }

        if (!this.canvasId) {
            const params = new URLSearchParams(window.location.search);
            this.canvasId = params.get('id');
        }

        this.bindEvents();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        this.selectedRequestIds.clear();
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        const selectTargetRow = e.target.closest('[data-action="selectRequest"]') || e.target.closest('tr[data-request-id]');
        
        const deselectBtn = e.target.closest('[data-action="deselectRequest"]');
        const approveBtn = e.target.closest('[data-action="approveSelectedRequests"]');
        const rejectBtn = e.target.closest('[data-action="rejectSelectedRequests"]');
        const refreshBtn = e.target.closest('[data-action="refreshRequests"]');

        if (selectTargetRow && !e.target.closest('button')) {
            this.handleRequestSelection(selectTargetRow);
        }

        if (deselectBtn) this.deselectRequest();
        
        if (approveBtn && !approveBtn.classList.contains('disabled-interactive')) this.processSelectedRequests('approve', approveBtn);
        if (rejectBtn && !rejectBtn.classList.contains('disabled-interactive')) this.processSelectedRequests('reject', rejectBtn);
        
        if (refreshBtn) this.loadRequests(); 
    }

    async loadRequests() {
        if (!this.canvasId) return;

        const tbody = document.querySelector('[data-ref="requests-table-body"]');
        
        if (tbody) {
            this.deselectRequest();
            tbody.innerHTML = this.getSkeletonHTML();
        }

        try {
            const response = await this.api.getPendingRequests(this.canvasId);

            if (response.success && response.data) {
                this.renderRequestsList(response.data);
            } else {
                this.showEmptyState(response.message || __('err_load_requests'), 'error');
            }
        } catch (error) {
            this.showEmptyState(__('err_connection'), 'error');
        }
    }

    renderRequestsList(requests) {
        const tbody = document.querySelector('[data-ref="requests-table-body"]');
        if (!tbody) return;

        if (requests.length === 0) {
            this.showEmptyState(__('canvases_requests_empty') || 'No hay solicitudes pendientes en este momento.', 'inbox');
            return;
        }

        let html = '';
        requests.forEach(req => {
            const requestDate = req.created_at ? new Date(req.created_at).toLocaleDateString() : __('lbl_recent');
            
            html += `
                <tr class="component-table-row" data-action="selectRequest" data-request-id="${req.id}">
                    <td>
                        <div class="td-user-info">
                            <div class="component-badge component-badge--sm">
                                <span class="material-symbols-rounded">person</span>
                                <span class="font-medium">${req.username || `${__('lbl_user_id')}: ${req.user_id}`}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded">calendar_today</span>
                            <span>${requestDate}</span>
                        </div>
                    </td>
                    <td>
                        <div class="component-badge component-badge--sm" style="background-color: rgba(245, 158, 11, 0.1); color: #d97706;">
                            <span class="material-symbols-rounded">pending</span>
                            <span>${__('lbl_pending')}</span>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    showEmptyState(message, icon = 'inbox') {
        const tbody = document.querySelector('[data-ref="requests-table-body"]');
        if (tbody) {
            tbody.innerHTML = `
                <tr data-ref="empty-requests-table">
                    <td colspan="3" class="component-empty-table-cell">
                        <div class="component-empty-state component-empty-state--table">
                            <span class="material-symbols-rounded component-empty-state-icon">${icon}</span>
                            <p class="component-empty-state-text">${message}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    getSkeletonHTML() {
        return `
            <tr>
                <td><div class="skeleton-box" style="height: 28px; width: 60%; border-radius: 6px;"></div></td>
                <td><div class="skeleton-box" style="height: 28px; width: 40%; border-radius: 6px;"></div></td>
                <td><div class="skeleton-box" style="height: 28px; width: 30%; border-radius: 6px;"></div></td>
            </tr>
            <tr>
                <td><div class="skeleton-box" style="height: 28px; width: 50%; border-radius: 6px;"></div></td>
                <td><div class="skeleton-box" style="height: 28px; width: 40%; border-radius: 6px;"></div></td>
                <td><div class="skeleton-box" style="height: 28px; width: 30%; border-radius: 6px;"></div></td>
            </tr>
        `;
    }

    handleRequestSelection(rowElement) {
        const requestId = rowElement.getAttribute('data-request-id');
        
        if (this.selectedRequestIds.has(requestId)) {
            this.selectedRequestIds.delete(requestId);
            rowElement.classList.remove('selected');
        } else {
            this.selectedRequestIds.add(requestId);
            rowElement.classList.add('selected');
        }

        this.updateSelectionUI();
    }

    deselectRequest() {
        this.selectedRequestIds.clear();
        
        document.querySelectorAll('[data-action="selectRequest"], tr[data-request-id]').forEach(el => el.classList.remove('selected'));
        
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');

        if (this.selectedRequestIds.size > 0) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    async processSelectedRequests(actionType, btn) {
        if (this.selectedRequestIds.size === 0) return;

        setButtonLoading(btn);

        let successCount = 0;
        let errorCount = 0;

        for (const requestId of this.selectedRequestIds) {
            let response;
            if (actionType === 'approve') {
                response = await this.api.approveCanvasRequest(requestId); 
            } else {
                response = await this.api.rejectCanvasRequest(requestId); 
            }

            if (response && response.success) {
                successCount++;
            } else {
                errorCount++;
            }
        }

        restoreButton(btn);

        if (successCount > 0) {
            const actionText = actionType === 'approve' ? __('lbl_approved_plural') : __('lbl_rejected_plural');
            showMessage(__('msg_requests_processed').replace(':count', successCount).replace(':action', actionText), 'success');
            
            this.loadRequests(); 
        } else if (errorCount > 0) {
            showMessage(__('err_process_requests'), 'error');
        }
    }
}

export { CanvasRequestsController };