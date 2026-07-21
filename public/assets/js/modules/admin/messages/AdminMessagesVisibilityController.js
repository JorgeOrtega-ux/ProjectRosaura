import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class AdminMessagesVisibilityController {
    constructor() {
        this.api = new ApiService();
        this.messageUuid = null;
        this.initialState = null;
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.state = {
            visibility: 'visible',
            deletedBy: '',
            deleteReason: ''
        };
        this.defaultTexts = {
            deletedBy: ''
        };
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        if (window.location.pathname.includes('/admin/messages/visibility')) {
            this.setupInitialState();
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/messages/visibility')) {
            this.setupInitialState();
        }
    }

    setupInitialState() {
        const viewContent = document.querySelector('.view-content[data-message-uuid]');
        if (!viewContent) return;

        this.messageUuid = viewContent.getAttribute('data-message-uuid');
        this.state.visibility = viewContent.getAttribute('data-visibility') || 'visible';
        this.state.deletedBy = viewContent.getAttribute('data-deleted-by') || '';
        this.state.deleteReason = viewContent.getAttribute('data-delete-reason') || '';
        this.initialState = Object.assign({}, this.state);

        const inpReason = document.querySelector('[data-ref="inp_delete_reason"]');
        if (inpReason) inpReason.value = this.state.deleteReason || '';

        const deletedByEl = document.querySelector('[data-ref="admin-deletedBy-text"]');
        if (deletedByEl) this.defaultTexts.deletedBy = deletedByEl.textContent.trim();

        this.syncVisuals(false);
        this.renderUI();
        this.checkForChanges();
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/messages/visibility')) return;

        const btnSetDropdown = e.target.closest('[data-action="adminSetDropdown"]');
        if (btnSetDropdown) {
            const key = btnSetDropdown.getAttribute('data-key');
            const val = btnSetDropdown.getAttribute('data-value');
            this.state[key] = val;

            if (key === 'visibility' && val !== 'deleted') {
                this.state.deletedBy = '';
                this.state.deleteReason = '';
                const inpReason = document.querySelector('[data-ref="inp_delete_reason"]');
                if (inpReason) inpReason.value = '';
            }

            if (key === 'deletedBy' && val !== 'admin') {
                this.state.deleteReason = '';
                const inpReason = document.querySelector('[data-ref="inp_delete_reason"]');
                if (inpReason) inpReason.value = '';
            }

            const module = btnSetDropdown.closest('.component-module');
            if (module && window.appInstance) window.appInstance.closeModule(module);

            this.syncVisuals(true);
            this.renderUI();
            this.checkForChanges();
        }

        const btnSubmit = e.target.closest('[data-action="submitVisibilityUpdate"]');
        if (btnSubmit && !btnSubmit.classList.contains('disabled-interaction')) {
            this.submitVisibilityUpdate(btnSubmit);
        }
    }

    handleInput(e) {
        if (!window.location.pathname.includes('/admin/messages/visibility')) return;

        const ref = e.target.getAttribute('data-ref');
        if (ref === 'inp_delete_reason') {
            this.state.deleteReason = e.target.value;
            this.checkForChanges();
        }
    }

    syncVisuals(updateText = true) {
        const syncLabel = (key) => {
            const val = String(this.state[key]);
            let selectedText = '';

            document.querySelectorAll(`[data-action="adminSetDropdown"][data-key="${key}"]`).forEach(item => {
                const isMatch = item.getAttribute('data-value') === val;
                item.classList.toggle('active', isMatch);
                if (isMatch) {
                    const textNode = item.querySelector('.component-menu-link-text');
                    if (textNode) selectedText = textNode.textContent.trim();
                }
            });

            if (updateText) {
                const el = document.querySelector(`[data-ref="admin-${key}-text"]`);
                if (el) {
                    if (selectedText) {
                        el.textContent = selectedText;
                    } else if (key === 'deletedBy' && !val) {
                        el.textContent = this.defaultTexts.deletedBy;
                    }
                }
            }
        };

        ['visibility', 'deletedBy'].forEach(key => syncLabel(key));
    }

    renderUI() {
        const s = this.state;

        const secDeletedBy = document.querySelector('[data-ref="section-deleted-by"]');
        const secDeleteReason = document.querySelector('[data-ref="section-delete-reason"]');

        [secDeletedBy, secDeleteReason].forEach(el => {
            if (el) el.classList.add('disabled');
        });

        if (s.visibility === 'deleted') {
            if (secDeletedBy) secDeletedBy.classList.remove('disabled');
            if (s.deletedBy === 'admin') {
                if (secDeleteReason) secDeleteReason.classList.remove('disabled');
            }
        }
    }

    checkForChanges() {
        if (!this.initialState) return;

        let hasChanges = false;
        for (const key in this.state) {
            if (this.state[key] !== this.initialState[key]) {
                hasChanges = true;
                break;
            }
        }

        const btnSave = document.querySelector('[data-ref="btn-save-visibility"]');
        if (hasChanges) {
            if (btnSave) btnSave.classList.remove('disabled-interaction');
        } else {
            if (btnSave) btnSave.classList.add('disabled-interaction');
        }
    }

    async submitVisibilityUpdate(btn) {
        setButtonLoading(btn);

        const payload = {
            uuid: this.messageUuid,
            visibility: this.state.visibility,
            deleted_by: this.state.visibility === 'deleted' ? this.state.deletedBy : null,
            delete_reason: (this.state.visibility === 'deleted' && this.state.deletedBy === 'admin') ? this.state.deleteReason : null
        };

        const result = await this.api.post(ApiRoutes.Admin.UpdateMessageVisibility, payload, this.abortController.signal);
        if (result.aborted) return;

        restoreButton(btn);

        if (result.success) {
            showMessage(result.message || (typeof window.__ === 'function' ? window.__('success_visibility_updated') : 'Visibilidad actualizada correctamente.'), 'success');
            this.initialState = JSON.parse(JSON.stringify(this.state));
            this.checkForChanges();
        } else {
            showMessage(result.message, 'error');
        }
    }
}

export { AdminMessagesVisibilityController };
