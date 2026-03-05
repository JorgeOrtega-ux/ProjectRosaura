// public/assets/js/modules/studio/StudioController.js

class StudioWebSocketManager {
    constructor() {
        this.ws = null;
        // Detecta automáticamente el host actual (localhost o la IP de red local)
        const host = window.location.hostname;
        this.wsUrl = `ws://${host}:8765`; 
        this.isConnecting = false;
        
        // Escuchamos los cambios de vista lanzados por el SpaRouter
        window.addEventListener('viewLoaded', this.handleRouteUpdate.bind(this));
    }

    connect() {
        // Prevenir intentos múltiples de conexión si navegamos entre submódulos de /studio
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.isConnecting = true;
        console.log(`[Studio WS] Iniciando conexión WebSocket con el servidor en ${this.wsUrl}...`);
        
        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                this.isConnecting = false;
                console.log('[Studio WS] Conectado exitosamente.');
            };

            this.ws.onmessage = (event) => {
                console.log('[Studio WS] Mensaje recibido del servidor:', event.data);
            };

            this.ws.onclose = () => {
                this.isConnecting = false;
                this.ws = null;
                console.log('[Studio WS] Conexión cerrada.');
            };

            this.ws.onerror = (error) => {
                this.isConnecting = false;
                console.error('[Studio WS] Error en la conexión:', error);
            };
        } catch (error) {
            console.error('[Studio WS] No se pudo inicializar WebSocket:', error);
        }
    }

    disconnect() {
        if (this.ws) {
            console.log('[Studio WS] Saliendo de la sección Studio. Desconectando WebSocket...');
            this.ws.close();
            this.ws = null;
        }
    }

    handleRouteUpdate(event) {
        const { cleanUrl } = event.detail;
        
        // Validamos si la nueva ruta pertenece al ecosistema del Studio
        if (!cleanUrl.includes('/studio')) {
            this.disconnect();
        }
    }
}

export class StudioController {
    constructor() {
        // Implementación de patrón Singleton para mantener un solo administrador de conexión vivo
        if (window.AppStudioWSManager) {
            this.manager = window.AppStudioWSManager;
        } else {
            this.manager = new StudioWebSocketManager();
            window.AppStudioWSManager = this.manager;
        }
        
        this.init();
    }

    init() {
        // Al instanciar este controlador (porque entramos a una vista /studio/*), aseguramos la conexión
        this.manager.connect();
    }
}