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
    }

    async loadHistory() {
        if (!this.tbody) return;

        try {
            const response = await this.api.post(ApiRoutes.Stripe.GetPaymentHistory, { limit: 20, offset: 0 }, this.abortController.signal);
            
            if (response.success && response.data && response.data.length > 0) {
                this.tbody.innerHTML = ''; 
                
                response.data.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const description = escapeHTML(item.description || window.__('lbl_subscription'));
                    const amount = `$${(item.amount_cents / 100).toFixed(2)} ${escapeHTML(item.currency).toUpperCase()}`;
                    
                    let statusClass = 'component-text-notice--success';
                    let statusIcon = 'check_circle';
                    let statusText = window.__('lbl_paid');
                    
                    if (item.status !== 'succeeded' && item.status !== 'paid') {
                        statusClass = 'component-text-notice--error';
                        statusIcon = 'error';
                        statusText = window.__('lbl_failed');
                    }

                    const row = `
                        <tr>
                            <td>${date}</td>
                            <td>${description}</td>
                            <td>${amount}</td>
                            <td>
                                <span class="${statusClass}">
                                    <span class="material-symbols-rounded component-icon--16">${statusIcon}</span>
                                    ${statusText}
                                </span>
                            </td>
                        </tr>
                    `;
                    this.tbody.insertAdjacentHTML('beforeend', row);
                });
            } else {
                this.tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="component-empty-table-cell">
                            <div class="component-empty-state component-empty-state--table">
                                <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                                <p class="component-empty-state-text">${window.__('no_purchases') || 'No purchase history found.'}</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="component-empty-table-cell">
                            <div class="component-empty-state component-empty-state--table">
                                <span class="material-symbols-rounded component-empty-state-icon">error</span>
                                <p class="component-empty-state-text">${window.__('err_load_history')}</p>
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