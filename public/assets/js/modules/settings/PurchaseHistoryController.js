import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { escapeHTML, showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

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

        this._boundHandleClick = this.handleGlobalClick.bind(this);
        this._boundHandleChange = this.handleGlobalChange.bind(this);

        this.currentPage = 1;
        this.limit = 10;
        this.totalItems = 0;
        this.totalPages = 1;
        this.rawItems = [];
        this.filteredItems = [];
        this.activeFilters = {
            types: ['all'],
            statuses: ['all']
        };

        // Ledger state variables
        this.activeTab = 'payments'; // 'payments' or 'coins'
        this.coinItems = [];
        this.filteredCoinItems = [];
    }

    async init() {
        this.abortController = new AbortController();
        this.container = document.querySelector('.view-content');
        this.tbody = document.querySelector('.component-table tbody');
        this.bindEvents();
        this.parseInitialDOMItems();
        this.applyFiltersAndRender();
        await this.loadHistory();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        if (this.container) {
            this.container.removeEventListener('click', this._boundHandleClick);
            this.container.removeEventListener('change', this._boundHandleChange);
        }
    }

    parseInitialDOMItems() {
        if (!this.tbody) return;
        const rows = this.tbody.querySelectorAll('tr.component-table-row');
        if (rows.length === 0) return;

        this.rawItems = Array.from(rows).map(row => {
            return {
                id: row.getAttribute('data-id') || '',
                receipt_url: row.getAttribute('data-receipt-url') || '',
                pdf_url: row.getAttribute('data-pdf-url') || '',
                type: row.getAttribute('data-type') || 'subscription',
                status: row.getAttribute('data-status') || 'succeeded',
                html: row.outerHTML,
                element: row
            };
        });
    }

    bindEvents() {
        if (!this.container) return;

        this.container.addEventListener('click', this._boundHandleClick);
        this.container.addEventListener('change', this._boundHandleChange);
    }

    handleGlobalClick(e) {
        const selectTargetRow = e.target.closest('[data-action="selectPurchase"]');
        const deselectBtn = e.target.closest('[data-action="deselectPurchase"]');
        const downloadReceiptBtn = e.target.closest('[data-action="downloadReceipt"]');
        const downloadInvoiceBtn = e.target.closest('[data-action="downloadInvoice"]');
        
        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        const backToMainBtn = e.target.closest('[data-action="backToMainFilters"]');
        
        const prevPageBtn = e.target.closest('[data-action="prevPage"]');
        const nextPageBtn = e.target.closest('[data-action="nextPage"]');
        const toggleHistoryTabBtn = e.target.closest('[data-action="toggleHistoryTab"]');

        if (toggleHistoryTabBtn) {
            const tab = toggleHistoryTabBtn.getAttribute('data-value');
            this.setHistoryTab(tab);
            return;
        }

        if (prevPageBtn && !prevPageBtn.classList.contains('disabled-interaction')) {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderCurrentPage();
            }
            return;
        }

        if (nextPageBtn && !nextPageBtn.classList.contains('disabled-interaction')) {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.renderCurrentPage();
            }
            return;
        }

        if (selectTargetRow && !e.target.closest('button') && !e.target.closest('a')) {
            this.handlePurchaseSelection(selectTargetRow);
            return;
        }

        if (deselectBtn) {
            this.deselectPurchase();
            return;
        }

        if (downloadReceiptBtn && !downloadReceiptBtn.classList.contains('disabled-interaction')) {
            this.downloadSelectedDocument(downloadReceiptBtn);
            return;
        }
    }

    handleGlobalChange(e) {
        const radio = e.target.closest('.filter-radio');
        if (radio) {
            const filterCategory = radio.getAttribute('data-filter-type');
            const val = radio.value;

            if (filterCategory === 'type') {
                if (val === 'coins_virtual') {
                    this.activeTab = 'coins';
                    
                    const statusRow = this.container.querySelector('[data-ref="filter-status-row"]');
                    if (statusRow) statusRow.classList.add('disabled');

                    if (this.coinItems.length === 0) {
                        this.loadCoinHistory();
                    } else {
                        this.applyFiltersAndRender();
                    }
                } else {
                    this.activeTab = 'payments';

                    const statusRow = this.container.querySelector('[data-ref="filter-status-row"]');
                    if (statusRow) statusRow.classList.remove('disabled');

                    if (val === 'payments_all') {
                        this.activeFilters.types = ['all'];
                    } else if (val === 'payments_subscription') {
                        this.activeFilters.types = ['subscription'];
                    } else if (val === 'payments_coins') {
                        this.activeFilters.types = ['coins'];
                    }
                    this.currentPage = 1;
                    this.applyFiltersAndRender();
                }
            }
            return;
        }

        const checkbox = e.target.closest('.filter-checkbox');
        if (checkbox) {
            const filterCategory = checkbox.getAttribute('data-filter-type');
            const val = checkbox.value;

            const dropdownModule = checkbox.closest('[data-module="modulePurchaseFilters"]');
            if (!dropdownModule) return;

            const groupCheckboxes = dropdownModule.querySelectorAll(`.filter-checkbox[data-filter-type="${filterCategory}"]`);

            if (val === 'all') {
                if (checkbox.checked) {
                    groupCheckboxes.forEach(cb => cb.checked = true);
                } else {
                    groupCheckboxes.forEach(cb => cb.checked = false);
                }
            } else {
                const allCheckbox = Array.from(groupCheckboxes).find(cb => cb.value === 'all');
                if (!checkbox.checked && allCheckbox) {
                    allCheckbox.checked = false;
                }
                const specificCheckboxes = Array.from(groupCheckboxes).filter(cb => cb.value !== 'all');
                const allSpecificChecked = specificCheckboxes.every(cb => cb.checked);
                if (allSpecificChecked && allCheckbox) {
                    allCheckbox.checked = true;
                }
            }

            const checkedVals = Array.from(groupCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
            if (filterCategory === 'type') {
                this.activeFilters.types = checkedVals;
            } else if (filterCategory === 'status') {
                this.activeFilters.statuses = checkedVals;
            }

            this.currentPage = 1;
            this.applyFiltersAndRender();
        }
    }

    applyFiltersAndRender() {
        this.deselectPurchase();

        if (this.activeTab === 'payments') {
            this.filteredItems = this.rawItems.filter(item => {
                const matchType = this.activeFilters.types.includes('all') || this.activeFilters.types.includes(item.type);
                const matchStatus = this.activeFilters.statuses.includes('all') || this.activeFilters.statuses.includes(item.status);
                return matchType && matchStatus;
            });
        } else {
            this.filteredItems = this.coinItems;
        }

        this.totalItems = this.filteredItems.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.limit));
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }

        this.renderCurrentPage();
    }

    renderCurrentPage() {
        if (!this.tbody) return;

        const pageCenterEl = this.container.querySelector('[data-ref="pagination-page"]');
        const prevPageBtn = this.container.querySelector('[data-action="prevPage"]');
        const nextPageBtn = this.container.querySelector('[data-action="nextPage"]');

        if (pageCenterEl) {
            pageCenterEl.textContent = this.currentPage;
        }

        if (prevPageBtn) {
            if (this.currentPage <= 1) {
                prevPageBtn.classList.add('disabled-interaction');
            } else {
                prevPageBtn.classList.remove('disabled-interaction');
            }
        }

        if (nextPageBtn) {
            if (this.currentPage >= this.totalPages) {
                nextPageBtn.classList.add('disabled-interaction');
            } else {
                nextPageBtn.classList.remove('disabled-interaction');
            }
        }

        if (this.filteredItems.length === 0) {
            this.tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="component-empty-table-cell">
                        <div class="component-empty-state component-empty-state--table">
                            <span class="material-symbols-rounded component-empty-state-icon">receipt_long</span>
                            <p class="component-empty-state-text">${window.__('no_purchases')}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const startIndex = (this.currentPage - 1) * this.limit;
        const endIndex = startIndex + this.limit;
        const pageItems = this.filteredItems.slice(startIndex, endIndex);

        this.tbody.innerHTML = pageItems.map(item => item.html).join('');
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
                const itemType = this.selectedRow.getAttribute('data-type');
                if (itemType === 'coins-ledger') {
                    downloadBtn.classList.add('disabled-interaction');
                } else {
                    downloadBtn.classList.remove('disabled-interaction');
                }
            }
        } else {
            if (selectionMode) selectionMode.classList.replace('active', 'disabled');
            if (defaultMode) defaultMode.classList.replace('disabled', 'active');
        }
    }

    async downloadSelectedDocument(btn = null) {
        if (!this.selectedRow || !this.selectedPurchaseId) {
            showMessage(window.__('no_receipt_available'), 'warning');
            return;
        }

        if (btn) setButtonLoading(btn);
        
        try {
            const result = await this.api.downloadFile(
                ApiRoutes.Stripe.DownloadReceipt, 
                { id: this.selectedPurchaseId }, 
                `Comprobante_${this.selectedPurchaseId}.pdf`,
                this.abortController ? this.abortController.signal : null
            );
            if (result && !result.success && !result.aborted) {
                showMessage(result.message || window.__('err_download_receipt'), 'error');
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_download_receipt'), 'error');
            }
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async loadHistory() {
        if (!this.tbody) return;

        try {
            const response = await this.api.post(ApiRoutes.Stripe.GetPaymentHistory, { limit: 100, offset: 0 }, this.abortController.signal);
            
            if (response.success && response.data && response.data.length > 0) {
                this.rawItems = response.data.map(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const description = escapeHTML(item.description || window.__('lbl_subscription'));
                    const amount = `$${(item.amount_cents / 100).toFixed(2)} ${escapeHTML(item.currency).toUpperCase()}`;
                    const receiptUrl = escapeHTML(item.receipt_url || '');
                    const pdfUrl = escapeHTML(item.pdf_url || '');
                    const rowId = escapeHTML(item.id || '');
                    
                    let statusClass = 'component-text-notice--success';
                    let statusText = window.__('lbl_paid');
                    let itemStatus = 'succeeded';
                    
                    if (item.status !== 'succeeded' && item.status !== 'paid') {
                        statusClass = 'component-text-notice--error';
                        statusText = window.__('lbl_failed');
                        itemStatus = 'failed';
                    }

                    const itemType = 'subscription';
                    const iconName = 'description';

                    const rowHtml = `
                        <tr class="component-table-row" data-action="selectPurchase" data-id="${rowId}" data-receipt-url="${receiptUrl}" data-pdf-url="${pdfUrl}" data-type="${itemType}" data-status="${itemStatus}">
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="search-target">${date}</span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">${iconName}</span>
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

                    return {
                        id: rowId,
                        receipt_url: receiptUrl,
                        pdf_url: pdfUrl,
                        type: itemType,
                        status: itemStatus,
                        html: rowHtml
                    };
                });

                this.applyFiltersAndRender();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
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

    setHistoryTab(tab) {
        if (this.activeTab === tab) return;

        this.activeTab = tab;
        this.deselectPurchase();
        this.currentPage = 1;

        const tabBtns = this.container.querySelectorAll('[data-action="toggleHistoryTab"]');
        tabBtns.forEach(btn => {
            if (btn.getAttribute('data-value') === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (tab === 'coins') {
            if (this.coinItems.length === 0) {
                this.loadCoinHistory();
            } else {
                this.applyFiltersAndRender();
            }
        } else {
            this.applyFiltersAndRender();
        }
    }

    async loadCoinHistory() {
        if (!this.tbody) return;

        this.tbody.innerHTML = `
            <tr>
                <td colspan="4" class="component-empty-table-cell">
                    <div class="component-empty-state component-empty-state--table">
                        <div class="component-spinner component-spinner--centered"></div>
                        <p class="component-empty-state-text">${window.__('dt_loading')}</p>
                    </div>
                </td>
            </tr>
        `;

        try {
            const response = await this.api.post(ApiRoutes.Store.GetTransactionHistory, { limit: 100, offset: 0 }, this.abortController.signal);
            
            if (response.success && response.data && response.data.length > 0) {
                this.coinItems = response.data.map(item => {
                    const date = new Date(item.created_at).toLocaleDateString();
                    const description = window.__(item.description) || item.description || window.__('transaction');
                    
                    const amountVal = parseInt(item.amount, 10);
                    const sign = amountVal > 0 ? '+' : '';
                    const formattedAmount = `${sign}${amountVal.toLocaleString()} ${window.__('coins')}`;
                    const amountClass = amountVal > 0 ? 'component-text-notice--success' : 'component-badge--danger';

                    let statusClass = 'component-text-notice--success';
                    let typeText = window.__('type_charge');
                    if (item.type === 'spend') {
                        statusClass = 'component-badge--warning';
                        typeText = window.__('type_spend');
                    } else if (item.type === 'refund') {
                        statusClass = 'component-badge--info';
                        typeText = window.__('type_refund');
                    } else if (item.type === 'bonus') {
                        statusClass = 'component-text-notice--success';
                        typeText = window.__('type_bonus');
                    } else if (item.type === 'admin_adjustment') {
                        statusClass = 'component-badge--muted';
                        typeText = window.__('type_support');
                    }

                    let iconName = 'toll';

                    const rowHtml = `
                        <tr class="component-table-row" data-action="selectPurchase" data-id="${item.id}" data-type="coins-ledger" data-status="succeeded">
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="search-target">${date}</span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">${iconName}</span>
                                    <span class="search-target">${escapeHTML(description)}</span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">toll</span>
                                    <span class="search-target ${amountClass}">${formattedAmount}</span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="search-target ${statusClass}">${typeText}</span>
                                </div>
                            </td>
                        </tr>
                    `;

                    return {
                        id: item.id,
                        type: 'coins-ledger',
                        status: 'succeeded',
                        html: rowHtml
                    };
                });

                this.applyFiltersAndRender();
            } else {
                this.tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="component-empty-table-cell">
                            <div class="component-empty-state component-empty-state--table">
                                <span class="material-symbols-rounded component-empty-state-icon">receipt_long</span>
                                <p class="component-empty-state-text">${window.__('empty_purchase_history')}</p>
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
                                <p class="component-empty-state-text">${window.__('err_connection')}</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }
}