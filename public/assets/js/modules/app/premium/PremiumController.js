import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

export class PremiumController {

    constructor() {
        this.api = new ApiService();
        this._boundHandleClick = this._handleClick.bind(this);
        this._boundHandleParams = this._handleUrlParams.bind(this);
    }

    init() {
        
        window.isYearlyPremium = false;

        document.body.addEventListener('click', this._boundHandleClick);

        this._handleUrlParams();
    }

    destroy() {
        document.body.removeEventListener('click', this._boundHandleClick);
    }

    _handleClick(e) {
        const toggleSwitch = e.target.closest('#billingCheckboxToggle');
        if (toggleSwitch) {
            this._toggleBilling();
            return;
        }

        const billingLabel = e.target.closest('#lblMonthly, #lblYearly');
        if (billingLabel) {
            const id = billingLabel.id;
            if (id === 'lblMonthly') this._setBilling('monthly');
            else if (id === 'lblYearly') this._setBilling('yearly');
            return;
        }

        const subscribeBtn = e.target.closest('[data-action="subscribe"]');
        if (subscribeBtn) {
            this._handleSubscribeClick(e);
            return;
        }
    }

    _toggleBilling() {
        window.isYearlyPremium = !window.isYearlyPremium;
        this._updateUIBilling();
    }

    _setBilling(type) {
        if (type === 'yearly' && !window.isYearlyPremium) {
            window.isYearlyPremium = true;
            this._updateUIBilling();
        } else if (type === 'monthly' && window.isYearlyPremium) {
            window.isYearlyPremium = false;
            this._updateUIBilling();
        }
    }

    _updateUIBilling() {
        const toggleContainer = document.getElementById('billingToggle');
        const lblMonthly = document.getElementById('lblMonthly');
        const lblYearly = document.getElementById('lblYearly');
        const checkbox = document.getElementById('billingCheckboxToggle');
        const cards = document.querySelectorAll('[data-ref="plan-card"]');

        if (!toggleContainer) return;

        if (checkbox) checkbox.checked = window.isYearlyPremium;

        if (window.isYearlyPremium) {
            lblYearly.classList.remove('component-text-notice--muted');
            lblMonthly.classList.add('component-text-notice--muted');
        } else {
            lblMonthly.classList.remove('component-text-notice--muted');
            lblYearly.classList.add('component-text-notice--muted');
        }

        cards.forEach(card => {
            const priceEl = card.querySelector('[data-ref="plan-price"]');
            const periodEl = card.querySelector('[data-ref="plan-period"]');
            
            if (priceEl && periodEl) {
                priceEl.style.opacity = '0';
                periodEl.style.opacity = '0';
                
                setTimeout(() => {
                    priceEl.textContent = window.isYearlyPremium 
                        ? priceEl.getAttribute('data-yearly') 
                        : priceEl.getAttribute('data-monthly');
                        
                    periodEl.textContent = window.isYearlyPremium 
                        ? periodEl.getAttribute('data-period-yearly') 
                        : periodEl.getAttribute('data-period-monthly');
                        
                    priceEl.classList.remove('disabled-interactive');
                    periodEl.classList.remove('disabled-interactive');
                }, 150);
            }
        });
    }

    _handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const sessionId = urlParams.get('session_id');

        if (status === 'success' && sessionId) {
            showMessage(window.__('msg_payment_success'), 'success');

            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);

            this._pollSubscriptionStatus(3);
        } else if (status === 'cancel') {
            showMessage(window.__('payment_cancelled'), 'warning');
            
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    async _pollSubscriptionStatus(maxAttempts) {
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                const result = await this.api.post(ApiRoutes.Stripe.GetSubscriptionStatus);
                if (result.success && result.data && result.data.status === 'active') {
                    showMessage(window.__('msg_plan_updated'), 'success');

                    setTimeout(() => { window.location.reload(); }, 1500);
                    return;
                }
            } catch (e) {
                
            }
        }
    }

    async _handleSubscribeClick(e) {
        const btn = e.target.closest('[data-action="subscribe"]');
        if (!btn) return;

        e.preventDefault();

        if (!window.activeUserId) {
            window.spaRouter.navigate('/login');
            return;
        }

        const tier = parseInt(btn.dataset.tier, 10);
        const billingPeriod = (window.isYearlyPremium === true) ? 'yearly' : 'monthly';

        if (isNaN(tier) || tier < 0 || tier > 2) {
            showMessage(window.__('err_invalid_plan'), 'error');
            return;
        }

        setButtonLoading(btn);

        try {
            
            const subStatusResult = await this.api.post(ApiRoutes.Stripe.GetSubscriptionStatus);
            let hasActiveStripeSub = false;

            if (subStatusResult.success && subStatusResult.data) {
                const sub = subStatusResult.data;
                if (sub.stripe_subscription_id && (sub.status === 'active' || sub.status === 'past_due')) {
                    hasActiveStripeSub = true;
                }
            }

            if (hasActiveStripeSub) {
                
                const result = await this.api.post(ApiRoutes.Stripe.UpdateSubscription, {
                    tier: tier,
                    billing_period: billingPeriod
                });

                if (result.success && result.updated) {
                    showMessage(window.__('msg_sub_updated'), 'success');
                    setTimeout(() => { window.location.reload(); }, 1500);
                } else {
                    restoreButton(btn);
                    const msg = result.message || window.__('err_update_subscription');
                    showMessage(msg, 'error');
                }

            } else {
                
                const result = await this.api.post(ApiRoutes.Stripe.CreateCheckout, {
                    tier: tier,
                    billing_period: billingPeriod
                });

                if (result.success && result.checkout_url) {
                    
                    window.location.href = result.checkout_url;
                } else {
                    
                    restoreButton(btn);

                    const msg = result.message || window.__('stripe_checkout_error');
                    showMessage(msg, 'error');
                }
            }
        } catch (error) {
            restoreButton(btn);
            showMessage(window.__('err_connection'), 'error');
        }
    }
}
