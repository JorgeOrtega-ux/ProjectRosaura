// public/assets/js/AppInit.js
import { MainController } from './MainController.js';
import { SpaRouter } from './core/router/SpaRouter.js';
import { AuthController } from './modules/auth/AuthController.js';
import { ProfileController } from './modules/settings/ProfileController.js';
import { AdminUsersController } from './modules/admin/users/AdminUsersController.js';
import { AdminUserEditController } from './modules/admin/users/AdminUserEditController.js'; 
import { AdminRoleEditController } from './modules/admin/users/AdminRoleEditController.js';
import { AdminStatusEditController } from './modules/admin/users/AdminStatusEditController.js';
import { AdminServerConfigController } from './modules/admin/server/AdminServerConfigController.js';
import { AdminBackupsController } from './modules/admin/backups/AdminBackupsController.js';
import { AdminBackupsAutomationController } from './modules/admin/backups/AdminBackupsAutomationController.js';
import { DialogSystem } from './core/components/DialogSystem.js';
import { TooltipSystem } from './core/components/TooltipSystem.js';
import { CalendarSystem } from './core/components/CalendarSystem.js';

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

    // 5. Instanciamos controladores de Edición como Admin
    const adminUserEdit = new AdminUserEditController(); 
    adminUserEdit.init();

    const adminRoleEdit = new AdminRoleEditController(); 
    adminRoleEdit.init();

    const adminStatusEdit = new AdminStatusEditController();
    adminStatusEdit.init();

    const adminServerConfig = new AdminServerConfigController();
    adminServerConfig.init();

    const adminBackups = new AdminBackupsController(); 

    // 6. Instanciamos el controlador de Automatización de Backups
    const adminBackupsAuto = new AdminBackupsAutomationController();
    adminBackupsAuto.init();

    // 7. Instanciamos el Sistema de Diálogos y lo guardamos global
    window.dialogSystem = new DialogSystem();

    // 8. Instanciamos e inicializamos el Sistema de Calendario Global
    window.calendarSystem = new CalendarSystem();
    window.calendarSystem.init();

    // 9. Instanciamos el Router SPA
    window.spaRouter = new SpaRouter({
        outlet: '#app-router-outlet'
    });

    // 10. Instanciamos e inicializamos el Sistema de Tooltips
    window.tooltipSystem = new TooltipSystem();
    window.tooltipSystem.init();
});