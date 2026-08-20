import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class TrashController {
    constructor() {
        this.api = new ApiService();
        this.canvases = [];
        this.templates = [];
        this.activeFilter = 'all';
        this.abortController = null;
        this.handleClickBound = this.handleClick.bind(this);
    }

    async init() {
        this.abortController = new AbortController();
        this.bindEvents();
        await this.loadTrash();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    async handleClick(e) {
        const filterTypeBtn = e.target.closest('[data-action="filterTrashType"]');
        if (filterTypeBtn) {
            const type = filterTypeBtn.getAttribute('data-type');
            this.setFilter(type);
            return;
        }

        const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
        if (openSubMenuBtn) {
            const targetRef = openSubMenuBtn.getAttribute('data-target');
            const parentModule = openSubMenuBtn.closest('.component-module');
            if (parentModule) {
                const mainMenu = parentModule.querySelector('[data-ref="menuMainFilters"]');
                const targetMenu = parentModule.querySelector(`[data-ref="${targetRef}"]`);
                if (mainMenu && targetMenu) {
                    mainMenu.classList.replace('active', 'disabled');
                    targetMenu.classList.replace('disabled', 'active');
                }
            }
            return;
        }

        const backMenuBtn = e.target.closest('[data-action="backToMainFilters"]');
        if (backMenuBtn) {
            const currentMenu = backMenuBtn.closest('.component-menu');
            const parentModule = backMenuBtn.closest('.component-module');
            if (currentMenu && parentModule) {
                const mainMenu = parentModule.querySelector('[data-ref="menuMainFilters"]');
                if (mainMenu) {
                    currentMenu.classList.replace('active', 'disabled');
                    mainMenu.classList.replace('disabled', 'active');
                }
            }
            return;
        }

        const restoreBtn = e.target.closest('[data-action="restoreTrashItem"]');
        if (restoreBtn) {
            const type = restoreBtn.getAttribute('data-type');
            const id = restoreBtn.getAttribute('data-id');
            await this.restoreItem(type, id, restoreBtn);
            return;
        }

        const deletePermBtn = e.target.closest('[data-action="deleteTrashItemPerm"]');
        if (deletePermBtn) {
            const type = deletePermBtn.getAttribute('data-type');
            const id = deletePermBtn.getAttribute('data-id');
            await this.deletePermanently(type, id, deletePermBtn);
            return;
        }

        const emptyTrashBtn = e.target.closest('[data-action="emptyTrash"]');
        if (emptyTrashBtn) {
            await this.emptyTrash(emptyTrashBtn);
            return;
        }
    }

    setFilter(filterType) {
        this.activeFilter = filterType;
        document.querySelectorAll('[data-action="filterTrashType"]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-type') === filterType);
        });

        const filterModule = document.querySelector('[data-module="moduleTrashFilters"]');
        if (filterModule) {
            if (window.appInstance && typeof window.appInstance.closeModule === 'function') {
                window.appInstance.closeModule(filterModule);
            } else {
                filterModule.classList.replace('active', 'disabled');
            }
            const mainMenu = filterModule.querySelector('[data-ref="menuMainFilters"]');
            const subMenu = filterModule.querySelector('[data-ref="menuFilterType"]');
            if (mainMenu && subMenu) {
                subMenu.classList.replace('active', 'disabled');
                mainMenu.classList.replace('disabled', 'active');
            }
        }

        this.render();
    }

    async loadTrash() {
        try {
            const res = await this.api.post(ApiRoutes.Trash.GetItems, {}, this.abortController ? this.abortController.signal : null);
            if (res && res.aborted) return;
            if (res && res.success) {
                this.canvases = res.data.canvases || [];
                this.templates = res.data.templates || [];
                this.render();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_server_connection'), 'error');
            }
        }
    }

    render() {
        const btnEmpty = document.querySelector('[data-ref="btn-empty-trash"]');
        const hasAnyItems = (this.canvases.length + this.templates.length) > 0;
        if (btnEmpty) {
            btnEmpty.classList.toggle('disabled', !hasAnyItems);
        }

        const contentArea = document.querySelector('[data-ref="trash-content-area"]');
        if (!contentArea) return;

        let visibleCanvases = [];
        let visibleTemplates = [];

        if (this.activeFilter === 'all' || this.activeFilter === 'canvases') {
            visibleCanvases = this.canvases;
        }
        if (this.activeFilter === 'all' || this.activeFilter === 'templates') {
            visibleTemplates = this.templates;
        }

        const totalVisible = visibleCanvases.length + visibleTemplates.length;

        if (totalVisible === 0) {
            let emptyMsgKey = 'msg_trash_empty';
            if (this.activeFilter === 'canvases') emptyMsgKey = 'msg_trash_canvases_empty';
            if (this.activeFilter === 'templates') emptyMsgKey = 'msg_trash_templates_empty';

            contentArea.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">delete_outline</span>
                    <p class="component-empty-state-text">${window.__(emptyMsgKey)}</p>
                </div>
            `;
            return;
        }

        let cardsHtml = '';
        visibleCanvases.forEach(c => {
            cardsHtml += CardTemplates.trashCanvasCard(c);
        });
        visibleTemplates.forEach(t => {
            cardsHtml += CardTemplates.trashTemplateCard(t);
        });

        contentArea.innerHTML = `<div class="component-grid">${cardsHtml}</div>`;
    }

    async restoreItem(type, id, btn) {
        if (btn) setButtonLoading(btn);
        try {
            const res = await this.api.post(ApiRoutes.Trash.RestoreItem, { type, id }, this.abortController ? this.abortController.signal : null);
            if (res && res.aborted) return;
            if (res && res.success) {
                showMessage(res.message, 'success');
                await this.loadTrash();
            } else {
                showMessage(res.message, 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_server_connection'), 'error');
            }
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async deletePermanently(type, id, btn) {
        if (window.modalSystem) {
            const confirmRes = await window.modalSystem.show('confirmActionModal', {
                title: window.__('title_confirm_delete_perm'),
                message: window.__('desc_confirm_delete_perm')
            });
            if (!confirmRes || !confirmRes.confirmed) return;
        }
        if (btn) setButtonLoading(btn);
        try {
            const res = await this.api.post(ApiRoutes.Trash.DeletePermanently, { type, id }, this.abortController ? this.abortController.signal : null);
            if (res && res.aborted) return;
            if (res && res.success) {
                showMessage(res.message, 'success');
                await this.loadTrash();
            } else {
                showMessage(res.message, 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_server_connection'), 'error');
            }
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async emptyTrash(btn) {
        if (window.modalSystem) {
            const confirmRes = await window.modalSystem.show('confirmActionModal', {
                title: window.__('title_confirm_empty_trash'),
                message: window.__('desc_confirm_empty_trash')
            });
            if (!confirmRes || !confirmRes.confirmed) return;
        }
        if (btn) setButtonLoading(btn);
        try {
            const res = await this.api.post(ApiRoutes.Trash.EmptyTrash, {}, this.abortController ? this.abortController.signal : null);
            if (res && res.aborted) return;
            if (res && res.success) {
                showMessage(res.message, 'success');
                await this.loadTrash();
            } else {
                showMessage(res.message, 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage(window.__('err_server_connection'), 'error');
            }
        } finally {
            if (btn) restoreButton(btn);
        }
    }
}

export { TrashController };
