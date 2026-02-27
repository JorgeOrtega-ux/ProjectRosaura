// public/assets/js/app-init.js
import { MainController } from './main-controller.js';
import { SpaRouter } from './core/spa-router.js';
import { AuthController } from './auth-controller.js';
import { ProfileController } from './profile-controller.js';
import { AdminUsersController } from './admin-users-controller.js'; // <-- AGREGAR
import { DialogSystem } from './core/dialog-system.js';
import { TooltipSystem } from './core/tooltip-system.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Instanciamos lógica UI base
    const app = new MainController();
    app.init();
    window.appInstance = app; 

    // 2. Instanciamos la lógica de autenticación
    const auth = new AuthController();
    auth.init();
    
    // 3. Instanciamos la lógica del Perfil (Settings)
    const profile = new ProfileController();
    profile.init();

    // NUEVO: Instanciamos la lógica del Admin Users
    const adminUsers = new AdminUsersController(); // <-- AGREGAR

    // 4. Instanciamos el Sistema de Diálogos y lo guardamos global
    window.dialogSystem = new DialogSystem();

    // 5. Instanciamos el Router SPA
    window.spaRouter = new SpaRouter({
        outlet: '#app-router-outlet'
    });

    // 6. Instanciamos e inicializamos el Sistema de Tooltips
    window.tooltipSystem = new TooltipSystem();
    window.tooltipSystem.init();
});