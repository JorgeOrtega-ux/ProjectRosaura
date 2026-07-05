// public/assets/js/modules/settings/BillingController.js

import { CardTemplates } from '../../core/components/CardTemplates.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

export class BillingController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.contentArea = null;
        
        // Regla 1: Binding obligatorio en el constructor inerte
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        this.subscriptionArea = document.querySelector('[data-ref="subscription-content-area"]');
        
        this.bindEvents();
        
        // Simulación de carga inicial de datos
        this.loadSubscriptionStatus();
        this.loadPaymentMethods();
    }

    bindEvents() {
        // Regla 3: Delegación pura global
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
        }
    }

    async loadSubscriptionStatus() {
        if (!this.subscriptionArea) return;

        try {
            const response = await this.api.post('stripe.get_subscription_status', {}, this.abortController.signal);
            
            if (response.success && response.data) {
                // Hay una suscripción activa
                this.subscriptionArea.innerHTML = CardTemplates.subscriptionCard(response.data);
                this.subscriptionArea.style.display = 'block';
            } else {
                // No hay suscripción o no pudo cargar
                this.subscriptionArea.style.display = 'none';
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching subscription status:', error);
                this.subscriptionArea.style.display = 'none';
            }
        }
    }

    async loadPaymentMethods() {
        if (!this.contentArea) return;

        try {
            const response = await this.api.post('stripe.get_payment_methods', {}, this.abortController.signal);
            
            if (response.success && response.data && response.data.length > 0) {
                let html = '<div class="component-grid">';
                response.data.forEach(card => {
                    html += CardTemplates.paymentMethodCard(card);
                });
                html += '</div>';
                this.contentArea.innerHTML = html;
            } else {
                const emptyMsg = window.__('empty_billing_methods') || 'No tienes métodos de pago guardados.';
                this.contentArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'credit_card_off');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching payment methods:', error);
                const emptyMsg = window.__('error_fetching_payment_methods') || 'Error al cargar métodos de pago.';
                this.contentArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'error');
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
                showMessage('error', response.message_key || 'Error creating setup session');
                restoreButton(btn);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage('error', 'Network or unexpected error');
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
                const msgDefault = cancelAtPeriodEnd ? 'Renovación automática cancelada' : 'Suscripción reactivada';
                showMessage('success', window.__ ? window.__(msgKey) || msgDefault : msgDefault);
                
                // Recargar el estado para actualizar la UI
                this.loadSubscriptionStatus();
            } else {
                showMessage('error', response.message_key || 'Error toggling auto renewal');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage('error', 'Network or unexpected error');
            }
        } finally {
            if (this.abortController && !this.abortController.signal.aborted) {
                restoreButton(btn);
            }
        }
    }

    destroy() {
        // Regla 4 y 7: Limpieza rigurosa
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
        this.contentArea = null;
    }
}