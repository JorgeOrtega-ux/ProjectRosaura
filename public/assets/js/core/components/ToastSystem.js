/**
 * ToastSystem — Sistema de notificaciones toast.
 * Extrae showToast de MainController para reutilización limpia.
 */
export class ToastSystem {
    /**
     * @param {function} getPrefFn - Función para obtener preferencias del usuario (extended_alerts)
     */
    constructor(getPrefFn = null) {
        this._getPref = getPrefFn;
    }

    /**
     * Muestra una notificación toast.
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} type
     */
    show(message, type = 'success') {
        let container = document.querySelector('[data-ref="toast-container"]');
        if (!container) {
            container = document.createElement('div');
            container.setAttribute('data-ref', 'toast-container');
            container.className = 'component-toast';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'component-toast-item';

        let iconName = 'check_circle';
        if (type === 'error')   iconName = 'error';
        if (type === 'warning') iconName = 'warning';
        if (type === 'info')    iconName = 'info';

        let displayText = message;
        if (typeof window.__ === 'function' && typeof message === 'string' && message.trim() !== '') {
            const translated = window.__(message);
            if (translated) displayText = translated;
        }

        toast.innerHTML = `<div class="component-toast-icon"><span class="material-symbols-rounded">${iconName}</span></div><div class="component-toast-text">${displayText}</div>`;

        container.appendChild(toast);
        void toast.offsetHeight;
        requestAnimationFrame(() => toast.classList.add('active'));

        const extendedAlerts = this._getPref
            ? (this._getPref('extended_alerts') == 1 || this._getPref('extended_alerts') == '1')
            : false;
        const duration = extendedAlerts ? 8000 : 4000;

        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => {
                toast.remove();
                if (container.childNodes.length === 0 && container.parentNode) {
                    container.remove();
                }
            }, 300);
        }, duration);
    }
}
