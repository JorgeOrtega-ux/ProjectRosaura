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

        const onlinePlayers = parseInt(canvas.online_players || 0, 10);
        const membersCount = parseInt(canvas.members_count || 0, 10);
        const likesCount = parseInt(canvas.favorites_count || 0, 10);
        const isOfficial = canvas.is_official;

        let badgeHtml = '';
        if (isOfficial) {
            badgeHtml = `
                <div class="component-gallery-badges-container">
                    <div class="component-badge component-badge--glass">
                        <span class="material-symbols-rounded ${onlinePlayers > 0 ? 'component-text-success' : ''}">person</span>
                        <span>${formatNumber(onlinePlayers)} ${window.__('online')}</span> 
                        <span class="component-badge-divider">|</span>
                        <span class="material-symbols-rounded">group</span>
                        <span>${formatNumber(membersCount)}</span>
                        <span class="component-badge-divider">|</span>
                        <span class="material-symbols-rounded component-text-accent">favorite</span>
                        <span>${formatNumber(likesCount)}</span>
                    </div>
                    <div class="component-badge component-badge--glass">
                        <span class="material-symbols-rounded">verified</span>
                        <span>${window.__('official')}</span>
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
                    <span class="material-symbols-rounded component-text-accent">favorite</span>
                    <span>${formatNumber(likesCount)}</span>
                </div>
            `;
        }
        
        let warningOverlay = '';
        
        if (canvas.locked_requires_downgrade) {
            warningOverlay = `
                <div class="component-gallery-warning-overlay">
                    <div class="component-gallery-warning-content">
                        <span class="material-symbols-rounded">warning</span>
                        <div class="component-gallery-warning-title">${window.__('plan_expired') || window.__('premium_plan_expired')}</div>
                        <div class="component-gallery-warning-desc">${window.__('canvas_exceeds_limits')}</div>
                    </div>
                </div>
            `;
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
                        ${window.activeUserId ? `
                        <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite ${isFavoriteClass}" data-action="toggleFavorite" data-id="${canvas.id}">
                            <span class="material-symbols-rounded component-icon--20">favorite</span>
                        </button>
                        ` : ''}
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleDynamicMenu" data-id="${canvas.id}" data-uuid="${uuid}" data-owner="${canvas.is_owner ? '1' : '0'}" data-locked="${canvas.locked_requires_downgrade ? '1' : '0'}">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    snapshotCard: (snapshot, config = {}) => {
        const canvasName = escapeHTML(config.canvasName);
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
                <div class="component-gallery-badge component-badge--danger component-badge--private">
                    <span class="material-symbols-rounded component-icon--14">lock</span>
                    <span>${window.__('private')}</span>
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
                <div class="component-gallery-badge">
                    <span class="material-symbols-rounded">history</span>
                    <span>${date}</span>
                    <span class="component-badge-divider">|</span>
                    <span class="material-symbols-rounded component-text-accent">favorite</span>
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
        const brandRaw = (card.brand || '').toLowerCase();
        const brandFormatted = escapeHTML(card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Tarjeta');
        const last4 = escapeHTML(card.last4 || '••••');
        
        const monthInt = parseInt(card.exp_month, 10);
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const monthName = (monthInt >= 1 && monthInt <= 12) ? months[monthInt - 1] : '';
        let yearStr = String(card.exp_year || '');
        if (yearStr.length === 2) yearStr = '20' + yearStr;

        const expText = monthName ? `Vence en ${monthName} de ${yearStr}` : `Vence en ${card.exp_month}/${yearStr}`;

        let logoSvg = `
            <span class="material-symbols-rounded" style="color: #666666; font-size: 24px;">credit_card</span>
        `;

        if (brandRaw === 'mastercard') {
            logoSvg = `
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="10" r="9" fill="#EB001B"/>
                    <circle cx="21" cy="10" r="9" fill="#F79E1B" fill-opacity="0.9"/>
                    <path d="M16 3.78a8.96 8.96 0 0 0-3.09 6.22 8.96 8.96 0 0 0 3.09 6.22 8.96 8.96 0 0 0 3.09-6.22A8.96 8.96 0 0 0 16 3.78z" fill="#FF5F00"/>
                </svg>
            `;
        } else if (brandRaw === 'visa') {
            logoSvg = `
                <svg width="34" height="11" viewBox="0 0 36 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.54 0.28L9.5 11.66H6.18L3.74 2.5C3.59 1.9 3.44 1.68 2.94 1.4C2.15 0.97 1.01 0.58 0 0.35L0.07 0.28H5.35C6.04 0.28 6.64 0.74 6.79 1.49L8.1 8.44L11.3 0.28H14.54ZM27.18 8.1C27.19 5.01 22.9 4.84 22.93 3.46C22.94 3.04 23.35 2.59 24.26 2.47C24.71 2.41 25.98 2.36 27.42 3.02L27.95 0.56C27.23 0.3 26.3 0.05 25.13 0.05C22.07 0.05 19.9 1.68 19.88 3.96C19.86 5.68 21.4 6.64 22.57 7.21C23.77 7.8 24.18 8.18 24.17 8.71C24.15 9.52 23.18 9.87 22.3 9.88C20.73 9.9 19.82 9.45 19.09 9.11L18.54 11.67C19.34 12.04 20.81 12.35 22.34 12.37C25.62 12.37 27.76 10.75 27.18 8.1ZM35.08 11.66H37.9L35.44 0.28H32.84C32.22 0.28 31.7 0.64 31.47 1.19L26.92 11.66H30.28L30.95 9.81H35.04L35.08 11.66ZM31.87 7.3L33.56 2.68L34.54 7.3H31.87ZM18.73 0.28L16.14 11.66H13.01L15.6 0.28H18.73Z" fill="#1434CB"/>
                </svg>
            `;
        } else if (brandRaw === 'amex' || brandRaw === 'american express') {
            logoSvg = `
                <svg width="34" height="18" viewBox="0 0 36 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="36" height="20" rx="3" fill="#006FCF"/>
                    <text x="18" y="13" font-family="Arial, sans-serif" font-weight="900" font-size="8" fill="white" text-anchor="middle">AMEX</text>
                </svg>
            `;
        }

        const cardId = escapeHTML(card.id || '');

        return `
            <div class="component-pm-row" data-pm-id="${cardId}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div class="component-pm-row__left" style="display: flex; align-items: center; gap: 12px;">
                    <div class="component-pm-row__logo-box">
                        ${logoSvg}
                    </div>
                    <div class="component-pm-row__info">
                        <div class="component-pm-row__title">${brandFormatted} •••• ${last4}</div>
                        <div class="component-pm-row__subtitle">${expText}</div>
                    </div>
                </div>
                <div class="component-pm-row__right">
                    <button type="button" class="component-button component-button--icon component-button--h32 component-button--danger" data-action="deletePaymentMethod" data-pm-id="${cardId}" data-tooltip="${window.__('delete_card') || 'Eliminar tarjeta'}" data-position="left">
                        <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </div>
        `;
    },

    subscriptionCard: (data) => {
        const tierName = data.tier === 3 ? 'Ultra' : (data.tier === 2 ? 'Pro' : (data.tier === 1 ? 'Plus' : 'Free'));
        const status = escapeHTML(data.status || 'active');
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

        // Storage usage values
        const storage = data.storage || { used_mb: 0, max_mb: 20, remaining_mb: 20, used_percentage: 0 };
        const usedMB = storage.used_mb !== undefined ? storage.used_mb : 0;
        const maxMB = storage.max_mb !== undefined ? storage.max_mb : 20;
        const remainingMB = storage.remaining_mb !== undefined ? storage.remaining_mb : maxMB;
        const percentage = storage.used_percentage !== undefined ? storage.used_percentage : 0;

        const subtitleStorage = `Tu capacidad de almacenamiento · ${usedMB} MB de ${maxMB} MB utilizados (Quedan ${remainingMB} MB)`;
        const percentageText = `${percentage}% ${window.__('used') || 'usado'}`;
        const questionText = window.__('storage_question_upgrade') || '¿Cómo obtener más almacenamiento?';

        let autoRenewHtml = '';
        if (data.tier > 0) {
            autoRenewHtml = `
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
                    <button type="button" class="component-button component-button--h36" data-nav="/upgrade">
                        ${changePlanText}
                    </button>
                </div>
            </div>

            ${autoRenewHtml}

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked component-storage-usage-container">
                <div class="component-storage-usage__header">
                    <div class="component-storage-usage__title-area">
                        <span class="component-storage-subtitle">${subtitleStorage}</span>
                    </div>
                    <div class="component-storage-usage__percentage">
                        <span>${percentageText}</span>
                    </div>
                </div>

                <div class="component-progress-track">
                    <div class="component-progress-fill" style="width: ${percentage}%;"></div>
                </div>
            </div>
        `;
    }
};