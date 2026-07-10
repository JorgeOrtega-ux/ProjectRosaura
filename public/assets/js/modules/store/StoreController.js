// public/assets/js/StoreController.js
import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

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
        const dataEl = document.getElementById('store-content-data');
        if (dataEl && dataEl.getAttribute('data-accepted') !== 'true') {
            const result = await window.dialogSystem.show('modalContentStoreTerms');
            if (result && result.confirmed) {
                if (!result.data || !result.data.checkAcceptContentTerms) {
                    showMessage('Debes confirmar que entiendes las condiciones marcando la casilla.', 'error');
                    return;
                }
                setButtonLoading(btn, 'Guardando...');
                try {
                    const res = await this.api.post(ApiRoutes.Settings.UpdatePreferences, { key: 'accepted_content_store_terms', value: 1 });
                    if (res && res.success) {
                        dataEl.setAttribute('data-accepted', 'true');
                        restoreButton(btn);
                        return this.handleBuyPerk(btn);
                    } else {
                        showMessage(res?.message || 'Error al guardar preferencia', 'error');
                        restoreButton(btn);
                        return;
                    }
                } catch (e) {
                    showMessage('Error de red', 'error');
                    restoreButton(btn);
                    return;
                }
            }
            return;
        }

        const perkId = btn.getAttribute('data-perkid');
        if (!perkId) return;

        setButtonLoading(btn, 'Cargando...');
        
        try {
            const result = await this.api.post(ApiRoutes.Store.BuyPerk, { perk_id: perkId });
            if (result && result.success) {
                showMessage('Ventaja comprada con éxito. Tu nuevo saldo es de: ' + result.new_balance + ' monedas.', 'success');
                this.updateCoinsDisplay(result.new_balance);
            } else if (result) {
                if (result.message_key === 'store.insufficient_coins') {
                    showMessage('No tienes suficientes monedas para comprar esta ventaja.', 'error');
                } else {
                    showMessage(result.message_key || 'Error al procesar la compra', 'error');
                }
            }
        } catch (err) {
            showMessage('Error de red', 'error');
        } finally {
            restoreButton(btn);
        }
    }

    async handleBuyCoins(btn) {
        if (btn.dataset.loading === 'true') return;
        const dataEl = document.getElementById('store-coins-data');
        if (dataEl && dataEl.getAttribute('data-accepted') !== 'true') {
            const result = await window.dialogSystem.show('modalStoreTerms');
            if (result && result.confirmed) {
                if (!result.data || !result.data.checkAcceptStoreTerms) {
                    showMessage('Debes aceptar las condiciones marcando la casilla antes de continuar.', 'error');
                    return;
                }
                setButtonLoading(btn, 'Guardando...');
                try {
                    const res = await this.api.post(ApiRoutes.Settings.UpdatePreferences, { key: 'accepted_store_terms', value: 1 });
                    if (res && res.success) {
                        dataEl.setAttribute('data-accepted', 'true');
                        restoreButton(btn);
                        return this.handleBuyCoins(btn);
                    } else {
                        showMessage(res?.message || 'Error al guardar preferencia', 'error');
                        restoreButton(btn);
                        return;
                    }
                } catch (e) {
                    showMessage('Error de red', 'error');
                    restoreButton(btn);
                    return;
                }
            }
            return;
        }

        const amount = parseInt(btn.getAttribute('data-amount'));
        if (!amount) return;
        
        setButtonLoading(btn, 'Cargando...');
        
        try {
            const result = await this.api.post(ApiRoutes.Stripe.CreateCoinCheckout, { 
                amount: amount,
                return_url: (window.AppBasePath || window.location.origin) + '/store/coins'
            });
            if (result && result.success && result.checkout_url) {
                window.location.href = result.checkout_url;
            } else if (result) {
                showMessage(result.message_key || 'Error al procesar el pago', 'error');
            }
        } catch (err) {
            showMessage('Error de red', 'error');
        } finally {
            restoreButton(btn);
        }
    }

    updateCoinsDisplay(newBalance) {
        const balanceEls = document.querySelectorAll('[data-ref="user-coins-balance"]');
        balanceEls.forEach(el => {
            if (newBalance !== undefined) {
                el.innerText = newBalance.toLocaleString();
            }
        });
        window.dispatchEvent(new CustomEvent('coins-updated', { detail: { balance: newBalance } }));
    }
}
