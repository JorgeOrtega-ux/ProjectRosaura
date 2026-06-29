// public/assets/js/modules/canvases/history/CanvasSnapshotsGalleryController.js

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
        
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.uuid = this.extractUuidFromUrl();
        this.bindEvents();
        
        if (this.uuid) {
            this.fetchSnapshots();
        } else {
            showMessage(typeof window.__ === 'function' ? window.__('err_invalid_uuid') : 'UUID Inválido', 'error');
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
                showMessage(result.message || (typeof window.__ === 'function' ? window.__('err_gallery_fetch') : 'Error'), 'error');
                this.showEmptyState();
            }

        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(typeof window.__ === 'function' ? window.__('err_gallery_load') : 'Error al cargar la galería', 'error');
            this.showEmptyState();
        }
    }

    renderGallery(canvasName, snapshots) {
        const titleEl = document.querySelector('[data-ref="gallery-title"]');
        if (titleEl) {
            titleEl.textContent = (typeof window.__ === 'function' ? window.__('lbl_resets_title') : 'Reinicios') + ': ' + canvasName;
        }

        if (!this.contentArea) return;

        if (!snapshots || snapshots.length === 0) {
            this.showEmptyState();
            return;
        }

        let cardsHtml = '';
        snapshots.forEach(snapshot => {
            cardsHtml += CardTemplates.snapshotCard(snapshot, {
                canvasName: canvasName,
                basePath: this.basePath
            });
        });

        this.contentArea.innerHTML = `<div class="component-grid" data-ref="gallery-grid">${cardsHtml}</div>`;
    }

    showEmptyState() {
        if (!this.contentArea) return;
        const msg = window.__ ? window.__('empty_snapshots_gallery') : 'Aún no hay reinicios registrados para este lienzo.';
        this.contentArea.innerHTML = CardTemplates.emptyState(msg, 'collections');
    }
}

export { CanvasSnapshotsGalleryController };