import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

export class DesignChat {
    constructor(controller) {
        this.controller = controller;
        this.api = new ApiService();
        this.canvasId = controller.canvasId;
        
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

        if (this.isChatEnabled && this.chatContainer) {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();
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
            const response = await this.api.get(`/api/v1/chat/history?canvas_id=${this.canvasId}&offset=${this.offset}`);
            
            if (this.offset === 0 && this.loader) {
                this.loader.style.display = 'none';
                this.chatContainer.innerHTML = '';
            }

            if (response.status === 'success') {
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
                    this.scrollToBottom();
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
            const response = await this.api.post('/api/v1/chat/send', {
                canvas_id: this.canvasId,
                message: text
            });

            if (response.status !== 'success') {
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
        el.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; font-size: 13px;';
        
        const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const avatarStr = msg.avatar 
            ? `<img src="${window.AppBasePath || ''}/storage/avatars/${msg.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
            : `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--border-color); display: flex; align-items: center; justify-content: center;"><span class="material-symbols-rounded" style="font-size: 18px;">person</span></div>`;

        el.innerHTML = `
            ${avatarStr}
            <div style="flex: 1; background: rgba(0,0,0,0.03); padding: 8px 12px; border-radius: 8px; border-top-left-radius: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <strong style="color: var(--primary-color);">${msg.username}</strong>
                    <span style="font-size: 11px; opacity: 0.6;">${time}</span>
                </div>
                <div style="word-break: break-word; line-height: 1.4;">${msg.message}</div>
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
