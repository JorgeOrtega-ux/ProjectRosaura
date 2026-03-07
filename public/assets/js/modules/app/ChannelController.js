// public/assets/js/modules/app/ChannelController.js

import { ApiService } from '../../core/api/ApiServices.js';

export class ChannelController {
    constructor() {
        this.api = new ApiService();
        this.init();
    }

    init() {
        console.log("Channel view loaded successfully.");
        this.setupTabsNavigation();
        this.setupSubscriptionButton();
    }

    setupTabsNavigation() {
        const container = document.getElementById('channel-tabs-container');
        if (!container) return;

        // Limpiamos los listeners usando delegación para mayor estabilidad en la SPA
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);

        newContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.component-channel-tab');
            if (!tab) return;

            const allTabs = newContainer.querySelectorAll('.component-channel-tab');
            const sections = document.querySelectorAll('.component-channel-content-section');

            // 1. Limpiar estado activo de todas las pestañas y secciones
            allTabs.forEach(t => t.classList.remove('is-active'));
            sections.forEach(s => s.classList.remove('is-active'));

            // 2. Asignar estado activo a la pestaña clickeada
            tab.classList.add('is-active');

            // 3. Mostrar la sección vinculada mediante el atributo data-target
            const targetId = tab.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.classList.add('is-active');
            }
        });
    }

    setupSubscriptionButton() {
        const subBtn = document.getElementById('btn-channel-subscribe');
        if (!subBtn) return;

        // Remover listeners anteriores (útil en SPA)
        const newBtn = subBtn.cloneNode(true);
        subBtn.parentNode.replaceChild(newBtn, subBtn);

        newBtn.addEventListener('click', async () => {
            const username = newBtn.getAttribute('data-username');
            if (!username) return;

            // Pre-loader visual (opcional)
            const originalText = newBtn.innerText;
            newBtn.innerText = 'Cargando...';
            newBtn.disabled = true;

            const response = await this.api.toggleSubscription(username);
            
            newBtn.disabled = false;

            if (response.success) {
                // Actualizar estado del botón visualmente
                if (response.is_subscribed) {
                    newBtn.innerText = 'Suscrito';
                    newBtn.classList.remove('component-btn-primary');
                    newBtn.classList.add('component-btn-secondary');
                } else {
                    newBtn.innerText = 'Suscribirse';
                    newBtn.classList.remove('component-btn-secondary');
                    newBtn.classList.add('component-btn-primary');
                }

                // Actualizar texto de conteo de suscriptores
                const countDisplay = document.getElementById('channel-subscriber-count');
                if (countDisplay) {
                    let formatted = response.subscriber_count;
                    if (formatted >= 1000000) formatted = (formatted / 1000000).toFixed(1) + 'M';
                    else if (formatted >= 1000) formatted = (formatted / 1000).toFixed(1) + 'K';
                    
                    countDisplay.innerText = `${formatted} suscriptores`;
                }
            } else {
                newBtn.innerText = originalText;
                if (response.message === 'Debes iniciar sesión para suscribirte.') {
                    // Redirigir si no está logeado y usa la App SPA
                    if (window.router) window.router.navigate('/login');
                    else window.location.href = (window.AppBasePath || '') + '/login';
                } else {
                    alert(response.message || 'Error al procesar la solicitud.');
                }
            }
        });
    }
}