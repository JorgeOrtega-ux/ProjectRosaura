import { ApiRoutes, WsConfig } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';
import { AdminModalTemplates } from '../AdminModalTemplates.js';
import { ImageViewerSystem } from '../../../core/components/ImageViewerSystem.js';
import { AiImprover } from './ai/AiImprover.js';

export class AdminSupportFloatingController {
    constructor() {
        this.api = new ApiService();
        this.aiImprover = null;
        this.activeSession = null;
        this.activeSessionUuid = null;
        this.myActiveSessions = [];
        this.selectedFiles = [];
        this.cannedResponses = [];
        this.isInternalNoteMode = false;
        this.unreadCount = 0;
        this.isModuleOpen = false;

        this.ws = null;
        this.wsReconnectTimeout = null;
        this.wsHeartbeatInterval = null;
        this.typingTimeout = null;
        this.lastRenderedMaxId = 0;
        this.hasInitialMessagesLoaded = false;
        this.lastPlayedMessageId = null;

        this._boundClick = this.handleClick.bind(this);
        this._boundKeydown = this.handleKeydown.bind(this);
        this._boundInput = this.handleInput.bind(this);
        this._boundChange = this.handleChange.bind(this);
        this._boundPaste = this.handlePaste.bind(this);
        this._boundViewLoaded = this.syncVisibility.bind(this);
    }

