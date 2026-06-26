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

            console.log("🔍 [SearchController] Iniciando búsqueda para:", query);
            console.log("📨 [SearchController] Payload que se enviará a PHP:", { route: ApiRoutes.Search.Query, q: query });

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

            console.log("📡 [SearchController] Status de respuesta HTTP:", response.status, response.ok ? "(OK)" : "(Error)");

            // MODIFICACIÓN: Prevenir que la app crashee silenciosamente si PHP arroja HTML puro en vez de JSON
            let resData;
            try {
                resData = await response.json();
            } catch (jsonErr) {
                const rawText = await response.text();
                console.error("💥 [SearchController] EL SERVIDOR NO DEVOLVIÓ JSON. RESPUESTA CRUDA:", rawText);
                if (this.title) this.title.textContent = 'Error crítico del servidor. Revisa la consola.';
                return;
            }

            console.log("📥 [SearchController] Respuesta CRUDA desde PHP:", resData);

            if (resData && resData.success) {
                const results = resData.data || [];
                const count = results.length;
                
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
                console.error("❌ [SearchController] PHP devolvió error lógico o excepción:");
                
                // MODIFICACIÓN: Interceptar y mostrar los datos de depuración (debug) inyectados desde PHP
                if (resData && resData.debug_message) {
                    console.error("🚨 [ERROR REAL DEL SERVIDOR]:", resData.debug_message);
                    console.error("📁 [UBICACIÓN DEL ERROR]:", resData.debug_file, "en la línea", resData.debug_line);
                } else {
                    console.error(resData);
                }

                if (this.title) this.title.textContent = 'Fallo en la búsqueda. Revisa la consola de desarrollador.';
            }
        } catch (e) {
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