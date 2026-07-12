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
                
                this.subscriptionArea.innerHTML = CardTemplates.subscriptionCard(response.data);
                this.subscriptionArea.classList.remove('disabled'); this.subscriptionArea.classList.add('active');
            } else {
                
                const emptyMsg = window.__('empty_subscription');
                this.subscriptionArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'stars');
                this.subscriptionArea.classList.remove('disabled'); this.subscriptionArea.classList.add('active');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                
                const emptyMsg = window.__('error_fetching_subscription');
                this.subscriptionArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'error');
                this.subscriptionArea.classList.remove('disabled'); this.subscriptionArea.classList.add('active');
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
                showMessage(window.__(msgKey), 'success');

                this.loadSubscriptionStatus();
            } else {
                showMessage(window.__('err_toggle_auto_renew'), 'error');
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

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
        this.subscriptionArea = null;
    }
}
