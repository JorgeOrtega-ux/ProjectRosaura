// public/assets/js/modules/canvases/history/CanvasSnapshotsGalleryController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { renderSkeleton } from '../../../core/utils/uiUtils.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';

class CanvasSnapshotsGalleryController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.contentArea = null;
        this.titleEl = null;
    }

    init() {
        this.abortController = new AbortController();
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        this.titleEl = document.querySelector('[data-ref="gallery-title"]');

        if (this.contentArea) {
            this.contentArea.innerHTML = '<div class="component-grid" data-ref="gallery-grid"></div>';
            renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
        }

        this.loadGallery();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    getCanvasUuid() {
        let path = window.location.pathname;
        if (this.basePath && path.startsWith(this.basePath)) {
            path = path.slice(this.basePath.length);
        }
        const match = path.match(/^\/design\/s\/([a-zA-Z0-9\-]+)/);
        return match ? match[1] : null;
    }

    async loadGallery() {
        const uuid = this.getCanvasUuid();

        if (!uuid) {
            if (this.titleEl) {
                this.titleEl.textContent = window.__ ? window.__('snapshots_gallery_title_error') : 'Galería no disponible';
            }
            if (this.contentArea) {
                this.contentArea.innerHTML = CardTemplates.emptyState(
                    window.__ ? window.__('err_canvas_uuid_missing') : 'Falta el identificador del lienzo en la solicitud.',
                    'error'
                );
            }
            return;
        }

        const result = await this.api.post(
            ApiRoutes.Canvases.GetSnapshotsGallery,
            { uuid },
            this.abortController.signal
        );

        if (this.abortController.signal.aborted) return;

        if (!result || !result.success) {
            if (this.titleEl) {
                this.titleEl.textContent = window.__ ? window.__('snapshots_gallery_title_error') : 'Galería no disponible';
            }
            if (this.contentArea) {
                const msg = result?.message || (window.__ ? window.__('err_load_snapshots') : 'Error al cargar la galería.');
                this.contentArea.innerHTML = CardTemplates.emptyState(msg, 'error');
            }
            return;
        }

        const canvasName = result.data?.canvas_name || (window.__ ? window.__('default_canvas_name') : 'Lienzo');
        const snapshots = result.data?.snapshots || [];

        if (this.titleEl) {
            const titleTemplate = window.__ ? window.__('snapshots_gallery_title') : 'Galería de {name}';
            this.titleEl.textContent = titleTemplate.replace('{name}', canvasName);
        }

        if (snapshots.length > 0) {
            this.renderSnapshots(snapshots, canvasName);
        } else if (this.contentArea) {
            const msgEmpty = window.__ ? window.__('empty_snapshots_gallery') : 'No hay capturas disponibles para este lienzo todavía.';
            this.contentArea.innerHTML = CardTemplates.emptyState(msgEmpty, 'search_off');
        }

        this.reinitializeUI();
    }

    renderSnapshots(snapshots, canvasName) {
        if (!this.contentArea) return;

        const cardsHtml = snapshots.map(snapshot =>
            CardTemplates.snapshotCard(snapshot, { basePath: this.basePath, canvasName })
        ).join('');

        this.contentArea.innerHTML = `<div class="component-grid" data-ref="gallery-grid">${cardsHtml}</div>`;
    }

    reinitializeUI() {
        if (!this.contentArea) return;

        const grid = this.contentArea.querySelector('.component-grid');
        if (!grid) return;

        if (window.app && typeof window.app.initModules === 'function') {
            window.app.initModules(grid);
        } else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') {
            window.uiUtils.initDropdowns(grid);
        }

        if (window.spaRouter && typeof window.spaRouter.bindLinks === 'function') {
            window.spaRouter.bindLinks(grid);
        } else if (window.router && typeof window.router.bindLinks === 'function') {
            window.router.bindLinks(grid);
        }
    }
}

export { CanvasSnapshotsGalleryController };
