// public/assets/js/core/utils/uiUtils.js
import { SkeletonTemplates } from '../components/SkeletonTemplates.js';

function showMessage(message, type = 'success') {
    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
        window.appInstance.showToast(message, type);
    }
}

function setButtonLoading(btn, text = null) {
    if (!btn) return;
    
    btn.dataset.originalText = btn.innerHTML;
    
    btn.classList.add('disabled-interactive');
    if (text) {
        btn.innerHTML = `<div class="component-spinner"></div><span style="margin-left: 8px;">${text}</span>`;
    } else {
        btn.innerHTML = '<div class="component-spinner"></div>';
    }
}

function restoreButton(btn) {
    if (!btn) return;
    
    if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
    }
    
    btn.classList.remove('disabled-interactive');
}

function renderSkeleton(container, type = 'generic') {
    if (!container) return;
    container.innerHTML = SkeletonTemplates.get(type);
}

// NUEVO: Utilidad centralizada para prevenir ataques XSS
function escapeHTML(str) {
    if (!str) return '';
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

export { showMessage, setButtonLoading, restoreButton, renderSkeleton, escapeHTML };