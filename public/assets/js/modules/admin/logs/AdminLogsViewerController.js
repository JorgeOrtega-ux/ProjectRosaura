// public/assets/js/modules/admin/logs/AdminLogsViewerController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

class AdminLogsViewerController {
    constructor() {
        this.api = new ApiService();
        this.logsData = {};
        this.activeTabId = null;
        this.basePath = window.AppBasePath || '';
        this.isSyntaxModeEnabled = false; 

        this.abortController = new AbortController();

        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this); // NUEVO: Listener de input para filtrar
    }

    init() {
        this.bindEvents();
        if (window.location.pathname.includes('/admin/logs/viewer')) {
            this.loadLogs(window.location.href);
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }

        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound); // NUEVO: Atar el input
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/logs/viewer')) {
            this.loadLogs(e.detail.url);
        }
    }

    // NUEVO: Método para interceptar escritura en el input de ASN/Log Filter
    handleInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'logs-asn-filter') {
            this.filterLogs(e.target.value);
        }
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/logs/viewer')) return;

        const tab = e.target.closest('.component-tab');
        const closeBtn = e.target.closest('.component-tab-close');
        const toggleSyntaxBtn = e.target.closest('[data-action="toggle-syntax"]');

        if (toggleSyntaxBtn) {
            this.isSyntaxModeEnabled = !this.isSyntaxModeEnabled;
            toggleSyntaxBtn.classList.toggle('component-button--dark', this.isSyntaxModeEnabled);
            if (this.activeTabId) {
                // Al cambiar la vista, reaplicamos el filtro si existe
                const filterInput = document.querySelector('[data-ref="logs-asn-filter"]');
                if (filterInput && filterInput.value.trim() !== '') {
                    this.filterLogs(filterInput.value);
                } else {
                    this.switchTab(this.activeTabId);
                }
            }
            return;
        }

        if (closeBtn) {
            e.stopPropagation();
            const tabId = closeBtn.closest('.component-tab').getAttribute('data-tab-id');
            this.closeTab(tabId);
        } else if (tab) {
            const tabId = tab.getAttribute('data-tab-id');
            this.switchTab(tabId);
        }
    }

    async loadLogs(urlStr) {
        const loader = document.querySelector('[data-ref="logs-viewer-loader"]');
        const container = document.querySelector('[data-ref="logs-viewer-container"]');
        
        if (loader) {
            loader.classList.add('active');
            loader.classList.remove('disabled');
        }
        if (container) {
            container.classList.add('disabled');
            container.classList.remove('active');
        }

        const urlObj = new URL(urlStr, window.location.origin);
        const filesParam = urlObj.searchParams.get('files');
        
        if (!filesParam) {
            showMessage(__('err_no_logs_specified'), 'error');
            if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/admin/logs');
            else window.location.href = this.basePath + '/admin/logs';
            return;
        }

        const files = filesParam.split(',');

        const res = await this.api.post(ApiRoutes.Admin.ReadLogs, { files: files }, this.abortController.signal);

        if (res.aborted) return;

        if (res.success) {
            this.logsData = res.data;
            this.renderTabs();
            
            const fileKeys = Object.keys(this.logsData);
            if (fileKeys.length > 0) {
                this.switchTab(fileKeys[0]);
            }
            
            if (loader) {
                loader.classList.add('disabled');
                loader.classList.remove('active');
            }
            if (container) {
                container.classList.remove('disabled');
                container.classList.add('active');
            }
        } else {
            showMessage(res.message || __('err_get_logs'), 'error');
            if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/admin/logs');
            else window.location.href = this.basePath + '/admin/logs';
        }
    }

    renderTabs() {
        const tabsContainer = document.querySelector('[data-ref="logs-viewer-tabs"]');
        if (!tabsContainer) return;

        tabsContainer.innerHTML = '';

        for (const [id, log] of Object.entries(this.logsData)) {
            const isActive = this.activeTabId === id ? 'active' : '';
            const filename = log.error ? __('lbl_error') + ': ' + log.filename : log.filename;
            
            let iconStr = 'description';
            let iconErrorClass = '';
            
            if (log.error) {
                iconErrorClass = 'component-text-notice--error';
            } else if (log.category === 'security') {
                iconStr = 'security';
            } else if (log.category === 'database') {
                iconStr = 'database';
            }

            const tabHtml = `
                <div class="component-tab ${isActive}" data-tab-id="${id}" title="${log.category ? log.category + '/' : ''}${filename}">
                    <span class="material-symbols-rounded ${iconErrorClass}">
                        ${iconStr}
                    </span>
                    <span>${filename}</span>
                    <div class="component-tab-close">
                        <span class="material-symbols-rounded">close</span>
                    </div>
                </div>
            `;
            tabsContainer.insertAdjacentHTML('beforeend', tabHtml);
        }
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }

    parseLogSyntax(text) {
        let safeText = this.escapeHTML(text);

        safeText = safeText.replace(/(\[?\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]?)/g, '<span class="log-token-date">$1</span>');
        
        safeText = safeText.replace(/\b(ERROR|FATAL|EXCEPTION)\b/g, '<span class="log-token-error">$1</span>');
        safeText = safeText.replace(/\b(WARNING|WARN)\b/g, '<span class="log-token-warning">$1</span>');
        safeText = safeText.replace(/\b(INFO|NOTICE)\b/g, '<span class="log-token-info">$1</span>');
        safeText = safeText.replace(/\b(DEBUG|TRACE)\b/g, '<span class="log-token-debug">$1</span>');
        
        safeText = safeText.replace(/(\/[\w\.\-]+)+/g, '<span class="log-token-path">$&</span>');

        return safeText;
    }

    // NUEVO: Lógica que aísla las líneas que coinciden con el ASN o texto de búsqueda
    filterLogs(query) {
        if (!this.activeTabId || !this.logsData[this.activeTabId]) return;
        
        const content = this.logsData[this.activeTabId].error 
            ? this.logsData[this.activeTabId].error 
            : (this.logsData[this.activeTabId].content || __('msg_empty_log_file'));
        
        if (!query.trim()) {
            this.switchTab(this.activeTabId);
            return;
        }

        const lines = content.split('\n');
        const lowerQuery = query.toLowerCase();
        
        // Filtramos buscando coincidencias en la línea completa
        const filteredLines = lines.filter(line => line.toLowerCase().includes(lowerQuery));
        const newContent = filteredLines.length > 0 
            ? filteredLines.join('\n') 
            : (__('empty_search_history') || 'No se encontraron registros para este filtro.');

        const textarea = document.querySelector('[data-ref="logs-viewer-textarea"]');
        const codeContainer = document.querySelector('[data-ref="logs-viewer-code"]');
        
        if (!textarea || !codeContainer) return;

        if (this.isSyntaxModeEnabled) {
            codeContainer.innerHTML = this.parseLogSyntax(newContent);
            codeContainer.scrollTop = 0;
        } else {
            textarea.value = newContent;
            textarea.scrollTop = 0;
        }
    }

    switchTab(id) {
        if (!this.logsData[id]) return;
        
        this.activeTabId = id;
        this.renderTabs();

        // Al cambiar de tab, limpiamos el filtro visual para no causar confusión
        const filterInput = document.querySelector('[data-ref="logs-asn-filter"]');
        if (filterInput) filterInput.value = '';

        const textarea = document.querySelector('[data-ref="logs-viewer-textarea"]');
        const codeContainer = document.querySelector('[data-ref="logs-viewer-code"]');
        
        if (!textarea || !codeContainer) return;

        const content = this.logsData[id].error 
            ? this.logsData[id].error 
            : (this.logsData[id].content || __('msg_empty_log_file'));

        if (this.isSyntaxModeEnabled) {
            textarea.classList.remove('active');
            textarea.classList.add('disabled');
            
            codeContainer.classList.remove('disabled');
            codeContainer.classList.add('active');
            
            codeContainer.innerHTML = this.parseLogSyntax(content);
            codeContainer.scrollTop = codeContainer.scrollHeight;
        } else {
            codeContainer.classList.remove('active');
            codeContainer.classList.add('disabled');

            textarea.classList.remove('disabled');
            textarea.classList.add('active');
            
            textarea.value = content;
            if (this.logsData[id].error) {
                textarea.classList.add('component-viewer-textarea--error');
            } else {
                textarea.classList.remove('component-viewer-textarea--error');
            }
            textarea.scrollTop = textarea.scrollHeight;
        }
    }

    closeTab(id) {
        delete this.logsData[id];
        const remainingIds = Object.keys(this.logsData);
        
        if (remainingIds.length === 0) {
            if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/admin/logs');
            else window.location.href = this.basePath + '/admin/logs';
            return;
        }

        if (this.activeTabId === id) {
            this.switchTab(remainingIds[0]);
        } else {
            this.renderTabs();
        }

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('files', remainingIds.join(','));
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState(null, '', newUrl);
    }
}

export { AdminLogsViewerController };