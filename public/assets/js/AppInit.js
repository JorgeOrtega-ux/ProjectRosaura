import { ApiRoutes } from './core/api/ApiRoutes.js';
import { ApiService } from './core/api/ApiService.js';
import { formatNumber } from './core/utils/uiUtils.js';
import { MainController } from './MainController.js';
import { ModalSystem } from './core/components/ModalSystem.js';
import { NoticeSystem } from './core/components/NoticeSystem.js';
import { OnboardingTourManager } from './core/managers/OnboardingTourManager.js';
import { PromoService } from './core/services/PromoCardService.js';
import { RouteModulesMap } from './core/router/RouteModulesMap.js';
import { SpaRouter } from './core/router/SpaRouter.js';
import { TelemetryTracker } from './core/telemetry/TelemetryTracker.js';
import { TooltipSystem } from './core/components/TooltipSystem.js';

// --- DEBUG: session diagnostics (remove after fix is confirmed) ---
(function _sessionDebug() {
    const d = window.APP_SESSION_DEBUG;
    if (!d) return;

    const isAnomaly =
        d.autologin_triggered ||          // autoLogin corrió → sesión estaba expirada en Redis
        (d.had_remember_cookie && !d.had_session_on_load) || // había cookie pero no sesión
        d.ttl_mismatch;                   // gc_maxlifetime < cookie lifetime

    if (!isAnomaly) return; // sesión normal, no loggear

    const style = {
        header:  'color:#fff;background:#c0392b;font-weight:bold;padding:2px 6px;border-radius:3px',
        label:   'color:#888;font-size:11px',
        ok:      'color:#27ae60;font-weight:bold',
        warn:    'color:#e67e22;font-weight:bold',
        bad:     'color:#c0392b;font-weight:bold',
    };

    console.group('%c[SESSION DEBUG] Anomalía detectada en la carga', style.header);

    console.log('%c¿Había sesión PHP activa al cargar?',              style.label,
        d.had_session_on_load   ? '%c✔ Sí' : '%c✘ No (sesión Redis expirada o perdida)',
        d.had_session_on_load   ? style.ok  : style.bad);

    console.log('%c¿Había cookie remember_token/remember_tokens?',   style.label,
        d.had_remember_cookie   ? '%c✔ Sí' : '%c✘ No',
        d.had_remember_cookie   ? style.ok  : style.label);

    console.log('%c¿Se disparó autoLogin()?',                         style.label,
        d.autologin_triggered   ? '%c✔ Sí' : '%c– No',
        d.autologin_triggered   ? style.warn : style.label);

    if (d.autologin_triggered) {
        console.log('%c¿autoLogin tuvo éxito?',                       style.label,
            d.autologin_success ? '%c✔ Sí (el usuario se recuperó pero el HTML ya fue enviado sin sesión)' : '%c✘ No (cookie huérfana o token inválido)',
            d.autologin_success ? style.warn : style.bad);
    }

    console.log('%c¿Está logueado al final del bootstrap?',           style.label,
        d.is_logged_in_final    ? '%c✔ Sí' : '%c✘ No',
        d.is_logged_in_final    ? style.ok  : style.bad);

    console.log('%c-- TTLs --',                                        style.label);
    console.log('%cgc_maxlifetime (PHP/Redis):',                       style.label,
        `%c${d.gc_maxlifetime_secs}s (${Math.round(d.gc_maxlifetime_secs/60)} min)`,
        d.ttl_mismatch ? style.bad : style.ok);
    console.log('%cSession cookie lifetime:',                          style.label,
        `%c${d.cookie_lifetime_secs}s (${Math.round(d.cookie_lifetime_secs/86400)} días)`,
        style.ok);

    if (d.ttl_mismatch) {
        console.warn(
            '⚠️  CAUSA PROBABLE: gc_maxlifetime (' + d.gc_maxlifetime_secs + 's) es MENOR que el ' +
            'lifetime de la cookie (' + d.cookie_lifetime_secs + 's). ' +
            'La sesión en Redis expira mucho antes de que la cookie caduque, ' +
            'así que cuando el usuario vuelve, la cookie existe pero la sesión en Redis ya no.'
        );
    }

    if (d.autologin_triggered && d.autologin_success && !d.had_session_on_load) {
        console.warn(
            '⚠️  CAUSA PROBABLE: autoLogin() recuperó la sesión DESPUÉS de que PHP ' +
            'ya construyó el HTML con estado "sin sesión". ' +
            'La primera carga muestra estado guest; el SPA corrige en la siguiente petición.'
        );
    }

    console.groupEnd();
})();
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    window.formatNumber = formatNumber;
    window.appUserTier = window.APP_USER ? window.APP_USER.subscription_tier : 0;

    const app = new MainController();
    app.init();
    window.appInstance = app; 

    window.modalSystem = new ModalSystem();
    window.onboardingTourManager = new OnboardingTourManager();
    window.noticeSystem = new NoticeSystem();

    function checkAndShowPromoNotice() {
        if (!window.activeUserId) return;
        if (window.appUserTier !== 0) return;

        const cookieConsent = localStorage.getItem('pr_cookie_consent');
        if (!cookieConsent) return;

        const currentPath = window.location.pathname.toLowerCase();
        const isAuthOrHelp = ['/login', '/register', '/forgot-password', '/reset-password', '/account-suspended', '/account-deleted', '/help', '/site-policy'].some(route => currentPath.includes(route));
        
        if (isAuthOrHelp) {
            if (window.promoNoticeTimeoutId) {
                clearTimeout(window.promoNoticeTimeoutId);
                window.promoNoticeTimeoutId = null;
            }
            const activePromo = document.querySelector('.component-notice-box--promo');
            if (activePromo && window.noticeSystem) {
                const noticeId = activePromo.getAttribute('data-notice-id');
                if (noticeId) {
                    window.noticeSystem.close(noticeId, 'postponed');
                }
            }
            return;
        }

        const lastPromoTime = localStorage.getItem('pr_promo_last_seen');
        const now = Date.now();
        if (lastPromoTime && now - parseInt(lastPromoTime) <= 24 * 60 * 60 * 1000) return;

        if (document.querySelector('.component-notice-box--promo') || window.promoNoticeTimeoutId) return;

        window.promoNoticeTimeoutId = setTimeout(() => {
            window.promoNoticeTimeoutId = null;
            const verifyPath = window.location.pathname.toLowerCase();
            const stillAuthOrHelp = ['/login', '/register', '/forgot-password', '/reset-password', '/account-suspended', '/account-deleted', '/help', '/site-policy'].some(route => verifyPath.includes(route));
            if (stillAuthOrHelp || !window.activeUserId) return;

            window.noticeSystem.show('promoCard', {
                title: window.__('promo_notice_title'),
                message: window.__('promo_notice_desc'),
                confirmText: window.__('btn_view_plans'),
                cancelText: window.__('btn_maybe_later')
            }).then(res => {
                if (res.confirmed === 'postponed') {
                    return;
                }
                localStorage.setItem('pr_promo_last_seen', Date.now().toString());
                if (res.confirmed === true) {
                    if (window.spaRouter) window.spaRouter.navigate('/premium');
                    else window.location.href = '/premium';
                }
            });
        }, 3000);
    }

    const cookieConsent = localStorage.getItem('pr_cookie_consent');
    const isManageCookiesPage = window.location.pathname === '/site-policy/manage-cookies';
    if (!cookieConsent && !isManageCookiesPage) {
        window.noticeSystem.show('cookieBanner', {
            title: window.__('cookie_notice_title'),
            message: window.__('cookie_notice_desc'),
            confirmText: window.__('btn_accept_all_cookies'),
            cancelText: window.__('btn_manage_cookies')
        }).then(res => {
            if (res.confirmed === 'manage_cookies' || res.action === 'manage_cookies') {
                if (window.spaRouter) {
                    window.spaRouter.navigate('/site-policy/manage-cookies');
                } else {
                    window.location.href = '/site-policy/manage-cookies';
                }
            } else if (res.confirmed === true) {
                localStorage.setItem('pr_cookie_consent', JSON.stringify({ essential: true, func: true, perf: true, target: true }));
                checkAndShowPromoNotice();
            }
        });
    } else {
        checkAndShowPromoNotice();
    }

    window.tooltipSystem = new TooltipSystem();
    window.tooltipSystem.init();

    window.spaRouter = new SpaRouter({
        outlet: '[data-ref="app-router-outlet"]'
    });

    let allowTelemetry = window.AppUserPrefs && window.AppUserPrefs.allow_telemetry !== undefined 
                           ? parseInt(window.AppUserPrefs.allow_telemetry) === 1 
                           : true;

    try {
        const consent = localStorage.getItem('pr_cookie_consent');
        if (consent) {
            const prefs = JSON.parse(consent);
            if (prefs && prefs.perf === false) {
                allowTelemetry = false;
            }
        }
    } catch(e) {}

    window.telemetryTracker = new TelemetryTracker({ allowTelemetry });
    
    window.telemetryTracker.init();

    const applySubscriptionDynamicColors = () => {
        document.querySelectorAll('.subscription-dynamic[data-sub-bg]').forEach(el => {
            el.style.setProperty('--active-subscription-bg', el.dataset.subBg);
        });
    };

    applySubscriptionDynamicColors();

    window.applySubscriptionDynamicColors = applySubscriptionDynamicColors;

    let _searchCooldown = false;
    document.body.addEventListener('keydown', (e) => {
        if (e.target.matches('[data-ref="global-search-input"]')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query.length < 2 || _searchCooldown) return;
                _searchCooldown = true;
                setTimeout(() => { _searchCooldown = false; }, 1000);
                window.spaRouter.navigate('/search?q=' + encodeURIComponent(query));
            }
        }
    });

    window.loadedControllers = {}; 
    window.importLocks = {}; 
    window.activeControllerInstance = null;
    let currentModuleLoadId = 0;
    
    window.adminLangLoaded = false;

    window.addEventListener('viewLoaded', async (e) => {
        const loadId = ++currentModuleLoadId;
        const cleanUrl = e.detail.cleanUrl; 
        const loadTimeMs = e.detail.loadTimeMs || 0; 
        
        if (window.telemetryTracker) {
            window.telemetryTracker.trackPageview(cleanUrl, loadTimeMs);
        }

        if (window.applySubscriptionDynamicColors) {
            window.applySubscriptionDynamicColors();
        }

        checkAndShowPromoNotice();

        let relativePath = cleanUrl;
        if (window.AppBasePath && cleanUrl.startsWith(window.AppBasePath)) {
            relativePath = cleanUrl.replace(window.AppBasePath, '');
        }
        
        if (relativePath === '') relativePath = '/';

        if (window.spaRouter && typeof window.spaRouter._getRoutePattern === 'function') {
            relativePath = window.spaRouter._getRoutePattern(relativePath);
        } else {
            if (relativePath.startsWith('/design/s/')) {
                relativePath = '/design/s/:uuid';
            } else if (relativePath.startsWith('/snapshot/view/')) {
                relativePath = '/snapshot/view/:id';
            } else if (relativePath.startsWith('/design/')) {
                relativePath = '/design';
            }
        }

        const moduleConfig = RouteModulesMap[relativePath];

        if (moduleConfig) {
            if (moduleConfig.requiresAdminLang && !window.adminLangLoaded) {
                try {
                    const api = new ApiService();
                    const resData = await api.post(ApiRoutes.Admin.GetTranslations);
                    
                    if (resData && resData.success && resData.data) {
                        window.AppTranslations = { ...(window.AppTranslations || {}), ...resData.data };
                        window.adminLangLoaded = true;
                    }
                } catch (error) {
                    
                }
            }

            if (loadId !== currentModuleLoadId) return;

            const className = moduleConfig.className;

            if (window.importLocks[className]) {
                await window.importLocks[className];
            }

            if (loadId !== currentModuleLoadId) return;

            try {
                let targetInstance;

                let importPath = moduleConfig.path;
                if (importPath.startsWith('./')) {
                    let basePath = window.AppBasePath || '';
                    importPath = `${basePath}/assets/js/${importPath.slice(2)}`;
                }

                if (!window.loadedControllers[className]) {
                    window.importLocks[className] = import(importPath);
                    const module = await window.importLocks[className];
                    
                    if (loadId !== currentModuleLoadId) return;

                    const ControllerClass = module[className];
                    targetInstance = new ControllerClass();
                    
                    window.loadedControllers[className] = targetInstance;
                } else {
                    targetInstance = window.loadedControllers[className];
                }

                if (loadId !== currentModuleLoadId) return;

                if (window.activeControllerInstance && typeof window.activeControllerInstance.destroy === 'function') {
                    window.activeControllerInstance.destroy();
                }

                window.activeControllerInstance = targetInstance;

                if (typeof targetInstance.init === 'function') {
                    targetInstance.init();
                }

            } catch (error) {
                console.error('[AppInit Module Loading Error]', error);
            } finally {
                delete window.importLocks[className];
            }
        } else {
            if (loadId !== currentModuleLoadId) return;

            if (window.activeControllerInstance && typeof window.activeControllerInstance.destroy === 'function') {
                window.activeControllerInstance.destroy();
                window.activeControllerInstance = null;
            }
        }

        if (loadId === currentModuleLoadId && window.onboardingTourManager) {
            window.onboardingTourManager.triggerTour(relativePath);
        }
    });

    let currentPath = window.location.pathname;
    let initialCleanUrl = currentPath.split('?')[0].split('#')[0];
    
    if (initialCleanUrl.endsWith('/') && initialCleanUrl.length > 1) {
        initialCleanUrl = initialCleanUrl.slice(0, -1);
    }

    if (window.onboardingTourManager) {
        window.onboardingTourManager.triggerWelcomeTour();
    }

    window.dispatchEvent(new CustomEvent('viewLoaded', { 
        detail: { 
            url: currentPath,
            cleanUrl: initialCleanUrl,
            loadTimeMs: 0 
        } 
    }));
});
