// public/assets/js/app-init.js
import { MainController } from './main-controller.js';
import { SpaRouter } from './core/spa-router.js'; // Nueva importación

document.addEventListener('DOMContentLoaded', () => {
    // 1. Instanciamos lógica UI base (eventos, menús emergentes, etc)
    const app = new MainController();
    app.init();
    
    // 2. Instanciamos el Router SPA
    const router = new SpaRouter({
        outlet: '#app-router-outlet'
    });
});