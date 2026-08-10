import { ApiService } from './core/api/ApiServices.js';
import { ApiRoutes } from './core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton, formatNumber } from './core/utils/uiUtils.js';
import { ThemeManager } from './core/ThemeManager.js';
import { PreferenceManager } from './core/PreferenceManager.js';
import { ModuleManager } from './core/ModuleManager.js';
import { AccountManager } from './core/AccountManager.js';
import { ToastSystem } from './core/ToastSystem.js';

export class MainController {
    constructor() {
        this.dom = { header: null, topBar: null, scrolleableArea: null };
        this.state = { isMobileSearchActive: false, currentDevice: '' };
        this.api = new ApiService();

        this.themeManager = new ThemeManager();
        this.toastSystem = new ToastSystem((key) => this.getPref(key));
        this.preferenceManager = new PreferenceManager(
            this.themeManager,
            (msg, type) => this.showToast(msg, type),
            () => this.syncUIPreferences()
        );
        this.moduleManager = new ModuleManager({
            closeOnEsc: true,
            allowMultipleModules: false
        });
        this.accountManager = new AccountManager((msg, type) => this.showToast(msg, type));

        this.handleResizeBound = this.handleResize.bind(this);
        this.handleScrollBound = this.handleScroll.bind(this);
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.handleDocumentChangeBound = this.handleDocumentChange.bind(this);
        this.handleDocumentInputBound = this.handleDocumentInput.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleMaintenanceBound = this.handleMaintenanceTriggered.bind(this);
        this.handleVisibilityChangeBound = this.handleVisibilityChange.bind(this);
        
        this.lastVisibleTime = Date.now();
    }

    get isMobile() { return window.innerWidth <= 768; }

    get userTier() { return window.appUserTier || 0; }

    init() {
        this.dom = {
            header: document.querySelector('.header'),
            topBar: document.querySelector('.general-content-top'),
            scrolleableArea: document.querySelector('.general-content-scrolleable')
        };

        this.themeManager.init();
        this.moduleManager.init();
        this.preferenceManager.initGuestDefaults();
        this.checkDevice();
        this.bindEvents();
        this.moduleManager.markBottomSheets();
        this.syncUIPreferences();
    }

    destroy() {
        window.removeEventListener('resize', this.handleResizeBound);
        document.removeEventListener('scroll', this.handleScrollBound, true);
        document.removeEventListener('click', this.handleDocumentClickBound);
        document.removeEventListener('change', this.handleDocumentChangeBound);
        document.removeEventListener('input', this.handleDocumentInputBound);
        
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        window.removeEventListener('systemMaintenanceTriggered', this.handleMaintenanceBound);
        document.removeEventListener('visibilitychange', this.handleVisibilityChangeBound);

        this.themeManager.destroy();
        this.moduleManager.destroy();
        this.preferenceManager.destroy();
        this.accountManager.destroy();
    }

    bindEvents() {
        window.addEventListener('resize', this.handleResizeBound);
        document.addEventListener('scroll', this.handleScrollBound, true);

        // Handler global para elementos con clase premium-locked
        document.addEventListener('click', (e) => {
            const premiumLockedBtn = e.target.closest('.premium-locked');
            if (premiumLockedBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                if (window.modalSystem && typeof window.modalSystem.show === 'function') {
                    const requiredTier = parseInt(premiumLockedBtn.getAttribute('data-required-tier'), 10) || 1;
                    window.modalSystem.show('upgradeSubscriptionModal', { requiredTier });
                } else {
                    const basePath = window.AppBasePath || '';
                    if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                        window.spaRouter.navigate(basePath + '/upgrade');
                    } else {
                        window.location.href = basePath + '/upgrade';
                    }
                }
            }
        }, true);

        document.addEventListener('click', this.handleDocumentClickBound);
        document.addEventListener('change', this.handleDocumentChangeBound);
        document.addEventListener('input', this.handleDocumentInputBound);

        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        window.addEventListener('systemMaintenanceTriggered', this.handleMaintenanceBound);
        document.addEventListener('visibilitychange', this.handleVisibilityChangeBound);

        window.addEventListener('coins-updated', (e) => {
            if (e.detail && e.detail.balance !== undefined) {
                const displays = document.querySelectorAll('[data-ref="user-coins-balance"]');
                displays.forEach(d => {
                    d.textContent = formatNumber(e.detail.balance);
                });
            }
        });

