import { SkeletonTemplates } from '../components/SkeletonTemplates.js';

function showMessage(message, type = 'success') {
    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
        window.appInstance.showToast(message, type);
    }
}

function setButtonLoading(btn, loadingText = '') {
    if (!btn) return;
    
    // Avoid setting loading multiple times if already loading
    if (btn.classList.contains('disabled-interaction')) return;
    
    btn.classList.add('disabled-interaction');
    
    if (loadingText) {
        if (btn.dataset.originalText === undefined || btn.dataset.originalText === null) {
            btn.dataset.originalText = btn.innerHTML;
        }
        btn.innerHTML = `<span class="component-spinner"></span> ${loadingText}`;
    } else {
        btn.classList.add('component-button--processing');
        const spinner = document.createElement('span');
        spinner.className = 'component-spinner component-button-loading-spinner';
        btn.appendChild(spinner);
    }
}

function restoreButton(btn) {
    if (!btn) return;
    
    if (btn.dataset.originalText !== undefined && btn.dataset.originalText !== null) {
        btn.innerHTML = btn.dataset.originalText;
        delete btn.dataset.originalText;
    }
    
    if (btn.classList.contains('component-button--processing')) {
        btn.classList.remove('component-button--processing');
        const spinner = btn.querySelector('.component-button-loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
    
    btn.classList.remove('disabled-interaction');
}

function renderSkeleton(container, type = 'generic') {
    if (!container) return;
    container.innerHTML = SkeletonTemplates.get(type);
}

function escapeHTML(str) {
    if (!str) return '';
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('en-US');
}

function getDynamicTierName(tierLevel) {
    const level = parseInt(tierLevel, 10);
    if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
        const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === level);
        if (found && found.name) return found.name;
    }
    return '';
}

