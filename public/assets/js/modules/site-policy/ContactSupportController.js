import { ApiRoutes, WsConfig } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../core/utils/uiUtils.js';

export class ContactSupportController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
        this.turnstileWidgetId = undefined;
        this.pollInterval = null;
        this.activeSessionUuid = null;
        this.currentRating = 5;

        // WebSocket
        this.ws = null;
        this.wsReconnectTimeout = null;
        this.wsHeartbeatInterval = null;
        this.isIntentionalDisconnect = false;
        this.typingTimeout = null;

        this._boundClick = this.handleClick.bind(this);
        this._boundKeydown = this.handleKeydown.bind(this);
        this._boundInput = this.handleInput.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="contact-support-wrapper"]');
        this.abortController = new AbortController();
        this.bindEvents();
        this._renderTurnstile();
        this._checkLiveChatStatus();
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundClick);
        document.body.addEventListener('keydown', this._boundKeydown);
        document.body.addEventListener('input', this._boundInput);
    }

    destroy() {
        this.isIntentionalDisconnect = true;

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        if (this.wsHeartbeatInterval) {
            clearInterval(this.wsHeartbeatInterval);
            this.wsHeartbeatInterval = null;
        }

        if (this.wsReconnectTimeout) {
            clearTimeout(this.wsReconnectTimeout);
            this.wsReconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        document.body.removeEventListener('click', this._boundClick);
        document.body.removeEventListener('keydown', this._boundKeydown);
        document.body.removeEventListener('input', this._boundInput);

        this._resetTurnstile();
        this.turnstileWidgetId = undefined;
    }

    _connectWebSocket(sessionUuid) {
        if (!sessionUuid || this.isIntentionalDisconnect) return;

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const wsUrl = `${WsConfig.getBaseUrl()}/support/${sessionUuid}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this._startWsHeartbeat();
            };

            this.ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    this._handleWsEvent(data);
                } catch (err) {}
            };

            this.ws.onclose = () => {
                this._stopWsHeartbeat();
                if (!this.isIntentionalDisconnect && this.activeSessionUuid) {
                    this.wsReconnectTimeout = setTimeout(() => {
                        this._connectWebSocket(this.activeSessionUuid);
                    }, 3000);
                }
            };

            this.ws.onerror = () => {};
        } catch (err) {}
    }

    _startWsHeartbeat() {
        this._stopWsHeartbeat();
        this.wsHeartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 20000);
    }

    _stopWsHeartbeat() {
        if (this.wsHeartbeatInterval) {
            clearInterval(this.wsHeartbeatInterval);
            this.wsHeartbeatInterval = null;
        }
    }

    _handleWsEvent(payload) {
        if (!payload) return;

        if (payload.type === 'support_event') {
            const event = payload.event;
            const sessionUuid = payload.session_uuid;

            if (sessionUuid && sessionUuid !== this.activeSessionUuid) return;

            switch (event) {
                case 'new_message':
                    this._loadMessages();
                    if (payload.data && payload.data.message && payload.data.message.sender_type === 'agent') {
                        this._playNotificationSound();
                    }
                    break;
                case 'session_claimed':
                    this._showState('room');
                    if (payload.data && payload.data.agent_name) {
                        const nameEl = document.querySelector('[data-ref="support-agent-name-display"]');
                        if (nameEl) nameEl.textContent = payload.data.agent_name;
                    }
                    this._loadMessages();
                    this._playNotificationSound();
                    break;
                case 'session_escalated':
                    this._loadMessages();
                    break;
                case 'session_reassigned':
                    if (payload.data && payload.data.to_agent_name) {
                        const nameEl = document.querySelector('[data-ref="support-agent-name-display"]');
                        if (nameEl) nameEl.textContent = payload.data.to_agent_name;
                    }
                    this._loadMessages();
                    break;
                case 'session_closed':
                    if (this.pollInterval) {
                        clearInterval(this.pollInterval);
                        this.pollInterval = null;
                    }
                    this._showState('feedback');
                    break;
                default:
                    break;
            }
        } else if (payload.type === 'support_typing') {
            if (payload.sender_type === 'agent') {
                this._showTypingIndicator(true);
            }
        }
    }

    _sendWsTyping() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.activeSessionUuid) {
            this.ws.send(JSON.stringify({
                type: 'support_typing',
                session_uuid: this.activeSessionUuid,
                sender_type: 'user'
            }));
        }
    }

    _showTypingIndicator(show) {
        const indicator = document.querySelector('[data-ref="support-typing-indicator"]');
        if (!indicator) return;

        if (show) {
            indicator.classList.remove('disabled');
            if (this.typingTimeout) clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                indicator.classList.add('disabled');
            }, 3000);
        } else {
            indicator.classList.add('disabled');
        }
    }

    _playNotificationSound() {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.4;
            audio.play().catch(() => {});
        } catch (e) {}
    }

    handleInput(e) {
        const chatInput = e.target.closest('[data-ref="support-chat-input-text"]');
        if (chatInput) {
            this._sendWsTyping();
        }
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            const chatInput = e.target.closest('[data-ref="support-chat-input-text"]');
            if (chatInput) {
                e.preventDefault();
                this._sendChatMessage();
            }
        }
    }

    handleClick(e) {
        const policyNav = e.target.closest('[data-nav^="/site-policy"]');
        if (policyNav) {
            const path = policyNav.getAttribute('data-nav');
            if (path && window.spaRouter) {
                e.preventDefault();
                window.spaRouter.navigate(path);
                return;
            }
        }

        const categoryItem = e.target.closest('[data-action="selectSupportCategory"]');
        if (categoryItem) {
            e.preventDefault();
            this._handleCategorySelect(categoryItem);
            return;
        }

        const liveCategoryItem = e.target.closest('[data-action="selectLiveSupportCategory"]');
        if (liveCategoryItem) {
            e.preventDefault();
            this._handleLiveCategorySelect(liveCategoryItem);
            return;
        }

        const submitBtn = e.target.closest('[data-action="submitSupportTicket"]');
        if (submitBtn) {
            e.preventDefault();
            this._submitTicket(submitBtn);
            return;
        }

        const startLiveBtn = e.target.closest('[data-action="startLiveSupportChat"]');
        if (startLiveBtn) {
            e.preventDefault();
            this._startLiveChat(startLiveBtn);
            return;
        }

        const sendMsgBtn = e.target.closest('[data-action="sendSupportChatMessage"]');
        if (sendMsgBtn) {
            e.preventDefault();
            this._sendChatMessage();
            return;
        }

        const endChatBtn = e.target.closest('[data-action="endSupportChatSession"]');
        if (endChatBtn) {
            e.preventDefault();
            this._endLiveChatSession();
            return;
        }

        const ratingBtn = e.target.closest('[data-action="setCsatRating"]');
        if (ratingBtn) {
            e.preventDefault();
            this._handleRatingSelect(ratingBtn);
            return;
        }

        const submitCsatBtn = e.target.closest('[data-action="submitSupportFeedback"]');
        if (submitCsatBtn) {
            e.preventDefault();
            this._submitCsatFeedback(submitCsatBtn);
            return;
        }

        const downloadBtn = e.target.closest('[data-action="downloadSupportTranscript"]');
        if (downloadBtn) {
            e.preventDefault();
            this._downloadTranscript();
            return;
        }

        const focusBtn = e.target.closest('[data-action="focusSupportEmailForm"]');
        if (focusBtn) {
            e.preventDefault();
            this._focusEmailForm();
            return;
        }
    }

    _handleCategorySelect(item) {
        const val = item.getAttribute('data-val');
        const text = item.querySelector('.component-menu-link-text span')?.textContent || val;

        const textEl = document.querySelector('[data-ref="support-category-text"]');
        if (textEl) {
            textEl.textContent = text;
            textEl.setAttribute('data-value', val);
        }

        const menuList = item.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        const dropdownModule = document.querySelector('[data-module="supportModuleCategory"]');
        if (dropdownModule) {
            dropdownModule.classList.remove('active');
            dropdownModule.classList.add('disabled');
        }
    }

    _handleLiveCategorySelect(item) {
        const val = item.getAttribute('data-val');
        const text = item.querySelector('.component-menu-link-text span')?.textContent || val;

        const textEl = document.querySelector('[data-ref="support-live-cat-text"]');
        if (textEl) {
            textEl.textContent = text;
            textEl.setAttribute('data-value', val);
        }

        const menuList = item.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        const dropdownModule = document.querySelector('[data-module="supportLiveModuleCategory"]');
        if (dropdownModule) {
            dropdownModule.classList.remove('active');
            dropdownModule.classList.add('disabled');
        }
    }

    _focusEmailForm() {
        const liveChatModule = document.querySelector('[data-module="moduleSupportChat"]');
        if (liveChatModule) {
            liveChatModule.classList.remove('active');
            liveChatModule.classList.add('disabled');
        }

        const subjectInput = document.querySelector('[data-ref="support-subject"]');
        if (subjectInput) {
            subjectInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                subjectInput.focus();
            }, 300);
        }
    }

    async _checkLiveChatStatus() {
        try {
            const res = await this.api.post(ApiRoutes.Support.GetQueueStatus, {
                session_uuid: this.activeSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                const statusText = document.querySelector('[data-ref="support-agents-status-text"]');
                if (statusText) {
                    if (res.available_agents > 0) {
                        statusText.textContent = window.__('msg_support_agents_available', { count: res.available_agents });
                    } else {
                        statusText.textContent = window.__('support_livechat_unavailable_desc');
                    }
                }

                if (res.active_session) {
                    this.activeSessionUuid = res.active_session.uuid;
                    this._connectWebSocket(this.activeSessionUuid);

                    if (res.active_session.status === 'waiting_in_queue' || res.active_session.status === 'escalated') {
                        this._showState('queue');
                        const qNum = document.querySelector('[data-ref="support-queue-position-number"]');
                        if (qNum) qNum.textContent = `#${res.active_session.queue_position || 1}`;
                        this._startPolling();
                    } else if (res.active_session.status === 'active') {
                        this._showState('room');
                        this._updateAgentDisplay(res.active_session);
                        this._startPolling();
                        this._loadMessages();
                    }
                } else if (!res.is_online) {
                    this._showState('offline');
                } else {
                    this._showState('preform');
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _showState(stateName) {
        const states = {
            preform: document.querySelector('[data-ref="support-state-preform"]'),
            queue: document.querySelector('[data-ref="support-state-queue"]'),
            room: document.querySelector('[data-ref="support-state-room"]'),
            feedback: document.querySelector('[data-ref="support-state-feedback"]'),
            offline: document.querySelector('[data-ref="support-state-offline"]')
        };

        const footer = document.querySelector('[data-ref="support-chat-room-footer"]');

        Object.keys(states).forEach(key => {
            const el = states[key];
            if (el) {
                if (key === stateName) {
                    el.classList.remove('disabled');
                } else {
                    el.classList.add('disabled');
                }
            }
        });

        if (footer) {
            if (stateName === 'room') {
                footer.classList.remove('disabled');
            } else {
                footer.classList.add('disabled');
            }
        }
    }

    async _startLiveChat(btn) {
        if (!btn || btn.classList.contains('disabled-interaction')) return;

        const subjectInput = document.querySelector('[data-ref="support-live-subject"]');
        const messageInput = document.querySelector('[data-ref="support-live-message"]');
        const categoryText = document.querySelector('[data-ref="support-live-cat-text"]');

        const category = categoryText ? categoryText.getAttribute('data-value') : 'general';
        const subject = subjectInput ? subjectInput.value.trim() : '';
        const initialMessage = messageInput ? messageInput.value.trim() : '';

        if (!subject || subject.length < 3) {
            showMessage(window.__('err_support_invalid_subject'), 'error');
            if (subjectInput) subjectInput.focus();
            return;
        }

        if (!initialMessage || initialMessage.length < 5) {
            showMessage(window.__('err_support_invalid_message'), 'error');
            if (messageInput) messageInput.focus();
            return;
        }

        setButtonLoading(btn);

        try {
            const clientLang = document.documentElement.lang || 'es-419';
            const res = await this.api.post(ApiRoutes.Support.StartLiveSession, {
                category: category,
                subject: subject,
                initial_message: initialMessage,
                language: clientLang
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);

            if (res && res.success) {
                this.activeSessionUuid = res.session_uuid;
                this._connectWebSocket(this.activeSessionUuid);
                this._showState('queue');
                const qNum = document.querySelector('[data-ref="support-queue-position-number"]');
                if (qNum) qNum.textContent = `#${res.queue_position || 1}`;
                this._startPolling();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_chat_start_failed'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_support_chat_start_failed'), 'error');
        }
    }

    _startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => {
            this._pollSessionStatus();
        }, 8000); // Slower interval as fallback because WebSockets deliver instantly
    }

    async _pollSessionStatus() {
        if (!this.activeSessionUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Support.GetSessionMessages, {
                session_uuid: this.activeSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                const session = res.session;
                if (session.status === 'waiting_in_queue' || session.status === 'escalated') {
                    this._showState('queue');
                    const qNum = document.querySelector('[data-ref="support-queue-position-number"]');
                    if (qNum) qNum.textContent = `#${session.queue_position || 1}`;
                } else if (session.status === 'active') {
                    this._showState('room');
                    this._updateAgentDisplay(session);
                    this._renderMessages(res.messages);
                } else if (session.status === 'closed') {
                    if (this.pollInterval) {
                        clearInterval(this.pollInterval);
                        this.pollInterval = null;
                    }
                    this._showState('feedback');
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    async _loadMessages() {
        if (!this.activeSessionUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Support.GetSessionMessages, {
                session_uuid: this.activeSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this._renderMessages(res.messages);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _updateAgentDisplay(session) {
        const nameEl = document.querySelector('[data-ref="support-agent-name-display"]');
        const levelEl = document.querySelector('[data-ref="support-agent-level-display"]');
        const avatarBox = document.querySelector('[data-ref="support-agent-avatar-box"]');

        if (nameEl) {
            nameEl.textContent = session.agent_name || window.__('support_agent_assigned');
        }

        if (levelEl) {
            const deptKey = session.department_level === 'l3' ? 'lbl_dept_l3' : (session.department_level === 'l2' ? 'lbl_dept_l2' : 'lbl_dept_l1');
            levelEl.textContent = window.__(deptKey);
        }

        if (avatarBox && session.agent_avatar) {
            avatarBox.innerHTML = `<img class="chat-message-avatar-img" src="${session.agent_avatar}" alt="${session.agent_name || 'Agent'}">`;
        }
    }

    _renderMessages(messages) {
        const container = document.querySelector('[data-ref="support-chat-messages-list"]');
        if (!container) return;

        let html = '';
        (messages || []).forEach(msg => {
            if (msg.sender_type === 'system') {
                html += `
                    <div class="chat-message chat-message--status">
                        <div class="chat-message-status-bubble">
                            <span class="material-symbols-rounded">info</span>
                            <span>${this._escapeHtml(msg.message)}</span>
                        </div>
                    </div>
                `;
            } else {
                const isMine = msg.sender_type === 'user';
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

    async _sendChatMessage() {
        const input = document.querySelector('[data-ref="support-chat-input-text"]');
        if (!input || !this.activeSessionUuid) return;

        const text = input.value.trim();
        if (!text) return;

        input.value = '';

        try {
            const res = await this.api.post(ApiRoutes.Support.SendMessage, {
                session_uuid: this.activeSessionUuid,
                message: text
            }, this.abortController ? this.abortController.signal : undefined);

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

    async _endLiveChatSession() {
        if (!this.activeSessionUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Support.EndLiveSession, {
                session_uuid: this.activeSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                if (this.pollInterval) {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                }
                this._showState('feedback');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _handleRatingSelect(btn) {
        const rating = parseInt(btn.getAttribute('data-rating') || '5', 10);
        this.currentRating = rating;

        const ratingContainer = document.querySelector('[data-ref="support-csat-stars"]');
        if (ratingContainer) {
            ratingContainer.setAttribute('data-value', rating.toString());
            const allBtns = ratingContainer.querySelectorAll('[data-action="setCsatRating"]');
            allBtns.forEach(b => {
                const r = parseInt(b.getAttribute('data-rating') || '0', 10);
                if (r <= rating) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
        }
    }

    async _submitCsatFeedback(btn) {
        if (!this.activeSessionUuid || !btn || btn.classList.contains('disabled-interaction')) return;

        const commentInput = document.querySelector('[data-ref="support-csat-comment"]');
        const feedback = commentInput ? commentInput.value.trim() : '';

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Support.SubmitFeedback, {
                session_uuid: this.activeSessionUuid,
                rating: this.currentRating,
                feedback: feedback
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);

            if (res && res.success) {
                showMessage(window.__('msg_support_feedback_received'), 'success');
                this.activeSessionUuid = null;
                setTimeout(() => {
                    this._showState('preform');
                }, 1500);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_support_feedback_failed'), 'error');
        }
    }

    async _downloadTranscript() {
        if (!this.activeSessionUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Support.DownloadTranscript, {
                session_uuid: this.activeSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success && res.content) {
                const blob = new Blob([res.content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = res.filename || 'support_transcript.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    async _submitTicket(btn) {
        if (!btn || btn.classList.contains('disabled-interaction')) return;

        const subjectInput = document.querySelector('[data-ref="support-subject"]');
        const messageInput = document.querySelector('[data-ref="support-message"]');
        const categoryText = document.querySelector('[data-ref="support-category-text"]');

        const category = categoryText ? categoryText.getAttribute('data-value') : 'general';
        const subject = subjectInput ? subjectInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!subject || subject.length < 4) {
            showMessage(window.__('err_support_invalid_subject'), 'error');
            if (subjectInput) subjectInput.focus();
            return;
        }

        if (!message || message.length < 15) {
            showMessage(window.__('err_support_invalid_message'), 'error');
            if (messageInput) messageInput.focus();
            return;
        }

        setButtonLoading(btn);

        try {
            const turnstileToken = await this._getTurnstileToken();

            const payload = {
                category: category,
                subject: subject,
                message: message,
                turnstile_token: turnstileToken,
                'cf-turnstile-response': turnstileToken
            };

            const response = await this.api.post(
                ApiRoutes.Support.Submit,
                payload,
                this.abortController ? this.abortController.signal : undefined
            );

            restoreButton(btn);
            this._resetTurnstile();

            if (response && response.success) {
                const ticketUuid = response.ticket_uuid || '';
                const successMsg = window.__('msg_support_ticket_created', { uuid: ticketUuid });

                showMessage(successMsg, 'success');

                if (subjectInput) subjectInput.value = '';
                if (messageInput) messageInput.value = '';
            } else {
                const errMsg = response && response.message ? response.message : window.__('err_support_submission_failed');
                showMessage(errMsg, 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            this._resetTurnstile();
            showMessage(window.__('err_support_submission_failed'), 'error');
        }
    }

    _resetTurnstile() {
        if (typeof turnstile !== 'undefined' && this.turnstileWidgetId !== undefined) {
            try {
                turnstile.reset(this.turnstileWidgetId);
            } catch (error) {}
        }
    }

    _renderTurnstile() {
        if (typeof turnstile === 'undefined') return;

        const turnstileElements = document.querySelectorAll('[data-ref="turnstile-container"]');
        turnstileElements.forEach(el => {
            if (el.innerHTML.trim() === '') {
                try {
                    this.turnstileWidgetId = turnstile.render(el, {
                        sitekey: el.getAttribute('data-sitekey') || window.AppTurnstileSiteKey,
                        action: el.getAttribute('data-action'),
                        appearance: 'interaction-only',
                        size: 'invisible'
                    });
                } catch (error) {}
            }
        });
    }

    async _getTurnstileToken() {
        if (typeof turnstile === 'undefined') return null;

        try {
            const existingToken = turnstile.getResponse(this.turnstileWidgetId);
            if (existingToken) return existingToken;
        } catch (error) {}

        return new Promise((resolve) => {
            if (this.turnstileWidgetId !== undefined) {
                const timeoutId = setTimeout(() => {
                    this._resetTurnstile();
                    resolve(null);
                }, 8000);

                try {
                    turnstile.execute(this.turnstileWidgetId, {
                        callback: (token) => {
                            clearTimeout(timeoutId);
                            resolve(token);
                        },
                        'error-callback': () => {
                            clearTimeout(timeoutId);
                            this._resetTurnstile();
                            resolve(null);
                        }
                    });
                } catch (error) {
                    clearTimeout(timeoutId);
                    this._resetTurnstile();
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
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
