// public/assets/js/modules/canvases/CanvasesController.js

export class CanvasesController {
    constructor() {
        this.name = "CanvasesController";
    }

    async init() {
        console.log(`${this.name} initialized`);
        // Lógica de inicio y listeners para las pantallas de lienzos...
    }

    destroy() {
        console.log(`${this.name} destroyed`);
        // Limpieza de eventos...
    }
}