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

export { showMessage, setButtonLoading, restoreButton, renderSkeleton, escapeHTML, formatNumber };