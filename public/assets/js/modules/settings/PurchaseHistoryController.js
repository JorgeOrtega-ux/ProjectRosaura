import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { escapeHTML, showMessage } from '../../core/utils/uiUtils.js';

export class PurchaseHistoryController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.name = 'PurchaseHistoryController';
        this.container = null;
        this.tbody = null;
        this.selectedRow = null;
        this.selectedPurchaseId = null;
        this.selectedReceiptUrl = null;
        this.selectedPdfUrl = null;
    }

    async init() {
        this.abortController = new AbortController();
        this.container = document.querySelector('.view-content');
        this.tbody = document.querySelector('.component-table tbody');
        this.bindEvents();
    }

    bindEvents() {
        if (!this.container) return;
        this.container.addEventListener('click', (e) => this.handleGlobalClick(e));
    }

    handleGlobalClick(e) {
        const selectTargetRow = e.target.closest('[data-action="selectPurchase"]');
        const deselectBtn = e.target.closest('[data-action="deselectPurchase"]');
        const downloadReceiptBtn = e.target.closest('[data-action="downloadReceipt"]');

        if (selectTargetRow && !e.target.closest('button') && !e.target.closest('a')) {
            this.handlePurchaseSelection(selectTargetRow);
        }

        if (deselectBtn) {
            this.deselectPurchase();
        }

        if (downloadReceiptBtn && !downloadReceiptBtn.classList.contains('disabled-interactive')) {
            this.downloadSelectedReceipt();
        }
    }

    handlePurchaseSelection(rowElement) {
        const purchaseId = rowElement.getAttribute('data-id');
        const receiptUrl = rowElement.getAttribute('data-receipt-url');
        const pdfUrl = rowElement.getAttribute('data-pdf-url');

        if (rowElement.classList.contains('selected')) {
            this.deselectPurchase();
        } else {
            if (this.tbody) {
                this.tbody.querySelectorAll('[data-action="selectPurchase"]').forEach(el => el.classList.remove('selected'));
            }
            rowElement.classList.add('selected');
            this.selectedRow = rowElement;
            this.selectedPurchaseId = purchaseId;
            this.selectedReceiptUrl = receiptUrl;
            this.selectedPdfUrl = pdfUrl;
            this.updateSelectionUI();
        }
    }

    deselectPurchase() {
        if (this.tbody) {
            this.tbody.querySelectorAll('[data-action="selectPurchase"]').forEach(el => el.classList.remove('selected'));
        }
        this.selectedRow = null;
        this.selectedPurchaseId = null;
        this.selectedReceiptUrl = null;
        this.selectedPdfUrl = null;
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="header-selection-actions"]');
        const downloadBtn = document.querySelector('[data-action="downloadReceipt"]');

        if (this.selectedRow) {
            if (defaultMode) defaultMode.classList.replace('active', 'disabled');
            if (selectionMode) selectionMode.classList.replace('disabled', 'active');

            if (downloadBtn) {
                downloadBtn.classList.remove('disabled-interactive');
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    downloadSelectedReceipt() {
        if (!this.selectedRow || !this.selectedPurchaseId) {
            showMessage(window.__('no_receipt_available') || 'No hay recibo disponible para esta compra.', 'warning');
            return;
        }

        const downloadUrl = `${window.AppBasePath || ''}/api/index.php?route=stripe.download_receipt&id=${encodeURIComponent(this.selectedPurchaseId)}`;

        let iframe = document.getElementById('receipt-download-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'receipt-download-iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }
        iframe.src = downloadUrl;
    }

    async loadHistory() {
        if (!this.tbody) return;

        try {
            const response = await this.api.post(ApiRoutes.Stripe.GetPaymentHistory, { limit: 20, offset: 0 }, this.abortController.signal);
            
            if (response.success && response.data && response.data.length > 0) {
                this.tbody.innerHTML = ''; 
                this.deselectPurchase();
                
                response.data.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const description = escapeHTML(item.description || window.__('lbl_subscription'));
                    const amount = `$${(item.amount_cents / 100).toFixed(2)} ${escapeHTML(item.currency).toUpperCase()}`;
                    const receiptUrl = escapeHTML(item.receipt_url || '');
                    const pdfUrl = escapeHTML(item.pdf_url || '');
                    const rowId = escapeHTML(item.id || '');
                    
                    let statusClass = 'component-text-notice--success';
                    let statusText = window.__('lbl_paid');
                    
                    if (item.status !== 'succeeded' && item.status !== 'paid') {
                        statusClass = 'component-text-notice--error';
                        statusText = window.__('lbl_failed');
                    }

                    const row = `
                        <tr class="component-table-row" data-action="selectPurchase" data-id="${rowId}" data-receipt-url="${receiptUrl}" data-pdf-url="${pdfUrl}">
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="search-target">${date}</span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">description</span>
                                    <span class="search-target">${description}</span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">payments</span>
                                    <span class="search-target">${amount}</span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="search-target ${statusClass}">${statusText}</span>
                                </div>
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
                                <p class="component-empty-state-text">${window.__('no_purchases')}</p>
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
        this.selectedRow = null;
        this.selectedPurchaseId = null;
        this.selectedReceiptUrl = null;
        this.selectedPdfUrl = null;
    }
}