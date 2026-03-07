// public/assets/js/modules/app/ChannelController.js

export class ChannelController {
    constructor() {
        this.init();
    }

    init() {
        console.log("Channel view loaded successfully.");
        this.setupTabsNavigation();
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
}