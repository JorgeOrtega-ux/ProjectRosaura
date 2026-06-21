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
        const route = ApiRoutes.Canvases.GetSnapshotsGallery || 'canvases.get_snapshots_gallery';
        
        try {
            // El API service puede enviar parámetros GET como querystring si le pasamos un objeto en params o directo en la ruta
            const result = await this.api.get(`${route}?uuid=${encodeURIComponent(this.uuid)}`, this.abortController.signal);
            
            if (result.aborted) return;

            if (result.success) {
                this.renderGallery(result.data.canvas_name, result.data.snapshots);
            } else {
                showMessage(result.message, 'error');
                this.showEmptyState();
            }

        } catch (error) {
            if (error.name === 'AbortError') return;
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
            const card = document.createElement('div');
            card.className = 'component-card component-card--snapshot';
            
            // Asumiendo que el worker guarda la imagen en public/assets/img/snapshots_history/
            const imageUrl = snapshot.url.startsWith('/') ? snapshot.url : `/${snapshot.url}`;
            
            // URL Mágica: Enviamos todos los datos al DesignController por GET para ahorrarnos un Fetch en el Backend
            const viewUrl = `${this.basePath}/design?id=${encodeURIComponent(this.uuid)}&snapshot=${snapshot.snapshot_uuid}&img=${encodeURIComponent(imageUrl)}`;

            card.innerHTML = `
                <div class="component-card-image-wrapper">
                    <img src="${imageUrl}" alt="Snapshot ${snapshot.date}" loading="lazy">
                </div>
                <div class="component-card-content">
                    <span class="material-symbols-rounded">history</span>
                    <span class="component-card-date">${snapshot.date}</span>
                </div>
                <div class="component-card-actions" style="padding: 0 16px 16px; display: flex; gap: 8px;">
                    <a href="${viewUrl}" class="component-button component-button--secondary component-button--h34" style="flex: 1; justify-content: center;" data-spa-link>
                        <span class="material-symbols-rounded" style="font-size: 18px;">visibility</span> Ver
                    </a>
                    <a href="${imageUrl}" download="snapshot_${snapshot.date.replace(/[\/\s:]/g, '_')}.png" class="component-button component-button--dark component-button--h34" style="flex: 1; justify-content: center;" target="_blank">
                        <span class="material-symbols-rounded" style="font-size: 18px;">download</span>
                    </a>
                </div>
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