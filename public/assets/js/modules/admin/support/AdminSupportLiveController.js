import { ApiRoutes, WsConfig } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { renderSkeleton, restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';
import { AdminModalTemplates } from '../AdminModalTemplates.js';
import { ImageViewerSystem } from '../../../core/components/ImageViewerSystem.js';
import { AiImprover } from './ai/AiImprover.js';

export class AdminSupportLiveController {
    constructor() {
        this.api = new ApiService();
        this.aiImprover = null;
        this.container = null;
        this.abortController = null;
        this.activeTab = 'l1';
        this.currentSession = null;
        this.currentSessionUuid = null;
        this.currentClientUserUuid = null;
        this.currentClientUsername = null;
        this.isInternalNoteMode = false;
        this.cannedResponses = [];
        this.onlineAgents = [];
        this.lastQueues = null;
        this.lastActiveList = null;
        this.selectedFiles = [];

        this.isAutoImproveActive = false;
        try {
            this.isAutoImproveActive = localStorage.getItem('pr_support_ai_auto_improve') === 'true';
        } catch (e) {}

        this.ws = null;
        this.wsReconnectTimeout = null;
        this.wsHeartbeatInterval = null;
        this.isIntentionalDisconnect = false;
        this.typingTimeout = null;
        this.lastRenderedMaxId = 0;
        this.hasInitialMessagesLoaded = false;
        this.lastPlayedMessageId = null;

        this._boundClick = this.handleClick.bind(this);
        this._boundKeydown = this.handleKeydown.bind(this);
        this._boundInput = this.handleInput.bind(this);
        this._boundChange = this.handleChange.bind(this);
        this._boundPaste = this.handlePaste.bind(this);
    }

    async init() {
        this.container = document.querySelector('[data-ref="admin-support-live-wrapper"]');
        this.abortController = new AbortController();
        this.aiImprover = new AiImprover(this.api);
        this.isIntentionalDisconnect = false;
        this.activeTab = this.container?.getAttribute('data-initial-tab') || 'l1';

        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const cIndex = pathParts.indexOf('c');
        if (cIndex !== -1 && pathParts[cIndex + 1]) {
            this.currentSessionUuid = pathParts[cIndex + 1];
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const chatParam = urlParams.get('chat');
            if (chatParam) {
                this.currentSessionUuid = chatParam;
            }
        }

        if (window.modalSystem) {
            window.modalSystem.registerTemplates(AdminModalTemplates);
        }

        this.bindEvents();
        this._syncActiveTabUI();
        this._requestNotificationPermission();
        this._loadCannedResponses();
        this._connectWebSocket();

        const chatInput = document.querySelector('[data-ref="admin-support-chat-input"]');
        if (chatInput && this.aiImprover) {
            const btn = this.aiImprover.attachButton(chatInput, this.currentSession?.language || 'es-419', 'chat');
            if (this.isAutoImproveActive && btn) {
                btn.classList.add('is-auto-active');
            }
        }
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundClick);
        document.body.addEventListener('keydown', this._boundKeydown);
        document.body.addEventListener('input', this._boundInput);
        document.body.addEventListener('change', this._boundChange);
        document.body.addEventListener('paste', this._boundPaste);
    }

    destroy() {
        this.isIntentionalDisconnect = true;

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

        const chatInput = document.querySelector('[data-ref="admin-support-chat-input"]');
        if (chatInput && this.aiImprover) {
            this.aiImprover.detachButton(chatInput);
            this.aiImprover = null;
        }

        document.body.removeEventListener('click', this._boundClick);
        document.body.removeEventListener('keydown', this._boundKeydown);
        document.body.removeEventListener('input', this._boundInput);
        document.body.removeEventListener('change', this._boundChange);
        document.body.removeEventListener('paste', this._boundPaste);
    }

    _connectWebSocket() {
        if (this.isIntentionalDisconnect) return;

        try {
            const agentId = this.agentId || window.activeUserId || (window.APP_USER && window.APP_USER.id) || '';
            const queryParam = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';
            const wsUrl = `${WsConfig.getBaseUrl()}/support/admin_console${queryParam}`;
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
                if (!this.isIntentionalDisconnect) {
                    this.wsReconnectTimeout = setTimeout(() => {
                        this._connectWebSocket();
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
            const eventData = payload.data || {};

            switch (event) {
                case 'session_created': {
                    const clientName = eventData.client_username || 'Guest';
                    this._playSound('incoming');
                    showMessage(window.__('notif_new_chat_incoming', { user: clientName }), 'info');
                    this._showBrowserNotification(window.__('title_support_live'), window.__('notif_new_chat_incoming', { user: clientName }));
                    this._loadQueues();
                    break;
                }
                case 'session_escalated': {
                    const clientName = eventData.client_username || 'Usuario';
                    const targetDept = eventData.to_dept || (eventData.to_level ? eventData.to_level.toUpperCase() : 'Nivel Superior');
                    this._playSound('escalated');
                    showMessage(window.__('notif_chat_escalated', { dept: targetDept, user: clientName }), 'info');
                    this._showBrowserNotification(window.__('title_support_live'), window.__('notif_chat_escalated', { dept: targetDept, user: clientName }));
                    if (this.currentSessionUuid && this.currentSessionUuid === sessionUuid) {
                        this._resetChatView();
                    }
                    this._loadQueues();
                    break;
                }
                case 'session_reassigned': {
                    const clientName = eventData.client_username || 'Usuario';
                    const targetAgent = eventData.to_agent_name || 'Agente';
                    this._playSound('transferred');
                    showMessage(window.__('notif_chat_reassigned', { agent: targetAgent, user: clientName }), 'info');
                    this._showBrowserNotification(window.__('title_support_live'), window.__('notif_chat_reassigned', { agent: targetAgent, user: clientName }));
                    if (this.currentSessionUuid && this.currentSessionUuid === sessionUuid) {
                        this._resetChatView();
                    }
                    this._loadQueues();
                    break;
                }
                case 'new_message': {
                    const isFromUser = eventData.sender_type === 'user' || (eventData.message && eventData.message.sender_type === 'user');
                    const senderName = eventData.sender_name || (eventData.message && eventData.message.sender_name) || 'Usuario';
                    const msgId = Number(eventData.message?.id || eventData.id) || null;

                    if (this.currentSessionUuid && this.currentSessionUuid === sessionUuid) {
                        if (isFromUser) {
                            this._playSound('message');
                            if (msgId) this.lastPlayedMessageId = msgId;
                        }
                        this._loadMessages();
                    } else {
                        if (isFromUser) {
                            this._playSound('message');
                            if (msgId) this.lastPlayedMessageId = msgId;
                            showMessage(window.__('notif_new_message_received', { user: senderName }), 'info');
                            this._showBrowserNotification(window.__('title_support_live'), window.__('notif_new_message_received', { user: senderName }));
                        }
                    }
                    this._loadQueues();
                    break;
                }
                case 'internal_note':
                    if (this.currentSessionUuid && this.currentSessionUuid === sessionUuid) {
                        this._loadMessages();
                    }
                    this._loadQueues();
                    break;
                case 'session_claimed':
                    this._loadQueues();
                    break;
                case 'session_closed':
                    if (this.currentSessionUuid && this.currentSessionUuid === sessionUuid) {
                        this._playSound('resolved');
                        this._resetChatView();
                    }
                    this._loadQueues();
                    break;
                case 'agent_status_updated':
                    this._loadQueues();
                    break;
                default:
                    break;
            }
        } else if (payload.type === 'support_typing') {
            if (this.currentSessionUuid && this.currentSessionUuid === payload.session_uuid) {
                this._showTypingIndicator(payload.sender_type === 'user');
            }
        }
    }

    _sendWsTyping() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentSessionUuid) {
            this.ws.send(JSON.stringify({
                type: 'support_typing',
                session_uuid: this.currentSessionUuid,
                sender_type: 'agent'
            }));
        }
    }

    _showTypingIndicator(show) {
        const indicator = document.querySelector('[data-ref="admin-support-typing-indicator"]');
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

    _playSound(type = 'incoming') {
        try {
            const soundMap = {
                incoming: '/public/assets/sounds/support/chat_incoming.mp3',
                escalated: '/public/assets/sounds/support/chat_escalated.mp3',
                transferred: '/public/assets/sounds/support/chat_transferred.mp3',
                message: '/public/assets/sounds/support/chat_message.mp3',
                resolved: '/public/assets/sounds/support/chat_resolved.mp3',
                notification: '/public/assets/sounds/support/chat_incoming.mp3'
            };
            const src = soundMap[type] || soundMap.incoming;
            const audio = new Audio(src);
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
    }

    _requestNotificationPermission() {
        try {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
            }
        } catch (e) {}
    }

    _showBrowserNotification(title, body) {
        try {
            if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
                new Notification(title, {
                    body: body,
                    icon: '/public/assets/img/logo/logo.png'
                });
            }
        } catch (e) {}
    }

    handleInput(e) {
        const chatInput = e.target.closest('[data-ref="admin-support-chat-input"]');
        if (chatInput) {
            this._sendWsTyping();
        }

        const cannedSearchInput = e.target.closest('[data-ref="admin-canned-search"]');
        if (cannedSearchInput) {
            this._renderCannedDropdown(cannedSearchInput.value.trim().toLowerCase());
        }
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
        const backMobileBtn = e.target.closest('[data-action="backToQueuesMobile"]');
        if (backMobileBtn) {
            e.preventDefault();
            this._handleBackToQueuesMobile();
            return;
        }

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

        const selectChatBtn = e.target.closest('[data-action="selectActiveChat"], [data-action="selectQueueSession"]');
        if (selectChatBtn) {
            e.preventDefault();
            const uuid = selectChatBtn.getAttribute('data-uuid');
            if (uuid) this._selectSession(uuid);
            return;
        }

        const toggleNoteBtn = e.target.closest('[data-action="toggleInternalNoteMode"]');
        if (toggleNoteBtn) {
            e.preventDefault();
            this._toggleInternalNoteMode();
            return;
        }

        const improveBtn = e.target.closest('[data-action="aiImproveText"]');
        if (improveBtn) {
            e.preventDefault();
            this._toggleAutoImprove(improveBtn);
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

        const openReassignBtn = e.target.closest('[data-action="openReassignModal"]');
        if (openReassignBtn) {
            e.preventDefault();
            this._openReassignModal();
            return;
        }

        const selectReassignItem = e.target.closest('[data-action="selectReassignAgent"]');
        if (selectReassignItem) {
            e.preventDefault();
            this._handleSelectReassignAgent(selectReassignItem);
            return;
        }

        const submitReassignBtn = e.target.closest('[data-action="submitReassignChat"]');
        if (submitReassignBtn) {
            e.preventDefault();
            this._submitReassign(submitReassignBtn);
            return;
        }

        const viewIssueBtn = e.target.closest('[data-action="openViewIssueModal"]');
        if (viewIssueBtn) {
            e.preventDefault();
            this._closeMoreDropdown();
            if (this.currentSession && window.modalSystem) {
                window.modalSystem.show('viewIssueModal', {
                    category: this.currentSession.category || 'general',
                    subject: this.currentSession.subject || '',
                    description: this.currentSession.initial_message || '',
                    time: this.currentSession.started_at || '',
                    priority: this.currentSession.priority || 'medium'
                });
            }
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

        const cannedBtn = e.target.closest('[data-action="openCannedModal"]');
        if (cannedBtn) {
            e.preventDefault();
            this._openCannedModal();
            return;
        }

        const triggerAttach = e.target.closest('[data-action="triggerAdminChatAttach"]');
        if (triggerAttach) {
            e.preventDefault();
            const fileInput = document.getElementById('admin-support-chat-file-input');
            if (fileInput) fileInput.click();
            return;
        }

        const removeAttachBtn = e.target.closest('[data-action="removeAdminSupportChatAttachment"]');
        if (removeAttachBtn) {
            e.preventDefault();
            const index = parseInt(removeAttachBtn.getAttribute('data-index') || '0', 10);
            this._removeAttachment(index);
            return;
        }

        const viewImageItem = e.target.closest('[data-action="viewSupportChatImage"]');
        if (viewImageItem) {
            e.preventDefault();
            const url = viewImageItem.getAttribute('data-image-url') || viewImageItem.querySelector('img')?.src;
            if (url) {
                ImageViewerSystem.show(url);
            }
            return;
        }
    }

    handleChange(e) {
        if (e.target && e.target.id === 'admin-support-chat-file-input') {
            if (e.target.files && e.target.files.length > 0) {
                this._handleFileSelection(e.target.files);
            }
            e.target.value = '';
        }
    }

    handlePaste(e) {
        const input = document.querySelector('[data-ref="admin-support-chat-input"]');
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
        const previewContainer = document.querySelector('[data-ref="admin-support-chat-attachments-preview"]');
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
            btn.setAttribute('data-action', 'removeAdminSupportChatAttachment');
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

    _syncActiveTabUI() {
        const allTabs = document.querySelectorAll('[data-action="switchQueueTab"]');
        allTabs.forEach(btn => {
            if (btn.getAttribute('data-tab') === this.activeTab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    async _handleSwitchTab(btn) {
        const tab = btn.getAttribute('data-tab');
        if (!tab || tab === this.activeTab) return;

        this.activeTab = tab;
        this._syncActiveTabUI();

        if (this.lastQueues && this.lastActiveList) {
            this._renderCurrentQueueList(this.lastQueues, this.lastActiveList);
        } else {
            const container = document.querySelector('[data-ref="admin-support-queue-container"]');
            if (container) {
                renderSkeleton(container, 'supportQueueSkeleton');
            }
            await this._loadQueues();
        }
    }

    async _loadAgentStatus() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetAgentStatus, {}, this.abortController ? this.abortController.signal : undefined);
            if (res && res.success) {
                this.agentId = res.agent_id;
                let status = res.status || 'offline';
                if (status === 'offline') {
                    status = 'online';
                    this.api.post(ApiRoutes.AdminSupport.UpdateAgentStatus, { status: 'online' }).catch(() => {});
                }
                this._updateAgentStatusUI(status);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _updateAgentStatusUI(status) {
        this.currentAgentStatus = status;
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
        if (!newStatus || newStatus === this.currentAgentStatus) return;

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.UpdateAgentStatus, {
                status: newStatus
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this._updateAgentStatusUI(newStatus);
                const dropdown = document.querySelector('[data-module="adminSupportTopMoreDropdown"]');
                if (dropdown) {
                    if (window.moduleManager) {
                        window.moduleManager.close(dropdown);
                    } else {
                        dropdown.classList.remove('active');
                        dropdown.classList.add('disabled');
                    }
                }
            } else {
                showMessage(res && res.message ? res.message : window.__('err_generic'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(window.__('err_generic'), 'error');
        }
    }

    _handleBackToQueuesMobile() {
        const consoleEl = document.querySelector('.component-bottom--console');
        if (consoleEl) {
            consoleEl.classList.remove('component-bottom--mobile-chat-active');
        }
    }

    async _loadCannedResponses(language = null) {
        try {
            const payload = {};
            if (language) {
                payload.language = language;
            } else if (this.currentSession && this.currentSession.language) {
                payload.language = this.currentSession.language;
            } else {
                payload.language = document.documentElement.lang || 'es-419';
            }
            const res = await this.api.post(ApiRoutes.AdminSupport.GetCannedResponses, payload, this.abortController ? this.abortController.signal : undefined);
            if (res && res.success) {
                this.cannedResponses = res.responses || [];
                this._renderCannedDropdown();
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _renderCannedDropdown(filterQuery = '') {
        const container = document.querySelector('[data-ref="admin-canned-list-menu"]');
        const emptyEl = document.querySelector('[data-ref="admin-canned-empty"]');
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
                <div class="component-menu-link" data-action="insertCannedResponse" data-content="${this._escapeHtml(item.content)}">
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
        let content = item.getAttribute('data-content') || '';
        const clientName = this.currentSession?.client_username || this.currentSession?.guest_name || window.__('lbl_user', [], 'Usuario');
        const agentName = this.currentAgentName || window.currentUser?.username || window.__('lbl_agent', [], 'Agente');

        content = content
            .replace(/\{client_name\}/g, clientName)
            .replace(/\{agent_name\}/g, agentName)
            .replace(/\{user_name\}/g, clientName);

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

    async _loadQueues() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetLiveQueues, {}, this.abortController ? this.abortController.signal : undefined);
            if (res && res.success) {
                const queues = res.queues || {};
                const activeList = res.my_active_sessions || [];
                this.onlineAgents = res.online_agents || [];

                this.lastQueues = queues;
                this.lastActiveList = activeList;

                const b1 = document.querySelector('[data-ref="badge-queue-l1"]');
                const b2 = document.querySelector('[data-ref="badge-queue-l2"]');
                const b3 = document.querySelector('[data-ref="badge-queue-l3"]');
                const bAct = document.querySelector('[data-ref="badge-queue-active"]');

                if (b1) b1.textContent = (queues.l1 || []).length;
                if (b2) b2.textContent = (queues.l2 || []).length;
                if (b3) b3.textContent = (queues.l3 || []).length;
                if (bAct) bAct.textContent = activeList.length;

                if (this.currentSessionUuid) {
                    if (activeList.some(s => s.uuid === this.currentSessionUuid)) {
                        this.activeTab = 'active';
                    } else if ((queues.l2 || []).some(s => s.uuid === this.currentSessionUuid)) {
                        this.activeTab = 'l2';
                    } else if ((queues.l3 || []).some(s => s.uuid === this.currentSessionUuid)) {
                        this.activeTab = 'l3';
                    } else if ((queues.l1 || []).some(s => s.uuid === this.currentSessionUuid)) {
                        this.activeTab = 'l1';
                    }
                }

                this._syncActiveTabUI();

                if (this.currentSessionUuid) {
                    const isStillActive = activeList.some(s => s.uuid === this.currentSessionUuid);
                    const isStillInQueue = (queues.l1 || []).some(s => s.uuid === this.currentSessionUuid)
                        || (queues.l2 || []).some(s => s.uuid === this.currentSessionUuid)
                        || (queues.l3 || []).some(s => s.uuid === this.currentSessionUuid);

                    if (!isStillActive && !isStillInQueue && this.activeTab === 'active') {
                        this._resetChatView();
                    }
                }

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
            list = (queues && queues.l1) || [];
        } else if (this.activeTab === 'l2') {
            list = (queues && queues.l2) || [];
        } else if (this.activeTab === 'l3') {
            list = (queues && queues.l3) || [];
        } else if (this.activeTab === 'active') {
            list = activeList || [];
            isActiveTab = true;
        }

        if (!list || list.length === 0) {
            container.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                    <h3 class="component-card__title">${window.__('lbl_no_chats_in_queue')}</h3>
                </div>
            `;
            return;
        }

        let html = '';
        list.forEach(item => {
            const isSelected = item.uuid === this.currentSessionUuid;
            const selectedClass = isSelected ? 'active' : '';
            const priorityBadge = item.priority === 'urgent'
                ? `<span class="component-badge component-badge--sm component-badge--danger"><span class="material-symbols-rounded">flag</span></span>`
                : (item.priority === 'high' ? `<span class="component-badge component-badge--sm component-badge--warning"><span class="material-symbols-rounded">flag</span></span>` : '');
            const avatarHtml = this._renderAvatarHtml(item.client_avatar, item.client_username, item.client_subscription_color, 'component-avatar--static-sm');
            const isPending = !isActiveTab && (item.status === 'waiting_in_queue' || item.status === 'escalated' || !item.assigned_agent_id);
            const dotHtml = isPending ? `<span class="component-indicator-dot" title="${this._escapeHtml(window.__('lbl_pending_chat', [], 'Chat pendiente de atención'))}"></span>` : '';
            const actionAttr = isActiveTab ? 'data-action="selectActiveChat"' : 'data-action="selectQueueSession"';

            html += `
                <div class="component-group-item component-group-item--clickable ${selectedClass}" ${actionAttr} data-uuid="${this._escapeHtml(item.uuid)}">
                    ${dotHtml}
                    <div class="component-card__content">
                        ${avatarHtml}
                        <div class="component-card__text">
                            <h3 class="component-card__title">${this._escapeHtml(item.client_username || 'Guest')}</h3>
                            <p class="component-card__description">${this._escapeHtml(item.subject || item.initial_message || window.__('lbl_no_subject', [], 'Sin asunto'))}</p>
                        </div>
                    </div>
                    ${priorityBadge ? `<div class="component-card__actions">${priorityBadge}</div>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
        if (window.applySubscriptionDynamicColors) {
            try {
                window.applySubscriptionDynamicColors();
            } catch (e) {}
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

    _renderAvatarHtml(avatarUrl, username, subColorRaw, sizeClass = 'component-avatar--static-sm') {
        const subCss = this._parseSubscriptionColor(subColorRaw);
        const hasSub = subCss && subCss !== 'transparent';
        const dynamicClass = hasSub ? 'subscription-dynamic' : '';
        const styleAttr = hasSub ? `style="--active-subscription-bg: ${this._escapeHtml(subCss)};"` : '';
        const dataAttr = hasSub ? `data-sub-bg="${this._escapeHtml(subCss)}"` : '';
        const fallback = '/public/assets/img/fallbacks/avatar-default.png';
        const src = avatarUrl ? this._escapeHtml(avatarUrl) : fallback;

        return `
            <div class="component-button--profile ${dynamicClass} ${sizeClass}" ${dataAttr} ${styleAttr}>
                <img src="${src}" alt="${this._escapeHtml(username || 'Guest')}" onerror="this.src='${fallback}'">
            </div>
        `;
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
                this._syncActiveTabUI();
                if (this.currentSession) {
                    this.currentSession.status = 'active';
                    this.currentSession.assigned_agent_id = this.agentId || window.activeUserId || 1;
                }
                await this._loadQueues();
                await this._loadMessages();

                const chatInput = document.querySelector('[data-ref="admin-support-chat-input"]');
                if (chatInput) {
                    chatInput.focus();
                }
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
        if (!uuid) return;
        if (this.currentSessionUuid === uuid && this.currentSession && this.currentSession.uuid === uuid) {
            return;
        }

        if (this.currentSessionUuid !== uuid) {
            this.lastRenderedMaxId = 0;
            this.hasInitialMessagesLoaded = false;
            this.selectedFiles = [];
            this._renderAttachmentPreviews();
        }
        this.currentSessionUuid = uuid;

        const targetPath = `/admin/support/live-console/c/${uuid}`;
        if (window.location.pathname !== targetPath) {
            window.history.replaceState(null, '', targetPath);
        }

        const consoleEl = document.querySelector('.component-bottom--console');
        if (consoleEl) {
            consoleEl.classList.add('component-bottom--mobile-chat-active');
        }

        const allItems = document.querySelectorAll('[data-action="selectActiveChat"], [data-action="selectQueueSession"]');
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

        const messagesContainer = document.querySelector('[data-ref="admin-support-messages-list"]');
        if (messagesContainer && (!this.currentSession || this.currentSession.uuid !== this.currentSessionUuid)) {
            renderSkeleton(messagesContainer, 'chatSkeleton');
        }

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetSessionMessages, {
                session_uuid: this.currentSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success && res.session) {
                this.currentSession = res.session;

                const isMyActive = res.session.status === 'active' || (this.lastActiveList && this.lastActiveList.some(s => s.uuid === this.currentSessionUuid));
                if (isMyActive) {
                    this.activeTab = 'active';
                    try {
                        localStorage.setItem('pr_active_agent_support_session', JSON.stringify(res.session));
                        if (window.adminSupportFloatingController) {
                            window.adminSupportFloatingController.setActiveSession(res.session);
                        }
                    } catch (e) {}
                } else if (res.session.department_level) {
                    this.activeTab = res.session.department_level;
                }
                this._syncActiveTabUI();
                if (this.lastQueues && this.lastActiveList) {
                    this._renderCurrentQueueList(this.lastQueues, this.lastActiveList);
                }

                const header = document.querySelector('[data-ref="admin-support-chat-header"]');
                if (header) {
                    header.classList.remove('disabled');
                }

                const isPending = !isMyActive && (res.session.status === 'waiting_in_queue' || (res.session.status === 'escalated' && !res.session.assigned_agent_id));

                this._renderActiveChatHeader(res.session, isPending);

                if (isPending) {
                    this._renderPendingClaimView(res.session);
                } else {
                    this._renderMessages(res.messages || [], res.session);
                }

                this._renderClientSidebar(res.session);

                const footer = document.querySelector('[data-ref="admin-support-chat-footer"]');
                const actions = document.querySelector('[data-ref="admin-chat-top-actions"]');

                if (footer) {
                    if (isPending) {
                        footer.classList.add('disabled');
                        footer.classList.remove('active');
                    } else {
                        footer.classList.remove('disabled');
                        footer.classList.add('active');

                        const lang = res.session.language || 'es-419';
                        const chatInput = document.querySelector('[data-ref="admin-support-chat-input"]');
                        if (chatInput && this.aiImprover) {
                            const btn = this.aiImprover.attachButton(chatInput, lang, 'chat');
                            this.aiImprover.setVisibility(chatInput, !this.isInternalNoteMode);
                            if (this.isAutoImproveActive && btn) {
                                btn.classList.add('is-auto-active');
                            }
                        }
                    }
                }
                if (actions) {
                    if (isPending) {
                        actions.classList.add('disabled');
                    } else {
                        actions.classList.remove('disabled');
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _renderPendingClaimView(session) {
        const container = document.querySelector('[data-ref="admin-support-messages-list"]');
        if (!container || !session) return;

        const subject = session.subject || window.__('lbl_no_subject', [], 'Sin asunto');
        const description = session.initial_message || session.subject || window.__('lbl_no_description', [], 'Sin descripción proporcionada');
        const category = session.category || 'general';
        const priority = session.priority || 'medium';
        const priorityClass = priority === 'urgent' ? 'component-badge--danger' : (priority === 'high' ? 'component-badge--warning' : '');
        const timeWaiting = session.created_at || '';

        const subjectLabel = (window.__ && window.__('lbl_problem_subject') !== 'lbl_problem_subject')
            ? window.__('lbl_problem_subject')
            : 'Asunto';

        const descLabel = (window.__ && window.__('lbl_problem_description') !== 'lbl_problem_description')
            ? window.__('lbl_problem_description')
            : 'Descripción';

        container.innerHTML = `
            <div class="component-support-claim-container">
                <div class="component-support-claim-card">
                    <div class="component-card--grouped component-w-full">
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <span class="component-card__label">${this._escapeHtml(subjectLabel)}</span>
                                    <h3 class="component-card__title">${this._escapeHtml(subject)}</h3>
                                </div>
                            </div>
                        </div>
                        <hr class="component-divider">
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <span class="component-card__label">${this._escapeHtml(descLabel)}</span>
                                    <p class="component-card__description">${this._escapeHtml(description).replace(/\n/g, '<br>')}</p>
                                </div>
                            </div>
                        </div>
                        <hr class="component-divider">
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-badge-group">
                                    <span class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">category</span>
                                        <span>${this._escapeHtml(category)}</span>
                                    </span>
                                    <span class="component-badge component-badge--sm ${priorityClass}">
                                        <span class="material-symbols-rounded">flag</span>
                                        <span>${this._escapeHtml(priority)}</span>
                                    </span>
                                    ${timeWaiting ? `
                                    <span class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">schedule</span>
                                        <span>${this._escapeHtml(timeWaiting)}</span>
                                    </span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderActiveChatHeader(session, isPending = false) {
        const header = document.querySelector('[data-ref="admin-support-chat-header"]');
        if (!header || !session) return;

        header.classList.remove('disabled');
        header.classList.add('active');

        const clientName = session.client_username || session.guest_name || window.__('lbl_guest', [], 'Invitado');

        if (isPending) {
            const helpTitle = (window.__ && window.__('lbl_user_requests_help') !== 'lbl_user_requests_help')
                ? window.__('lbl_user_requests_help', { user: clientName })
                : `${clientName} solicita ayuda`;
            const claimBtnText = (window.__ && window.__('btn_claim_chat') !== 'btn_claim_chat')
                ? window.__('btn_claim_chat')
                : 'Atender Chat';

            header.innerHTML = `
                <div class="component-mobile-back-box">
                    <button class="component-button component-button--icon component-button--h34" data-action="backToQueuesMobile" data-tooltip="${this._escapeHtml(window.__('btn_back_to_queues', [], 'Volver a colas de espera'))}" data-position="bottom" type="button">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                </div>
                <div class="component-chat-header-title-box">
                    <h2 class="component-top-title" data-ref="current-chat-client-name">${this._escapeHtml(helpTitle)}</h2>
                </div>
                <div class="component-chat-header-actions" data-ref="admin-chat-pending-actions">
                    <button class="component-button component-button--dark component-button--h34" data-action="claimSession" data-uuid="${this._escapeHtml(session.uuid)}" type="button">
                        <span class="material-symbols-rounded">headset_mic</span>
                        <span>${this._escapeHtml(claimBtnText)}</span>
                    </button>
                </div>
            `;
            return;
        }

        const dept = session.department_level ? ` (${session.department_level.toUpperCase()})` : '';
        const langCode = (session.language || 'es-419').toLowerCase();
        const langName = langCode.startsWith('en') ? window.__('lbl_lang_en', [], 'Inglés') : window.__('lbl_lang_es', [], 'Español');
        const subjectText = `${session.category || 'general'} • ${clientName} • ${langName}`;
        const avatarHtml = this._renderAvatarHtml(session.client_avatar, session.client_username, session.client_subscription_color, 'component-avatar--static-sm');

        header.innerHTML = `
            <div class="component-mobile-back-box">
                <button class="component-button component-button--icon component-button--h34" data-action="backToQueuesMobile" data-tooltip="${this._escapeHtml(window.__('btn_back_to_queues', [], 'Volver a colas de espera'))}" data-position="bottom" type="button">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
            </div>
            <div class="component-card__content component-cursor-pointer" data-action="toggleModule" data-target="moduleSupportClientInfo" data-ref="current-chat-header-info">
                <div data-ref="current-chat-client-avatar-container">
                    ${avatarHtml}
                </div>
                <div class="component-card__text">
                    <h2 class="component-card__title" data-ref="current-chat-client-name">${this._escapeHtml(clientName + dept)}</h2>
                    <p class="component-card__description" data-ref="current-chat-client-subject">${this._escapeHtml(subjectText)}</p>
                </div>
            </div>
            <div class="component-dropdown-wrapper component-dropdown-wrapper--fit" data-ref="admin-chat-top-actions">
                <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="adminChatMoreDropdown" data-tooltip="${this._escapeHtml(window.__('btn_options', [], 'Opciones'))}" data-position="bottom" type="button">
                    <span class="material-symbols-rounded">more_vert</span>
                </button>
                <div class="component-module component-module--dropdown disabled" data-module="adminChatMoreDropdown">
                    <div class="component-menu component-menu--w265 component-menu--h-auto active" data-menu="admin-chat-more-menu">
                        <div class="pill-container"><div class="drag-handle"></div></div>
                        <div class="component-menu-list">
                            <div class="component-menu-link" data-action="openViewIssueModal">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">help_outline</span></div>
                                <div class="component-menu-link-text"><span>${this._escapeHtml(window.__('lbl_view_issue', [], 'Ver Asunto'))}</span></div>
                            </div>
                            <div class="component-menu-link" data-action="toggleModule" data-target="moduleSupportClientInfo">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">info</span></div>
                                <div class="component-menu-link-text"><span>${this._escapeHtml(window.__('lbl_user_profile_title', [], 'Información del Usuario'))}</span></div>
                            </div>
                            ${this.canEscalate ? `
                            <div class="component-menu-link" data-action="openEscalateModal">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">forward</span></div>
                                <div class="component-menu-link-text"><span>${this._escapeHtml(window.__('btn_escalate_chat', [], 'Escalar Chat'))}</span></div>
                            </div>` : ''}
                            ${this.canReassign ? `
                            <div class="component-menu-link" data-action="openReassignModal">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">swap_horiz</span></div>
                                <div class="component-menu-link-text"><span>${this._escapeHtml(window.__('btn_reassign_chat', [], 'Reasignar Chat'))}</span></div>
                            </div>` : ''}
                            <div class="component-menu-divider"></div>
                            <div class="component-menu-link" data-action="openCloseChatModal">
                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">check_circle</span></div>
                                <div class="component-menu-link-text"><span>${this._escapeHtml(window.__('btn_resolve_chat', [], 'Finalizar y Resolver'))}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.applySubscriptionDynamicColors) window.applySubscriptionDynamicColors();
        this._loadCannedResponses(session.language);
    }

    async _renderClientSidebar(session) {
        const container = document.querySelector('[data-ref="admin-support-client-info"]');
        if (!container || !session) return;

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetClientProfile, { session_uuid: session.uuid }, this.abortController ? this.abortController.signal : undefined);
            if (!res || !res.success) {
                container.innerHTML = `
                    <div class="component-empty-state">
                        <span class="material-symbols-rounded component-empty-state-icon">person_off</span>
                        <h3 class="component-card__title">${window.__('lbl_no_user_info', [], 'No hay información del usuario')}</h3>
                    </div>
                `;
                return;
            }

            if (res.is_guest || !res.user) {
                const avatarHtml = this._renderAvatarHtml(session.client_avatar, session.client_username || 'Guest', null, 'component-avatar--40');
                container.innerHTML = `
                    <div class="component-card--grouped">
                        <div class="component-group-item">
                            <div class="component-card__content">
                                ${avatarHtml}
                                <div class="component-card__text">
                                    <h3 class="component-card__title">${this._escapeHtml(session.client_username || 'Invitado')}</h3>
                                    <p class="component-card__description">${this._escapeHtml(session.client_email || 'Sin correo')}</p>
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
                    </div>
                `;
                return;
            }

            const user = res.user;
            const perms = res.permissions || {};
            const recentTickets = res.recent_tickets || [];

            const avatarHtml = this._renderAvatarHtml(user.profile_picture, user.username, user.subscription_color, 'component-avatar--40');

            this.currentClientUserUuid = user.uuid;
            this.currentClientUsername = user.username;
            this.currentClientEmail = user.email;
            this.currentClientData = user;

            const __ = (k, p, d) => (window.__ && window.__(k) !== k) ? window.__(k, p) : (d || k);

            let recentTicketsHtml = '';
            if (recentTickets.length > 0) {
                recentTicketsHtml = recentTickets.map(t => `
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-badge component-badge--sm">${this._escapeHtml(t.category || '')}</span>
                                <h4 class="component-card__title component-mt-1">${this._escapeHtml(t.subject || '')}</h4>
                                <p class="component-card__description">${this._escapeHtml(t.status || '')} &bull; ${this._escapeHtml(t.created_at || '')}</p>
                            </div>
                        </div>
                    </div>
                `).join('<hr class="component-divider">');
            } else {
                recentTicketsHtml = `<p class="component-card__description">${__('lbl_no_prior_tickets', [], 'Sin tickets previos')}</p>`;
            }

            container.innerHTML = `
                <div class="component-card--grouped component-mb-3">
                    <div class="component-group-item">
                        <div class="component-card__content">
                            ${avatarHtml}
                            <div class="component-card__text">
                                <h3 class="component-card__title">${this._escapeHtml(user.username || 'User')}</h3>
                                <p class="component-card__description">${this._escapeHtml(user.email || '')}</p>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-badge-group">
                                <span class="component-badge component-badge--sm">${this._escapeHtml(user.subscription_name || 'Básico')}</span>
                                <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">toll</span> ${user.coins || 0}</span>
                                <span class="component-badge component-badge--sm">${user.two_factor_enabled ? '2FA Activo' : '2FA Off'}</span>
                                ${user.is_suspended ? `<span class="component-badge component-badge--sm component-badge--danger"><span class="material-symbols-rounded">block</span> Suspendido</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-item-card component-p-3">
                    <h4 class="component-card__title component-mb-2">${__('lbl_recent_tickets', [], 'Tickets Recientes')}</h4>
                    <div class="component-card--grouped">
                        ${recentTicketsHtml}
                    </div>
                </div>
            `;

            if (window.applySubscriptionDynamicColors) window.applySubscriptionDynamicColors();
        } catch (e) {
            console.error("Failed to render client sidebar: " + e.message);
        }
    }

    _findSession(uuid) {
        if (!uuid) return null;
        if (this.currentSession && this.currentSession.uuid === uuid) {
            return this.currentSession;
        }
        if (this.lastActiveList && Array.isArray(this.lastActiveList)) {
            const found = this.lastActiveList.find(s => s.uuid === uuid);
            if (found) return found;
        }
        if (this.lastQueues) {
            for (const qKey of ['l1', 'l2', 'l3']) {
                const list = this.lastQueues[qKey];
                if (Array.isArray(list)) {
                    const found = list.find(s => s.uuid === uuid);
                    if (found) return found;
                }
            }
        }
        return this.currentSession || { uuid };
    }

    _renderMessages(messages) {
        const container = document.querySelector('[data-ref="admin-support-messages-list"]');
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
        const initialIssueMsg = this.currentSession?.initial_message;

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

            if (this.aiImprover) {
                this.aiImprover.setVisibility(input, !this.isInternalNoteMode);
            }
        }
    }

    _toggleAutoImprove(btn = null) {
        this.isAutoImproveActive = !this.isAutoImproveActive;
        try {
            localStorage.setItem('pr_support_ai_auto_improve', this.isAutoImproveActive ? 'true' : 'false');
        } catch (e) {}

        const allButtons = document.querySelectorAll('[data-action="aiImproveText"]');
        allButtons.forEach(b => {
            if (this.isAutoImproveActive) {
                b.classList.add('is-auto-active');
            } else {
                b.classList.remove('is-auto-active');
            }
        });

        const input = document.querySelector('[data-ref="admin-support-chat-input"]');
        const text = (input?.value || '').trim();

        if (this.isAutoImproveActive) {
            showMessage(window.__('msg_ai_auto_improve_enabled', [], '✨ Auto-mejora con IA activada para las respuestas'), 'info');
            if (text.length >= 2 && this.aiImprover && input) {
                this.aiImprover._handleImproveClick(input);
            }
        } else {
            showMessage(window.__('msg_ai_auto_improve_disabled', [], 'Auto-mejora con IA desactivada'), 'info');
        }
    }

    async _sendMessage() {
        const input = document.querySelector('[data-ref="admin-support-chat-input"]');
        if (!input || !this.currentSessionUuid) return;

        let text = input.value.trim();
        const hasFiles = this.selectedFiles && this.selectedFiles.length > 0;

        if (!text && !hasFiles) return;

        const filesToSend = [...this.selectedFiles];
        this.selectedFiles = [];
        this._renderAttachmentPreviews();

        input.value = '';

        // Si la auto-mejora está activa y no es nota interna, mejorar antes de enviar
        if (this.isAutoImproveActive && !this.isInternalNoteMode && text.length >= 2 && this.aiImprover) {
            try {
                const lang = this.currentSession?.language || 'es-419';
                const improved = await this.aiImprover.provider.improve(text, lang, 'chat', this.abortController ? this.abortController.signal : null);
                if (improved && improved.trim().length > 0) {
                    text = improved.trim();
                }
            } catch (e) {
                // Fallback silencioso al texto original si falla la IA
            }
        }

        try {
            const route = this.isInternalNoteMode
                ? ApiRoutes.AdminSupport.AddInternalNote
                : ApiRoutes.AdminSupport.SendMessage;

            let res;
            if (hasFiles && !this.isInternalNoteMode) {
                const formData = new FormData();
                formData.append('session_uuid', this.currentSessionUuid);
                formData.append('message', text);
                filesToSend.forEach(file => {
                    formData.append('images[]', file);
                });
                res = await this.api.postForm(route, formData, this.abortController ? this.abortController.signal : undefined);
            } else {
                const payload = this.isInternalNoteMode
                    ? { session_uuid: this.currentSessionUuid, note: text }
                    : { session_uuid: this.currentSessionUuid, message: text };
                res = await this.api.post(route, payload, this.abortController ? this.abortController.signal : undefined);
            }

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

    _closeMoreDropdown() {
        const dropdown = document.querySelector('[data-module="adminChatMoreDropdown"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }
    }

    _openEscalateModal() {
        if (!this.currentSessionUuid || !window.modalSystem) return;
        this._closeMoreDropdown();
        window.modalSystem.show('escalateChatModal', {
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
            if (window.modalSystem) window.modalSystem.closeCurrent();

            if (res && res.success) {
                showMessage(window.__('msg_support_escalated_successfully'), 'success');
                this._resetChatView();
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

    _openReassignModal() {
        if (!this.currentSessionUuid || !window.modalSystem) return;
        this._closeMoreDropdown();
        window.modalSystem.show('reassignChatModal', {
            sessionUuid: this.currentSessionUuid,
            onlineAgents: this.onlineAgents
        });
    }

    _handleSelectReassignAgent(item) {
        const val = item.getAttribute('data-val');
        const labelText = item.querySelector('.component-menu-link-text span')?.textContent || val;

        const textEl = document.querySelector('[data-ref="reassign-agent-text"]');
        if (textEl) {
            textEl.textContent = labelText;
            textEl.setAttribute('data-value', val);
        }

        const menuList = item.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
        }

        const dropdown = document.querySelector('[data-module="dropdownReassignAgent"]');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.classList.add('disabled');
        }
    }

    async _submitReassign(btn) {
        const form = document.querySelector('[data-ref="admin-reassign-form"]');
        if (!form || !btn || btn.classList.contains('disabled-interaction')) return;

        const sessionUuid = form.getAttribute('data-session-uuid');
        const agentText = document.querySelector('[data-ref="reassign-agent-text"]');
        const toAgentId = agentText ? agentText.getAttribute('data-value') : null;

        if (!toAgentId) {
            showMessage(window.__('err_invalid_request'), 'error');
            return;
        }

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.ReassignSession, {
                session_uuid: sessionUuid,
                to_agent_id: toAgentId
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);
            if (window.modalSystem) window.modalSystem.closeCurrent();

            if (res && res.success) {
                showMessage(window.__('msg_support_reassigned_successfully'), 'success');
                this._resetChatView();
                await this._loadQueues();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_reassign_failed'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_support_reassign_failed'), 'error');
        }
    }

    _openCloseModal() {
        if (!this.currentSessionUuid || !window.modalSystem) return;
        this._closeMoreDropdown();
        window.modalSystem.show('closeChatModal', {
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
            if (window.modalSystem) window.modalSystem.closeCurrent();

            if (res && res.success) {
                showMessage(window.__('msg_support_session_ended'), 'success');
                this._resetChatView();
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

    _resetChatView() {
        this.currentSessionUuid = null;
        this.currentSession = null;
        try {
            localStorage.removeItem('pr_active_agent_support_session');
            if (window.adminSupportFloatingController) {
                window.adminSupportFloatingController.clearActiveSession();
            }
        } catch (e) {}

        if (window.location.pathname !== '/admin/support/live-console') {
            window.history.replaceState(null, '', '/admin/support/live-console');
        }

        const header = document.querySelector('[data-ref="admin-support-chat-header"]');
        const nameEl = document.querySelector('[data-ref="current-chat-client-name"]');
        const subjectEl = document.querySelector('[data-ref="current-chat-client-subject"]');
        const avatarContainer = document.querySelector('[data-ref="current-chat-client-avatar-container"]');
        const messagesContainer = document.querySelector('[data-ref="admin-support-messages-list"]');
        const footer = document.querySelector('[data-ref="admin-support-chat-footer"]');
        const actions = document.querySelector('[data-ref="admin-chat-top-actions"]');
        const clientInfo = document.querySelector('[data-ref="admin-support-client-info"]');
        const chatInput = document.querySelector('[data-ref="admin-support-chat-input"]');
        const typingIndicator = document.querySelector('[data-ref="admin-support-typing-indicator"]');

        if (header) header.classList.add('disabled');
        if (chatInput) {
            chatInput.value = '';
            if (this.aiImprover) {
                this.aiImprover.detachButton(chatInput);
            }
        }
        if (typingIndicator) typingIndicator.classList.add('disabled');
        if (nameEl) nameEl.textContent = window.__('lbl_select_chat_to_attend');
        if (subjectEl) subjectEl.textContent = window.__('lbl_no_active_chat_selected');
        if (avatarContainer) {
            const fallback = '/public/assets/img/fallbacks/avatar-default.png';
            avatarContainer.innerHTML = `
                <div class="component-button--profile component-avatar--static-sm">
                    <img class="avatar-image" src="${fallback}" alt="Guest">
                </div>
            `;
        }
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">chat_bubble_outline</span>
                    <h3 class="component-card__title">${window.__('lbl_select_chat_prompt')}</h3>
                    <p class="component-card__description">${window.__('lbl_no_active_chat_selected')}</p>
                </div>
            `;
        }
        if (footer) footer.classList.add('disabled');
        if (actions) actions.classList.add('disabled');
        if (clientInfo) {
            clientInfo.innerHTML = `
                <div class="component-card--grouped">
                    <div class="component-empty-state">
                        <span class="material-symbols-rounded component-empty-state-icon">account_circle</span>
                        <h3 class="component-card__title">${window.__('lbl_no_user_selected')}</h3>
                    </div>
                </div>
            `;
        }

        const allItems = document.querySelectorAll('[data-action="selectActiveChat"], [data-action="selectQueueSession"]');
        allItems.forEach(item => item.classList.remove('active'));

        const consoleBottom = document.querySelector('.component-bottom--console');
        if (consoleBottom) consoleBottom.classList.remove('component-bottom--mobile-chat-active');
    }

    _escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
