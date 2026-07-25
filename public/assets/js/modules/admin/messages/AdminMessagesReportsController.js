import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminMessagesReportsController {
    constructor() {
        this.api = new ApiService();
        this.selectedReportId = null;
        this.messageUuid = null;
        this.state = {
            visibility: 'visible',
            deletedBy: 'admin',
            deleteReason: ''
        };
        this.initialState = null;
        this.basePath = window.AppBasePath || '';
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.bindEvents();
        this.setupInitialState();
    }

    destroy() {
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        this.selectedReportId = null;
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/messages/reports')) {
            this.setupInitialState();
        }
    }

    setupInitialState() {
        const viewContent = document.querySelector('[data-ref="admin-message-reports-view"]');
        if (!viewContent) return;

        this.messageUuid = viewContent.getAttribute('data-message-uuid');
        this.state.visibility = viewContent.getAttribute('data-visibility') || 'visible';
        this.state.deletedBy = viewContent.getAttribute('data-deleted-by') || 'admin';
        this.state.deleteReason = viewContent.getAttribute('data-delete-reason') || '';
        this.initialState = Object.assign({}, this.state);

        this.resetReportSelection();
        this.renderUI();
    }

    async handleClick(e) {
        if (!window.location.pathname.includes('/admin/messages/reports')) return;

        const selectReportRow = e.target.closest('[data-action="selectReport"]');
        const deselectBtn = e.target.closest('[data-action="deselectReport"]');
        const markReviewedBtn = e.target.closest('[data-action="markReportReviewed"]');
        const markDismissedBtn = e.target.closest('[data-action="markReportDismissed"]');
        const markPendingBtn = e.target.closest('[data-action="markReportPending"]');
        
        const dropdownItem = e.target.closest('[data-action="adminSetDropdown"]');
        const submitVisBtn = e.target.closest('[data-action="submitVisibilityUpdate"]');

        if (selectReportRow && !e.target.closest('button') && !e.target.closest('a')) {
            this.handleReportSelection(selectReportRow);
        }
        if (deselectBtn) this.deselectReport();

        if (markReviewedBtn) {
            await this.updateSelectedReportStatus('reviewed', markReviewedBtn);
            const mod = markReviewedBtn.closest('[data-module]');
            if (mod) mod.classList.add('disabled');
        }
        if (markDismissedBtn) {
            await this.updateSelectedReportStatus('dismissed', markDismissedBtn);
            const mod = markDismissedBtn.closest('[data-module]');
            if (mod) mod.classList.add('disabled');
        }
        if (markPendingBtn) {
            await this.updateSelectedReportStatus('pending', markPendingBtn);
            const mod = markPendingBtn.closest('[data-module]');
            if (mod) mod.classList.add('disabled');
        }

        if (dropdownItem) {
            const key = dropdownItem.getAttribute('data-key');
            const value = dropdownItem.getAttribute('data-value');
            if (key && value) {
                this.state[key] = value;
                this.renderUI();
                this.checkForChanges();

                const module = dropdownItem.closest('[data-module]');
                if (module) module.classList.add('disabled');
            }
        }

        if (submitVisBtn && !submitVisBtn.classList.contains('disabled-interaction')) {
            await this.submitVisibilityUpdate(submitVisBtn);
        }
    }

    handleReportSelection(rowElement) {
        const reportId = rowElement.getAttribute('data-report-id');
        if (this.selectedReportId === reportId) {
            this.deselectReport();
        } else {
            this.selectedReportId = reportId;
            document.querySelectorAll('[data-action="selectReport"]').forEach(el => el.classList.remove('selected'));
            rowElement.classList.add('selected');
            this.updateSelectionUI();
        }
    }

    deselectReport() {
        this.selectedReportId = null;
        document.querySelectorAll('[data-action="selectReport"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }

    resetReportSelection() {
        this.deselectReport();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');

        if (this.selectedReportId) {
            if (defaultMode) { defaultMode.classList.remove('active'); defaultMode.classList.add('disabled'); }
            if (selectionMode) { selectionMode.classList.remove('disabled'); selectionMode.classList.add('active'); }
        } else {
            if (selectionMode) { selectionMode.classList.remove('active'); selectionMode.classList.add('disabled'); }
            if (defaultMode) { defaultMode.classList.remove('disabled'); defaultMode.classList.add('active'); }
        }
    }

    renderUI() {
        const visText = document.querySelector('[data-ref="admin-visibility-text"]');
        const visIcon = document.querySelector('[data-ref="admin-visibility-icon"]');
        const labels = {
            'visible': typeof window.__ === 'function' ? window.__('msg_visibility_visible') : 'Visible',
            'under_review': typeof window.__ === 'function' ? window.__('msg_visibility_under_review') : 'En revisión',
            'deleted': typeof window.__ === 'function' ? window.__('msg_visibility_deleted') : 'Eliminado'
        };
        const icons = {
            'visible': 'check_circle',
            'under_review': 'pending',
            'deleted': 'delete'
        };
        if (visText) visText.textContent = labels[this.state.visibility] || this.state.visibility;
        if (visIcon) visIcon.textContent = icons[this.state.visibility] || 'visibility';

        document.querySelectorAll('[data-module="moduleVisibilityStatus"] .component-menu-link').forEach(link => {
            if (link.getAttribute('data-value') === this.state.visibility) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    checkForChanges() {
        const saveBtn = document.querySelector('[data-action="submitVisibilityUpdate"]');
        if (!saveBtn || !this.initialState) return;

        const isChanged = (this.state.visibility !== this.initialState.visibility);

        if (isChanged) {
            saveBtn.classList.remove('disabled-interaction');
        } else {
            saveBtn.classList.add('disabled-interaction');
        }
    }

    async updateSelectedReportStatus(status, btnElement) {
        if (!this.selectedReportId) return;
        setButtonLoading(btnElement);
        try {
            const response = await this.api.post(ApiRoutes.Admin.UpdateReportStatus, {
                report_id: this.selectedReportId,
                status: status
            });

            if (response && response.success) {
                showMessage(response.message || 'Estado actualizado', 'success');
                const row = document.querySelector(`[data-report-id="${this.selectedReportId}"]`);
                if (row) {
                    const badge = row.querySelector('[data-ref="report-status-badge"]');
                    if (badge) {
                        badge.className = 'component-badge component-badge--sm component-badge--' + 
                            (status === 'reviewed' ? 'success' : (status === 'dismissed' ? 'muted' : 'warning'));
                        const labels = {
                            pending: 'Pendiente',
                            reviewed: 'Revisado',
                            dismissed: 'Desestimado'
                        };
                        badge.textContent = labels[status] || status;
                    }
                }
                this.deselectReport();
            } else {
                showMessage(response.message || 'Error al actualizar estado', 'error');
            }
        } catch (error) {
            showMessage(error.message || 'Error de conexión', 'error');
        } finally {
            restoreButton(btnElement);
        }
    }

    async submitVisibilityUpdate(btnElement) {
        if (!this.messageUuid) return;

        let deleteReason = null;

        if (this.state.visibility === 'deleted') {
            if (window.dialogSystem) {
                const dialogRes = await window.dialogSystem.show('deleteMessageDialog');
                if (!dialogRes) {
                    this.state = Object.assign({}, this.initialState);
                    this.renderUI();
                    return; // Admin se arrepintió o cerró el modal
                }

                if (dialogRes.report_reason) {
                    deleteReason = window.__('report_reason_' + dialogRes.report_reason);
                } else {
                    deleteReason = 'Moderación administrativa';
                }
            } else {
                deleteReason = prompt('Motivo de eliminación:');
                if (deleteReason === null) {
                    this.state = Object.assign({}, this.initialState);
                    this.renderUI();
                    return;
                }
            }
            this.state.deleteReason = deleteReason;
        }

        setButtonLoading(btnElement);
        try {
            const payload = {
                uuid: this.messageUuid,
                visibility: this.state.visibility,
                deleted_by: 'admin',
                delete_reason: this.state.visibility === 'deleted' ? this.state.deleteReason : null
            };

            const response = await this.api.post(ApiRoutes.Admin.UpdateMessageVisibility, payload);
            if (response && response.success) {
                showMessage(response.message || 'Visibilidad actualizada correctamente', 'success');
                this.initialState = JSON.parse(JSON.stringify(this.state));
                this.checkForChanges();
            } else {
                showMessage(response.message || 'Error al actualizar visibilidad', 'error');
            }
        } catch (error) {
            showMessage(error.message || 'Error de conexión', 'error');
        } finally {
            restoreButton(btnElement);
        }
    }
}

export { AdminMessagesReportsController };