        window.addEventListener('subscription-updated', (e) => {
            if (e.detail && e.detail.tier !== undefined) {
                window.appUserTier = parseInt(e.detail.tier, 10);
                let tierName = '';
                if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                    const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === window.appUserTier);
                    if (found && found.name) tierName = found.name;
                }
                document.querySelectorAll('[data-ref="user-tier-badge"]').forEach(b => {
                    b.textContent = tierName;
                });
            }
        });
    }

    handleMaintenanceTriggered() {
        this.preferenceManager.destroy();
        this.accountManager.destroy();
        window.location.reload();
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            this.lastVisibleTime = Date.now();
        } else if (document.visibilityState === 'visible') {
            const timeHidden = Date.now() - (this.lastVisibleTime || Date.now());
            if (timeHidden > 7200000) {
                window.location.reload();
            } else if (timeHidden > 5000) {
                // Importación dinámica proactiva del refresco CSRF en HttpClient
                import('./core/api/HttpClient.js').then(m => {
                    m.HttpClient.refreshCsrfTokenProactively();
                });
            }
        }
    }

    handleViewLoaded() {
        this.syncUIPreferences();
        this.moduleManager.markBottomSheets();
        this.updateCoinsDisplay();
    }

    async updateCoinsDisplay() {
        const displays = document.querySelectorAll('[data-ref="user-coins-balance"]');
        if (displays.length === 0) return;
        
        try {
            const response = await this.api.post(ApiRoutes.Store.GetBalance, {});
            if (response && response.success && response.coins !== undefined) {
                displays.forEach(d => {
                    d.textContent = formatNumber(response.coins);
                });
            }
        } catch (e) {}
    }

    // Proxy methods delegando responsabilidades a managers correspondientes
    getPref(key) {
        return this.preferenceManager.get(key);
    }

    savePreference(key, value, password = '') {
        return this.preferenceManager.save(key, value, password);
    }

    showToast(message, type = 'success') {
        this.toastSystem.show(message, type);
    }

    toggleModule(moduleName) {
        this.moduleManager.toggle(moduleName);
    }

    closeModule(moduleEl) {
        this.moduleManager.close(moduleEl);
    }

    closeAllModules() {
        this.moduleManager.closeAllModules();
    }

    markBottomSheets() {
        this.moduleManager.markBottomSheets();
    }

    applyTheme(theme) {
        this.themeManager.apply(theme);
    }

    syncUIPreferences() {
        const theme = this.getPref('theme');
        const lang = this.getPref('language');
        const openLinks = this.getPref('open_links_new_tab');
        const alerts = this.getPref('extended_alerts');
        const purchasePref = this.getPref('purchase_preference') || 'verify';

        const toggleLinks = document.querySelector('[data-key="open_links_new_tab"]');
        if (toggleLinks) toggleLinks.checked = (openLinks == 1 || openLinks == '1');

        const toggleAlerts = document.querySelector('[data-key="extended_alerts"]');
        if (toggleAlerts) toggleAlerts.checked = (alerts == 1 || alerts == '1');

        document.querySelectorAll('[data-action="setPref"]').forEach(item => {
            if (item.getAttribute('data-key') === 'theme') {
                item.classList.toggle('active', item.getAttribute('data-value') === theme);
            }
            if (item.getAttribute('data-key') === 'language') {
                item.classList.toggle('active', item.getAttribute('data-value') === lang);
            }
            if (item.getAttribute('data-key') === 'purchase_preference') {
                item.classList.toggle('active', item.getAttribute('data-value') === purchasePref);
            }
        });

        const themeTriggerTxt = document.querySelector('[data-action="toggleModule"][data-target="moduleTheme"] .component-dropdown-text');
        if (themeTriggerTxt) {
            const activeItem = document.querySelector('[data-key="theme"].active .component-menu-link-text span');
            if (activeItem) themeTriggerTxt.textContent = activeItem.textContent;
        }

        const langTriggerTxt = document.querySelector('[data-action="toggleModule"][data-target="moduleLanguage"] .component-dropdown-text');
        if (langTriggerTxt) {
            const activeItem = document.querySelector('[data-key="language"].active .component-menu-link-text span');
            if (activeItem) langTriggerTxt.textContent = activeItem.textContent;
        }

        const prefTriggerTxt = document.querySelector('[data-action="toggleModule"][data-target="modulePurchasePref"] .component-dropdown-text');
        if (prefTriggerTxt) {
            const activeItem = document.querySelector('[data-key="purchase_preference"].active .component-menu-link-text span');
            if (activeItem) prefTriggerTxt.textContent = activeItem.textContent;
        }
    }

    handleScroll(e) {
        if (this.dom.topBar && this.dom.scrolleableArea && e.target === this.dom.scrolleableArea) {
            this.dom.topBar.classList.toggle('shadow', this.dom.scrolleableArea.scrollTop > 0);
        }

        if (e.target?.classList?.contains('component-viewport')) {
            const parent = e.target.parentElement;
            if (parent) {
                const topComponent = parent.querySelector('.component-top');
                if (topComponent) {
                    topComponent.classList.toggle('shadow', e.target.scrollTop > 0);
                }
            }
        }
    }

    handleDocumentClick(e) {
        const planCard = e.target.closest('.component-card--selectable-row');
        if (planCard) {
            e.preventDefault();
            const modal = planCard.closest('.component-modal-box');
            if (modal) {
                modal.querySelectorAll('.component-card--selectable-row').forEach(c => c.classList.remove('active'));
                planCard.classList.add('active');
                
                const submitBtn = modal.querySelector('[data-action="confirmModalUpgrade"]');
                const tierVal = parseInt(planCard.getAttribute('data-tier'), 10);
                if (submitBtn) {
                    submitBtn.setAttribute('data-selected-tier', tierVal);
                    this._updateUpgradeSubmitBtn(submitBtn, tierVal);
                }

                modal.querySelectorAll('.component-table th, .component-table td').forEach(cell => {
                    cell.classList.remove('highlight-col');
                    if (cell.classList.contains(`col-tier-${tierVal}`)) {
                        cell.classList.add('highlight-col');
                    }
                });

                requestAnimationFrame(() => {
                    if (window.modalSystem?.activeBox) {
                        const ModalSystemClass = window.modalSystem.constructor;
                        ModalSystemClass.positionHighlightStrip(window.modalSystem.activeBox);
                    }
                });
            }
            return;
        }

        const btn = e.target.closest('[data-action]');
        
        if (btn) {
            const action = btn.getAttribute('data-action');
            if (action === 'toggleModule') this.toggleModule(btn.getAttribute('data-target'));

            else if (action === 'toggleMenuInModule') {
                e.preventDefault();
                this.moduleManager.toggleMenuInModule(
                    btn.getAttribute('data-module-target'),
                    btn.getAttribute('data-menu-target')
                );
            }

            else if (action === 'toggleMobileSearch') this.toggleMobileSearch();
            else if (action === 'submitLogout') { e.preventDefault(); this.accountManager.handleLogout(btn); }
            else if (action === 'switchAccount') { e.preventDefault(); this.accountManager.handleSwitchAccount(btn.getAttribute('data-id'), btn); }
            else if (action === 'logoutAll') { e.preventDefault(); this.accountManager.handleLogoutAll(btn); }
            else if (action === 'openJoinCanvasModal') { e.preventDefault(); this.accountManager.handleOpenJoinCanvasModal(btn); }
            
            else if (action === 'showSubMenu') {
                e.preventDefault();
                this.moduleManager.showSubMenu(
                    btn.closest('.component-menu'),
                    btn.getAttribute('data-menu-target')
                );
            }
            
            else if (action === 'toggleAccordion') {
                const accordion = btn.closest('.component-accordion');
                if (accordion) accordion.classList.toggle('active');
            }
            else if (action === 'toggleEditState') this.toggleEditState(btn.getAttribute('data-target'));
            else if (action === 'confirmModalUpgrade') {
                e.preventDefault();
                this.handleModalUpgradeCheckout(btn);
            }
            else if (action === 'setPref') {
                this.savePreference(btn.getAttribute('data-key'), btn.getAttribute('data-value'));
                this.closeAllModules();
            }
            return;
        }

        this.moduleManager.handleOutsideClick(e);
    }

    async handleModalUpgradeCheckout(btn) {
        const tierVal = parseInt(btn.getAttribute('data-selected-tier'), 10);
        
        if (!window.activeUserId) {
            const basePath = window.AppBasePath || '';
            window.location.href = basePath + '/login';
            return;
        }

        const userTier = parseInt(window.appUserTier || 0, 10);
        if (userTier >= tierVal) return;

        setButtonLoading(btn);

        try {
            const response = await this.api.post(ApiRoutes.Stripe.CreateCheckout, {
                tier: tierVal,
                billing_period: 'monthly'
            });

            if (response.success && response.checkout_url) {
                window.location.href = response.checkout_url;
            } else {
                restoreButton(btn);
                showMessage(response.message || 'Error al iniciar el pago', 'error');
            }
        } catch (err) {
            restoreButton(btn);
            showMessage('Error de conexión', 'error');
        }
    }

    _updateUpgradeSubmitBtn(btn, tier) {
        const userTier     = parseInt(window.appUserTier || 0, 10);
        const alreadyOwned = userTier >= tier;

        let newHtml;
        if (alreadyOwned) {
            newHtml = `<button class="component-button component-button--dark component-button--rounded-pill component-button--h40 component-modal-submit-btn disabled-interaction" data-action="confirmModalUpgrade" data-selected-tier="${tier}">
                    <span class="material-symbols-rounded">check_circle</span>
                    <span>${window.__('plan_btn_current') || 'Tu plan actual'}</span>
                </button>`;
        } else {
            newHtml = `<button class="component-button component-button--dark component-button--rounded-pill component-button--hover-text component-button--h40 component-modal-submit-btn" data-action="confirmModalUpgrade" data-selected-tier="${tier}">
                    <span class="btn-default-text">${window.__('btn_continue_purchase') || 'Continuar con la compra'}</span>
                    <span class="btn-hover-text">${window.__('btn_confirm_payment') || 'Confirmar pago'}</span>
                </button>`;
        }

        btn.insertAdjacentHTML('afterend', newHtml);
        btn.remove();
    }

    handleDocumentChange(e) {
        if (e.target.matches('[data-action="togglePreference"]')) {
            const key = e.target.getAttribute('data-key');
            const value = e.target.checked ? 1 : 0;
            this.savePreference(key, value);
        }
    }

    handleDocumentInput(e) {
        const ref = e.target.getAttribute('data-ref');
        if (ref === 'language-search') {
            const query = e.target.value.toLowerCase().trim();
            const module = e.target.closest('.component-module');
            if (!module) return;
            
            const list = module.querySelector('[data-ref="language-list"]');
            const emptyState = module.querySelector('[data-ref="language-empty"]');
            
            if (list) {
                let hasVisibleItems = false;
                const items = list.querySelectorAll('.component-menu-link:not(.disabled-interaction)');
                
                items.forEach(item => {
                    const textNode = item.querySelector('.component-menu-link-text');
                    const text = textNode ? textNode.textContent.toLowerCase() : item.textContent.toLowerCase();
                    if (text.includes(query)) {
                        item.style.display = '';
                        hasVisibleItems = true;
                    } else {
                        item.style.display = 'none';
                    }
                });
                
                if (emptyState) {
                    emptyState.hidden = hasVisibleItems;
                }
            }
        }
    }

    toggleEditState(field) {
        const viewBox = document.querySelector(`[data-state="${field}-view"]`);
        const editBox = document.querySelector(`[data-state="${field}-edit"]`);
        if (!viewBox || !editBox) return;

        if (viewBox.classList.contains('active')) {
            viewBox.classList.replace('active', 'disabled');
            editBox.classList.replace('disabled', 'active');
            setTimeout(() => {
                const input = document.querySelector('[data-ref="input-' + field + '"]');
                if (input) {
                    input.focus();
                    const valLength = input.value.length;
                    input.setSelectionRange(valLength, valLength);
                }
            }, 50);
        } else {
            editBox.classList.replace('active', 'disabled');
            viewBox.classList.replace('disabled', 'active');
        }
    }

    handleResize() {
        if (window.innerWidth > 768 && this.state.isMobileSearchActive) {
            this.state.isMobileSearchActive = false;
            if (this.dom.header) this.dom.header.classList.remove('header--search-active');
        }
        this.checkDevice();
    }

    toggleMobileSearch() {
        if (!this.dom.header) return;
        this.state.isMobileSearchActive = !this.state.isMobileSearchActive;
        this.dom.header.classList.toggle('header--search-active', this.state.isMobileSearchActive);
    }

    checkDevice() {
        const width = window.innerWidth;
        let newDevice = width <= 768 ? __('device_mobile') : (width <= 1024 ? __('device_tablet') : __('device_desktop'));
        if (this.state.currentDevice !== newDevice) this.state.currentDevice = newDevice;
    }
}