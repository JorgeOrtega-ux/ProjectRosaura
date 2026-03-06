// public/assets/js/modules/studio/StudioController.js

class StudioWebSocketManager {
    constructor() {
        this.ws = null;
        this.isConnecting = false;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const portOrPath = window.location.protocol === 'https:' ? '/studio-ws/' : ':8765';
        this.wsUrl = `${protocol}//${host}${portOrPath}`;
        
        window.addEventListener('viewLoaded', this.handleRouteUpdate.bind(this));
    }

    getAuthToken() {
        return 'mi_token_super_secreto_y_seguro_2026'; 
    }

    // Generador para simular el "request id" estilo Canva/Sentry
    generateRequestId() {
        return Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.isConnecting = true;
        
        console.log(`websocket_client: ${Date.now()} connecting...`);
        
        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                this.isConnecting = false;
                console.log('websocket_client: connected');
                
                const requestId = this.generateRequestId();
                console.log(`websocket_client: request id ${requestId}`);
                
                const authPayload = {
                    type: "auth",
                    token: this.getAuthToken(),
                    requestId: requestId 
                };
                
                this.ws.send(JSON.stringify(authPayload));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.status === "error") {
                        if (data.code === "AUTH_FAILED" || data.code === "AUTH_TIMEOUT") {
                            this.disconnect();
                        }
                    } else if (data.status === "success" && data.message === "Autenticación exitosa") {
                        console.log('websocket_client: status CONNECTED');
                    }

                } catch (error) {
                    // Silenciado para mantener la consola limpia
                }
            };

            this.ws.onclose = () => {
                this.isConnecting = false;
                this.ws = null;
                console.log('websocket_client: disconnected');
            };

            this.ws.onerror = () => {
                this.isConnecting = false;
            };
        } catch (error) {
            // Silenciado
        }
    }

    sendAction(actionName, payloadData = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                action: actionName,
                data: payloadData
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, "Navegación fuera de Studio");
            this.ws = null;
        }
    }

    handleRouteUpdate(event) {
        const { cleanUrl } = event.detail;
        
        if (!cleanUrl.includes('/studio')) {
            this.disconnect();
        } else {
            this.connect();
        }
    }
}

export class StudioController {
    constructor() {
        if (window.AppStudioWSManager) {
            this.manager = window.AppStudioWSManager;
        } else {
            this.manager = new StudioWebSocketManager();
            window.AppStudioWSManager = this.manager;
        }
        
        this.init();
    }

    init() {
        this.manager.connect();
        this.attachEvents();
    }

    attachEvents() {
        // Delegación de eventos para capturar los clics en los botones de acción
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            const action = btn.getAttribute('data-action');
            
            if (action === 'toggleEditState') {
                this.toggleEditState(btn.getAttribute('data-target'));
            } else if (action === 'saveTitle') {
                this.saveTitle();
            }
        });
    }

    toggleEditState(target) {
        const viewBox = document.querySelector(`[data-state="${target}-view"]`);
        const editBox = document.querySelector(`[data-state="${target}-edit"]`);
        
        if (!viewBox || !editBox) return;

        if (viewBox.classList.contains('active')) {
            // Pasar a modo edición
            viewBox.classList.remove('active');
            viewBox.classList.add('disabled');
            viewBox.style.display = 'none';

            editBox.classList.remove('disabled');
            editBox.classList.add('active');
            editBox.style.display = ''; 
            
            // Foco en el input
            const input = editBox.querySelector(`[data-ref="input-${target}"]`);
            if (input) {
                input.focus();
                // Opcional: poner el cursor al final del texto
                input.selectionStart = input.selectionEnd = input.value.length; 
            }
        } else {
            // Pasar a modo vista (Cancelar)
            editBox.classList.remove('active');
            editBox.classList.add('disabled');
            editBox.style.display = 'none';

            viewBox.classList.remove('disabled');
            viewBox.classList.add('active');
            viewBox.style.display = '';

            // Restaurar el valor original si el usuario presiona "Cancelar"
            const input = editBox.querySelector(`[data-ref="input-${target}"]`);
            if (input) {
                input.value = input.getAttribute('data-original-value');
            }
        }
    }

    saveTitle() {
        const input = document.querySelector('[data-ref="input-title"]');
        const display = document.querySelector('[data-ref="display-title"]');
        
        if (!input || !display) return;
        
        const newTitle = input.value.trim();
        if (newTitle !== "") {
            // Actualizar la vista
            display.textContent = newTitle;
            
            // Sellar el nuevo valor como el valor original en caso de futuras cancelaciones
            input.setAttribute('data-original-value', newTitle);
            
            // (Opcional) Enviar la actualización por WebSockets al backend
            // this.manager.sendAction('updateVideoInfo', { title: newTitle });
            
            // Cerrar el modo edición
            this.toggleEditState('title');
        }
    }
}