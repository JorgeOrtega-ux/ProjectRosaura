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
            this.modal = document.querySelector('[data-ref="modal-generate-invite"]');
            this.form = document.getElementById('form-generate-invite');
        }
        
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    destroy() {
        document.removeEventListener('click', this.handleGlobalClickBound);
        this.isInitialized = false;
    }

    handleGlobalClick(e) {
        if (!this.wrapper) return;

        const btnOpenModal = e.target.closest('[data-action="openGenerateInviteModal"]');
        const btnCloseModal = e.target.closest('[data-action="closeModal"]');
        const btnSubmit = e.target.closest('[data-action="submitGenerateInvite"]');
        const btnCopy = e.target.closest('[data-action="copyInviteCode"]');
        const btnRevoke = e.target.closest('[data-action="revokeInvite"]');

        if (btnOpenModal) this.openModal();
        if (btnCloseModal) this.closeModal();
        if (btnSubmit) {
            e.preventDefault();
            this.generateInvite();
        }
        if (btnCopy) this.copyToClipboard(btnCopy.dataset.code);
        if (btnRevoke) this.revokeInvite(btnRevoke.dataset.id);
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.remove('disabled');
            if (this.form) this.form.reset();
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.add('disabled');
        }
    }

    async generateInvite() {
        if (!this.form || !this.canvasId) return;

        const formData = new FormData(this.form);
        const data = {
            canvas_id: this.canvasId,
            role: formData.get('role'),
            max_uses: formData.get('max_uses') || null,
            expires_at: formData.get('expires_at') || null
        };
        
        if (data.expires_at) {
            const dt = new Date(data.expires_at);
            data.expires_at = dt.toISOString().slice(0, 19).replace('T', ' ');
        }

        try {
            const response = await this.api.post('canvases.generate_invite', data);
            
            if (response && response.success) {
                showMessage(response.message || 'Invitación generada exitosamente.', 'success');
                this.closeModal();
                
                // Recargar SPA
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${window.AppBasePath || ''}/canvases/manage/invites/${this.canvasUuid}`);
                } else {
                    window.location.reload();
                }
            } else {
                showMessage(response?.message || 'Error al generar la invitación.', 'error');
            }
        } catch (error) {
            console.error('Error generating invite:', error);
            showMessage('Error de conexión.', 'error');
        }
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
