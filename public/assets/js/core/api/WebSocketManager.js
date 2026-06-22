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
        console.log(`[DEBUG WS] Intentando conectar a: ${url}`);
        
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.info(`[DEBUG WS] Conectado a la sala del lienzo: ${this.canvasId}`);
            this.reconnectAttempts = 0; 
            this.trigger('open'); // Notifica al frontend
        };

        this.ws.onmessage = (event) => {
            console.log(`[DEBUG WS] Mensaje crudo recibido del servidor:`, event.data);
            try {
                const data = JSON.parse(event.data);
                this.trigger('message', data);
            } catch (e) {
                console.error('[DEBUG WS] Error parseando mensaje entrante', e);
            }
        };

        this.ws.onclose = (event) => {
            console.warn(`[DEBUG WS] Conexión cerrada. Código: ${event.code}, Razón: ${event.reason}`);
            if (!this.isIntentionalDisconnect) {
                this.handleReconnect();
            } else {
                console.info('[DEBUG WS] Desconectado limpiamente');
            }
        };

        this.ws.onerror = (error) => {
            console.error('[DEBUG WS] Error en la conexión', error);
        };
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
            console.warn(`[DEBUG WS] Reintentando conexión en ${delay}ms...`);
            
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect(this.canvasId);
            }, delay);
        } else {
            console.error('[DEBUG WS] Máximos intentos de reconexión alcanzados.');
        }
    }

    send(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log(`[DEBUG WS] Enviando al servidor:`, payload);
            this.ws.send(JSON.stringify(payload));
        } else {
            console.warn('[DEBUG WS] Intento de envío ignorado: No hay conexión abierta.', payload);
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