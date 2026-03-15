// public/assets/js/AppInit.js
import { MainController } from './MainController.js';
import { SpaRouter } from './core/router/SpaRouter.js';
import { DialogSystem } from './core/components/DialogSystem.js';
import { TooltipSystem } from './core/components/TooltipSystem.js';
import { CalendarSystem } from './core/components/CalendarSystem.js';
import { VideoCardSystem } from './core/components/VideoCardSystem.js';

// Importamos nuestro nuevo Mapa de Rutas
import { RouteModulesMap } from './core/router/RouteModulesMap.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("[AppInit] Iniciando arranque de la aplicación...");

    // ========================================================
    // CONFIGURACIÓN GLOBAL DE LA APLICACIÓN (AppConfig)
    // ========================================================
    window.AppConfig = window.AppConfig || {};
    window.AppConfig.Images = {
        Fallbacks: {
            videoThumbnail: 'https://placehold.co/1280x720/1a1a1a/e0e0e0?text=Video+No+Disponible',
            playlistEmpty: 'https://placehold.co/1280x720/2d2d2d/a0a0a0?text=Playlist+Vacia'
        }
    };

    // HIDRATACIÓN DE ESTADO DEL USUARIO (Is Creator)
    // Leemos de la variable inyectada por PHP o del localStorage como fallback
    window.AppUserIsCreator = window.AppUserIsCreator !== undefined 
        ? window.AppUserIsCreator 
        : (parseInt(localStorage.getItem('pr_is_creator')) || 0);

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

    // 5. Instanciamos e inicializamos el Sistema de Video Cards (Global)
    window.videoCardSystem = new VideoCardSystem();
    window.videoCardSystem.init();

    // 6. Instanciamos el Router SPA
    window.spaRouter = new SpaRouter({
        outlet: '[data-ref="app-router-outlet"]'
    });

    // ========================================================
    // LOGICA DE VERIFICACIÓN DE EDAD (AGE GATE)
    // ========================================================
    const ageGateOverlay = document.getElementById('component-age-gate');
    const btnAgeConfirm = document.getElementById('btn-age-confirm');
    const btnAgeReject = document.getElementById('btn-age-reject');

    if (ageGateOverlay && localStorage.getItem('age_verified') !== 'true') {
        if (btnAgeConfirm) {
            btnAgeConfirm.addEventListener('click', () => {
                localStorage.setItem('age_verified', 'true');
                ageGateOverlay.classList.remove('component-age-gate--active');
                ageGateOverlay.classList.add('component-age-gate--hidden');
                
                if (window.location.pathname.includes('age-restricted')) {
                    window.spaRouter.navigate(window.AppBasePath || '/');
                } else {
                    window.spaRouter.loadRoute(window.location.pathname);
                }
            });
        }

        if (btnAgeReject) {
            btnAgeReject.addEventListener('click', () => {
                ageGateOverlay.classList.remove('component-age-gate--active');
                ageGateOverlay.classList.add('component-age-gate--hidden');
                
                const fallbackTitle = 'Acceso Denegado';
                const fallbackDesc = 'No puedes acceder debido a limitaciones de edad.';
                const title = (window.AppTranslations && window.AppTranslations['age_restricted_title']) ? window.AppTranslations['age_restricted_title'] : fallbackTitle;
                const desc = (window.AppTranslations && window.AppTranslations['age_restricted_desc']) ? window.AppTranslations['age_restricted_desc'] : fallbackDesc;
                
                window.spaRouter.renderHttpError('403', title, desc, 'block');
                
                window.history.pushState(null, '', (window.AppBasePath || '') + '/age-restricted');
                window.spaRouter.highlightCurrentRoute();
            });
        }
    }

    // ========================================================
    // MOTOR DE CARGA DIFERIDA (LAZY LOADING) REFORZADO
    // ========================================================
    
    window.loadedControllers = {}; 
    window.importLocks = {}; 

    window.addEventListener('viewLoaded', async (e) => {
        const cleanUrl = e.detail.cleanUrl; 
        console.log(`[Router] viewLoaded disparado -> cleanUrl recibida: "${cleanUrl}"`);
        
        let relativePath = cleanUrl;
        if (window.AppBasePath && cleanUrl.startsWith(window.AppBasePath)) {
            relativePath = cleanUrl.replace(window.AppBasePath, '');
        }
        
        if (relativePath === '') relativePath = '/';

        if (relativePath.startsWith('/@')) {
            console.log(`[Router] Ruta de perfil detectada, normalizando a "/@channel"`);
            relativePath = '/@channel';
        }

        let moduleConfig = RouteModulesMap[relativePath];

        if (!moduleConfig) {
            const baseRoute = Object.keys(RouteModulesMap)
                .sort((a, b) => b.length - a.length)
                .find(route => relativePath.startsWith(route + '/'));
                
            if (baseRoute) {
                moduleConfig = RouteModulesMap[baseRoute];
                console.log(`[Router] Se usó ruta dinámica base: "${baseRoute}"`);
            }
        }

        if (moduleConfig) {
            const className = moduleConfig.className;
            console.log(`[Router] Módulo mapeado: ${className} -> ${moduleConfig.path}`);

            if (window.importLocks[className]) {
                console.log(`[Router] Esperando a que el lock de ${className} se libere...`);
                await window.importLocks[className];
            }

            try {
                if (!window.loadedControllers[className]) {
                    console.log(`[Router] Descargando/Importando ${className}...`);
                    
                    window.importLocks[className] = import(moduleConfig.path);
                    const module = await window.importLocks[className];
                    
                    const ControllerClass = module[className] || module.default;

                    if (!ControllerClass) {
                        throw new Error(`La clase '${className}' no se encontró en el módulo importado.`);
                    }

                    console.log(`[Router] Instanciando ${className}...`);
                    const instance = new ControllerClass();
                    
                    window.loadedControllers[className] = instance;

                    if (typeof instance.init === 'function') {
                        instance.init();
                        console.log(`[Router] ${className}.init() ejecutado exitosamente.`);
                    }
                } else {
                    console.log(`[Router] ${className} ya estaba en memoria. Reciclando instancia...`);
                    const existingInstance = window.loadedControllers[className];
                    if (typeof existingInstance.init === 'function') {
                        existingInstance.init(); 
                    }
                }
            } catch (error) {
                console.error(`[ProjectRosaura] Error al hacer Lazy Load de: ${relativePath}`, error);
            } finally {
                delete window.importLocks[className];
            }
        } else {
            console.warn(`[Router] No se encontró ninguna configuración en RouteModulesMap para: "${relativePath}"`);
        }
    });

    let currentPath = window.location.pathname;
    let initialCleanUrl = currentPath.split('?')[0].split('#')[0];
    
    if (initialCleanUrl.endsWith('/') && initialCleanUrl.length > 1) {
        initialCleanUrl = initialCleanUrl.slice(0, -1);
    }

    console.log(`[AppInit] Disparando viewLoaded inicial para: "${initialCleanUrl}"`);
    window.dispatchEvent(new CustomEvent('viewLoaded', { 
        detail: { 
            url: currentPath,
            cleanUrl: initialCleanUrl 
        } 
    }));
});