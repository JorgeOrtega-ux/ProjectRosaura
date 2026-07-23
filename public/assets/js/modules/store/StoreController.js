import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton, formatNumber } from '../../core/utils/uiUtils.js';

export class StoreController {
    constructor() {
        this.api = new ApiService();
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.selectedCoinRow = null;
        this.selectedCoinAmount = null;
        this.selectedPerkRow = null;
        this.selectedPerkId = null;
    }

    init() {
        document.addEventListener('click', this.handleDocumentClickBound);
        this.pendingPurchaseBtn = null;
    }

    destroy() {
        document.removeEventListener('click', this.handleDocumentClickBound);
    }

    handleDocumentClick(e) {
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;

        const action = actionEl.getAttribute('data-action');

        if (action === 'selectCoinPackage') {
            const row = e.target.closest('tr.component-table-row');
            if (row) this.handleCoinRowSelection(row);
        } else if (action === 'selectContentPackage') {
            const row = e.target.closest('tr.component-table-row');
            if (row) this.handleContentRowSelection(row);
        } else if (action === 'buySelectedCoins') {
            e.preventDefault();
            this.handleBuySelectedCoins(actionEl);
        } else if (action === 'buySelectedPerk') {
            e.preventDefault();
            this.handleBuySelectedPerk(actionEl);
        } else if (action === 'buyPerk') {
            e.preventDefault();
            const perkId = actionEl.getAttribute('data-perkid');
            this.handleBuyPerk(perkId, actionEl);
        } else if (action === 'buyCoins') {
            e.preventDefault();
            const amount = parseInt(actionEl.getAttribute('data-amount'), 10);
            this.handleBuyCoins(amount, actionEl);
        }
    }

    handleCoinRowSelection(row) {
        const selectionActions = document.querySelector('[data-ref="store-coins-selection-actions"]');
        const amount = parseInt(row.getAttribute('data-amount'), 10);

        if (row.classList.contains('selected')) {
            row.classList.remove('selected');
            this.selectedCoinRow = null;
            this.selectedCoinAmount = null;
            if (selectionActions) {
                selectionActions.classList.add('disabled');
                selectionActions.classList.remove('active');
            }
        } else {
            const tbody = row.closest('tbody');
            if (tbody) {
                tbody.querySelectorAll('tr.component-table-row').forEach(r => r.classList.remove('selected'));
            }
            row.classList.add('selected');
            this.selectedCoinRow = row;
            this.selectedCoinAmount = amount;
            if (selectionActions) {
                selectionActions.classList.remove('disabled');
                selectionActions.classList.add('active');
            }
        }
    }

    handleContentRowSelection(row) {
        const selectionActions = document.querySelector('[data-ref="store-content-selection-actions"]');
        const perkId = row.getAttribute('data-perkid');

        if (row.classList.contains('selected')) {
            row.classList.remove('selected');
            this.selectedPerkRow = null;
            this.selectedPerkId = null;
            if (selectionActions) {
                selectionActions.classList.add('disabled');
                selectionActions.classList.remove('active');
            }
        } else {
            const tbody = row.closest('tbody');
            if (tbody) {
                tbody.querySelectorAll('tr.component-table-row').forEach(r => r.classList.remove('selected'));
            }
            row.classList.add('selected');
            this.selectedPerkRow = row;
            this.selectedPerkId = perkId;
            if (selectionActions) {
                selectionActions.classList.remove('disabled');
                selectionActions.classList.add('active');
            }
        }
    }

    async handleBuySelectedCoins(btn) {
        if (!this.selectedCoinAmount) {
            showMessage(window.__('err_select_package') || 'Por favor, selecciona un paquete de monedas.', 'warning');
            return;
        }
        await this.handleBuyCoins(this.selectedCoinAmount, btn);
    }

    async handleBuySelectedPerk(btn) {
        if (!this.selectedPerkId) {
            showMessage(window.__('err_select_item') || 'Por favor, selecciona un ítem o ventaja.', 'warning');
            return;
        }
        await this.handleBuyPerk(this.selectedPerkId, btn);
    }

    async handleBuyPerk(perkId, btn) {
        if (!perkId || btn.dataset.loading === 'true') return;

        setButtonLoading(btn, (window.__('loading') || 'Cargando') + '...');
        
        try {
            const idempotencyKey = crypto.randomUUID();
            const result = await this.api.post(ApiRoutes.Store.BuyPerk, { perk_id: perkId, idempotency_key: idempotencyKey });
            if (result && result.success) {
                showMessage(window.__('msg_perk_purchased')?.replace(':balance', result.new_balance) || '¡Compra realizada con éxito!', 'success');
                this.updateCoinsDisplay(result.new_balance);
            } else if (result) {
                if (result.message_key === 'store.insufficient_coins') {
                    showMessage(window.__('err_insufficient_coins') || 'Monedas insuficientes', 'error');
                } else {
                    showMessage(result.message_key || window.__('err_process_purchase'), 'error');
                }
            }
        } catch (err) {
            showMessage(window.__('err_network'), 'error');
        } finally {
            restoreButton(btn);
        }
    }

    async handleBuyCoins(amount, btn) {
        if (!amount || btn.dataset.loading === 'true') return;

        setButtonLoading(btn, (window.__('loading') || 'Cargando') + '...');
        
        try {
            const result = await this.api.post(ApiRoutes.Stripe.CreateCoinCheckout, { 
                amount: amount,
                return_url: (window.AppBasePath || window.location.origin) + '/store/coins'
            });
            if (result && result.success && result.checkout_url) {
                window.location.href = result.checkout_url;
            } else if (result) {
                showMessage(result.message_key || window.__('err_process_payment'), 'error');
            }
        } catch (err) {
            showMessage(window.__('err_network'), 'error');
        } finally {
            restoreButton(btn);
        }
    }

    updateCoinsDisplay(newBalance) {
        const balanceEls = document.querySelectorAll('[data-ref="user-coins-balance"]');
        balanceEls.forEach(el => {
            if (newBalance !== undefined) {
                el.innerText = formatNumber(newBalance);
            }
        });
        window.dispatchEvent(new CustomEvent('coins-updated', { detail: { balance: newBalance } }));
    }
}
