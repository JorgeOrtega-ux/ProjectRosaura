// public/assets/js/AppInit.js
import { MainController } from './MainController.js';
import { SpaRouter } from './core/router/SpaRouter.js';
import { DialogSystem } from './core/components/DialogSystem.js';
import { TooltipSystem } from './core/components/TooltipSystem.js';
import { TelemetryTracker } from './core/telemetry/TelemetryTracker.js';
import { RouteModulesMap } from './core/router/RouteModulesMap.js';

document.addEventListener('DOMContentLoaded', () => {
    window.appUserTier = window.APP_USER ? window.APP_USER.subscription_tier : 0;

    const app = new MainController();
    app.init();
    window.appInstance = app; 

    window.dialogSystem = new DialogSystem();

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

    // ========================================================
    // DELEGACIÓN GLOBAL: EVENTO DEL BUSCADOR DEL HEADER
    // ========================================================
    document.body.addEventListener('keydown', (e) => {
        if (e.target.matches('#globalSearchInput')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query) {
                    window.spaRouter.navigate('/search?q=' + encodeURIComponent(query));
                }
            }
        }
    });

    // ========================================================
    // MOTOR DE CARGA DIFERIDA (LAZY LOADING) REFORZADO CON CICLO DE VIDA
    // ========================================================
    
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

        let relativePath = cleanUrl;
        if (window.AppBasePath && cleanUrl.startsWith(window.AppBasePath)) {
            relativePath = cleanUrl.replace(window.AppBasePath, '');
        }
        
        if (relativePath === '') relativePath = '/';

        if (relativePath.startsWith('/design/s/')) {
            relativePath = '/design/s/:uuid';
        } else if (relativePath.startsWith('/snapshot/view/')) {
            relativePath = '/snapshot/view/:id';
        } else if (relativePath.startsWith('/design/')) {
            relativePath = '/design';
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
                    // Errores de API silenciados por instrucciones directas.
                }
            }

            const className = moduleConfig.className;

            if (window.importLocks[className]) {
                await window.importLocks[className];
            }

            try {
                let targetInstance;

                if (!window.loadedControllers[className]) {
                    window.importLocks[className] = import(moduleConfig.path);
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
                // Errores de Lazy Loading silenciados por instrucciones directas.
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

    window.dispatchEvent(new CustomEvent('viewLoaded', { 
        detail: { 
            url: currentPath,
            cleanUrl: initialCleanUrl,
            loadTimeMs: 0 
        } 
    }));
});