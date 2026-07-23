import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

export class UpgradeController {

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

        const closeModalBtn = e.target.closest('[data-action="closeUpgradeModal"]');
        if (closeModalBtn) {
            const modal = document.getElementById('upgradeConfirmModal');
            if (modal) modal.style.display = 'none';
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
            lblYearly.classList.remove('component-button--ghost', 'component-text-notice--muted');
            lblYearly.classList.add('component-button--dark');
            lblMonthly.classList.remove('component-button--dark');
            lblMonthly.classList.add('component-button--ghost', 'component-text-notice--muted');
        } else {
            lblMonthly.classList.remove('component-button--ghost', 'component-text-notice--muted');
            lblMonthly.classList.add('component-button--dark');
            lblYearly.classList.remove('component-button--dark');
            lblYearly.classList.add('component-button--ghost', 'component-text-notice--muted');
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
                        
                    priceEl.style.opacity = '1';
                    periodEl.style.opacity = '1';
                    priceEl.classList.remove('disabled-interaction');
                    periodEl.classList.remove('disabled-interaction');
                }, 150);
            }
        });
    }

    _handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status') || urlParams.get('checkout');
        const sessionId = urlParams.get('session_id');

        if ((status === 'success' || urlParams.get('checkout') === 'success') && sessionId) {
            showMessage(window.__('msg_payment_success') || '¡Pago completado con éxito!', 'success');
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            this._pollSubscriptionStatus(3, sessionId);
        } else if (status === 'cancel') {
            showMessage(window.__('payment_cancelled') || 'Pago cancelado', 'warning');
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    async _pollSubscriptionStatus(maxAttempts, sessionId = null) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const payload = sessionId ? { session_id: sessionId } : {};
                const result = await this.api.post(ApiRoutes.Stripe.GetSubscriptionStatus, payload);
                if (result.success && result.data && (result.data.status === 'active' || result.data.tier > 0)) {
                    window.appUserTier = result.data.tier;
                    window.dispatchEvent(new CustomEvent('subscription-updated', { detail: result.data }));
                    if (window.dialogSystem) {
                        window.dialogSystem.show('welcomePremiumModal', result.data);
                    } else {
                        showMessage(window.__('msg_plan_updated') || '¡Suscripción actualizada!', 'success');
                    }
                    return;
                }
            } catch (e) {}
            await new Promise(resolve => setTimeout(resolve, 1500));
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

        if (isNaN(tier) || tier < 0 || tier > 3) {
            showMessage(window.__('err_invalid_plan'), 'error');
            return;
        }

        setButtonLoading(btn);

        try {
            const previewResult = await this.api.post(ApiRoutes.Stripe.PreviewUpgrade, {
                tier: tier,
                billing_period: billingPeriod
            });

            restoreButton(btn);

            if (previewResult.success) {
                await this._showConfirmModal(previewResult.data || previewResult, tier, billingPeriod, btn);
            } else {
                showMessage(previewResult.message || window.__('err_connection'), 'error');
            }
        } catch (error) {
            restoreButton(btn);
            showMessage(window.__('err_connection'), 'error');
        }
    }

    async _showConfirmModal(previewData, tier, billingPeriod, btn) {
        if (!window.dialogSystem) {
            this._processActualSubscription(tier, billingPeriod, btn);
            return;
        }

        const amount = (previewData.amount_due / 100).toFixed(2);
        const currency = previewData.currency;
        const isUpgrade = previewData.is_upgrade;

        const confirmRes = await window.dialogSystem.show('confirmUpgradeModal', {
            amount: amount,
            currency: currency,
            isUpgrade: isUpgrade
        });

        if (confirmRes && (confirmRes.action === 'confirm' || confirmRes.action === true || confirmRes.confirmed)) {
            const password = (confirmRes.data && confirmRes.data.confirmPurchasePasswordInput) || confirmRes.confirmPurchasePasswordInput || '';
            this._processActualSubscription(tier, billingPeriod, btn, password);
        }
    }

    async _processActualSubscription(tier, billingPeriod, btn, password = '') {
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
                    billing_period: billingPeriod,
                    password: password
                });

                if (result.success && result.checkout_url) {
                    window.location.href = result.checkout_url;
                } else if (result.success && result.updated) {
                    window.appUserTier = tier;
                    window.dispatchEvent(new CustomEvent('subscription-updated', { detail: { tier: tier } }));
                    if (window.dialogSystem) {
                        window.dialogSystem.show('welcomePremiumModal', { tier: tier, item_type: 'subscription' }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        showMessage(window.__('msg_sub_updated') || '¡Suscripción actualizada!', 'success');
                        setTimeout(() => { window.location.reload(); }, 1500);
                    }
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
                } else if (result.success && result.updated) {
                    window.appUserTier = tier;
                    window.dispatchEvent(new CustomEvent('subscription-updated', { detail: { tier: tier } }));
                    if (window.dialogSystem) {
                        window.dialogSystem.show('welcomePremiumModal', { tier: tier, item_type: 'subscription' }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        showMessage(window.__('msg_sub_updated') || '¡Suscripción actualizada!', 'success');
                        setTimeout(() => { window.location.reload(); }, 1500);
                    }
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
export { UpgradeController as PremiumController };
