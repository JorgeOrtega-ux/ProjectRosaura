import { SkeletonTemplates } from '../components/SkeletonTemplates.js';

/* ==========================================================================
   1. UI FEEDBACK & LOADING STATES
   ========================================================================== */

function showMessage(message, type = 'success') {
    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
        window.appInstance.showToast(message, type);
    }
}

function setButtonLoading(btn, loadingText = '') {
    if (!btn || btn.classList.contains('disabled-interaction')) return;
    
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

/* ==========================================================================
   2. TIERS & FEATURE ACCESS
   ========================================================================== */

function tierHasFeature(tierObj, featureKey) {
    if (!tierObj) return false;
    if (tierObj.is_active !== undefined && (parseInt(tierObj.is_active, 10) === 0 || tierObj.is_active === false)) {
        return false;
    }
    return tierObj[featureKey] === 1 || 
           tierObj['feat_' + featureKey] === 1 || 
           tierObj[featureKey] === true || 
           tierObj['feat_' + featureKey] === true;
}

function findTierForFeature(featureKey) {
    if (!window.APP_TIERS || !Array.isArray(window.APP_TIERS)) return null;
    const sorted = [...window.APP_TIERS].sort((a, b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
    return sorted.find(tier => tierHasFeature(tier, featureKey)) || null;
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
    const match = findTierForFeature(featureKey);
    return match ? match.name : '';
}

function isAdFreeUser() {
    const userTier = window.appUserTier ?? 0;
    if (userTier <= 0) return false;
    if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
        const userTierObj = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === userTier);
        if (userTierObj) {
            return tierHasFeature(userTierObj, 'feat_no_ads') || tierHasFeature(userTierObj, 'no_ads');
        }
    }
    return userTier > 0;
}

function getLockDetails(featureKey, elementType = 'button') {
    const userTier = window.appUserTier ?? 0;
    
    let hasFeature = false;
    if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
        const userTierObj = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === userTier);
        if (userTierObj) {
            hasFeature = tierHasFeature(userTierObj, featureKey);
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

    const matchedTier = findTierForFeature(featureKey);
    const requiredTierLevel = matchedTier ? parseInt(matchedTier.tier_level, 10) : 1;
    const requiredTierName = matchedTier ? matchedTier.name : 'Pro';

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

/* ==========================================================================
   3. COLOR & COORDINATE CONVERSION
   ========================================================================== */

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
    const root = document.documentElement;
    return root.classList.contains('dark-theme') || 
           root.classList.contains('dark') || 
           root.getAttribute('data-theme') === 'dark' ||
           (document.body && (document.body.classList.contains('dark-theme') || document.body.getAttribute('data-theme') === 'dark'));
}

/* ==========================================================================
   4. CAROUSEL & SCROLL COORDINATION
   ========================================================================== */

function updateNavButtons(carousel, leftBtn, rightBtn) {
    if (!carousel) return;
    if (leftBtn) {
        leftBtn.classList.toggle('disabled', carousel.scrollLeft <= 5);
    }
    if (rightBtn) {
        const canScrollRight = carousel.scrollWidth > carousel.clientWidth && 
                               Math.ceil(carousel.scrollLeft + carousel.clientWidth) < carousel.scrollWidth - 5;
        rightBtn.classList.toggle('disabled', !canScrollRight);
    }
}

function bindDragToScroll(carousel) {
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

function initCarouselScroll(wrapper) {
    if (!wrapper) return null;

    const carousel = wrapper.querySelector('.component-tags-carousel, .component-tabs-header');
    const leftBtn = wrapper.querySelector('.component-tag-nav-left, [data-action$="Left"]');
    const rightBtn = wrapper.querySelector('.component-tag-nav-right, [data-action$="Right"]');

    if (!carousel) return null;

    const updateButtons = () => updateNavButtons(carousel, leftBtn, rightBtn);

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
        bindDragToScroll(carousel);
    }

    setTimeout(updateButtons, 100);

    return { updateButtons };
}

/* ==========================================================================
   5. SKELETONS & VIRTUAL GRID
   ========================================================================== */

function appendInfiniteScrollSkeletons(container, count = 4, gridSelector = '.component-grid') {
    if (!container) return;
    const grid = container.querySelector(gridSelector) || container;
    if (grid) {
        let skeletonCards = '';
        for (let i = 0; i < count; i++) {
            skeletonCards += `<div class="component-skeleton component-skeleton--card infinite-scroll-skeleton"></div>`;
        }
        grid.insertAdjacentHTML('beforeend', skeletonCards);
    }
}

function removeInfiniteScrollSkeletons(container) {
    if (!container) return;
    const skeletons = container.querySelectorAll('.infinite-scroll-skeleton');
    skeletons.forEach(s => s.remove());
}

function renderVirtualGridItems(container, items, virtualObserver, isLoadMore = false, gridDataRef = 'home-all-canvases') {
    if (!container) return null;

    let grid = container.querySelector('.component-grid');

    if (!isLoadMore || !grid) {
        container.innerHTML = `<div class="component-grid" data-ref="${gridDataRef}"></div>`;
        grid = container.querySelector('.component-grid');
        if (virtualObserver) {
            virtualObserver.disconnect();
            virtualObserver.initObserver();
        }
    }

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const wrapper = document.createElement('div');
        if (virtualObserver) {
            virtualObserver.observe(wrapper, item);
        }
        fragment.appendChild(wrapper);
    });

    grid.appendChild(fragment);
    return grid;
}

