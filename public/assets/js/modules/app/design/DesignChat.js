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
        this.typingContainer = null;

        this.slowmodeSeconds = 0;
        this.slowmodeRemaining = 0;
        this.slowmodeInterval = null;

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
                const btnMenu = e.target.closest('[data-action="toggleChatDropdown"], [data-action="toggleModule"][data-target^="msg-menu-"]');
                if (btnMenu) {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetModule = btnMenu.getAttribute('data-target');
                    if (window.appInstance && typeof window.appInstance.toggleModule === 'function') {
                        window.appInstance.toggleModule(targetModule, btnMenu);
                    } else {
                        const moduleEl = btnMenu.closest('.chat-message')?.querySelector(`[data-module="${targetModule}"]`);
                        if (moduleEl) {
                            const isCurrentlyActive = moduleEl.classList.contains('active');
                            document.querySelectorAll('.chat-dropdown-module.active').forEach(d => {
                                if (d !== moduleEl) {
                                    d.classList.remove('active');
                                    d.classList.add('disabled');
                                }
                            });
                            moduleEl.classList.toggle('active', !isCurrentlyActive);
                            moduleEl.classList.toggle('disabled', isCurrentlyActive);
                        }
                    }
                    return;
                }

                const btnDelete = e.target.closest('[data-action="chatDeleteMessage"]');
                if (btnDelete) {
                    const id = btnDelete.dataset.id;
                    this.deleteMessage(id);
                    const dropdown = btnDelete.closest('.chat-dropdown-module');
                    if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
                }

                const btnQuickReact = e.target.closest('[data-action="chatQuickReact"]');
                if (btnQuickReact) {
                    e.preventDefault();
                    e.stopPropagation();
                    const emoji = btnQuickReact.dataset.emoji;
                    const msgEl = btnQuickReact.closest('.chat-message');
                    const id = msgEl?.dataset.messageId;
                    if (id && emoji) {
                        this.toggleReaction(id, emoji);
                    }
                    return;
                }

                const btnToggleReaction = e.target.closest('[data-action="chatToggleReaction"]');
                if (btnToggleReaction) {
                    e.preventDefault();
                    e.stopPropagation();
                    const emoji = btnToggleReaction.dataset.emoji;
                    const id = btnToggleReaction.dataset.messageId || btnToggleReaction.closest('.chat-message')?.dataset.messageId;
                    if (id && emoji) {
                        this.toggleReaction(id, emoji);
                    }
                    return;
                }

                const btnOpenPicker = e.target.closest('[data-action="chatOpenEmojiPicker"]');
                if (btnOpenPicker) {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = btnOpenPicker.dataset.id || btnOpenPicker.dataset.messageId || btnOpenPicker.closest('.chat-message')?.dataset.messageId;
                    const dropdown = btnOpenPicker.closest('.chat-dropdown-module');
                    if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
                    if (id) {
                        this.openEmojiPicker(btnOpenPicker, id);
                    }
                    return;
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

                const toggleDetailsBtn = e.target.closest('[data-action="toggleInfoDetails"]');
                if (toggleDetailsBtn) {
                    e.preventDefault();
                    const card = toggleDetailsBtn.closest('.component-details-card');
                    const rowsContainer = card?.querySelector('.component-details-rows-container');
                    if (rowsContainer) {
                        const isCollapsed = rowsContainer.classList.contains('collapsed');
                        if (isCollapsed) {
                            rowsContainer.classList.remove('collapsed');
                            rowsContainer.classList.add('expanded');
                            toggleDetailsBtn.classList.add('expanded');
                        } else {
                            rowsContainer.classList.remove('expanded');
                            rowsContainer.classList.add('collapsed');
                            toggleDetailsBtn.classList.remove('expanded');
                        }
                    }
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

            document.addEventListener('canvas:chat_reaction_updated', (e) => {
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.handleReactionEvent(e.detail);
            });

            document.addEventListener('canvas:chat_cleared', (e) => {
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.handleChatClearedEvent(e.detail);
            });

            document.addEventListener('canvas:chat_slowmode_changed', (e) => {
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.handleSlowmodeChangedEvent(e.detail);
            });

            document.addEventListener('canvas:chat_whisper', (e) => {
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.handleWhisperEvent(e.detail);
            });

            document.addEventListener('click', (e) => {
                const attachmentItem = e.target.closest('[data-action="openChatImageViewer"]');
                if (attachmentItem) {
                    const msgId = attachmentItem.getAttribute('data-message-id');
                    const indexStr = attachmentItem.getAttribute('data-index');
                    const canvasUuid = attachmentItem.getAttribute('data-canvas-uuid');
                    if (msgId !== null && indexStr !== null) {
                        try {
                            const index = parseInt(indexStr, 10);
                            const msgEl = document.querySelector(`.chat-message[data-message-id="${msgId}"]`);
                            
                            const getSenderInfo = (el) => {
                                const m = el ? el.closest('.chat-message') : null;
                                const username = m?.dataset.username || m?.querySelector('.chat-message-username')?.textContent?.trim() || window.__('lbl_user') || 'Usuario';
                                const avatar = m?.dataset.avatar || m?.querySelector('.chat-message-avatar img')?.src || '';
                                const date = m?.dataset.date || m?.querySelector('.chat-message-time')?.textContent?.trim() || '';
                                const subBg = m?.dataset.subBg || m?.querySelector('.subscription-dynamic')?.getAttribute('data-sub-bg') || '';
                                return { username, avatar, date, subBg };
                            };

                            let imageItems = [];
                            let initialIdx = index;

                            if (msgEl) {
                                const senderInfo = getSenderInfo(msgEl);
                                const msgImgs = Array.from(msgEl.querySelectorAll('.chat-attachment-item img'));
                                imageItems = msgImgs.map(img => ({
                                    url: img.src,
                                    name: window.__('lbl_attached_image') || 'Foto adjunta',
                                    sender: senderInfo.username,
                                    avatar: senderInfo.avatar,
                                    date: senderInfo.date,
                                    subBg: senderInfo.subBg
                                }));
                            }

                            // If this message only had 1 image, collect all attachments from the chat so the user can navigate across all images!
                            if (imageItems.length <= 1) {
                                const allAttachmentEls = Array.from(document.querySelectorAll('.chat-attachment-item'));
                                if (allAttachmentEls.length > 1) {
                                    imageItems = allAttachmentEls.map(el => {
                                        const img = el.querySelector('img');
                                        const senderInfo = getSenderInfo(el);
                                        return {
                                            url: img ? img.src : '',
                                            name: window.__('lbl_attached_image') || 'Foto adjunta',
                                            sender: senderInfo.username,
                                            avatar: senderInfo.avatar,
                                            date: senderInfo.date,
                                            subBg: senderInfo.subBg
                                        };
                                    }).filter(i => !!i.url);

                                    const clickedImg = attachmentItem.querySelector('img');
                                    const clickedSrc = clickedImg ? clickedImg.src : '';
                                    const foundIdx = imageItems.findIndex(i => i.url === clickedSrc);
                                    initialIdx = (foundIdx !== -1) ? foundIdx : 0;
                                }
                            }

                            if (imageItems.length === 0) {
                                const singleImg = attachmentItem.querySelector('img');
                                const senderInfo = getSenderInfo(attachmentItem);
                                if (singleImg) {
                                    imageItems = [{
                                        url: singleImg.src,
                                        name: window.__('lbl_attached_image') || 'Foto adjunta',
                                        sender: senderInfo.username,
                                        avatar: senderInfo.avatar,
                                        date: senderInfo.date,
                                        subBg: senderInfo.subBg
                                    }];
                                }
                            }

                            if (window.modalSystem) {
                                window.modalSystem.show('imageViewer', {
                                    images: imageItems,
                                    initialIndex: initialIdx,
                                    title: window.__('lbl_attached_image') || 'Foto adjunta',
                                    canvasUuid: canvasUuid
                                });
                            } else if (window.spaRouter) {
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
        if (this.emojiPickerEl) {
            this.emojiPickerEl.remove();
            this.emojiPickerEl = null;
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
                if (response.data.slowmode_seconds !== undefined) {
                    this.slowmodeSeconds = parseInt(response.data.slowmode_seconds, 10) || 0;
                }
                
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

        // Check local-only slash commands
        const lower = text.toLowerCase();
        if (lower === '/help' || lower === '/ayuda') {
            this.chatInput.value = '';
            this.autoResizeTextarea();
            this.clearReplyTarget();
            if (this.btnSend) this.btnSend.classList.remove('active');
            this.hideAutocomplete();
            this.showHelpMessage();
            return;
        }

        if (lower === '/clear') {
            this.chatInput.value = '';
            this.autoResizeTextarea();
            this.clearReplyTarget();
            if (this.btnSend) this.btnSend.classList.remove('active');
            this.hideAutocomplete();
            this.clearLocalChat();
            return;
        }
        
        this.isSending = true;

        if (this.btnSend) this.btnSend.classList.add('disabled-interaction');
        if (this.chatInput) this.chatInput.classList.add('disabled-interaction');
        
        const backupText = text;
        const backupFiles = [...this.selectedFiles];
        const isCommand = backupText.startsWith('/');
        
        const replyToId = this.replyTarget ? this.replyTarget.id : null;
        const replyToUsername = this.replyTarget ? this.replyTarget.username : null;
        const replyToMessage = this.replyTarget ? this.replyTarget.message : null;

        const clientId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const optimisticAttachments = backupFiles.map(file => URL.createObjectURL(file));
        
        if (!isCommand) {
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
        }
        
        this.chatInput.value = '';
        this.autoResizeTextarea();
        this.selectedFiles = [];
        this.renderPreview();
        this.clearReplyTarget();
        if (this.btnSend) this.btnSend.classList.remove('active');
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
            } else if (response.is_command) {
                if (response.message) {
                    showMessage(response.message, 'success');
                }
            } else {
                if (this.slowmodeSeconds > 0 && !this.canModerateChat) {
                    this.startSlowmodeTimer(this.slowmodeSeconds);
                }
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

    showHelpMessage() {
        const isMod = this.canModerateChat;
        const helpEl = document.createElement('div');
        helpEl.className = 'chat-message chat-message--system-card';

        let commandsHtml = `
            <div class="chat-help-category">
                <div class="chat-help-category-title">
                    <span class="material-symbols-rounded">chat</span>
                    <strong>Comandos Generales</strong>
                </div>
                <div class="chat-help-item">
                    <code>/help</code> o <code>/ayuda</code>
                    <span>Muestra esta lista de comandos.</span>
                </div>
                <div class="chat-help-item">
                    <code>/w @usuario &lt;mensaje&gt;</code>
                    <span>Envía un susurro o mensaje privado.</span>
                </div>
                <div class="chat-help-item">
                    <code>/clear</code>
                    <span>Limpia tu pantalla actual de chat (vista local).</span>
                </div>
            </div>
        `;

        if (isMod) {
            commandsHtml += `
            <div class="chat-help-category">
                <div class="chat-help-category-title">
                    <span class="material-symbols-rounded">shield_person</span>
                    <strong>Comandos de Moderación</strong>
                </div>
                <div class="chat-help-item">
                    <code>/clearchat</code>
                    <span>Borra el chat para todos los miembros en vivo.</span>
                </div>
                <div class="chat-help-item">
                    <code>/slowmode &lt;segundos|off&gt;</code>
                    <span>Configura el tiempo de espera entre mensajes (ej: /slowmode 10).</span>
                </div>
                <div class="chat-help-item">
                    <code>/shout &lt;mensaje&gt;</code>
                    <span>Envía un anuncio destacado global con estilo de megáfono.</span>
                </div>
                <div class="chat-help-item">
                    <code>/timeout &lt;usuario&gt; [segundos]</code>
                    <span>Silencia temporalmente a un usuario.</span>
                </div>
                <div class="chat-help-item">
                    <code>/untimeout &lt;usuario&gt;</code>
                    <span>Levanta el silencio temporal.</span>
                </div>
                <div class="chat-help-item">
                    <code>/ban &lt;usuario&gt;</code>
                    <span>Silencia permanentemente del chat a un usuario.</span>
                </div>
                <div class="chat-help-item">
                    <code>/unban &lt;usuario&gt;</code>
                    <span>Levanta el silencio permanente del chat.</span>
                </div>
                <div class="chat-help-item">
                    <code>/canvasban &lt;usuario&gt;</code>
                    <span>Banea y expulsa permanentemente a un usuario del lienzo.</span>
                </div>
                <div class="chat-help-item">
                    <code>/unbancanvas &lt;usuario&gt;</code>
                    <span>Desbanea a un usuario del lienzo.</span>
                </div>
            </div>
            `;
        }

        helpEl.innerHTML = `
            <div class="chat-message-bubble chat-help-card-bubble">
                <div class="chat-help-header">
                    <div class="chat-help-header-title">
                        <span class="material-symbols-rounded">help</span>
                        <strong>Ayuda de Comandos del Chat</strong>
                    </div>
                </div>
                <div class="chat-help-content">
                    ${commandsHtml}
                </div>
            </div>
        `;

        if (this.chatContainer) {
            this.chatContainer.appendChild(helpEl);
            this.scrollToBottom();
        }
    }

    clearLocalChat() {
        if (this.chatContainer) {
            const loader = this.chatContainer.querySelector('[data-ref="chat-loader"]');
            this.chatContainer.innerHTML = '';
            if (loader) this.chatContainer.appendChild(loader);
        }
        this.messages = [];
        this.offset = 0;
        this.hasMore = false;

        this.appendSystemNotice({
            icon: 'delete_sweep',
            text: 'Has limpiado tu pantalla de chat.'
        });
    }

    handleChatClearedEvent(data) {
        if (this.chatContainer) {
            const loader = this.chatContainer.querySelector('[data-ref="chat-loader"]');
            this.chatContainer.innerHTML = '';
            if (loader) this.chatContainer.appendChild(loader);
        }
        this.messages = [];
        this.offset = 0;
        this.hasMore = false;

        const modName = data.cleared_by_username || 'un moderador';
        this.appendSystemNotice({
            icon: 'cleaning_services',
            text: `El chat ha sido limpiado por ${modName}.`
        });
    }

    handleSlowmodeChangedEvent(data) {
        const seconds = parseInt(data.seconds, 10) || 0;
        this.slowmodeSeconds = seconds;

        if (seconds > 0) {
            this.appendSystemNotice({
                icon: 'timer',
                text: `Modo lento activado (${seconds}s por mensaje).`
            });
        } else {
            this.appendSystemNotice({
                icon: 'timer_off',
                text: 'Modo lento desactivado.'
            });
            if (this.slowmodeInterval) {
                clearInterval(this.slowmodeInterval);
                this.slowmodeInterval = null;
            }
            this.slowmodeRemaining = 0;
            if (this.btnSend) {
                this.btnSend.classList.remove('disabled-interaction');
                this.btnSend.title = window.__('lbl_send') || 'Enviar';
            }
        }
    }

    startSlowmodeTimer(seconds) {
        if (this.canModerateChat || seconds <= 0) return;
        this.slowmodeRemaining = seconds;
        if (this.slowmodeInterval) clearInterval(this.slowmodeInterval);

        const updateBtn = () => {
            if (!this.btnSend) return;
            if (this.slowmodeRemaining > 0) {
                this.btnSend.classList.add('disabled-interaction');
                this.btnSend.title = `Modo lento: espera ${this.slowmodeRemaining}s`;
            } else {
                this.btnSend.classList.remove('disabled-interaction');
                if (this.chatInput && (this.chatInput.value.trim().length > 0 || this.selectedFiles.length > 0)) {
                    this.btnSend.classList.add('active');
                }
                this.btnSend.title = window.__('lbl_send') || 'Enviar';
            }
        };

        updateBtn();

        this.slowmodeInterval = setInterval(() => {
            this.slowmodeRemaining--;
            if (this.slowmodeRemaining <= 0) {
                clearInterval(this.slowmodeInterval);
                this.slowmodeInterval = null;
                this.slowmodeRemaining = 0;
            }
            updateBtn();
        }, 1000);
    }

    handleWhisperEvent(data) {
        const isSender = String(data.sender_id) === String(this.currentUserId);
        const isTarget = String(data.target_id) === String(this.currentUserId);

        if (!isSender && !isTarget) return;

        this.appendWhisperMessage(data, isSender);
    }

    appendWhisperMessage(msg, isSender) {
        const el = document.createElement('div');
        el.className = 'chat-message chat-message--whisper' + (isSender ? ' chat-message--mine' : '');
        el.dataset.messageId = msg.id || ('whisper_' + Date.now());

        const msgDate = new Date(msg.created_at || Date.now());
        const time = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const whisperTitle = isSender 
            ? `Susurraste a <strong>@${msg.target_username}</strong>` 
            : `<strong>@${msg.sender_username}</strong> te susurró`;

        const avatarUrl = isSender 
            ? (this.currentUserAvatar || `${window.AppBasePath || ''}/public/assets/img/fallbacks/avatar-default.png`)
            : (msg.sender_avatar || `${window.AppBasePath || ''}/public/assets/img/fallbacks/avatar-default.png`);

        const subColorCSS = this.parseSubscriptionColorCSS(msg.sender_sub_color);

        const avatarStr = `
            <div class="component-button--profile subscription-dynamic component-avatar--static-sm" data-sub-bg="${subColorCSS}" style="--active-subscription-bg: ${subColorCSS};">
                <img src="${avatarUrl}" class="chat-message-avatar-img image-lazy-fade" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='${window.AppBasePath || ''}/public/assets/img/fallbacks/avatar-default.png'; this.classList.add('image-loaded');">
            </div>
        `;

        el.innerHTML = `
            ${avatarStr}
            <div class="chat-message-bubble chat-whisper-bubble">
                <div class="chat-whisper-header">
                    <div class="chat-whisper-tag">
                        <span class="material-symbols-rounded">lock</span>
                        <span>${whisperTitle}</span>
                    </div>
                    <span class="chat-message-time">${time}</span>
                </div>
                <div class="chat-message-text">${msg.message}</div>
            </div>
        `;

        if (!isSender) {
            el.style.cursor = 'pointer';
            el.title = `Haz clic para responder a @${msg.sender_username}`;
            el.addEventListener('click', () => {
                if (this.chatInput) {
                    this.chatInput.value = `/w @${msg.sender_username} `;
                    this.chatInput.focus();
                    this.chatInput.dispatchEvent(new Event('input'));
                }
            });
        }

        if (this.chatContainer) {
            this.chatContainer.appendChild(el);
            this.scrollToBottom();
        }
    }

    appendSystemNotice(notice) {
        const el = document.createElement('div');
        el.className = 'chat-message chat-message--status chat-message--system-notice';
        el.innerHTML = `
            <div class="chat-message-status-bubble">
                <span class="material-symbols-rounded">${notice.icon || 'info'}</span>
                <span>${notice.text}</span>
            </div>
        `;
        if (this.chatContainer) {
            this.chatContainer.appendChild(el);
            this.scrollToBottom();
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
        if (msg.is_shout) {
            el.classList.add('chat-message--shout');
        }
        
        let avatarUrl = `${window.AppBasePath || ''}/public/assets/img/fallbacks/avatar-default.png`;
        if (msg.avatar) {
            if (msg.avatar.startsWith('http') || msg.avatar.startsWith('data:')) {
                avatarUrl = msg.avatar;
            } else {
                const prefix = msg.avatar.startsWith('/') ? '' : '/';
                avatarUrl = `${window.AppBasePath || ''}${prefix}${msg.avatar}`;
            }
        }

        const subColorCSS = this.parseSubscriptionColorCSS(msg.subscription_color);

        el.dataset.username = msg.username || '';
        el.dataset.avatar = avatarUrl;
        el.dataset.date = `${dateDividerStr}, ${time}`;
        el.dataset.subBg = subColorCSS || '';
        
        const fallbackUrl = `${window.AppBasePath || ''}/public/assets/img/fallbacks/avatar-default.png`;

        const avatarStr = `
            <div class="component-button--profile subscription-dynamic component-avatar--static-sm" data-sub-bg="${subColorCSS}" style="--active-subscription-bg: ${subColorCSS};">
                <img src="${avatarUrl}" class="chat-message-avatar-img image-lazy-fade" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='${fallbackUrl}'; this.classList.add('image-loaded');">
            </div>
        `;

        const uniqueId = 'msg-menu-' + msg.id;

        const menuBtn = `<div class="component-dropdown-wrapper component-dropdown-wrapper--fit chat-msg-actions chat-msg-actions--ml-auto">
            <button class="component-button component-button--icon component-button--icon-sm-ghost" data-action="toggleModule" data-target="${uniqueId}">
                <span class="material-symbols-rounded component-icon--18">more_vert</span>
            </button>
            <div class="component-module component-module--dropdown chat-dropdown-module disabled" data-module="${uniqueId}">
                <div class="component-menu component-menu--w265 component-menu--h-auto active" data-menu="${uniqueId}-options">
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-menu-list">
                        <div class="component-menu-link" data-action="chatOpenEmojiPicker" data-id="${msg.id}">
                            <div class="component-menu-link-icon">
                                <span class="material-symbols-rounded">add_reaction</span>
                            </div>
                            <div class="component-menu-link-text">
                                <span>${window.__('lbl_add_reaction') || 'Reaccionar'}</span>
                            </div>
                        </div>
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

        const quickReactionsHtml = `
            <div class="chat-quick-reactions">
                <button class="chat-quick-reaction-btn" data-action="chatQuickReact" data-emoji="👍" title="Me gusta">👍</button>
                <button class="chat-quick-reaction-btn" data-action="chatQuickReact" data-emoji="❤️" title="Me encanta">❤️</button>
                <button class="chat-quick-reaction-btn" data-action="chatQuickReact" data-emoji="😂" title="Risa">😂</button>
                <button class="chat-quick-reaction-btn" data-action="chatQuickReact" data-emoji="😮" title="Sorpresa">😮</button>
                <button class="chat-quick-reaction-btn" data-action="chatQuickReact" data-emoji="😢" title="Triste">😢</button>
                <button class="chat-quick-reaction-btn" data-action="chatQuickReact" data-emoji="🎨" title="Arte">🎨</button>
                <button class="chat-quick-reaction-btn chat-quick-reaction-btn--add" data-action="chatOpenEmojiPicker" data-id="${msg.id}" title="${window.__('lbl_more_reactions') || 'Más reacciones'}">
                    <span class="material-symbols-rounded">add_reaction</span>
                </button>
            </div>
        `;

        let shoutBannerHtml = '';
        if (msg.is_shout) {
            shoutBannerHtml = `
                <div class="chat-message-shout-banner">
                    <span class="material-symbols-rounded">campaign</span>
                    <span>${window.__('chat_announcement') || 'ANUNCIO DEL LIENZO'}</span>
                </div>
            `;
        }

        el.innerHTML = `
            ${avatarStr}
            <div class="chat-message-bubble">
                ${shoutBannerHtml}
                <div class="chat-message-header">
                    <div class="chat-header-title-box">
                        <strong class="chat-message-username">${msg.username}</strong>
                        <span>•</span>
                        <span class="chat-message-time">${time}</span>
                    </div>
                    ${menuBtn}
                </div>
                ${replyContextHtml}
                ${messageTextHtml}
                ${attachmentsHtml}
                ${this.buildReactionsHtml(msg.id, msg.reactions)}
            </div>
            ${quickReactionsHtml}
        `;
        return el;
    }

    buildReactionsHtml(messageId, reactions = []) {
        const list = Array.isArray(reactions) ? reactions : [];
        const hasReactions = list.length > 0;

        const badgesHtml = list.map(r => {
            const usersTitle = (r.users || []).map(u => u.username).join(', ');
            const isUserReacted = (String(r.user_reacted) === 'true' || (r.users && r.users.some(u => String(u.id) === String(this.currentUserId))));
            return `
                <button class="chat-reaction-badge component-badge ${isUserReacted ? 'active' : ''}" data-action="chatToggleReaction" data-message-id="${messageId}" data-emoji="${r.emoji}" title="${usersTitle || ''}">
                    <span class="chat-reaction-emoji">${r.emoji}</span>
                    <span class="chat-reaction-count">${r.count}</span>
                </button>
            `;
        }).join('');

        const addBtnHtml = `
            <button class="chat-reaction-badge component-badge chat-reaction-badge--add" data-action="chatOpenEmojiPicker" data-id="${messageId}" title="${window.__('lbl_add_reaction') || 'Reaccionar'}">
                <span class="material-symbols-rounded">add</span>
            </button>
        `;

        return `
            <div class="chat-message-reactions ${hasReactions ? '' : 'disabled'}" data-reactions-container="${messageId}">
                ${badgesHtml}
                ${hasReactions ? addBtnHtml : ''}
            </div>
        `;
    }

    async toggleReaction(messageId, emoji) {
        if (!messageId || !emoji) return;

        this.applyOptimisticReaction(messageId, emoji);

        try {
            const payload = {
                canvas_id: this.canvasId,
                message_id: messageId,
                emoji: emoji
            };
            const response = await this.api.post(ApiRoutes.Chat.React, payload);
            if (!response || !response.success) {
                showMessage(response?.message || __('err_reaction_failed'), 'error');
            }
        } catch (e) {
            showMessage(__('err_reaction_failed'), 'error');
        }
    }

    applyOptimisticReaction(messageId, emoji) {
        const cleanId = String(messageId).replace('pending_', '');
        const msgEl = this.chatContainer.querySelector(`.chat-message[data-message-id="${messageId}"], .chat-message[data-message-id="${cleanId}"], .chat-message[data-message-id="pending_${cleanId}"]`);
        if (!msgEl) return;

        const actualMsgId = msgEl.dataset.messageId;
        let reactionsContainer = msgEl.querySelector(`[data-reactions-container]`);
        if (!reactionsContainer) {
            const bubble = msgEl.querySelector('.chat-message-bubble');
            if (!bubble) return;
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'chat-message-reactions';
            reactionsContainer.setAttribute('data-reactions-container', actualMsgId);
            bubble.appendChild(reactionsContainer);
        }

        reactionsContainer.classList.remove('disabled');

        let badge = reactionsContainer.querySelector(`[data-emoji="${emoji}"]`);
        if (badge) {
            const countSpan = badge.querySelector('.chat-reaction-count');
            let count = parseInt(countSpan?.textContent || '0', 10);
            if (badge.classList.contains('active')) {
                badge.classList.remove('active');
                count = Math.max(0, count - 1);
                if (count === 0) {
                    badge.remove();
                    const remainingBadges = reactionsContainer.querySelectorAll('.chat-reaction-badge:not(.chat-reaction-badge--add)');
                    if (remainingBadges.length === 0) {
                        reactionsContainer.innerHTML = '';
                        reactionsContainer.classList.add('disabled');
                    }
                    return;
                } else if (countSpan) {
                    countSpan.textContent = count;
                }
            } else {
                badge.classList.add('active');
                count++;
                if (countSpan) countSpan.textContent = count;
                badge.classList.add('chat-reaction-pop');
                setTimeout(() => badge.classList.remove('chat-reaction-pop'), 400);
            }
        } else {
            const newBadge = document.createElement('button');
            newBadge.className = 'chat-reaction-badge component-badge active chat-reaction-pop';
            newBadge.dataset.action = 'chatToggleReaction';
            newBadge.dataset.messageId = actualMsgId;
            newBadge.dataset.emoji = emoji;
            newBadge.title = this.currentUsername || window.__('user');
            newBadge.innerHTML = `
                <span class="chat-reaction-emoji">${emoji}</span>
                <span class="chat-reaction-count">1</span>
            `;

            let addBtn = reactionsContainer.querySelector('.chat-reaction-badge--add');
            if (!addBtn) {
                addBtn = document.createElement('button');
                addBtn.className = 'chat-reaction-badge component-badge chat-reaction-badge--add';
                addBtn.dataset.action = 'chatOpenEmojiPicker';
                addBtn.dataset.id = actualMsgId;
                addBtn.title = window.__('lbl_add_reaction') || 'Reaccionar';
                addBtn.innerHTML = `<span class="material-symbols-rounded">add</span>`;
                reactionsContainer.appendChild(addBtn);
            }
            reactionsContainer.insertBefore(newBadge, addBtn);
            setTimeout(() => newBadge.classList.remove('chat-reaction-pop'), 400);
        }
    }

    handleReactionEvent(data) {
        if (!data) return;
        const msgId = data.message_id || data.uuid;
        if (!msgId) return;

        const cleanId = String(msgId).replace('pending_', '');
        const msgEl = this.chatContainer.querySelector(`.chat-message[data-message-id="${msgId}"], .chat-message[data-message-id="${cleanId}"], .chat-message[data-message-id="pending_${cleanId}"]`);

        if (!msgEl) return;

        const actualMsgId = msgEl.dataset.messageId;
        let reactionsContainer = msgEl.querySelector(`[data-reactions-container]`);
        
        if (!reactionsContainer) {
            const bubble = msgEl.querySelector('.chat-message-bubble');
            if (!bubble) return;
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'chat-message-reactions';
            reactionsContainer.setAttribute('data-reactions-container', actualMsgId);
            bubble.appendChild(reactionsContainer);
        }

        const reactions = data.reactions || [];
        if (reactions.length === 0) {
            reactionsContainer.innerHTML = '';
            reactionsContainer.classList.add('disabled');
            return;
        }

        reactionsContainer.classList.remove('disabled');
        
        const badgesHtml = reactions.map(r => {
            const usersTitle = (r.users || []).map(u => u.username).join(', ');
            const isUserReacted = (String(r.user_reacted) === 'true' || (r.users && r.users.some(u => String(u.id) === String(this.currentUserId))));
            return `
                <button class="chat-reaction-badge component-badge ${isUserReacted ? 'active' : ''}" data-action="chatToggleReaction" data-message-id="${actualMsgId}" data-emoji="${r.emoji}" title="${usersTitle || ''}">
                    <span class="chat-reaction-emoji">${r.emoji}</span>
                    <span class="chat-reaction-count">${r.count}</span>
                </button>
            `;
        }).join('');

        const addBtnHtml = `
            <button class="chat-reaction-badge component-badge chat-reaction-badge--add" data-action="chatOpenEmojiPicker" data-id="${actualMsgId}" title="${window.__('lbl_add_reaction') || 'Reaccionar'}">
                <span class="material-symbols-rounded">add</span>
            </button>
        `;

        reactionsContainer.innerHTML = badgesHtml + addBtnHtml;

        if (data.emoji) {
            const updatedBadge = reactionsContainer.querySelector(`[data-emoji="${data.emoji}"]`);
            if (updatedBadge) {
                updatedBadge.classList.add('chat-reaction-pop');
                setTimeout(() => updatedBadge.classList.remove('chat-reaction-pop'), 400);
            }
        }
    }

    createEmojiPicker() {
        if (this.emojiPickerEl) return this.emojiPickerEl;

        const picker = document.createElement('div');
        picker.className = 'component-module component-module--dropdown chat-emoji-picker-module disabled';
        picker.innerHTML = `
            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="chat-emoji-picker-menu">
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="chat-emoji-picker-header">
                    <div class="chat-emoji-picker-tabs">
                        <button class="chat-emoji-tab active" data-cat="faces" title="Caras y Emociones">😀</button>
                        <button class="chat-emoji-tab" data-cat="gestures" title="Gestos y Personas">👍</button>
                        <button class="chat-emoji-tab" data-cat="art" title="Pixel Art y Símbolos">🎨</button>
                    </div>
                </div>
                <div class="chat-emoji-picker-grid" data-ref="chat-emoji-grid"></div>
            </div>
        `;

        document.body.appendChild(picker);
        this.emojiPickerEl = picker;

        this.emojiCategories = {
            faces: ['😀', '😃', '😄', '😁', '😆', '😂', '🤣', '🥹', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '🤔', '🤨', '😮', '😲', '😳', '😢', '😭', '😱', '🤯'],
            gestures: ['👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '🫡', '💪', '👀', '🧠', '👑', '💯', '🔥', '✨'],
            art: ['🎨', '🖌️', '🖍️', '🖼️', '🎯', '🚀', '⭐', '🌟', '💎', '🎉', '🎊', '🎈', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💥', '⚡']
        };

        const tabs = picker.querySelectorAll('.chat-emoji-tab');
        const grid = picker.querySelector('[data-ref="chat-emoji-grid"]');

        const renderGrid = (categoryKey) => {
            grid.innerHTML = '';
            const list = this.emojiCategories[categoryKey] || this.emojiCategories.faces;
            list.forEach(emoji => {
                const btn = document.createElement('button');
                btn.className = 'chat-emoji-item';
                btn.textContent = emoji;
                btn.dataset.emoji = emoji;
                btn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (this.currentPickerTargetMessageId) {
                        this.toggleReaction(this.currentPickerTargetMessageId, emoji);
                    }
                    this.closeEmojiPicker();
                });
                grid.appendChild(btn);
            });
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderGrid(tab.dataset.cat);
            });
        });

        renderGrid('faces');

        document.addEventListener('click', (ev) => {
            if (this.emojiPickerEl && !this.emojiPickerEl.classList.contains('disabled')) {
                if (!this.emojiPickerEl.contains(ev.target) && !ev.target.closest('[data-action="chatOpenEmojiPicker"]')) {
                    this.closeEmojiPicker();
                }
            }
        });

        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && this.emojiPickerEl && !this.emojiPickerEl.classList.contains('disabled')) {
                this.closeEmojiPicker();
            }
        });

        return this.emojiPickerEl;
    }

    openEmojiPicker(triggerBtn, messageId) {
        this.currentPickerTargetMessageId = messageId;
        const picker = this.createEmojiPicker();

        const rect = triggerBtn.getBoundingClientRect();
        picker.classList.remove('disabled');
        picker.classList.add('active');

        const pickerWidth = 270;
        const pickerHeight = 220;

        let left = rect.left;
        let top = rect.top - pickerHeight - 8;

        if (left + pickerWidth > window.innerWidth - 16) {
            left = window.innerWidth - pickerWidth - 16;
        }
        if (left < 16) {
            left = 16;
        }
        if (top < 16) {
            top = rect.bottom + 8;
        }

        picker.style.position = 'fixed';
        picker.style.left = `${left}px`;
        picker.style.top = `${top}px`;
        picker.style.zIndex = '999999';
    }

    closeEmojiPicker() {
        if (this.emojiPickerEl) {
            this.emojiPickerEl.classList.remove('active');
            this.emojiPickerEl.classList.add('disabled');
        }
        this.currentPickerTargetMessageId = null;
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

        if (lastWord.startsWith('/')) {
            const generalCommands = [
                { name: '/help', desc: 'Ayuda y lista de comandos', icon: 'help' },
                { name: '/w', desc: 'Susurro / Mensaje privado', icon: 'lock' },
                { name: '/whisper', desc: 'Susurro / Mensaje privado', icon: 'lock' },
                { name: '/clear', desc: 'Limpiar chat (vista local)', icon: 'delete_sweep' }
            ];

            const modCommands = [
                { name: '/clearchat', desc: 'Limpiar chat para todos (en vivo)', icon: 'cleaning_services' },
                { name: '/slowmode', desc: 'Modo lento entre mensajes', icon: 'timer' },
                { name: '/shout', desc: 'Anuncio destacado de moderador', icon: 'campaign' },
                { name: '/anuncio', desc: 'Anuncio destacado de moderador', icon: 'campaign' },
                { name: '/timeout', desc: 'Silenciar usuario temporalmente', icon: 'schedule' },
                { name: '/untimeout', desc: 'Levantar silencio de chat', icon: 'lock_open' },
                { name: '/ban', desc: 'Silenciar permanentemente', icon: 'speaker_notes_off' },
                { name: '/unban', desc: 'Levantar baneo del chat', icon: 'check_circle' },
                { name: '/canvasban', desc: 'Baneo permanente del lienzo', icon: 'block' },
                { name: '/unbancanvas', desc: 'Desbanear del lienzo', icon: 'check_circle' }
            ];

            const commands = this.canModerateChat ? [...generalCommands, ...modCommands] : generalCommands;
            const match = lastWord.toLowerCase();
            const suggestions = commands.filter(c => c.name.toLowerCase().startsWith(match) || c.name.toLowerCase().includes(match.replace('/', '')));
            this.showAutocomplete(suggestions, 'command', lastWord, commands);
            return;
        }

        let isUserTrigger = false;
        let query = '';
        let triggerWord = '';

        const userCmds = ['/w', '/whisper', '/msg', '/timeout', '/untimeout', '/ban', '/unban', '/canvasban', '/bancanvas', '/canvasunban', '/unbancanvas'];
        if (lastWord.startsWith('@')) {
            isUserTrigger = true;
            query = lastWord.substring(1).toLowerCase();
            triggerWord = lastWord;
        } else if (words.length === 2 && userCmds.includes(words[0].toLowerCase())) {
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
            
            const allUserItems = allUsernames.map(u => ({ name: u, desc: 'Usuario', icon: 'person' }));
            const suggestions = allUserItems.filter(u => u.name.toLowerCase().includes(query));

            this.showAutocomplete(suggestions, 'user', triggerWord, allUserItems);
            return;
        }

        this.hideAutocomplete();
    }

    showAutocomplete(suggestions, type, triggerWord, masterList = []) {
        if (!suggestions || (suggestions.length === 0 && masterList.length === 0)) {
            this.hideAutocomplete();
            return;
        }

        this.currentAutocompleteType = type;
        this.currentAutocompleteTriggerWord = triggerWord;
        this.allCurrentSuggestions = (masterList && masterList.length > 0) ? masterList : suggestions;

        this.autocompleteContainer.innerHTML = '';
        
        const searchPlaceholder = (type === 'command')
            ? (window.__('search_commands') || 'Buscar comandos...')
            : (window.__('search_users') || 'Buscar usuarios...');

        const menuWrapper = document.createElement('div');
        menuWrapper.className = 'component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited active';

        const cleanVal = triggerWord.replace(/^[/@]/, '');

        menuWrapper.innerHTML = `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-menu-header">
                <div class="component-search component-search--full component-search--h36">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="chat-autocomplete-search" placeholder="${searchPlaceholder}" value="${cleanVal}">
                    </div>
                </div>
            </div>
            <div class="component-menu-list component-menu-list--scrollable" data-ref="chat-autocomplete-list">
            </div>
            <div class="component-menu-empty ${suggestions.length === 0 ? '' : 'disabled'}" data-ref="chat-autocomplete-empty">
                 <div class="component-menu-link disabled-interaction">
                     <div class="component-menu-link-icon"><span class="material-symbols-rounded">search_off</span></div>
                     <div class="component-menu-link-text"><span>${window.__('no_results_found') || 'No se encontraron resultados'}</span></div>
                 </div>
            </div>
        `;

        const listContainer = menuWrapper.querySelector('[data-ref="chat-autocomplete-list"]');
        const emptyContainer = menuWrapper.querySelector('[data-ref="chat-autocomplete-empty"]');
        const searchInput = menuWrapper.querySelector('[data-ref="chat-autocomplete-search"]');

        const renderItems = (items) => {
            listContainer.innerHTML = '';
            if (!items || items.length === 0) {
                if (emptyContainer) emptyContainer.classList.remove('disabled');
                return;
            }
            if (emptyContainer) emptyContainer.classList.add('disabled');

            items.forEach((item, index) => {
                const el = document.createElement('div');
                el.className = 'component-menu-link chat-autocomplete-item' + (index === 0 ? ' active' : '');
                el.dataset.name = item.name;
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
                listContainer.appendChild(el);
            });
        };

        renderItems(suggestions);

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase().trim();
                const filtered = this.allCurrentSuggestions.filter(s => 
                    s.name.toLowerCase().includes(q) || (s.desc && s.desc.toLowerCase().includes(q))
                );
                renderItems(filtered);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const items = Array.from(listContainer.querySelectorAll('.chat-autocomplete-item'));
                    let activeIndex = items.findIndex(item => item.classList.contains('active'));

                    if (e.key === 'ArrowDown') {
                        if (items.length > 0) {
                            if (activeIndex !== -1) items[activeIndex].classList.remove('active');
                            activeIndex = (activeIndex + 1) % items.length;
                            items[activeIndex].classList.add('active');
                            items[activeIndex].scrollIntoView({ block: 'nearest' });
                        }
                    } else if (e.key === 'ArrowUp') {
                        if (items.length > 0) {
                            if (activeIndex !== -1) items[activeIndex].classList.remove('active');
                            activeIndex = (activeIndex - 1 + items.length) % items.length;
                            items[activeIndex].classList.add('active');
                            items[activeIndex].scrollIntoView({ block: 'nearest' });
                        }
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                        if (activeIndex !== -1 && items[activeIndex]) {
                            items[activeIndex].click();
                        } else if (items.length > 0) {
                            items[0].click();
                        }
                    }
                } else if (e.key === 'Escape') {
                    this.hideAutocomplete();
                    this.chatInput.focus();
                }
            });
        }

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
        if (triggerWord && triggerWord.startsWith('@') && !replacement.startsWith('@')) {
            replacement = '@' + replacement;
        }

        const newTextBefore = textBeforeCursor.substring(0, textBeforeCursor.length - (triggerWord ? triggerWord.length : 0)) + replacement + ' ';
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
        this.loadGeneralInfoDetails();
        this.loadMediaGallery();
    }

    async loadGeneralInfoDetails() {
        if (!this.canvasId) return;
        try {
            const res = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasId });
            if (res && res.success && res.data) {
                const c = res.data;
                const menuInfo = document.querySelector('[data-ref="menu-chat-info"]');
                if (!menuInfo) return;

                const typeEl = menuInfo.querySelector('[data-ref="canvas-info-type"]');
                const dimEl = menuInfo.querySelector('[data-ref="canvas-info-dimensions"]');
                const ownerEl = menuInfo.querySelector('[data-ref="canvas-info-owner"]');
                const createdEl = menuInfo.querySelector('[data-ref="canvas-info-created"]');
                const membersEl = menuInfo.querySelector('[data-ref="canvas-info-members"]');
                const cooldownEl = menuInfo.querySelector('[data-ref="canvas-info-cooldown"]');
                const privacyEl = menuInfo.querySelector('[data-ref="canvas-info-privacy"]');
                const favsEl = menuInfo.querySelector('[data-ref="canvas-info-favorites"]');
                const pixelsEl = menuInfo.querySelector('[data-ref="canvas-info-total-pixels"]');

                if (typeEl) typeEl.textContent = (c.mode === 'online') ? 'Lienzo en vivo' : 'Lienzo personal';
                if (dimEl) dimEl.textContent = `${c.width || '-'} x ${c.height || '-'} px`;
                if (ownerEl) ownerEl.textContent = c.owner_username || '-';
                if (createdEl && c.created_at) {
                    try {
                        const dateObj = new Date(c.created_at.replace(' ', 'T'));
                        if (!isNaN(dateObj.getTime())) {
                            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                            createdEl.textContent = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                        } else {
                            createdEl.textContent = c.created_at;
                        }
                    } catch (e) {
                        createdEl.textContent = c.created_at;
                    }
                }
                if (membersEl) {
                    const current = c.members_count || 1;
                    const max = c.max_participants || c.max_members || 10;
                    membersEl.textContent = `${current} / ${max}`;
                }
                if (cooldownEl) cooldownEl.textContent = c.cooldown_seconds ? `${c.cooldown_seconds}s` : 'Sin espera';
                if (privacyEl) privacyEl.textContent = (c.privacy === 'private') ? 'Privado' : 'Público';
                if (favsEl) favsEl.textContent = c.favorites_count || 0;
                if (pixelsEl) pixelsEl.textContent = (c.total_pixels !== undefined) ? Number(c.total_pixels).toLocaleString() : '0';
            }
        } catch (e) {
            console.error('[DesignChat] Error loading canvas info details:', e);
        }
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

        let skeletonHtml = '';
        for (let s = 0; s < 6; s++) {
            skeletonHtml += '<div class="chat-info-gallery-item component-skeleton"></div>';
        }
        grid.innerHTML = skeletonHtml;

        try {
            const response = await this.api.post(ApiRoutes.Chat.MediaGallery, {
                canvas_id: this.canvasId
            });

            if (response && response.success && Array.isArray(response.photos)) {
                if (response.photos.length === 0) {
                    grid.innerHTML = `
                        <div class="chat-info-gallery-empty">
                            ${window.__('lbl_no_photos') || 'No hay fotos enviadas'}
                        </div>
                    `;
                } else {
                    grid.innerHTML = '';
                    response.photos.forEach((photoUrl, pIdx) => {
                        const item = document.createElement('div');
                        item.className = 'chat-info-gallery-item component-skeleton';

                        const img = document.createElement('img');
                        img.src = photoUrl;
                        img.alt = 'Photo';
                        img.loading = 'lazy';
                        img.className = 'image-lazy-fade';
                        img.onload = () => {
                            img.classList.add('image-loaded');
                            item.classList.remove('component-skeleton');
                        };
                        img.onerror = () => {
                            item.classList.remove('component-skeleton');
                        };

                        item.appendChild(img);
                        item.addEventListener('click', () => {
                            if (window.modalSystem) {
                                const galleryImages = response.photos.map((p, idx) => ({
                                    url: p,
                                    name: `${window.__('lbl_sent_photos') || 'Foto enviada'} #${idx + 1}`,
                                    sender: window.__('lbl_chat_member') || 'Miembro del lienzo',
                                    avatar: '',
                                    date: ''
                                }));
                                window.modalSystem.show('imageViewer', {
                                    images: galleryImages,
                                    initialIndex: pIdx,
                                    title: window.__('lbl_sent_photos') || 'Fotos enviadas'
                                });
                            } else {
                                window.open(photoUrl, '_blank');
                            }
                        });
                        grid.appendChild(item);
                    });
                }
            } else {
                grid.innerHTML = `
                    <div class="chat-info-gallery-error">
                        ${response.message || window.__('err_generic') || 'Error al cargar fotos'}
                    </div>
                `;
            }
        } catch (error) {
            grid.innerHTML = `
                <div class="chat-info-gallery-error">
                    ${window.__('err_generic') || 'Error al cargar fotos'}
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

