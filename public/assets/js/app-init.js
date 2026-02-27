// public/assets/js/app-init.js
import { MainController } from './main-controller.js';
import { SpaRouter } from './core/spa-router.js';
import { AuthController } from './auth-controller.js';
import { ProfileController } from './profile-controller.js';
import { AdminUsersController } from './admin-users-controller.js';
import { AdminUserEditController } from './admin-user-edit-controller.js'; 
import { AdminRoleEditController } from './admin-role-edit-controller.js'; // <-- NUEVO
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

    // 4. Instanciamos la lógica del Admin Users
    const adminUsers = new AdminUsersController();

    // 5. Instanciamos el controlador para Edición de Usuario como Admin
    const adminUserEdit = new AdminUserEditController(); 
    adminUserEdit.init();

    // 6. Instanciamos el controlador para Edición de Rol como Admin
    const adminRoleEdit = new AdminRoleEditController(); // <-- NUEVO
    adminRoleEdit.init();

    // 7. Instanciamos el Sistema de Diálogos y lo guardamos global
    window.dialogSystem = new DialogSystem();

    // 8. Instanciamos el Router SPA
    window.spaRouter = new SpaRouter({
        outlet: '#app-router-outlet'
    });

    // 9. Instanciamos e inicializamos el Sistema de Tooltips
    window.tooltipSystem = new TooltipSystem();
    window.tooltipSystem.init();
});