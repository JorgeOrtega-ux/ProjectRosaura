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
        const fallbackImg = '/assets/img/misc/placeholder.png';
        const srcUrl = canvas.thumbnail_url ? escapeHTML(canvas.thumbnail_url) : fallbackImg;
        
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
                <div style="position: absolute; top: 12px; right: 12px; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; z-index: 10;">
                    <div class="component-snapshot-badge" style="position: relative; top: auto; right: auto; background: var(--accent-primary, #3b82f6); color: white; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                        <span class="material-symbols-rounded" style="font-size: 14px;">verified</span>
                        Oficial
                    </div>
                    <div class="component-snapshot-badge" style="position: relative; top: auto; right: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                        <span class="material-symbols-rounded" style="color: ${onlinePlayers > 0 ? '#10b981' : 'inherit'}">person</span>
                        ${onlinePlayers} Online
                    </div>
                </div>
            `;
        } else {
            badgeHtml = `
                <div class="component-snapshot-badge" style="display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    <span class="material-symbols-rounded" style="color: ${onlinePlayers > 0 ? '#10b981' : 'inherit'}; font-size: 16px;">person</span>
                    <span>${onlinePlayers} Online</span> 
                    <span style="margin: 0 2px; opacity: 0.5;">|</span>
                    <span class="material-symbols-rounded" style="font-size: 16px;">group</span>
                    <span>${membersCount}</span>
                </div>
            `;
        }
        
        let warningOverlay = '';
        let warningMenuOption = '';
        
        if (canvas.locked_requires_downgrade) {
            warningOverlay = `
                <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.6); z-index: 5; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
                    <div style="text-align: center; color: white;">
                        <span class="material-symbols-rounded" style="font-size: 32px; color: var(--color-warning); margin-bottom: 8px;">warning</span>
                        <div style="font-weight: 600; font-size: 14px;">Plan Premium Expirado</div>
                        <div style="font-size: 11px; opacity: 0.9; margin-top: 4px; padding: 0 10px;">El lienzo excede los límites básicos</div>
                    </div>
                </div>
            `;
            
            if (canvas.is_owner) {
                warningMenuOption = `
                    <button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--warning" data-action="downgradeCanvas" data-id="${canvas.id}" data-uuid="${uuid}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">build_circle</span></div>
                        <div class="component-menu-link-text"><span>Convertir a Básico</span></div>
                    </button>
                `;
            }
        }

        const navAction = canvas.locked_requires_downgrade ? '' : `data-nav="${basePath}/design/${uuid}"`;
        const linkStyle = canvas.locked_requires_downgrade ? 'cursor: not-allowed; opacity: 0.6;' : 'cursor: pointer;';

        return `
            <div class="component-snapshot-card" data-card-id="${canvas.id}" style="position: relative;">
                ${warningOverlay}
                ${imgHtml}
                ${badgeHtml}

                <div ${navAction} class="component-snapshot-link" style="${linkStyle}">
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
                                
                                ${warningMenuOption}

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
        let dateLabel = cancelAtEnd ? 'Finaliza el:' : 'Próximo cobro:';
        
        let dateVal = '-';
        if (data.current_period_end) {
            let dateObj;
            if (typeof data.current_period_end === 'string' && isNaN(Number(data.current_period_end))) {
                dateObj = new Date(data.current_period_end.replace(' ', 'T'));
            } else {
                dateObj = new Date(Number(data.current_period_end) * 1000);
            }
            
            if (!isNaN(dateObj.getTime())) {
                dateVal = dateObj.toLocaleDateString();
            }
        }

        let statusText = 'Activo';
        if (status !== 'active') {
            statusText = status === 'incomplete' ? 'Incompleto' : 'Inactivo';
        } else if (cancelAtEnd) {
            statusText = 'Se cancelará pronto';
        }

        const actionText = cancelAtEnd ? (window.__ ? window.__('btn_reactivate_sub') || 'Reactivar renovación' : 'Reactivar renovación') : (window.__ ? window.__('btn_cancel_renew') || 'Cancelar renovación' : 'Cancelar renovación');
        const btnClass = cancelAtEnd ? 'component-button--brand' : 'component-button--dark';
        const changePlanText = window.__ ? window.__('btn_change_plan') || 'Cambiar plan' : 'Cambiar plan';
        
        let renewText = cancelAtEnd ? 'Cancelada' : 'Activa';
        
        return `
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">stars</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Plan actual</h2>
                        <p class="component-card__description">${tierName} (${statusText})</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36" data-nav="/premium">
                        ${changePlanText}
                    </button>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">event_repeat</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Renovación automática</h2>
                        <p class="component-card__description">${renewText} (${dateLabel} ${dateVal})</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36 ${btnClass}" data-action="toggleAutoRenew" data-cancel-state="${!cancelAtEnd}">
                        ${actionText}
                    </button>
                </div>
            </div>
        `;
    }
};