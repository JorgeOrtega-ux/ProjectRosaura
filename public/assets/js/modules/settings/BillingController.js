// public/assets/js/modules/settings/BillingController.js

export class BillingController {
    constructor() {
        this.name = 'BillingController';
        this.container = null;
    }

    async init() {
        this.container = document.querySelector('.view-content');
        this.bindEvents();
    }

    bindEvents() {
        if (!this.container) return;
        
        // Delegación de eventos con data-attributes (Golden Rule aplicada)
        this.container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            const action = btn.dataset.action;
            if (action === 'addNewCard') {
                this.handleAddNewCard();
            }
        });
    }

    handleAddNewCard() {
        console.log('Action triggered: addNewCard - Aquí se debe abrir el modal o formulario');
    }

    destroy() {
        // Limpieza del controlador
        this.container = null;
    }
}