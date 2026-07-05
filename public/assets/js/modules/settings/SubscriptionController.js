// public/assets/js/modules/settings/SubscriptionController.js

import { CardTemplates } from '../../core/components/CardTemplates.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

export class SubscriptionController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.subscriptionArea = null;
        
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.subscriptionArea = document.querySelector('[data-ref="subscription-content-area"]');
        
        this.bindEvents();
        
        this.loadSubscriptionStatus();
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    handleClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        if (action === 'toggleAutoRenew') {
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
                const emptyMsg = window.__('empty_subscription') || 'No tienes una suscripción activa.';
                this.subscriptionArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'stars');
                this.subscriptionArea.style.display = 'block';
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching subscription status:', error);
                const emptyMsg = window.__('error_fetching_subscription') || 'Error al cargar tu suscripción.';
                this.subscriptionArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'error');
                this.subscriptionArea.style.display = 'block';
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
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
        this.subscriptionArea = null;
    }
}
