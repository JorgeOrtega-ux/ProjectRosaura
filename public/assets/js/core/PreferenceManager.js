import { ApiService } from './api/ApiServices.js';
import { ApiRoutes } from './api/ApiRoutes.js';

/**
 * PreferenceManager — Gestiona las preferencias del usuario.
 * Extrae la lógica de getPref/savePreference/syncUI de MainController.
 */
export class PreferenceManager {
    constructor(themeManager, showToastFn, syncUIFn) {
        this.api = new ApiService();
        this.themeManager = themeManager;
        this.showToast = showToastFn;
        this._syncUI = syncUIFn;
        this.prefAbortController = null;
    }

    /**
     * Determina si el usuario aceptó cookies funcionales.
     */
    canUseFuncCookies() {
        try {
            const consent = localStorage.getItem('pr_cookie_consent');
            if (consent) {
                const prefs = JSON.parse(consent);
                if (prefs && prefs.func !== undefined) return !!prefs.func;
            }
        } catch(e) {}
        return true;
    }

    /**
     * Obtiene una preferencia: primero AppUserPrefs, luego localStorage.
     * @param {string} key
     */
    get(key) {
        if (window.AppUserPrefs && window.AppUserPrefs[key] !== undefined && window.AppUserPrefs[key] !== null) {
            return window.AppUserPrefs[key];
        }
        const local = localStorage.getItem('pr_' + key);
        if (local !== null) return local;
        if (key === 'purchase_preference') return 'verify';
        return null;
    }

    /**
     * Inicializa preferencias de usuario invitado si no existen.
     */
    initGuestDefaults() {
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

            if (this.canUseFuncCookies()) {
                localStorage.setItem('pr_language', finalLang);
                document.cookie = "pr_language=" + finalLang + "; path=/; max-age=31536000";
                localStorage.setItem('pr_open_links_new_tab', '1');
                localStorage.setItem('pr_theme', 'system');
                localStorage.setItem('pr_extended_alerts', '0');
            }
        }
    }

    /**
     * Guarda una preferencia localmente y en el servidor (si hay sesión).
     * @param {string} key
     * @param {*} value
     * @param {string} [password]
     */
    async save(key, value, password = '') {
        const previousValue = this.get(key);

        // Caso especial: compra rápida requiere confirmar contraseña
        if (key === 'purchase_preference' && value === 'fast' && !password) {
            if (window.modalSystem) {
                const res = await window.modalSystem.show('confirmPasswordModal', {
                    title: window.__('title_confirm_fast_payment'),
                    desc: window.__('desc_confirm_fast_payment')
                });

                if (res && (res.confirmed || res.action === 'confirm' || res.action === true)) {
                    password = (res.data && res.data.confirmSecPasswordInput) || res.confirmSecPasswordInput || '';
                    if (!password) {
                        this.showToast(window.__('auth_incorrect_password'), 'error');
                        return;
                    }
                } else {
                    return;
                }
            }
        }

        // Aplicar inmediatamente
        if (key === 'theme') this.themeManager.apply(value);
        if (key === 'language' && this.canUseFuncCookies()) {
            document.cookie = "pr_language=" + value + "; path=/; max-age=31536000";
        }

        if (window.AppUserPrefs) window.AppUserPrefs[key] = value;
        if (this.canUseFuncCookies()) localStorage.setItem('pr_' + key, value);

        if (this._syncUI) this._syncUI();

        if (key === 'language' && !window.AppUserPrefs) {
            window.location.reload();
            return;
        }

        if (window.AppUserPrefs) {
            if (this.prefAbortController) this.prefAbortController.abort();
            this.prefAbortController = new AbortController();

            try {
                const payload = { key, value };
                if (password) payload.password = password;

                const response = await this.api.post(ApiRoutes.Settings.UpdatePreferences, payload, this.prefAbortController.signal);

                if (response && response.aborted) return;

                if (response && response.success) {
                    if (key === 'language') { window.location.reload(); return; }
                    this.showToast(window.__('pref_saved_account'), 'success');
                } else {
                    // Rollback
                    if (window.AppUserPrefs) window.AppUserPrefs[key] = previousValue;
                    if (this.canUseFuncCookies()) localStorage.setItem('pr_' + key, previousValue);
                    if (key === 'theme') this.themeManager.apply(previousValue);
                    if (this._syncUI) this._syncUI();
                    this.showToast((response && response.message) ? response.message : window.__('pref_save_network_error'), 'error');
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                if (window.AppUserPrefs) window.AppUserPrefs[key] = previousValue;
                if (this.canUseFuncCookies()) localStorage.setItem('pr_' + key, previousValue);
                if (key === 'theme') this.themeManager.apply(previousValue);
                if (this._syncUI) this._syncUI();
                this.showToast(window.__('general_save_network_error'), 'error');
            }
        } else {
            this.showToast(window.__('pref_local_config_saved'), 'success');
        }
    }

    destroy() {
        if (this.prefAbortController) this.prefAbortController.abort();
    }
}
