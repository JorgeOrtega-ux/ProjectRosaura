import { ApiRoutes, WsConfig } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../core/utils/uiUtils.js';
import { ImageViewerSystem } from '../../core/components/ImageViewerSystem.js';

export class ContactSupportController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
        this.turnstileWidgetId = undefined;
        this.activeSessionUuid = null;
        this.csatSessionUuid = null;
        this.currentRating = 5;
        this.selectedFiles = [];

        this.ws = null;
        this.wsReconnectTimeout = null;
        this.wsHeartbeatInterval = null;
        this.isIntentionalDisconnect = false;
        this.typingTimeout = null;
        this._moduleObserver = null;
        this.lastRenderedMaxId = 0;
        this.hasInitialMessagesLoaded = false;
        this.lastPlayedMessageId = null;

        this._boundClick = this.handleClick.bind(this);
        this._boundKeydown = this.handleKeydown.bind(this);
        this._boundInput = this.handleInput.bind(this);
        this._boundChange = this.handleChange.bind(this);
        this._boundPaste = this.handlePaste.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="contact-support-wrapper"]');
        this.abortController = new AbortController();
        this.bindEvents();
        this._setupModuleObserver();
        this._restoreActiveSession();
        this._renderTurnstile();
        this._checkLiveChatStatus();
    }

    bindEvents() {
        this.unbindEvents();
        document.body.addEventListener('click', this._boundClick);
        document.body.addEventListener('keydown', this._boundKeydown);
        document.body.addEventListener('input', this._boundInput);
        document.body.addEventListener('change', this._boundChange);
        document.body.addEventListener('paste', this._boundPaste);
    }

    unbindEvents() {
        document.body.removeEventListener('click', this._boundClick);
        document.body.removeEventListener('keydown', this._boundKeydown);
        document.body.removeEventListener('input', this._boundInput);
        document.body.removeEventListener('change', this._boundChange);
        document.body.removeEventListener('paste', this._boundPaste);
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

        this.unbindEvents();

        if (this._moduleObserver) {
            this._moduleObserver.disconnect();
            this._moduleObserver = null;
        }

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
                this._loadMessages();
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

    _restoreActiveSession() {
        try {
            const raw = localStorage.getItem('pr_active_support_session');
            if (!raw) return;
            const data = JSON.parse(raw);
            const uuid = data.session_uuid || data.uuid;
            if (!uuid) return;

            this.activeSessionUuid = uuid;
            const status = data.status || 'queue';

            if (status === 'queue' || status === 'waiting' || status === 'waiting_in_queue') {
                this._showState('queue');
                this._connectWebSocket(uuid);
            } else if (status === 'room' || status === 'active' || status === 'in_progress') {
                this._showState('room');
                this._connectWebSocket(uuid);
                this._loadMessages();
            }
            this._updateFloatingButtonVisibility();
        } catch (e) {}
    }

    _handleWsEvent(payload) {
        if (!payload) return;

        if (payload.type === 'support_event') {
            const event = payload.event;
            const sessionUuid = payload.session_uuid;

            if (sessionUuid && sessionUuid !== this.activeSessionUuid) return;

            switch (event) {
                case 'new_message': {
                    const isFromAgent = payload.data && (
                        payload.data.sender_type === 'agent' ||
                        payload.data.sender_type === 'system' ||
                        (payload.data.message && (payload.data.message.sender_type === 'agent' || payload.data.message.sender_type === 'system'))
                    );
                    const msgId = Number(payload.data?.message?.id || payload.data?.id) || null;
                    if (isFromAgent) {
                        this._playNotificationSound('message');
                        if (msgId) this.lastPlayedMessageId = msgId;
                    }
                    this._loadMessages();
                    break;
                }
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
                    this._cleanupEndedSession();
                    if (window.modalSystem) {
                        window.modalSystem.show('supportCsatModal');
                    }
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

    _playNotificationSound(type = 'message') {
        try {
            const soundMap = {
                message: '/public/assets/sounds/support/chat_message.mp3',
                incoming: '/public/assets/sounds/support/chat_incoming.mp3',
                resolved: '/public/assets/sounds/support/chat_resolved.mp3'
            };
            const src = soundMap[type] || soundMap.message;
            const audio = new Audio(src);
            audio.volume = 0.5;
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

        const openTicketModalBtn = e.target.closest('[data-action="openCreateTicketModal"]');
        if (openTicketModalBtn) {
            e.preventDefault();
            if (window.modalSystem) {
                window.modalSystem.show('createSupportTicketModal');
                setTimeout(() => {
                    this._renderTurnstile();
                }, 100);
            }
            return;
        }

        const openLiveChatModalBtn = e.target.closest('[data-action="openStartLiveChatModal"]');
        if (openLiveChatModalBtn) {
            e.preventDefault();
            const isUserLoggedIn = !!(window.activeUserId || (window.APP_USER && window.APP_USER.id));
            if (!isUserLoggedIn) {
                const loginUrl = window.APP_CONFIG?.APP_URL ? `${window.APP_CONFIG.APP_URL}/login` : '/login';
                if (window.spaRouter) {
                    window.spaRouter.navigate(loginUrl);
                } else {
                    window.location.href = loginUrl;
                }
                return;
            }

            if (this.activeSessionUuid) {
                const moduleEl = document.querySelector('[data-module="moduleSupportChat"]');
                if (moduleEl && window.appInstance?.moduleManager) {
                    window.appInstance.moduleManager.open(moduleEl);
                }
            } else {
                if (this.isLiveChatOnline === false) {
                    if (window.modalSystem) {
                        window.modalSystem.show('supportLiveChatUnavailableModal');
                    }
                } else {
                    if (window.modalSystem) {
                        window.modalSystem.show('startLiveSupportChatModal');
                    }
                }
            }
            return;
        }

        const switchOfflineModalBtn = e.target.closest('[data-action="switchFromOfflineModalToTicket"]');
        if (switchOfflineModalBtn) {
            e.preventDefault();
            if (window.modalSystem) {
                window.modalSystem.closeCurrent();
                const isUserLoggedIn = !!(window.activeUserId || (window.APP_USER && window.APP_USER.id));
                if (isUserLoggedIn) {
                    setTimeout(() => {
                        window.modalSystem.show('createSupportTicketModal');
                        setTimeout(() => {
                            this._renderTurnstile();
                        }, 100);
                    }, 200);
                } else {
                    const loginUrl = window.APP_CONFIG?.APP_URL ? `${window.APP_CONFIG.APP_URL}/login` : '/login';
                    if (window.spaRouter) {
                        window.spaRouter.navigate(loginUrl);
                    } else {
                        window.location.href = loginUrl;
                    }
                }
            }
            return;
        }

        const selectModalCatItem = e.target.closest('[data-action="selectModalTicketCategory"]');
        if (selectModalCatItem) {
            e.preventDefault();
            const val = selectModalCatItem.getAttribute('data-val');
            const text = selectModalCatItem.querySelector('.component-menu-link-text span')?.textContent || val;
            const icon = selectModalCatItem.getAttribute('data-icon') || 'bug_report';

            const catTextEl = document.querySelector('[data-ref="modal_ticket_cat_text"]');
            if (catTextEl) catTextEl.textContent = text;

            const catIconEl = document.querySelector('[data-ref="modal_ticket_cat_icon"]');
            if (catIconEl) catIconEl.textContent = icon;

            const hiddenCat = document.querySelector('[data-ref="modal_ticket_category"]');
            if (hiddenCat) hiddenCat.value = val;

            const menuList = selectModalCatItem.closest('.component-menu-list');
            if (menuList) {
                menuList.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
                selectModalCatItem.classList.add('active');
            }

            const dropdown = document.querySelector('[data-module="moduleSupportTicketCategory"]');
            if (dropdown) {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            }
            return;
        }

        const selectModalLiveCatItem = e.target.closest('[data-action="selectModalLiveCategory"]');
        if (selectModalLiveCatItem) {
            e.preventDefault();
            const val = selectModalLiveCatItem.getAttribute('data-val');
            const text = selectModalLiveCatItem.querySelector('.component-menu-link-text span')?.textContent || val;
            const icon = selectModalLiveCatItem.getAttribute('data-icon') || 'bug_report';

            const catTextEl = document.querySelector('[data-ref="modal_live_cat_text"]');
            if (catTextEl) catTextEl.textContent = text;

            const catIconEl = document.querySelector('[data-ref="modal_live_cat_icon"]');
            if (catIconEl) catIconEl.textContent = icon;

            const hiddenCat = document.querySelector('[data-ref="modal_live_category"]');
            if (hiddenCat) hiddenCat.value = val;

            const menuList = selectModalLiveCatItem.closest('.component-menu-list');
            if (menuList) {
                menuList.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
                selectModalLiveCatItem.classList.add('active');
            }

            const dropdown = document.querySelector('[data-module="moduleLiveChatCategory"]');
            if (dropdown) {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            }
            return;
        }

        const nextStepBtn = e.target.closest('[data-action="modalNextTicketStep"]');
        if (nextStepBtn) {
            e.preventDefault();
            const targetStep = nextStepBtn.getAttribute('data-next');
            const currentCard = nextStepBtn.closest('.component-modal-step');
            
            if (currentCard && currentCard.getAttribute('data-ref') === 'step-2-subject') {
                const subjectInput = document.querySelector('[data-ref="modal_ticket_subject"], [data-ref="modal_live_subject"]');
                const subjectVal = subjectInput ? subjectInput.value.trim() : '';
                if (!subjectVal || subjectVal.length < 3) {
                    showMessage(window.__('err_support_invalid_subject'), 'error');
                    if (subjectInput) subjectInput.focus();
                    return;
                }
            }

            if (currentCard) {
                currentCard.classList.remove('active');
                currentCard.classList.add('disabled');
            }

            const nextCard = document.querySelector(`[data-ref="${targetStep}"]`);
            if (nextCard) {
                nextCard.classList.remove('disabled');
                nextCard.classList.add('active');
                if (targetStep === 'step-2-subject') {
                    const subj = nextCard.querySelector('[data-ref="modal_ticket_subject"], [data-ref="modal_live_subject"]');
                    if (subj) setTimeout(() => subj.focus(), 150);
                } else if (targetStep === 'step-3-message') {
                    const msg = nextCard.querySelector('[data-ref="modal_ticket_message"], [data-ref="modal_live_message"]');
                    if (msg) setTimeout(() => msg.focus(), 150);
                    this._renderTurnstile();
                }
            }
            return;
        }

        const prevStepBtn = e.target.closest('[data-action="modalPrevTicketStep"]');
        if (prevStepBtn) {
            e.preventDefault();
            const targetStep = prevStepBtn.getAttribute('data-prev');
            const currentCard = prevStepBtn.closest('.component-modal-step');
            if (currentCard) {
                currentCard.classList.remove('active');
                currentCard.classList.add('disabled');
            }
            const prevCard = document.querySelector(`[data-ref="${targetStep}"]`);
            if (prevCard) {
                prevCard.classList.remove('disabled');
                prevCard.classList.add('active');
            }
            return;
        }

        const leaveQueueBtn = e.target.closest('[data-action="leaveSupportQueue"]');
        if (leaveQueueBtn) {
            e.preventDefault();
            this._leaveQueue();
            return;
        }

        const submitModalTicketBtn = e.target.closest('[data-action="submitModalSupportTicket"]');
        if (submitModalTicketBtn) {
            e.preventDefault();
            this._submitModalTicket(submitModalTicketBtn);
            return;
        }

        const submitLiveChatModalBtn = e.target.closest('[data-action="submitStartLiveChatModal"]');
        if (submitLiveChatModalBtn) {
            e.preventDefault();
            this._submitStartLiveChatModal(submitLiveChatModalBtn);
            return;
        }

        const triggerAttachBtn = e.target.closest('[data-action="triggerSupportChatAttach"]');
        if (triggerAttachBtn) {
            e.preventDefault();
            const fileInput = document.getElementById('support-chat-file-input');
            if (fileInput) fileInput.click();
            const dropdown = document.querySelector('[data-module="support-attach-menu"]');
            if (dropdown && window.appInstance?.moduleManager) {
                window.appInstance.moduleManager.close(dropdown);
            }
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

        const viewIssueBtn = e.target.closest('[data-action="openViewIssueModal"]');
        if (viewIssueBtn) {
            e.preventDefault();
            const dropdown = document.querySelector('[data-module="supportUserChatMoreDropdown"]');
            if (dropdown) {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            }
            if (this.currentSessionData && window.modalSystem) {
                window.modalSystem.show('viewIssueModal', {
                    category: this.currentSessionData.category || 'general',
                    subject: this.currentSessionData.subject || '',
                    description: this.currentSessionData.initial_message || '',
                    time: this.currentSessionData.started_at || '',
                    priority: this.currentSessionData.priority || 'medium'
                });
            }
            return;
        }

        const endChatBtn = e.target.closest('[data-action="endSupportChatSession"]');
        if (endChatBtn) {
            e.preventDefault();
            const dropdown = document.querySelector('[data-module="supportUserChatMoreDropdown"]');
            if (dropdown) {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            }
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

        const toggleDropdownBtn = e.target.closest('[data-action="toggleDropdown"]');
        if (toggleDropdownBtn) {
            e.preventDefault();
            e.stopPropagation();
            const targetId = toggleDropdownBtn.getAttribute('data-target');
            const dropdown = document.querySelector(`[data-module="${targetId}"]`);
            if (dropdown) {
                const isCurrentlyActive = !dropdown.classList.contains('disabled');
                document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(d => {
                    d.classList.remove('active');
                    d.classList.add('disabled');
                });
                if (!isCurrentlyActive) {
                    dropdown.classList.remove('disabled');
                    dropdown.classList.add('active');
                }
            }
            return;
        }

        const submitModalCsatBtn = e.target.closest('[data-action="submitModalCsatFeedback"]');
        if (submitModalCsatBtn) {
            e.preventDefault();
            this._submitModalCsatFeedback(submitModalCsatBtn);
            return;
        }

        const triggerAttach = e.target.closest('[data-action="triggerSupportChatAttach"]');
        if (triggerAttach) {
            e.preventDefault();
            const fileInput = document.getElementById('support-chat-file-input');
            if (fileInput) fileInput.click();
            const dropdown = triggerAttach.closest('.chat-dropdown-module');
            if (dropdown) {
                dropdown.classList.remove('active');
                dropdown.classList.add('disabled');
            }
            return;
        }

        const removeAttachBtn = e.target.closest('[data-action="removeSupportChatAttachment"]');
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

        if (!e.target.closest('.component-dropdown-wrapper')) {
            document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(d => {
                d.classList.remove('active');
                d.classList.add('disabled');
            });
        }
    }

    handleChange(e) {
        if (e.target && e.target.id === 'support-chat-file-input') {
            if (e.target.files && e.target.files.length > 0) {
                this._handleFileSelection(e.target.files);
            }
            e.target.value = '';
        }
    }

    handlePaste(e) {
        const input = document.querySelector('[data-ref="support-chat-input-text"]');
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
        const previewContainer = document.querySelector('[data-ref="support-chat-attachments-preview"]');
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
            btn.setAttribute('data-action', 'removeSupportChatAttachment');
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

    async _checkLiveChatStatus() {
        try {
            const res = await this.api.post(ApiRoutes.Support.GetQueueStatus, {
                session_uuid: this.activeSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this.isLiveChatOnline = !!res.is_online;
                this.availableAgentsCount = res.available_agents || 0;

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
                    } else if (res.active_session.status === 'active' || res.active_session.status === 'in_progress') {
                        this._showState('room');
                        this._updateAgentDisplay(res.active_session);
                        this._loadMessages();
                    }
                } else {
                    if (!this.activeSessionUuid) {
                        this._showState(null);
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _showState(stateName) {
        const states = {
            queue: document.querySelector('[data-ref="support-state-queue"]'),
            room: document.querySelector('[data-ref="support-state-room"]')
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

        if (stateName === 'queue' || stateName === 'room') {
            if (this.activeSessionUuid) {
                localStorage.setItem('pr_active_support_session', JSON.stringify({
                    session_uuid: this.activeSessionUuid,
                    status: stateName
                }));
            }
        } else {
            this.lastRenderedMaxId = 0;
            this.hasInitialMessagesLoaded = false;
            localStorage.removeItem('pr_active_support_session');
        }
        this._updateFloatingButtonVisibility();
    }

    _setupModuleObserver() {
        const moduleEl = document.querySelector('[data-module="moduleSupportChat"]');
        if (!moduleEl) return;

        if (this._moduleObserver) {
            this._moduleObserver.disconnect();
        }

        this._moduleObserver = new MutationObserver(() => {
            this._updateFloatingButtonVisibility();
        });

        this._moduleObserver.observe(moduleEl, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    _updateFloatingButtonVisibility() {
        const fab = document.querySelector('[data-ref="floating-support-btn"]');
        if (!fab) return;

        const moduleEl = document.querySelector('[data-module="moduleSupportChat"]');
        const isModuleOpen = moduleEl && !moduleEl.classList.contains('disabled');
        const savedSession = localStorage.getItem('pr_active_support_session');
        const hasActiveSession = !!(this.activeSessionUuid || savedSession);

        if (hasActiveSession && !isModuleOpen) {
            fab.classList.remove('disabled');
        } else {
            fab.classList.add('disabled');
        }
    }

    _openSupportModule() {
        if (window.appInstance && window.appInstance.moduleManager) {
            window.appInstance.moduleManager.toggleMenuInModule('moduleSupportChat', 'menu-support-chat');
        } else {
            const moduleEl = document.querySelector('[data-module="moduleSupportChat"]');
            if (moduleEl) {
                moduleEl.classList.remove('disabled');
                moduleEl.classList.add('active');
                const menu = moduleEl.querySelector('[data-ref="menu-support-chat"]');
                if (menu) {
                    menu.classList.remove('disabled');
                    menu.classList.add('active');
                }
            }
        }
        this._updateFloatingButtonVisibility();
    }

    async _submitStartLiveChatModal(btn) {
        if (!btn || btn.classList.contains('disabled-interaction')) return;

        const subjectInput = document.querySelector('[data-ref="modal_live_subject"]');
        const messageInput = document.querySelector('[data-ref="modal_live_message"]');
        const categoryInput = document.querySelector('[data-ref="modal_live_category"]');

        const category = categoryInput ? categoryInput.value : 'technical';
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
                if (window.modalSystem) {
                    window.modalSystem.closeCurrent();
                }

                this._connectWebSocket(this.activeSessionUuid);
                this._showState('queue');
                const qNum = document.querySelector('[data-ref="support-queue-position-number"]');
                if (qNum) qNum.textContent = `#${res.queue_position || 1}`;

                const moduleEl = document.querySelector('[data-module="moduleSupportChat"]');
                if (moduleEl && window.appInstance?.moduleManager) {
                    window.appInstance.moduleManager.open(moduleEl);
                } else if (moduleEl) {
                    moduleEl.classList.remove('disabled');
                    moduleEl.classList.add('active');
                }
                this._updateFloatingButtonVisibility();
            } else {
                if (res && res.is_offline) {
                    this.isLiveChatOnline = false;
                    if (window.modalSystem) {
                        window.modalSystem.closeCurrent();
                        setTimeout(() => {
                            window.modalSystem.show('supportLiveChatUnavailableModal');
                        }, 150);
                    }
                } else {
                    showMessage(res && res.message ? res.message : window.__('err_support_chat_start_failed'), 'error');
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_support_chat_start_failed'), 'error');
        }
    }

    async _loadMessages() {
        if (!this.activeSessionUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Support.GetSessionMessages, {
                session_uuid: this.activeSessionUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this._renderMessages(res.messages, res.session);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
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
                <img class="avatar-image" src="${src}" alt="${this._escapeHtml(username || 'Agent')}" onerror="this.src='${fallback}'">
            </div>
        `;
    }

    _updateAgentDisplay(session) {
        const nameEl = document.querySelector('[data-ref="support-agent-name-display"]');
        const levelEl = document.querySelector('[data-ref="support-agent-level-display"]');
        const avatarContainer = document.querySelector('[data-ref="support-agent-avatar-container"]');

        if (nameEl) {
            nameEl.textContent = session.agent_name || window.__('support_agent_assigned');
        }

        if (levelEl) {
            const deptKey = session.department_level === 'l3' ? 'lbl_dept_l3' : (session.department_level === 'l2' ? 'lbl_dept_l2' : 'lbl_dept_l1');
            const cat = session.category || 'general';
            const langCode = (session.language || 'es-419').toLowerCase();
            const langName = langCode.startsWith('en') ? window.__('lbl_lang_en') : window.__('lbl_lang_es');
            levelEl.textContent = `${window.__(deptKey)} • ${cat} • ${langName}`;
        }

        if (avatarContainer) {
            avatarContainer.innerHTML = this._renderAvatarHtml(session.agent_avatar, session.agent_name, session.agent_subscription_color, 'component-avatar--static-sm');
        }

        if (window.applySubscriptionDynamicColors) {
            try {
                window.applySubscriptionDynamicColors();
            } catch (e) {}
        }
    }

    _renderMessages(messages) {
        const container = document.querySelector('[data-ref="support-chat-messages-list"]');
        if (!container) return;

        let maxId = 0;
        let hasNewAgentMessage = false;

        (messages || []).forEach(msg => {
            const mId = Number(msg.id) || 0;
            if (mId > maxId) maxId = mId;

            if (this.hasInitialMessagesLoaded && mId > this.lastRenderedMaxId && msg.sender_type !== 'user') {
                if (mId !== this.lastPlayedMessageId) {
                    hasNewAgentMessage = true;
                    this.lastPlayedMessageId = mId;
                }
            }
        });

        if (hasNewAgentMessage) {
            this._playNotificationSound('message');
        }

        if (maxId > this.lastRenderedMaxId) {
            this.lastRenderedMaxId = maxId;
        }
        this.hasInitialMessagesLoaded = true;

        let html = '';
        const initialIssueMsg = this.currentSessionData?.initial_message;

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
            } else {
                const isMine = msg.sender_type === 'user';
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

    async _sendChatMessage() {
        const input = document.querySelector('[data-ref="support-chat-input-text"]');
        if (!this.activeSessionUuid) return;

        const text = input ? input.value.trim() : '';
        const hasFiles = this.selectedFiles && this.selectedFiles.length > 0;

        if (!text && !hasFiles) return;

        const filesToSend = [...this.selectedFiles];
        this.selectedFiles = [];
        this._renderAttachmentPreviews();

        if (input) input.value = '';

        try {
            let res;
            if (hasFiles) {
                const formData = new FormData();
                formData.append('session_uuid', this.activeSessionUuid);
                formData.append('message', text);
                filesToSend.forEach(file => {
                    formData.append('images[]', file);
                });
                res = await this.api.postForm(ApiRoutes.Support.SendMessage, formData, this.abortController ? this.abortController.signal : undefined);
            } else {
                res = await this.api.post(ApiRoutes.Support.SendMessage, {
                    session_uuid: this.activeSessionUuid,
                    message: text
                }, this.abortController ? this.abortController.signal : undefined);
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

    async _endLiveChatSession() {
        if (!this.activeSessionUuid) return;

        const currentUuid = this.activeSessionUuid;
        try {
            await this.api.post(ApiRoutes.Support.EndLiveSession, {
                session_uuid: currentUuid
            }, this.abortController ? this.abortController.signal : undefined);
        } catch (error) {
            if (error.name === 'AbortError') return;
        }

        this._cleanupEndedSession();

        if (window.modalSystem) {
            window.modalSystem.show('supportCsatModal');
        }
    }

    _cleanupEndedSession() {
        this.csatSessionUuid = this.activeSessionUuid;
        this.activeSessionUuid = null;
        this.selectedFiles = [];
        this._renderAttachmentPreviews();
        localStorage.removeItem('pr_active_support_session');

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        const msgContainer = document.querySelector('[data-ref="support-chat-messages-list"]');
        if (msgContainer) msgContainer.innerHTML = '';

        const input = document.querySelector('[data-ref="support-chat-input-text"]');
        if (input) input.value = '';

        const typingIndicator = document.querySelector('[data-ref="support-typing-indicator"]');
        if (typingIndicator) typingIndicator.classList.add('disabled');

        const moduleEl = document.querySelector('[data-module="moduleSupportChat"]');
        if (moduleEl && window.appInstance?.moduleManager) {
            window.appInstance.moduleManager.close(moduleEl);
        } else if (moduleEl) {
            moduleEl.classList.remove('active');
            moduleEl.classList.add('disabled');
        }

        this._showState(null);
        this._updateFloatingButtonVisibility();
    }

    async _leaveQueue() {
        if (this.activeSessionUuid) {
            try {
                await this.api.post(ApiRoutes.Support.EndLiveSession, {
                    session_uuid: this.activeSessionUuid
                }, this.abortController ? this.abortController.signal : undefined);
            } catch (error) {
                if (error.name === 'AbortError') return;
            }
        }

        this._cleanupEndedSession();
    }

    _handleRatingSelect(btn) {
        const rating = parseInt(btn.getAttribute('data-rating') || '5', 10);
        this.currentRating = rating;

        const ratingContainers = document.querySelectorAll('[data-ref="modal_csat_stars"], [data-ref="support-csat-stars"]');
        ratingContainers.forEach(container => {
            container.setAttribute('data-value', rating.toString());
            const allBtns = container.querySelectorAll('[data-action="setCsatRating"]');
            allBtns.forEach(b => {
                const r = parseInt(b.getAttribute('data-rating') || '0', 10);
                if (r <= rating) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
        });
    }

    async _submitModalCsatFeedback(btn) {
        const targetUuid = this.csatSessionUuid || this.activeSessionUuid;
        if (!targetUuid || !btn || btn.classList.contains('disabled-interaction')) return;

        const commentInput = document.querySelector('[data-ref="modal_csat_comment"], [data-ref="support-csat-comment"]');
        const feedback = commentInput ? commentInput.value.trim() : '';

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.Support.SubmitFeedback, {
                session_uuid: targetUuid,
                rating: this.currentRating,
                feedback: feedback
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);

            if (res && res.success) {
                showMessage(window.__('msg_support_feedback_received'), 'success');
                this.csatSessionUuid = null;
                this.activeSessionUuid = null;
                localStorage.removeItem('pr_active_support_session');
                if (window.modalSystem) {
                    window.modalSystem.closeCurrent();
                }
                this._updateFloatingButtonVisibility();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_feedback_failed'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_support_feedback_failed'), 'error');
        }
    }

    async _submitCsatFeedback(btn) {
        return this._submitModalCsatFeedback(btn);
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

    async _submitModalTicket(btn) {
        if (!btn || btn.classList.contains('disabled-interaction')) return;

        const categoryInput = document.querySelector('[data-ref="modal_ticket_category"]');
        const subjectInput = document.querySelector('[data-ref="modal_ticket_subject"]');
        const messageInput = document.querySelector('[data-ref="modal_ticket_message"]');

        const category = categoryInput ? categoryInput.value : 'technical';
        const subject = subjectInput ? subjectInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!subject || subject.length < 4) {
            showMessage(window.__('err_support_invalid_subject'), 'error');
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

                if (window.modalSystem) {
                    window.modalSystem.closeCurrent();
                }
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

        const turnstileElements = document.querySelectorAll('[data-ref="turnstile-container"], [data-ref="modal-turnstile-container"]');
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
