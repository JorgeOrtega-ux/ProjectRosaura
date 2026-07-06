import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

class CanvasInvitesController {
    constructor() {
        this.api = new ApiService();
        this.isInitialized = false;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        this.wrapper = document.querySelector('[data-ref="manage-invites-wrapper"]');
        if (this.wrapper) {
            this.canvasId = this.wrapper.dataset.canvasId;
            this.canvasUuid = this.wrapper.dataset.canvasUuid;
        }
        
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    destroy() {
        document.removeEventListener('click', this.handleGlobalClickBound);
        this.isInitialized = false;
    }

    handleGlobalClick(e) {
        if (!this.wrapper) return;

        const btnCopy = e.target.closest('[data-action="copyInviteCode"]');
        const btnRevoke = e.target.closest('[data-action="revokeInvite"]');

        if (btnCopy) this.copyToClipboard(btnCopy.dataset.code);
        if (btnRevoke) this.revokeInvite(btnRevoke.dataset.id);
    }



    async revokeInvite(inviteId) {
        if (!confirm('¿Estás seguro de que deseas revocar esta invitación?')) return;

        try {
            const response = await this.api.post('canvases.revoke_invite', {
                canvas_id: this.canvasId,
                invite_id: inviteId
            });

            if (response && response.success) {
                showMessage('Invitación revocada.', 'success');
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${window.AppBasePath || ''}/canvases/manage/invites/${this.canvasUuid}`);
                } else {
                    window.location.reload();
                }
            } else {
                showMessage(response?.message || 'Error al revocar.', 'error');
            }
        } catch (error) {
            console.error('Error revoking invite:', error);
            showMessage('Error de conexión.', 'error');
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('Código copiado al portapapeles.', 'success');
        }).catch(err => {
            console.error('Error al copiar:', err);
            showMessage('No se pudo copiar el código.', 'error');
        });
    }
}

export { CanvasInvitesController };
