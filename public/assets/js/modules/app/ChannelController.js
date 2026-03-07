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
        const tabs = document.querySelectorAll('.component-channel-tab');
        const sections = document.querySelectorAll('.component-channel-content-section');

        if (!tabs.length || !sections.length) return;

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 1. Limpiar estado activo de todas las pestañas y secciones
                tabs.forEach(t => t.classList.remove('is-active'));
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
        });
    }
}