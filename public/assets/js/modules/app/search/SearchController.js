// public/assets/js/modules/app/search/SearchController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';

export class SearchController {
    constructor() {
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        this.title = document.querySelector('[data-ref="search-title"]');
    }

    async init() {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q') || '';
        
        if (!query.trim()) {
            if (this.title) this.title.textContent = 'Por favor, ingresa un término de búsqueda.';
            if (this.contentArea) {
                this.contentArea.innerHTML = CardTemplates.emptyState('No se ha proporcionado ningún término de búsqueda.', 'search_off');
            }
            return;
        }

        if (this.title) this.title.textContent = `Buscando resultados para "${query}"...`;
        
        try {
            const reqUrl = (window.AppBasePath || '') + '/api/index.php';
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

            const response = await fetch(reqUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    route: ApiRoutes.Search.Query,
                    q: query
                })
            });

            let resData;
            try {
                resData = await response.json();
            } catch (jsonErr) {
                if (this.title) this.title.textContent = 'Error crítico del servidor. Revisa la consola.';
                if (this.contentArea) {
                    this.contentArea.innerHTML = CardTemplates.emptyState('Error de respuesta del servidor.', 'error');
                }
                return;
            }

            if (resData && resData.success) {
                const results = resData.data || [];
                const count = results.length;
                
                if (this.title) {
                    this.title.textContent = `Resultados encontrados: ${count} para "${query}"`;
                }

                if (this.contentArea) {
                    if (count === 0) {
                        this.contentArea.innerHTML = CardTemplates.emptyState('No se encontraron lienzos que coincidan con tu búsqueda.', 'search_off');
                    } else {
                        let cardsHtml = '';
                        results.forEach(canvas => {
                            cardsHtml += typeof CardTemplates.generateCanvasCard === 'function' 
                                           ? CardTemplates.generateCanvasCard(canvas) 
                                           : this.buildFallbackCard(canvas);
                        });
                        
                        this.contentArea.innerHTML = `<div class="component-grid" data-ref="home-all-canvases">${cardsHtml}</div>`;
                        
                        if (typeof CanvasCardInteractions !== 'undefined' && CanvasCardInteractions.init) {
                            CanvasCardInteractions.init();
                        }
                    }
                }
            } else {
                if (this.title) this.title.textContent = 'Fallo en la búsqueda.';
                if (this.contentArea) {
                    this.contentArea.innerHTML = CardTemplates.emptyState('Ocurrió un problema procesando la búsqueda.', 'error');
                }
            }
        } catch (e) {
            if (this.title) this.title.textContent = 'Hubo un problema al procesar la búsqueda.';
            if (this.contentArea) {
                this.contentArea.innerHTML = CardTemplates.emptyState('Error de red o conexión al buscar.', 'wifi_off');
            }
        }
    }

    buildFallbackCard(canvas) {
        return `<div class="component-snapshot-card" data-card-id="${canvas.id}">
                    <div data-nav="${window.APP_URL || ''}/design/${canvas.uuid}" class="component-snapshot-link" style="cursor: pointer;">
                        <h3 class="component-snapshot-title">${canvas.name}</h3>
                    </div>
                </div>`;
    }

    destroy() {
    }
}