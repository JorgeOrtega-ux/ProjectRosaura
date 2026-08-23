import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';

class AdminBackupsRestoreController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.container = null;
        this.abortController = null;
        this.isRestoring = false;
        this.pollTimeout = null;
        this._isPollingActive = false;
        this.schemaData = {};
        this.selectedState = {};
        this.expandedAccordions = {};

        this._boundClick = this.handleClick.bind(this);
        this._boundChange = this.handleChange.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="admin-backup-restore-wrapper"]');
        this.abortController = new AbortController();
        this.bindEvents();
        this._initSchema();
        this._validateState();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this._isPollingActive = false;
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
        if (this.container) {
            this.container.removeEventListener('click', this._boundClick);
            this.container.removeEventListener('change', this._boundChange);
        }
    }

    bindEvents() {
        if (this.container) {
            this.container.addEventListener('click', this._boundClick);
            this.container.addEventListener('change', this._boundChange);
        }
    }

    handleClick(e) {
        const executeBtn = e.target.closest('[data-action="executeRestore"]');
        if (executeBtn && !executeBtn.classList.contains('disabled-interaction')) {
            this._executeRestore(executeBtn);
            return;
        }

        const accordionHeader = e.target.closest('[data-action="toggleAccordion"]');
        if (accordionHeader) {
            if (e.target.closest('[data-action="preventAccordion"]')) return;
            this._toggleAccordion(accordionHeader);
        }
    }

    handleChange(e) {
        if (e.target && e.target.classList.contains('restore-schema-db-cb')) {
            this._handleDbToggle(e.target);
            return;
        }

        if (e.target && e.target.classList.contains('restore-schema-table-cb')) {
            this._handleTableToggle(e.target);
            return;
        }

        if (e.target && e.target.getAttribute('data-ref') === 'toggle-restore-lock') {
            this._validateState();
        }
    }

    _initSchema() {
        const schemaElement = this.container ? this.container.querySelector('[data-ref="restore-available-schema"]') : null;
        if (!schemaElement) return;

        try {
            this.schemaData = JSON.parse(schemaElement.textContent);
            this.selectedState = {};
            for (const [dbName, tables] of Object.entries(this.schemaData)) {
                this.selectedState[dbName] = [...tables];
                this.expandedAccordions[dbName] = false;
            }
        } catch (e) {
            this.schemaData = {};
            this.selectedState = {};
        }
    }

    _toggleAccordion(header) {
        const dbName = header.getAttribute('data-db');
        const accordion = header.closest('.component-accordion');
        if (!accordion) return;

        this.expandedAccordions[dbName] = !this.expandedAccordions[dbName];
        accordion.classList.toggle('active', this.expandedAccordions[dbName]);
    }

    _handleDbToggle(checkbox) {
        const dbName = checkbox.value;
        const isChecked = checkbox.checked;
        const tables = this.schemaData[dbName] || [];

        if (isChecked) {
            this.selectedState[dbName] = [...tables];
        } else {
            this.selectedState[dbName] = [];
        }

        const tableCheckboxes = this.container ? this.container.querySelectorAll(`.restore-schema-table-cb[data-db="${dbName}"]`) : [];
        tableCheckboxes.forEach(cb => {
            cb.checked = isChecked;
        });

        this._updateBadge(dbName);
        this._validateState();
    }

    _handleTableToggle(checkbox) {
        const dbName = checkbox.getAttribute('data-db');
        const tableName = checkbox.value;
        const isChecked = checkbox.checked;

        if (!this.selectedState[dbName]) {
            this.selectedState[dbName] = [];
        }

        if (isChecked) {
            if (!this.selectedState[dbName].includes(tableName)) {
                this.selectedState[dbName].push(tableName);
            }
        } else {
            this.selectedState[dbName] = this.selectedState[dbName].filter(t => t !== tableName);
        }

        const dbCheckbox = this.container ? this.container.querySelector(`.restore-schema-db-cb[value="${dbName}"]`) : null;
        if (dbCheckbox) {
            dbCheckbox.checked = this.selectedState[dbName].length > 0;
        }

        this._updateBadge(dbName);
        this._validateState();
    }

    _updateBadge(dbName) {
        const badge = this.container ? this.container.querySelector(`[data-badge="${dbName}"]`) : null;
        if (!badge) return;

        const selectedCount = this.selectedState[dbName] ? this.selectedState[dbName].length : 0;
        const totalCount = this.schemaData[dbName] ? this.schemaData[dbName].length : 0;

        badge.textContent = window.__('backup_restore_tables_selected', { selected: selectedCount, total: totalCount });
    }

    _validateState() {
        const confirmBtn = this.container ? this.container.querySelector('[data-ref="btn-confirm-restore"]') : null;
        if (!confirmBtn) return;

        let hasSelectedTable = false;
        for (const tables of Object.values(this.selectedState)) {
            if (tables.length > 0) {
                hasSelectedTable = true;
                break;
            }
        }

        const lockCheckbox = this.container ? this.container.querySelector('[data-ref="toggle-restore-lock"]') : null;
        const isUnlocked = lockCheckbox ? lockCheckbox.checked : false;

        if (hasSelectedTable && isUnlocked) {
            confirmBtn.classList.remove('disabled-interaction');
        } else {
            confirmBtn.classList.add('disabled-interaction');
        }
    }

    async _executeRestore(btn) {
        if (this.isRestoring) return;

        const backupId = this.container ? this.container.getAttribute('data-backup-id') : null;
        if (!backupId) {
            showMessage(window.__('err_start_restore'), 'error');
            return;
        }

        const payloadSchema = {};
        for (const [dbName, tables] of Object.entries(this.selectedState)) {
            if (tables.length > 0) {
                payloadSchema[dbName] = tables;
            }
        }

        if (Object.keys(payloadSchema).length === 0) {
            showMessage(window.__('err_select_table_restore'), 'error');
            return;
        }

        const resultDialog = await window.modalSystem.show('verifyPasswordRestoreBackup', { asyncConfirm: true });
        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';
        const credential = resultDialog.data['credential'] || resultDialog.data['google_token'] || '';
        if (!password && !credential) {
            resultDialog.failure(window.__('err_admin_password_required'));
            return;
        }

        this.isRestoring = true;
        const originalText = setButtonLoading(btn);

        const res = await this.api.post(ApiRoutes.Admin.RestoreBackup, {
            backup_id: backupId,
            password: password,
            credential: credential,
            google_token: credential,
            schema: payloadSchema
        }, this.abortController.signal);

        if (res.aborted) return;

        if (res.success && res.job_id) {
            resultDialog.success();
            showMessage(window.__('msg_initiating_lockdown'), 'success');
            this._pollRestoreStatus(res.job_id, btn, originalText);
        } else {
            resultDialog.failure(res.message);
            this._resetRestoreUI(btn, originalText);
        }
    }

    async _pollRestoreStatus(jobId, btn, originalText) {
        if (this.pollTimeout) clearTimeout(this.pollTimeout);
        this._isPollingActive = true;

        const checkStatus = async () => {
            if (!this._isPollingActive) return;

            try {
                const res = await this.api.post(ApiRoutes.Admin.CheckWorkerStatus, {}, this.abortController?.signal);
                if (res?.aborted || !this._isPollingActive) return;

                if (res && res.success) {
                    if (res.status === 'finished') {
                        this._isPollingActive = false;
                        this._resetRestoreUI(btn, originalText);
                        showMessage(window.__('success_db_restored'), 'success');
                        window.location.href = this.basePath + '/login';
                        return;
                    }
                } else if (res && !res.success) {
                    this._isPollingActive = false;
                    this._resetRestoreUI(btn, originalText);
                    showMessage(res.message, 'error');
                    return;
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
            }

            if (this._isPollingActive) {
                this.pollTimeout = setTimeout(checkStatus, 2500);
            }
        };

        this.pollTimeout = setTimeout(checkStatus, 2500);
    }

    _resetRestoreUI(btn, originalText) {
        this.isRestoring = false;
        this._isPollingActive = false;
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
        if (btn) {
            restoreButton(btn, originalText);
        }
    }
}

export { AdminBackupsRestoreController };
