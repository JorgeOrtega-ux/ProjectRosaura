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
                 class="component-gallery-card__image image-lazy-fade" 
                 loading="lazy" 
                 decoding="async" 
                 onload="this.classList.add('image-loaded')"
                 onerror="this.onerror=null; this.src='${fallbackImg}'; this.classList.add('image-loaded');">`;

        const onlinePlayers = parseInt(canvas.online_players || 0, 10);
        const membersCount = parseInt(canvas.members_count || 0, 10);
        const likesCount = parseInt(canvas.favorites_count || 0, 10);
        const isOnline = (canvas.mode === 'online' || !!canvas.is_online_active);
        const modeSegment = isOnline
            ? `<span class="material-symbols-rounded ${onlinePlayers > 0 ? 'component-text-success' : ''}">sensors</span><span>${formatNumber(onlinePlayers)} ${window.__('online')}</span>`
            : `<span class="material-symbols-rounded component-text-accent">brush</span><span>${window.__('badge_studio')}</span>`;

        const badgeHtml = `
            <div class="component-badge component-badge--glass component-badge--absolute-tr">
                ${modeSegment}
                <span class="component-badge-divider">|</span>
                <span class="material-symbols-rounded">group</span>
                <span class="member-count-val">${formatNumber(membersCount)}</span>
                <span class="component-badge-divider">|</span>
                <span class="material-symbols-rounded component-text-accent">favorite</span>
                <span>${formatNumber(likesCount)}</span>
            </div>
        `;
        
        const navAction = `data-nav="${basePath}/design/${uuid}"`;
        const linkClass = '';

        return `
            <div class="component-gallery-card" data-card-id="${canvas.id}" data-privacy="${canvas.privacy || 'public'}">
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
                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleDynamicMenu" data-id="${canvas.id}" data-uuid="${uuid}" data-owner="${canvas.is_owner ? '1' : '0'}" data-locked="${canvas.locked_requires_downgrade ? '1' : '0'}" data-member="${canvas.is_member ? '1' : '0'}" data-online="${isOnline ? '1' : '0'}">
                            <span class="material-symbols-rounded">more_vert</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    promoCard: (promo, config = {}) => {
        const sponsorName = escapeHTML(promo.sponsor || window.__('sponsor'));
        const description = escapeHTML(promo.description || promo.title || '');
        const basePath = config.basePath || '';
        const fallbackImg = basePath + '/assets/img/fallbacks/canvas-default.png';
        const targetUrl = promo.url ? promo.url : `${basePath}/upgrade`;
        const sponsoredLabel = window.__('sponsored');
        const promoUuid = promo.promo_uuid || promo.uuid || promo.id || '';

        const resolveUrl = (url) => {
            if (!url) return fallbackImg;
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
                return url;
            }
            if (basePath && url.startsWith('/') && !url.startsWith(basePath + '/')) {
                return basePath + url;
            }
            return url;
        };

        const mediaList = Array.isArray(promo.media) && promo.media.length > 0
            ? promo.media
            : [{ type: 'image', url: promo.thumbnail_url || promo.image_url || `${basePath}/assets/img/showcase/creative_tools.jpg` }];

        const hasMultipleMedia = mediaList.length > 1;

        let mediaItemsHtml = '';
        if (!hasMultipleMedia) {
            const single = mediaList[0];
            const singleUrl = escapeHTML(resolveUrl(single.url));
            if (single.type === 'video') {
                mediaItemsHtml = `
                    <video src="${singleUrl}" 
                           class="component-gallery-card__image component-gallery-card__video active" 
                           muted 
                           playsinline 
                           loop 
                           preload="metadata"></video>
                `;
            } else {
                mediaItemsHtml = `
                    <img src="${singleUrl}" 
                         alt="${sponsorName}" 
                         class="component-gallery-card__image image-lazy-fade active" 
                         loading="lazy" 
                         decoding="async" 
                         onload="this.classList.add('image-loaded')" 
                         onerror="this.onerror=null; this.src='${fallbackImg}'; this.classList.add('image-loaded');">
                `;
            }
        } else {
            mediaItemsHtml = `
                <div class="component-gallery-media-track">
                    ${mediaList.map((item, idx) => {
                        const isFirst = idx === 0;
                        const itemUrl = escapeHTML(resolveUrl(item.url));
                        const activeClass = isFirst ? 'active image-loaded' : '';
                        if (item.type === 'video') {
                            return `
                                <video src="${itemUrl}" 
                                       class="component-gallery-card__image component-gallery-media-item component-gallery-card__video ${activeClass}" 
                                       muted 
                                       playsinline 
                                       loop 
                                       preload="metadata" 
                                       data-media-index="${idx}"></video>
                            `;
                        }
                        return `
                            <img src="${itemUrl}" 
                                 alt="${sponsorName}" 
                                 class="component-gallery-card__image component-gallery-media-item ${activeClass}" 
                                 loading="lazy" 
                                 decoding="async" 
                                 onerror="this.onerror=null; this.src='${fallbackImg}';"
                                 data-media-index="${idx}">
                        `;
                    }).join('')}
                </div>
            `;
        }

        let dotsHtml = '';
        if (hasMultipleMedia) {
            dotsHtml = `
                <div class="component-gallery-dots">
                    ${mediaList.map((_, idx) => `
                        <span class="component-gallery-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
                    `).join('')}
                </div>
            `;
        }

        const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');
        const actionAttr = isExternal
            ? `data-action="openPromoLink" data-target-url="${escapeHTML(targetUrl)}" data-is-external="true"`
            : `data-action="openPromoLink" data-target-url="${escapeHTML(targetUrl)}" data-is-external="false" data-nav="${escapeHTML(targetUrl)}"`;

        return `
            <div class="component-gallery-card component-gallery-card--featured" data-card-role="promo" data-promo-id="${escapeHTML(promoUuid)}">
                ${mediaItemsHtml}

                <div class="component-badge component-badge--glass component-badge--absolute-tl">
                    <span class="material-symbols-rounded component-icon--14">verified</span>
                    <span>${escapeHTML(sponsoredLabel)}</span>
                </div>

                <div class="component-badge component-badge--glass component-badge--absolute-tr">
                    <span class="material-symbols-rounded component-icon--14">business</span>
                    <span>${sponsorName}</span>
                </div>

                ${dotsHtml}

                <div class="component-gallery-link" ${actionAttr}>
                    <h3 class="component-gallery-title">${description}</h3>
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

    getEmptyGraphicSvg: (type) => {
        if (type === 'trash') {
            return `
                <svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="trashCanGrad" x1="40" y1="56" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="45%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                        <linearGradient id="trashLidGrad" x1="30" y1="20" x2="80" y2="60" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                        <linearGradient id="trashHighlight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
                            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                        </linearGradient>
                        <linearGradient id="butterflyWing" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#f4f4f5"/>
                            <stop offset="100%" stop-color="#a1a1aa"/>
                        </linearGradient>
                        <linearGradient id="butterflyLowerWing" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#d4d4d8"/>
                            <stop offset="100%" stop-color="#71717a"/>
                        </linearGradient>
                    </defs>
                    <path d="M46 62 L52 116 C52.5 122 87.5 122 88 116 L94 62 Z" fill="url(#trashCanGrad)"/>
                    <rect x="55" y="66" width="5" height="48" rx="2.5" fill="rgba(255,255,255,0.12)"/>
                    <rect x="67.5" y="66" width="5" height="50" rx="2.5" fill="rgba(255,255,255,0.2)"/>
                    <rect x="80" y="66" width="5" height="48" rx="2.5" fill="rgba(0,0,0,0.3)"/>
                    <ellipse cx="70" cy="62" rx="25" ry="7" fill="#27272a"/>
                    <ellipse cx="70" cy="62" rx="22" ry="5.5" fill="#18181b"/>
                    <ellipse cx="70" cy="62" rx="16" ry="3.5" fill="#3f3f46" opacity="0.6"/>
                    <g transform="rotate(-24 46 44)">
                        <ellipse cx="64" cy="46" rx="28" ry="7" fill="url(#trashLidGrad)"/>
                        <path d="M38 46 C38 36 90 36 90 46 Z" fill="url(#trashLidGrad)"/>
                        <path d="M42 43 C46 38 82 38 86 43" stroke="url(#trashHighlight)" stroke-width="2" stroke-linecap="round" fill="none"/>
                        <path d="M58 35 C58 30 70 30 70 35" stroke="#e4e4e7" stroke-width="3" stroke-linecap="round" fill="none"/>
                    </g>
                    <g transform="translate(90, 36)">
                        <path d="M-1 -1 C-6 -8 -13 -6 -10 1 C-8 4 -3 2 -1 0 Z" fill="url(#butterflyWing)"/>
                        <path d="M1 -1 C6 -8 13 -6 10 1 C8 4 3 2 1 0 Z" fill="url(#butterflyWing)"/>
                        <path d="M-1 1 C-6 5 -10 9 -6 11 C-3 11 -1 5 -1 1 Z" fill="url(#butterflyLowerWing)"/>
                        <path d="M1 1 C6 5 10 9 6 11 C3 11 1 5 1 1 Z" fill="url(#butterflyLowerWing)"/>
                        <ellipse cx="0" cy="1" rx="1.5" ry="5.5" fill="#27272a"/>
                    </g>
                    <g>
                        <path d="M108 24 L109.5 28.5 L114 30 L109.5 31.5 L108 36 L106.5 31.5 L102 30 L106.5 28.5 Z" fill="#e4e4e7"/>
                        <path d="M30 42 L31 45 L34 46 L31 47 L30 50 L29 47 L26 46 L29 45 Z" fill="#a1a1aa"/>
                        <path d="M84 18 L85 20 L87 21 L85 22 L84 24 L83 22 L81 21 L83 20 Z" fill="#71717a"/>
                    </g>
                </svg>
            `;
        }
        if (type === 'canvas' || type === 'home') {
            return `
                <svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="boardGrad" x1="30" y1="30" x2="110" y2="105" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                        <linearGradient id="brushHandle" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#a1a1aa"/>
                            <stop offset="100%" stop-color="#52525b"/>
                        </linearGradient>
                    </defs>
                    <path d="M42 60 L30 124 M98 60 L110 124 M70 50 L70 124" stroke="var(--text-tertiary, #52525b)" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
                    <rect x="34" y="34" width="72" height="64" rx="10" fill="url(#boardGrad)" stroke="#52525b" stroke-width="1.5"/>
                    <rect x="39" y="39" width="62" height="54" rx="7" fill="var(--bg-surface, #18181b)"/>
                    <rect x="46" y="46" width="10" height="10" rx="2" fill="#71717a"/>
                    <rect x="58" y="46" width="10" height="10" rx="2" fill="#a1a1aa"/>
                    <rect x="70" y="46" width="10" height="10" rx="2" fill="#52525b"/>
                    <rect x="82" y="46" width="10" height="10" rx="2" fill="#3f3f46"/>
                    <rect x="46" y="58" width="10" height="10" rx="2" fill="#d4d4d8"/>
                    <rect x="58" y="58" width="10" height="10" rx="2" fill="#71717a"/>
                    <rect x="70" y="58" width="10" height="10" rx="2" fill="#e4e4e7"/>
                    <rect x="82" y="58" width="10" height="10" rx="2" fill="#52525b"/>
                    <rect x="46" y="70" width="10" height="10" rx="2" fill="#3f3f46"/>
                    <rect x="58" y="70" width="10" height="10" rx="2" fill="#52525b"/>
                    <rect x="70" y="70" width="10" height="10" rx="2" fill="#a1a1aa"/>
                    <rect x="82" y="70" width="10" height="10" rx="2" fill="#71717a"/>
                    <g transform="rotate(32 94 40)">
                        <rect x="88" y="16" width="6" height="42" rx="3" fill="url(#brushHandle)"/>
                        <rect x="87" y="54" width="8" height="6" rx="1.5" fill="#e4e4e7"/>
                        <path d="M87 60 C87 66 95 66 95 60 Z" fill="#71717a"/>
                    </g>
                    <g>
                        <path d="M112 30 L113.5 34.5 L118 36 L113.5 37.5 L112 42 L110.5 37.5 L106 36 L110.5 34.5 Z" fill="#e4e4e7"/>
                        <path d="M26 48 L27 51 L30 52 L27 53 L26 56 L25 53 L22 52 L25 51 Z" fill="#a1a1aa"/>
                        <path d="M102 96 L103 98 L105 99 L103 100 L102 102 L101 100 L99 99 L101 98 Z" fill="#71717a"/>
                    </g>
                </svg>
            `;
        }
        if (type === 'search') {
            return `
                <svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="searchGlass" x1="30" y1="26" x2="86" y2="82" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
                            <stop offset="100%" stop-color="#71717a" stop-opacity="0.05"/>
                        </linearGradient>
                        <linearGradient id="searchRim" x1="28" y1="24" x2="88" y2="84" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#a1a1aa"/>
                            <stop offset="50%" stop-color="#71717a"/>
                            <stop offset="100%" stop-color="#3f3f46"/>
                        </linearGradient>
                        <linearGradient id="searchHandleGrad" x1="76" y1="76" x2="114" y2="114" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                    </defs>
                    <circle cx="58" cy="54" r="38" stroke="var(--border-color, #3f3f46)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.4"/>
                    <path d="M80 76 L110 106" stroke="url(#searchHandleGrad)" stroke-width="12" stroke-linecap="round"/>
                    <path d="M80 76 L110 106" stroke="#a1a1aa" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
                    <circle cx="110" cy="106" r="6" fill="#27272a"/>
                    <circle cx="58" cy="54" r="30" fill="url(#searchGlass)" stroke="url(#searchRim)" stroke-width="6"/>
                    <path d="M38 42 C44 34 54 30 66 32" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.5" fill="none"/>
                    <circle cx="54" cy="50" r="3.5" fill="#e4e4e7"/>
                    <circle cx="68" cy="60" r="2.5" fill="#a1a1aa"/>
                    <circle cx="48" cy="62" r="2" fill="#71717a"/>
                    <g>
                        <path d="M106 28 L107.5 32.5 L112 34 L107.5 35.5 L106 40 L104.5 35.5 L100 34 L104.5 32.5 Z" fill="#e4e4e7"/>
                        <path d="M22 66 L23 69 L26 70 L23 71 L22 74 L21 71 L18 70 L21 69 Z" fill="#a1a1aa"/>
                        <path d="M84 18 L85 20 L87 21 L85 22 L84 24 L83 22 L81 21 L83 20 Z" fill="#71717a"/>
                    </g>
                </svg>
            `;
        }
        if (type === 'snapshots' || type === 'gallery') {
            return `
                <svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="photoGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <g transform="rotate(-12 60 70)">
                        <rect x="36" y="32" width="58" height="68" rx="8" fill="var(--bg-surface-alt, #27272a)" stroke="var(--border-color, #3f3f46)" stroke-width="1.5"/>
                        <rect x="42" y="38" width="46" height="42" rx="5" fill="#3f3f46" opacity="0.4"/>
                    </g>
                    <g transform="rotate(8 72 70)">
                        <rect x="42" y="30" width="60" height="72" rx="8" fill="var(--bg-surface, #18181b)" stroke="var(--border-color, #3f3f46)" stroke-width="1.5"/>
                        <rect x="48" y="36" width="48" height="46" rx="5" fill="url(#photoGrad)"/>
                        <circle cx="80" cy="48" r="5" fill="#e4e4e7"/>
                        <path d="M48 76 L62 58 L72 68 L82 54 L96 76 Z" fill="rgba(255,255,255,0.18)"/>
                        <path d="M58 76 L70 62 L80 72 L96 76 Z" fill="rgba(255,255,255,0.28)"/>
                        <circle cx="88" cy="88" r="7" fill="#52525b"/>
                        <path d="M88 86 C87 84 84 84 84 86 C84 88 88 91 88 91 C88 91 92 88 92 86 C92 84 89 84 88 86 Z" fill="#ffffff"/>
                    </g>
                    <g>
                        <path d="M112 24 L113.5 28.5 L118 30 L113.5 31.5 L112 36 L110.5 31.5 L106 30 L110.5 28.5 Z" fill="#e4e4e7"/>
                        <path d="M26 40 L27 43 L30 44 L27 45 L26 48 L25 45 L22 44 L25 43 Z" fill="#a1a1aa"/>
                    </g>
                </svg>
            `;
        }
        if (type === 'explore') {
            return `
                <svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="globeGrad" x1="30" y1="30" x2="110" y2="110" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                        <linearGradient id="ringGrad" x1="20" y1="70" x2="120" y2="70" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#a1a1aa"/>
                            <stop offset="50%" stop-color="#71717a"/>
                            <stop offset="100%" stop-color="#3f3f46"/>
                        </linearGradient>
                    </defs>
                    <circle cx="70" cy="68" r="32" fill="url(#globeGrad)" stroke="#52525b" stroke-width="1.5"/>
                    <rect x="56" y="52" width="10" height="8" rx="2" fill="rgba(255,255,255,0.2)"/>
                    <rect x="68" y="56" width="16" height="10" rx="3" fill="rgba(255,255,255,0.15)"/>
                    <rect x="52" y="68" width="14" height="12" rx="3" fill="rgba(255,255,255,0.2)"/>
                    <rect x="72" y="74" width="12" height="8" rx="2" fill="rgba(255,255,255,0.15)"/>
                    <ellipse cx="70" cy="68" rx="54" ry="16" stroke="url(#ringGrad)" stroke-width="3.5" transform="rotate(-22 70 68)" opacity="0.8"/>
                    <g>
                        <path d="M116 26 L117.5 30.5 L122 32 L117.5 33.5 L116 38 L114.5 33.5 L110 32 L114.5 30.5 Z" fill="#e4e4e7"/>
                        <path d="M24 44 L25 47 L28 48 L25 49 L24 52 L23 49 L20 48 L23 47 Z" fill="#a1a1aa"/>
                        <path d="M96 102 L97 104 L99 105 L97 106 L96 108 L95 106 L93 105 L95 104 Z" fill="#71717a"/>
                    </g>
                </svg>
            `;
        }
        if (type === 'error' || type === 'wifi_off') {
            return `
                <svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="shieldGrad" x1="30" y1="20" x2="110" y2="100" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                    </defs>
                    <path d="M70 28 L104 42 C104 76 70 102 70 102 C70 102 36 76 36 42 Z" fill="url(#shieldGrad)" stroke="#52525b" stroke-width="1.5"/>
                    <rect x="67" y="46" width="6" height="24" rx="3" fill="#e4e4e7"/>
                    <circle cx="70" cy="80" r="3.5" fill="#e4e4e7"/>
                    <g>
                        <path d="M112 30 L113.5 34.5 L118 36 L113.5 37.5 L112 42 L110.5 37.5 L106 36 L110.5 34.5 Z" fill="#e4e4e7"/>
                        <path d="M26 50 L27 53 L30 54 L27 55 L26 58 L25 55 L22 54 L25 53 Z" fill="#71717a"/>
                    </g>
                </svg>
            `;
        }
        return null;
    },

    emptyState: (optionsOrMessage, icon = 'collections', title = '', actions = '') => {
        let opts = {};
        if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null) {
            opts = optionsOrMessage;
        } else {
            opts = {
                message: optionsOrMessage || '',
                icon: icon,
                title: title,
                actions: actions
            };
        }

        const msg = typeof opts.message === 'string' ? opts.message : '';
        const titleText = typeof opts.title === 'string' ? opts.title : '';
        let detectedType = opts.type;
        if (!detectedType) {
            if (opts.icon === 'search_off') detectedType = 'search';
            else if (opts.icon === 'delete_outline' || opts.icon === 'restore_from_trash') detectedType = 'trash';
            else if (opts.icon === 'palette' || opts.icon === 'dashboard_customize' || opts.icon === 'dashboard') detectedType = 'canvas';
            else if (opts.icon === 'history' || opts.icon === 'collections' || opts.icon === 'photo_library') detectedType = 'snapshots';
            else if (opts.icon === 'explore' || opts.icon === 'public') detectedType = 'explore';
            else if (opts.icon === 'error' || opts.icon === 'wifi_off') detectedType = 'error';
            else detectedType = 'canvas';
        }

        const refAttr = opts.ref ? `data-ref="${escapeHTML(opts.ref)}"` : 'data-ref="empty-state-rendered"';
        const isTable = !!opts.isTable;

        let graphicHtml = '';
        if (!isTable) {
            const svgContent = CardTemplates.getEmptyGraphicSvg(detectedType);
            if (svgContent) {
                graphicHtml = `<div class="component-empty-state-graphic">${svgContent}</div>`;
            } else {
                graphicHtml = `<div class="component-empty-state-badge"><span class="material-symbols-rounded">${opts.icon || 'info'}</span></div>`;
            }
        } else {
            graphicHtml = `<div class="component-empty-state-badge"><span class="material-symbols-rounded">${opts.icon || 'search_off'}</span></div>`;
        }

        const titleHtml = titleText ? `<h2 class="component-empty-state-title">${escapeHTML(titleText)}</h2>` : '';
        const descHtml = msg ? `<p class="component-empty-state-desc">${escapeHTML(msg)}</p>` : '';
        const actionsHtml = (typeof opts.actions === 'string' && opts.actions) ? `<div class="component-empty-state-actions">${opts.actions}</div>` : '';
        const tableClass = isTable ? 'component-empty-state--table' : '';

        return `
            <div class="component-empty-state ${tableClass}" ${refAttr}>
                ${graphicHtml}
                ${titleHtml}
                ${descHtml}
                ${actionsHtml}
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
            <span class="material-symbols-rounded">credit_card</span>
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
            <div class="component-group-item" data-pm-id="${cardId}">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        ${logoSvg}
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">${brandFormatted} •••• ${last4}</h2>
                        <p class="component-card__description">${expText}</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button type="button" class="component-button component-button--h36 component-button--danger" data-action="deletePaymentMethod" data-pm-id="${cardId}">${window.__('delete_card') || 'Eliminar tarjeta'}</button>
                </div>
            </div>
        `;
    },

    subscriptionCard: (data) => {
        let tierName = data.tier_name || '';
        if (!tierName && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
            const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === parseInt(data.tier, 10));
            if (found && found.name) tierName = found.name;
        }
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

        const btnClass = cancelAtEnd ? 'component-button--brand' : '';
        
        let renewText = cancelAtEnd ? window.__('status_canceled') : window.__('status_active');

        // Storage usage values
        const storage = data.storage || { used_mb: 0, max_mb: 20, remaining_mb: 20, used_percentage: 0 };
        const usedMB = storage.used_mb !== undefined ? storage.used_mb : 0;
        const maxMB = storage.max_mb !== undefined ? storage.max_mb : 20;
        const remainingMB = storage.remaining_mb !== undefined ? storage.remaining_mb : maxMB;
        const percentage = storage.used_percentage !== undefined ? storage.used_percentage : 0;

        const subtitleStorage = `Tu capacidad de almacenamiento · ${usedMB} MB de ${maxMB} MB utilizados (Quedan ${remainingMB} MB)`;
        const percentageText = `${percentage}% ${window.__('used') || 'usado'}`;
        const questionText = window.__('storage_question_upgrade');

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
                            <h2 class="component-card__title">${window.__('subscription_status_title') || window.__('auto_renewal')}</h2>
                            <p class="component-card__description">${renewText} (${dateLabel} ${dateVal})</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36 ${btnClass}" data-action="cancelOrReactivateSubscription" data-cancel-state="${!cancelAtEnd}">
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
                </div>

                <div class="component-progress-track">
                    <div class="component-progress-fill"></div>
                </div>
            </div>
        `;
    }
};