import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

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
        this.fileInput = document.getElementById('chat-file-input');
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
        this.canModerateChat = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.canModerate === '1';

        const moduleChat = document.querySelector('[data-module="moduleLiveChat"]');
        this.maxFilesLimit = moduleChat ? parseInt(moduleChat.dataset.maxImages, 10) || 6 : 6;
        this.maxUploadMbLimit = moduleChat ? parseInt(moduleChat.dataset.maxSizeMb, 10) || 10 : 10;

        this.typingUsers = new Map();
        this.lastTypingSent = 0;
        this.lastIsTyping = false;
        this.myTypingTimeout = null;

        this.typingContainer = null;

        if (this.isChatEnabled && this.chatContainer) {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();

        this.resizeObserver = new ResizeObserver(() => {
            if (this.isFirstRenderScrollPending && this.chatContainer.clientHeight > 0) {
                this.scrollToBottom();
                this.isFirstRenderScrollPending = false; 
            }
        });
        this.resizeObserver.observe(this.chatContainer);

        setInterval(() => {
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

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-module-target="moduleLiveChat"]');
            if (btn && !this.initialHistoryLoaded) {
                this.initialHistoryLoaded = true;
                this.loadHistory();
            }
        });
    }

    setupEventListeners() {
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
            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            this.chatInput.addEventListener('input', () => {
                if (this.btnSend) {
                    if (this.chatInput.value.trim().length > 0) {
                        this.btnSend.classList.add('active');
                    } else {
                        this.btnSend.classList.remove('active');
                    }
                }

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

        this.chatContainer.addEventListener('click', (e) => {
            const btnDelete = e.target.closest('[data-action="chatDeleteMessage"]');
            if (btnDelete) {
                const id = btnDelete.dataset.id;
                this.deleteMessage(id);
                const dropdown = btnDelete.closest('.chat-dropdown-module');
                if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
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
                const userId = btnRestrict.dataset.userId;
                window.open((window.AppBasePath || '') + `/canvases/manage/chat-restriction/${this.canvasId}/${userId}`, '_blank');
                const dropdown = btnRestrict.closest('.chat-dropdown-module');
                if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
            }
        });

        document.addEventListener('click', (e) => {
            const btnAttach = e.target.closest('[data-action="triggerChatAttach"]');
            if (btnAttach && this.fileInput) {
                this.fileInput.click();
                const dropdown = btnAttach.closest('.chat-dropdown-module');
                if (dropdown) { dropdown.classList.remove('active'); dropdown.classList.add('disabled'); }
            }
        });

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

        window.currentDesignChatInstance = this;

        if (!window._designChatGlobalEventsBound) {
            window._designChatGlobalEventsBound = true;

            document.addEventListener('canvas:chat_message', (e) => {
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.appendMessage(e.detail, true); 
            });

            document.addEventListener('canvas:chat_typing', (e) => {
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.handleTypingEvent(e.detail);
            });

            document.addEventListener('canvas:chat_message_deleted', (e) => {
                const { id, visibility } = e.detail;
                if (window.currentDesignChatInstance) window.currentDesignChatInstance.updateMessageVisibility(id, visibility || 'deleted');
            });

            document.addEventListener('click', (e) => {
                const toggleBtn = e.target.closest('[data-action="toggleChatDropdown"]');
                if (toggleBtn) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const targetId = toggleBtn.getAttribute('data-target');
                    const dropdown = document.querySelector(`[data-module="${targetId}"]`);
                    
                    if (dropdown) {
                        document.querySelectorAll('.chat-dropdown-module').forEach(el => {
                            if (el !== dropdown) {
                                el.classList.add('disabled');
                                el.classList.remove('active');
                            }
                        });
                        
                        if (dropdown.classList.contains('disabled')) {
                            dropdown.classList.remove('disabled');
                            dropdown.classList.add('active');

                            const innerMenu = dropdown.querySelector('.component-menu');
                            if (innerMenu) {
                                innerMenu.classList.remove('disabled');
                                innerMenu.classList.add('active');
                            }
                        } else {
                            dropdown.classList.add('disabled');
                            dropdown.classList.remove('active');
                        }
                    }
                }
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
                                window.spaRouter.navigate(`/canvases/chat-viewer?canvas=${canvasUuid}&msg=${msgId}&idx=${index}`);
                            } else {
                                window.location.href = (window.AppBasePath || '') + `/canvases/chat-viewer?canvas=${canvasUuid}&msg=${msgId}&idx=${index}`;
                            }
                        } catch(err) {  }
                    }
                }
            });
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

    async loadHistory() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;

        let loaderStartTime = 0;
        if (this.offset === 0 && this.loader) {
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
                    if (emptyState) emptyState.classList.remove('disabled'); emptyState.classList.add('active');
                } else {
                    if (emptyState) emptyState.classList.remove('active'); emptyState.classList.add('disabled');
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

        try {
            let response;
            if (backupFiles.length > 0) {
                const formData = new FormData();
                formData.append('canvas_id', this.canvasId);
                formData.append('message', backupText);
                for (let i = 0; i < backupFiles.length; i++) {
                    const compressedFile = await this.compressImage(backupFiles[i]);
                    formData.append('images[]', compressedFile);
                }
                response = await this.api.postForm(ApiRoutes.Chat.Send, formData);
            } else {
                response = await this.api.post(ApiRoutes.Chat.Send, {
                    canvas_id: this.canvasId,
                    message: backupText
                });
            }

            if (response.success === false || response.status === 'error') {
                showMessage(response.message, 'error');
            } else {
                this.chatInput.value = '';
                this.selectedFiles = [];
                this.renderPreview();
                this.btnSend.classList.remove('active');
            }
        } catch (error) {
            showMessage(window.__('err_send_message'), 'error');
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
        if (window.dialogSystem) {
            const res = await window.dialogSystem.show('confirmDeleteMessage');
            if (!res.confirmed) return;
        } else {
            if (!confirm(window.__('confirm_delete_message'))) return;
        }

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
            
            showMessage(window.__('err_delete_message'), 'error');
        }
    }

    async reportMessage(id) {
        let selectedReason = '';
        let detailsText = '';

        if (window.dialogSystem) {
            const res = await window.dialogSystem.show('reportMessageDialog');
            if (!res.confirmed) return;

            selectedReason = res.data.report_reason || res.data.report_reason_input;
            if (!selectedReason) {
                showMessage(__('err_report_select_reason'), 'error');
                return;
            }

            detailsText = (res.data.report_other_text || res.data.report_other_textarea || '').trim();
        } else {
            selectedReason = 'other';
            detailsText = prompt(__('report_desc')) || '';
            if (!detailsText) return;
        }

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

    createMessageElement(msg) {
        // Handle non-visible messages (deleted / under_review)
        const visibility = msg.visibility || 'visible';
        if (visibility !== 'visible') {
            return this.createStatusMessageElement(msg.id, null, visibility, msg.created_at);
        }

        const el = document.createElement('div');
        const isMine = String(msg.user_id) === String(this.currentUserId);
        el.className = 'chat-message' + (isMine ? ' chat-message--mine' : '');
        el.dataset.messageId = msg.id;
        
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
        const avatarStr = `<img src="${avatarUrl}" class="chat-message-avatar-img image-lazy-fade" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='${fallbackUrl}'; this.classList.add('image-loaded');">`;

        const uniqueId = 'msg-menu-' + msg.id;

        const menuBtn = `<div class="component-dropdown-wrapper component-dropdown-wrapper--fit chat-msg-actions chat-msg-actions--ml-auto">
            <button class="component-button component-button--icon component-button--icon-sm-ghost" data-action="toggleChatDropdown" data-target="${uniqueId}">
                <span class="material-symbols-rounded component-icon--18 component-text-secondary">more_vert</span>
            </button>
            <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed chat-dropdown-module disabled" data-module="${uniqueId}">
                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="${uniqueId}-options">
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-menu-list component-menu-list--scrollable">
                        <div class="component-menu-link" data-action="chatReportMessage" data-id="${msg.id}">
                            <div class="component-menu-link-icon">
                                <span class="material-symbols-rounded">report</span>
                            </div>
                            <div class="component-menu-link-text">
                                <span>${__('lbl_report_chat')}</span>
                            </div>
                        </div>
                        ${(!isMine && this.canModerateChat) ? `
                        <div class="component-menu-link" data-action="chatRestrictUser" data-user-id="${msg.user_id}">
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
                if (a.startsWith('/api/index.php?route=chat.attachment')) {
                    return (window.AppBasePath || '') + a;
                }
                return (window.AppBasePath || '') + a;
            });
            
            for (let i = 0; i < displayCount; i++) {
                const url = fullUrls[i];
                
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
                        <span class="component-text-secondary">•</span>
                        <span class="chat-message-time">${time}</span>
                    </div>
                    ${menuBtn}
                </div>
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
}
