// public/assets/js/modules/canvases/CanvasSnapshotsGalleryController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';

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
        return pathParts.pop();
    }

    handleGlobalClick(e) {
        const goBackBtn = e.target.closest('[data-action="goBack"]');
        if (goBackBtn) {
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/canvases/manage`);
            } else {
                window.location.href = `${this.basePath}/canvases/manage`;
            }
        }
    }

    async fetchSnapshots() {
        const route = (typeof ApiRoutes !== 'undefined' && ApiRoutes.Canvases && ApiRoutes.Canvases.GetSnapshotsGallery) 
                      ? ApiRoutes.Canvases.GetSnapshotsGallery 
                      : 'canvases.get_snapshots_gallery';
        
        try {
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
            const tempDiv = document.createElement('div');
            // Usamos la fábrica central para crear el HTML
            tempDiv.innerHTML = CardTemplates.snapshotCard(snapshot, {
                canvasName: canvasName,
                basePath: this.basePath
            });
            
            // Extraemos solo el hijo (el div real de la tarjeta) y lo agregamos al fragmento
            if (tempDiv.firstElementChild) {
                fragment.appendChild(tempDiv.firstElementChild);
            }
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