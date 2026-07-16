import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton, formatNumber } from '../../core/utils/uiUtils.js';
export class StoreController {
    constructor() {
        this.api = new ApiService();
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
    }

    init() {
        document.addEventListener('click', this.handleDocumentClickBound);
        this.pendingPurchaseBtn = null;
    }

    destroy() {
        document.removeEventListener('click', this.handleDocumentClickBound);
    }

    handleDocumentClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        if (action === 'buyPerk') {
            e.preventDefault();
            this.handleBuyPerk(btn);
        } else if (action === 'buyCoins') {
            e.preventDefault();
            this.handleBuyCoins(btn);
        } else if (action === 'confirmStoreTerms') {
            this.confirmStoreTerms(btn);
        } else if (action === 'confirmContentTerms') {
            this.confirmContentTerms(btn);
        }
    }

    async handleBuyPerk(btn) {
        if (btn.dataset.loading === 'true') return;

        const perkId = btn.getAttribute('data-perkid');
        if (!perkId) return;

        setButtonLoading(btn, window.__('loading') + '...');
        
        try {
            const result = await this.api.post(ApiRoutes.Store.BuyPerk, { perk_id: perkId });
            if (result && result.success) {
                showMessage(window.__('msg_perk_purchased').replace(':balance', result.new_balance), 'success');
                this.updateCoinsDisplay(result.new_balance);
            } else if (result) {
                if (result.message_key === 'store.insufficient_coins') {
                    showMessage(window.__('err_insufficient_coins'), 'error');
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

    async handleBuyCoins(btn) {
        if (btn.dataset.loading === 'true') return;

        const amount = parseInt(btn.getAttribute('data-amount'));
        if (!amount) return;
        
        setButtonLoading(btn, window.__('loading') + '...');
        
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
