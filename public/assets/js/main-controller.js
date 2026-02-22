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
        
        // Configuraciones de comportamiento de los módulos
        this.config = {
            closeOnEsc: true,           // Cambiar a false si NO quieres que se cierren con la tecla ESC
            allowMultipleModules: false // Cambiar a true si quieres permitir más de un módulo abierto a la vez
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

        // Evento global para clics (Maneja los botones de acción y los clics fuera de los módulos)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            
            // 1. Si el clic se hizo en un botón de acción
            if (btn) {
                const action = btn.getAttribute('data-action');
                if (action === 'toggleModuleSurface') {
                    this.toggleModule('moduleSurface');
                } else if (action === 'toggleModuleMainOptions') {
                    this.toggleModule('moduleMainOptions');
                }
                return; // Detenemos la ejecución aquí para no cerrar los módulos
            }

            // 2. Si el clic NO fue en un botón, comprobamos si fue FUERA de un módulo activo
            const isClickInsideModule = e.target.closest('[data-module]');
            if (!isClickInsideModule) {
                this.closeAllModules();
            }
        });

        // Evento global de teclado para detectar la tecla "Escape"
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.config.closeOnEsc) {
                this.closeAllModules();
            }
        });
    }

    /**
     * Alterna la visibilidad (clases disabled y active) de un módulo en específico
     */
    toggleModule(moduleName) {
        const moduleEl = document.querySelector(`[data-module="${moduleName}"]`);
        if (!moduleEl) return;

        const isCurrentlyActive = moduleEl.classList.contains('active');

        // Si NO se permite más de un módulo activo y estamos a punto de ABRIR uno nuevo, cerramos el resto
        if (!this.config.allowMultipleModules && !isCurrentlyActive) {
            this.closeAllModules();
        }

        // Alternamos el estado del módulo solicitado
        moduleEl.classList.toggle('disabled');
        moduleEl.classList.toggle('active');
    }

    /**
     * Cierra todos los módulos que estén activos en pantalla
     */
    closeAllModules() {
        const activeModules = document.querySelectorAll('[data-module].active');
        activeModules.forEach(moduleEl => {
            moduleEl.classList.remove('active');
            moduleEl.classList.add('disabled');
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