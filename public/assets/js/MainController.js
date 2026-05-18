// public/assets/js/MainController.js
import { ApiService } from './core/api/ApiServices.js';
import { ApiRoutes } from './core/api/ApiRoutes.js';

export class MainController {
    constructor() {
        this.dom = { header: null, topBar: null, scrolleableArea: null };
        this.config = { closeOnEsc: true, allowMultipleModules: false };
        this.state = { isMobileSearchActive: false, currentDevice: '' };
        this.dragState = { startY: 0, currentY: 0, currentDiff: 0, isDragging: false, panel: null, module: null };
        this.api = new ApiService();

        this.prefAbortController = null;
        this.logoutAbortController = null;

        this.handleResizeBound = this.handleResize.bind(this);
        this.handleScrollBound = this.handleScroll.bind(this);
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.handleDocumentChangeBound = this.handleDocumentChange.bind(this);
        this.handleDocumentKeydownBound = this.handleDocumentKeydown.bind(this);
        this.handleThemeMediaQueryBound = this.handleThemeMediaQuery.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleMaintenanceBound = this.handleMaintenanceTriggered.bind(this);
        
        this.handlePointerDownBound = this.handlePointerDown.bind(this);
        this.handlePointerMoveBound = this.handlePointerMove.bind(this);
        this.handlePointerUpBound = this.handlePointerUp.bind(this);
        
        this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }

    get isMobile() { return window.innerWidth <= 768; }

    init() {
        this.dom = {
            header: document.querySelector('.header'),
            topBar: document.querySelector('.general-content-top'),
            scrolleableArea: document.querySelector('.general-content-scrolleable')
        };

        this.checkDevice(); 
        this.initPreferences();
        this.bindEvents();
        this.markBottomSheets(); 
        this.syncUIPreferences(); 
    }

    destroy() {
        window.removeEventListener('resize', this.handleResizeBound);
        
        // Removemos el listener de scroll global en fase de captura
        document.removeEventListener('scroll', this.handleScrollBound, true);
        
        document.removeEventListener('click', this.handleDocumentClickBound);
        document.removeEventListener('change', this.handleDocumentChangeBound);
        document.removeEventListener('keydown', this.handleDocumentKeydownBound);
        
        document.removeEventListener('pointerdown', this.handlePointerDownBound);
        document.removeEventListener('pointermove', this.handlePointerMoveBound);
        document.removeEventListener('pointerup', this.handlePointerUpBound);
        document.removeEventListener('pointercancel', this.handlePointerUpBound);
        
        this.themeMediaQuery.removeEventListener('change', this.handleThemeMediaQueryBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        window.removeEventListener('systemMaintenanceTriggered', this.handleMaintenanceBound);
    }

    bindEvents() {
        window.addEventListener('resize', this.handleResizeBound);
        
        // Escuchamos el evento de scroll en fase de captura (true) para interceptar 
        // eventos de scroll que no burbujean (como los de .component-viewport dinámicos)
        document.addEventListener('scroll', this.handleScrollBound, true);

        document.addEventListener('click', this.handleDocumentClickBound);
        document.addEventListener('change', this.handleDocumentChangeBound);
        document.addEventListener('keydown', this.handleDocumentKeydownBound);
        
        document.addEventListener('pointerdown', this.handlePointerDownBound);
        document.addEventListener('pointermove', this.handlePointerMoveBound);
        document.addEventListener('pointerup', this.handlePointerUpBound);
        document.addEventListener('pointercancel', this.handlePointerUpBound);

        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        window.addEventListener('systemMaintenanceTriggered', this.handleMaintenanceBound);
        this.themeMediaQuery.addEventListener('change', this.handleThemeMediaQueryBound);
    }

    handleMaintenanceTriggered() {
        if (this.prefAbortController) this.prefAbortController.abort();
        if (this.logoutAbortController) this.logoutAbortController.abort();
        window.location.reload();
    }

    handleViewLoaded() {
        this.syncUIPreferences();
        this.markBottomSheets(); 
    }

    initPreferences() {
        if (!window.AppUserPrefs && !localStorage.getItem('pr_language')) {
            let lang = navigator.language || navigator.userLanguage;
            let finalLang = 'en-US';
            let base = lang.split('-')[0].toLowerCase();
            const exactMatches = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'it-IT', 'es-419', 'es-MX', 'es-ES', 'pt-BR', 'pt-PT'];
            let exact = exactMatches.find(e => e.toLowerCase() === lang.toLowerCase());
            
            if (exact) finalLang = exact;
            else if (base === 'es') finalLang = 'es-419';
            else if (base === 'en') finalLang = 'en-US';
            else if (base === 'pt') finalLang = 'pt-BR';
            else if (base === 'fr') finalLang = 'fr-FR';
            else if (base === 'de') finalLang = 'de-DE';
            else if (base === 'it') finalLang = 'it-IT';
            
            localStorage.setItem('pr_language', finalLang);
            document.cookie = "pr_language=" + finalLang + "; path=/; max-age=31536000"; 
            localStorage.setItem('pr_open_links_new_tab', '1');
            localStorage.setItem('pr_theme', 'system');
            localStorage.setItem('pr_extended_alerts', '0');
        }
    }

