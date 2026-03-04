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
        outlet: '#app-router-outlet'
    });

    // ========================================================
    // MOTOR DE CARGA DIFERIDA (LAZY LOADING CON DYNAMIC IMPORTS)
    // ========================================================
    
    // Registro global de controladores para aplicar un patrón Singleton
    // Esto evita que hagamos "new Controller()" múltiples veces si el usuario navega a la misma vista repetidas veces.
    window.loadedControllers = {}; 

    window.addEventListener('viewLoaded', async (e) => {
        // Recibimos la URL ya normalizada (sin parámetros ?id=...) desde nuestro nuevo SpaRouter
        const cleanUrl = e.detail.cleanUrl; 
        
        // Removemos el AppBasePath (Ej. "/projectrosaura") para que coincida exactamente con las llaves de nuestro RouteModulesMap
        let relativePath = cleanUrl;
        if (window.AppBasePath && cleanUrl.startsWith(window.AppBasePath)) {
            relativePath = cleanUrl.replace(window.AppBasePath, '');
        }
        
        // Asegurarnos de que si la ruta quedó vacía, sea un slash '/'
        if (relativePath === '') relativePath = '/';

        // Buscamos si existe una configuración para esta ruta
        const moduleConfig = RouteModulesMap[relativePath];

        if (moduleConfig) {
            try {
                // AQUÍ OCURRE LA MAGIA: El navegador descarga el archivo JS solo en este momento
                const module = await import(moduleConfig.path);
                
                // Evaluamos si el controlador no ha sido cargado/instanciado previamente
                if (!window.loadedControllers[moduleConfig.className]) {
                    
                    // Extraemos la clase del módulo descargado y la instanciamos
                    const ControllerClass = module[moduleConfig.className];
                    const instance = new ControllerClass();
                    
                    // Guardamos la instancia en nuestro registro
                    window.loadedControllers[moduleConfig.className] = instance;

                    // Ejecutamos su método init() de forma segura
                    if (typeof instance.init === 'function') {
                        instance.init();
                    }
                } else {
                    // Si el controlador YA existe en memoria, significa que el usuario volvió a esta ruta.
                    // Simplemente re-ejecutamos su init() para que vuelva a vincular eventos a los nuevos elementos del DOM recién inyectados.
                    // (En el siguiente paso prepararemos los controladores para que soporten esto sin duplicar eventos).
                    const existingInstance = window.loadedControllers[moduleConfig.className];
                    if (typeof existingInstance.init === 'function') {
                        existingInstance.init(); 
                    }
                }
            } catch (error) {
                console.error(`[ProjectRosaura] Error al hacer Lazy Load del módulo para: ${relativePath}`, error);
            }
        }
    });
});