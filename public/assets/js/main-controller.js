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
        
        this.config = {
            closeOnEsc: true,           
            allowMultipleModules: false 
        };

        this.state = {
            isMobileSearchActive: false,
            currentDevice: '' 
        };

        this.dragState = {
            startY: 0,
            currentY: 0,
            currentDiff: 0,
            isDragging: false,
            panel: null,
            module: null
        };
    }

    get isMobile() {
        return window.innerWidth <= 768;
    }

    init() {
        console.log("MainController inicializado.");
        this.checkDevice(); 
        this.bindEvents();
        this.initBottomSheets(); 
    }

    bindEvents() {
        if (this.dom.mobileSearchToggleBtn) {
            this.dom.mobileSearchToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileSearch();
            });
        }

        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Manejador centralizado de clics
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            
            // 1. Clic en botón de acción (abrir menús)
            if (btn) {
                const action = btn.getAttribute('data-action');
                if (action === 'toggleModuleSurface') {
                    this.toggleModule('moduleSurface');
                } else if (action === 'toggleModuleMainOptions') {
                    this.toggleModule('moduleMainOptions');
                }
                return;
            }

            // 2. Clic fuera de los módulos (Evaluamos contra la "caja blanca" .component-menu)
            const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
            activeModules.forEach(module => {
                // Previene que soltar el dedo durante un drag cierre el menú por error
                if (this.dragState.isDragging) return;

                const panels = module.querySelectorAll('.component-menu');
                let clickedInsidePanel = false;

                panels.forEach(panel => {
                    if (panel.contains(e.target)) {
                        clickedInsidePanel = true;
                    }
                });

                // Si cliquearon el módulo (ej. el fondo oscuro) pero NO la caja blanca interior
                if (panels.length > 0 && !clickedInsidePanel) {
                    this.closeModule(module);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.config.closeOnEsc) {
                this.closeAllModules();
            }
        });
    }

    initBottomSheets() {
        const modules = document.querySelectorAll('.component-module--dropdown');

        modules.forEach(module => {
            const panels = module.querySelectorAll('.component-menu');
            if (panels.length === 0) return;

            panels.forEach(panel => {
                const dragHandle = panel.querySelector('.pill-container');

                if (dragHandle) {
                    dragHandle.addEventListener('pointerdown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleDragStart(e, module, panel);
                    });
                }

                panel.addEventListener('pointermove', (e) => this.handleDragMove(e));
                panel.addEventListener('pointerup', (e) => this.handleDragEnd(e));
                panel.addEventListener('pointercancel', (e) => this.handleDragEnd(e));
            });
        });
    }

    handleDragStart(e, module, panel) {
        if (!this.isMobile) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return; 

        panel.setPointerCapture(e.pointerId);

        this.dragState.isDragging = true;
        this.dragState.startY = e.clientY;
        this.dragState.module = module;
        this.dragState.panel = panel;
        module.classList.add('is-dragging');
    }

    handleDragMove(e) {
        if (!this.dragState.isDragging) return;
        if (e.cancelable) e.preventDefault();

        const diff = e.clientY - this.dragState.startY;

        if (diff > 0) {
            this.dragState.panel.style.transform = `translateY(${diff}px)`;
            this.dragState.currentDiff = diff;
        }
    }

    handleDragEnd(e) {
        if (!this.dragState.isDragging) return;

        this.dragState.isDragging = false;
        this.dragState.module.classList.remove('is-dragging'); 

        if (this.dragState.panel.hasPointerCapture(e.pointerId)) {
            this.dragState.panel.releasePointerCapture(e.pointerId);
        }

        const panelHeight = this.dragState.panel.offsetHeight;
        const threshold = panelHeight * 0.40; 

        // Evaluamos si el arrastre superó el límite (40%) para cerrarlo
        if (this.dragState.currentDiff > threshold) {
            this.closeModule(this.dragState.module); 
        } else {
            // Rebota a su estado original y eliminamos el atributo style por completo
            this.dragState.panel.removeAttribute('style');
        }

        // Reseteamos estados
        this.dragState.currentDiff = 0;
        this.dragState.module = null;
        this.dragState.panel = null;
    }

    toggleModule(moduleName) {
        const moduleEl = document.querySelector(`[data-module="${moduleName}"]`);
        if (!moduleEl) return;

        const isCurrentlyActive = !moduleEl.classList.contains('disabled');

        if (!this.config.allowMultipleModules && !isCurrentlyActive) {
            this.closeAllModules();
        }

        if (isCurrentlyActive) {
            this.closeModule(moduleEl);
        } else {
            this.openModule(moduleEl);
        }
    }

    openModule(module) {
        module.classList.remove('disabled');
        module.classList.add('active');
    }

    closeModule(module) {
        module.classList.remove('active');
        module.classList.add('disabled');
        
        // Limpiamos los atributos style por si el cierre fue provocado por el drag&drop o clic fuera
        const panels = module.querySelectorAll('.component-menu');
        panels.forEach(panel => {
            panel.removeAttribute('style');
        });
    }

    closeAllModules() {
        const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
        activeModules.forEach(module => this.closeModule(module));
    }

    handleResize() {
        if (window.innerWidth > 768 && this.state.isMobileSearchActive) {
            this.state.isMobileSearchActive = false;
            this.dom.header.classList.remove('header--search-active');
        }

        // Si regresamos a PC y algo se quedó en medio del drag, lo reseteamos
        if (!this.isMobile) {
            const draggingModules = document.querySelectorAll('.is-dragging');
            draggingModules.forEach(m => {
                m.classList.remove('is-dragging');
                const p = m.querySelector('.component-menu');
                if (p) p.removeAttribute('style');
            });
            this.dragState.isDragging = false;
        }

        this.checkDevice();
    }

    toggleMobileSearch() {
        if (!this.dom.header) return;
        this.state.isMobileSearchActive = !this.state.isMobileSearchActive;
        this.dom.header.classList.toggle('header--search-active', this.state.isMobileSearchActive);
    }

    checkDevice() {
        const width = window.innerWidth;
        let newDevice = '';

        if (width <= 768) {
            newDevice = 'Móvil';
        } else if (width > 768 && width <= 1024) {
            newDevice = 'Tablet';
        } else {
            newDevice = 'Escritorio (Desktop)';
        }

        if (this.state.currentDevice !== newDevice) {
            this.state.currentDevice = newDevice;
            console.log(`📏 Cambio de resolución. Estás en modo: ${this.state.currentDevice} (${width}px)`);
        }
    }
}