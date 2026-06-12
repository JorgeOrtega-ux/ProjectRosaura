// public/assets/js/modules/admin/backups/AdminBackupsCreateController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminBackupsCreateController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        
        this.isBackingUp = false;
        this.pollInterval = null;
        this.abortController = null;

        this.schemaData = null; 
        this.selectedState = {}; 
        this.expandedAccordions = {}; 

        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        this.loadDatabaseSchema();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.pollInterval) clearInterval(this.pollInterval);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/backups/create')) return;
        
        const target = e.target;

        const executeBtn = target.closest('[data-action="executeCustomBackup"]');
        if (executeBtn) this.executeCustomBackup(executeBtn);

        const accordionHeader = target.closest('[data-action="toggleAccordion"]');
        if (accordionHeader) {
            if (target.closest('[data-action="preventAccordion"]')) return; 
            
            const dbName = accordionHeader.getAttribute('data-db');
            this.expandedAccordions[dbName] = !this.expandedAccordions[dbName];
            
            const accordion = accordionHeader.closest('.component-accordion');
            
            if (this.expandedAccordions[dbName]) {
                accordion.classList.add('active');
            } else {
                accordion.classList.remove('active');
            }

            this.updateUIState();
        }
    }

    handleChange(e) {
        if (!window.location.pathname.includes('/admin/backups/create')) return;

        if (e.target && e.target.classList.contains('custom-schema-db-cb')) {
            const dbName = e.target.value;
            const isChecked = e.target.checked;
            
            if (isChecked) {
                this.selectedState[dbName] = [...this.schemaData[dbName]];
            } else {
                this.selectedState[dbName] = [];
            }
            
            this.updateUIState(); 
        }

        if (e.target && e.target.classList.contains('custom-schema-table-cb')) {
            const dbName = e.target.getAttribute('data-db');
            const tableName = e.target.value;
            const isChecked = e.target.checked;
            
            if (isChecked) {
                if (!this.selectedState[dbName].includes(tableName)) {
                    this.selectedState[dbName].push(tableName);
                }
            } else {
                this.selectedState[dbName] = this.selectedState[dbName].filter(t => t !== tableName);
            }
            
            this.updateUIState(); 
        }
        
        if (e.target && (e.target.getAttribute('data-ref') === 'cb-module-db' || 
                         e.target.getAttribute('data-ref') === 'cb-module-uploaded' || 
                         e.target.getAttribute('data-ref') === 'cb-module-default')) {
            this.validateSelection();
        }
    }

    async loadDatabaseSchema() {
        const container = document.querySelector('[data-ref="custom-schema-container"]');
        if (!container) return;

        container.innerHTML = '<div class="component-spinner component-spinner--centered"></div>';

        const resSchema = await this.api.post('admin.get_backup_schema', {}, this.abortController.signal);
        if (resSchema.aborted) return;
        
        if (!resSchema.success || !resSchema.schema) {
            showMessage(__('err_get_db_schema'), 'error');
            container.innerHTML = `<div class="component-empty-state"><p>${__('err_get_db_schema')}</p></div>`;
            return;
        }

        this.schemaData = resSchema.schema;
        
        for (const dbName of Object.keys(this.schemaData)) {
            this.selectedState[dbName] = [];
            this.expandedAccordions[dbName] = false; 
        }

        this.buildInitialHTML(container);
        this.updateUIState();
    }

    buildInitialHTML(container) {
        let html = '<div class="component-list component-list--flush">'; 
        
        for (const [dbName, tables] of Object.entries(this.schemaData)) {
            
            html += `
                <div class="component-card--grouped component-accordion component-card--flush"> <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion" data-db="${dbName}">
                        
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">${dbName}</h2>
                                <p class="component-card__description">${tables.length} tablas disponibles para respaldo</p>
                            </div>
                        </div>

                        <div class="component-card__actions component-card__actions--end">
                            <span class="component-badge component-badge--sm" data-badge="${dbName}" style="display: none;"></span>
                            
                            <div data-action="preventAccordion">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" class="custom-schema-db-cb" value="${dbName}">
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>

                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
            `;
            
            tables.forEach((table, index) => {
                html += `
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">${table}</h2>
                                        <p class="component-card__description">Estructura y registros de la tabla ${table}</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" class="custom-schema-table-cb" data-db="${dbName}" value="${table}">
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                `;
                
                if (index < tables.length - 1) {
                    html += `       <hr class="component-divider">`;
                }
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    updateUIState() {
        for (const [dbName, tables] of Object.entries(this.schemaData)) {
            const selectedCount = this.selectedState[dbName].length;
            const totalCount = tables.length;
            
            const isAnySelected = selectedCount > 0;
            const isExpanded = this.expandedAccordions[dbName];

            const dbSwitch = document.querySelector(`.custom-schema-db-cb[value="${dbName}"]`);
            if (dbSwitch) dbSwitch.checked = isAnySelected;

            tables.forEach(table => {
                const tableSwitch = document.querySelector(`.custom-schema-table-cb[data-db="${dbName}"][value="${table}"]`);
                if (tableSwitch) {
                    tableSwitch.checked = this.selectedState[dbName].includes(table);
                }
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

        this.validateSelection();
    }

    validateSelection() {
        const confirmBtn = document.querySelector('[data-ref="btn-confirm-custom"]');
        if (!confirmBtn) return;

        let hasSchemaSelection = false;
        for (const tables of Object.values(this.selectedState)) {
            if (tables.length > 0) {
                hasSchemaSelection = true;
                break;
            }
        }

        const cbDb = document.querySelector('[data-ref="cb-module-db"]')?.checked;
        const cbUploaded = document.querySelector('[data-ref="cb-module-uploaded"]')?.checked;
        const cbDefault = document.querySelector('[data-ref="cb-module-default"]')?.checked;

        if ((cbDb && hasSchemaSelection) || cbUploaded || cbDefault) {
            confirmBtn.classList.remove('disabled-interaction');
        } else {
            confirmBtn.classList.add('disabled-interaction');
        }
    }

    async executeCustomBackup(btn) {
        if (this.isBackingUp) return;
        this.isBackingUp = true;

        const payloadSchema = {};
        for (const [dbName, tables] of Object.entries(this.selectedState)) {
            if (tables.length > 0) {
                payloadSchema[dbName] = tables;
            }
        }

        const payloadModules = {
            db: document.querySelector('[data-ref="cb-module-db"]')?.checked || false,
            avatars_uploaded: document.querySelector('[data-ref="cb-module-uploaded"]')?.checked || false,
            avatars_default: document.querySelector('[data-ref="cb-module-default"]')?.checked || false
        };

        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-rounded spin-icon">autorenew</span> ' + __('btn_backing_up');
        btn.classList.add('disabled-interaction');

        showMessage(__('msg_sending_custom_schema'), 'success');
        const res = await this.api.post('admin.create_custom_backup', { schema: payloadSchema, modules: payloadModules }, this.abortController.signal);
        
        if (res.aborted) return;
        
        if (res.success && res.job_id) {
            this.pollBackupStatus(res.job_id, btn, originalText);
        } else {
            showMessage(res.message || __('err_start_custom_backup'), 'error');
            this.resetBackupUI(btn, originalText);
        }
    }

    async pollBackupStatus(jobId, btn, originalText) {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(async () => {
            const res = await this.api.post('admin.backup_status', { job_id: jobId }, this.abortController.signal);
            if (res.aborted) return;
            
            if (res.success) {
                if (res.status === 'completed') {
                    clearInterval(this.pollInterval);
                    showMessage(res.job_message || __('success_backup_finished'), 'success');
                    this.resetBackupUI(btn, originalText);
                    // FIX: Reemplazado loadRoute por navigate para corregir la actualización de la URL en la barra
                    if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/admin/backups');
                } else if (res.status === 'failed' || res.status === 'not_found') {
                    clearInterval(this.pollInterval);
                    showMessage(res.job_message || __('err_backup_failed'), 'error');
                    this.resetBackupUI(btn, originalText);
                } else if (res.status === 'pending' || res.status === 'processing') {
                    // Esperando
                } else {
                    clearInterval(this.pollInterval);
                    showMessage('Estado desconocido reportado por el servidor.', 'error');
                    this.resetBackupUI(btn, originalText);
                }
            } else {
                clearInterval(this.pollInterval);
                showMessage(res.message || __('err_process_connection'), 'error');
                this.resetBackupUI(btn, originalText);
            }
        }, 2500); 
    }

    resetBackupUI(btn, originalText) {
        this.isBackingUp = false;
        if (btn) {
            btn.innerHTML = originalText;
            btn.classList.remove('disabled-interaction');
        }
    }
}

export { AdminBackupsCreateController };