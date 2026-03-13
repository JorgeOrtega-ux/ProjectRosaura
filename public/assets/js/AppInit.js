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
            // Imagen temporal para videos sin miniatura (Cámbiala luego por la tuya)
            videoThumbnail: 'https://placehold.co/1280x720/1a1a1a/e0e0e0?text=Video+No+Disponible',
            // Imagen temporal para playlists vacías o sin miniatura (Cámbiala luego por la tuya)
            playlistEmpty: 'https://placehold.co/1280x720/2d2d2d/a0a0a0?text=Playlist+Vacia'
        }
    };

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
        // Manejador para botón Confirmar
        if (btnAgeConfirm) {
            btnAgeConfirm.addEventListener('click', () => {
                localStorage.setItem('age_verified', 'true');
                ageGateOverlay.classList.remove('component-age-gate--active');
                ageGateOverlay.classList.add('component-age-gate--hidden');
                
                // Si estaba en la vista de rechazo, lo devolvemos al inicio al confirmar
                if (window.location.pathname.includes('age-restricted')) {
                    window.spaRouter.navigate(window.AppBasePath || '/');
                } else {
                    // Forzamos la recarga de la ruta actual si estaba bloqueada por el router
                    window.spaRouter.loadRoute(window.location.pathname);
                }
            });
        }

        // Manejador para botón Rechazar
        if (btnAgeReject) {
            btnAgeReject.addEventListener('click', () => {
                ageGateOverlay.classList.remove('component-age-gate--active');
                ageGateOverlay.classList.add('component-age-gate--hidden');
                
                // Renderizar directamente la vista de error vía el router sin recargar
                const fallbackTitle = 'Acceso Denegado';
                const fallbackDesc = 'No puedes acceder debido a limitaciones de edad.';
                const title = (window.AppTranslations && window.AppTranslations['age_restricted_title']) ? window.AppTranslations['age_restricted_title'] : fallbackTitle;
                const desc = (window.AppTranslations && window.AppTranslations['age_restricted_desc']) ? window.AppTranslations['age_restricted_desc'] : fallbackDesc;
                
                window.spaRouter.renderHttpError('403', title, desc, 'block');
                
                // Actualizar la URL en el navegador
                window.history.pushState(null, '', (window.AppBasePath || '') + '/age-restricted');
                window.spaRouter.highlightCurrentRoute();
            });
        }
    }

    // ========================================================
    // MOTOR DE CARGA DIFERIDA (LAZY LOADING) REFORZADO
    // ========================================================
    
    window.loadedControllers = {}; 
    // Mutex Lock: Evita descargas concurrentes del mismo módulo
    window.importLocks = {}; 

    window.addEventListener('viewLoaded', async (e) => {
        const cleanUrl = e.detail.cleanUrl; 
        console.log(`[Router] viewLoaded disparado -> cleanUrl recibida: "${cleanUrl}"`);
        
        let relativePath = cleanUrl;
        if (window.AppBasePath && cleanUrl.startsWith(window.AppBasePath)) {
            relativePath = cleanUrl.replace(window.AppBasePath, '');
        }
        
        if (relativePath === '') relativePath = '/';

        // --- SOLUCIÓN PARA RUTAS DINÁMICAS TIPO PERFIL (Ej: /@jorge) ---
        // CORRECCIÓN: El mapa de rutas utiliza '/@channel', no '/@'
        if (relativePath.startsWith('/@')) {
            console.log(`[Router] Ruta de perfil detectada, normalizando a "/@channel"`);
            relativePath = '/@channel';
        }

        let moduleConfig = RouteModulesMap[relativePath];

        // Soporte para otras rutas dinámicas (Ej: /studio/management-panel/ID o /channel/UUID/editing)
        if (!moduleConfig) {
            // Ordenamos por longitud descendente para que siempre haga match con la ruta base más específica
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

            // Si ya hay un proceso de carga activo para esta clase, esperamos
            if (window.importLocks[className]) {
                console.log(`[Router] Esperando a que el lock de ${className} se libere...`);
                await window.importLocks[className];
            }

            try {
                if (!window.loadedControllers[className]) {
                    console.log(`[Router] Descargando/Importando ${className}...`);
                    
                    // Bloqueamos para evitar instanciaciones dobles concurrentes
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
                // Liberamos el candado
                delete window.importLocks[className];
            }
        } else {
            console.warn(`[Router] No se encontró ninguna configuración en RouteModulesMap para: "${relativePath}"`);
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

    console.log(`[AppInit] Disparando viewLoaded inicial para: "${initialCleanUrl}"`);
    window.dispatchEvent(new CustomEvent('viewLoaded', { 
        detail: { 
            url: currentPath,
            cleanUrl: initialCleanUrl 
        } 
    }));
});