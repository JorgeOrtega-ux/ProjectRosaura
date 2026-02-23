// public/assets/js/main-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class MainController {
    constructor() {
        this.dom = {
            header: document.querySelector('.header'),
            topBar: document.querySelector('.general-content-top'),
            scrolleableArea: document.querySelector('.general-content-scrolleable')
        };
        
        this.config = { closeOnEsc: true, allowMultipleModules: false };
        this.state = { isMobileSearchActive: false, currentDevice: '' };
        this.dragState = { startY: 0, currentY: 0, currentDiff: 0, isDragging: false, panel: null, module: null };
        
        this.api = new ApiService();
    }

    get isMobile() { return window.innerWidth <= 768; }

    init() {
        this.checkDevice(); 
        this.initPreferences();
        this.bindEvents();
        this.initBottomSheets(); 
        this.syncUIPreferences(); 
        
        window.addEventListener('viewLoaded', () => this.syncUIPreferences());
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
            document.cookie = "pr_language=" + finalLang + "; path=/; max-age=31536000"; // Sincroniza con PHP para invitados
            localStorage.setItem('pr_open_links_new_tab', '1');
            localStorage.setItem('pr_theme', 'system');
            localStorage.setItem('pr_extended_alerts', '0');
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            let theme = this.getPref('theme');
            if (theme === 'system') this.applyTheme('system');
        });
    }

    getPref(key) {
        if (window.AppUserPrefs) return window.AppUserPrefs[key];
        return localStorage.getItem('pr_' + key);
    }

    async savePreference(key, value) {
        // 1. Aplicación inmediata visual
        if (key === 'theme') this.applyTheme(value);

        // Actualizamos Cookie para que PHP sepa el idioma incluso si es invitado
        if (key === 'language') {
            document.cookie = "pr_language=" + value + "; path=/; max-age=31536000";
        }

        // 2. Comprobar entorno (Base de datos o LocalStorage)
        if (window.AppUserPrefs) {
            window.AppUserPrefs[key] = value;
            
            try {
                // Enviar a la Base de Datos
                const response = await this.api.post(ApiRoutes.Settings.UpdatePreferences, { key: key, value: value });
                
                if (response && response.success) {
                    if (key !== 'language') this.showToast('Preferencia guardada en tu cuenta', 'success');
                } else {
                    if (key !== 'language') this.showToast('Error de red al guardar preferencia', 'error');
                }
            } catch (err) {
                console.error("Error API:", err);
                if (key !== 'language') this.showToast('Error de red al guardar', 'error');
            }
        } else {
            // Usuario invitado
            localStorage.setItem('pr_' + key, value);
            if (key !== 'language') this.showToast('Configuración local guardada', 'success');
        }

        // 3. RECÁRGA DE PÁGINA SI ES IDIOMA
        if (key === 'language') {
            window.location.reload();
            return;
        }

        this.syncUIPreferences(); // Refrescar textos e iconos
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

        const themeTriggerTxt = document.querySelector('[data-action="toggleModuleTheme"] .component-dropdown-text');
        if (themeTriggerTxt) {
            const activeItem = document.querySelector('[data-key="theme"].active .component-menu-link-text span');
            if (activeItem) themeTriggerTxt.textContent = activeItem.textContent;
        }

        const langTriggerTxt = document.querySelector('[data-action="toggleModuleLanguage"] .component-dropdown-text');
        if (langTriggerTxt) {
            const activeItem = document.querySelector('[data-key="language"].active .component-menu-link-text span');
            if (activeItem) langTriggerTxt.textContent = activeItem.textContent;
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.handleResize());

        if (this.dom.scrolleableArea && this.dom.topBar) {
            this.dom.scrolleableArea.addEventListener('scroll', () => {
                this.dom.topBar.classList.toggle('shadow', this.dom.scrolleableArea.scrollTop > 0);
            });
        }

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            
            if (btn) {
                const action = btn.getAttribute('data-action');
                if (action === 'toggleModuleSurface') this.toggleModule('moduleSurface');
                else if (action === 'toggleModuleMainOptions') this.toggleModule('moduleMainOptions');
                else if (action === 'toggleModuleLanguage') this.toggleModule('moduleLanguage');
                else if (action === 'toggleModuleTheme') this.toggleModule('moduleTheme');
                else if (action === 'toggleMobileSearch') this.toggleMobileSearch();
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
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-action="togglePreference"]')) {
                const key = e.target.getAttribute('data-key');
                const value = e.target.checked ? 1 : 0;
                this.savePreference(key, value);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.config.closeOnEsc) this.closeAllModules();
        });
    }

    toggleEditState(field) {
        const viewBox = document.querySelector(`[data-state="${field}-view"]`);
        const editBox = document.querySelector(`[data-state="${field}-edit"]`);
        if (!viewBox || !editBox) return;

        if (viewBox.classList.contains('active')) {
            viewBox.classList.replace('active', 'disabled');
            editBox.classList.replace('disabled', 'active');
            setTimeout(() => {
                const input = document.getElementById('input-' + field);
                if (input) {
                    input.focus();
                    input.value = input.value;
                }
            }, 50);
        } else {
            editBox.classList.replace('active', 'disabled');
            viewBox.classList.replace('disabled', 'active');
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `component-toast component-toast--${type}`;
        let iconName = type === 'success' ? 'check_circle' : 'error';
        toast.innerHTML = `<div class="component-toast-icon"><span class="material-symbols-rounded">${iconName}</span></div><div class="component-toast-text">${message}</div>`;

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        let extendedAlerts = (this.getPref('extended_alerts') == 1 || this.getPref('extended_alerts') == '1');
        let duration = extendedAlerts ? 8000 : 4000;

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    initBottomSheets() {
        document.querySelectorAll('.component-module--dropdown').forEach(module => {
            module.querySelectorAll('.component-menu').forEach(panel => {
                const dragHandle = panel.querySelector('.pill-container');
                if (dragHandle) {
                    dragHandle.addEventListener('pointerdown', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        this.handleDragStart(e, module, panel);
                    });
                }
                panel.addEventListener('pointermove', (e) => this.handleDragMove(e));
                panel.addEventListener('pointerup', (e) => this.handleDragEnd(e));
                panel.addEventListener('pointercancel', (e) => this.handleDragEnd(e));
            });
        });
    }

    handleDragStart(e, module, panel) {
        if (!this.isMobile) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return; 
        panel.setPointerCapture(e.pointerId);
        this.dragState.isDragging = true;
        this.dragState.startY = e.clientY;
        this.dragState.module = module;
        this.dragState.panel = panel;
        module.classList.add('is-dragging');
    }

    handleDragMove(e) {
        if (!this.dragState.isDragging) return;
        if (e.cancelable) e.preventDefault();
        const diff = e.clientY - this.dragState.startY;
        if (diff > 0) {
            this.dragState.panel.style.transform = `translateY(${diff}px)`;
            this.dragState.currentDiff = diff;
        }
    }

    handleDragEnd(e) {
        if (!this.dragState.isDragging) return;
        this.dragState.isDragging = false;
        this.dragState.module.classList.remove('is-dragging'); 
        if (this.dragState.panel.hasPointerCapture(e.pointerId)) this.dragState.panel.releasePointerCapture(e.pointerId);

        if (this.dragState.currentDiff > this.dragState.panel.offsetHeight * 0.40) {
            this.closeModule(this.dragState.module); 
        } else {
            // FIX: Limpiamos sólo el transform para no borrar las reglas de display del SPA Router
            this.dragState.panel.style.transform = '';
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

    openModule(module) { module.classList.replace('disabled', 'active'); }
    
    closeModule(module) { 
        module.classList.replace('active', 'disabled'); 
        // FIX: Limpiamos sólo el transform para no borrar las reglas de display del SPA Router
        module.querySelectorAll('.component-menu').forEach(p => p.style.transform = '');
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
                // FIX: Limpiamos sólo el transform para no borrar las reglas de display del SPA Router
                if (p) p.style.transform = '';
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
        let newDevice = width <= 768 ? 'Móvil' : (width <= 1024 ? 'Tablet' : 'Escritorio');
        if (this.state.currentDevice !== newDevice) this.state.currentDevice = newDevice;
    }
}