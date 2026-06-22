// public/assets/js/modules/app/HomeController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class HomeController {
    constructor() {
        this.container = document.getElementById('home-public-canvases');
        // Instanciamos la clase correctamente (en singular, como se exporta)
        this.apiService = new ApiService();
    }

    async init() {
        if (!this.container) return;
        await this.loadPublicCanvases();
    }

    async loadPublicCanvases() {
        try {
            // Usamos el método post() de tu ApiService, ya que el backend rutea por payload ({ route: ... })
            const response = await this.apiService.post(ApiRoutes.Canvases.GetPublic, { limit: 20 });
            
            if (response && response.success) {
                this.renderCanvases(response.data);
            } else {
                this.renderEmptyState('No se pudieron cargar los lienzos públicos.');
            }
        } catch (error) {
            console.error('Error loading public canvases:', error);
            this.renderEmptyState('Error de conexión al cargar los lienzos.');
        }
    }

    renderCanvases(canvases) {
        if (!canvases || canvases.length === 0) {
            this.renderEmptyState('No hay lienzos públicos disponibles por el momento.');
            return;
        }

        // Generar HTML y reemplazar los skeleton loaders
        const html = canvases.map(canvas => this.createCardHTML(canvas)).join('');
        this.container.innerHTML = html;

        // Reinicializar los plugins / event listeners de UI de la app para los elementos inyectados
        this.reinitializeUI();
    }

    renderEmptyState(message) {
        this.container.innerHTML = `<p style="color: #666; width: 100%; grid-column: 1 / -1;">${message}</p>`;
    }

    createCardHTML(canvas) {
        // Función auxiliar para escapar texto (prevención XSS básica)
        const escapeHTML = (str) => {
            if (!str) return '';
            const p = document.createElement('p');
            p.textContent = str;
            return p.innerHTML;
        };

        const name = escapeHTML(canvas.name);
        const uuid = escapeHTML(canvas.uuid);
        
        // Bloque de imagen
        const imgHtml = canvas.snapshot_url 
            ? `<img src="${canvas.snapshot_url}" alt="${name}" class="component-snapshot-card__image">` 
            : ``;

        // Botón de acción condicional en el dropdown (basado en lógica de negocio devuelta por API)
        const actionButtonHtml = canvas.is_owner 
            ? `<button type="button" class="component-menu-link component-text-notice--error" data-action="deleteCanvas" data-id="${canvas.id}" data-uuid="${uuid}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                    <div class="component-menu-link-text"><span>Eliminar lienzo</span></div>
               </button>`
            : `<button type="button" class="component-menu-link component-text-notice--error" data-action="leaveCanvas" data-id="${canvas.id}" data-uuid="${uuid}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">logout</span></div>
                    <div class="component-menu-link-text"><span>Salir del lienzo</span></div>
               </button>`;

        return `
            <div class="component-snapshot-card" data-card-id="${canvas.id}">
                ${imgHtml}

                <div data-nav="/design/${uuid}" class="component-snapshot-link" style="cursor: pointer;">
                    <h3 class="component-snapshot-title">${name}</h3>
                </div>

                <div class="component-snapshot-actions-wrapper component-dropdown-wrapper">
                    <div class="component-snapshot-actions">
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleModule" data-target="snapshot-menu-${canvas.id}">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                    </div>
                    
                    <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed disabled" data-module="snapshot-menu-${canvas.id}">
                        <div class="component-menu component-menu--w265">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            
                            <div class="component-menu-list">
                                <button type="button" class="component-menu-link" data-action="openCanvasNewTab" data-uuid="${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">open_in_new</span></div>
                                    <div class="component-menu-link-text"><span>Abrir en una pestaña nueva</span></div>
                                </button>

                                <button type="button" class="component-menu-link" data-action="copyCanvasLink" data-uuid="${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">content_copy</span></div>
                                    <div class="component-menu-link-text"><span>Copiar el enlace</span></div>
                                </button>
                                
                                <button type="button" class="component-menu-link" data-action="viewCanvasSnapshots" data-uuid="${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">collections</span></div>
                                    <div class="component-menu-link-text"><span>Ver galería de reinicios</span></div>
                                </button>

                                <div class="component-menu-divider"></div>

                                ${actionButtonHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    reinitializeUI() {
        // En SPA, cuando inyectamos HTML, necesitamos re-enganchar eventos globales como dropdowns, modales, etc.
        // Asumiendo que tu proyecto usa un sistema centralizado en window.app o se maneja por delegación de eventos.
        
        if (window.app && typeof window.app.initModules === 'function') {
            window.app.initModules(this.container);
        } else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') {
            window.uiUtils.initDropdowns(this.container);
        }

        // También forzamos la actualización de enlaces del router SPA
        if (window.router && typeof window.router.bindLinks === 'function') {
            window.router.bindLinks(this.container);
        }
    }
}