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
        this.container = document.querySelector('[data-ref="store-coins-wrapper"], [data-ref="store-content-wrapper"]');
        document.addEventListener('click', this.handleDocumentClickBound);
        this.pendingPurchaseBtn = null;
        this.checkCheckoutSuccess();
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

        row.classList.toggle('selected');

        const selectedRows = document.querySelectorAll('tr.component-table-row.selected[data-perkid]');
        if (selectionActions) {
            if (selectedRows.length > 0) {
                selectionActions.classList.remove('disabled');
                selectionActions.classList.add('active');
            } else {
                selectionActions.classList.add('disabled');
                selectionActions.classList.remove('active');
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
        const selectedRows = Array.from(document.querySelectorAll('tr.component-table-row.selected[data-perkid]'));
        if (selectedRows.length === 0) {
            showMessage(window.__('err_select_item') || 'Por favor, selecciona al menos un ítem o ventaja.', 'warning');
            return;
        }

        if (selectedRows.length === 1) {
            const perkId = selectedRows[0].getAttribute('data-perkid');
            await this.handleBuyPerk(perkId, btn);
            return;
        }

        const items = selectedRows.map(r => ({
            perkId: r.getAttribute('data-perkid'),
            name: r.getAttribute('data-name') || 'Ítem',
            icon: r.getAttribute('data-icon') || 'star',
            price: parseInt(r.getAttribute('data-price') || '0', 10)
        }));
        const totalCoins = items.reduce((sum, item) => sum + item.price, 0);

        if (window.dialogSystem) {
            const res = await window.dialogSystem.show('confirmBulkPerkPurchaseModal', { items, totalCoins });
            if (res && res.confirmed) {
                await this.processBulkPerkPurchase(items, btn, selectedRows);
            }
        } else {
            if (confirm(`¿Estás seguro de gastar ${totalCoins} monedas en estos ${items.length} ítems?`)) {
                await this.processBulkPerkPurchase(items, btn, selectedRows);
            }
        }
    }

    async processBulkPerkPurchase(items, btn, selectedRows) {
        if (!items.length || btn.dataset.loading === 'true') return;

        setButtonLoading(btn, (window.__('loading') || 'Cargando') + '...');

        try {
            const perkIds = items.map(item => item.perkId);
            const idempotencyKey = crypto.randomUUID();
            const result = await this.api.post(ApiRoutes.Store.BuyPerk, {
                perk_ids: perkIds,
                idempotency_key: idempotencyKey
            });

            restoreButton(btn);

            if (result && result.success) {
                if (result.new_balance !== undefined) {
                    this.updateCoinsDisplay(result.new_balance);
                }
                if (selectedRows) {
                    selectedRows.forEach(r => r.classList.remove('selected'));
                    const selectionActions = document.querySelector('[data-ref="store-content-selection-actions"]');
                    if (selectionActions) {
                        selectionActions.classList.add('disabled');
                        selectionActions.classList.remove('active');
                    }
                }
                showMessage(window.__('msg_bulk_purchase_success') || `¡Se han adquirido ${items.length} elementos con éxito!`, 'success');
            } else {
                if (result && result.message_key === 'store.insufficient_coins') {
                    showMessage(window.__('err_insufficient_coins') || 'Monedas insuficientes', 'error');
                } else {
                    const msg = (result && result.message_key) ? window.__(result.message_key) : 'No se pudo procesar la compra en lote.';
                    showMessage(msg, 'error');
                }
            }
        } catch (err) {
            restoreButton(btn);
            showMessage(window.__('err_network') || 'Error de conexión', 'error');
        }
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
                const selectedRows = document.querySelectorAll('tr.component-table-row.selected[data-perkid]');
                selectedRows.forEach(r => r.classList.remove('selected'));
                const selectionActions = document.querySelector('[data-ref="store-content-selection-actions"]');
                if (selectionActions) {
                    selectionActions.classList.add('disabled');
                    selectionActions.classList.remove('active');
                }
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

    async checkCheckoutSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        if (urlParams.get('checkout') === 'success' && sessionId) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            let purchasedCoins = 0;
            try {
                const res = await this.api.post(ApiRoutes.Store.GetBalance, { session_id: sessionId });
                if (res && res.success) {
                    if (res.coins !== undefined) {
                        this.updateCoinsDisplay(res.coins);
                    }
                    if (res.purchased_coins !== undefined && res.purchased_coins > 0) {
                        purchasedCoins = res.purchased_coins;
                    }
                }
            } catch (e) {}

            if (window.dialogSystem) {
                window.dialogSystem.show('purchaseSuccessModal', {
                    item_type: 'coins',
                    coins: purchasedCoins || 0
                });
            } else {
                const msgSuccess = (window.__ && window.__('msg_purchase_success')) || '¡Pago completado con éxito!';
                showMessage(msgSuccess, 'success');
            }
        }
    }
}
