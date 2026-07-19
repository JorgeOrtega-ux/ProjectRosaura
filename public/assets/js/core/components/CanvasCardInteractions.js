import { ApiRoutes } from '../api/ApiRoutes.js';
import { showMessage } from '../utils/uiUtils.js';

export class CanvasCardInteractions {
    constructor(apiService, basePath, abortController) {
        this.api = apiService;
        this.basePath = basePath || '';
        this.abortController = abortController;
    }

    handleAction(action, btn) {
        if (action === 'toggleDynamicMenu') {
            this.toggleDynamicMenu(btn);
            return true;
        } else if (action === 'openCanvasNewTab') {
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
            showMessage(res.message, 'error');
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
            const confirm = await window.dialogSystem.show('verifyPasswordDeleteCanvas', { uuid: uuid });
            if (!confirm.confirmed) return;
            
            const password = confirm.data['modal_verify_password'] ? confirm.data['modal_verify_password'].trim() : '';
            if (!password) {
                showMessage(window.__('err_password_required'), 'error');
                return;
            }

            const payload = {
                canvas_ids: [id],
                password: password
            };

            const res = await this.api.post(ApiRoutes.Canvases.Delete, payload, this.abortController.signal);
            
            if (res.aborted) return;

            if (res.success) {
                showMessage(window.__('msg_canvas_deleted'), 'success');
                const card = document.querySelector(`.component-gallery-card[data-card-id="${id}"]`);
                if (card) card.remove();
            } else {
                showMessage(res.message, 'error');
            }
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
            const card = document.querySelector(`.component-gallery-card[data-card-id="${id}"]`);
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
                    title: window.__('downgrade_basic_title'),
                    message: window.__('downgrade_basic_message'),
                    inputPlaceholder: 'CONFIRM',
                    expectedInput: 'CONFIRM'
                });
                
                if (confirmRes && confirmRes.confirmed) {
                    const userInput = confirmRes.data && confirmRes.data.confirm_input ? confirmRes.data.confirm_input.trim().toUpperCase() : '';
                    if (userInput === 'CONFIRM') {
                        confirmed = true;
                    } else {
                        showMessage(window.__('must_type_confirm'), 'error');
                    }
                }
            } catch(e) {
                const ans = prompt(window.__('downgrade_basic_prompt'));
                if (ans === 'CONFIRM') confirmed = true;
            }
        } else {
            const ans = prompt(window.__('downgrade_basic_prompt'));
            if (ans === 'CONFIRM') confirmed = true;
        }

        if (!confirmed) return;

        const res = await this.api.post(ApiRoutes.Canvases.Downgrade, { uuid: uuid, confirm_word: 'CONFIRM' }, this.abortController.signal);
        
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
            // Remove dynamic card menus from DOM
            if (el.closest('.component-dropdown-wrapper')) {
                setTimeout(() => el.remove(), 250); // Le damos tiempo a la animación de cierre
            }
        });
    }

    toggleDynamicMenu(btn) {
        const wrapper = btn.closest('.component-dropdown-wrapper');
        if (!wrapper) return;
        
        let moduleEl = wrapper.querySelector('.component-module');
        
        if (moduleEl) {
            if (moduleEl.classList.contains('active')) {
                moduleEl.classList.remove('active');
                moduleEl.classList.add('disabled');
                setTimeout(() => moduleEl.remove(), 250);
            } else {
                this.closeDropdowns();
                moduleEl.classList.remove('disabled');
                moduleEl.classList.add('active');
            }
            return;
        }

        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        const isOwner = btn.getAttribute('data-owner') === '1';
        const isLocked = btn.getAttribute('data-locked') === '1';

        let actionButtonHtml = '';
        if (window.activeUserId) {
            actionButtonHtml = isOwner 
                ? `<button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--error" data-action="deleteCanvas" data-id="${id}" data-uuid="${uuid}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                        <div class="component-menu-link-text"><span>${window.__('delete_canvas')}</span></div>
                   </button>`
                : `<button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--error" data-action="leaveCanvas" data-id="${id}" data-uuid="${uuid}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">logout</span></div>
                        <div class="component-menu-link-text"><span>${window.__('leave_canvas')}</span></div>
                   </button>`;
        }

        let warningMenuOption = '';
        if (isLocked && isOwner) {
            warningMenuOption = `
                <button type="button" class="component-menu-link component-menu-link--bordered component-text-notice--warning" data-action="downgradeCanvas" data-id="${id}" data-uuid="${uuid}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">build_circle</span></div>
                    <div class="component-menu-link-text"><span>${window.__('convert_to_basic')}</span></div>
                </button>
            `;
        }

        const html = `
            <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed active" data-module="snapshot-menu-${id}">
                <div class="component-menu component-menu--w265">
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    
                    <div class="component-menu-list">
                        <button type="button" class="component-menu-link" data-action="openCanvasNewTab" data-uuid="${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">open_in_new</span></div>
                            <div class="component-menu-link-text"><span>${window.__('open_in_new_tab')}</span></div>
                        </button>

                        <button type="button" class="component-menu-link" data-action="copyCanvasLink" data-uuid="${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">content_copy</span></div>
                            <div class="component-menu-link-text"><span>${window.__('copy_link')}</span></div>
                        </button>
                        
                        <button type="button" class="component-menu-link" data-nav="${this.basePath}/design/s/${uuid}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">collections</span></div>
                            <div class="component-menu-link-text"><span>${window.__('view_restart_gallery')}</span></div>
                        </button>
                        
                        ${warningMenuOption}

                        ${actionButtonHtml}
                    </div>
                </div>
            </div>
        `;
        
        this.closeDropdowns();
        wrapper.insertAdjacentHTML('beforeend', html);
        
        // Let the global app re-init events for this new module if necessary, or just rely on global delegation
        if (window.app && typeof window.app.initModules === 'function') {
            window.app.initModules(wrapper);
        } else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') {
            window.uiUtils.initDropdowns(wrapper);
        }
        
        if (window.router && typeof window.router.bindLinks === 'function') {
            window.router.bindLinks(wrapper);
        }
    }
}