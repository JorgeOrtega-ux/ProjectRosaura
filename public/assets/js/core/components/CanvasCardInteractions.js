import { ApiRoutes } from '../api/ApiRoutes.js';
import { showMessage } from '../utils/uiUtils.js';

export class CanvasCardInteractions {
    constructor(apiService, basePath, abortController) {
        this.api = apiService;
        this.basePath = basePath || '';
        this.abortController = abortController;
    }

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
        } else if (action === 'downgradeCanvas') {
            this.downgradeCanvas(btn);
            return true;
        }
        return false;
    }

    async toggleFavorite(btn) {
        if (btn.classList.contains('disabled-interactive')) return;
        
        const canvasId = btn.getAttribute('data-id');
        if (!canvasId) return;

        const wasFavorite = btn.classList.contains('is-favorite');
        if (wasFavorite) {
            btn.classList.remove('is-favorite');
        } else {
            btn.classList.add('is-favorite');
        }

        btn.classList.add('disabled-interactive');

        const res = await this.api.toggleFavorite(canvasId);

        btn.classList.remove('disabled-interactive');

        if (res && res.success) {
            
            if (res.data.action === 'added') {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
        } else {
            
            if (wasFavorite) {
                btn.classList.add('is-favorite');
            } else {
                btn.classList.remove('is-favorite');
            }
            showMessage(res.message || (window.__ ? window.__('err_default') : 'Error'), 'error');
        }
    }

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

    async downgradeCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        this.closeDropdowns();

        let confirmed = false;
        if (window.dialogSystem && window.dialogSystem.show) {
            
            try {
                
                const confirmRes = await window.dialogSystem.show('confirmActionModal', {
                    title: 'Convertir a Básico',
                    message: 'Esta acción es IRREVERSIBLE. Se recortará tu lienzo a 64x64 desde la esquina superior izquierda, se perderán los miembros excedentes, y la paleta se restablecerá a la original. Escribe CONFIRMAR para proceder.',
                    inputPlaceholder: 'CONFIRMAR',
                    expectedInput: 'CONFIRMAR'
                });
                
                if (confirmRes && confirmRes.confirmed) {
                    const userInput = confirmRes.data && confirmRes.data.confirm_input ? confirmRes.data.confirm_input.trim().toUpperCase() : '';
                    if (userInput === 'CONFIRMAR') {
                        confirmed = true;
                    } else {
                        showMessage('Debes escribir CONFIRMAR exactamente', 'error');
                    }
                }
            } catch(e) {
                
                const ans = prompt("Escribe CONFIRMAR para degradar el lienzo a básico. Esta acción es IRREVERSIBLE.");
                if (ans === 'CONFIRMAR') confirmed = true;
            }
        } else {
            const ans = prompt("Escribe CONFIRMAR para degradar el lienzo a básico. Esta acción es IRREVERSIBLE. Se perderán datos que superen el plan básico (tamaño, miembros extras, paletas).");
            if (ans === 'CONFIRMAR') confirmed = true;
        }

        if (!confirmed) return;

        const res = await this.api.post(ApiRoutes.Canvases.Downgrade, { uuid: uuid, confirm_word: 'CONFIRMAR' }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(res.message, 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
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