import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';
import { AdminModalTemplates } from '../AdminModalTemplates.js';

export class AdminSupportLiveController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
        this.pollInterval = null;
        this.activeTab = 'l1';
        this.currentSession = null;
        this.currentSessionUuid = null;
        this.isInternalNoteMode = false;
        this.cannedResponses = [];

        this._boundClick = this.handleClick.bind(this);
        this._boundKeydown = this.handleKeydown.bind(this);
    }

    async init() {
        this.container = document.querySelector('[data-ref="admin-support-live-wrapper"]');
        this.abortController = new AbortController();
        this.bindEvents();
        await this._loadAgentStatus();
        await this._loadCannedResponses();
        await this._loadQueues();
        this._startPolling();
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundClick);
        document.body.addEventListener('keydown', this._boundKeydown);
    }

    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        document.body.removeEventListener('click', this._boundClick);
        document.body.removeEventListener('keydown', this._boundKeydown);
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            const input = e.target.closest('[data-ref="admin-support-chat-input"]');
            if (input) {
                e.preventDefault();
                this._sendMessage();
            }
        }
    }

    handleClick(e) {
        const queueTabBtn = e.target.closest('[data-action="switchQueueTab"]');
        if (queueTabBtn) {
            e.preventDefault();
            this._handleSwitchTab(queueTabBtn);
            return;
        }

        const statusItem = e.target.closest('[data-action="changeAgentStatus"]');
        if (statusItem) {
            e.preventDefault();
            this._handleChangeStatus(statusItem);
            return;
        }

        const claimBtn = e.target.closest('[data-action="claimSession"]');
        if (claimBtn) {
            e.preventDefault();
            this._handleClaimSession(claimBtn);
            return;
        }

        const selectActiveChatBtn = e.target.closest('[data-action="selectActiveChat"]');
        if (selectActiveChatBtn) {
            e.preventDefault();
            const uuid = selectActiveChatBtn.getAttribute('data-uuid');
            if (uuid) this._selectSession(uuid);
            return;
        }

        const toggleNoteBtn = e.target.closest('[data-action="toggleInternalNoteMode"]');
        if (toggleNoteBtn) {
            e.preventDefault();
            this._toggleInternalNoteMode();
            return;
        }

        const sendMsgBtn = e.target.closest('[data-action="sendAdminChatMessage"]');
        if (sendMsgBtn) {
            e.preventDefault();
            this._sendMessage();
            return;
        }

        const cannedItem = e.target.closest('[data-action="insertCannedResponse"]');
        if (cannedItem) {
            e.preventDefault();
            this._insertCannedResponse(cannedItem);
            return;
        }

        const openEscalateBtn = e.target.closest('[data-action="openEscalateModal"]');
        if (openEscalateBtn) {
            e.preventDefault();
            this._openEscalateModal();
            return;
        }

        const selectLevelItem = e.target.closest('[data-action="selectEscalateLevel"]');
        if (selectLevelItem) {
            e.preventDefault();
            this._handleSelectEscalateLevel(selectLevelItem);
            return;
        }

        const submitEscalateBtn = e.target.closest('[data-action="submitEscalateChat"]');
        if (submitEscalateBtn) {
            e.preventDefault();
            this._submitEscalate(submitEscalateBtn);
            return;
        }

        const openCloseBtn = e.target.closest('[data-action="openCloseChatModal"]');
        if (openCloseBtn) {
            e.preventDefault();
            this._openCloseModal();
            return;
        }

        const submitCloseBtn = e.target.closest('[data-action="submitCloseChat"]');
        if (submitCloseBtn) {
            e.preventDefault();
            this._submitClose(submitCloseBtn);
            return;
        }
    }

    _handleSwitchTab(btn) {
        const tab = btn.getAttribute('data-tab');
        if (!tab) return;
        this.activeTab = tab;

        const allTabs = document.querySelectorAll('[data-action="switchQueueTab"]');
        allTabs.forEach(b => {
            if (b === btn) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        this._loadQueues();
    }

    async _loadAgentStatus() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetAgentStatus, {}, this.abortController ? this.abortController.signal : undefined);
            if (res && res.success) {
                this._updateAgentStatusUI(res.status);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _updateAgentStatusUI(status) {
        const textEl = document.querySelector('[data-ref="agent-status-display-text"]');
        const iconEl = document.querySelector('[data-ref="agent-status-indicator-icon"]');

        const labelMap = {
            online: window.__('lbl_agent_status_online'),
            busy: window.__('lbl_agent_status_busy'),
            away: window.__('lbl_agent_status_away'),
            offline: window.__('lbl_agent_status_offline')
        };

        if (textEl) {
            textEl.textContent = labelMap[status] || status;
        }

        if (iconEl) {
            iconEl.className = `material-symbols-rounded status-${status}`;
        }

        const menuLinks = document.querySelectorAll('[data-action="changeAgentStatus"]');
        menuLinks.forEach(link => {
            if (link.getAttribute('data-val') === status) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async _handleChangeStatus(item) {
        const newStatus = item.getAttribute('data-val');
        if (!newStatus) return;

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.UpdateAgentStatus, {
                status: newStatus
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this._updateAgentStatusUI(newStatus);
                const dropdown = document.querySelector('[data-module="adminAgentStatusDropdown"]');
                if (dropdown) {
                    dropdown.classList.remove('active');
                    dropdown.classList.add('disabled');
                }
            } else {
                showMessage(res && res.message ? res.message : window.__('err_generic'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(window.__('err_generic'), 'error');
        }
    }

    async _loadCannedResponses() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetCannedResponses, {}, this.abortController ? this.abortController.signal : undefined);
            if (res && res.success) {
                this.cannedResponses = res.responses || [];
                this._renderCannedDropdown();
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _renderCannedDropdown() {
        const container = document.querySelector('[data-ref="admin-canned-list-menu"]');
        if (!container) return;

        if (this.cannedResponses.length === 0) {
            container.innerHTML = `<div class="component-p-2 text-muted"><span>${window.__('lbl_no_canned_found')}</span></div>`;
            return;
        }

        let html = '';
        this.cannedResponses.forEach(item => {
            html += `
                <div class="component-menu-link" data-action="insertCannedResponse" data-content="${this._escapeHtml(item.content)}">
                    <div class="component-menu-link-text">
                        <span>/${this._escapeHtml(item.shortcut)} - ${this._escapeHtml(item.title)}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    _insertCannedResponse(item) {
        const content = item.getAttribute('data-content');
        const input = document.querySelector('[data-ref="admin-support-chat-input"]');
        if (input && content) {
            input.value = content;
            input.focus();
        }

        const dropdown = document.querySelector('[data-module="adminCannedResponsesDropdown"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }
    }

    _startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => {
            this._loadQueues();
            if (this.currentSessionUuid) {
                this._loadMessages();
            }
        }, 3000);
    }

    async _loadQueues() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetLiveQueues, {}, this.abortController ? this.abortController.signal : undefined);
            if (res && res.success) {
                const queues = res.queues || {};
                const activeList = res.my_active_sessions || [];

                const b1 = document.querySelector('[data-ref="badge-queue-l1"]');
                const b2 = document.querySelector('[data-ref="badge-queue-l2"]');
                const b3 = document.querySelector('[data-ref="badge-queue-l3"]');
                const bAct = document.querySelector('[data-ref="badge-queue-active"]');

                if (b1) b1.textContent = (queues.l1 || []).length;
                if (b2) b2.textContent = (queues.l2 || []).length;
                if (b3) b3.textContent = (queues.l3 || []).length;
                if (bAct) bAct.textContent = activeList.length;

                this._renderCurrentQueueList(queues, activeList);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _renderCurrentQueueList(queues, activeList) {
        const container = document.querySelector('[data-ref="admin-support-queue-container"]');
        if (!container) return;

        let list = [];
        let isActiveTab = false;

        if (this.activeTab === 'l1') {
            list = queues.l1 || [];
        } else if (this.activeTab === 'l2') {
            list = queues.l2 || [];
        } else if (this.activeTab === 'l3') {
            list = queues.l3 || [];
        } else if (this.activeTab === 'active') {
            list = activeList;
            isActiveTab = true;
        }

        if (list.length === 0) {
            container.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                    <h3 class="component-card__title">${window.__('admin_no_chats_in_queue')}</h3>
                </div>
            `;
            return;
        }

        let html = '';
        list.forEach(item => {
            const isSelected = item.uuid === this.currentSessionUuid;
            const selectedClass = isSelected ? 'active' : '';
            const priorityBadge = item.priority === 'urgent' ? '<span class="component-badge component-badge--danger">Urgente</span>' : (item.priority === 'high' ? '<span class="component-badge component-badge--warning">Alta</span>' : '');

            if (isActiveTab) {
                html += `
                    <div class="component-group-item component-group-item--clickable ${selectedClass}" data-action="selectActiveChat" data-uuid="${item.uuid}">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">person</span>
                            </div>
                            <div class="component-card__text">
                                <h3 class="component-card__title">${this._escapeHtml(item.client_username || 'Guest')} ${priorityBadge}</h3>
                                <p class="component-card__description">${this._escapeHtml(item.subject)}</p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="component-group-item ${selectedClass}">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">support</span>
                            </div>
                            <div class="component-card__text">
                                <h3 class="component-card__title">${this._escapeHtml(item.client_username || 'Guest')} ${priorityBadge}</h3>
                                <p class="component-card__description">${this._escapeHtml(item.subject)}</p>
                            </div>
                        </div>
                        <div class="component-card__actions">
                            <button class="component-button component-button--dark component-button--h34" data-action="claimSession" data-uuid="${item.uuid}" type="button">
                                <span>${window.__('btn_claim_chat')}</span>
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
    }

    async _handleClaimSession(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.ClaimSession, {
                session_uuid: uuid
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);

            if (res && res.success) {
                showMessage(window.__('msg_support_chat_claimed'), 'success');
                this.activeTab = 'active';
                const allTabs = document.querySelectorAll('[data-action="switchQueueTab"]');
                allTabs.forEach(b => {
                    if (b.getAttribute('data-tab') === 'active') {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
                await this._loadQueues();
                this._selectSession(uuid);
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_claim_failed'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_support_claim_failed'), 'error');
        }
    }

    async _selectSession(uuid) {
        this.currentSessionUuid = uuid;
        const allItems = document.querySelectorAll('[data-action="selectActiveChat"]');
        allItems.forEach(item => {
            if (item.getAttribute('data-uuid') === uuid) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        await this._loadMessages();
    }

    async _loadMessages() {
        if (!this.currentSessionUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Support.GetSessionMessages, {
                session_uuid: this.currentSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this.currentSession = res.session;
                this._renderActiveChatHeader(res.session);
                this._renderMessages(res.messages || []);
                this._renderClientSidebar(res.session);

                const footer = document.querySelector('[data-ref="admin-support-chat-footer"]');
                const actions = document.querySelector('[data-ref="admin-chat-top-actions"]');

                if (footer) footer.classList.remove('disabled');
                if (actions) actions.classList.remove('disabled');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _renderActiveChatHeader(session) {
        const nameEl = document.querySelector('[data-ref="current-chat-client-name"]');
        const subjectEl = document.querySelector('[data-ref="current-chat-client-subject"]');

        if (nameEl) {
            const dept = session.department_level ? ` (${session.department_level.toUpperCase()})` : '';
            nameEl.textContent = `${session.client_username || 'Guest'}${dept}`;
        }
        if (subjectEl) {
            subjectEl.textContent = `${session.category} - ${session.subject}`;
        }
    }

    _renderClientSidebar(session) {
        const container = document.querySelector('[data-ref="admin-support-client-info"]');
        if (!container) return;

        container.innerHTML = `
            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">person</span>
                        </div>
                        <div class="component-card__text">
                            <h3 class="component-card__title">${this._escapeHtml(session.client_username || 'Guest')}</h3>
                            <p class="component-card__description">${this._escapeHtml(session.client_email || 'No email')}</p>
                        </div>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h4 class="component-card__title">${window.__('lbl_chat_category')}</h4>
                            <p class="component-card__description">${this._escapeHtml(session.category || 'general')}</p>
                        </div>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h4 class="component-card__title">${window.__('lbl_chat_priority')}</h4>
                            <p class="component-card__description">${this._escapeHtml(session.priority || 'medium')}</p>
                        </div>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h4 class="component-card__title">${window.__('lbl_created_at')}</h4>
                            <p class="component-card__description">${this._escapeHtml(session.started_at || '')}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderMessages(messages) {
        const container = document.querySelector('[data-ref="admin-support-messages-list"]');
        if (!container) return;

        let html = '';
        messages.forEach(msg => {
            if (msg.sender_type === 'system') {
                html += `
                    <div class="chat-message chat-message--status">
                        <div class="chat-message-status-bubble">
                            <span class="material-symbols-rounded">info</span>
                            <span>${this._escapeHtml(msg.message)}</span>
                        </div>
                    </div>
                `;
            } else if (msg.is_internal) {
                html += `
                    <div class="chat-message chat-message--internal">
                        <div class="chat-message-bubble chat-message-bubble--internal">
                            <div class="chat-message-header">
                                <span class="chat-message-username"><span class="material-symbols-rounded">sticky_note_2</span> ${this._escapeHtml(msg.sender_name)} (Nota Interna)</span>
                                <span class="chat-message-time">${msg.created_at || ''}</span>
                            </div>
                            <div class="chat-message-text">${this._escapeHtml(msg.message)}</div>
                        </div>
                    </div>
                `;
            } else {
                const isMine = msg.sender_type === 'agent';
                const senderClass = isMine ? 'chat-message--mine' : '';
                html += `
                    <div class="chat-message ${senderClass}">
                        <div class="chat-message-bubble">
                            <div class="chat-message-header">
                                <span class="chat-message-username">${this._escapeHtml(msg.sender_name)}</span>
                                <span class="chat-message-time">${msg.created_at || ''}</span>
                            </div>
                            <div class="chat-message-text">${this._escapeHtml(msg.message)}</div>
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    _toggleInternalNoteMode() {
        this.isInternalNoteMode = !this.isInternalNoteMode;
        const btn = document.querySelector('[data-ref="btn-toggle-internal-note"]');
        const input = document.querySelector('[data-ref="admin-support-chat-input"]');

        if (btn) {
            if (this.isInternalNoteMode) {
                btn.classList.add('active');
                btn.classList.add('component-button--warning');
            } else {
                btn.classList.remove('active');
                btn.classList.remove('component-button--warning');
            }
        }

        if (input) {
            if (this.isInternalNoteMode) {
                input.placeholder = window.__('placeholder_internal_note');
            } else {
                input.placeholder = window.__('placeholder_agent_chat_input');
            }
        }
    }

    async _sendMessage() {
        const input = document.querySelector('[data-ref="admin-support-chat-input"]');
        if (!input || !this.currentSessionUuid) return;

        const text = input.value.trim();
        if (!text) return;

        input.value = '';

        try {
            const route = this.isInternalNoteMode
                ? ApiRoutes.AdminSupport.AddInternalNote
                : ApiRoutes.AdminSupport.SendMessage;

            const payload = this.isInternalNoteMode
                ? { session_uuid: this.currentSessionUuid, note: text }
                : { session_uuid: this.currentSessionUuid, message: text };

            const res = await this.api.post(route, payload, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this._loadMessages();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_message_send_failed'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(window.__('err_support_message_send_failed'), 'error');
        }
    }

    _openEscalateModal() {
        if (!this.currentSessionUuid) return;
        window.modalSystem.show(AdminModalTemplates.escalateChatModal, {
            sessionUuid: this.currentSessionUuid,
            currentLevel: this.currentSession ? this.currentSession.department_level : 'l1'
        });
    }

    _handleSelectEscalateLevel(item) {
        const val = item.getAttribute('data-val');
        const labelText = item.querySelector('.component-menu-link-text span')?.textContent || val;

        const textEl = document.querySelector('[data-ref="escalate-level-text"]');
        if (textEl) {
            textEl.textContent = labelText;
            textEl.setAttribute('data-value', val);
        }

        const menuList = item.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        const dropdown = document.querySelector('[data-module="dropdownEscalateLevel"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }
    }

    async _submitEscalate(btn) {
        const form = document.querySelector('[data-ref="admin-escalate-form"]');
        if (!form || !btn || btn.classList.contains('disabled-interaction')) return;

        const sessionUuid = form.getAttribute('data-session-uuid');
        const levelText = document.querySelector('[data-ref="escalate-level-text"]');
        const reasonInput = document.querySelector('[data-ref="escalate-reason-input"]');
        const noteInput = document.querySelector('[data-ref="escalate-note-input"]');

        const toLevel = levelText ? levelText.getAttribute('data-value') : 'l2';
        const reason = reasonInput ? reasonInput.value.trim() : '';
        const note = noteInput ? noteInput.value.trim() : '';

        if (!reason) {
            showMessage(window.__('err_support_escalation_reason_required'), 'error');
            if (reasonInput) reasonInput.focus();
            return;
        }

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.EscalateSession, {
                session_uuid: sessionUuid,
                to_level: toLevel,
                reason: reason,
                internal_note: note
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);
            window.modalSystem.closeCurrent();

            if (res && res.success) {
                showMessage(window.__('msg_support_escalated_successfully'), 'success');
                this.currentSessionUuid = null;
                this.currentSession = null;
                await this._loadQueues();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_escalation_failed'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_support_escalation_failed'), 'error');
        }
    }

    _openCloseModal() {
        if (!this.currentSessionUuid) return;
        window.modalSystem.show(AdminModalTemplates.closeChatModal, {
            sessionUuid: this.currentSessionUuid
        });
    }

    async _submitClose(btn) {
        const form = document.querySelector('[data-ref="admin-close-chat-form"]');
        if (!form || !btn || btn.classList.contains('disabled-interaction')) return;

        const sessionUuid = form.getAttribute('data-session-uuid');
        const summaryInput = document.querySelector('[data-ref="close-chat-summary-input"]');
        const summary = summaryInput ? summaryInput.value.trim() : '';

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.CloseSession, {
                session_uuid: sessionUuid,
                resolution_summary: summary
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);
            window.modalSystem.closeCurrent();

            if (res && res.success) {
                showMessage(window.__('msg_support_session_ended'), 'success');
                this.currentSessionUuid = null;
                this.currentSession = null;
                await this._loadQueues();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_close_failed'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_support_close_failed'), 'error');
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
