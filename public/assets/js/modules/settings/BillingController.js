// public/assets/js/modules/settings/BillingController.js

import { CardTemplates } from '../../../core/components/CardTemplates.js';

export class BillingController {
    constructor() {
        this.abortController = null;
        this.contentArea = null;
        
        // Regla 1: Binding obligatorio en el constructor inerte
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        
        this.bindEvents();
        
        // Simulación de carga inicial de datos
        this.loadPaymentMethods();
    }

    bindEvents() {
        // Regla 3: Delegación pura global
        document.addEventListener('click', this.handleClickBound);
    }

    handleClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        if (action === 'addNewCard') {
            this.handleAddNewCard();
        }
    }

    async loadPaymentMethods() {
        if (!this.contentArea) return;

        // Por ahora simulamos que el array de tarjetas viene vacío desde la API
        const paymentMethods = []; 

        // Regla 23: Inyección excluyente de Estado Vacío
        if (paymentMethods.length > 0) {
            // Aquí iría el renderizado de la cuadrícula de métodos de pago
            // this.contentArea.innerHTML = `<div class="component-grid">...</div>`;
        } else {
            // Regla 9: Cero wrappers de traducción y CERO fallback de texto duro
            const emptyMsg = window.__('empty_billing_methods');
            this.contentArea.innerHTML = CardTemplates.emptyState(emptyMsg, 'credit_card_off');
        }
    }

    handleAddNewCard() {
        // Aquí se levantará el diálogo usando window.dialogSystem
    }

    destroy() {
        // Regla 4 y 7: Limpieza rigurosa
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
        this.contentArea = null;
    }
}