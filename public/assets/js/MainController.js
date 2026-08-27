import { ApiService } from './core/api/ApiService.js';
import { ApiRoutes } from './core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton, formatNumber } from './core/utils/uiUtils.js';
import { ThemeManager } from './core/managers/ThemeManager.js';
import { PreferenceManager } from './core/managers/PreferenceManager.js';
import { ModuleManager } from './core/managers/ModuleManager.js';
import { AccountManager } from './core/managers/AccountManager.js';
import { NotificationManager } from './core/managers/NotificationManager.js';
import { ToastSystem } from './core/components/ToastSystem.js';

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
        this.notificationManager = new NotificationManager();

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

    get isMobile() { return window.innerWidth <= 768 || window.innerHeight <= 550; }

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
        this.notificationManager.init();
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
        this.notificationManager.destroy();
    }

    bindEvents() {
        window.addEventListener('resize', this.handleResizeBound);
        document.addEventListener('scroll', this.handleScrollBound, true);

        // Handler global para elementos con clase premium-locked o data-requires-premium
        document.addEventListener('click', (e) => {
            const premiumLockedBtn = e.target.closest('.premium-locked, [data-requires-premium="true"], [data-action="openUpgradeModal"]');
            if (premiumLockedBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                const reqTier = parseInt(premiumLockedBtn.getAttribute('data-required-tier') || '0', 10);
                if (window.modalSystem) {
                    window.modalSystem.show('upgradePlansModal', { initialTier: reqTier });
                } else {
                    const basePath = window.AppBasePath || '';
                    const targetUrl = basePath + '/upgrade';
                    if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                        window.spaRouter.navigate(targetUrl);
                    } else {
                        window.location.href = targetUrl;
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

        window.addEventListener('subscription-updated', (e) => {
            if (e.detail && e.detail.tier !== undefined) {
                window.appUserTier = parseInt(e.detail.tier, 10);
                let tierName = '';
                let tierColor = null;
                if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                    const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === window.appUserTier);
                    if (found) {
                        if (found.name) tierName = found.name;
                        if (found.color) tierColor = found.color;
                    }
                }
                
                // 1. Update text for tier badges
                document.querySelectorAll('[data-ref="user-tier-badge"]').forEach(b => {
                    b.textContent = tierName;
                });

                // 2. Hide premium button in header
                if (window.appUserTier > 0) {
                    const upgradeBtn = document.querySelector('[data-ref="header-upgrade-btn"]');
                    if (upgradeBtn) {
                        upgradeBtn.remove();
                    }
                }

                // 3. Update subscription dynamic borders
                const subColorObj = e.detail.color || tierColor;
                if (subColorObj) {
                    const parseSubscriptionColor = (colorData) => {
                        if (!colorData) return 'var(--text-muted)';
                        if (typeof colorData === 'string') {
                            try {
                                colorData = JSON.parse(colorData);
                            } catch (err) {
                                return colorData;
                            }
                        }
                        if (colorData && typeof colorData === 'object' && Array.isArray(colorData.colors)) {
                            const firstColorObj = colorData.colors[0];
                            let activeSubBg = typeof firstColorObj === 'string' ? firstColorObj : (firstColorObj.hex || 'var(--text-muted)');
                            
                            if (colorData.type === 'gradient' && colorData.colors.length > 1) {
                                const angle = parseInt(colorData.angle || 0, 10);
                                const stopsArray = [];
                                let prevStop = 0;
                                const colorsCount = colorData.colors.length;
                                colorData.colors.forEach((colorObj, i) => {
                                    const hex = typeof colorObj === 'string' ? colorObj : (colorObj.hex || '#000000');
                                    const percentage = (typeof colorObj === 'object' && colorObj.percentage !== undefined) 
                                        ? parseInt(colorObj.percentage, 10) 
                                        : Math.floor(100 / colorsCount);
                                    let endStop = prevStop + percentage;
                                    if (i === colorsCount - 1) endStop = 100;
                                    stopsArray.push(`${hex} ${prevStop}% ${endStop}%`);
                                    prevStop = endStop;
                                });
                                activeSubBg = `conic-gradient(from ${angle}deg, ${stopsArray.join(', ')})`;
                            }
                            return activeSubBg;
                        }
                        return 'var(--text-muted)';
                    };

                    const cssValue = parseSubscriptionColor(subColorObj);
                    document.querySelectorAll('.subscription-dynamic').forEach(el => {
                        el.setAttribute('data-sub-bg', cssValue);
                        el.style.setProperty('--active-subscription-bg', cssValue);
                    });
                }
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

    toggleModule(moduleName, triggerEl = null) {
        this.moduleManager.toggle(moduleName, triggerEl);
    }

    closeModule(moduleEl) {
        this.moduleManager.close(moduleEl);
    }

    closeAllModules(except = null) {
        this.moduleManager.closeAllModules(except);
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
        const btn = e.target.closest('[data-action]');
        
        if (btn) {
            const action = btn.getAttribute('data-action');
            if (action === 'toggleModule' || action === 'toggleDropdown') {
                this.toggleModule(btn.getAttribute('data-target'), btn);
                return;
            }

            else if (action === 'toggleMenuInModule') {
                e.preventDefault();
                this.moduleManager.toggleMenuInModule(
                    btn.getAttribute('data-module-target'),
                    btn.getAttribute('data-menu-target')
                );
                return;
            }

            else if (action === 'openFilterSubMenu' || action === 'openSubMenu') {
                e.preventDefault();
                const targetRef = btn.getAttribute('data-target');
                const module = btn.closest('.component-module');
                if (module && targetRef) {
                    this.moduleManager.showSubMenuInModule(module, targetRef);
                }
                return;
            }

            else if (action === 'backToMainFilters' || action === 'menuGoBack' || action === 'backToMainMenu') {
                e.preventDefault();
                const module = btn.closest('.component-module');
                if (module) {
                    this.moduleManager.resetToMainMenu(module);
                }
                return;
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
            
            else if (action === 'openImageViewer') {
                e.preventDefault();
                let images = [];
                const rawImages = btn.getAttribute('data-images');
                const src = btn.getAttribute('data-src') || btn.getAttribute('data-url') || (btn.querySelector('img') ? btn.querySelector('img').src : null);
                if (rawImages) {
                    try {
                        images = JSON.parse(rawImages);
                    } catch(err) {
                        images = rawImages.split(',').map(s => s.trim());
                    }
                } else if (src) {
                    images = [src];
                }
                const initialIndex = parseInt(btn.getAttribute('data-index') || '0', 10);
                const title = btn.getAttribute('data-title') || (window.__ ? window.__('lbl_attached_image') : 'Foto adjunta');
                const senderName = btn.getAttribute('data-sender') || '';
                const senderDate = btn.getAttribute('data-date') || '';
                const senderAvatar = btn.getAttribute('data-avatar') || '';

                if (window.modalSystem && images.length > 0) {
                    window.modalSystem.show('imageViewer', {
                        images: images,
                        initialIndex: initialIndex,
                        title: title,
                        sender: {
                            name: senderName,
                            username: senderName,
                            date: senderDate,
                            avatar: senderAvatar
                        }
                    });
                }
                return;
            }
            else if (action === 'toggleAccordion') {
                const accordion = btn.closest('.component-accordion');
                if (accordion) accordion.classList.toggle('active');
            }
            else if (action === 'toggleEditState') this.toggleEditState(btn.getAttribute('data-target'));
            else if (action === 'setPref') {
                this.savePreference(btn.getAttribute('data-key'), btn.getAttribute('data-value'));
                const parentMod = btn.closest('.component-module');
                if (parentMod && parentMod.classList.contains('component-module--dropdown')) {
                    this.closeModule(parentMod);
                } else {
                    this.closeAllModules();
                }
            }
            return;
        }

        this.moduleManager.handleOutsideClick(e);
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