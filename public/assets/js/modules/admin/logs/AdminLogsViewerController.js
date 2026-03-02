// public/assets/js/modules/admin/logs/AdminLogsViewerController.js
import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminLogsViewerController {
    constructor() {
        this.api = new ApiService();
        this.logsData = {};
        this.activeTabId = null;
    }

    init() {
        this.bindEvents();
        // Carga inicial si se entra a la URL de forma directa (refresco de página)
        if (window.location.pathname.includes('/admin/logs/viewer')) {
            this.loadLogs(window.location.href);
        }
    }

    bindEvents() {
        // Escucha la navegación del SPA Router
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/logs/viewer')) {
                // Pasamos la URL exacta del evento para evitar desfases con window.location
                this.loadLogs(e.detail.url);
            }
        });

        // Delegación de eventos global
        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/logs/viewer')) return;

            const tab = e.target.closest('.component-tab');
            const closeBtn = e.target.closest('.component-tab-close');

            if (closeBtn) {
                e.stopPropagation();
                const tabId = closeBtn.closest('.component-tab').getAttribute('data-tab-id');
                this.closeTab(tabId);
            } else if (tab) {
                const tabId = tab.getAttribute('data-tab-id');
                this.switchTab(tabId);
            }
        });
    }

    async loadLogs(urlStr) {
        const loader = document.getElementById('logs-viewer-loader');
        const container = document.getElementById('logs-viewer-container');
        
        if (loader) {
            loader.classList.add('active');
            loader.classList.remove('disabled');
        }
        if (container) {
            container.classList.add('disabled');
            container.classList.remove('active');
        }

        // Parseamos la URL de forma robusta
        const urlObj = new URL(urlStr, window.location.origin);
        const filesParam = urlObj.searchParams.get('files');
        
        if (!filesParam) {
            if (window.appInstance) window.appInstance.showToast('No se especificaron archivos para visualizar.', 'error');
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/logs');
            else window.location.href = '/ProjectRosaura/admin/logs';
            return;
        }

        const files = filesParam.split(',');

        const res = await this.api.post(ApiRoutes.Admin.ReadLogs, { files: files });

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
            if (window.appInstance) window.appInstance.showToast(res.message || 'Error al obtener los logs.', 'error');
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/logs');
            else window.location.href = '/ProjectRosaura/admin/logs';
        }
    }

    renderTabs() {
        const tabsContainer = document.getElementById('logs-viewer-tabs');
        if (!tabsContainer) return;

        tabsContainer.innerHTML = '';

        for (const [id, log] of Object.entries(this.logsData)) {
            const isActive = this.activeTabId === id ? 'active' : '';
            const filename = log.error ? `Error: ${log.filename}` : log.filename;
            
            let iconStr = 'description';
            let colorStr = 'var(--text-secondary)';
            
            if (log.error) {
                colorStr = 'var(--color-error)';
            } else if (log.category === 'security') {
                iconStr = 'security';
            } else if (log.category === 'database') {
                iconStr = 'database';
            }

            const tabHtml = `
                <div class="component-tab ${isActive}" data-tab-id="${id}" title="${log.category ? log.category + '/' : ''}${filename}">
                    <span class="material-symbols-rounded" style="font-size: 16px; color: ${colorStr};">
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

    switchTab(id) {
        if (!this.logsData[id]) return;
        
        this.activeTabId = id;
        this.renderTabs();

        const textarea = document.getElementById('logs-viewer-textarea');
        if (textarea) {
            if (this.logsData[id].error) {
                textarea.value = this.logsData[id].error;
                textarea.style.color = 'var(--color-error)';
            } else {
                textarea.value = this.logsData[id].content || '(El archivo de registro está vacío)';
                textarea.style.color = 'var(--text-code-base)';
            }
            textarea.scrollTop = textarea.scrollHeight;
        }
    }

    closeTab(id) {
        delete this.logsData[id];
        const remainingIds = Object.keys(this.logsData);
        
        if (remainingIds.length === 0) {
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/logs');
            else window.location.href = '/ProjectRosaura/admin/logs';
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