function setupGridInfiniteScroll({ container, hasMore, currentObserver = null, onIntersect, rootMargin = '200px' }) {
    if (currentObserver) {
        currentObserver.disconnect();
    }

    if (!hasMore || !container) return null;

    const cards = container.querySelectorAll('.virtual-card-container, .component-card');
    if (cards.length === 0) return null;

    const lastCard = cards[cards.length - 1];

    const observer = new IntersectionObserver((entries) => {
        if (entries[0] && entries[0].isIntersecting) {
            observer.disconnect();
            if (typeof onIntersect === 'function') {
                onIntersect();
            }
        }
    }, { rootMargin });

    observer.observe(lastCard);
    return observer;
}

/* ==========================================================================
   6. DROPDOWN & MODULE VISIBILITY
   ========================================================================== */

function setModuleActiveState(moduleEl, isActive) {
    if (!moduleEl) return;
    moduleEl.classList.toggle('active', isActive);
    moduleEl.classList.toggle('disabled', !isActive);
}

function toggleDropdown(target, triggerEl = null) {
    if (!target && triggerEl) {
        target = triggerEl.getAttribute('data-target');
    }
    if (window.appInstance && window.appInstance.moduleManager) {
        window.appInstance.moduleManager.toggle(target, triggerEl);
    } else {
        const moduleEl = typeof target === 'string' 
            ? document.querySelector(`[data-module="${target}"]`) 
            : target;
        if (!moduleEl) return;
        const isCurrentlyActive = !moduleEl.classList.contains('disabled');
        if (isCurrentlyActive) {
            setModuleActiveState(moduleEl, false);
        } else {
            document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
                setModuleActiveState(el, false);
            });
            setModuleActiveState(moduleEl, true);
        }
    }
}

function closeDropdown(target) {
    if (!target) return;
    if (window.appInstance && window.appInstance.moduleManager) {
        window.appInstance.moduleManager.close(target);
    } else {
        const moduleEl = typeof target === 'string' 
            ? document.querySelector(`[data-module="${target}"]`) 
            : target;
        if (moduleEl) {
            setModuleActiveState(moduleEl, false);
        }
    }
}

function closeAllDropdowns(except = null) {
    if (window.appInstance && window.appInstance.moduleManager) {
        window.appInstance.moduleManager.closeAllModules(except);
    } else {
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            if (except && el === except) return;
            setModuleActiveState(el, false);
        });
    }
}

/* ==========================================================================
   7. INPUT & TOOLBAR HELPERS
   ========================================================================== */

async function copyToClipboard(text, successMsg = null, errorMsg = null) {
    if (!text && text !== '') return false;
    try {
        await navigator.clipboard.writeText(text);
        if (successMsg) {
            showMessage(successMsg, 'success');
        }
        return true;
    } catch (err) {
        if (errorMsg) {
            showMessage(errorMsg, 'error');
        }
        return false;
    }
}

function togglePasswordVisibility(toggleBtn) {
    if (!toggleBtn) return;
    const inputGroup = toggleBtn.closest('.component-input-group') || toggleBtn.parentElement;
    if (!inputGroup) return;

    const inputField = inputGroup.querySelector('.component-input-field, input[type="password"], input[type="text"]');
    if (!inputField) return;

    const iconSpan = toggleBtn.querySelector('.material-symbols-rounded') || toggleBtn;

    if (inputField.type === 'password') {
        inputField.type = 'text';
        if (iconSpan) iconSpan.textContent = 'visibility';
    } else {
        inputField.type = 'password';
        if (iconSpan) iconSpan.textContent = 'visibility_off';
    }
}

