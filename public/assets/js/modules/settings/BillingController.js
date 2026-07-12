import { CardTemplates } from '../../core/components/CardTemplates.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

export class BillingController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.contentArea = null;

        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        
        this.bindEvents();

        this.loadPaymentMethods();
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
                const emptyMsg = window.__('empty_billing_methods');
                this.contentArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'credit_card_off');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                
                const emptyMsg = window.__('error_fetching_payment_methods');
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

    destroy() {
        
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
        this.contentArea = null;
    }
}