    handleThemeMediaQuery(e) {
        let theme = this.getPref('theme');
        if (theme === 'system') this.applyTheme('system');
    }

    getPref(key) {
        if (window.AppUserPrefs) return window.AppUserPrefs[key];
        return localStorage.getItem('pr_' + key);
    }

    async savePreference(key, value) {
        if (key === 'theme') this.applyTheme(value);
        if (key === 'language') document.cookie = "pr_language=" + value + "; path=/; max-age=31536000";

        if (window.AppUserPrefs) {
            window.AppUserPrefs[key] = value;
            
            if (this.prefAbortController) {
                this.prefAbortController.abort();
            }
            this.prefAbortController = new AbortController();

            try {
                const response = await this.api.post(ApiRoutes.Settings.UpdatePreferences, { key: key, value: value }, this.prefAbortController.signal);
                
                if (response && response.aborted) return;

                if (response && response.success) {
                    if (key !== 'language') this.showToast(__('pref_saved_account'), 'success');
                } else {
                    if (key !== 'language') this.showToast(__('pref_save_network_error'), 'error');
                }
            } catch (err) {
                if (key !== 'language') this.showToast(__('general_save_network_error'), 'error');
            }
        } else {
            localStorage.setItem('pr_' + key, value);
            if (key !== 'language') this.showToast(__('pref_local_config_saved'), 'success');
        }

        if (key === 'language') { window.location.reload(); return; }
        this.syncUIPreferences(); 
    }

    applyTheme(theme) {
        let isDark = false;
        if (theme === 'system') isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        else if (theme === 'dark') isDark = true;

        if (isDark) {
            document.documentElement.classList.add('dark-theme');
            document.documentElement.classList.remove('light-theme');
        } else {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark-theme');
        }
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
        // 1. Manejar el scroll global (general-content-scrolleable)
        if (this.dom.topBar && this.dom.scrolleableArea && e.target === this.dom.scrolleableArea) {
            this.dom.topBar.classList.toggle('shadow', this.dom.scrolleableArea.scrollTop > 0);
        }

        // 2. Manejar el scroll interno de los componentes dinámicos (component-viewport)
        if (e.target && e.target.classList && e.target.classList.contains('component-viewport')) {
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
            if (action === 'toggleModule') this.toggleModule(btn.getAttribute('data-target'));
            else if (action === 'toggleMobileSearch') this.toggleMobileSearch();
            else if (action === 'submitLogout') { e.preventDefault(); this.handleLogout(btn); }
            else if (action === 'switchAccount') { e.preventDefault(); this.handleSwitchAccount(btn.getAttribute('data-id'), btn); }
            else if (action === 'logoutAll') { e.preventDefault(); this.handleLogoutAll(btn); }
            
            else if (action === 'showSubMenu') {
                e.preventDefault();
                const currentMenu = btn.closest('.component-menu');
                const targetMenuName = btn.getAttribute('data-menu-target');
                const targetMenu = document.querySelector(`[data-menu="${targetMenuName}"]`);
                
                if (currentMenu && targetMenu) {
                    currentMenu.classList.replace('active', 'disabled');
                    targetMenu.classList.replace('disabled', 'active');
                }
            }
            
            else if (action === 'toggleAccordion') {
                const accordion = btn.closest('.component-accordion');
                if (accordion) accordion.classList.toggle('active');
            }
            else if (action === 'toggleEditState') this.toggleEditState(btn.getAttribute('data-target'));
            else if (action === 'setPref') {
                const key = btn.getAttribute('data-key');
                const value = btn.getAttribute('data-value');
                this.savePreference(key, value);
                this.closeAllModules();
            }
            return;
        }

        const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
        activeModules.forEach(module => {
            if (this.dragState.isDragging) return;
            let clickedInside = false;
            module.querySelectorAll('.component-menu').forEach(panel => {
                if (panel.contains(e.target)) clickedInside = true;
            });
            if (!clickedInside) this.closeModule(module);
        });
    }

