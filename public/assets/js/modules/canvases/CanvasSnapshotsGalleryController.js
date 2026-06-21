// public/assets/js/modules/canvases/CanvasSnapshotsGalleryController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage } from '../../core/utils/uiUtils.js';

class CanvasSnapshotsGalleryController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.basePath = window.AppBasePath || '';
        this.uuid = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.uuid = this.extractUuidFromUrl();
        this.bindEvents();
        
        if (this.uuid) {
            this.fetchSnapshots();
        } else {
            showMessage('UUID de lienzo no válido.', 'error');
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    extractUuidFromUrl() {
        const pathParts = window.location.pathname.split('/');
        // Obtiene la última parte de la URL asumiendo el formato /design/s/{uuid}
        return pathParts.pop();
    }

    handleGlobalClick(e) {
        const goBackBtn = e.target.closest('[data-action="goBack"]');
        if (goBackBtn) {
            if (window.spaRouter) {
                // Volvemos a manage en lugar de hacer un window.history.back() ciego
                window.spaRouter.navigate(`${this.basePath}/canvases/manage`);
            } else {
                window.location.href = `${this.basePath}/canvases/manage`;
            }
        }
    }

    async fetchSnapshots() {
        // Protección contra ApiRoutes desactualizado o mal importado
        const route = (typeof ApiRoutes !== 'undefined' && ApiRoutes.Canvases && ApiRoutes.Canvases.GetSnapshotsGallery) 
                      ? ApiRoutes.Canvases.GetSnapshotsGallery 
                      : 'canvases.get_snapshots_gallery';
        
        try {
            // El backend de Rosaura maneja todo por POST mapeando la 'route' en el payload
            const result = await this.api.post(route, { uuid: this.uuid }, this.abortController.signal);
            
            if (result.aborted) return;

            if (result.success) {
                this.renderGallery(result.data.canvas_name, result.data.snapshots);
            } else {
                showMessage(result.message || 'Error al obtener la galería.', 'error');
                console.error("Backend Error Response:", result);
                this.showEmptyState();
            }

        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error("Fetch Gallery JavaScript/Network Error:", error);
            showMessage('Ocurrió un error al cargar la galería.', 'error');
            this.showEmptyState();
        }
    }

    renderGallery(canvasName, snapshots) {
        const titleEl = document.querySelector('[data-ref="gallery-title"]');
        const gridEl = document.querySelector('[data-ref="gallery-grid"]');
        
        if (titleEl) {
            titleEl.textContent = `Reinicios: ${canvasName}`;
        }

        if (!gridEl) return;

        gridEl.innerHTML = '';

        if (!snapshots || snapshots.length === 0) {
            this.showEmptyState();
            return;
        }

        const fragment = document.createDocumentFragment();

        snapshots.forEach(snapshot => {
            const card = document.createElement('a');
            card.className = 'snapshot-card';
            card.setAttribute('data-spa-link', 'true'); // Integración con el SpaRouter
            
            // Asumiendo que el worker guarda la imagen en public/assets/img/snapshots_history/
            const imageUrl = snapshot.url.startsWith('/') ? snapshot.url : `/${snapshot.url}`;
            
            // URL de visualización en modo Snapshot
            const viewUrl = `${this.basePath}/design?id=${encodeURIComponent(this.uuid)}&snapshot=${snapshot.snapshot_uuid}&img=${encodeURIComponent(imageUrl)}`;
            
            card.href = viewUrl;

            // Inyectamos las propiedades de fondo para emular home.php
            card.style.backgroundImage = `url('${imageUrl}'), linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)`;
            card.style.backgroundSize = 'cover';
            card.style.backgroundPosition = 'center';
            card.style.backgroundRepeat = 'no-repeat';
            card.style.imageRendering = 'pixelated';

            // HTML Interno modificado para quitar botones e incluir el badge de fecha
            card.innerHTML = `
                <div class="snapshot-badge">
                    <span class="material-symbols-rounded">history</span>
                    ${snapshot.date}
                </div>
                <h3 class="snapshot-card-title">${canvasName}</h3>
            `;
            
            fragment.appendChild(card);
        });

        gridEl.appendChild(fragment);
    }

    showEmptyState() {
        const gridEl = document.querySelector('[data-ref="gallery-grid"]');
        const emptyState = document.querySelector('[data-ref="gallery-empty-state"]');
        
        if (gridEl) gridEl.innerHTML = '';
        if (emptyState) emptyState.classList.remove('disabled');
    }
}

export { CanvasSnapshotsGalleryController };