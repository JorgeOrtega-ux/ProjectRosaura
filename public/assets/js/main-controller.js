/**
 * MainController
 * Clase principal para la gestión de la interfaz y la lógica de la aplicación.
 */
export class MainController {
    constructor() {
        this.dom = {
            header: document.getElementById('main-header'),
            mobileSearchToggleBtn: document.getElementById('mobile-search-toggle')
        };
        
        this.state = {
            isMobileSearchActive: false,
            currentDevice: '' // Guarda el dispositivo actual para evitar logs repetitivos
        };
    }

    /**
     * Inicializa el controlador principal
     */
    init() {
        console.log("MainController inicializado.");
        this.checkDevice(); // Comprobación inicial al cargar la página
        this.bindEvents();
    }

    /**
     * Concentra todos los Listeners de eventos
     */
    bindEvents() {
        // Evento de clic en el botón de búsqueda móvil
        if (this.dom.mobileSearchToggleBtn) {
            this.dom.mobileSearchToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileSearch();
            });
        }

        // Evento global de redimensionamiento de ventana (resize)
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * Maneja la lógica cada vez que la ventana cambia de tamaño
     */
    handleResize() {
        // 1. Limpiar el estado de búsqueda si volvemos a tamaño de PC
        if (window.innerWidth > 768 && this.state.isMobileSearchActive) {
            this.state.isMobileSearchActive = false;
            this.dom.header.classList.remove('header--search-active');
        }

        // 2. Comprobar y reportar el tamaño del dispositivo
        this.checkDevice();
    }

    /**
     * Alterna la visibilidad de la barra de búsqueda en dispositivos móviles
     */
    toggleMobileSearch() {
        if (!this.dom.header) return;

        this.state.isMobileSearchActive = !this.state.isMobileSearchActive;
        this.dom.header.classList.toggle('header--search-active', this.state.isMobileSearchActive);
    }

    /**
     * Detecta el tipo de dispositivo según el ancho de la pantalla y lo imprime en consola
     */
    checkDevice() {
        const width = window.innerWidth;
        let newDevice = '';

        // Definimos los puntos de quiebre (breakpoints)
        if (width <= 768) {
            newDevice = 'Móvil';
        } else if (width > 768 && width <= 1024) {
            newDevice = 'Tablet';
        } else {
            newDevice = 'Escritorio (Desktop)';
        }

        // Solo imprimimos en consola si hubo un cambio real de dispositivo
        if (this.state.currentDevice !== newDevice) {
            this.state.currentDevice = newDevice;
            console.log(`📏 Cambio de resolución. Estás en modo: ${this.state.currentDevice} (${width}px)`);
        }
    }
}