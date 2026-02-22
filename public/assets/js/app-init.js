import { MainController } from './main-controller.js';

// Esperamos a que el HTML esté completamente cargado y parseado
document.addEventListener('DOMContentLoaded', () => {
    // Instanciamos el controlador
    const app = new MainController();
    
    // Arrancamos la aplicación
    app.init();
});