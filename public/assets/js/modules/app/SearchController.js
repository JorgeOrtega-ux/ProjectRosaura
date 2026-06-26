// public/assets/js/modules/app/SearchController.js

import { ApiRoutes } from '../core/api/ApiRoutes.js';
import { CardTemplates } from '../core/components/CardTemplates.js';
import { CanvasCardInteractions } from '../core/components/CanvasCardInteractions.js';

export class SearchController {
    constructor() {
        this.grid = document.querySelector('[data-ref="home-all-canvases"]');
        this.title = document.querySelector('[data-ref="search-title"]');
    }

    async init() {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q') || '';
        
        if (!query.trim()) {
            if (this.title) this.title.textContent = 'Por favor, ingresa un término de búsqueda.';
            return;
        }

        if (this.title) this.title.textContent = `Buscando resultados para "${query}"...`;
        
        try {
            const reqUrl = (window.AppBasePath || '') + '/api/index.php';
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

            const response = await fetch(`${reqUrl}?route=${ApiRoutes.Search.Query}&q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                }
            });

            const resData = await response.json();

            if (resData && resData.success) {
                const results = resData.data || [];
                const count = results.length;
                
                if (this.title) {
                    this.title.textContent = `Resultados encontrados: ${count} para "${query}"`;
                }

                if (this.grid) {
                    this.grid.innerHTML = '';
                    
                    if (count === 0) {
                        this.grid.innerHTML = '<p class="component-empty-msg" style="padding: 20px;">No se encontraron lienzos que coincidan con tu búsqueda.</p>';
                    } else {
                        results.forEach(canvas => {
                            const cardHTML = typeof CardTemplates.generateCanvasCard === 'function' 
                                           ? CardTemplates.generateCanvasCard(canvas) 
                                           : this.buildFallbackCard(canvas);
                                           
                            this.grid.insertAdjacentHTML('beforeend', cardHTML);
                        });
                        
                        // Reconecta los menús desplegables de acciones y botones de favoritos
                        if (typeof CanvasCardInteractions !== 'undefined' && CanvasCardInteractions.init) {
                            CanvasCardInteractions.init();
                        }
                    }
                }
            } else {
                if (this.title) this.title.textContent = 'Error interno en la búsqueda.';
            }
        } catch (e) {
            // El silencio de excepciones de red es intencional por reglas de seguridad de UI.
            if (this.title) this.title.textContent = 'Hubo un problema al procesar la búsqueda.';
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
        // En caso de que se necesite limpiar un intervalo o listener aislado más adelante.
    }
}