    init() {
        this.aiImprover = new AiImprover(this.api);
        this.bindEvents();
        if (window.modalSystem) {
            window.modalSystem.registerTemplates(AdminModalTemplates);
        }
        this.syncVisibility();
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundClick);
        document.body.addEventListener('keydown', this._boundKeydown);
        document.body.addEventListener('input', this._boundInput);
        document.body.addEventListener('change', this._boundChange);
        document.body.addEventListener('paste', this._boundPaste);
        window.addEventListener('viewLoaded', this._boundViewLoaded);
    }

    destroy() {
        this._disconnectWs();

        const input = document.querySelector('[data-ref="admin-support-floating-chat-input"]');
        if (input && this.aiImprover) {
            this.aiImprover.detachButton(input);
            this.aiImprover = null;
        }

        document.body.removeEventListener('click', this._boundClick);
        document.body.removeEventListener('keydown', this._boundKeydown);
        document.body.removeEventListener('input', this._boundInput);
        document.body.removeEventListener('change', this._boundChange);
        document.body.removeEventListener('paste', this._boundPaste);
        window.removeEventListener('viewLoaded', this._boundViewLoaded);
    }

    async _syncActiveSessionsFromBackend() {
        const fab = document.querySelector('[data-ref="floating-admin-support-btn"]');
        const path = window.location.pathname || '';
        const isLiveConsole = path.startsWith('/admin/support/live-console') || path.startsWith('/admin/support/c/');

        if (isLiveConsole) {
            if (fab) fab.classList.add('disabled');
            this.closeModule();
            return;
        }

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetLiveQueues);
            if (res && res.success && Array.isArray(res.my_active_sessions) && res.my_active_sessions.length > 0) {
                const myActive = res.my_active_sessions;
                this.myActiveSessions = myActive;

                let current = null;
                if (this.activeSessionUuid) {
                    current = myActive.find(s => s.uuid === this.activeSessionUuid);
                }
                if (!current) {
                    current = myActive[0];
                }
                this.setActiveSession(current);
            } else {
                this.clearActiveSession();
            }
        } catch (e) {
            this.clearActiveSession();
        }
    }

    setActiveSession(sessionData) {
        if (!sessionData || !sessionData.uuid) {
            this.clearActiveSession();
            return;
        }

        this.activeSession = sessionData;
        this.activeSessionUuid = sessionData.uuid;
        localStorage.setItem('pr_active_agent_support_session', JSON.stringify(sessionData));
        this._renderSessionHeader(sessionData);

        const fab = document.querySelector('[data-ref="floating-admin-support-btn"]');
        const path = window.location.pathname || '';
        const isLiveConsole = path.startsWith('/admin/support/live-console') || path.startsWith('/admin/support/c/');

        if (fab && !isLiveConsole) {
            fab.classList.remove('disabled');
            this._updateUnreadBadge();
        }

        const lang = sessionData.language || 'es-419';
        const input = document.querySelector('[data-ref="admin-support-floating-chat-input"]');
        if (input && this.aiImprover) {
            this.aiImprover.attachButton(input, lang, 'chat');
            this.aiImprover.setVisibility(input, !this.isInternalNoteMode);
        }

        this._connectWebSocket();
    }

    clearActiveSession() {
        this.activeSession = null;
        this.activeSessionUuid = null;
        this.myActiveSessions = [];
        this.unreadCount = 0;
        this.selectedFiles = [];
        localStorage.removeItem('pr_active_agent_support_session');
        this._disconnectWs();
        this.closeModule();

        const input = document.querySelector('[data-ref="admin-support-floating-chat-input"]');
        if (input && this.aiImprover) {
            this.aiImprover.detachButton(input);
        }

        const fab = document.querySelector('[data-ref="floating-admin-support-btn"]');
        if (fab) fab.classList.add('disabled');
    }

    syncVisibility() {
        const fab = document.querySelector('[data-ref="floating-admin-support-btn"]');
        if (!fab) return;

        const path = window.location.pathname || '';
        const isLiveConsole = path.startsWith('/admin/support/live-console') || path.startsWith('/admin/support/c/');

        if (isLiveConsole) {
            fab.classList.add('disabled');
            this.closeModule();
            return;
        }

        this._syncActiveSessionsFromBackend();
    }

    _updateUnreadBadge() {
        const badge = document.querySelector('[data-ref="admin-support-unread-badge"]');
        if (!badge) return;

        if (this.unreadCount > 0 && !this.isModuleOpen) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.classList.remove('disabled');
        } else {
            badge.classList.add('disabled');
        }
    }

    _connectWebSocket() {
        if (!this.activeSessionUuid) return;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        try {
            const agentId = window.activeUserId || (window.APP_USER && window.APP_USER.id) || '';
            const queryParam = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';
            const wsUrl = `${WsConfig.getBaseUrl()}/support/admin_console${queryParam}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this._startWsHeartbeat();
                this._loadMessages();
                this._loadCannedResponses();
            };

            this.ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    this._handleWsEvent(data);
                } catch (err) {}
            };

            this.ws.onclose = () => {
                this._stopWsHeartbeat();
                if (this.activeSessionUuid) {
                    this.wsReconnectTimeout = setTimeout(() => {
                        this._connectWebSocket();
                    }, 4000);
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

    _disconnectWs() {
        this._stopWsHeartbeat();
        if (this.wsReconnectTimeout) {
            clearTimeout(this.wsReconnectTimeout);
            this.wsReconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    _handleWsEvent(payload) {
        if (!payload) return;

        if (payload.type === 'support_event') {
            const event = payload.event;
            const sessionUuid = payload.session_uuid;
            const eventData = payload.data || {};

            switch (event) {
                case 'new_message': {
                    if (sessionUuid && sessionUuid !== this.activeSessionUuid) {
                        this._syncActiveSessionsFromBackend();
                        return;
                    }
                    const isFromUser = eventData.sender_type === 'user' || (eventData.message && eventData.message.sender_type === 'user');
                    const senderName = eventData.sender_name || (eventData.message && eventData.message.sender_name) || 'Usuario';
                    const msgId = Number(eventData.message?.id || eventData.id) || null;

                    if (isFromUser) {
                        this._playSound('message');
                        if (msgId) this.lastPlayedMessageId = msgId;

                        if (!this.isModuleOpen) {
                            this.unreadCount++;
                            this._updateUnreadBadge();
                            showMessage(window.__('notif_new_message_received', { user: senderName }, `Nuevo mensaje de ${senderName}`), 'info');
                        }
                    }
                    this._loadMessages();
                    break;
                }
                case 'internal_note':
                    if (sessionUuid === this.activeSessionUuid) {
                        this._loadMessages();
                    }
                    break;
                case 'session_closed':
                    if (sessionUuid === this.activeSessionUuid) {
                        this.clearActiveSession();
                    } else {
                        this._syncActiveSessionsFromBackend();
                    }
                    break;
                case 'session_claimed':
                case 'session_assigned':
                case 'session_created':
                case 'session_escalated':
                case 'session_reassigned':
                    this._syncActiveSessionsFromBackend();
                    break;
                default:
                    break;
            }
        } else if (payload.type === 'support_typing') {
            if (this.activeSessionUuid === payload.session_uuid && payload.sender_type === 'user') {
                this._showTypingIndicator(true);
            }
        }
    }

    _sendWsTyping() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.activeSessionUuid) {
            this.ws.send(JSON.stringify({
                type: 'support_typing',
                session_uuid: this.activeSessionUuid,
                sender_type: 'agent'
            }));
        }
    }

    _showTypingIndicator(show) {
        const indicator = document.querySelector('[data-ref="admin-support-floating-typing-indicator"]');
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

    _playSound(type = 'message') {
        try {
            const soundMap = {
                incoming: '/public/assets/sounds/support/chat_incoming.mp3',
                escalated: '/public/assets/sounds/support/chat_escalated.mp3',
                transferred: '/public/assets/sounds/support/chat_transferred.mp3',
                message: '/public/assets/sounds/support/chat_message.mp3',
                resolved: '/public/assets/sounds/support/chat_resolved.mp3'
            };
            const src = soundMap[type] || soundMap.message;
            const audio = new Audio(src);
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
    }

    openModule() {
        const moduleEl = document.querySelector('[data-module="moduleAdminSupportChat"]');
        if (!moduleEl) return;

        if (window.appInstance && window.appInstance.moduleManager) {
            window.appInstance.moduleManager.toggleMenuInModule('moduleAdminSupportChat', 'menu-admin-support-chat');
        } else {
            moduleEl.classList.remove('disabled');
            moduleEl.classList.add('active');
        }

        this.isModuleOpen = !moduleEl.classList.contains('disabled');
        if (this.isModuleOpen) {
            this.unreadCount = 0;
            this._updateUnreadBadge();
            this._loadMessages();
            this._loadCannedResponses();
        }
    }

    closeModule() {
        const moduleEl = document.querySelector('[data-module="moduleAdminSupportChat"]');
        if (!moduleEl) return;

        if (window.appInstance && window.appInstance.moduleManager) {
            window.appInstance.moduleManager.close(moduleEl);
        } else {
            moduleEl.classList.remove('active');
            moduleEl.classList.add('disabled');
        }

        this.isModuleOpen = false;
        this._updateUnreadBadge();
    }

    toggleModule() {
        const moduleEl = document.querySelector('[data-module="moduleAdminSupportChat"]');
        if (!moduleEl) return;

        if (window.appInstance && window.appInstance.moduleManager) {
            window.appInstance.moduleManager.toggleMenuInModule('moduleAdminSupportChat', 'menu-admin-support-chat');
        } else {
            const isClosed = moduleEl.classList.contains('disabled');
            if (isClosed) {
                moduleEl.classList.remove('disabled');
                moduleEl.classList.add('active');
            } else {
                moduleEl.classList.remove('active');
                moduleEl.classList.add('disabled');
            }
        }

        const isNowOpen = !moduleEl.classList.contains('disabled');
        this.isModuleOpen = isNowOpen;
        if (isNowOpen) {
            this.unreadCount = 0;
            this._updateUnreadBadge();
            this._loadMessages();
            this._loadCannedResponses();
        }
    }

    _renderSessionHeader(session) {
        if (!session) return;

        const nameEl = document.querySelector('[data-ref="admin-support-floating-client-name"]');
        const subjectEl = document.querySelector('[data-ref="admin-support-floating-client-subject"]');
        const avatarContainer = document.querySelector('[data-ref="admin-support-floating-client-avatar-container"]');

        if (nameEl) {
            const dept = session.department_level ? ` (${session.department_level.toUpperCase()})` : '';
            nameEl.textContent = `${session.client_username || 'Guest'}${dept}`;
        }

        if (subjectEl) {
            const langCode = (session.language || 'es-419').toLowerCase();
            const langName = langCode.startsWith('en') ? window.__('lbl_lang_en', [], 'Inglés') : window.__('lbl_lang_es', [], 'Español');
            subjectEl.textContent = `${session.category || 'general'} • ${session.client_username || 'Guest'} • ${langName}`;
        }

        if (avatarContainer) {
            avatarContainer.innerHTML = this._renderAvatarHtml(session.client_avatar, session.client_username, session.client_subscription_color);
        }

        if (window.applySubscriptionDynamicColors) window.applySubscriptionDynamicColors();
    }

    async _loadMessages() {
        if (!this.activeSessionUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetSessionMessages, {
                session_uuid: this.activeSessionUuid
            });

            if (res && res.success && res.session) {
                this.activeSession = res.session;
                this._renderSessionHeader(res.session);
                this._renderMessages(res.messages || []);
            }
        } catch (error) {}
    }

    async _loadCannedResponses() {
        try {
            const lang = this.activeSession?.language || document.documentElement.lang || 'es-419';
            const res = await this.api.post(ApiRoutes.AdminSupport.GetCannedResponses, { language: lang });
            if (res && res.success) {
                this.cannedResponses = res.responses || [];
                this._renderCannedDropdown();
            }
        } catch (error) {}
    }

    _renderCannedDropdown(filterQuery = '') {
        const container = document.querySelector('[data-ref="admin-floating-canned-list-menu"]');
        const emptyEl = document.querySelector('[data-ref="admin-floating-canned-empty"]');
        if (!container) return;

        let filtered = this.cannedResponses;
        if (filterQuery) {
            filtered = this.cannedResponses.filter(item => {
                const s = (item.shortcut || '').toLowerCase();
                const t = (item.title || '').toLowerCase();
                const c = (item.content || '').toLowerCase();
                return s.includes(filterQuery) || t.includes(filterQuery) || c.includes(filterQuery);
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = '';
            if (emptyEl) emptyEl.classList.remove('disabled');
            return;
        }

        if (emptyEl) emptyEl.classList.add('disabled');

        let html = '';
        filtered.forEach(item => {
            html += `
                <div class="component-menu-link" data-action="insertAdminFloatingCannedResponse" data-content="${this._escapeHtml(item.content)}">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">quickreply</span>
                    </div>
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
        const input = document.querySelector('[data-ref="admin-support-floating-chat-input"]');
        if (input && content) {
            input.value = content;
            input.focus();
        }

        const dropdown = document.querySelector('[data-module="adminFloatingCannedResponsesDropdown"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }
    }

    _parseSubscriptionColor(colorRaw) {
        if (!colorRaw) return 'transparent';
        try {
            let colorData = colorRaw;
            if (typeof colorRaw === 'string') {
                const trimmed = colorRaw.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    colorData = JSON.parse(trimmed);
                } else {
                    return colorRaw;
                }
            }
            if (colorData && typeof colorData === 'object') {
                if (colorData.type === 'solid') {
                    const firstColor = (colorData.colors && colorData.colors[0]);
                    return (typeof firstColor === 'string' ? firstColor : firstColor?.hex) || '#808080';
                }
                if (colorData.type === 'linear') {
                    const angle = colorData.angle || '90';
                    const colors = Array.isArray(colorData.colors) ? colorData.colors : [];
                    const stops = colors.map((c, i, arr) => {
                        const hex = typeof c === 'string' ? c : (c.hex || '#000');
                        const p = (typeof c === 'object' && c.percentage !== undefined) ? c.percentage : Math.floor((i / (arr.length - 1 || 1)) * 100);
                        return `${hex} ${p}%`;
                    }).join(', ');
                    return `linear-gradient(${angle}deg, ${stops})`;
                }
                if (colorData.type === 'conic') {
                    const angle = colorData.angle || '0';
                    const colors = Array.isArray(colorData.colors) ? colorData.colors : [];
                    const stops = colors.map((c, i, arr) => {
                        const hex = typeof c === 'string' ? c : (c.hex || '#000');
                        const p = (typeof c === 'object' && c.percentage !== undefined) ? c.percentage : Math.floor((i / (arr.length || 1)) * 100);
                        return `${hex} ${p}%`;
                    }).join(', ');
                    return `conic-gradient(from ${angle}deg, ${stops})`;
                }
            }
        } catch (e) {}
        return 'transparent';
    }

    _renderAvatarHtml(avatarUrl, username, subColorRaw) {
        const subCss = this._parseSubscriptionColor(subColorRaw);
        const hasSub = subCss && subCss !== 'transparent';
        const dynamicClass = hasSub ? 'subscription-dynamic' : '';
        const styleAttr = hasSub ? `style="--active-subscription-bg: ${this._escapeHtml(subCss)};"` : '';
        const dataAttr = hasSub ? `data-sub-bg="${this._escapeHtml(subCss)}"` : '';
        const fallback = '/public/assets/img/fallbacks/avatar-default.png';
        const src = avatarUrl ? this._escapeHtml(avatarUrl) : fallback;

        return `
            <div class="component-button--profile ${dynamicClass} component-avatar--static-sm" ${dataAttr} ${styleAttr}>
                <img class="avatar-image" src="${src}" alt="${this._escapeHtml(username || 'Client')}" onerror="this.src='${fallback}'">
            </div>
        `;
    }

    _renderMessages(messages) {
        const container = document.querySelector('[data-ref="admin-support-floating-messages-list"]');
        if (!container) return;

        let maxId = 0;
        let hasNewUserMessage = false;

        (messages || []).forEach(msg => {
            const mId = Number(msg.id) || 0;
            if (mId > maxId) maxId = mId;

            if (this.hasInitialMessagesLoaded && mId > this.lastRenderedMaxId && msg.sender_type === 'user') {
                if (mId !== this.lastPlayedMessageId) {
                    hasNewUserMessage = true;
                    this.lastPlayedMessageId = mId;
                }
            }
        });

        if (hasNewUserMessage) {
            this._playSound('message');
        }

        if (maxId > this.lastRenderedMaxId) {
            this.lastRenderedMaxId = maxId;
        }
        this.hasInitialMessagesLoaded = true;

        let html = '';
        const initialIssueMsg = this.activeSession?.initial_message;

        (messages || []).forEach(msg => {
            if (initialIssueMsg && msg.sender_type === 'user' && msg.message === initialIssueMsg) {
                return;
            }

            let attachmentsHtml = '';
            if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
                const count = msg.attachments.length;
                let gridClass = 'chat-attachment-grid-more';
                if (count === 1) gridClass = 'chat-attachment-grid-1';
                else if (count === 2) gridClass = 'chat-attachment-grid-2';
                else if (count === 3) gridClass = 'chat-attachment-grid-3';
                else if (count === 4) gridClass = 'chat-attachment-grid-4';

                attachmentsHtml = `<div class="chat-message-attachments ${gridClass}">`;
                const displayCount = Math.min(count, 4);
                for (let i = 0; i < displayCount; i++) {
                    const url = msg.attachments[i];
                    let overlay = '';
                    if (i === 3 && count > 4) {
                        overlay = `<div class="chat-attachment-item-overlay">+${count - 4}</div>`;
                    }
                    attachmentsHtml += `
                        <div class="chat-attachment-item" data-action="viewSupportChatImage" data-image-url="${this._escapeHtml(url)}">
                            <img src="${this._escapeHtml(url)}" alt="Attachment" loading="lazy" />
                            ${overlay}
                        </div>
                    `;
                }
                attachmentsHtml += `</div>`;
            }

            if (msg.sender_type === 'system') {
                html += `
                    <div class="chat-message chat-message--status">
                        <div class="chat-message-status-bubble">
                            <span class="material-symbols-rounded">info</span>
                            <span>${this._escapeHtml(msg.message)}</span>
                        </div>
                        ${attachmentsHtml}
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
                            ${attachmentsHtml}
                        </div>
                    </div>
                `;
            } else {
                const isMine = msg.sender_type === 'agent';
                const senderClass = isMine ? 'chat-message--mine' : '';
                const msgTextHtml = msg.message && msg.message.trim().length > 0
                    ? `<div class="chat-message-text">${this._escapeHtml(msg.message)}</div>`
                    : '';
                html += `
                    <div class="chat-message ${senderClass}">
                        <div class="chat-message-bubble">
                            <div class="chat-message-header">
                                <span class="chat-message-username">${this._escapeHtml(msg.sender_name)}</span>
                                <span class="chat-message-time">${msg.created_at || ''}</span>
                            </div>
                            ${msgTextHtml}
                            ${attachmentsHtml}
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
        const btn = document.querySelector('[data-ref="btn-toggle-floating-internal-note"]');
        const input = document.querySelector('[data-ref="admin-support-floating-chat-input"]');

        if (btn) {
            if (this.isInternalNoteMode) {
                btn.classList.add('active', 'component-button--warning');
            } else {
                btn.classList.remove('active', 'component-button--warning');
            }
        }

        if (input) {
            input.placeholder = this.isInternalNoteMode
                ? window.__('placeholder_internal_note', [], 'Escribe una nota interna para otros agentes...')
                : window.__('placeholder_agent_chat_input', [], 'Escribe una respuesta para el usuario...');

            if (this.aiImprover) {
                this.aiImprover.setVisibility(input, !this.isInternalNoteMode);
            }
        }
    }

    handleInput(e) {
        const input = e.target.closest('[data-ref="admin-support-floating-chat-input"]');
        if (input) {
            this._sendWsTyping();
        }

        const cannedSearchInput = e.target.closest('[data-ref="admin-floating-canned-search"]');
        if (cannedSearchInput) {
            this._renderCannedDropdown(cannedSearchInput.value.trim().toLowerCase());
        }
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            const input = e.target.closest('[data-ref="admin-support-floating-chat-input"]');
            if (input) {
                e.preventDefault();
                this._sendMessage();
            }
        }
    }

    handleClick(e) {
        const maxBtn = e.target.closest('[data-action="maximizeAdminFloatingChat"]');
        if (maxBtn) {
            e.preventDefault();
            this._maximizeChat();
            return;
        }

        const sendBtn = e.target.closest('[data-action="sendAdminFloatingChatMessage"]');
        if (sendBtn) {
            e.preventDefault();
            this._sendMessage();
            return;
        }

        const noteBtn = e.target.closest('[data-action="toggleAdminFloatingInternalNoteMode"]');
        if (noteBtn) {
            e.preventDefault();
            this._toggleInternalNoteMode();
            return;
        }

        const attachTrigger = e.target.closest('[data-action="triggerAdminFloatingChatAttach"]');
        if (attachTrigger) {
            e.preventDefault();
            const fileInput = document.getElementById('admin-support-floating-chat-file-input');
            if (fileInput) fileInput.click();
            return;
        }

        const removeAttachBtn = e.target.closest('[data-action="removeAdminFloatingSupportChatAttachment"]');
        if (removeAttachBtn) {
            e.preventDefault();
            const idx = parseInt(removeAttachBtn.getAttribute('data-index') || '0', 10);
            this._removeAttachment(idx);
            return;
        }

        const cannedItem = e.target.closest('[data-action="insertAdminFloatingCannedResponse"]');
        if (cannedItem) {
            e.preventDefault();
            this._insertCannedResponse(cannedItem);
            return;
        }

        const viewIssueBtn = e.target.closest('[data-action="openViewIssueModal"]');
        if (viewIssueBtn) {
            const dropdown = viewIssueBtn.closest('.chat-dropdown-module');
            if (dropdown) dropdown.classList.add('disabled');
            if (this.activeSession && window.modalSystem) {
                e.preventDefault();
                window.modalSystem.show('viewIssueModal', {
                    category: this.activeSession.category || 'general',
                    subject: this.activeSession.subject || '',
                    description: this.activeSession.initial_message || '',
                    time: this.activeSession.started_at || '',
                    priority: this.activeSession.priority || 'medium'
                });
            }
            return;
        }

        const closeChatBtn = e.target.closest('[data-action="openCloseChatModal"]');
        if (closeChatBtn && this.activeSessionUuid) {
            const dropdown = closeChatBtn.closest('.chat-dropdown-module');
            if (dropdown) dropdown.classList.add('disabled');
            if (window.modalSystem) {
                e.preventDefault();
                window.modalSystem.show('closeChatModal', {
                    sessionUuid: this.activeSessionUuid
                });
            }
            return;
        }

        const submitCloseBtn = e.target.closest('[data-action="submitCloseChat"]');
        if (submitCloseBtn) {
            e.preventDefault();
            this._submitCloseChat(submitCloseBtn);
            return;
        }
    }

    handleChange(e) {
        if (e.target && e.target.id === 'admin-support-floating-chat-file-input') {
            if (e.target.files && e.target.files.length > 0) {
                this._handleFileSelection(e.target.files);
            }
            e.target.value = '';
        }
    }

    handlePaste(e) {
        const input = document.querySelector('[data-ref="admin-support-floating-chat-input"]');
        if (!input || document.activeElement !== input) return;

        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
            const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                e.preventDefault();
                this._handleFileSelection(imageFiles);
            }
        }
    }

    _handleFileSelection(files) {
        const maxFiles = 5;
        const maxMb = 10;
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (this.selectedFiles.length >= maxFiles) {
                showMessage(window.__('err_support_max_images_exceeded', [], 'Máximo 5 imágenes permitidas'), 'warning');
                break;
            }
            if (!allowed.includes(file.type)) {
                showMessage(window.__('upload.invalid_format', [], 'Formato de imagen no permitido'), 'error');
                continue;
            }
            if (file.size > maxMb * 1024 * 1024) {
                showMessage(window.__('upload.size_exceeded', [], 'La imagen supera los 10MB'), 'error');
                continue;
            }
            this.selectedFiles.push(file);
        }

        this._renderAttachmentPreviews();
    }

    _renderAttachmentPreviews() {
        const previewContainer = document.querySelector('[data-ref="admin-support-floating-attachments-preview"]');
        if (!previewContainer) return;

        if (this.selectedFiles.length === 0) {
            previewContainer.innerHTML = '';
            previewContainer.classList.remove('active');
            previewContainer.classList.add('disabled');
            return;
        }

        previewContainer.classList.remove('disabled');
        previewContainer.classList.add('active');
        previewContainer.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const card = document.createElement('div');
            card.className = 'chat-attachment-preview-card component-skeleton';

            const img = document.createElement('img');
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.2s ease';

            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                card.classList.remove('component-skeleton');
                img.style.opacity = '1';
            };
            reader.readAsDataURL(file);

            const btn = document.createElement('button');
            btn.className = 'remove-btn';
            btn.type = 'button';
            btn.setAttribute('data-action', 'removeAdminFloatingSupportChatAttachment');
            btn.setAttribute('data-index', index.toString());
            btn.innerHTML = '<span class="material-symbols-rounded">close</span>';

            card.appendChild(img);
            card.appendChild(btn);
            previewContainer.appendChild(card);
        });
    }

    _removeAttachment(index) {
        if (index >= 0 && index < this.selectedFiles.length) {
            this.selectedFiles.splice(index, 1);
            this._renderAttachmentPreviews();
        }
    }

    async _sendMessage() {
        const input = document.querySelector('[data-ref="admin-support-floating-chat-input"]');
        if (!input || !this.activeSessionUuid) return;

        const text = input.value.trim();
        const hasFiles = this.selectedFiles && this.selectedFiles.length > 0;

        if (!text && !hasFiles) return;

        const filesToSend = [...this.selectedFiles];
        this.selectedFiles = [];
        this._renderAttachmentPreviews();
        input.value = '';

        try {
            const route = this.isInternalNoteMode
                ? ApiRoutes.AdminSupport.AddInternalNote
                : ApiRoutes.AdminSupport.SendMessage;

            let res;
            if (hasFiles && !this.isInternalNoteMode) {
                const formData = new FormData();
                formData.append('session_uuid', this.activeSessionUuid);
                formData.append('message', text);
                filesToSend.forEach(file => {
                    formData.append('images[]', file);
                });
                res = await this.api.postForm(route, formData);
            } else {
                const payload = this.isInternalNoteMode
                    ? { session_uuid: this.activeSessionUuid, note: text }
                    : { session_uuid: this.activeSessionUuid, message: text };
                res = await this.api.post(route, payload);
            }

            if (res && res.success) {
                this._loadMessages();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_message_send_failed', [], 'Error al enviar mensaje'), 'error');
            }
        } catch (error) {
            showMessage(window.__('err_support_message_send_failed', [], 'Error al enviar mensaje'), 'error');
        }
    }

    _maximizeChat() {
        if (!this.activeSessionUuid) return;
        const targetUrl = `/admin/support/live-console/c/${this.activeSessionUuid}`;
        this.closeModule();
        if (window.spaRouter) {
            window.spaRouter.navigate(targetUrl);
        } else {
            window.location.href = targetUrl;
        }
    }

    async _submitCloseChat(btn) {
        const form = document.querySelector('[data-ref="admin-close-chat-form"]');
        if (!form || !btn || btn.classList.contains('disabled-interaction')) return;

        const sessionUuid = form.getAttribute('data-session-uuid') || this.activeSessionUuid;
        const summaryInput = document.querySelector('[data-ref="close-chat-summary-input"]');
        const summary = summaryInput ? summaryInput.value.trim() : '';

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.CloseSession, {
                session_uuid: sessionUuid,
                resolution_summary: summary
            });

            restoreButton(btn);
            if (window.modalSystem) window.modalSystem.closeCurrent();

            if (res && res.success) {
                showMessage(window.__('msg_support_session_ended', [], 'La sesión de soporte ha finalizado'), 'success');
                this.clearActiveSession();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_close_failed', [], 'Error al cerrar sesión'), 'error');
            }
        } catch (error) {
            restoreButton(btn);
            showMessage(window.__('err_support_close_failed', [], 'Error al cerrar sesión'), 'error');
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
