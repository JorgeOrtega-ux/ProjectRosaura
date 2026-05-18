// public/assets/js/AppInit.js
import { MainController } from './MainController.js';
import { SpaRouter } from './core/router/SpaRouter.js';
import { DialogSystem } from './core/components/DialogSystem.js';
import { TooltipSystem } from './core/components/TooltipSystem.js';
import TelemetryTracker from './core/telemetry/TelemetryTracker.js'; // NUEVA IMPORTACIÓN

// Importamos nuestro Mapa de Rutas
import { RouteModulesMap } from './core/router/RouteModulesMap.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Instanciamos lógica UI base (Global)
    const app = new MainController();
    app.init();
    window.appInstance = app; 

    // 2. Instanciamos el Sistema de Diálogos global
    window.dialogSystem = new DialogSystem();

    // 3. Instanciamos e inicializamos el Sistema de Tooltips
    window.tooltipSystem = new TooltipSystem();
    window.tooltipSystem.init();

    // 4. Instanciamos el Router SPA
    window.spaRouter = new SpaRouter({
        outlet: '[data-ref="app-router-outlet"]'
    });

    // 5. NUEVO: Instanciamos el Tracker de Telemetría
    const allowTelemetry = window.AppUserPrefs && window.AppUserPrefs.allow_telemetry !== undefined 
                           ? parseInt(window.AppUserPrefs.allow_telemetry) === 1 
                           : true;
    window.telemetryTracker = new TelemetryTracker({ allowTelemetry });

    // ========================================================
    // MOTOR DE CARGA DIFERIDA (LAZY LOADING) REFORZADO CON CICLO DE VIDA
    // ========================================================
    
    window.loadedControllers = {}; 
    window.importLocks = {}; 
    window.activeControllerInstance = null;
    
    // Bandera para no solicitar el JSON de admin en cada clic
    window.adminLangLoaded = false;

    window.addEventListener('viewLoaded', async (e) => {
        const cleanUrl = e.detail.cleanUrl; 
        const loadTimeMs = e.detail.loadTimeMs || 0; // NUEVO: Atrapamos el tiempo de carga
        
        // Registrar la vista en la Telemetría
        if (window.telemetryTracker) {
            window.telemetryTracker.trackPageview(cleanUrl, loadTimeMs);
        }

        let relativePath = cleanUrl;
        if (window.AppBasePath && cleanUrl.startsWith(window.AppBasePath)) {
            relativePath = cleanUrl.replace(window.AppBasePath, '');
        }
        
        if (relativePath === '') relativePath = '/';

        const moduleConfig = RouteModulesMap[relativePath];

        if (moduleConfig) {
            
            // --- LÓGICA DE TRADUCCIONES DIFERIDAS (ADMIN) ---
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
                    // Silenciado
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
                // Silenciado
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

    // ========================================================
    // AUTO-ARRANQUE DE LAZY LOADING PARA LA CARGA INICIAL (F5)
    // ========================================================
    let currentPath = window.location.pathname;
    let initialCleanUrl = currentPath.split('?')[0].split('#')[0];
    
    if (initialCleanUrl.endsWith('/') && initialCleanUrl.length > 1) {
        initialCleanUrl = initialCleanUrl.slice(0, -1);
    }

    // Nota: El loadTimeMs inicial será 0 ya que la página se renderizó en el servidor (PHP)
    window.dispatchEvent(new CustomEvent('viewLoaded', { 
        detail: { 
            url: currentPath,
            cleanUrl: initialCleanUrl,
            loadTimeMs: 0 
        } 
    }));
});