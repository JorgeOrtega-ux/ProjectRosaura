// public/assets/js/modules/settings/DevicesController.js
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class DevicesController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    handleClick(e) {
        const btnRevokeAll = e.target.closest('[data-action="revokeAllDevices"]');
        if (btnRevokeAll) this.revokeAllDevices(btnRevokeAll);

        const btnRevoke = e.target.closest('[data-action="revokeDevice"]');
        if (btnRevoke) this.revokeDevice(btnRevoke);
    }

    async revokeDevice(btn) {
        const id = btn.getAttribute('data-id');
        setButtonLoading(btn);
        
        const res = await this.api.post(ApiRoutes.Settings.RevokeDevice, { device_id: id }, this.abortController.signal);
        restoreButton(btn);
        
        if (res.success) { 
            showMessage(res.message, 'success'); 
            
            // UX mejorada: Remueve el div completo de ese dispositivo sin recargar la página.
            const deviceRow = document.getElementById(`device-row-${id}`);
            if (deviceRow) {
                // Removemos el divisor <hr> que le sigue (si existe) para mantener la vista limpia
                const nextElement = deviceRow.nextElementSibling;
                if (nextElement && nextElement.tagName === 'HR') nextElement.remove();
                
                deviceRow.remove();
            }
        } else {
            showMessage(res.message, 'error');
        }
    }

    async revokeAllDevices(btn) {
        const isConfirmed = await window.dialogSystem.show('confirmRevokeAllDevices');
        if (!isConfirmed.confirmed) return;
        
        setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.RevokeAllDevices, { type: isConfirmed.action }, this.abortController.signal);
        restoreButton(btn);
        
        if (res.success) {
            showMessage(res.message, 'success');
            if (isConfirmed.action === 'revoke_all') {
                window.location.href = this.basePath + '/login';
            } else {
                // Si borró "las demás" recargamos limpiamente (o usamos tu enrutador SPA)
                window.location.reload(); 
            }
        } else {
            showMessage(res.message, 'error');
        }
    }
}

export { DevicesController };