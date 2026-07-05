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
        
        // Determinar URL de fallback para la imagen
        const fallbackImg = `${basePath}/assets/img/fallbacks/canvas-default.png`;
        const srcUrl = canvas.snapshot_url ? escapeHTML(canvas.snapshot_url) : fallbackImg;
        
        // Bloque de imagen con onerror por si la ruta devuelta falla
        const imgHtml = `
            <img src="${srcUrl}" 
                 alt="${name}" 
                 class="component-snapshot-card__image" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="this.src='${fallbackImg}'">`;

        // Botón de acción condicional en el dropdown (basado en lógica de negocio devuelta por API)
        const actionButtonHtml = canvas.is_owner 
            ? `<button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--error" data-action="deleteCanvas" data-id="${canvas.id}" data-uuid="${uuid}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                    <div class="component-menu-link-text"><span>Eliminar lienzo</span></div>
               </button>`
            : `<button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--error" data-action="leaveCanvas" data-id="${canvas.id}" data-uuid="${uuid}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">logout</span></div>
                    <div class="component-menu-link-text"><span>Salir del lienzo</span></div>
               </button>`;
        const onlinePlayers = parseInt(canvas.online_players || 0, 10);
        const membersCount = parseInt(canvas.members_count || 0, 10);
        const isOfficial = canvas.scope_type && canvas.scope_type !== 'personal';

        let badgeHtml = '';
        if (isOfficial) {
            badgeHtml = `
                <div class="component-snapshot-badge">
                    <span class="material-symbols-rounded" style="color: ${onlinePlayers > 0 ? '#10b981' : 'inherit'}">person</span>
                    ${onlinePlayers} Online
                </div>
            `;
        } else {
            badgeHtml = `
                <div class="component-snapshot-badge" style="display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-rounded" style="color: ${onlinePlayers > 0 ? '#10b981' : 'inherit'}; font-size: 16px;">person</span>
                    <span>${onlinePlayers} Online</span> 
                    <span style="margin: 0 2px; opacity: 0.5;">|</span>
                    <span class="material-symbols-rounded" style="font-size: 16px;">group</span>
                    <span>${membersCount}</span>
                </div>
            `;
        }

        return `
            <div class="component-snapshot-card" data-card-id="${canvas.id}">
                ${imgHtml}
                ${badgeHtml}

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
                                
                                <button type="button" class="component-menu-link" data-nav="${basePath}/design/s/${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">collections</span></div>
                                    <div class="component-menu-link-text"><span>Ver galería de reinicios</span></div>
                                </button>

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
        
        const fallbackImg = `${basePath}/assets/img/fallbacks/canvas-default.png`;
        const viewUrl = `${basePath}/snapshot/view/${snapshotUuid}`;
        const imageUrl = snapshot.url ? (snapshot.url.startsWith('/') ? snapshot.url : `/${snapshot.url}`) : fallbackImg;

        return `
            <div class="component-snapshot-card">
                <img src="${escapeHTML(imageUrl)}" 
                     alt="${canvasName}" 
                     class="component-snapshot-card__image" 
                     loading="lazy" 
                     decoding="async"
                     onerror="this.src='${fallbackImg}'">
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
    },

    /**
     * Construye una tarjeta para un método de pago.
     */
    paymentMethodCard: (card) => {
        const brandRaw = card.brand ? card.brand.toLowerCase() : 'unknown';
        const brand = escapeHTML(card.brand || 'Card').toUpperCase();
        const last4 = escapeHTML(card.last4);
        const expMonth = String(card.exp_month).padStart(2, '0');
        const expYear = String(card.exp_year).slice(-2);
        
        return `
            <div class="component-credit-card component-credit-card--${escapeHTML(brandRaw)}">
                <div class="component-credit-card__top">
                    <div class="component-credit-card__contactless">
                        <span class="material-symbols-rounded">contactless</span>
                    </div>
                    <div class="component-credit-card__brand">
                        ${brand}
                    </div>
                </div>
                <div class="component-credit-card__bottom">
                    <div class="component-credit-card__number">
                        <span>••••</span> <span>••••</span> <span>••••</span> <span>${last4}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Construye una tarjeta para la suscripción actual.
     */
    subscriptionCard: (data) => {
        const tierName = data.tier === 2 ? 'Advanced' : (data.tier === 1 ? 'Pro' : 'Free');
        const status = escapeHTML(data.status || 'inactive');
        const cancelAtEnd = data.cancel_at_period_end;
        let dateLabel = cancelAtEnd ? 'Finaliza el:' : 'Próxima renovación:';
        
        let dateVal = '-';
        if (data.current_period_end) {
            const dateObj = new Date(data.current_period_end * 1000);
            dateVal = dateObj.toLocaleDateString();
        }

        let statusClass = 'component-text-notice--success';
        let statusText = 'Activa';
        
        if (status !== 'active') {
            statusClass = 'component-text-notice--error';
            statusText = status === 'incomplete' ? 'Incompleta' : 'Inactiva';
        } else if (cancelAtEnd) {
            statusClass = 'component-text-notice--warning';
            statusText = 'Se cancelará pronto';
        }

        const actionText = cancelAtEnd ? (window.__ ? window.__('btn_reactivate_sub') || 'Reactivar Suscripción' : 'Reactivar Suscripción') : (window.__ ? window.__('btn_cancel_renew') || 'Cancelar Renovación' : 'Cancelar Renovación');
        const actionIcon = cancelAtEnd ? 'autorenew' : 'cancel';
        const btnClass = cancelAtEnd ? 'component-button--brand' : 'component-button--dark';
        const changePlanText = window.__ ? window.__('btn_change_plan') || 'Cambiar Plan' : 'Cambiar Plan';
        
        return `
            <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary);">Plan ${tierName}</h3>
                        <p style="margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                            Estado: <span class="${statusClass}" style="font-weight: 500;">${statusText}</span>
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">${dateLabel}</p>
                        <p style="margin: 4px 0 0; font-weight: 600; font-size: 1.1rem; color: var(--text-primary);">${dateVal}</p>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: auto;">
                    <button type="button" class="component-button component-button--dark component-button--h40" data-nav="/premium">
                        <span class="material-symbols-rounded">upgrade</span>
                        ${changePlanText}
                    </button>
                    <button type="button" class="component-button ${btnClass} component-button--h40" data-action="toggleAutoRenew" data-cancel-state="${!cancelAtEnd}">
                        <span class="material-symbols-rounded">${actionIcon}</span>
                        ${actionText}
                    </button>
                </div>
            </div>
        `;
    }
};