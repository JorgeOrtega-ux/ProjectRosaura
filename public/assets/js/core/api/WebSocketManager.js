import { WsConfig } from './ApiRoutes.js';

export class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.baseDelay = 1000; 
        this.canvasId = null;
        this.callbacks = {};
        this.isIntentionalDisconnect = false;

        this.heartbeatIntervalId = null;
        this.visibilityHandler = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    connect(canvasId, ticket = null) {
        this.canvasId = canvasId;
        this.isIntentionalDisconnect = false;
        
        let url = `${WsConfig.getBaseUrl()}/canvas/${this.canvasId}`;
        
        if (ticket) {
            url += `?ticket=${encodeURIComponent(ticket)}`;
        }

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            
            this.reconnectAttempts = 0; 
            this.trigger('open'); 
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            
            try {
                const data = JSON.parse(event.data);
                this.trigger('message', data);
            } catch (e) {
                
            }
        };

        this.ws.onclose = (event) => {
            
            this.stopHeartbeat();

            if (event.code === 4001) {
                this.isIntentionalDisconnect = true;
                console.warn('Evicted (4001). Bloqueando reconexión.');
                this.trigger('qos_evicted', event.reason);
            } 
            else if (!this.isIntentionalDisconnect) {
                this.handleReconnect();
            } else {
                
            }
        };

        this.ws.onerror = (error) => {
            
        };
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);

            setTimeout(() => {
                this.reconnectAttempts++;

                this.connect(this.canvasId);
            }, delay);
        } else {
            
        }
    }

    send(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            
            this.ws.send(JSON.stringify(payload));
        } else {
            
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
        this.stopHeartbeat();
        document.removeEventListener('visibilitychange', this.visibilityHandler);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatIntervalId = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 25000); 
    }

    stopHeartbeat() {
        if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId);
            this.heartbeatIntervalId = null;
        }
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            if (!this.isIntentionalDisconnect && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
                
                this.reconnectAttempts = 0;
                this.handleReconnect();
            }
        }
    }
}