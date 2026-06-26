// public/assets/js/modules/app/SearchController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { CardTemplates } from '../../core/components/CardTemplates.js';
import { CanvasCardInteractions } from '../../core/components/CanvasCardInteractions.js';

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

            // ---------------------------------------------------------
            // LOG 1: Verificamos qué vamos a mandar a PHP
            // ---------------------------------------------------------
            console.log("🔍 [SearchController] Iniciando búsqueda para:", query);
            console.log("📨 [SearchController] Payload que se enviará a PHP:", { route: ApiRoutes.Search.Query, q: query });

            // CORRECCIÓN: Petición POST con el payload en formato JSON 
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

            // ---------------------------------------------------------
            // LOG 2: Revisamos si el servidor respondió con error 500 o 404
            // ---------------------------------------------------------
            console.log("📡 [SearchController] Status de respuesta HTTP:", response.status, response.ok ? "(OK)" : "(Error)");

            const resData = await response.json();

            // ---------------------------------------------------------
            // LOG 3: EL LOG MÁS IMPORTANTE. ¿Qué trajo PHP?
            // ---------------------------------------------------------
            console.log("📥 [SearchController] Respuesta CRUDA desde PHP:", resData);

            if (resData && resData.success) {
                const results = resData.data || [];
                const count = results.length;
                
                // ---------------------------------------------------------
                // LOG 4: Conteo final que detectó el frontend
                // ---------------------------------------------------------
                console.log(`✅ [SearchController] Resultados procesados: ${count}`, results);

                if (this.title) {
                    this.title.textContent = `Resultados encontrados: ${count} para "${query}"`;
                }

                if (this.grid) {
                    this.grid.innerHTML = '';
                    
                    if (count === 0) {
                        console.warn("⚠️ [SearchController] El array 'data' llegó vacío desde PHP.");
                        this.grid.innerHTML = '<p class="component-empty-msg" style="padding: 20px;">No se encontraron lienzos que coincidan con tu búsqueda.</p>';
                    } else {
                        results.forEach(canvas => {
                            const cardHTML = typeof CardTemplates.generateCanvasCard === 'function' 
                                           ? CardTemplates.generateCanvasCard(canvas) 
                                           : this.buildFallbackCard(canvas);
                                           
                            this.grid.insertAdjacentHTML('beforeend', cardHTML);
                        });
                        
                        if (typeof CanvasCardInteractions !== 'undefined' && CanvasCardInteractions.init) {
                            CanvasCardInteractions.init();
                        }
                    }
                }
            } else {
                // ---------------------------------------------------------
                // LOG 5: PHP devolvió un success = false 
                // ---------------------------------------------------------
                console.error("❌ [SearchController] PHP devolvió success: false o una estructura inválida:", resData);
                if (this.title) this.title.textContent = 'Error interno en la búsqueda.';
            }
        } catch (e) {
            // ---------------------------------------------------------
            // LOG 6: La petición falló por completo (el JSON está roto o no hay red)
            // ---------------------------------------------------------
            console.error("🔥 [SearchController] Excepción catastrófica en fetch():", e);
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
    }
}