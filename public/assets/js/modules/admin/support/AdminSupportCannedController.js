import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';
import { AdminModalTemplates } from '../AdminModalTemplates.js';
import { AiImprover } from './ai/AiImprover.js';

export class AdminSupportCannedController {
    constructor() {
        this.api = new ApiService();
        this.aiImprover = null;
        this.container = null;
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.selectedUuid = null;

        this._boundClick = this.handleClick.bind(this);
        this._boundInput = this.handleInput.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="admin-support-canned-wrapper"]');
        this.abortController = new AbortController();
        this.aiImprover = new AiImprover(this.api);
        if (window.modalSystem) {
            window.modalSystem.registerTemplates(AdminModalTemplates);
        }
        this.bindEvents();
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

        const textarea = document.querySelector('[data-ref="canned-content-input"]');
        if (textarea && this.aiImprover) {
            this.aiImprover.detachButton(textarea);
            this.aiImprover = null;
        }

        if (this.container) {
            this.container.removeEventListener('input', this._boundInput);
        }
        document.body.removeEventListener('click', this._boundClick);
        this.selectedUuid = null;
    }

    handleInput(e) {
        const searchInput = e.target.closest('[data-ref="canned-search-input"]');
        if (searchInput) {
            const query = searchInput.value.trim().toLowerCase();
            const rows = document.querySelectorAll('[data-ref="admin-canned-table-body"] tr[data-action="selectCannedRow"]');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (!query || text.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
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
                    toolbar.classList.add('active');
                    const input = toolbar.querySelector('[data-ref="canned-search-input"]');
                    if (input) input.focus();
                } else {
                    toolbar.classList.remove('active');
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

        const selectRow = e.target.closest('[data-action="selectCannedRow"]');
        if (selectRow && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.component-dropdown-wrapper')) {
            e.preventDefault();
            const uuid = selectRow.getAttribute('data-uuid');
            if (this.selectedUuid === uuid) {
                this.deselectCanned();
            } else {
                this.selectedUuid = uuid;
                const tbody = document.querySelector('[data-ref="admin-canned-table-body"]');
                if (tbody) {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                }
                selectRow.classList.add('selected');
                this._updateSelectionUI();
            }
            return;
        }

        const editSelectedBtn = e.target.closest('[data-action="editSelectedCanned"]');
        if (editSelectedBtn) {
            e.preventDefault();
            if (this.selectedUuid) {
                const row = document.querySelector(`[data-action="selectCannedRow"][data-uuid="${this.selectedUuid}"]`);
                if (row) {
                    const item = {
                        uuid: this.selectedUuid,
                        shortcut: row.getAttribute('data-shortcut') || '',
                        title: row.getAttribute('data-title') || '',
                        content: row.getAttribute('data-content') || '',
                        min_level: row.getAttribute('data-min-level') || 'l1',
                        language: row.getAttribute('data-language') || 'es-419'
                    };
                    this._openModal(item);
                }
            }
            return;
        }

        const deleteSelectedBtn = e.target.closest('[data-action="deleteSelectedCanned"]');
        if (deleteSelectedBtn) {
            e.preventDefault();
            if (this.selectedUuid) {
                this._deleteCanned(this.selectedUuid, deleteSelectedBtn);
            }
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

    deselectCanned() {
        this.selectedUuid = null;
        const tbody = document.querySelector('[data-ref="admin-canned-table-body"]');
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        }
        this._updateSelectionUI();
    }

    _updateSelectionUI() {
        const selectionActions = document.querySelector('[data-ref="header-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');

        if (this.selectedUuid) {
            if (selectionActions) {
                selectionActions.classList.remove('disabled');
                selectionActions.classList.add('active');
            }
            if (defaultActions) {
                defaultActions.classList.remove('active');
                defaultActions.classList.add('disabled');
            }
        } else {
            if (selectionActions) {
                selectionActions.classList.remove('active');
                selectionActions.classList.add('disabled');
            }
            if (defaultActions) {
                defaultActions.classList.remove('disabled');
                defaultActions.classList.add('active');
            }
        }
    }

    _openModal(item = null) {
        if (!window.modalSystem) return;
        window.modalSystem.show('cannedResponseModal', {
            item: item || {}
        });

        const textarea = document.querySelector('[data-ref="canned-content-input"]');
        if (textarea && this.aiImprover) {
            this.aiImprover.attachButton(textarea, 'es-419', 'canned');
        }
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
        if (dropdown && window.appInstance) {
            window.appInstance.closeModule(dropdown);
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
        if (dropdown && window.appInstance) {
            window.appInstance.closeModule(dropdown);
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
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${this.basePath}/admin/support/canned-responses`, { forceReload: true });
                } else {
                    window.location.reload();
                }
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
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${this.basePath}/admin/support/canned-responses`, { forceReload: true });
                } else {
                    window.location.reload();
                }
            } else {
                showMessage(res && res.message ? res.message : window.__('err_generic'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_generic'), 'error');
        }
    }
}