function toggleSearchToolbar(toolbarSelector = '[data-ref="search-toolbar"]', inputSelector = '[data-ref$="-search-input"]') {
    const searchToolbar = typeof toolbarSelector === 'string' ? document.querySelector(toolbarSelector) : toolbarSelector;
    if (!searchToolbar) return;

    const searchInput = typeof inputSelector === 'string' ? document.querySelector(inputSelector) : inputSelector;
    
    const filtersModule = document.querySelector('[data-module$="Filters"]');
    if (filtersModule && !filtersModule.classList.contains('disabled')) {
        if (window.appInstance && typeof window.appInstance.closeModule === 'function') {
            window.appInstance.closeModule(filtersModule);
        } else {
            setModuleActiveState(filtersModule, false);
        }
    }

    const isClosed = searchToolbar.classList.contains('disabled');
    setModuleActiveState(searchToolbar, isClosed);
    if (isClosed && searchInput) {
        setTimeout(() => searchInput.focus(), 50);
    }
}

function handleOutsideSearchToolbarClick(e, searchBtn = null, toolbarSelector = '[data-ref="search-toolbar"]') {
    const searchToolbar = typeof toolbarSelector === 'string' ? document.querySelector(toolbarSelector) : toolbarSelector;
    if (!searchToolbar || searchToolbar.classList.contains('disabled')) return;

    const isInsideToolbar = e.target.closest(typeof toolbarSelector === 'string' ? toolbarSelector : '[data-ref="search-toolbar"]');
    const isSearchBtn = searchBtn && (e.target === searchBtn || e.target.closest('[data-action$="Search"], [data-ref="btn-toggle-search"]'));

    if (!isInsideToolbar && !isSearchBtn) {
        setModuleActiveState(searchToolbar, false);
    }
}

function openFilterSubMenu(btn, mainRef = 'menuMainFilters') {
    if (!btn) return;
    const targetId = btn.getAttribute('data-target');
    const targetMenu = document.querySelector(`[data-ref="${targetId}"]`);
    const mainFilters = document.querySelector(`[data-ref="${mainRef}"]`);
    if (targetMenu && mainFilters) {
        setModuleActiveState(mainFilters, false);
        setModuleActiveState(targetMenu, true);
    }
}

function backToMainFilters(mainRef = 'menuMainFilters', moduleRef = null) {
    const mainFilters = document.querySelector(`[data-ref="${mainRef}"]`);
    const subMenus = document.querySelectorAll(
        moduleRef 
            ? `[data-module="${moduleRef}"] .component-menu:not([data-ref="${mainRef}"])` 
            : `.component-menu:not([data-ref="${mainRef}"])`
    );
    if (mainFilters) {
        subMenus.forEach(menu => setModuleActiveState(menu, false));
        setModuleActiveState(mainFilters, true);
    }
}

/* ==========================================================================
   8. CLIENT-SIDE SEARCH & FILTERING
   ========================================================================== */

function applyLocalTableSearch({
    inputRef = 'search-input',
    containerRef = 'view-table',
    rowSelector = '.component-table-row',
    targetSelector = '.search-target',
    emptyRef = 'empty-search-table',
    searchBtnRef = 'btn-toggle-search'
} = {}) {
    const queryInput = typeof inputRef === 'string' 
        ? document.querySelector(`[data-ref="${inputRef}"]`) || document.querySelector(inputRef)
        : inputRef;
    const query = (queryInput ? queryInput.value : '').toLowerCase().trim();

    const searchBtn = typeof searchBtnRef === 'string'
        ? document.querySelector(`[data-ref="${searchBtnRef}"]`) || document.querySelector(searchBtnRef)
        : searchBtnRef;
    if (searchBtn) {
        searchBtn.classList.toggle('has-active-filter', query.length > 0);
    }

    const container = typeof containerRef === 'string'
        ? document.querySelector(`[data-ref="${containerRef}"]`) || document.querySelector(containerRef)
        : containerRef;
    if (!container) return { visibleCount: 0, query };

    let visibleCount = 0;
    let lastVisibleItem = null;
    const items = container.querySelectorAll(rowSelector);

    items.forEach(item => {
        item.classList.remove('last-visible-row');
        
        let textContent = '';
        const targets = item.querySelectorAll(targetSelector);
        if (targets.length > 0) {
            textContent = Array.from(targets).map(el => el.textContent.toLowerCase()).join(' ');
        } else {
            textContent = item.textContent.toLowerCase();
        }

        if (!query || textContent.includes(query)) {
            item.classList.remove('disabled');
            visibleCount++;
            lastVisibleItem = item;
        } else {
            item.classList.add('disabled');
        }
    });

    if (lastVisibleItem) {
        lastVisibleItem.classList.add('last-visible-row');
    }

    const emptyElement = typeof emptyRef === 'string'
        ? document.querySelector(`[data-ref="${emptyRef}"]`) || document.querySelector(emptyRef)
        : emptyRef;
    if (emptyElement) {
        emptyElement.classList.toggle('disabled', visibleCount > 0);
    }

    return { visibleCount, query };
}

