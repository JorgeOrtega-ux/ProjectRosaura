// public/assets/js/core/components/CanvasCardInteractions.js

import { ApiRoutes } from '../api/ApiRoutes.js';
import { showMessage } from '../utils/uiUtils.js';

export class CanvasCardInteractions {
    constructor(apiService, basePath, abortController) {
        this.api = apiService;
        this.basePath = basePath || '';
        this.abortController = abortController;
    }

    /**
     * Enruta la acción al método correspondiente.
     * @returns {boolean} Retorna true si la acción fue manejada, false si no.
     */
    handleAction(action, btn) {
        if (action === 'openCanvasNewTab') {
            this.openCanvasNewTab(btn);
            return true;
        } else if (action === 'copyCanvasLink') {
            this.copyCanvasLink(btn);
            return true;
        } else if (action === 'deleteCanvas') {
            this.deleteCanvas(btn);
            return true;
        } else if (action === 'leaveCanvas') {
            this.leaveCanvas(btn);
            return true;
        } else if (action === 'viewCanvasSnapshots') {
            this.viewCanvasSnapshots(btn);
            return true;
        } else if (action === 'toggleFavorite') {
            this.toggleFavorite(btn);
            return true;
        }
        return false;
    }

    // ==========================================
    // LÓGICA DE FAVORITOS (Sin contador numérico)
    // ==========================================
    async toggleFavorite(btn) {
        if (btn.classList.contains('disabled-interactive')) return;
        
        const canvasId = btn.getAttribute('data-id');
        if (!canvasId) return;

        btn.classList.add('disabled-interactive');

        const res = await this.api.toggleFavorite(canvasId);

        btn.classList.remove('disabled-interactive');

        if (res && res.success) {
            // Solo manejamos el estado visual de la clase
            if (res.data.action === 'added') {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
        } else {
            showMessage(res.message || (window.__ ? window.__('err_default') : 'Error'), 'error');
        }
    }

    // ==========================================
    // LÓGICA DE MENÚS Y NAVEGACIÓN
    // ==========================================
    viewCanvasSnapshots(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            this.closeDropdowns();
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/design/s/${uuid}`);
            } else {
                window.location.href = `${this.basePath}/design/s/${uuid}`;
            }
        }
    }

    openCanvasNewTab(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            window.open(`${this.basePath}/design/${uuid}`, '_blank');
        }
    }

    async copyCanvasLink(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            const url = `${window.location.origin}${this.basePath}/design/${uuid}`;
            try {
                await navigator.clipboard.writeText(url);
                showMessage(window.__('msg_link_copied'), 'success');
                this.closeDropdowns();
            } catch (err) {
                showMessage(window.__('err_default'), 'error');
            }
        }
    }

    // ==========================================
    // LÓGICA DE DESTRUCCIÓN / ABANDONO
    // ==========================================
    async deleteCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        this.closeDropdowns();

        if (window.dialogSystem) {
            const confirm = await window.dialogSystem.show('confirmDeleteCanvas', { uuid: uuid });
            if (!confirm.confirmed) return;
        }

        const res = await this.api.post(ApiRoutes.Canvases.Delete, { uuid: uuid }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(window.__('msg_canvas_deleted'), 'success');
            const card = document.querySelector(`.component-snapshot-card[data-card-id="${id}"]`);
            if (card) card.remove();
        } else {
            showMessage(res.message, 'error');
        }
    }

    async leaveCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        this.closeDropdowns();

        if (window.dialogSystem) {
            const confirm = await window.dialogSystem.show('confirmLeaveCanvas', { uuid: uuid });
            if (!confirm.confirmed) return;
        }

        const res = await this.api.post(ApiRoutes.Canvases.Leave, { uuid: uuid }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(window.__('msg_canvas_left'), 'success');
            const card = document.querySelector(`.component-snapshot-card[data-card-id="${id}"]`);
            if (card) card.remove();
        } else {
            showMessage(res.message, 'error');
        }
    }

    closeDropdowns() {
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            el.classList.remove('active');
            el.classList.add('disabled');
        });
    }
}