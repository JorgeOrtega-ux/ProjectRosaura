// public/assets/js/modules/canvases/CanvasRequestsController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

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
        
        // === NUEVO: OMITIMOS LA LLAMADA INICIAL A LA API (SSR) ===
        // Al quitar this.loadRequests() respetamos el HTML (con las solicitudes o el estado vacío) 
        // que PHP ya se encargó de consultar y renderizar directamente.
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
        // === NUEVO: RECONOCE FILAS TANTO RENDERIZADAS POR PHP COMO POR JS ===
        // PHP no imprimió data-action="selectRequest", por lo que respaldamos detectando tr[data-request-id]
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
        
        // Si tienes un botón manual de actualizar, esto volverá a inyectar la tabla por API (está perfecto)
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
                this.showEmptyState(response.message || 'Error al cargar solicitudes', 'error');
            }
        } catch (error) {
            this.showEmptyState('Error de conexión', 'error');
        }
    }

    renderRequestsList(requests) {
        const tbody = document.querySelector('[data-ref="requests-table-body"]');
        if (!tbody) return;

        if (requests.length === 0) {
            this.showEmptyState('No hay solicitudes pendientes.', 'done_all');
            return;
        }

        let html = '';
        requests.forEach(req => {
            const requestDate = req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Reciente';
            
            html += `
                <tr class="component-table-row" data-action="selectRequest" data-request-id="${req.id}">
                    <td>
                        <div class="td-user-info">
                            <div class="component-badge component-badge--sm">
                                <span class="material-symbols-rounded">person</span>
                                <span class="font-medium">${req.username || `Usuario ID: ${req.user_id}`}</span>
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
                            <span>Pendiente</span>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    showEmptyState(message, icon = 'hourglass_empty') {
        const tbody = document.querySelector('[data-ref="requests-table-body"]');
        if (tbody) {
            tbody.innerHTML = `
                <tr class="disabled">
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
        
        // Quita la selección tanto de las filas JS como de las filas PHP
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
                response = await this.api.approveCanvasRequest(requestId); // Asume que tienes este método en ApiServices
            } else {
                response = await this.api.rejectCanvasRequest(requestId); // Asume que tienes este método en ApiServices
            }

            if (response && response.success) {
                successCount++;
            } else {
                errorCount++;
            }
        }

        restoreButton(btn);

        if (successCount > 0) {
            const actionText = actionType === 'approve' ? 'aprobadas' : 'rechazadas';
            showMessage(`${successCount} solicitudes ${actionText} con éxito.`, 'success');
            
            // Si el usuario procesó las peticiones, recargamos la tabla (aquí SÍ usamos la API)
            this.loadRequests(); 
        } else if (errorCount > 0) {
            showMessage(`Ocurrió un error al procesar las solicitudes.`, 'error');
        }
    }
}

export { CanvasRequestsController };