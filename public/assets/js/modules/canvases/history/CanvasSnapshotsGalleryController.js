// public/assets/js/modules/canvases/history/CanvasSnapshotsGalleryController.js

class CanvasSnapshotsGalleryController {
    constructor() {
        this.basePath = window.AppBasePath || '';
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        // La vista de galería ahora es Server-Side Rendered (PHP).
        // Ya no necesitamos hacer peticiones a la API (fetchSnapshots) ni manipular el DOM aquí.
        // Solo inicializamos los eventos básicos de UI.
        this.bindEvents();
    }

    destroy() {
        document.removeEventListener('click', this.handleGlobalClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        // Mantenemos la lógica de retroceso por si agregas un botón con data-action="goBack"
        const goBackBtn = e.target.closest('[data-action="goBack"]');
        if (goBackBtn) {
            e.preventDefault();
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/canvases/manage`);
            } else {
                window.location.href = `${this.basePath}/canvases/manage`;
            }
        }
    }
}

export { CanvasSnapshotsGalleryController };