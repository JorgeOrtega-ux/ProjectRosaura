// public/assets/js/modules/settings/PurchaseHistoryController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { escapeHTML } from '../../core/utils/uiUtils.js';

export class PurchaseHistoryController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.name = 'PurchaseHistoryController';
        this.container = null;
        this.tbody = null;
    }

    async init() {
        this.abortController = new AbortController();
        this.container = document.querySelector('.view-content');
        this.tbody = document.querySelector('.component-table tbody');
        this.bindEvents();
    }

    bindEvents() {
        if (!this.container) return;
        
        // Eventos futuros para manipulación de la tabla (ej. paginación, filtros)
    }

    async loadHistory() {
        if (!this.tbody) return;

        try {
            const response = await this.api.post(ApiRoutes.Stripe.GetPaymentHistory, { limit: 20, offset: 0 }, this.abortController.signal);
            
            if (response.success && response.data && response.data.length > 0) {
                this.tbody.innerHTML = ''; // Clear empty state
                
                response.data.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const description = escapeHTML(item.description || 'Suscripción');
                    const amount = `$${(item.amount_cents / 100).toFixed(2)} ${escapeHTML(item.currency).toUpperCase()}`;
                    
                    let statusClass = 'component-text-notice--success';
                    let statusIcon = 'check_circle';
                    let statusText = 'Pagado';
                    
                    if (item.status !== 'succeeded' && item.status !== 'paid') {
                        statusClass = 'component-text-notice--error';
                        statusIcon = 'error';
                        statusText = 'Fallido';
                    }

                    const row = `
                        <tr>
                            <td>${date}</td>
                            <td>${description}</td>
                            <td>${amount}</td>
                            <td>
                                <span class="${statusClass}" style="display: flex; align-items: center; gap: 4px;">
                                    <span class="material-symbols-rounded" style="font-size: 16px;">${statusIcon}</span>
                                    ${statusText}
                                </span>
                            </td>
                        </tr>
                    `;
                    this.tbody.insertAdjacentHTML('beforeend', row);
                });
            } else {
                // If empty, leave the default empty state row.
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching purchase history:', error);
                this.tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="component-empty-table-cell">
                            <div class="component-empty-state component-empty-state--table">
                                <span class="material-symbols-rounded component-empty-state-icon">error</span>
                                <p class="component-empty-state-text">Error al cargar el historial.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        this.container = null;
        this.tbody = null;
    }
}