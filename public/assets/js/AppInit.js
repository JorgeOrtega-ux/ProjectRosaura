// public/assets/js/AppInit.js
import { MainController } from './MainController.js';
import { SpaRouter } from './core/router/SpaRouter.js';
import { DialogSystem } from './core/components/DialogSystem.js';
import { TooltipSystem } from './core/components/TooltipSystem.js';
import { CalendarSystem } from './core/components/CalendarSystem.js';

// Importamos nuestro nuevo Mapa de Rutas
import { RouteModulesMap } from './core/router/RouteModulesMap.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Instanciamos lógica UI base (Global)
    const app = new MainController();
    app.init();
    window.appInstance = app; 

    // 2. Instanciamos el Sistema de Diálogos global
    window.dialogSystem = new DialogSystem();

    // 3. Instanciamos e inicializamos el Sistema de Calendario Global
    window.calendarSystem = new CalendarSystem();
    window.calendarSystem.init();

    // 4. Instanciamos e inicializamos el Sistema de Tooltips
    window.tooltipSystem = new TooltipSystem();
    window.tooltipSystem.init();

    // 5. Instanciamos el Router SPA
    window.spaRouter = new SpaRouter({
        outlet: '[data-ref="app-router-outlet"]'
    });

    // ========================================================
    // MOTOR DE CARGA DIFERIDA (LAZY LOADING) REFORZADO
    // ========================================================
    
    window.loadedControllers = {}; 
    // Mutex Lock: Evita descargas concurrentes del mismo módulo si hay race-conditions
    window.importLocks = {}; 

    window.addEventListener('viewLoaded', async (e) => {
        const cleanUrl = e.detail.cleanUrl; 
        
        let relativePath = cleanUrl;
        if (window.AppBasePath && cleanUrl.startsWith(window.AppBasePath)) {
            relativePath = cleanUrl.replace(window.AppBasePath, '');
        }
        
        if (relativePath === '') relativePath = '/';

        let moduleConfig = RouteModulesMap[relativePath];

        // Soporte para rutas dinámicas (Ej: /studio/management-panel/ID_DEL_PROYECTO)
        if (!moduleConfig) {
            const baseRoute = Object.keys(RouteModulesMap).find(route => relativePath.startsWith(route + '/'));
            if (baseRoute) {
                moduleConfig = RouteModulesMap[baseRoute];
            }
        }

        if (moduleConfig) {
            const className = moduleConfig.className;

            // Si ya hay un proceso de carga activo para esta clase, esperamos a que termine
            if (window.importLocks[className]) {
                await window.importLocks[className];
            }

            try {
                if (!window.loadedControllers[className]) {
                    
                    // Bloqueamos para evitar instanciaciones dobles concurrentes
                    window.importLocks[className] = import(moduleConfig.path);
                    const module = await window.importLocks[className];
                    
                    const ControllerClass = module[className];
                    const instance = new ControllerClass();
                    
                    window.loadedControllers[className] = instance;

                    if (typeof instance.init === 'function') {
                        instance.init();
                    }
                } else {
                    // Si ya existe, reciclamos
                    const existingInstance = window.loadedControllers[className];
                    if (typeof existingInstance.init === 'function') {
                        existingInstance.init(); 
                    }
                }
            } catch (error) {
                console.error(`[ProjectRosaura] Error al hacer Lazy Load de: ${relativePath}`, error);
            } finally {
                // Liberamos el candado
                delete window.importLocks[className];
            }
        }
    });

    // ========================================================
    // AUTO-ARRANQUE DE LAZY LOADING PARA LA CARGA INICIAL (F5)
    // ========================================================
    // Ejecución síncrona, directa y sin setTimeouts. Analiza la URL 
    // real con la que arrancó la página y dispara el inyector del JS.
    let currentPath = window.location.pathname;
    let initialCleanUrl = currentPath.split('?')[0].split('#')[0];
    
    if (initialCleanUrl.endsWith('/') && initialCleanUrl.length > 1) {
        initialCleanUrl = initialCleanUrl.slice(0, -1);
    }

    window.dispatchEvent(new CustomEvent('viewLoaded', { 
        detail: { 
            url: currentPath,
            cleanUrl: initialCleanUrl 
        } 
    }));
});