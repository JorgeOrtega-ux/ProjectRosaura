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
        ]).finally(() => {
            const addCardBtn = document.querySelector('[data-action="addNewCard"]');
            if (addCardBtn) {
                addCardBtn.classList.remove('disabled-interaction');
            }
        });
    }

    renderSkeletons() {
        if (this.paymentMethodsArea) {
            this.paymentMethodsArea.innerHTML = `
                <div class="component-group-item">
                    <div class="component-spinner"></div>
                    <span >${window.__('loading_payment_methods')}</span>
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
                this.updateSubscriptionData(response.data);
            } else {
                const planDescEl = this.subscriptionArea.querySelector('[data-ref="sub-plan-desc"]');
                if (planDescEl) planDescEl.textContent = window.__('empty_subscription');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                const planDescEl = this.subscriptionArea.querySelector('[data-ref="sub-plan-desc"]');
                if (planDescEl) planDescEl.textContent = window.__('error_fetching_subscription');
            }
        } finally {
            if (this.subscriptionArea) {
                this.subscriptionArea.classList.remove('disabled-interaction');
            }
        }
    }

    updateSubscriptionData(data) {
        if (!this.subscriptionArea) return;

        let tierName = data.tier_name || '';
        if (!tierName && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
            const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === parseInt(data.tier, 10));
            if (found && found.name) tierName = found.name;
        }
        const status = data.status || 'active';
        const cancelAtEnd = data.cancel_at_period_end;
        let dateLabel = cancelAtEnd ? (window.__('ends_on')) : (window.__('next_billing'));

        let dateVal = '-';
        if (data.current_period_end) {
            let dateObj;
            if (typeof data.current_period_end === 'string' && isNaN(Number(data.current_period_end))) {
                dateObj = new Date(data.current_period_end.replace(' ', 'T'));
            } else {
                dateObj = new Date(Number(data.current_period_end) * 1000);
            }
            if (!isNaN(dateObj.getTime())) {
                dateVal = dateObj.toLocaleDateString();
            }
        }

        let statusText = window.__('status_active');
        if (status !== 'active') {
            statusText = status === 'incomplete' ? (window.__('status_incomplete')) : (window.__('status_inactive'));
        } else if (cancelAtEnd) {
            statusText = window.__('will_cancel_soon');
        }

        // 1. Plan description
        const planDescEl = this.subscriptionArea.querySelector('[data-ref="sub-plan-desc"]');
        if (planDescEl) {
            planDescEl.textContent = `${tierName} (${statusText})`;
        }

        // 2. Renewal container
        const renewalContainer = this.subscriptionArea.querySelector('[data-ref="sub-renewal-container"]');
        if (renewalContainer) {
            if (data.tier > 0) {
                renewalContainer.style.display = 'block';
                let renewText = cancelAtEnd ? (window.__('status_canceled')) : (window.__('status_active'));
                const renewalDescEl = renewalContainer.querySelector('[data-ref="sub-renewal-desc"]');
                if (renewalDescEl) {
                    renewalDescEl.textContent = `${renewText} (${dateLabel} ${dateVal})`;
                }

                const renewalBtn = renewalContainer.querySelector('[data-ref="sub-renewal-btn"]');
                if (renewalBtn) {
                    const actionText = cancelAtEnd ? (window.__('btn_reactivate_sub')) : (window.__('btn_cancel_renew'));
                    renewalBtn.textContent = actionText;
                    renewalBtn.dataset.cancelState = !cancelAtEnd;
                    if (cancelAtEnd) {
                        renewalBtn.classList.remove('component-button--dark');
                        renewalBtn.classList.add('component-button--brand');
                    } else {
                        renewalBtn.classList.remove('component-button--brand');
                        renewalBtn.classList.add('component-button--dark');
                    }
                }
            } else {
                renewalContainer.style.display = 'none';
            }
        }

        // 3. Storage section
        const storage = data.storage || { used_mb: 0, max_mb: 20, remaining_mb: 20, used_percentage: 0 };
        const usedMB = storage.used_mb !== undefined ? storage.used_mb : 0;
        const maxMB = storage.max_mb !== undefined ? storage.max_mb : 20;
        const remainingMB = storage.remaining_mb !== undefined ? storage.remaining_mb : maxMB;
        const percentage = storage.used_percentage !== undefined ? storage.used_percentage : 0;

        const subtitleEl = this.subscriptionArea.querySelector('[data-ref="sub-storage-subtitle"]');
        if (subtitleEl) {
            subtitleEl.textContent = `Tu capacidad de almacenamiento · ${usedMB} MB de ${maxMB} MB utilizados (Quedan ${remainingMB} MB)`;
        }

        const percentageEl = this.subscriptionArea.querySelector('[data-ref="sub-storage-percentage"]');
        if (percentageEl) {
            percentageEl.textContent = `${percentage}% ${window.__('used') || 'usado'}`;
        }

        const progressFill = this.subscriptionArea.querySelector('[data-ref="sub-storage-progress-fill"]');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        // 4. Tokens section
        const tokens = data.tokens || { used_tokens: 0, max_tokens: 0, remaining_tokens: 0, used_percentage: 0, reset_in_seconds: 0, has_feature: false };
        const tokensContainer = this.subscriptionArea.querySelector('[data-ref="sub-tokens-container"]');
        const tokensDivider = this.subscriptionArea.querySelector('[data-ref="sub-tokens-divider"]');

        if (tokensContainer) {
            if (tokens.has_feature || tokens.max_tokens > 0) {
                if (tokensDivider) tokensDivider.style.display = 'block';
                tokensContainer.style.display = 'block';

                const usedTok = tokens.used_tokens || 0;
                const maxTok = tokens.max_tokens || 5000;
                const remainingTok = tokens.remaining_tokens !== undefined ? tokens.remaining_tokens : Math.max(0, maxTok - usedTok);
                const tokPercentage = tokens.used_percentage !== undefined ? tokens.used_percentage : 0;
                
                let resetText = '';
                if (tokens.reset_in_seconds && tokens.reset_in_seconds > 0) {
                    const hrs = Math.floor(tokens.reset_in_seconds / 3600);
                    const mins = Math.floor((tokens.reset_in_seconds % 3600) / 60);
                    resetText = ` · Restablece en ${hrs}h ${mins}m`;
                } else if (usedTok > 0) {
                    resetText = ' · Restableciendo pronto';
                } else {
                    resetText = ' · Ventana de 5h activa';
                }

                const tokensSubtitleEl = tokensContainer.querySelector('[data-ref="sub-tokens-subtitle"]');
                if (tokensSubtitleEl) {
                    tokensSubtitleEl.textContent = `Tokens consumidos · ${usedTok.toLocaleString()} / ${maxTok.toLocaleString()} Tokens (Quedan ${remainingTok.toLocaleString()})${resetText}`;
                }

                const tokensPercentageEl = tokensContainer.querySelector('[data-ref="sub-tokens-percentage"]');
                if (tokensPercentageEl) {
                    tokensPercentageEl.textContent = `${tokPercentage}% ${window.__('used') || 'usado'}`;
                }

                const tokensProgressFill = tokensContainer.querySelector('[data-ref="sub-tokens-progress-fill"]');
                if (tokensProgressFill) {
                    tokensProgressFill.style.width = `${tokPercentage}%`;
                }
            } else {
                if (tokensDivider) tokensDivider.style.display = 'none';
                tokensContainer.style.display = 'none';
            }
        }
    }

    async loadPaymentMethods() {
        if (!this.paymentMethodsArea) return;

        try {
            const response = await this.api.post(ApiRoutes.Stripe.GetPaymentMethods, {}, this.abortController.signal);
            
            if (response.success && response.data && response.data.length > 0) {
                let html = '<div class="component-list component-list--flush">';
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
        } finally {
            const pmAccordion = document.querySelector('[data-ref="payment-methods-accordion"]');
            if (pmAccordion) {
                pmAccordion.classList.remove('disabled-interaction');
            }
        }
    }

    async handleDeletePaymentMethod(btn) {
        const pmId = btn.dataset.pmId;
        if (!pmId) return;

        if (!window.dialogSystem) return;

        const confirm = await window.dialogSystem.show('confirmAction', {
            title: window.__('title_delete_payment_method'),
            message: window.__('desc_delete_payment_method'),
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