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
        }

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
        }
    }

    createMessageElement(msg) {
        const el = document.createElement('div');
        el.className = 'chat-message';
        
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

        el.innerHTML = `
            ${avatarStr}
            <div class="chat-message-bubble">
                <div class="chat-message-header">
                    <strong class="chat-message-username">${msg.username}</strong>
                    <span class="chat-message-time">${time}</span>
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
