import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';
import { AdminModalTemplates } from '../AdminModalTemplates.js';

export class AdminSupportCannedController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
        this.items = [];

        this._boundClick = this.handleClick.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="admin-support-canned-wrapper"]');
        this.abortController = new AbortController();
        if (window.modalSystem) {
            window.modalSystem.registerTemplates(AdminModalTemplates);
        }
        this.bindEvents();
        this._loadCanned();
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundClick);
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        document.body.removeEventListener('click', this._boundClick);
    }

    handleClick(e) {
        const createBtn = e.target.closest('[data-action="openCreateCannedModal"]');
        if (createBtn) {
            e.preventDefault();
            this._openModal();
            return;
        }

        const editBtn = e.target.closest('[data-action="editCannedResponse"]');
        if (editBtn) {
            e.preventDefault();
            const uuid = editBtn.getAttribute('data-uuid');
            const item = this.items.find(i => i.uuid === uuid);
            if (item) this._openModal(item);
            return;
        }

        const delBtn = e.target.closest('[data-action="deleteCannedResponse"]');
        if (delBtn) {
            e.preventDefault();
            const uuid = delBtn.getAttribute('data-uuid');
            if (uuid) this._deleteCanned(uuid, delBtn);
            return;
        }

        const selectLevel = e.target.closest('[data-action="selectCannedLevel"]');
        if (selectLevel) {
            e.preventDefault();
            this._handleSelectLevel(selectLevel);
            return;
        }

        const submitBtn = e.target.closest('[data-action="submitCannedForm"]');
        if (submitBtn) {
            e.preventDefault();
            this._submitCannedForm(submitBtn);
            return;
        }
    }

    async _loadCanned() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetCannedResponses, {}, this.abortController ? this.abortController.signal : undefined);
            if (res && res.success) {
                this.items = res.responses || [];
                this._renderList();
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _renderList() {
        const container = document.querySelector('[data-ref="admin-canned-container"]');
        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">quickreply</span>
                    <h3 class="component-card__title">${window.__('lbl_no_canned_found')}</h3>
                </div>
            `;
            return;
        }

        let html = '';
        this.items.forEach(item => {
            const minLevelBadge = `<span class="component-badge">${item.min_level ? item.min_level.toUpperCase() : 'L1'}</span>`;

            html += `
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">quickreply</span>
                        </div>
                        <div class="component-card__text">
                            <h3 class="component-card__title">/${this._escapeHtml(item.shortcut)} - ${this._escapeHtml(item.title)} ${minLevelBadge}</h3>
                            <p class="component-card__description">${this._escapeHtml(item.content)}</p>
                        </div>
                    </div>
                    <div class="component-card__actions">
                        <button class="component-button component-button--icon component-button--h34" data-action="editCannedResponse" data-uuid="${item.uuid}" type="button">
                            <span class="material-symbols-rounded">edit</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h34" data-action="deleteCannedResponse" data-uuid="${item.uuid}" type="button">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    </div>
                </div>
                <hr class="component-divider">
            `;
        });

        container.innerHTML = html;
    }

    _openModal(item = null) {
        if (!window.modalSystem) return;
        window.modalSystem.show('cannedResponseModal', {
            item: item || {}
        });
    }

    _handleSelectLevel(item) {
        const val = item.getAttribute('data-val');
        const labelText = item.querySelector('.component-menu-link-text span')?.textContent || val;

        const textEl = document.querySelector('[data-ref="canned-level-text"]');
        if (textEl) {
            textEl.textContent = labelText;
            textEl.setAttribute('data-value', val);
        }

        const menuList = item.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        const dropdown = document.querySelector('[data-module="dropdownCannedLevel"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }
    }

    async _submitCannedForm(btn) {
        const form = document.querySelector('[data-ref="admin-canned-form"]');
        if (!form || !btn || btn.classList.contains('disabled-interaction')) return;

        const uuid = form.getAttribute('data-uuid');
        const shortcutInput = document.querySelector('[data-ref="canned-shortcut-input"]');
        const titleInput = document.querySelector('[data-ref="canned-title-input"]');
        const contentInput = document.querySelector('[data-ref="canned-content-input"]');
        const levelText = document.querySelector('[data-ref="canned-level-text"]');

        const shortcut = shortcutInput ? shortcutInput.value.trim() : '';
        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        const minLevel = levelText ? levelText.getAttribute('data-value') : 'l1';

        if (!shortcut || !title || !content) {
            showMessage(window.__('err_support_invalid_canned'), 'error');
            return;
        }

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.SaveCannedResponse, {
                uuid: uuid,
                shortcut: shortcut,
                title: title,
                content: content,
                min_level: minLevel,
                category: 'general'
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);
            window.modalSystem.closeCurrent();

            if (res && res.success) {
                showMessage(window.__('msg_support_canned_saved'), 'success');
                this._loadCanned();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_generic'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_generic'), 'error');
        }
    }

    async _deleteCanned(uuid, btn) {
        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.DeleteCannedResponse, {
                uuid: uuid
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);

            if (res && res.success) {
                showMessage(window.__('msg_support_canned_deleted'), 'success');
                this._loadCanned();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_generic'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_generic'), 'error');
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
