import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminMessagesController {
    constructor() {
        this.api = new ApiService();
        this.selectedMessageId = null;
        this.isInitialized = false;
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.bindEvents();
        this.resetViewState();
    }
    destroy() {
        document.removeEventListener('click', this.handleGlobalClickBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        this.selectedMessageId = null;
        this.isInitialized = false;
    }
    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }
    handleGlobalClick(e) {
        const selectTargetRow = e.target.closest('[data-action="selectMessage"]');
        const deselectBtn = e.target.closest('[data-action="deselectMessage"]');
        const editVisBtn = e.target.closest('[data-action="editMessageVisibility"]');
        const viewReportsBtn = e.target.closest('[data-action="viewMessageReports"]');
        
        if (selectTargetRow && !e.target.closest('button') && !e.target.closest('a')) {
            this.handleMessageSelection(selectTargetRow);
        }
        if (deselectBtn) this.deselectMessage();
        if (editVisBtn && !editVisBtn.classList.contains('disabled-interaction')) this.editMessageVisibility();
        if (viewReportsBtn && !viewReportsBtn.classList.contains('disabled-interaction')) this.viewMessageReports();
    }
    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/messages') && !e.detail.url.includes('/admin/messages/visibility') && !e.detail.url.includes('/admin/messages/reports')) {
            this.resetViewState();
        }
    }
    resetViewState() {
        this.deselectMessage();
    }
    handleMessageSelection(rowElement) {
        const messageUuid = rowElement.getAttribute('data-message-uuid');
        if (this.selectedMessageId === messageUuid) {
            this.selectedMessageId = null;
            rowElement.classList.remove('selected');
        } else {
            this.selectedMessageId = messageUuid;
            document.querySelectorAll('[data-action="selectMessage"]').forEach(el => el.classList.remove('selected'));
            rowElement.classList.add('selected');
        }
        this.updateSelectionUI();
    }
    deselectMessage() {
        this.selectedMessageId = null;
        document.querySelectorAll('[data-action="selectMessage"]').forEach(el => el.classList.remove('selected'));
        this.updateSelectionUI();
    }
    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        const editVisBtn = document.querySelector('[data-action="editMessageVisibility"]');
        const viewReportsBtn = document.querySelector('[data-action="viewMessageReports"]');
        
        if (this.selectedMessageId) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');
            
            const isRedis = this.selectedMessageId.startsWith('REDIS-');
            [editVisBtn, viewReportsBtn].forEach(btn => {
                if (btn) {
                    if (isRedis) {
                        btn.classList.add('disabled-interaction');
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    } else {
                        btn.classList.remove('disabled-interaction');
                        btn.style.opacity = '';
                        btn.style.cursor = '';
                    }
                }
            });
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }
    editMessageVisibility() {
        if (!this.selectedMessageId) return;
        const basePath = window.AppBasePath || '';
        if (window.spaRouter) {
            window.spaRouter.navigate(`${basePath}/admin/messages/visibility/${this.selectedMessageId}`);
        } else {
            window.location.href = `${basePath}/admin/messages/visibility/${this.selectedMessageId}`;
        }
    }
    viewMessageReports() {
        if (!this.selectedMessageId) return;
        const basePath = window.AppBasePath || '';
        if (window.spaRouter) {
            window.spaRouter.navigate(`${basePath}/admin/messages/reports/${this.selectedMessageId}`);
        } else {
            window.location.href = `${basePath}/admin/messages/reports/${this.selectedMessageId}`;
        }
    }
}

export { AdminMessagesController };
