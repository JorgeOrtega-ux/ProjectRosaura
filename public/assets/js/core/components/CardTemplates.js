// public/assets/js/core/components/CardTemplates.js

import { escapeHTML } from '../utils/uiUtils.js';

export const CardTemplates = {
    /**
     * Construye la tarjeta principal de un lienzo (Usada en Home, Explore, etc.)
     * @param {Object} canvas Datos del lienzo devueltos por la API
     * @param {Object} config Opciones adicionales (ej. basePath)
     */
    canvasCard: (canvas, config = {}) => {
        const name = escapeHTML(canvas.name);
        const uuid = escapeHTML(canvas.uuid);
        const basePath = config.basePath || '';
        const isFavoriteClass = canvas.is_favorite ? 'is-favorite' : '';
        
        // Bloque de imagen
        const imgHtml = canvas.snapshot_url 
            ? `<img src="${escapeHTML(canvas.snapshot_url)}" alt="${name}" class="component-snapshot-card__image">` 
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

                <div data-nav="${basePath}/design/${uuid}" class="component-snapshot-link" style="cursor: pointer;">
                    <h3 class="component-snapshot-title">${name}</h3>
                </div>

                <div class="component-snapshot-actions-wrapper component-dropdown-wrapper">
                    <div class="component-snapshot-actions" style="display: flex; gap: 4px; align-items: center;">
                        <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite ${isFavoriteClass}" data-action="toggleFavorite" data-id="${canvas.id}">
                            <span class="material-symbols-rounded" style="font-size: 20px;">favorite</span>
                        </button>
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
    },

    /**
     * Construye una tarjeta para el historial de reinicios (Snapshots Gallery)
     */
    snapshotCard: (snapshot, config = {}) => {
        const canvasName = escapeHTML(config.canvasName || 'Lienzo');
        const basePath = config.basePath || '';
        const snapshotUuid = escapeHTML(snapshot.snapshot_uuid);
        const date = escapeHTML(snapshot.date);
        
        const viewUrl = `${basePath}/snapshot/view/${snapshotUuid}`;
        const imageUrl = snapshot.url.startsWith('/') ? snapshot.url : `/${snapshot.url}`;

        return `
            <div class="component-snapshot-card">
                <img src="${escapeHTML(imageUrl)}" alt="${canvasName}" class="component-snapshot-card__image">
                <div class="component-snapshot-badge">
                    <span class="material-symbols-rounded">history</span>
                    ${date}
                </div>
                <div data-nav="${viewUrl}" class="component-snapshot-link">
                    <h3 class="component-snapshot-title">${canvasName}</h3>
                </div>
            </div>
        `;
    },

    /**
     * Devuelve el bloque HTML completo de un estado vacío.
     */
    emptyState: (message, icon = 'collections') => {
        return `
            <div class="component-empty-state" data-ref="empty-state-rendered">
                <span class="material-symbols-rounded component-empty-state-icon">${icon}</span>
                <p class="component-empty-state-text">${escapeHTML(message)}</p>
            </div>
        `;
    }
};