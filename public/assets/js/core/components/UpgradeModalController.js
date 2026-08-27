import { ApiRoutes } from '../api/ApiRoutes.js';
import { ApiService } from '../api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton, getDynamicTierName } from '../utils/uiUtils.js';

export class UpgradeModalController {
    constructor(modalBox, data = {}) {
        this.modalBox = modalBox;
        this.data = data;
        this.api = new ApiService();

        this.currentTier = parseInt(window.appUserTier ?? (window.APP_USER?.subscription_tier ?? 0), 10);
        
        // Active paid tiers
        this.activeTiers = [];
        if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
            this.activeTiers = [...window.APP_TIERS]
                .filter(t => parseInt(t.tier_level, 10) > 0 && t.is_active !== 0 && t.is_active !== false)
                .sort((a, b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
        }

        // Determine initial tier
        let reqTier = parseInt(data.initialTier ?? data.selectedTier ?? data.tier ?? 0, 10);
        if (!this.activeTiers.some(t => parseInt(t.tier_level, 10) === reqTier)) {
            const popTier = this.activeTiers.find(t => t.is_popular == 1 || t.is_popular === true);
            reqTier = popTier ? parseInt(popTier.tier_level, 10) : (this.activeTiers[0] ? parseInt(this.activeTiers[0].tier_level, 10) : 1);
        }

        this.selectedTierLevel = reqTier;
        this.billingPeriod = data.billingPeriod || (window.isYearlyPremium ? 'yearly' : 'monthly');

        this._handleClickBound = this._handleClick.bind(this);
    }

    init() {
        if (!this.modalBox) return;
        this.bindEvents();
        this.updateUI();
    }

    bindEvents() {
        if (this.modalBox) {
            this.modalBox.addEventListener('click', this._handleClickBound);
        }
    }

    destroy() {
        if (this.modalBox) {
            this.modalBox.removeEventListener('click', this._handleClickBound);
        }
    }

    _handleClick(e) {
        // 1. Select plan card
        const card = e.target.closest('[data-action="select-modal-tier"]');
        if (card) {
            e.preventDefault();
            const tierVal = parseInt(card.getAttribute('data-tier'), 10);
            if (!isNaN(tierVal)) {
                this.selectTier(tierVal);
            }
            return;
        }

        // 2. Switch billing period
        const billingBtn = e.target.closest('[data-action="setModalBillingCycle"]');
        if (billingBtn) {
            e.preventDefault();
            const cycle = billingBtn.getAttribute('data-value');
            if (cycle) {
                this.setBillingPeriod(cycle);
            }
            return;
        }

        // 3. CTA Subscribe button
        const subscribeBtn = e.target.closest('[data-action="upgradeModalSubscribe"]');
        if (subscribeBtn) {
            e.preventDefault();
            this.handleSubscribe(subscribeBtn);
            return;
        }

        // 4. Go to /upgrade page
        const goToUpgradeBtn = e.target.closest('[data-action="goToUpgradePage"]');
        if (goToUpgradeBtn) {
            e.preventDefault();
            if (window.modalSystem) {
                window.modalSystem.closeCurrent();
            }
            const basePath = window.AppBasePath || '';
            const targetUrl = basePath + '/upgrade';
            if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                window.spaRouter.navigate(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
            return;
        }
    }

    selectTier(tierLevel) {
        if (this.selectedTierLevel === tierLevel) return;
        this.selectedTierLevel = tierLevel;
        this.updateUI();
    }

    setBillingPeriod(period) {
        if (this.billingPeriod === period) return;
        this.billingPeriod = period;
        window.isYearlyPremium = (period === 'yearly');
        this.updateUI();
    }

    getSelectedTier() {
        return this.activeTiers.find(t => parseInt(t.tier_level, 10) === this.selectedTierLevel) || this.activeTiers[0] || null;
    }

    updateUI() {
        if (!this.modalBox) return;
        const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
        const selectedTier = this.getSelectedTier();
        const tierName = selectedTier ? (selectedTier.name || `Tier ${this.selectedTierLevel}`) : `Pro`;

        // 1. Update Title Highlight
        const titleHighlight = this.modalBox.querySelector('[data-ref="upgrade-selected-tier-name"]');
        if (titleHighlight) {
            titleHighlight.textContent = tierName;
            titleHighlight.setAttribute('data-tier', this.selectedTierLevel);
        }

        // 2. Update Billing Cycle Pill
        const togglePill = this.modalBox.querySelector('[data-ref="modal-billing-toggle-pill"]');
        if (togglePill) {
            togglePill.setAttribute('data-cycle', this.billingPeriod);
            const buttons = togglePill.querySelectorAll('[data-action="setModalBillingCycle"]');
            buttons.forEach(btn => {
                if (btn.getAttribute('data-value') === this.billingPeriod) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // 3. Update Plan Cards
        const cards = this.modalBox.querySelectorAll('[data-action="select-modal-tier"]');
        cards.forEach(card => {
            const cardTier = parseInt(card.getAttribute('data-tier'), 10);
            const isSelected = cardTier === this.selectedTierLevel;
            
            card.classList.toggle('active', isSelected);
            card.setAttribute('aria-selected', isSelected ? 'true' : 'false');

            const radioDot = card.querySelector('.upgrade-plan-radio-dot');
            if (radioDot) {
                radioDot.style.opacity = isSelected ? '1' : '0';
                radioDot.style.transform = isSelected ? 'scale(1)' : 'scale(0.5)';
            }

            // Update price text based on billing period
            const priceEl = card.querySelector('[data-ref="plan-card-price"]');
            const periodEl = card.querySelector('[data-ref="plan-card-period"]');
            if (priceEl && periodEl) {
                const monthlyPrice = priceEl.getAttribute('data-monthly') || '0.00';
                const yearlyPrice = priceEl.getAttribute('data-yearly') || '0.00';

                priceEl.textContent = this.billingPeriod === 'yearly' ? yearlyPrice : monthlyPrice;
                periodEl.textContent = this.billingPeriod === 'yearly' 
                    ? (__('upgrade_period_yearly_full') || 'al año') 
                    : (__('upgrade_period_monthly_full') || 'al mes');
            }
        });

        // 4. Update CTA Button
        const ctaBtn = this.modalBox.querySelector('[data-action="upgradeModalSubscribe"]');
        const ctaText = this.modalBox.querySelector('[data-ref="cta-text"]');
        if (ctaBtn && ctaText) {
            if (this.currentTier === this.selectedTierLevel) {
                ctaBtn.classList.add('disabled-interaction');
                ctaText.textContent = __('plan_btn_current') || 'Tu Plan Actual';
            } else {
                ctaBtn.classList.remove('disabled-interaction');
                const actionPrefix = this.currentTier > this.selectedTierLevel 
                    ? (__('plan_btn_downgrade') || 'Cambiar a') 
                    : (__('upgrade_modal_title_prefix') || 'Sube de categoría a');
                ctaText.textContent = `${actionPrefix} ${tierName}`;
            }
        }

        // 5. Update Right Column Active Table Column
        const headers = this.modalBox.querySelectorAll('.upgrade-table-col-header');
        headers.forEach(h => {
            const hTier = parseInt(h.getAttribute('data-tier'), 10);
            h.classList.toggle('upgrade-col-active', hTier === this.selectedTierLevel);
        });

        const cells = this.modalBox.querySelectorAll('.upgrade-table-cell[data-tier]');
        cells.forEach(c => {
            const cTier = parseInt(c.getAttribute('data-tier'), 10);
            c.classList.toggle('upgrade-col-active', cTier === this.selectedTierLevel);
        });
    }

    async handleSubscribe(btn) {
        const __ = (typeof window.__ === 'function') ? window.__ : (k => k);

        if (!window.activeUserId) {
            if (window.modalSystem) window.modalSystem.closeCurrent();
            if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                window.spaRouter.navigate('/login');
            } else {
                window.location.href = '/login';
            }
            return;
        }

        const tier = this.selectedTierLevel;
        const billingPeriod = this.billingPeriod;

        if (isNaN(tier) || tier <= 0) {
            showMessage(__('err_invalid_plan') || 'Plan inválido', 'error');
            return;
        }

        if (this.currentTier === tier) {
            showMessage(__('plan_btn_current') || 'Ya tienes este plan activo.', 'info');
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
                await this.showConfirmModal(previewResult.data || previewResult, tier, billingPeriod, btn);
            } else {
                showMessage(previewResult.message || __('err_connection') || 'Error de conexión', 'error');
            }
        } catch (error) {
            restoreButton(btn);
            showMessage(__('err_connection') || 'Error de conexión', 'error');
        }
    }

    async showConfirmModal(previewData, tier, billingPeriod, btn) {
        const amount = (previewData.amount_due / 100).toFixed(2);
        const currency = previewData.currency;
        const isUpgrade = previewData.is_upgrade;

        if (!window.modalSystem) {
            this.processActualSubscription(tier, billingPeriod, btn);
            return;
        }

        const confirmRes = await window.modalSystem.show('confirmUpgradeModal', {
            amount: amount,
            currency: currency,
            isUpgrade: isUpgrade
        });

        if (confirmRes && (confirmRes.action === 'confirm' || confirmRes.action === true || confirmRes.confirmed)) {
            const password = (confirmRes.data && confirmRes.data.confirmPurchasePasswordInput) || confirmRes.confirmPurchasePasswordInput || '';
            this.processActualSubscription(tier, billingPeriod, btn, password);
        }
    }

    async processActualSubscription(tier, billingPeriod, btn, password = '') {
        const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
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
                        window.modalSystem.closeCurrent();
                        window.modalSystem.show('welcomePremiumModal', { tier: tier, item_type: 'subscription' });
                    } else {
                        showMessage(__('msg_sub_updated') || 'Suscripción actualizada.', 'success');
                    }
                } else {
                    restoreButton(btn);
                    const msg = result.message || __('err_update_subscription') || 'No se pudo actualizar la suscripción';
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
                        window.modalSystem.closeCurrent();
                        window.modalSystem.show('welcomePremiumModal', { tier: tier, item_type: 'subscription' });
                    } else {
                        showMessage(__('msg_sub_updated') || 'Suscripción actualizada.', 'success');
                    }
                } else {
                    restoreButton(btn);
                    const msg = result.message || __('stripe_checkout_error') || 'Error al iniciar checkout';
                    showMessage(msg, 'error');
                }
            }
        } catch (error) {
            restoreButton(btn);
            showMessage(__('err_connection') || 'Error de conexión', 'error');
        }
    }
}
