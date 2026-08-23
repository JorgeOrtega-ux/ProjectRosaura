import { ApiService } from '../../../core/api/ApiService.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage, renderSkeleton } from '../../../core/utils/uiUtils.js';

export class DesignChat {
    constructor(controller) {
        this.controller = controller;
        this.api = new ApiService();
        this.canvasId = controller.canvasIntId || controller.canvasId;
        this.canvasUuid = controller.canvasId;

        this.chatContainer = document.querySelector('[data-ref="chat-messages-container"]');
        this.chatInput = document.querySelector('[data-ref="chat-input-message"]');
        this.btnSend = document.querySelector('[data-ref="chat-btn-send"]');
        this.loader = document.querySelector('[data-ref="chat-loader"]');
        this.fileInput = document.querySelector('[data-ref="chat-file-input"]');
        this.previewContainer = null;

        this.offset = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.messages = [];
        this.selectedFiles = [];
        this.isChatEnabled = document.querySelector('.component-wrapper')?.dataset.allowChat === '1';
        this.isFirstRenderScrollPending = true;
        this.currentUserId = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.userId || null;
        this.currentUsername = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.username || window.__('user');
        this.currentUserAvatar = document.querySelector('.header .component-button--profile img')?.getAttribute('src') || null;
        this.currentUserSubColor = document.querySelector('.header .component-button--profile.subscription-dynamic')?.dataset.subBg || document.querySelector('.header .component-button--profile')?.dataset.subBg || null;

        const moduleChat = document.querySelector('[data-module="moduleLiveChat"]');
        this.maxFilesLimit = moduleChat ? parseInt(moduleChat.dataset.maxImages, 10) || 6 : 6;
        this.maxUploadMbLimit = moduleChat ? parseInt(moduleChat.dataset.maxSizeMb, 10) || 10 : 10;

        this.typingUsers = new Map();
        this.lastTypingSent = 0;
        this.lastIsTyping = false;
        this.myTypingTimeout = null;

        this.typingContainer = null;

        this.toolbarChatBtn = document.querySelector('[data-action="toggleMenuInModule"][data-module-target="moduleLiveChat"]');

        this.init();
    }

    get canModerateChat() {
        return document.querySelector('[data-module="moduleLiveChat"]')?.dataset.canModerate === '1';
    }

