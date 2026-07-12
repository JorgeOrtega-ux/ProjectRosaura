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
        this.previewContainer = document.querySelector('[data-ref="chat-attachments-preview"]');

        this.offset = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.messages = [];
        this.selectedFiles = [];
        this.isChatEnabled = document.querySelector('.component-wrapper')?.dataset.allowChat === '1';
        this.isFirstRenderScrollPending = true;
        this.currentUserId = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.userId || null;
        this.currentUsername = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.username || 'Usuario';
        this.canModerateChat = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.canModerate === '1';

        this.typingUsers = new Map();
        this.lastTypingSent = 0;
        this.lastIsTyping = false;
        this.myTypingTimeout = null;
        this.badWords = [];
        this.loadBadWords();

        this.typingContainer = document.createElement('div');
        this.typingContainer.className = 'chat-typing-indicator';
        this.typingContainer.classList.remove('active'); this.typingContainer.classList.add('disabled');
        this.typingContainer.style.fontSize = '12px';
        this.typingContainer.style.color = 'var(--text-secondary)';
        this.typingContainer.style.padding = '4px 16px';
        this.typingContainer.style.fontStyle = 'italic';
        this.typingContainer.style.minHeight = '20px';
        
        const inputArea = document.querySelector('.component-chat-input-area');
        if (inputArea && inputArea.parentNode) {
            inputArea.parentNode.insertBefore(this.typingContainer, inputArea);
        }

        if (this.isChatEnabled && this.chatContainer) {
            this.init();
        }
    }

    async loadBadWords() {
        try {
            const response = await fetch((window.AppBasePath || '') + '/public/assets/json/bad_words.json');
            if (response.ok) {
                this.badWords = await response.json();
            }
        } catch (e) {
            
        }
    }

    censorText(text) {
        if (!this.badWords || this.badWords.length === 0) return text;
        let censored = text;
        this.badWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            censored = censored.replace(regex, '*'.repeat(word.length));
        });
        return censored;
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

        this.loadHistory();
    }

    setupEventListeners() {
        if (this.btnSend) {
            this.btnSend.addEventListener('click', () => this.sendMessage());
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }

        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
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

        document.addEventListener('canvas:chat_message', (e) => {
            const data = e.detail;
            this.appendMessage(data, true); 
        });

        document.addEventListener('canvas:chat_typing', (e) => {
            this.handleTypingEvent(e.detail);
        });

        document.addEventListener('canvas:chat_message_deleted', (e) => {
            this.removeMessageElement(e.detail.id);
        });

        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-action="toggleChatDropdown"]');
            if (toggleBtn) {
                e.preventDefault();
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

    handleFileSelection(e) {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const maxFiles = 8;
        const maxSize = 25 * 1024 * 1024; 

        let totalSize = this.selectedFiles.reduce((acc, file) => acc + file.size, 0);

        for (const file of files) {
            if (this.selectedFiles.length >= maxFiles) {
                showMessage(`Solo puedes adjuntar hasta ${maxFiles} fotos por mensaje`, 'warning');
                break;
            }
            if (!file.type.startsWith('image/')) {
                showMessage(`El archivo ${file.name} no es una imagen válida`, 'warning');
                continue;
            }
            if (totalSize + file.size > maxSize) {
                showMessage(`El tamaño total no puede superar los 25 MB`, 'warning');
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
        if (!this.previewContainer) return;
        
        if (this.selectedFiles.length === 0) {
            this.previewContainer.classList.remove('active'); this.previewContainer.classList.add('disabled');
            this.previewContainer.innerHTML = '';
            return;
        }

        this.previewContainer.classList.remove('disabled'); this.previewContainer.classList.add('active');
        this.previewContainer.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            
            const card = document.createElement('div');
            card.className = 'chat-attachment-preview-card';
            
            const img = document.createElement('img');
            reader.onload = (e) => { img.src = e.target.result; };
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
            this.topLoader.style.textAlign = 'center';
            this.topLoader.style.padding = '12px';
            this.topLoader.style.color = 'var(--text-secondary)';
            this.topLoader.innerHTML = '<span class="material-symbols-rounded icon-spin-slow" style="font-size: 20px;">sync</span>';
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
                this.loader.innerHTML = 'Error al cargar mensajes.';
            }
        } finally {
            this.isLoading = false;
        }
    }

    async sendMessage() {
        const text = this.chatInput.value.trim();
        if (!text && this.selectedFiles.length === 0) return;

        this.chatInput.disabled = true;
        this.btnSend.disabled = true;
        this.btnSend.classList.remove('active');
        
        const backupText = text;
        const backupFiles = [...this.selectedFiles];
        
        this.chatInput.value = '';
        this.selectedFiles = [];
        this.renderPreview();

        try {
            let response;
            if (backupFiles.length > 0) {
                const formData = new FormData();
                formData.append('canvas_id', this.canvasId);
                formData.append('message', backupText);
                for (let i = 0; i < backupFiles.length; i++) {
                    formData.append('images[]', backupFiles[i]);
                }
                response = await this.api.postForm(ApiRoutes.Chat.Send, formData);
            } else {
                response = await this.api.post(ApiRoutes.Chat.Send, {
                    canvas_id: this.canvasId,
                    message: backupText
                });
            }

            if (response.success === false || response.status === 'error') {
                showMessage(response.message || 'Error al enviar el mensaje', 'error');
                this.chatInput.value = backupText; 
                this.selectedFiles = backupFiles;
                this.renderPreview();
            }
        } catch (error) {
            
            showMessage('Error al enviar el mensaje', 'error');
            this.chatInput.value = backupText;
            this.selectedFiles = backupFiles;
            this.renderPreview();
        } finally {
            this.chatInput.disabled = false;
            this.btnSend.disabled = false;
            if (this.chatInput.value.trim().length > 0 || this.selectedFiles.length > 0) {
                this.btnSend.classList.add('active');
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
        }
    }

    async deleteMessage(id) {
        if (window.dialogSystem) {
            const res = await window.dialogSystem.show('confirmDeleteMessage');
            if (!res.confirmed) return;
        } else {
            if (!confirm('¿Seguro que deseas eliminar este mensaje?')) return;
        }

        try {
            const response = await this.api.post(ApiRoutes.Chat.Delete, {
                canvas_id: this.canvasId,
                message_id: id
            });
            
            if (response.success || response.status === 'success') {
                this.removeMessageElement(id);
                showMessage(response.message, 'success');
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            
            showMessage('Error al eliminar mensaje', 'error');
        }
    }

    async reportMessage(id) {
        let reason;
        if (window.dialogSystem) {
            const res = await window.dialogSystem.show('reportMessageDialog');
            if (!res.confirmed || !res.data.confirm_input) return;
            reason = res.data.confirm_input;
        } else {
            reason = prompt(window.__('report_options_msg'));
            if (!reason) return;
        }
        
        let reasonText = reason;
        if (reason === '1') reasonText = 'Spam o publicidad';
        if (reason === '2') reasonText = 'Lenguaje ofensivo';
        if (reason === '3') reasonText = window.__('report_harassment');
        if (reason === '4') reasonText = 'Otro';

        try {
            const response = await this.api.post(ApiRoutes.Chat.Report, {
                canvas_id: this.canvasId,
                message_id: id,
                reason: reasonText
            });
            
            if (response.success || response.status === 'success') {
                showMessage(response.message, 'success');
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            
            showMessage('Error al reportar mensaje', 'error');
        }
    }

    removeMessageElement(id) {
        const msgEl = this.chatContainer.querySelector(`[data-message-id="${id}"]`);
        if (msgEl) {
            msgEl.remove();
        }
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
            this.typingContainer.classList.remove('active'); this.typingContainer.classList.add('disabled');
            this.typingContainer.innerHTML = '';
        } else if (count === 1) {
            const username = Array.from(this.typingUsers.values())[0].username;
            this.typingContainer.innerHTML = `<strong>${username}</strong> está escribiendo...`;
            this.typingContainer.classList.remove('disabled'); this.typingContainer.classList.add('active');
        } else {
            this.typingContainer.innerHTML = `${count} usuarios están escribiendo...`;
            this.typingContainer.classList.remove('disabled'); this.typingContainer.classList.add('active');
        }
    }

    createMessageElement(msg) {
        const el = document.createElement('div');
        el.className = 'chat-message';
        el.dataset.messageId = msg.id;
        
        const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let avatarUrl = '';
        if (msg.avatar) {
            if (msg.avatar.startsWith('http') || msg.avatar.startsWith('data:')) {
                avatarUrl = msg.avatar;
            } else {
                const prefix = msg.avatar.startsWith('/') ? '' : '/';
                avatarUrl = `${window.AppBasePath || ''}${prefix}${msg.avatar}`;
            }
        }
        
        const avatarStr = msg.avatar 
            ? `<img src="${avatarUrl}" class="chat-message-avatar-img">`
            : `<div class="chat-message-avatar-placeholder"><span class="material-symbols-rounded">person</span></div>`;

        const isMine = String(msg.user_id) === String(this.currentUserId);
        const uniqueId = 'msg-menu-' + msg.id;

        const menuBtn = `<div class="component-dropdown-wrapper component-dropdown-wrapper--fit chat-msg-actions" style="margin-left: auto;">
            <button class="component-button component-button--icon" style="width: 24px; height: 24px; padding: 0; background: transparent; border: none;" data-action="toggleChatDropdown" data-target="${uniqueId}">
                <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);">more_vert</span>
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
                                <span>Reportar</span>
                            </div>
                        </div>
                        ${(!isMine && this.canModerateChat) ? `
                        <div class="component-menu-link" data-action="chatRestrictUser" data-user-id="${msg.user_id}">
                            <div class="component-menu-link-icon">
                                <span class="material-symbols-rounded" style="color: var(--warning-color, #f39c12);">block</span>
                            </div>
                            <div class="component-menu-link-text">
                                <span style="color: var(--warning-color, #f39c12);">Restringir chat</span>
                            </div>
                        </div>
                        ` : ''}
                        ${isMine ? `
                        <div class="component-menu-link" data-action="chatDeleteMessage" data-id="${msg.id}">
                            <div class="component-menu-link-icon">
                                <span class="material-symbols-rounded" style="color: var(--danger-color);">delete</span>
                            </div>
                            <div class="component-menu-link-text">
                                <span style="color: var(--danger-color);">Eliminar</span>
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
                attachmentsHtml += `
                <div class="chat-attachment-item" data-action="openChatImageViewer" data-message-id="${msg.id}" data-index="${i}" data-canvas-uuid="${extractedUuid}">
                    <img src="${url}" loading="lazy" />
                    ${overlay}
                </div>
                `;
            }
            attachmentsHtml += `</div>`;
        }

        let messageTextHtml = '';
        if (msg.message && msg.message.trim().length > 0) {
            messageTextHtml = `<div class="chat-message-text">${this.censorText(msg.message)}</div>`;
        }

        el.innerHTML = `
            ${avatarStr}
            <div class="chat-message-bubble" style="overflow: visible;">
                <div class="chat-message-header" style="align-items: center;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <strong class="chat-message-username">${msg.username}</strong>
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
        const isScrolledToBottom = this.chatContainer.scrollHeight - this.chatContainer.clientHeight <= this.chatContainer.scrollTop + 50;
        
        const el = this.createMessageElement(msg);
        this.chatContainer.appendChild(el);
        
        if (scroll && isScrolledToBottom) {
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}