function filterMenuList(searchInput, menuList = null, emptyClass = 'component-menu-empty') {
    if (!searchInput) return;
    const query = (searchInput.value || '').toLowerCase().trim();
    const list = menuList || (searchInput.closest('.component-menu') ? searchInput.closest('.component-menu').querySelector('.component-menu-list') : null);
    if (!list) return;

    let hasVisible = false;
    list.querySelectorAll(`.component-menu-link:not(.${emptyClass} .component-menu-link)`).forEach(link => {
        const textEl = link.querySelector('.component-menu-link-text') || link;
        const text = textEl ? textEl.textContent.toLowerCase() : '';
        if (!query || text.includes(query)) {
            link.classList.remove('disabled');
            link.style.display = '';
            hasVisible = true;
        } else {
            link.classList.add('disabled');
            link.style.display = 'none';
        }
    });

    let emptyEl = list.querySelector(`.${emptyClass}`);
    if (!emptyEl && !hasVisible) {
        emptyEl = document.createElement('div');
        emptyEl.className = emptyClass;
        const notFoundText = window.__ ? window.__('no_results_found') : 'No results found';
        emptyEl.innerHTML = `<div class="component-menu-link disabled-interaction"><div class="component-menu-link-icon"><span class="material-symbols-rounded">search_off</span></div><div class="component-menu-link-text"><span>${notFoundText}</span></div></div>`;
        list.appendChild(emptyEl);
    }
    if (emptyEl) {
        emptyEl.hidden = hasVisible;
        emptyEl.style.display = hasVisible ? 'none' : '';
    }
}

function handleNumberAdjustment(btn, currentValue, onChange = null) {
    if (!btn) return currentValue;
    const step = parseFloat(btn.getAttribute('data-step') || '1');
    const min = btn.getAttribute('data-min') !== null ? parseFloat(btn.getAttribute('data-min')) : -Infinity;
    const max = btn.getAttribute('data-max') !== null ? parseFloat(btn.getAttribute('data-max')) : Infinity;

    let newVal = parseFloat(currentValue || 0) + step;
    if (newVal < min) newVal = min;
    if (newVal > max) newVal = max;

    if (Number.isInteger(step)) {
        newVal = Math.round(newVal);
    } else {
        newVal = parseFloat(newVal.toFixed(2));
    }

    if (typeof onChange === 'function') onChange(newVal);
    return newVal;
}

function handleInlineNumberAdjustment(btn, onChange = null) {
    if (!btn) return null;
    const field = btn.getAttribute('data-field');
    const center = document.querySelector(`[data-ref="val_${field}"]`);
    if (!center) return null;

    const currentVal = parseFloat(center.getAttribute('data-value') || '0');
    const newVal = handleNumberAdjustment(btn, currentVal, (val) => {
        center.setAttribute('data-value', val);
        const showPlus = btn.hasAttribute('data-show-plus') || center.hasAttribute('data-show-plus');
        center.textContent = (val > 0 && showPlus ? '+' : '') + val;
        if (typeof onChange === 'function') onChange(val, field);
    });
    return newVal;
}

function updateFilterIndicator(buttonEl, isActive) {
    if (!buttonEl) return;
    buttonEl.classList.toggle('has-active-filter', !!isActive);
}

export { 
    showMessage, 
    setButtonLoading, 
    restoreButton, 
    renderSkeleton, 
    escapeHTML, 
    formatNumber, 
    tierHasFeature,
    findTierForFeature,
    getDynamicTierName, 
    getLowestTierForFeature,
    isAdFreeUser,
    getLockDetails,
    hexToHsv,
    hsvToHex,
    getEventCoords,
    debounce,
    catchPaginationClick,
    getAllPalettes,
    localInputFormatToUtcString,
    isDarkMode,
    initCarouselScroll,
    appendInfiniteScrollSkeletons,
    removeInfiniteScrollSkeletons,
    renderVirtualGridItems,
    setupGridInfiniteScroll,
    toggleDropdown,
    closeDropdown,
    closeAllDropdowns,
    toggleDropdown as toggleModule,
    closeDropdown as closeModule,
    copyToClipboard,
    togglePasswordVisibility,
    toggleSearchToolbar,
    handleOutsideSearchToolbarClick,
    openFilterSubMenu,
    backToMainFilters,
    applyLocalTableSearch,
    filterMenuList,
    handleNumberAdjustment,
    handleInlineNumberAdjustment,
    updateFilterIndicator
};