import { escapeHTML, formatNumber } from '../utils/uiUtils.js';export const CardTemplates = {
    
    canvasCard: (canvas, config = {}) => {
        const name = escapeHTML(canvas.name);
        const uuid = escapeHTML(canvas.uuid);
        const basePath = config.basePath || '';
        const isFavoriteClass = canvas.is_favorite ? 'is-favorite' : '';

        const fallbackImg = basePath + '/assets/img/fallbacks/canvas-default.png';
        const srcUrl = canvas.thumbnail_url ? escapeHTML(canvas.thumbnail_url) : fallbackImg;

        const imgHtml = `
            <img src="${srcUrl}" 
                 alt="${name}" 
                 class="component-gallery-card__image" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="this.src='${fallbackImg}'">`;

        const actionButtonHtml = canvas.is_owner 
            ? `<button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--error" data-action="deleteCanvas" data-id="${canvas.id}" data-uuid="${uuid}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                    <div class="component-menu-link-text"><span>${window.__('delete_canvas')}</span></div>
               </button>`
            : `<button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--error" data-action="leaveCanvas" data-id="${canvas.id}" data-uuid="${uuid}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">logout</span></div>
                    <div class="component-menu-link-text"><span>${window.__('leave_canvas')}</span></div>
               </button>`;
        const onlinePlayers = parseInt(canvas.online_players || 0, 10);
        const membersCount = parseInt(canvas.members_count || 0, 10);
        const likesCount = parseInt(canvas.favorites_count || 0, 10);
        const isOfficial = canvas.scope_type && canvas.scope_type !== 'personal';

        let badgeHtml = '';
        if (isOfficial) {
            badgeHtml = `
                <div class="component-gallery-badges-container">
                    <div class="component-badge component-badge--brand">
                        <span class="material-symbols-rounded">verified</span>
                        ${window.__('official')}
                    </div>
                    <div class="component-badge component-badge--glass">
                        <span class="material-symbols-rounded ${onlinePlayers > 0 ? 'component-text-success' : ''}">person</span>
                        ${formatNumber(onlinePlayers)} ${window.__('online')}
                        <span class="component-badge-divider">|</span>
                        <span class="material-symbols-rounded" style="color:var(--accent-color)">favorite</span>
                        <span>${formatNumber(likesCount)}</span>
                    </div>
                </div>
            `;
        } else {
            badgeHtml = `
                <div class="component-badge component-badge--glass component-badge--absolute-tr">
                    <span class="material-symbols-rounded ${onlinePlayers > 0 ? 'component-text-success' : ''}">person</span>
                    <span>${formatNumber(onlinePlayers)} ${window.__('online')}</span> 
                    <span class="component-badge-divider">|</span>
                    <span class="material-symbols-rounded">group</span>
                    <span>${formatNumber(membersCount)}</span>
                    <span class="component-badge-divider">|</span>
                    <span class="material-symbols-rounded" style="color:var(--accent-color)">favorite</span>
                    <span>${formatNumber(likesCount)}</span>
                </div>
            `;
        }
        
        let warningOverlay = '';
        let warningMenuOption = '';
        
        if (canvas.locked_requires_downgrade) {
            warningOverlay = `
                <div class="component-gallery-warning-overlay">
                    <div class="component-gallery-warning-content">
                        <span class="material-symbols-rounded">warning</span>
                        <div class="component-gallery-warning-title">${window.__('premium_plan_expired')}</div>
                        <div class="component-gallery-warning-desc">${window.__('canvas_exceeds_limits')}</div>
                    </div>
                </div>
            `;
            
            if (canvas.is_owner) {
                warningMenuOption = `
                    <button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--warning" data-action="downgradeCanvas" data-id="${canvas.id}" data-uuid="${uuid}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">build_circle</span></div>
                        <div class="component-menu-link-text"><span>${window.__('convert_to_basic')}</span></div>
                    </button>
                `;
            }
        }

        const navAction = canvas.locked_requires_downgrade ? '' : `data-nav="${basePath}/design/${uuid}"`;
        const linkClass = canvas.locked_requires_downgrade ? 'component-gallery-link--disabled' : '';

        return `
            <div class="component-gallery-card" data-card-id="${canvas.id}">
                ${warningOverlay}
                ${imgHtml}
                ${badgeHtml}

                <div ${navAction} class="component-gallery-link ${linkClass}">
                    <h3 class="component-gallery-title">${name}</h3>
                </div>

                <div class="component-gallery-actions-wrapper component-dropdown-wrapper">
                    <div class="component-gallery-actions">
                        <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite ${isFavoriteClass}" data-action="toggleFavorite" data-id="${canvas.id}">
                            <span class="material-symbols-rounded component-icon--20">favorite</span>
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
                                    <div class="component-menu-link-text"><span>${window.__('open_in_new_tab')}</span></div>
                                </button>

                                <button type="button" class="component-menu-link" data-action="copyCanvasLink" data-uuid="${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">content_copy</span></div>
                                    <div class="component-menu-link-text"><span>${window.__('copy_link')}</span></div>
                                </button>
                                
                                <button type="button" class="component-menu-link" data-nav="${basePath}/design/s/${uuid}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">collections</span></div>
                                    <div class="component-menu-link-text"><span>${window.__('view_restart_gallery')}</span></div>
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

    snapshotCard: (snapshot, config = {}) => {
        const canvasName = escapeHTML(config.canvasName || 'Lienzo');
        const basePath = config.basePath || '';
        const snapshotUuid = escapeHTML(snapshot.snapshot_uuid);
        const date = escapeHTML(snapshot.date);
        
        const fallbackImg = `${basePath}/assets/img/fallbacks/canvas-default.png`;
        const viewUrl = `${basePath}/snapshot/view/${snapshotUuid}`;
        const imageUrl = snapshot.url ? (snapshot.url.startsWith('/') ? snapshot.url : `/${snapshot.url}`) : fallbackImg;
        const likesCount = parseInt(snapshot.likes_count || 0, 10);

        let privateBadge = '';
        if (snapshot.is_private) {
            privateBadge = `
                <div class="component-gallery-badge component-badge--danger" style="top: 8px; left: 8px; right: auto; padding: 4px 8px; border-radius: 8px; background: rgba(239,68,68,0.9); z-index: 10;">
                    <span class="material-symbols-rounded" style="font-size: 14px;">lock</span>
                    <span style="font-size: 12px; font-weight: 600;">Privado</span>
                </div>
            `;
        }

        return `
            <div class="component-gallery-card">
                ${privateBadge}
                <img src="${escapeHTML(imageUrl)}" 
                     alt="${canvasName}" 
                     class="component-gallery-card__image" 
                     loading="lazy" 
                     decoding="async"
                     onerror="this.src='${fallbackImg}'">
                <div class="component-gallery-badge" style="display: flex; gap: 4px;">
                    <span class="material-symbols-rounded">history</span>
                    <span>${date}</span>
                    <span class="component-badge-divider" style="margin: 0 2px;">|</span>
                    <span class="material-symbols-rounded" style="color:var(--accent-color)">favorite</span>
                    <span>${formatNumber(likesCount)}</span>
                </div>
                <div data-nav="${viewUrl}" class="component-gallery-link">
                    <h3 class="component-gallery-title">${canvasName}</h3>
                </div>
            </div>
        `;
    },

    emptyState: (message, icon = 'collections') => {
        return `
            <div class="component-empty-state" data-ref="empty-state-rendered">
                <span class="material-symbols-rounded component-empty-state-icon">${icon}</span>
                <p class="component-empty-state-text">${escapeHTML(message)}</p>
            </div>
        `;
    },

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
                        <span>â€¢â€¢â€¢â€¢</span> <span>â€¢â€¢â€¢â€¢</span> <span>â€¢â€¢â€¢â€¢</span> <span>${last4}</span>
                    </div>
                </div>
            </div>
        `;
    },

    subscriptionCard: (data) => {
        const tierName = data.tier === 2 ? 'Advanced' : (data.tier === 1 ? 'Pro' : 'Free');
        const status = escapeHTML(data.status || 'inactive');
        const cancelAtEnd = data.cancel_at_period_end;
        let dateLabel = cancelAtEnd ? window.__('ends_on') : window.__('next_billing');
        
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

        let statusText = window.__('status_active');
        if (status !== 'active') {
            statusText = status === 'incomplete' ? window.__('status_incomplete') : window.__('status_inactive');
        } else if (cancelAtEnd) {
            statusText = window.__('will_cancel_soon');
        }

        const actionText = cancelAtEnd ? window.__('btn_reactivate_sub') : window.__('btn_cancel_renew');
        const btnClass = cancelAtEnd ? 'component-button--brand' : 'component-button--dark';
        const changePlanText = window.__('btn_change_plan');
        
        let renewText = cancelAtEnd ? window.__('status_canceled') : window.__('status_active');
        
        return `
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">stars</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">${window.__('current_plan')}</h2>
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
                        <h2 class="component-card__title">${window.__('auto_renewal')}</h2>
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