    handleDocumentChange(e) {
        if (e.target.matches('[data-action="togglePreference"]')) {
            const key = e.target.getAttribute('data-key');
            const value = e.target.checked ? 1 : 0;
            this.savePreference(key, value);
        }
    }

    handleDocumentKeydown(e) {
        if (e.key === 'Escape' && this.config.closeOnEsc) this.closeAllModules();
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

    showToast(message, type = 'success') {
        let container = document.querySelector('[data-ref="toast-container"]');
        if (!container) {
            container = document.createElement('div');
            container.setAttribute('data-ref', 'toast-container');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'component-toast';
        let iconName = type === 'success' ? 'check_circle' : 'error';
        toast.innerHTML = `<div class="component-toast-icon"><span class="material-symbols-rounded">${iconName}</span></div><div class="component-toast-text">${message}</div>`;

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        let extendedAlerts = (this.getPref('extended_alerts') == 1 || this.getPref('extended_alerts') == '1');
        let duration = extendedAlerts ? 8000 : 4000;

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
                if (container.childNodes.length === 0 && container.parentNode) {
                    container.remove();
                }
            }, 300);
        }, duration);
    }

    markBottomSheets() {
        document.querySelectorAll('.component-module--dropdown:not(.bs-initialized)').forEach(module => {
            module.classList.add('bs-initialized');
        });
    }

    handlePointerDown(e) {
        if (!this.isMobile) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return; 

        const dragHandle = e.target.closest('.pill-container');
        if (!dragHandle) return;

        const panel = dragHandle.closest('.component-menu');
        const module = dragHandle.closest('.component-module');
        if (!panel || !module) return;

        e.preventDefault(); e.stopPropagation();
        
        panel.setPointerCapture(e.pointerId);
        this.dragState.isDragging = true;
        this.dragState.startY = e.clientY;
        this.dragState.module = module;
        this.dragState.panel = panel;
        module.classList.add('is-dragging');
    }

    handlePointerMove(e) {
        if (!this.dragState.isDragging) return;
        if (e.cancelable) e.preventDefault();
        const diff = e.clientY - this.dragState.startY;
        if (diff > 0) {
            this.dragState.panel.style.transform = `translateY(${diff}px)`;
            this.dragState.currentDiff = diff;
        }
    }

    handlePointerUp(e) {
        if (!this.dragState.isDragging) return;
        this.dragState.isDragging = false;
        
        const { module, panel, currentDiff } = this.dragState;
        
        module.classList.remove('is-dragging'); 
        if (panel.hasPointerCapture(e.pointerId)) panel.releasePointerCapture(e.pointerId);

        if (currentDiff > panel.offsetHeight * 0.40) {
            this.closeModule(module); 
        } else {
            panel.removeAttribute('style');
        }
        
        this.dragState.currentDiff = 0;
        this.dragState.module = null;
        this.dragState.panel = null;
    }

    toggleModule(moduleName) {
        const moduleEl = document.querySelector(`[data-module="${moduleName}"]`);
        if (!moduleEl) return;
        const isCurrentlyActive = !moduleEl.classList.contains('disabled');
        if (!this.config.allowMultipleModules && !isCurrentlyActive) this.closeAllModules();
        isCurrentlyActive ? this.closeModule(moduleEl) : this.openModule(moduleEl);
    }

    openModule(module) { 
        // FIX ULTRA-FONDO: Reiniciar los submenús SILENCIOSAMENTE antes de que 
        // el módulo se vuelva visible. Así siempre arranca de cero.
        const mainMenu = module.querySelector('[data-menu="main-options"]');
        const accountMenu = module.querySelector('[data-menu="account-switcher"]');
        
        if (mainMenu && accountMenu) {
            mainMenu.classList.remove('disabled');
            mainMenu.classList.add('active');
            
            accountMenu.classList.remove('active');
            accountMenu.classList.add('disabled');
        }

        // Ahora sí, mostramos el módulo
        module.classList.replace('disabled', 'active'); 
    }
    
    closeModule(module) { 
        // Al cerrar, solo ocultamos el módulo y soltamos el drag (sin timers peligrosos)
        module.classList.replace('active', 'disabled'); 
        
        // Restaurar estado drag
        module.querySelectorAll('.component-menu').forEach(p => p.removeAttribute('style'));
    }
    
    closeAllModules() { document.querySelectorAll('.component-module:not(.disabled)').forEach(m => this.closeModule(m)); }

    handleResize() {
        if (window.innerWidth > 768 && this.state.isMobileSearchActive) {
            this.state.isMobileSearchActive = false;
            if (this.dom.header) this.dom.header.classList.remove('header--search-active');
        }
        if (!this.isMobile) {
            document.querySelectorAll('.is-dragging').forEach(m => {
                m.classList.remove('is-dragging');
                const p = m.querySelector('.component-menu');
                if (p) p.removeAttribute('style');
            });
            this.dragState.isDragging = false;
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

    // ==========================================
    // METODOS DE AUTENTICACION / MULTISESION
    // ==========================================

    async handleSwitchAccount(accountId, btnElement) {
        if (!accountId) return;
        if (btnElement && btnElement.dataset.loading === 'true') return;

        if (btnElement) {
            btnElement.dataset.loading = 'true';
            btnElement.style.opacity = '0.5';
            btnElement.style.pointerEvents = 'none';
        }

        const result = await this.api.post(ApiRoutes.Auth.SwitchAccount, { user_id: accountId });
        
        if (result && result.aborted) {
            if (btnElement) {
                btnElement.dataset.loading = 'false';
                btnElement.style.opacity = '';
                btnElement.style.pointerEvents = '';
            }
            return;
        }

        if (result.success) {
            window.location.reload();
        } else {
            if (btnElement) {
                btnElement.dataset.loading = 'false';
                btnElement.style.opacity = '';
                btnElement.style.pointerEvents = '';
            }
            this.showToast(result.message || 'Error al cambiar de cuenta', 'error');
        }
    }

    async handleLogoutAll(logoutBtn) {
        if (logoutBtn.dataset.loading === 'true') return; 
        logoutBtn.dataset.loading = 'true';

        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'component-menu-link-icon';
        spinnerDiv.innerHTML = '<div class="component-spinner"></div>';
        logoutBtn.appendChild(spinnerDiv);

        if (this.logoutAbortController) {
            this.logoutAbortController.abort();
        }
        this.logoutAbortController = new AbortController();

        const result = await this.api.post(ApiRoutes.Auth.LogoutAll, {}, this.logoutAbortController.signal);

        if (result && result.aborted) return;

        if (result.success) {
            const basePath = window.AppBasePath || '';
            window.location.href = basePath + '/login'; 
        } else {
            spinnerDiv.remove();
            logoutBtn.dataset.loading = 'false';
            this.showToast(result.message || 'Error al cerrar todas las sesiones', 'error');
        }
    }

    async handleLogout(logoutBtn) {
        if (logoutBtn.dataset.loading === 'true') return; 
        logoutBtn.dataset.loading = 'true';

        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'component-menu-link-icon';
        spinnerDiv.innerHTML = '<div class="component-spinner"></div>';
        logoutBtn.appendChild(spinnerDiv);

        if (this.logoutAbortController) {
            this.logoutAbortController.abort();
        }
        this.logoutAbortController = new AbortController();

        const result = await this.api.post(ApiRoutes.Auth.Logout, {}, this.logoutAbortController.signal);

        if (result && result.aborted) return;

        if (result.success) {
            const basePath = window.AppBasePath || '';
            window.location.href = basePath + '/';
        } else {
            spinnerDiv.remove();
            logoutBtn.dataset.loading = 'false';
        }
    }
}