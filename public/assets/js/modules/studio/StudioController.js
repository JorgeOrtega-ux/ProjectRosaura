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
        
        // LOG 1: Intento de conexión con timestamp
        console.log(`websocket_client: ${Date.now()} connecting...`);
        
        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                this.isConnecting = false;
                
                // LOG 2: Conexión física establecida
                console.log('websocket_client: connected');
                
                const requestId = this.generateRequestId();
                
                // LOG 3: ID de la petición generada
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
                        // LOG 4: Autenticación confirmada por el servidor
                        console.log('websocket_client: status CONNECTED');
                    }

                } catch (error) {
                    // Silenciado para mantener la consola limpia
                }
            };

            this.ws.onclose = () => {
                this.isConnecting = false;
                this.ws = null;
                
                // LOG 5: Desconexión (ya sea manual o por error de red)
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
    }
}