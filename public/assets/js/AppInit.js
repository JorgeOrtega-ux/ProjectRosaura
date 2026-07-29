import { MainController } from './MainController.js';
import { SpaRouter } from './core/router/SpaRouter.js';
import { DialogSystem } from './core/components/DialogSystem.js';
import { NoticeSystem } from './core/components/NoticeSystem.js';
import { TooltipSystem } from './core/components/TooltipSystem.js';
import { TelemetryTracker } from './core/telemetry/TelemetryTracker.js';
import { RouteModulesMap } from './core/router/RouteModulesMap.js';
import { ApiService } from './core/api/ApiServices.js';
import { ApiRoutes } from './core/api/ApiRoutes.js';

import { formatNumber } from './core/utils/uiUtils.js';

document.addEventListener('DOMContentLoaded', () => {
    window.formatNumber = formatNumber;
    window.appUserTier = window.APP_USER ? window.APP_USER.subscription_tier : 0;

    const app = new MainController();
    app.init();
    window.appInstance = app; 

    window.dialogSystem = new DialogSystem();
    window.noticeSystem = new NoticeSystem();

    // Cookie Banner Logic
    const cookieConsent = localStorage.getItem('pr_cookie_consent');
    const isManageCookiesPage = window.location.pathname === '/site-policy/manage-cookies';
    if (!cookieConsent && !isManageCookiesPage) {
        window.noticeSystem.show('cookieBanner', {
            title: 'Aviso de Privacidad',
            message: 'Utilizamos cookies propias y de terceros para analizar nuestros servicios y mostrarte publicidad relacionada con tus preferencias en base a un perfil elaborado a partir de tus hábitos de navegación.',
            confirmText: 'Aceptar todas las cookies',
            cancelText: 'Administrar cookies'
        }).then(res => {
            if (res.confirmed === 'manage_cookies' || res.action === 'manage_cookies') {
                if (window.spaRouter) {
                    window.spaRouter.navigate('/site-policy/manage-cookies');
                } else {
                    window.location.href = '/site-policy/manage-cookies';
                }
            } else if (res.confirmed === true) {
                localStorage.setItem('pr_cookie_consent', JSON.stringify({ essential: true, func: true, perf: true, target: true }));
            }
        });
    } else {
        // Promo Card Logic
        if (window.appUserTier === 0) {
            const lastPromoTime = localStorage.getItem('pr_promo_last_seen');
            const now = Date.now();
            if (!lastPromoTime || now - parseInt(lastPromoTime) > 24 * 60 * 60 * 1000) {
                setTimeout(() => {
                    window.noticeSystem.show('promoCard', {
                        title: '¡Mejora tu plan!',
                        message: 'Obtén acceso a todas las funcionalidades exclusivas con nuestra suscripción premium. Cancela cuando quieras.',
                        confirmText: 'Ver planes',
                        cancelText: 'Quizás luego'
                    }).then(res => {
                        localStorage.setItem('pr_promo_last_seen', Date.now().toString());
                        if (res.confirmed === true) {
                            if (window.spaRouter) window.spaRouter.navigate('/premium');
                            else window.location.href = '/premium';
                        }
                    });
                }, 3000); 
            }
        }
    }

    window.tooltipSystem = new TooltipSystem();
    window.tooltipSystem.init();

    window.spaRouter = new SpaRouter({
        outlet: '[data-ref="app-router-outlet"]'
    });

    const allowTelemetry = window.AppUserPrefs && window.AppUserPrefs.allow_telemetry !== undefined 
                           ? parseInt(window.AppUserPrefs.allow_telemetry) === 1 
                           : true;
    window.telemetryTracker = new TelemetryTracker({ allowTelemetry });
    
    window.telemetryTracker.init();

    const applyRoleDynamicColors = () => {
        document.querySelectorAll('.role-dynamic[data-role-bg]').forEach(el => {
            el.style.setProperty('--active-role-bg', el.dataset.roleBg);
        });
    };

    applyRoleDynamicColors();

    window.applyRoleDynamicColors = applyRoleDynamicColors;

    let _searchCooldown = false;
    document.body.addEventListener('keydown', (e) => {
        if (e.target.matches('#globalSearchInput')) {
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
    
    window.adminLangLoaded = false;

    window.addEventListener('viewLoaded', async (e) => {
        const cleanUrl = e.detail.cleanUrl; 
        const loadTimeMs = e.detail.loadTimeMs || 0; 
        
        if (window.telemetryTracker) {
            window.telemetryTracker.trackPageview(cleanUrl, loadTimeMs);
        }

        if (window.applyRoleDynamicColors) {
            window.applyRoleDynamicColors();
        }

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
                    const reqUrl = (window.AppBasePath || '') + '/api/index.php';
                    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                    const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

                    const response = await fetch(reqUrl, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfToken
                        },
                        body: JSON.stringify({ route: 'admin.get_translations' }) 
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const resData = await response.json();
                    
                    if (resData && resData.success && resData.data) {
                        window.AppTranslations = { ...(window.AppTranslations || {}), ...resData.data };
                        window.adminLangLoaded = true;
                    }
                } catch (error) {
                    
                }
            }

            const className = moduleConfig.className;

            if (window.importLocks[className]) {
                await window.importLocks[className];
            }

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
                    
                    const ControllerClass = module[className];
                    targetInstance = new ControllerClass();
                    
                    window.loadedControllers[className] = targetInstance;
                } else {
                    targetInstance = window.loadedControllers[className];
                }

                if (window.activeControllerInstance && 
                    window.activeControllerInstance !== targetInstance && 
                    typeof window.activeControllerInstance.destroy === 'function') {
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
            if (window.activeControllerInstance && typeof window.activeControllerInstance.destroy === 'function') {
                window.activeControllerInstance.destroy();
                window.activeControllerInstance = null;
            }
        }
    });

    let currentPath = window.location.pathname;
    let initialCleanUrl = currentPath.split('?')[0].split('#')[0];
    
    if (initialCleanUrl.endsWith('/') && initialCleanUrl.length > 1) {
        initialCleanUrl = initialCleanUrl.slice(0, -1);
    }

    const showWelcomeFlow = async () => {
        if (!window.dialogSystem || !window.AppUserFlags || !window.APP_USER || !window.activeUserId) return;
        if (window.AppUserFlags.includes('welcome_modal_seen')) {
            return;
        }

        // Mark flag immediately so regardless of how modal is closed, it is saved in DB
        if (!window.AppUserFlags.includes('welcome_modal_seen')) {
            window.AppUserFlags.push('welcome_modal_seen');
        }

        try {
            const api = new ApiService();
            await api.post(ApiRoutes.Settings.SetFlag, { flag_key: 'welcome_modal_seen' });
        } catch (e) {
        }

        await window.dialogSystem.show('welcomeUserModal');
    };

    setTimeout(() => {
        showWelcomeFlow();
    }, 500);

    window.dispatchEvent(new CustomEvent('viewLoaded', { 
        detail: { 
            url: currentPath,
            cleanUrl: initialCleanUrl,
            loadTimeMs: 0 
        } 
    }));
});
