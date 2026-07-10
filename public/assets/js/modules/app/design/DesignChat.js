import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

export class DesignChat {
    constructor(controller) {
        this.controller = controller;
        this.api = new ApiService();
        this.canvasId = controller.canvasIntId || controller.canvasId;
        
        // Elementos UI
        this.chatContainer = document.querySelector('[data-ref="chat-messages-container"]');
        this.chatInput = document.querySelector('[data-ref="chat-input-message"]');
        this.btnSend = document.querySelector('[data-ref="chat-btn-send"]');
        this.loader = document.querySelector('[data-ref="chat-loader"]');
        
        // Estado
        this.offset = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.messages = [];
        this.isChatEnabled = document.querySelector('.component-wrapper')?.dataset.allowChat === '1';
        this.isFirstRenderScrollPending = true;
        this.currentUserId = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.userId || null;
        this.currentUsername = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.username || 'Usuario';
        this.canModerateChat = document.querySelector('[data-module="moduleLiveChat"]')?.dataset.canModerate === '1';

        this.typingUsers = new Map();
        this.lastTypingSent = 0;
        this.lastIsTyping = false;
        this.myTypingTimeout = null;
        
        // Contenedor para typing indicator
        this.typingContainer = document.createElement('div');
        this.typingContainer.className = 'chat-typing-indicator';
        this.typingContainer.style.display = 'none';
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

    init() {
        this.setupEventListeners();
        
        // El chat está oculto por defecto. Cuando se abre, ResizeObserver lo detecta y hacemos el scroll al fondo.
        this.resizeObserver = new ResizeObserver(() => {
            if (this.isFirstRenderScrollPending && this.chatContainer.clientHeight > 0) {
                this.scrollToBottom();
                this.isFirstRenderScrollPending = false; // Solo la primera vez
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
                
                // Emitir typing cada 2 segundos o si cambia de estado
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

                // Autoclear typing state after 2 seconds of inactivity
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

        // Delegación de eventos para menús de reporte y eliminar
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

        if (this.chatContainer) {
            this.chatContainer.addEventListener('scroll', () => {
                if (this.chatContainer.scrollTop === 0 && !this.isLoading && this.hasMore) {
                    this.loadHistory();
                }
            });
        }
        
        // Escuchar eventos WebSocket si el módulo Network recibe algo no manejado o interceptar via un custom event
        document.addEventListener('canvas:chat_message', (e) => {
            const data = e.detail;
            this.appendMessage(data, true); // true = scroll to bottom
        });

        document.addEventListener('canvas:chat_typing', (e) => {
            this.handleTypingEvent(e.detail);
        });

        document.addEventListener('canvas:chat_message_deleted', (e) => {
            this.removeMessageElement(e.detail.id);
        });

        // Evento global para los menús de chat
        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-action="toggleChatDropdown"]');
            if (toggleBtn) {
                e.preventDefault();
                const targetId = toggleBtn.getAttribute('data-target');
                const dropdown = document.querySelector(`[data-module="${targetId}"]`);
                
                if (dropdown) {
                    // Cierra otros primero
                    document.querySelectorAll('.chat-dropdown-module').forEach(el => {
                        if (el !== dropdown) {
                            el.classList.add('disabled');
                            el.classList.remove('active');
                        }
                    });
                    
                    if (dropdown.classList.contains('disabled')) {
                        dropdown.classList.remove('disabled');
                        dropdown.classList.add('active');
                        
                        // Asegurar que el menú interno esté activo
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
    }

    async loadHistory() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;

        if (this.offset === 0 && this.loader) {
            this.loader.style.display = 'flex';
        }

        try {
            const response = await this.api.post(ApiRoutes.Chat.History, {
                canvas_id: this.canvasId,
                offset: this.offset
            });
            
            if (this.offset === 0 && this.loader) {
                this.loader.style.display = 'none';
                this.chatContainer.innerHTML = '';
            }

            if (response.success || response.status === 'success') {
                const msgs = response.data.messages;
                this.hasMore = response.data.has_more;
                this.offset += msgs.length;

                // Guardar la altura antes de agregar
                const previousHeight = this.chatContainer.scrollHeight;

                // Insertar al inicio porque cargamos historia hacia atrás
                const isFirstLoad = this.offset === msgs.length;
                
                msgs.forEach(msg => {
                    this.prependMessage(msg);
                });

                if (isFirstLoad) {
                    if (this.chatContainer.clientHeight > 0) {
                        this.scrollToBottom();
                        this.isFirstRenderScrollPending = false;
                    } else {
                        // Está oculto, se encargará el ResizeObserver
                        this.isFirstRenderScrollPending = true;
                    }
                } else {
                    // Mantener el scroll
                    const newHeight = this.chatContainer.scrollHeight;
                    this.chatContainer.scrollTop = newHeight - previousHeight;
                }
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            console.error("Error al cargar historial de chat:", error);
            if (this.offset === 0 && this.loader) {
                this.loader.innerHTML = 'Error al cargar mensajes.';
            }
        } finally {
            this.isLoading = false;
        }
    }

    async sendMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.chatInput.value = '';
        this.chatInput.disabled = true;
        this.btnSend.disabled = true;
        this.btnSend.classList.remove('active');

        try {
            const response = await this.api.post(ApiRoutes.Chat.Send, {
                canvas_id: this.canvasId,
                message: text
            });

            if (response.success === false || response.status === 'error') {
                showMessage(response.message, 'error');
                this.chatInput.value = text; // restaurar
            }
        } catch (error) {
            console.error("Error enviando mensaje:", error);
            showMessage('Error al enviar el mensaje', 'error');
            this.chatInput.value = text;
        } finally {
            this.chatInput.disabled = false;
            this.btnSend.disabled = false;
            this.chatInput.focus();
            
            // Apagar typing
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
        if (!confirm('¿Seguro que deseas eliminar este mensaje?')) return;
        
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
            console.error("Error deleting message:", error);
            showMessage('Error al eliminar mensaje', 'error');
        }
    }

    async reportMessage(id) {
        const reason = prompt('Selecciona una opción de reporte:\\n1. Spam o publicidad\\n2. Lenguaje ofensivo\\n3. Acoso o incitación al odio\\n4. Otro');
        if (!reason) return;
        
        let reasonText = reason;
        if (reason === '1') reasonText = 'Spam o publicidad';
        if (reason === '2') reasonText = 'Lenguaje ofensivo';
        if (reason === '3') reasonText = 'Acoso o incitación al odio';
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
            console.error("Error reporting message:", error);
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
        // Limpiar expirados (3 segundos sin recibir updates)
        const now = Date.now();
        for (const [uid, info] of this.typingUsers.entries()) {
            if (now - info.timestamp > 3500) {
                this.typingUsers.delete(uid);
            }
        }

        const count = this.typingUsers.size;
        if (count === 0) {
            this.typingContainer.style.display = 'none';
            this.typingContainer.innerHTML = '';
        } else if (count === 1) {
            const username = Array.from(this.typingUsers.values())[0].username;
            this.typingContainer.innerHTML = `<strong>${username}</strong> está escribiendo...`;
            this.typingContainer.style.display = 'block';
        } else {
            this.typingContainer.innerHTML = `${count} usuarios están escribiendo...`;
            this.typingContainer.style.display = 'block';
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

        const menuBtn = `<div class="component-dropdown-wrapper component-dropdown-wrapper--fit" style="margin-left: auto;">
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
                <div class="chat-message-text">${msg.message}</div>
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