function getLowestTierForFeature(featureKey) {
    if (!window.APP_TIERS || !Array.isArray(window.APP_TIERS)) return '';
    const sorted = [...window.APP_TIERS].sort((a, b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
    const match = sorted.find(t => {
        if (t.is_active !== undefined && (parseInt(t.is_active, 10) === 0 || t.is_active === false)) return false;
        return t[featureKey] === 1 || t['feat_' + featureKey] === 1 || t[featureKey] === true || t['feat_' + featureKey] === true;
    });
    return match ? match.name : '';
}

function getLockDetails(featureKey, elementType = 'button') {
    const userTier = window.appUserTier ?? 0;
    
    let hasFeature = false;
    if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
        const userTierObj = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === userTier);
        if (userTierObj) {
            hasFeature = userTierObj[featureKey] === 1 || userTierObj['feat_' + featureKey] === 1 || 
                         userTierObj[featureKey] === true || userTierObj['feat_' + featureKey] === true;
        }
    }

    if (hasFeature) {
        return {
            isLocked: false,
            classStr: '',
            attributesStr: '',
            badgeHtml: ''
        };
    }

    let requiredTierLevel = 1;
    let requiredTierName = 'Pro';
    if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
        const sorted = [...window.APP_TIERS].sort((a, b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
        const match = sorted.find(t => {
            if (t.is_active !== undefined && (parseInt(t.is_active, 10) === 0 || t.is_active === false)) return false;
            return t[featureKey] === 1 || t['feat_' + featureKey] === 1 || t[featureKey] === true || t['feat_' + featureKey] === true;
        });
        if (match) {
            requiredTierLevel = parseInt(match.tier_level, 10);
            requiredTierName = match.name;
        }
    }

    let classStr = 'premium-locked';
    if (elementType === 'button') {
        classStr += ' component-button--premium';
    }
    
    const attributesStr = ` data-requires-premium="true" data-required-tier="${requiredTierLevel}"`;
    
    let badgeHtml = '';
    if (elementType === 'link') {
        badgeHtml = ` <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ${escapeHTML(requiredTierName)}</span>`;
    }

    return {
        isLocked: true,
        classStr,
        attributesStr,
        badgeHtml
    };
}

function hexToHsv(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    let r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
    let g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
    let b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max, d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToHex(h, s, v) {
    h /= 360; s /= 100; v /= 100;
    let r, g, b;
    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function getEventCoords(e) {
    if (e.touches && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
}

function debounce(func, wait = 400) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function catchPaginationClick(e, callback) {
    const target = e.target.closest('a[href], button[data-nav]');
    if (!target) return;
    const url = target.getAttribute('href') || target.getAttribute('data-nav') || '';
    const isPaginationLink = url.includes('page=') || 
                             target.closest('[class*="pagin"]') || 
                             target.closest('[data-ref="pagination-container"]') || 
                             target.hasAttribute('data-action', 'paginate');
    if (isPaginationLink && url !== '#' && !url.includes('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (typeof callback === 'function') {
            callback(url);
        }
    }
}

function getAllPalettes() {
    let palettes = [];
    if (window.APP_PALETTES) {
        palettes = Object.values(window.APP_PALETTES);
    }
    if (window.APP_CUSTOM_PALETTES && Array.isArray(window.APP_CUSTOM_PALETTES)) {
        window.APP_CUSTOM_PALETTES.forEach(cp => {
            palettes.push({
                id: cp.palette_key,
                name_key: cp.name,
                colors: cp.colors.map(c => ({ hex: c }))
            });
        });
    }
    return palettes;
}

function localInputFormatToUtcString(localString) {
    if (!localString) return null;
    const dateObj = new Date(localString);
    if (isNaN(dateObj.getTime())) return null;

    const yyyy = dateObj.getUTCFullYear();
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    const hh = String(dateObj.getUTCHours()).padStart(2, '0');
    const min = String(dateObj.getUTCMinutes()).padStart(2, '0');
    const ss = '00';

    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function isDarkMode() {
    const html = document.documentElement;
    const body = document.body;
    return html.classList.contains('dark-theme') || 
           html.classList.contains('dark') || 
           html.getAttribute('data-theme') === 'dark' ||
           body.classList.contains('dark-theme') || 
           body.classList.contains('dark') || 
           body.getAttribute('data-theme') === 'dark';
}

function initCarouselScroll(wrapper) {
    if (!wrapper) return null;

    const carousel = wrapper.querySelector('.component-tags-carousel, .component-tabs-header');
    const leftBtn = wrapper.querySelector('.component-tag-nav-left, [data-action$="Left"]');
    const rightBtn = wrapper.querySelector('.component-tag-nav-right, [data-action$="Right"]');

    if (!carousel) return null;

    const updateButtons = () => {
        if (leftBtn) {
            if (carousel.scrollLeft > 5) leftBtn.classList.remove('disabled');
            else leftBtn.classList.add('disabled');
        }
        if (rightBtn) {
            if (carousel.scrollWidth > carousel.clientWidth && Math.ceil(carousel.scrollLeft + carousel.clientWidth) < carousel.scrollWidth - 5) {
                rightBtn.classList.remove('disabled');
            } else {
                rightBtn.classList.add('disabled');
            }
        }
    };

    if (leftBtn && !leftBtn.hasAttribute('data-carousel-bound')) {
        leftBtn.setAttribute('data-carousel-bound', 'true');
        leftBtn.addEventListener('click', (e) => {
            e.preventDefault();
            carousel.scrollBy({ left: -220, behavior: 'smooth' });
            setTimeout(updateButtons, 300);
        });
    }

    if (rightBtn && !rightBtn.hasAttribute('data-carousel-bound')) {
        rightBtn.setAttribute('data-carousel-bound', 'true');
        rightBtn.addEventListener('click', (e) => {
            e.preventDefault();
            carousel.scrollBy({ left: 220, behavior: 'smooth' });
            setTimeout(updateButtons, 300);
        });
    }

    if (!carousel.hasAttribute('data-carousel-bound')) {
        carousel.setAttribute('data-carousel-bound', 'true');
        carousel.addEventListener('scroll', updateButtons);
        window.addEventListener('resize', updateButtons);

        let isDown = false;
        let startX;
        let scrollLeft;
        let isDragging = false;

        carousel.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, a, input, select, .component-tab-close')) return;
            isDown = true;
            isDragging = false;
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });

        carousel.addEventListener('mouseleave', () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
        });

        carousel.addEventListener('mouseup', () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
            setTimeout(() => { isDragging = false; }, 50);
        });

        carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2;
            if (Math.abs(walk) > 5) {
                isDragging = true;
                carousel.classList.add('is-dragging');
            }
            if (isDragging) {
                carousel.scrollLeft = scrollLeft - walk;
            }
        });

        carousel.addEventListener('click', (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true });
    }

    setTimeout(updateButtons, 100);

    return { updateButtons };
}

export { 
    showMessage, 
    setButtonLoading, 
    restoreButton, 
    renderSkeleton, 
    escapeHTML, 
    formatNumber, 
    getDynamicTierName, 
    getLowestTierForFeature,
    getLockDetails,
    hexToHsv,
    hsvToHex,
    getEventCoords,
    debounce,
    catchPaginationClick,
    getAllPalettes,
    localInputFormatToUtcString,
    isDarkMode,
    initCarouselScroll
};