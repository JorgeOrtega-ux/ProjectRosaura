import { CardTemplates } from '../../core/components/CardTemplates.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

export class BillingController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.subscriptionArea = null;
        this.paymentMethodsArea = null;

        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.subscriptionArea = document.querySelector('[data-ref="subscription-storage-area"]');
        this.paymentMethodsArea = document.querySelector('[data-ref="payment-methods-area"]');

        this.bindEvents();
        this.renderSkeletons();

        Promise.all([
            this.loadSubscriptionStatus(),
            this.loadPaymentMethods()
        ]);
    }

    renderSkeletons() {
        if (this.subscriptionArea) {
            this.subscriptionArea.innerHTML = `
                <div class="component-group-item component-group-item--wrap" style="padding: 24px;">
                    <div class="component-card__content">
                        <div class="component-spinner"></div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">${window.__('loading_subscription') || 'Cargando información de suscripción...'}</h2>
                            <p class="component-card__description">${window.__('please_wait') || 'Obteniendo datos de Stripe...'}</p>
                        </div>
                    </div>
                </div>
            `;
            this.subscriptionArea.classList.remove('disabled');
            this.subscriptionArea.classList.add('active');
        }

        if (this.paymentMethodsArea) {
            this.paymentMethodsArea.innerHTML = `
                <div class="component-group-item" style="padding: 20px; justify-content: center; align-items: center; gap: 10px;">
                    <div class="component-spinner"></div>
                    <span class="component-text-secondary" style="font-size: 0.85rem;">${window.__('loading_payment_methods') || 'Cargando métodos de pago...'}</span>
                </div>
            `;
        }
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    handleClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        if (action === 'addNewCard') {
            this.handleAddNewCard(btn);
        } else if (action === 'toggleAutoRenew') {
            this.handleToggleAutoRenew(btn);
        } else if (action === 'deletePaymentMethod') {
            this.handleDeletePaymentMethod(btn);
        }
    }

    async loadSubscriptionStatus() {
        if (!this.subscriptionArea) return;

        try {
            const response = await this.api.post(ApiRoutes.Stripe.GetSubscriptionStatus, {}, this.abortController.signal);
            
            if (response.success && response.data) {
                this.subscriptionArea.innerHTML = CardTemplates.subscriptionCard(response.data);
                this.subscriptionArea.classList.remove('disabled');
                this.subscriptionArea.classList.add('active');
            } else {
                const emptyMsg = window.__('empty_subscription') || 'No tienes una suscripción activa.';
                this.subscriptionArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'stars');
                this.subscriptionArea.classList.remove('disabled');
                this.subscriptionArea.classList.add('active');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                const emptyMsg = window.__('error_fetching_subscription') || 'Error al obtener estado de suscripción.';
                this.subscriptionArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'error');
                this.subscriptionArea.classList.remove('disabled');
                this.subscriptionArea.classList.add('active');
            }
        }
    }

    async loadPaymentMethods() {
        if (!this.paymentMethodsArea) return;

        try {
            const response = await this.api.post(ApiRoutes.Stripe.GetPaymentMethods, {}, this.abortController.signal);
            
            if (response.success && response.data && response.data.length > 0) {
                let html = '<div class="component-pm-list">';
                response.data.forEach(card => {
                    html += CardTemplates.paymentMethodCard(card);
                });
                html += '</div>';
                this.paymentMethodsArea.innerHTML = html;
            } else {
                const emptyMsg = window.__('empty_billing_methods');
                this.paymentMethodsArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'credit_card_off');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                const emptyMsg = window.__('error_fetching_payment_methods');
                this.paymentMethodsArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'error');
            }
        }
    }

    async handleDeletePaymentMethod(btn) {
        const pmId = btn.dataset.pmId;
        if (!pmId) return;

        if (!window.dialogSystem) return;

        const confirm = await window.dialogSystem.show('confirmAction', {
            title: window.__('title_delete_payment_method') || 'Eliminar Tarjeta',
            message: window.__('desc_delete_payment_method') || '¿Estás seguro de que deseas eliminar esta tarjeta de pago?',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_delete'
        });

        if (!confirm.confirmed) return;

        setButtonLoading(btn);

        try {
            const route = ApiRoutes.Stripe.DeletePaymentMethod;
            const response = await this.api.post(route, { payment_method_id: pmId }, this.abortController.signal);

            if (response.success) {
                showMessage(response.message || window.__('card_deleted_success'), 'success');
                this.loadPaymentMethods();
            } else {
                showMessage(response.message || window.__('err_delete_card'), 'error');
            }
        } catch (error) {
            console.error('[BillingController] Error deleting payment method:', error);
            if (error.name !== 'AbortError') {
                showMessage(error.message || window.__('err_network'), 'error');
            }
        } finally {
            if (this.abortController && !this.abortController.signal.aborted) {
                restoreButton(btn);
            }
        }
    }

    async handleToggleAutoRenew(btn) {
        setButtonLoading(btn);
        const cancelStateStr = btn.dataset.cancelState;
        const cancelAtPeriodEnd = cancelStateStr === 'true';

        try {
            const response = await this.api.post('stripe.toggle_auto_renewal', {
                cancel_at_period_end: cancelAtPeriodEnd
            }, this.abortController.signal);

            if (response.success) {
                const msgKey = cancelAtPeriodEnd ? 'renewal_cancelled_success' : 'renewal_reactivated_success';
                showMessage(window.__(msgKey) || response.message, 'success');

                this.loadSubscriptionStatus();
            } else {
                showMessage(response.message || window.__('err_toggle_auto_renew'), 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_network'), 'error');
            }
        } finally {
            if (this.abortController && !this.abortController.signal.aborted) {
                restoreButton(btn);
            }
        }
    }

    async handleAddNewCard(btn) {
        setButtonLoading(btn);
        try {
            const response = await this.api.post('stripe.create_setup_session', {}, this.abortController.signal);
            if (response.success && response.checkout_url) {
                window.location.href = response.checkout_url;
            } else {
                showMessage(window.__('err_create_setup_session'), 'error');
                restoreButton(btn);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_network'), 'error');
                restoreButton(btn);
            }
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
        this.subscriptionArea = null;
        this.paymentMethodsArea = null;
    }
}