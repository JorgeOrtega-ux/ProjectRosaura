// public/assets/js/modules/admin/users/AdminUserHistoryController.js
class AdminUserHistoryController {
    constructor() {
        this.basePath = window.AppBasePath || '';
    }

    init() {
        // En esta vista el servidor entrega la tabla completa ya hidratada.
        // El controlador solo se inicializa como dummy protocol para el router.
    }

    destroy() {
        // Nada que destruir en cliente
    }
}

export { AdminUserHistoryController };