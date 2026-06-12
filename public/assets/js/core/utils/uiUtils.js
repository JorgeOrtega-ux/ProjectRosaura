// public/assets/js/core/utils/uiUtils.js
import { SkeletonTemplates } from '../components/SkeletonTemplates.js';

/**
 * Muestra una notificación (toast) en la interfaz.
 * Aprovecha el método showToast del MainController (window.appInstance).
 * * @param {string} message - El mensaje a mostrar.
 * @param {string} type - 'success' o 'error'.
 */
export function showMessage(message, type = 'success') {
    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
        window.appInstance.showToast(message, type);
    } else {
        // Fallback de seguridad en caso de que MainController aún no esté instanciado
        console.warn(`[${type.toUpperCase()}] ${message}`);
    }
}

/**
 * Coloca un botón en estado de "cargando", deshabilitando la interacción
 * y mostrando un spinner, manteniendo su ancho original para evitar saltos visuales.
 * * @param {HTMLElement} btn - El elemento botón del DOM.
 */
export function setButtonLoading(btn) {
    if (!btn) return;
    
    // Guardamos el texto original y el ancho actual
    btn.dataset.originalText = btn.innerHTML;
    const currentWidth = btn.offsetWidth;
    
    if (currentWidth > 0) {
        btn.style.width = currentWidth + 'px';
    }
    
    btn.classList.add('disabled-interaction');
    btn.innerHTML = '<div class="component-spinner"></div>';
}

/**
 * Restaura un botón a su estado normal después de haber estado en carga.
 * * @param {HTMLElement} btn - El elemento botón del DOM.
 */
export function restoreButton(btn) {
    if (!btn) return;
    
    if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
    }
    
    btn.classList.remove('disabled-interaction');
    btn.style.width = ''; // Limpiamos el estilo en línea
}

/**
 * Inyecta un esqueleto de carga manualmente en un contenedor específico
 * Útil para sub-cargas asíncronas dentro de una vista ya cargada.
 * * @param {HTMLElement} container - El contenedor DOM
 * * @param {string} type - 'auth', 'table', 'form', 'settings', 'generic'
 */
export function renderSkeleton(container, type = 'generic') {
    if (!container) return;
    container.innerHTML = SkeletonTemplates.get(type);
}