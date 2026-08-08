import { SkeletonTemplates } from '../components/SkeletonTemplates.js';

function showMessage(message, type = 'success') {
    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
        window.appInstance.showToast(message, type);
    }
}

function setButtonLoading(btn, loadingText = '') {
    if (!btn) return;
    
    btn.dataset.originalText = btn.innerHTML;
    btn.classList.add('disabled-interaction');
    
    if (loadingText) {
        btn.innerHTML = `<span class="component-spinner component-spinner--small"></span> ${loadingText}`;
    } else {
        btn.innerHTML = '<div class="component-spinner"></div>';
    }
}

function restoreButton(btn) {
    if (!btn) return;
    
    if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
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

export { 
    showMessage, 
    setButtonLoading, 
    restoreButton, 
    renderSkeleton, 
    escapeHTML, 
    formatNumber, 
    getDynamicTierName, 
    getLowestTierForFeature,
    hexToHsv,
    hsvToHex,
    getEventCoords,
    debounce,
    catchPaginationClick,
    getAllPalettes,
    localInputFormatToUtcString,
    isDarkMode
};