import { SkeletonTemplates } from '../components/SkeletonTemplates.js';

function showMessage(message, type = 'success') {
    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
        window.appInstance.showToast(message, type);
    }
}

function setButtonLoading(btn) {
    if (!btn) return;
    
    btn.dataset.originalText = btn.innerHTML;
    
    btn.classList.add('disabled-interaction');
    btn.innerHTML = '<div class="component-spinner"></div>';
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
    return level === 3 ? 'Ultra' : (level === 1 ? 'Plus' : 'Pro');
}

function getLowestTierForFeature(featureKey) {
    if (!window.APP_TIERS || !Array.isArray(window.APP_TIERS)) return 'Pro';
    const sorted = [...window.APP_TIERS].sort((a, b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
    const match = sorted.find(t => {
        if (t.is_active !== undefined && (parseInt(t.is_active, 10) === 0 || t.is_active === false)) return false;
        return t[featureKey] === 1 || t['feat_' + featureKey] === 1 || t[featureKey] === true || t['feat_' + featureKey] === true;
    });
    return match ? match.name : 'Pro';
}

export { showMessage, setButtonLoading, restoreButton, renderSkeleton, escapeHTML, formatNumber, getDynamicTierName, getLowestTierForFeature };