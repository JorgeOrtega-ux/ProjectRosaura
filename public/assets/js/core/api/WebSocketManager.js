// public/assets/js/core/api/WebSocketManager.js

import { WsConfig } from './ApiRoutes.js';

export class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.baseDelay = 1000; // 1 segundo inicial
        this.canvasId = null;
        this.callbacks = {};
        this.isIntentionalDisconnect = false;
    }

    connect(canvasId) {
        this.canvasId = canvasId;
        this.isIntentionalDisconnect = false;
        
        const url = `${WsConfig.getBaseUrl()}/canvas/${this.canvasId}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.info(`[WS] Conectado a la sala del lienzo: ${this.canvasId}`);
            this.reconnectAttempts = 0; 
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Retransmitimos ciegamente al DesignController u otros subscriptores
                this.trigger('message', data);
            } catch (e) {
                console.error('[WS] Error parseando mensaje entrante', e);
            }
        };

        this.ws.onclose = (event) => {
            if (!this.isIntentionalDisconnect) {
                this.handleReconnect();
            } else {
                console.info('[WS] Desconectado limpiamente');
            }
        };

        this.ws.onerror = (error) => {
            console.error('[WS] Error en la conexión', error);
        };
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            // Exponential Backoff: 1s, 2s, 4s, 8s, 16s...
            const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
            console.warn(`[WS] Reintentando conexión en ${delay}ms...`);
            
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect(this.canvasId);
            }, delay);
        } else {
            console.error('[WS] Máximos intentos de reconexión alcanzados.');
        }
    }

    send(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        } else {
            console.warn('[WS] Intento de envío ignorado: No hay conexión abierta.');
        }
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    disconnect() {
        this.isIntentionalDisconnect = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}