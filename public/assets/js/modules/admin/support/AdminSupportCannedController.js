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
        this.searchQuery = '';

        this._boundClick = this.handleClick.bind(this);
        this._boundInput = this.handleInput.bind(this);
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
        if (this.container) {
            this.container.addEventListener('input', this._boundInput);
        }
        document.body.addEventListener('click', this._boundClick);
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        if (this.container) {
            this.container.removeEventListener('input', this._boundInput);
        }
        document.body.removeEventListener('click', this._boundClick);
    }

    handleInput(e) {
        const searchInput = e.target.closest('[data-ref="canned-search-input"]');
        if (searchInput) {
            this.searchQuery = searchInput.value.trim().toLowerCase();
            this._renderList();
        }
    }

    handleClick(e) {
        const toggleSearchBtn = e.target.closest('[data-action="toggleSearch"]');
        if (toggleSearchBtn) {
            e.preventDefault();
            const toolbar = document.querySelector('[data-ref="search-toolbar"]');
            if (toolbar) {
                const isHidden = toolbar.classList.contains('disabled');
                if (isHidden) {
                    toolbar.classList.remove('disabled');
                    const input = toolbar.querySelector('[data-ref="canned-search-input"]');
                    if (input) input.focus();
                } else {
                    toolbar.classList.add('disabled');
                }
            }
            return;
        }

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

        const selectLang = e.target.closest('[data-action="selectCannedLang"]');
        if (selectLang) {
            e.preventDefault();
            this._handleSelectLang(selectLang);
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
        const tbody = document.querySelector('[data-ref="admin-canned-table-body"]');
        if (!tbody) return;

        let filtered = this.items;
        if (this.searchQuery) {
            filtered = this.items.filter(item =>
                (item.shortcut && item.shortcut.toLowerCase().includes(this.searchQuery)) ||
                (item.title && item.title.toLowerCase().includes(this.searchQuery)) ||
                (item.content && item.content.toLowerCase().includes(this.searchQuery))
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="component-empty-state component-p-4">
                            <span class="material-symbols-rounded component-empty-state-icon">quickreply</span>
                            <h3 class="component-card__title">${window.__('lbl_no_canned_found')}</h3>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filtered.forEach(item => {
            const minLevelBadge = `<span class="component-badge component-badge--sm">${item.min_level ? item.min_level.toUpperCase() : 'L1'}</span>`;
            const langLabel = item.language === 'en' ? window.__('lbl_lang_en') : window.__('lbl_lang_es');
            const langBadge = `<span class="component-badge component-badge--sm">${langLabel}</span>`;
            const snippet = item.content && item.content.length > 90 ? item.content.substring(0, 90) + '...' : (item.content || '');

            html += `
                <tr class="component-table-row">
                    <td>
                        <span class="component-badge component-badge--primary font-mono">/${this._escapeHtml(item.shortcut)}</span>
                    </td>
                    <td>
                        <span class="component-table-title">${this._escapeHtml(item.title)}</span>
                    </td>
                    <td>
                        <span class="component-table-subtitle">${this._escapeHtml(snippet)}</span>
                    </td>
                    <td>${minLevelBadge}</td>
                    <td>${langBadge}</td>
                    <td class="text-right">
                        <div class="component-table-actions">
                            <button class="component-button component-button--icon component-button--h28" data-action="editCannedResponse" data-uuid="${item.uuid}" type="button">
                                <span class="material-symbols-rounded">edit</span>
                            </button>
                            <button class="component-button component-button--icon component-button--h28 component-button--danger" data-action="deleteCannedResponse" data-uuid="${item.uuid}" type="button">
                                <span class="material-symbols-rounded">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
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

    _handleSelectLang(item) {
        const val = item.getAttribute('data-val');
        const labelText = item.querySelector('.component-menu-link-text span')?.textContent || val;

        const textEl = document.querySelector('[data-ref="canned-lang-text"]');
        if (textEl) {
            textEl.textContent = labelText;
            textEl.setAttribute('data-value', val);
        }

        const menuList = item.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        const dropdown = document.querySelector('[data-module="dropdownCannedLang"]');
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
        const langText = document.querySelector('[data-ref="canned-lang-text"]');

        const shortcut = shortcutInput ? shortcutInput.value.trim() : '';
        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        const minLevel = levelText ? levelText.getAttribute('data-value') : 'l1';
        const language = langText ? langText.getAttribute('data-value') : 'es-419';

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
                language: language,
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
