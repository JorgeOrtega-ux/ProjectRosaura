// public/assets/js/app-init.js
import { MainController } from './main-controller.js';
import { SpaRouter } from './core/spa-router.js';
import { AuthController } from './auth-controller.js';
import { ProfileController } from './profile-controller.js';
import { AdminUsersController } from './admin-users-controller.js';
import { AdminUserEditController } from './admin-user-edit-controller.js'; 
import { AdminRoleEditController } from './admin-role-edit-controller.js';
import { AdminStatusEditController } from './admin-status-edit-controller.js';
import { AdminServerConfigController } from './admin-server-config-controller.js';
import { AdminBackupsController } from './admin-backups-controller.js';
import { AdminBackupsAutomationController } from './admin-backups-automation-controller.js';
import { DialogSystem } from './core/dialog-system.js';
import { TooltipSystem } from './core/tooltip-system.js';
import { CalendarSystem } from './core/calendar-system.js';

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