// public/assets/js/modules/canvases/CanvasResizeController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class CanvasResizeController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.isInitialized = false;
        
        this.currentSize = null;
        this.canvasId = null;

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        
        const container = document.getElementById('resizeCanvasContainer');
        if (container) {
            this.currentSize = parseInt(container.getAttribute('data-current-size'));
            this.canvasId = container.getAttribute('data-canvas-id');
        }

        this.bindEvents();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        
        this.currentSize = null;
        this.canvasId = null;
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        const resizeDropdownTrigger = e.target.closest('[data-action="toggleDropdown"]');
        const resizeDropdownItem = e.target.closest('[data-action="selectValue"]');
        const applyBtn = e.target.closest('[data-action="applyResize"]');

        if (resizeDropdownTrigger) {
            const module = document.querySelector(`[data-module="${resizeDropdownTrigger.getAttribute('data-target')}"]`);
            if (module) {
                if (module.classList.contains('disabled')) {
                    module.classList.remove('disabled');
                    module.classList.add('active');
                } else {
                    module.classList.remove('active');
                    module.classList.add('disabled');
                }
            }
        }

        if (resizeDropdownItem) {
            this.handleResizeSelect(resizeDropdownItem);
        }

        if (applyBtn && !applyBtn.classList.contains('disabled-interactive')) {
            this.applyResize(applyBtn);
        }
        
        // Si se hace click fuera, cerrar dropdown activo
        if (!resizeDropdownTrigger && !e.target.closest('.component-menu')) {
            const activeDropdowns = document.querySelectorAll('.component-module--dropdown.active');
            activeDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            });
        }
    }

    handleResizeSelect(btn) {
        const dropdown = document.querySelector('[data-module="dropdownSizeResize"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }

        const value = parseInt(btn.getAttribute('data-value'));
        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');
        
        const textRef = document.querySelector('[data-ref="text-size-resize"]');
        const iconRef = document.querySelector('[data-ref="resize-icon"]');
        
        if (textRef) textRef.textContent = label;
        if (iconRef) iconRef.textContent = icon;
        
        const links = document.querySelectorAll('.component-menu-link');
        links.forEach(l => l.classList.remove('active'));
        btn.classList.add('active');

        // Mostrar u ocultar la advertencia si el tamaño es menor al original
        const warning = document.querySelector('[data-ref="resize-warning"]');
        if (warning && this.currentSize) {
            if (value < this.currentSize) {
                warning.style.display = 'flex';
            } else {
                warning.style.display = 'none';
            }
        }
    }

    async applyResize(btn) {
        if (!this.canvasId) return;
        
        const textRef = document.querySelector('[data-ref="text-size-resize"]');
        if (!textRef) return;
        
        const newSize = parseInt(textRef.textContent.split('x')[0]);
        if (isNaN(newSize)) return;

        if (newSize === this.currentSize) {
            showMessage("El lienzo ya tiene esta resolución aplicada.", "info");
            return;
        }

        setButtonLoading(btn);

        const route = ApiRoutes.Canvases && ApiRoutes.Canvases.Resize ? ApiRoutes.Canvases.Resize : 'canvases.resize';
        const result = await this.api.post(route, { id: this.canvasId, size: newSize }, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message || "Proceso de redimensión completado exitosamente.", 'success');
            setTimeout(() => {
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${this.basePath}/canvases/manage`, { forceReload: true });
                } else {
                    window.location.href = `${this.basePath}/canvases/manage`;
                }
            }, 1000);
        } else {
            showMessage(result.message || "Error al aplicar la expansión", 'error');
        }
    }
}

export { CanvasResizeController };