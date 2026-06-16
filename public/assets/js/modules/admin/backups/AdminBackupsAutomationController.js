// public/assets/js/modules/admin/backups/AdminBackupsAutomationController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminBackupsAutomationController {
    constructor() {
        this.api = new ApiService();
        this.initialState = null;
        this.state = {};
        this.availableSchema = null;
        
        this.selectedState = {}; 
        this.expandedAccordions = {}; 
        
        this.selectedModules = {
            db: true,
            avatars_uploaded: false,
            avatars_default: false
        };

        this.abortController = null;

        this.freqMap = {
            0: typeof window.__ === 'function' ? window.__('freq_test_mode') : 'Modo Prueba',
            1: typeof window.__ === 'function' ? window.__('freq_1_hour') : '1 Hora',
            3: typeof window.__ === 'function' ? window.__('freq_3_hours') : '3 Horas',
            6: typeof window.__ === 'function' ? window.__('freq_6_hours') : '6 Horas',
            12: typeof window.__ === 'function' ? window.__('freq_12_hours') : '12 Horas',
            24: typeof window.__ === 'function' ? window.__('freq_1_day') : '1 Día',
            48: typeof window.__ === 'function' ? window.__('freq_2_days') : '2 Días',
            168: typeof window.__ === 'function' ? window.__('freq_1_week') : '1 Semana'
        };

        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        if (window.location.pathname.includes('/admin/backups/automation')) {
            this.loadData();
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/backups/automation')) {
            this.loadData();
        }
    }

    loadData() {
        const schemaElement = document.querySelector('[data-ref="admin-auto-available-schema"]');
        if (!schemaElement) return;

        try {
            this.availableSchema = JSON.parse(schemaElement.textContent);

            const autoEnabled = document.querySelector('[data-ref="toggle-auto-backup"]').checked ? 1 : 0;
            const autoFreq = parseInt(document.querySelector('[data-ref="admin-autoFreq-text"]').getAttribute('data-val'));
            const autoRetention = parseInt(document.querySelector('[data-ref="val_auto_backup_retention_count"]').getAttribute('data-val'));

            this.selectedModules.avatars_uploaded = document.querySelector('[data-ref="auto-module-uploaded"]').checked;
            this.selectedModules.avatars_default = document.querySelector('[data-ref="auto-module-default"]').checked;

            this.selectedState = {};
            for (const dbName in this.availableSchema) {
                this.selectedState[dbName] = [];
                this.expandedAccordions[dbName] = false;
                
                const tableCbs = document.querySelectorAll(`.auto-schema-table-cb[data-db="${dbName}"]:checked`);
                tableCbs.forEach(cb => this.selectedState[dbName].push(cb.value));
            }

            const payloadSchema = { _modules: this.selectedModules };
            for (const [dbName, tables] of Object.entries(this.selectedState)) {
                if (tables.length > 0) payloadSchema[dbName] = tables;
            }

            this.state = {
                auto_backup_enabled: autoEnabled,
                auto_backup_frequency_hours: autoFreq,
                auto_backup_retention_count: autoRetention,
                backup_schema_config: JSON.stringify(payloadSchema)
            };

            this.initialState = JSON.parse(JSON.stringify(this.state));

            this.renderValues();
            this.renderVisibility();
            this.checkForChanges();

        } catch (e) {
            console.error("Error hydrating backups automation data:", e);
        }
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/backups/automation')) return;

        const btnSetDropdown = e.target.closest('[data-action="adminSetDropdown"]');
        if (btnSetDropdown) {
            const key = btnSetDropdown.getAttribute('data-key');
            const val = parseInt(btnSetDropdown.getAttribute('data-value'));
            this.state[key] = val;
            const module = btnSetDropdown.closest('.component-module');
            if (module && window.appInstance) window.appInstance.closeModule(module);
            this.renderValues();
            this.checkForChanges();
        }

        const btnAdjust = e.target.closest('[data-action="adjustAutoConfig"]');
        if (btnAdjust) this.handleAdjustment(btnAdjust);

        const btnSave = e.target.closest('[data-action="submitAutoBackupConfig"]');
        if (btnSave) this.handleSave(btnSave);

        const accordionHeader = e.target.closest('[data-action="toggleAccordion"]');
        if (accordionHeader) {
            if (e.target.closest('[data-action="preventAccordion"]')) return; 
            const dbName = accordionHeader.getAttribute('data-db');
            this.expandedAccordions[dbName] = !this.expandedAccordions[dbName];
            const accordion = accordionHeader.closest('.component-accordion');
            accordion.classList.toggle('active', this.expandedAccordions[dbName]);
            this.updateSchemaUIState();
        }
    }

    handleChange(e) {
        if (!window.location.pathname.includes('/admin/backups/automation')) return;

        if (e.target && e.target.getAttribute('data-ref') === 'toggle-auto-backup') {
            this.state.auto_backup_enabled = e.target.checked ? 1 : 0;
            this.renderVisibility();
            this.checkForChanges();
        }

        if (e.target && e.target.getAttribute('data-action') === 'toggleAutoModule') {
            const ref = e.target.getAttribute('data-ref');
            if (ref === 'auto-module-uploaded') this.selectedModules.avatars_uploaded = e.target.checked;
            if (ref === 'auto-module-default') this.selectedModules.avatars_default = e.target.checked;
            this.syncSchemaState();
        }

        if (e.target && e.target.classList.contains('auto-schema-db-cb')) {
            const dbName = e.target.value;
            this.selectedState[dbName] = e.target.checked ? [...this.availableSchema[dbName]] : [];
            this.syncSchemaState(); 
        }

        if (e.target && e.target.classList.contains('auto-schema-table-cb')) {
            const dbName = e.target.getAttribute('data-db');
            const tableName = e.target.value;
            if (e.target.checked) {
                if (!this.selectedState[dbName].includes(tableName)) this.selectedState[dbName].push(tableName);
            } else {
                this.selectedState[dbName] = this.selectedState[dbName].filter(t => t !== tableName);
            }
            this.syncSchemaState(); 
        }
    }

    syncSchemaState() {
        this.updateSchemaUIState();
        const payloadSchema = { _modules: this.selectedModules };
        for (const [dbName, tables] of Object.entries(this.selectedState)) {
            if (tables.length > 0) payloadSchema[dbName] = tables;
        }
        this.state.backup_schema_config = JSON.stringify(payloadSchema);
        this.checkForChanges();
    }

    updateSchemaUIState() {
        for (const dbName in this.availableSchema) {
            const selectedCount = this.selectedState[dbName].length;
            const totalCount = this.availableSchema[dbName].length;
            const isExpanded = this.expandedAccordions[dbName];

            const dbSwitch = document.querySelector(`.auto-schema-db-cb[value="${dbName}"]`);
            if (dbSwitch) dbSwitch.checked = selectedCount > 0;

            this.availableSchema[dbName].forEach(table => {
                const tableSwitch = document.querySelector(`.auto-schema-table-cb[data-db="${dbName}"][value="${table}"]`);
                if (tableSwitch) tableSwitch.checked = this.selectedState[dbName].includes(table);
            });

            const badge = document.querySelector(`[data-badge="${dbName}"]`);
            if (badge) {
                if (!isExpanded && selectedCount > 0) {
                    badge.style.display = 'inline-flex';
                    badge.textContent = `${selectedCount}/${totalCount} seleccionadas`;
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    }

    renderValues() {
        const toggle = document.querySelector('[data-ref="toggle-auto-backup"]');
        if (toggle) toggle.checked = this.state.auto_backup_enabled === 1;

        const freqText = document.querySelector('[data-ref="admin-autoFreq-text"]');
        if (freqText) {
            let translated = typeof window.__ === 'function' ? window.__('freq_every_x_hours') : 'Cada :hours horas';
            freqText.textContent = this.freqMap[this.state.auto_backup_frequency_hours] || translated.replace(':hours', this.state.auto_backup_frequency_hours);
            freqText.setAttribute('data-val', this.state.auto_backup_frequency_hours);
        }

        document.querySelectorAll('[data-action="adminSetDropdown"][data-key="auto_backup_frequency_hours"]').forEach(el => {
            el.classList.toggle('active', parseInt(el.getAttribute('data-value')) === this.state.auto_backup_frequency_hours);
        });

        const elRet = document.querySelector('[data-ref="val_auto_backup_retention_count"]');
        if (elRet) {
            elRet.textContent = this.state.auto_backup_retention_count;
            elRet.setAttribute('data-val', this.state.auto_backup_retention_count);
        }
    }

    renderVisibility() {
        const refs = ['wrapper-auto-options', 'wrapper-auto-schema', 'wrapper-auto-modules'];
        const isDisabled = this.state.auto_backup_enabled !== 1;
        refs.forEach(ref => {
            const el = document.querySelector(`[data-ref="${ref}"]`);
            if (el) el.classList.toggle('disabled', isDisabled);
        });
    }

    handleAdjustment(btn) {
        const targetField = btn.getAttribute('data-field');
        const step = parseInt(btn.getAttribute('data-step')) || 1;
        const min = parseInt(btn.getAttribute('data-min')) || 0;
        const max = parseInt(btn.getAttribute('data-max')) || 999999;

        if (this.state[targetField] !== undefined) {
            let newVal = parseInt(this.state[targetField]) + step;
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            this.state[targetField] = newVal;
            this.renderValues();
            this.checkForChanges();
        }
    }

    checkForChanges() {
        if (!this.initialState) return;
        let hasChanges = false;
        for (const key in this.state) {
            if (this.state[key] !== this.initialState[key]) {
                hasChanges = true;
                break;
            }
        }
        const btnSave = document.querySelector('[data-ref="btn-save-auto-backup"]');
        if (btnSave) btnSave.classList.toggle('disabled-interaction', !hasChanges);
    }

    async handleSave(btn) {
        const resultDialog = await window.dialogSystem.show('verifyPasswordSaveAutomation');

        if (!resultDialog.confirmed) return;
        
        const password = resultDialog.data['modal_verify_password']?.trim();

        if (!password) {
            showMessage(typeof window.__ === 'function' ? window.__('err_admin_password_required') : 'Contraseña requerida', 'error');
            return;
        }

        setButtonLoading(btn);

        try {
            const reqData = {
                password: password,
                config: this.state
            };

            const response = await this.api.post(ApiRoutes.Admin.UpdateServerConfig, reqData, this.abortController.signal);
            restoreButton(btn);

            if (response.success) {
                showMessage(typeof window.__ === 'function' ? window.__('success_config_saved') : 'Guardado con éxito', 'success');
                this.initialState = JSON.parse(JSON.stringify(this.state));
                this.checkForChanges();
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            restoreButton(btn);
            showMessage(typeof window.__ === 'function' ? window.__('err_save_config') : 'Error al guardar', 'error');
        }
    }
}

export { AdminBackupsAutomationController };