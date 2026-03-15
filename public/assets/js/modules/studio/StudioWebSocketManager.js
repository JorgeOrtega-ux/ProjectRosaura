// public/assets/js/modules/studio/StudioWebSocketManager.js
export class StudioWebSocketManager {
    constructor() {
        this.ws = null;
        this.isConnecting = false;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const portOrPath = window.location.protocol === 'https:' ? '/studio-ws/' : ':8765';
        this.wsUrl = `${protocol}//${host}${portOrPath}`;
        
        this.callbacks = {};
        window.addEventListener('viewLoaded', this.handleRouteUpdate.bind(this));
    }

    getAuthToken() { return 'mi_token_super_secreto_y_seguro_2026'; }

    getUserId() {
        if (window.AppRouteTitles) {
            const routes = Object.keys(window.AppRouteTitles);
            const panelRoute = routes.find(r => r.startsWith('/studio/management-panel/'));
            if (panelRoute) return panelRoute.replace('/studio/management-panel/', '');
        }
        const match = window.location.pathname.match(/\/studio\/(?:manage-content|management-panel|edit)\/([a-f0-9\-]{36})/);
        if (match) return match[1];
        return '0';
    }

    generateRequestId() {
        return Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    }

    onMessage(type, callback) { this.callbacks[type] = callback; }

    connect() {
        // [BLINDAJE FRONTEND] Bloquear intento de conexión si no hay permisos
        const hasPermission = window.appInstance ? window.appInstance.canUploadVideos : true;
        if (!hasPermission) {
            console.warn('[WS] Conexión abortada: Usuario sin permisos de Studio.');
            return;
        }

        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
        this.isConnecting = true;
        try {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => {
                this.isConnecting = false;
                const authPayload = { type: "auth", token: this.getAuthToken(), userId: this.getUserId(), requestId: this.generateRequestId() };
                this.ws.send(JSON.stringify(authPayload));
            };
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.status === "error" && (data.code === "AUTH_FAILED" || data.code === "AUTH_TIMEOUT" || data.code === "FORBIDDEN")) {
                        this.disconnect(); return;
                    }
                    if (data.type === 'progress' || data.type === 'completed' || data.type === 'failed') {
                        if (this.callbacks['progressUpdate']) this.callbacks['progressUpdate'](data);
                        window.dispatchEvent(new CustomEvent('studioVideoProgress', { detail: data }));
                    }
                } catch (error) { console.error('[WS] Error parseando mensaje', error); }
            };
            this.ws.onclose = () => { this.isConnecting = false; this.ws = null; };
            this.ws.onerror = () => { this.isConnecting = false; };
        } catch (error) { console.error('[WS] Error iniciando conexión', error); }
    }

    disconnect() {
        if (this.ws) { this.ws.close(1000, "Navegación fuera de Studio o sin permisos"); this.ws = null; }
    }

    handleRouteUpdate(event) {
        const { cleanUrl } = event.detail;
        if (!cleanUrl.includes('/studio')) this.disconnect();
        else this.connect();
    }
}