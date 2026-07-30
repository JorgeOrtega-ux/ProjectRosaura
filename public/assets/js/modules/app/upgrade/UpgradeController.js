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
        this.wrapper = document.querySelector('[data-ref="subscription-wrapper"]');
        window.isYearlyPremium = false;
        document.body.addEventListener('click', this._boundHandleClick);
        this._handleUrlParams();
    }

    destroy() {
        document.body.removeEventListener('click', this._boundHandleClick);
    }

    _handleClick(e) {
        const setBillingLink = e.target.closest('[data-action="setBillingCycle"]');
        if (setBillingLink) {
            const val = setBillingLink.getAttribute('data-value');
            this._setBilling(val);
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
        
        const toggleFeaturesBtn = e.target.closest('[data-action="toggle-plan-features"]');
        if (toggleFeaturesBtn) {
            e.preventDefault();
            this._toggleFeatures(toggleFeaturesBtn);
            return;
        }
    }

    _setBilling(type) {
        if (type === 'yearly') {
            window.isYearlyPremium = true;
        } else {
            window.isYearlyPremium = false;
        }
        this._updateUIBilling();

        if (window.appInstance && typeof window.appInstance.closeAllModules === 'function') {
            window.appInstance.closeAllModules();
        }
    }

    _toggleFeatures(btn) {
        const container = btn.closest('.upgrade-card-features');
        if (!container) return;
        
        const hiddenItems = container.querySelectorAll('.upgrade-card-feature-item[data-hidden="true"]');
        if (!hiddenItems.length) return;
        
        const isCurrentlyHidden = hiddenItems[0].classList.contains('upgrade-card-feature-item--hidden');
        
        if (isCurrentlyHidden) {
            hiddenItems.forEach(item => item.classList.remove('upgrade-card-feature-item--hidden'));
            btn.textContent = window.__('upgrade_hide_features');
        } else {
            hiddenItems.forEach(item => item.classList.add('upgrade-card-feature-item--hidden'));
            btn.textContent = window.__('upgrade_show_features');
        }
    }

    _updateUIBilling() {
        const triggerText = document.querySelector('[data-target="moduleBillingCycle"] [data-ref="billingCycleText"]');
        const triggerIcon = document.querySelector('[data-target="moduleBillingCycle"] [data-ref="billingCycleIcon"]');
        const links = document.querySelectorAll('[data-action="setBillingCycle"]');
        const cards = document.querySelectorAll('[data-ref="plan-card"]');

        if (window.isYearlyPremium) {
            if (triggerText) triggerText.textContent = window.__('upgrade_billing_yearly') || 'Anual';
            if (triggerIcon) triggerIcon.textContent = 'event_repeat';
        } else {
            if (triggerText) triggerText.textContent = window.__('upgrade_billing_monthly') || 'Mensual';
            if (triggerIcon) triggerIcon.textContent = 'calendar_month';
        }

        links.forEach(link => {
            const val = link.getAttribute('data-value');
            if ((val === 'yearly' && window.isYearlyPremium) || (val === 'monthly' && !window.isYearlyPremium)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

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
            showMessage(window.__('msg_payment_success'), 'success');
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            this._pollSubscriptionStatus(3, sessionId);
        } else if (status === 'cancel') {
            showMessage(window.__('payment_cancelled'), 'warning');
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
                    if (window.modalSystem) {
                        window.modalSystem.show('welcomePremiumModal', result.data);
                    } else {
                        showMessage(window.__('msg_plan_updated'), 'success');
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
        if (!window.modalSystem) {
            this._processActualSubscription(tier, billingPeriod, btn);
            return;
        }

        const amount = (previewData.amount_due / 100).toFixed(2);
        const currency = previewData.currency;
        const isUpgrade = previewData.is_upgrade;

        const confirmRes = await window.modalSystem.show('confirmUpgradeModal', {
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
                    if (window.modalSystem) {
                        window.modalSystem.show('welcomePremiumModal', { tier: tier, item_type: 'subscription' }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        showMessage(window.__('msg_sub_updated'), 'success');
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
                    if (window.modalSystem) {
                        window.modalSystem.show('welcomePremiumModal', { tier: tier, item_type: 'subscription' }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        showMessage(window.__('msg_sub_updated'), 'success');
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