    init() {
        this.setupEventListeners();

        if (this.isChatEnabled) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.isFirstRenderScrollPending && this.chatContainer.clientHeight > 0) {
                    this.scrollToBottom();
                    this.isFirstRenderScrollPending = false; 
                }
            });
            if (this.chatContainer) this.resizeObserver.observe(this.chatContainer);

            this.typingInterval = setInterval(() => {
                if (this.typingUsers.size > 0) {
                    this.updateTypingUI();
                }
            }, 1000);

            this.initialHistoryLoaded = false;
            const chatModule = document.querySelector('[data-module="moduleLiveChat"]');
            
            if (chatModule && !chatModule.classList.contains('disabled')) {
                this.initialHistoryLoaded = true;
                this.loadHistory();
            } else if (!chatModule) {
                this.initialHistoryLoaded = true;
                this.loadHistory();
            }

            this.initAutocomplete();
        }
    }

    setupEventListeners() {
        if (this.isEventsBound) return;
        this.isEventsBound = true;

        if (this.btnSend) {
            this.btnSend.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                this.sendMessage();
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }

        if (this.chatInput) {
            this.autoResizeTextarea();

            this.chatInput.addEventListener('keydown', (e) => {
                if (this.autocompleteContainer && !this.autocompleteContainer.classList.contains('disabled')) {
                    const items = Array.from(this.autocompleteContainer.querySelectorAll('.chat-autocomplete-item'));
                    let activeIndex = items.findIndex(item => item.classList.contains('active'));

                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (items.length > 0) {
                            if (activeIndex !== -1) items[activeIndex].classList.remove('active');
                            activeIndex = (activeIndex + 1) % items.length;
                            items[activeIndex].classList.add('active');
                            items[activeIndex].scrollIntoView({ block: 'nearest' });
                        }
                        return;
                    }
                    if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (items.length > 0) {
                            if (activeIndex !== -1) items[activeIndex].classList.remove('active');
                            activeIndex = (activeIndex - 1 + items.length) % items.length;
                            items[activeIndex].classList.add('active');
                            items[activeIndex].scrollIntoView({ block: 'nearest' });
                        }
                        return;
                    }
                    if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        if (activeIndex !== -1) {
                            items[activeIndex].click();
                        } else if (items.length > 0) {
                            items[0].click();
                        }
                        return;
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this.hideAutocomplete();
                        return;
                    }
                }

                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            this.chatInput.addEventListener('input', () => {
                this.autoResizeTextarea();

                if (this.btnSend) {
                    if (this.chatInput.value.trim().length > 0) {
                        this.btnSend.classList.add('active');
                    } else {
                        this.btnSend.classList.remove('active');
                    }
                }

                this.handleAutocompleteTrigger();

                const now = Date.now();
                const isTyping = this.chatInput.value.trim().length > 0;
                
                if (this.lastIsTyping !== isTyping || (isTyping && now - this.lastTypingSent > 2000)) {
                    if (this.controller.wsManager) {
                        this.controller.wsManager.send({
                            type: 'chat_typing',
                            isTyping: isTyping,
                            username: this.currentUsername
                        });
                    }
                    this.lastTypingSent = now;
                    this.lastIsTyping = isTyping;
                }

                if (this.myTypingTimeout) clearTimeout(this.myTypingTimeout);
                if (isTyping) {
                    this.myTypingTimeout = setTimeout(() => {
                        if (this.lastIsTyping && this.controller.wsManager) {
                            this.controller.wsManager.send({
                                type: 'chat_typing',
                                isTyping: false,
                                username: this.currentUsername
                            });
                            this.lastIsTyping = false;
                        }
                    }, 2000);
                }
            });
        }

        if (this.chatContainer) {
            this.chatContainer.addEventListener('click', (e) => {
                const btnDelete = e.target.closest('[data-action="chatDeleteMessage"]');
                if (btnDelete) {
                    const id = btnDelete.dataset.id;
                    this.deleteMessage(id);
                    const dropdown = btnDelete.closest('.chat-dropdown-module');
                    if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
                }

                const btnReply = e.target.closest('[data-action="chatReplyMessage"]');
                if (btnReply) {
                    const id = btnReply.dataset.id;
                    const username = btnReply.dataset.username;
                    const message = btnReply.dataset.message;
                    this.setReplyTarget(id, username, message);
                    const dropdown = btnReply.closest('.chat-dropdown-module');
                    if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
                }

                const replyContext = e.target.closest('.chat-message-reply-context');
                if (replyContext) {
                    const replyToId = replyContext.dataset.replyToId;
                    if (replyToId) {
                        const targetMsg = this.chatContainer.querySelector(`[data-message-id="${replyToId}"]`);
                        if (targetMsg) {
                            targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetMsg.classList.add('chat-message--highlighted');
                            setTimeout(() => {
                                targetMsg.classList.remove('chat-message--highlighted');
                            }, 1500);
                        }
                    }
                }

                const btnReport = e.target.closest('[data-action="chatReportMessage"]');
                if (btnReport) {
                    const id = btnReport.dataset.id;
                    this.reportMessage(id);
                    const dropdown = btnReport.closest('.chat-dropdown-module');
                    if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
                }

                const btnRestrict = e.target.closest('[data-action="chatRestrictUser"]');
                if (btnRestrict) {
                    const canvasUuid = this.canvasUuid || this.canvasId;
                    window.open((window.AppBasePath || '') + `/canvases/manage/sanctions/${canvasUuid}`, '_blank');
                    const dropdown = btnRestrict.closest('.chat-dropdown-module');
                    if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
                }
            });
        }


        if (this.chatContainer) {
            const header = this.chatContainer.closest('.component-menu') ? this.chatContainer.closest('.component-menu').querySelector('.component-menu-header') : null;
            
            this.chatContainer.addEventListener('scroll', () => {
                if (header) {
                    const isAtBottom = this.chatContainer.scrollHeight - this.chatContainer.clientHeight <= this.chatContainer.scrollTop + 10;
                    if (!isAtBottom) {
                        header.classList.add('shadow');
                    } else {
                        header.classList.remove('shadow');
                    }
                }

                if (this.chatContainer.scrollTop <= 15 && !this.isLoading && this.hasMore) {
                    this.loadHistory();
                }
            });
        }

        if (this.toolbarChatBtn) {
            this.toolbarChatBtn.addEventListener('click', (e) => {
                if (!this.isChatEnabled) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showActivationModal();
                }
            });
        }

        const chatModule = document.querySelector('[data-module="moduleLiveChat"]');
        if (chatModule) {
            chatModule.addEventListener('click', (e) => {
                const deactivateBtn = e.target.closest('[data-action="deactivateChatOption"]');
                if (deactivateBtn) {
                    e.preventDefault();
                    const dropdown = chatModule.querySelector('[data-module="chat-options-menu"]');
                    if (dropdown) dropdown.classList.add('disabled');
                    this.handleDeactivateChat();
                    return;
                }

                const infoBtn = e.target.closest('[data-action="showGeneralInfoOption"]');
                if (infoBtn) {
                    e.preventDefault();
                    const dropdown = chatModule.querySelector('[data-module="chat-options-menu"]');
                    if (dropdown) dropdown.classList.add('disabled');
                    this.showGeneralInfoMenu();
                    return;
                }

                const backBtn = e.target.closest('[data-action="backToChatMenu"]');
                if (backBtn) {
                    e.preventDefault();
                    this.transitionMenus('menu-chat-info', 'menu-chat');
                    return;
                }

                const activatePanelBtn = e.target.closest('[data-action="activateChatFromPanel"]');
                if (activatePanelBtn) {
                    e.preventDefault();
                    this.showActivationModal();
                    return;
                }
            });
        }

        window.currentDesignChatInstance = this;

        if (!window._designChatGlobalEventsBound) {
            window._designChatGlobalEventsBound = true;

            document.addEventListener('canvas:chat_message', (e) => {
                if (window.currentDesignChatInstance) {
                    const msg = e.detail;
                    if (msg.client_id) {
                        const optEl = window.currentDesignChatInstance.chatContainer.querySelector(`[data-client-id="${msg.client_id}"]`);
                        if (optEl) {
                            const blobImgs = Array.from(optEl.querySelectorAll('.chat-attachment-item img'))
                                .map(img => img.src)
                                .filter(src => src.startsWith('blob:'));
                            if (blobImgs.length > 0 && msg.attachments && blobImgs.length === msg.attachments.length) {
                                msg.optimisticBlobs = blobImgs;
                            }
                            optEl.remove();
                        }
                    }
                    window.currentDesignChatInstance.appendMessage(msg, true);
                }
            });

            document.addEventListener('canvas:chat_typing', (e) => {
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.handleTypingEvent(e.detail);
            });

            document.addEventListener('canvas:chat_message_deleted', (e) => {
                const { id, visibility } = e.detail;
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.updateMessageVisibility(id, visibility || 'deleted');
            });

            document.addEventListener('click', (e) => {
                const attachmentItem = e.target.closest('[data-action="openChatImageViewer"]');
                if (attachmentItem) {
                    const msgId = attachmentItem.getAttribute('data-message-id');
                    const indexStr = attachmentItem.getAttribute('data-index');
                    const canvasUuid = attachmentItem.getAttribute('data-canvas-uuid');
                    if (msgId && indexStr) {
                        try {
                            const index = parseInt(indexStr, 10);
                            
                            const msgEl = document.querySelector(`.chat-message[data-message-id="${msgId}"]`);
                            if (msgEl) {
                                const imgs = Array.from(msgEl.querySelectorAll('.chat-attachment-item img')).map(img => img.src);
                                if (imgs.length > 0) {
                                    sessionStorage.setItem('chat_viewer_images_' + msgId, JSON.stringify(imgs));
                                }
                            }

                            if (window.spaRouter) {
                                window.spaRouter.navigate(`/canvases/c/v/${canvasUuid}/${msgId}/${index}`);
                            } else {
                                window.location.href = (window.AppBasePath || '') + `/canvases/c/v/${canvasUuid}/${msgId}/${index}`;
                            }
                        } catch(err) {
                            console.error('[DesignChat] Error opening image viewer:', err);
                        }
                    }
                }
            });

            document.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-module-target="moduleLiveChat"]');
                const chat = window.currentDesignChatInstance;
                if (btn && chat && !chat.initialHistoryLoaded) {
                    chat.initialHistoryLoaded = true;
                    chat.loadHistory();
                }
            });

            document.addEventListener('click', (e) => {
                const btnAttach = e.target.closest('[data-action="triggerChatAttach"]');
                const chat = window.currentDesignChatInstance;
                if (btnAttach && chat && chat.fileInput) {
                    chat.fileInput.click();
                    const dropdown = btnAttach.closest('.chat-dropdown-module');
                    if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
                }
            });
        }
    }

    destroy() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
        if (this.myTypingTimeout) {
            clearTimeout(this.myTypingTimeout);
            this.myTypingTimeout = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    handleFileSelection(e) {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const maxFiles = this.maxFilesLimit;
        const maxSize = this.maxUploadMbLimit * 1024 * 1024; 

        let totalSize = this.selectedFiles.reduce((acc, file) => acc + file.size, 0);

        for (const file of files) {
            if (this.selectedFiles.length >= maxFiles) {
                showMessage(window.__('err_max_files').replace('{max}', maxFiles), 'warning');
                break;
            }
            if (!file.type.startsWith('image/')) {
                showMessage(window.__('err_invalid_image').replace('{file}', file.name), 'warning');
                continue;
            }
            if (totalSize + file.size > maxSize) {
                showMessage(window.__('err_max_size_mb') ? window.__('err_max_size_mb').replace('{mb}', this.maxUploadMbLimit) : `El peso excede los ${this.maxUploadMbLimit}MB permitidos`, 'warning');
                break;
            }
            this.selectedFiles.push(file);
            totalSize += file.size;
        }

        this.renderPreview();
        if (this.btnSend && (this.chatInput.value.trim().length > 0 || this.selectedFiles.length > 0)) {
            this.btnSend.classList.add('active');
        }
        
        this.fileInput.value = '';
    }

    renderPreview() {
        if (this.selectedFiles.length === 0) {
            if (this.previewContainer && this.previewContainer.parentNode) {
                this.previewContainer.parentNode.removeChild(this.previewContainer);
            }
            if (this.previewContainer) this.previewContainer.innerHTML = '';
            return;
        }

        if (!this.previewContainer) {
            this.previewContainer = document.createElement('div');
            this.previewContainer.className = 'chat-attachments-preview-container active';
            this.previewContainer.setAttribute('data-ref', 'chat-attachments-preview');
        } else {
            this.previewContainer.classList.remove('disabled');
            this.previewContainer.classList.add('active');
        }

        const inputArea = document.querySelector('.component-chat-input-area');
        if (inputArea && !this.previewContainer.parentNode) {
            inputArea.insertBefore(this.previewContainer, inputArea.firstChild);
        }

        this.previewContainer.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            
            const card = document.createElement('div');
            card.className = 'chat-attachment-preview-card component-skeleton';
            
            const img = document.createElement('img');
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.2s ease';
            
            reader.onload = (e) => { 
                img.src = e.target.result; 
                card.classList.remove('component-skeleton');
                img.style.opacity = '1';
            };
            reader.readAsDataURL(file);
            
            const btn = document.createElement('button');
            btn.className = 'remove-btn';
            btn.innerHTML = '<span class="material-symbols-rounded">close</span>';
            btn.onclick = () => {
                this.selectedFiles.splice(index, 1);
                this.renderPreview();
                if (this.selectedFiles.length === 0 && this.chatInput.value.trim().length === 0) {
                    if (this.btnSend) this.btnSend.classList.remove('active');
                }
            };

            card.appendChild(img);
            card.appendChild(btn);
            this.previewContainer.appendChild(card);
        });
    }

    setReplyTarget(id, username, message) {
        this.replyTarget = { id, username, message };
        
        let previewEl = document.querySelector('[data-ref="chat-reply-preview"]');
        if (!previewEl) {
            previewEl = document.createElement('div');
            previewEl.className = 'chat-reply-preview-container';
            previewEl.setAttribute('data-ref', 'chat-reply-preview');
            
            const inputArea = document.querySelector('.component-chat-input-area');
            if (inputArea) {
                inputArea.insertBefore(previewEl, inputArea.firstChild);
            }
        }
        
        previewEl.innerHTML = `
            <div class="chat-reply-preview-content">
                <div class="chat-reply-preview-header">
                    <span class="material-symbols-rounded">reply</span>
                    <span class="chat-reply-preview-title">Respondiendo a <strong class="chat-reply-username">${username}</strong></span>
                </div>
                <div class="chat-reply-preview-body">
                    ${message || '[Imagen]'}
                </div>
            </div>
            <button class="chat-reply-preview-close" data-action="cancelReply">
                <span class="material-symbols-rounded">close</span>
            </button>
        `;
        
        previewEl.classList.remove('disabled');
        previewEl.classList.add('active');
        
        const closeBtn = previewEl.querySelector('[data-action="cancelReply"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.clearReplyTarget());
        }
        
        if (this.chatInput) {
            this.chatInput.focus();
        }
    }

    clearReplyTarget() {
        this.replyTarget = null;
        const previewEl = document.querySelector('[data-ref="chat-reply-preview"]');
        if (previewEl) {
            previewEl.classList.remove('active');
            previewEl.classList.add('disabled');
            previewEl.innerHTML = '';
        }
    }

    async loadHistory() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;

        let loaderStartTime = 0;
        if (this.offset === 0 && this.loader) {
            renderSkeleton(this.loader, 'chatSkeleton');
            this.loader.classList.remove('disabled'); this.loader.classList.add('active');
        } else if (this.offset > 0) {
            
            this.topLoader = document.createElement('div');
            this.topLoader.className = 'chat-top-loader';
            this.topLoader.innerHTML = '<span class="material-symbols-rounded icon-spin-slow component-icon--20">sync</span>';
            this.chatContainer.insertBefore(this.topLoader, this.chatContainer.firstChild);
            loaderStartTime = Date.now();
        }

        try {
            const response = await this.api.post(ApiRoutes.Chat.History, {
                canvas_id: this.canvasId,
                offset: this.offset
            });
            
            if (this.offset === 0 && this.loader) {
                this.loader.classList.remove('active'); this.loader.classList.add('disabled');
                this.chatContainer.querySelectorAll('.chat-message').forEach(el => el.remove());
            } else if (this.topLoader) {
                const elapsed = Date.now() - loaderStartTime;
                if (elapsed < 300) {
                    await new Promise(r => setTimeout(r, 300 - elapsed));
                }
                this.topLoader.remove();
                this.topLoader = null;
            }

            if (response.success || response.status === 'success') {
                const msgs = response.data.messages;
                
                const emptyState = this.chatContainer.querySelector('[data-ref="empty-state-rendered"]');
                if (this.offset === 0 && msgs.length === 0) {
                    if (emptyState) {
                        emptyState.classList.remove('disabled');
                        emptyState.classList.add('active');
                    }
                } else {
                    if (emptyState) {
                        emptyState.classList.remove('active');
                        emptyState.classList.add('disabled');
                    }
                }

                this.hasMore = response.data.has_more;
                this.offset += msgs.length;

                const previousHeight = this.chatContainer.scrollHeight;

                const isFirstLoad = this.offset === msgs.length;
                
                msgs.forEach(msg => {
                    this.prependMessage(msg);
                });
                
                this.updateDateDividers();

                if (isFirstLoad) {
                    if (this.chatContainer.clientHeight > 0) {
                        this.scrollToBottom();
                        this.isFirstRenderScrollPending = false;
                    } else {
                        
                        this.isFirstRenderScrollPending = true;
                    }
                } else {
                    
                    const newHeight = this.chatContainer.scrollHeight;
                    this.chatContainer.scrollTop = newHeight - previousHeight;
                }
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            console.error('[DesignChat] Error loading history:', error);
            if (this.offset === 0 && this.loader) {
                this.loader.innerHTML = window.__('err_load_messages');
            }
        } finally {
            this.isLoading = false;
        }
    }

    async sendMessage() {
        if (this.isSending) return;
        
        const text = this.chatInput.value.trim();
        if (!text && this.selectedFiles.length === 0) return;
        
        this.isSending = true;

        if (this.btnSend) this.btnSend.classList.add('disabled-interaction');
        if (this.chatInput) this.chatInput.classList.add('disabled-interaction');
        
        const backupText = text;
        const backupFiles = [...this.selectedFiles];
        
        const replyToId = this.replyTarget ? this.replyTarget.id : null;
        const replyToUsername = this.replyTarget ? this.replyTarget.username : null;
        const replyToMessage = this.replyTarget ? this.replyTarget.message : null;

        const clientId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const optimisticAttachments = backupFiles.map(file => URL.createObjectURL(file));
        
        const optimisticMsg = {
            id: clientId,
            client_id: clientId,
            user_id: this.currentUserId,
            username: this.currentUsername,
            avatar: this.currentUserAvatar || null,
            message: backupText,
            attachments: optimisticAttachments,
            created_at: new Date().toISOString(),
            is_optimistic: true,
            reply_to: replyToId,
            reply_to_username: replyToUsername,
            reply_to_message: replyToMessage,
            subscription_color: this.currentUserSubColor || null
        };
        
        this.appendMessage(optimisticMsg);
        
        this.chatInput.value = '';
        this.autoResizeTextarea();
        this.selectedFiles = [];
        this.renderPreview();
        this.clearReplyTarget();
        this.btnSend.classList.remove('active');
        if (this.chatInput) this.chatInput.classList.remove('disabled-interaction');

        try {
            let response;
            if (backupFiles.length > 0) {
                const formData = new FormData();
                formData.append('canvas_id', this.canvasId);
                formData.append('message', backupText);
                formData.append('client_id', clientId);
                if (replyToId) {
                    formData.append('reply_to', replyToId);
                }
                for (let i = 0; i < backupFiles.length; i++) {
                    const compressedFile = await this.compressImage(backupFiles[i]);
                    formData.append('images[]', compressedFile);
                }
                response = await this.api.postForm(ApiRoutes.Chat.Send, formData);
            } else {
                const payload = {
                    canvas_id: this.canvasId,
                    message: backupText,
                    client_id: clientId
                };
                if (replyToId) {
                    payload.reply_to = replyToId;
                }
                response = await this.api.post(ApiRoutes.Chat.Send, payload);
            }

            if (response.success === false || response.status === 'error') {
                showMessage(response.message, 'error');
                const optEl = this.chatContainer.querySelector(`[data-client-id="${clientId}"]`);
                if (optEl) optEl.remove();
            }
        } catch (error) {
            console.error('[DesignChat] Error sending message:', error);
            showMessage(window.__('err_send_message'), 'error');
            const optEl = this.chatContainer.querySelector(`[data-client-id="${clientId}"]`);
            if (optEl) optEl.remove();
        } finally {
            if (this.btnSend) this.btnSend.classList.remove('disabled-interaction');
            if (this.chatInput) this.chatInput.classList.remove('disabled-interaction');
            
            if (this.chatInput.value.trim().length > 0 || this.selectedFiles.length > 0) {
                this.btnSend.classList.add('active');
            } else {
                this.btnSend.classList.remove('active');
            }
            this.chatInput.focus();

            if (this.myTypingTimeout) clearTimeout(this.myTypingTimeout);
            if (this.controller.wsManager) {
                this.controller.wsManager.send({
                    type: 'chat_typing',
                    isTyping: false,
                    username: this.currentUsername
                });
                this.lastIsTyping = false;
            }
            this.isSending = false;
        }
    }

    async deleteMessage(id) {
        const res = await window.modalSystem.show('confirmDeleteMessage');
        if (!res || !res.confirmed) return;


        try {
            const response = await this.api.post(ApiRoutes.Chat.Delete, {
                canvas_id: this.canvasId,
                message_id: id
            });
            
            if (response.success || response.status === 'success') {
                this.updateMessageVisibility(id, 'deleted');
                showMessage(response.message, 'success');
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            console.error('[DesignChat] Error deleting message:', error);
            showMessage(window.__('err_delete_message'), 'error');
        }
    }

    async reportMessage(id) {
        let selectedReason = '';
        let detailsText = '';

        const res = await window.modalSystem.show('reportMessageDialog');
        if (!res || !res.confirmed) return;

        selectedReason = res.data.report_reason || res.data.report_reason_input;
        if (!selectedReason) {
            showMessage(__('err_report_select_reason'), 'error');
            return;
        }

        detailsText = (res.data.report_other_text || res.data.report_other_textarea || '').trim();


        try {
            const response = await this.api.post(ApiRoutes.Chat.Report, {
                canvas_id: this.canvasId,
                message_id: id,
                reason: selectedReason,
                details: detailsText
            });
            
            if (response.success || response.status === 'success') {
                showMessage(response.message, 'success');
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            console.error('[DesignChat] Error reporting message:', error);
            showMessage(__('err_report_failed'), 'error');
        }
    }

    updateMessageVisibility(id, visibility) {
        const msgEl = this.chatContainer.querySelector(`[data-message-id="${id}"]`);
        if (!msgEl) return;

        const statusEl = this.createStatusMessageElement(id, msgEl, visibility);
        msgEl.replaceWith(statusEl);
    }

    createStatusMessageElement(id, originalEl, visibility, createdAt) {
        const el = document.createElement('div');
        el.className = 'chat-message chat-message--status';
        el.dataset.messageId = id;
        
        if (createdAt) {
            const msgDate = new Date(createdAt);
            const now = new Date();
            const isToday = msgDate.getDate() === now.getDate() && msgDate.getMonth() === now.getMonth() && msgDate.getFullYear() === now.getFullYear();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const isYesterday = msgDate.getDate() === yesterday.getDate() && msgDate.getMonth() === yesterday.getMonth() && msgDate.getFullYear() === yesterday.getFullYear();
            
            const dateFormatted = msgDate.toLocaleDateString([], {day: '2-digit', month: '2-digit', year: 'numeric'});
            let dateDividerStr = dateFormatted;
            if (isToday) dateDividerStr = window.__('date_today');
            else if (isYesterday) dateDividerStr = window.__('date_yesterday');
            el.dataset.dateString = dateDividerStr;
        } else if (originalEl && originalEl.dataset.dateString) {
            el.dataset.dateString = originalEl.dataset.dateString;
        }

        let icon, text;
        if (visibility === 'under_review') {
            icon = 'visibility_off';
            text = window.__('msg_chat_under_review');
        } else {
            icon = 'delete';
            text = window.__('msg_chat_deleted');
        }

        el.innerHTML = `
            <div class="chat-message-status-bubble">
                <span class="material-symbols-rounded">${icon}</span>
                <span>${text}</span>
            </div>
        `;
        return el;
    }

    handleTypingEvent(data) {
        if (String(data.user_id) === String(this.currentUserId)) return;

        if (data.isTyping) {
            this.typingUsers.set(data.user_id, {
                username: data.username,
                timestamp: Date.now()
            });
        } else {
            this.typingUsers.delete(data.user_id);
        }

        this.updateTypingUI();
    }

    updateTypingUI() {
        
        const now = Date.now();
        for (const [uid, info] of this.typingUsers.entries()) {
            if (now - info.timestamp > 3500) {
                this.typingUsers.delete(uid);
            }
        }

        const count = this.typingUsers.size;
        if (count === 0) {
            if (this.typingContainer && this.typingContainer.parentNode) {
                this.typingContainer.parentNode.removeChild(this.typingContainer);
            }
            if (this.typingContainer) this.typingContainer.innerHTML = '';
            return;
        }

        if (!this.typingContainer) {
            this.typingContainer = document.createElement('div');
            this.typingContainer.className = 'chat-typing-indicator active';
        } else {
            this.typingContainer.classList.remove('disabled');
            this.typingContainer.classList.add('active');
        }

        const inputArea = document.querySelector('.component-chat-input-area');
        if (inputArea && !this.typingContainer.parentNode) {
            inputArea.parentNode.insertBefore(this.typingContainer, inputArea);
        }

        if (count === 1) {
            const username = Array.from(this.typingUsers.values())[0].username;
            this.typingContainer.innerHTML = `<strong>${username}</strong> está escribiendo...`;
        } else {
            this.typingContainer.innerHTML = `${count} usuarios están escribiendo...`;
        }
    }

    parseSubscriptionColorCSS(colorData) {
        if (!colorData) return '#808080';
        try {
            let data = colorData;
            if (typeof data === 'string') {
                const trimmed = data.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    data = JSON.parse(trimmed);
                } else {
                    return trimmed;
                }
            }

            if (data && typeof data === 'object') {
                if (data.type === 'solid' && Array.isArray(data.colors) && data.colors[0]) {
                    return typeof data.colors[0] === 'string' ? data.colors[0] : (data.colors[0].hex || '#808080');
                } else if (data.type === 'gradient' && Array.isArray(data.colors) && data.colors.length > 0) {
                    const angle = parseInt(data.angle || 0, 10);
                    let prev = 0;
                    const colorsCount = data.colors.length;
                    const stops = data.colors.map((c, i) => {
                        const hex = typeof c === 'string' ? c : (c.hex || '#808080');
                        const percentage = (typeof c === 'object' && c.percentage !== undefined)
                            ? parseInt(c.percentage, 10)
                            : Math.floor(100 / colorsCount);
                        const end = (i === colorsCount - 1) ? 100 : (prev + percentage);
                        const str = `${hex} ${prev}% ${end}%`;
                        prev = end;
                        return str;
                    });
                    return `conic-gradient(from ${angle}deg, ${stops.join(', ')})`;
                }
            }
        } catch (e) {
            // Fallback gracefully
        }
        return typeof colorData === 'string' ? colorData : '#808080';
    }

    createMessageElement(msg) {
        // Handle non-visible messages (deleted / under_review)
        const visibility = msg.visibility || 'visible';
        if (visibility !== 'visible') {
            return this.createStatusMessageElement(msg.id, null, visibility, msg.created_at);
        }

        const isMine = String(msg.user_id) === String(this.currentUserId);
        const el = document.createElement('div');
        el.className = 'chat-message' + (isMine ? ' chat-message--mine' : '') + (msg.is_optimistic ? ' chat-message--optimistic' : '');
        el.dataset.messageId = msg.id;

        if (msg.client_id) el.dataset.clientId = msg.client_id;
        if (msg.is_optimistic) el.style.opacity = '0.7';

        const msgDate = new Date(msg.created_at);
        const now = new Date();
        const isToday = msgDate.getDate() === now.getDate() && msgDate.getMonth() === now.getMonth() && msgDate.getFullYear() === now.getFullYear();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = msgDate.getDate() === yesterday.getDate() && msgDate.getMonth() === yesterday.getMonth() && msgDate.getFullYear() === yesterday.getFullYear();

        const time = msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateFormatted = msgDate.toLocaleDateString([], {day: '2-digit', month: '2-digit', year: 'numeric'});

        let dateDividerStr = dateFormatted;
        if (isToday) dateDividerStr = window.__('date_today');
        else if (isYesterday) dateDividerStr = window.__('date_yesterday');
        
        el.dataset.dateString = dateDividerStr;
        
        let avatarUrl = `${window.AppBasePath || ''}/public/assets/img/fallbacks/avatar-default.png`;
        if (msg.avatar) {
            if (msg.avatar.startsWith('http') || msg.avatar.startsWith('data:')) {
                avatarUrl = msg.avatar;
            } else {
                const prefix = msg.avatar.startsWith('/') ? '' : '/';
                avatarUrl = `${window.AppBasePath || ''}${prefix}${msg.avatar}`;
            }
        }
        
        const fallbackUrl = `${window.AppBasePath || ''}/public/assets/img/fallbacks/avatar-default.png`;
        
        const subColorCSS = this.parseSubscriptionColorCSS(msg.subscription_color);

        const avatarStr = `
            <div class="component-button--profile subscription-dynamic component-avatar--static-sm" data-sub-bg="${subColorCSS}" style="--active-subscription-bg: ${subColorCSS};">
                <img src="${avatarUrl}" class="chat-message-avatar-img image-lazy-fade" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='${fallbackUrl}'; this.classList.add('image-loaded');">
            </div>
        `;

        const uniqueId = 'msg-menu-' + msg.id;

        const menuBtn = `<div class="component-dropdown-wrapper component-dropdown-wrapper--fit chat-msg-actions chat-msg-actions--ml-auto">
            <button class="component-button component-button--icon component-button--icon-sm-ghost" data-action="toggleChatDropdown" data-target="${uniqueId}">
                <span class="material-symbols-rounded component-icon--18">more_vert</span>
            </button>
            <div class="component-module component-module--dropdown chat-dropdown-module disabled" data-module="${uniqueId}">
                <div class="component-menu component-menu--w265 component-menu--h-auto active" data-menu="${uniqueId}-options">
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-menu-list">
                        <div class="component-menu-link" data-action="chatReplyMessage" data-id="${msg.id}" data-username="${msg.username}" data-message="${(msg.message || '').replace(/"/g, '&quot;')}">
                            <div class="component-menu-link-icon">
                                <span class="material-symbols-rounded">reply</span>
                            </div>
                            <div class="component-menu-link-text">
                                <span>${window.__('lbl_reply_chat') || 'Responder'}</span>
                            </div>
                        </div>
                        <div class="component-menu-link" data-action="chatReportMessage" data-id="${msg.id}">
                            <div class="component-menu-link-icon">
                                <span class="material-symbols-rounded">report</span>
                            </div>
                            <div class="component-menu-link-text">
                                <span>${__('lbl_report_chat')}</span>
                            </div>
                        </div>
                        ${(!isMine && this.canModerateChat) ? `
                        <div class="component-menu-link" data-action="chatRestrictUser" data-user-id="${msg.user_id}" data-user-uuid="${msg.user_uuid || msg.user_id}">
                            <div class="component-menu-link-icon">
                                <span class="material-symbols-rounded component-text-warning">block</span>
                            </div>
                            <div class="component-menu-link-text">
                                <span class="component-text-warning">Restringir chat</span>
                            </div>
                        </div>
                        ` : ''}
                        ${isMine ? `
                        <div class="component-menu-link" data-action="chatDeleteMessage" data-id="${msg.id}">
                            <div class="component-menu-link-icon">
                                <span class="material-symbols-rounded component-text-danger">delete</span>
                            </div>
                            <div class="component-menu-link-text">
                                <span class="component-text-danger">${window.__('delete')}</span>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>`;

        let attachmentsHtml = '';
        if (msg.attachments && msg.attachments.length > 0) {
            const count = msg.attachments.length;
            let gridClass = 'chat-attachment-grid-more';
            if (count === 1) gridClass = 'chat-attachment-grid-1';
            else if (count === 2) gridClass = 'chat-attachment-grid-2';
            else if (count === 3) gridClass = 'chat-attachment-grid-3';
            else if (count === 4) gridClass = 'chat-attachment-grid-4';

            attachmentsHtml = `<div class="chat-message-attachments ${gridClass}">`;

            const displayCount = Math.min(count, 4);
            const fullUrls = msg.attachments.map(a => {
                if (a.startsWith('blob:')) return a;
                if (a.startsWith('/api/index.php?route=chat.attachment')) {
                    return (window.AppBasePath || '') + a;
                }
                return (window.AppBasePath || '') + a;
            });
            
            for (let i = 0; i < displayCount; i++) {
                const url = msg.optimisticBlobs && msg.optimisticBlobs[i] ? msg.optimisticBlobs[i] : fullUrls[i];
                
                let extractedUuid = this.canvasUuid;
                if (!extractedUuid || extractedUuid === 'null') {
                    const match = url.match(/canvas_uuid=([^&]+)/);
                    if (match) {
                        extractedUuid = match[1];
                    }
                }
                
                let overlay = '';
                if (i === 3 && count > 4) {
                    overlay = `<div class="chat-attachment-item-overlay">+${count - 4}</div>`;
                }
                let fallbackUrl = (window.AppBasePath || '') + '/public/assets/img/fallbacks/canvas-default.png';
                attachmentsHtml += `
                <div class="chat-attachment-item component-skeleton" data-action="openChatImageViewer" data-message-id="${msg.id}" data-index="${i}" data-canvas-uuid="${extractedUuid}">
                    <img src="${url}" loading="lazy" class="image-lazy-fade" onload="this.classList.add('image-loaded'); this.parentElement.classList.remove('component-skeleton')" onerror="this.onerror=null; this.src='${fallbackUrl}'; this.classList.add('image-loaded'); this.parentElement.classList.remove('component-skeleton');" />
                    ${overlay}
                </div>
                `;
            }
            attachmentsHtml += `</div>`;
        }

        let replyContextHtml = '';
        if (msg.reply_to) {
            const cleanReplyMessage = (msg.reply_to_message || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            replyContextHtml = `
                <div class="chat-message-reply-context" data-reply-to-id="${msg.reply_to}">
                    <div class="chat-message-reply-context-username">${msg.reply_to_username || 'Usuario'}</div>
                    <div class="chat-message-reply-context-body">${cleanReplyMessage || '[Imagen]'}</div>
                </div>
            `;
        }

        let messageTextHtml = '';
        if (msg.message && msg.message.trim().length > 0) {
            messageTextHtml = `<div class="chat-message-text">${msg.message}</div>`;
        }

        el.innerHTML = `
            ${avatarStr}
            <div class="chat-message-bubble">
                <div class="chat-message-header">
                    <div class="chat-header-title-box">
                        <strong class="chat-message-username">${msg.username}</strong>
                        <span >•</span>
                        <span class="chat-message-time">${time}</span>
                    </div>
                    ${menuBtn}
                </div>
                ${replyContextHtml}
                ${messageTextHtml}
                ${attachmentsHtml}
            </div>
        `;
        return el;
    }

    prependMessage(msg) {
        const el = this.createMessageElement(msg);
        this.chatContainer.insertBefore(el, this.chatContainer.firstChild);
    }

    appendMessage(msg, scroll = true) {
        const emptyState = this.chatContainer.querySelector('[data-ref="empty-state-rendered"]');
        if (emptyState && emptyState.classList.contains('active')) {
            emptyState.classList.remove('active');
            emptyState.classList.add('disabled');
        }

        const isScrolledToBottom = this.chatContainer.scrollHeight - this.chatContainer.clientHeight <= this.chatContainer.scrollTop + 50;
        
        const el = this.createMessageElement(msg);
        this.chatContainer.appendChild(el);
        this.updateDateDividers();
        
        if (scroll && isScrolledToBottom) {
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    updateDateDividers() {
        this.chatContainer.querySelectorAll('.chat-date-divider').forEach(el => el.remove());
        
        const messages = Array.from(this.chatContainer.querySelectorAll('.chat-message'));
        let lastDateStr = null;
        
        messages.forEach(msgEl => {
            const dateStr = msgEl.dataset.dateString;
            if (dateStr && dateStr !== lastDateStr) {
                const divider = document.createElement('div');
                divider.className = 'chat-date-divider';
                divider.innerHTML = `<span>${dateStr}</span>`;
                msgEl.parentNode.insertBefore(divider, msgEl);
                lastDateStr = dateStr;
            }
        });
    }

    async compressImage(file) {
        if (!file.type.startsWith('image/')) return file;
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1920;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(newFile);
                        } else {
                            resolve(file);
                        }
                    }, 'image/jpeg', 0.85);
                };
                img.onerror = () => resolve(file);
            };
            reader.onerror = () => resolve(file);
        });
    }

    initAutocomplete() {
        this.autocompleteContainer = document.createElement('div');
        this.autocompleteContainer.className = 'component-module component-module--dropdown component-module--dropdown-top chat-autocomplete-module disabled';
        
        const inputArea = document.querySelector('.component-chat-input-area');
        if (inputArea) {
            inputArea.insertBefore(this.autocompleteContainer, inputArea.firstChild);
        }

        document.addEventListener('click', (e) => {
            if (this.autocompleteContainer && !this.autocompleteContainer.classList.contains('disabled')) {
                if (!e.target.closest('.component-chat-input-area')) {
                    this.hideAutocomplete();
                }
            }
        });
    }

    handleAutocompleteTrigger() {
        if (!this.autocompleteContainer) return;

        const val = this.chatInput.value;
        const selStart = this.chatInput.selectionStart;
        const textBeforeCursor = val.substring(0, selStart);
        const words = textBeforeCursor.split(/\s+/);
        const lastWord = words[words.length - 1] || '';

        if (lastWord.startsWith('/') && this.canModerateChat) {
            const commands = [
                { name: '/timeout', desc: 'Silenciar usuario temporalmente', icon: 'timer' },
                { name: '/untimeout', desc: 'Levantar silencio de chat', icon: 'lock_open' },
                { name: '/ban', desc: 'Silenciar permanentemente', icon: 'speaker_notes_off' },
                { name: '/unban', desc: 'Levantar baneo del chat', icon: 'check_circle' },
                { name: '/canvasban', desc: 'Baneo permanente del lienzo', icon: 'block' },
                { name: '/unbancanvas', desc: 'Desbanear del lienzo', icon: 'check_circle' }
            ];
            const match = lastWord.toLowerCase();
            const suggestions = commands.filter(c => c.name.startsWith(match));
            this.showAutocomplete(suggestions, 'command', lastWord);
            return;
        }

        let isUserTrigger = false;
        let query = '';
        let triggerWord = '';

        if (lastWord.startsWith('@')) {
            isUserTrigger = true;
            query = lastWord.substring(1).toLowerCase();
            triggerWord = lastWord;
        } else if (words.length === 2 && ['/timeout', '/untimeout', '/ban', '/unban', '/canvasban', '/bancanvas', '/canvasunban', '/unbancanvas'].includes(words[0].toLowerCase())) {
            isUserTrigger = true;
            query = lastWord.toLowerCase();
            triggerWord = lastWord;
        }

        if (isUserTrigger) {
            const usernamesInDom = Array.from(document.querySelectorAll('[data-action="chatReplyMessage"]'))
                .map(el => el.getAttribute('data-username'))
                .filter(Boolean);
            const typingUsernames = Array.from(this.typingUsers.values()).map(u => u.username);
            
            const allUsernames = Array.from(new Set([...usernamesInDom, ...typingUsernames]));
            
            const suggestions = allUsernames
                .filter(u => u.toLowerCase().startsWith(query))
                .map(u => ({ name: u, desc: 'Usuario', icon: 'person' }));

            this.showAutocomplete(suggestions, 'user', triggerWord);
            return;
        }

        this.hideAutocomplete();
    }

    showAutocomplete(suggestions, type, triggerWord) {
        if (!suggestions || suggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }

        this.autocompleteContainer.innerHTML = '';
        
        const menuWrapper = document.createElement('div');
        menuWrapper.className = 'component-menu component-menu--no-padding active';
        menuWrapper.style.width = '100%';
        
        const listWrapper = document.createElement('div');
        listWrapper.className = 'component-menu-list component-menu-list--scrollable';
        listWrapper.style.maxHeight = '180px';
        listWrapper.style.overflowY = 'auto';
        
        suggestions.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'component-menu-link chat-autocomplete-item' + (index === 0 ? ' active' : '');
            el.innerHTML = `
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">${item.icon || 'star'}</span>
                </div>
                <div class="component-menu-link-text component-menu-link-text--between">
                    <span>${item.name}</span>
                    ${item.desc ? `<span class="component-menu-link-meta">${item.desc}</span>` : ''}
                </div>
            `;
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectSuggestion(item, type, triggerWord);
            });
            listWrapper.appendChild(el);
        });
        
        menuWrapper.appendChild(listWrapper);
        this.autocompleteContainer.appendChild(menuWrapper);

        this.autocompleteContainer.classList.remove('disabled');
    }

    hideAutocomplete() {
        if (this.autocompleteContainer) {
            this.autocompleteContainer.classList.add('disabled');
            this.autocompleteContainer.innerHTML = '';
        }
    }

    selectSuggestion(item, type, triggerWord) {
        const val = this.chatInput.value;
        const selStart = this.chatInput.selectionStart;
        const textBeforeCursor = val.substring(0, selStart);
        const textAfterCursor = val.substring(selStart);

        let replacement = item.name;
        if (triggerWord.startsWith('@') && !replacement.startsWith('@')) {
            replacement = '@' + replacement;
        }

        const newTextBefore = textBeforeCursor.substring(0, textBeforeCursor.length - triggerWord.length) + replacement + ' ';
        this.chatInput.value = newTextBefore + textAfterCursor;

        this.chatInput.focus();
        const newCursorPos = newTextBefore.length;
        this.chatInput.setSelectionRange(newCursorPos, newCursorPos);

        this.chatInput.dispatchEvent(new Event('input'));
        this.hideAutocomplete();
    }

    async showActivationModal() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        const hasLiveChat = wrapper?.dataset.hasLiveChat === '1';
        const lowestChatTier = wrapper?.dataset.lowestChatTier || 'Pro';
        const isOwner = wrapper?.dataset.isOwner === '1';
        const canvasId = wrapper?.dataset.canvasId;

        const res = await window.modalSystem.show('activateChatConfirmationModal', {
            hasLiveChat: hasLiveChat,
            lowestChatTier: lowestChatTier,
            isOwner: isOwner,
            asyncConfirm: true
        });

        if (res.confirmed) {
            try {
                const response = await this.api.post(ApiRoutes.Canvases.ToggleChat, {
                    id: canvasId,
                    allow_chat: 1
                });

                if (response && response.success) {
                    res.success();
                    showMessage(window.__('chat_activated_success') || 'Chat activado con éxito.', 'success');
                    
                    if (wrapper) wrapper.dataset.allowChat = '1';
                    this.isChatEnabled = true;

                    const menuChat = document.querySelector('[data-ref="menu-chat"]');
                    if (menuChat) {
                        menuChat.classList.replace('chat-disabled-state', 'chat-enabled-state');
                    }

                    this.init();
                } else {
                    res.failure();
                    showMessage(response.message || window.__('err_generic'), 'error');
                }
            } catch (error) {
                res.failure();
                showMessage(window.__('err_generic'), 'error');
            }
        }
    }

    async handleDeactivateChat() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        const canvasId = wrapper?.dataset.canvasId;

        const confirmRes = await window.modalSystem.show('confirmActionModal', {
            title: window.__('chat_deactivate_title') || 'Desactivar Chat en Vivo',
            message: window.__('chat_deactivate_desc') || '¿Estás seguro de que deseas desactivar el chat en vivo en este lienzo? Los miembros ya no podrán enviar ni ver mensajes en tiempo real.',
            asyncConfirm: true
        });

        if (confirmRes.confirmed) {
            try {
                const response = await this.api.post(ApiRoutes.Canvases.ToggleChat, {
                    id: canvasId,
                    allow_chat: 0
                });

                if (response && response.success) {
                    confirmRes.success();
                    showMessage(window.__('chat_deactivated_success') || 'Chat desactivado con éxito.', 'success');

                    if (wrapper) wrapper.dataset.allowChat = '0';
                    this.isChatEnabled = false;

                    const menuChat = document.querySelector('[data-ref="menu-chat"]');
                    if (menuChat) {
                        menuChat.classList.replace('chat-enabled-state', 'chat-disabled-state');
                    }

                    if (this.chatContainer) {
                        const loader = this.chatContainer.querySelector('[data-ref="chat-loader"]');
                        this.chatContainer.innerHTML = '';
                        if (loader) this.chatContainer.appendChild(loader);
                    }
                    this.messages = [];
                    this.offset = 0;
                    this.hasMore = true;
                } else {
                    confirmRes.failure();
                    showMessage(response.message || window.__('err_generic'), 'error');
                }
            } catch (error) {
                confirmRes.failure();
                showMessage(window.__('err_generic'), 'error');
            }
        }
    }

    showGeneralInfoMenu() {
        this.transitionMenus('menu-chat', 'menu-chat-info');
        this.loadMediaGallery();
    }

    transitionMenus(fromRef, toRef) {
        const fromMenu = document.querySelector(`[data-ref="${fromRef}"]`);
        const toMenu = document.querySelector(`[data-ref="${toRef}"]`);
        if (fromMenu && toMenu) {
            fromMenu.classList.replace('active', 'disabled');
            toMenu.classList.replace('disabled', 'active');
        }
    }

    async loadMediaGallery() {
        const grid = document.querySelector('[data-ref="chat-info-gallery-grid"]');
        if (!grid) return;

        grid.innerHTML = `
            <div class="chat-info-gallery-empty">
                ${window.__('lbl_loading_photos')}
            </div>
        `;

        try {
            const response = await this.api.post(ApiRoutes.Chat.MediaGallery, {
                canvas_id: this.canvasId
            });

            if (response && response.success && Array.isArray(response.photos)) {
                if (response.photos.length === 0) {
                    grid.innerHTML = `
                        <div class="chat-info-gallery-empty">
                            ${window.__('lbl_no_photos')}
                        </div>
                    `;
                } else {
                    grid.innerHTML = '';
                    response.photos.forEach(photoUrl => {
                        const item = document.createElement('div');
                        item.className = 'chat-info-gallery-item';
                        item.innerHTML = `<img src="${photoUrl}" alt="Photo" loading="lazy">`;
                        item.addEventListener('click', () => {
                            window.open(photoUrl, '_blank');
                        });
                        grid.appendChild(item);
                    });
                }
            } else {
                grid.innerHTML = `
                    <div class="chat-info-gallery-error">
                        ${response.message || window.__('err_generic')}
                    </div>
                `;
            }
        } catch (error) {
            grid.innerHTML = `
                <div class="chat-info-gallery-error">
                    ${window.__('err_generic')}
                </div>
            `;
        }
    }

    autoResizeTextarea() {
        if (!this.chatInput) return;
        const container = document.querySelector('[data-ref="chat-box-container"]');
        const text = this.chatInput.value;

        if (!text || text.trim().length === 0) {
            if (container) container.classList.remove('is-multiline');
            this.chatInput.style.height = '';
            return;
        }

        if (text.includes('\n')) {
            if (container) container.classList.add('is-multiline');
            this.chatInput.style.height = 'auto';
            const nextH = Math.min(Math.max(this.chatInput.scrollHeight, 24), 120);
            this.chatInput.style.height = `${nextH}px`;
            return;
        }

        const wasMultiline = container && container.classList.contains('is-multiline');
        if (wasMultiline) {
            container.classList.remove('is-multiline');
        }
        this.chatInput.style.height = 'auto';
        const singleRowScrollH = this.chatInput.scrollHeight;

        if (singleRowScrollH > 28) {
            if (container) container.classList.add('is-multiline');
            this.chatInput.style.height = 'auto';
            const nextH = Math.min(Math.max(this.chatInput.scrollHeight, 24), 120);
            this.chatInput.style.height = `${nextH}px`;
        } else {
            if (container) container.classList.remove('is-multiline');
            this.chatInput.style.height = '';
        }
    }
}
