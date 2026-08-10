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
        this.ticket = ticket;
        this.isIntentionalDisconnect = false;
        
        let url = `${WsConfig.getBaseUrl()}/canvas/${this.canvasId}`;
        
        if (ticket) {
            url += `?ticket=${encodeURIComponent(ticket)}`;
        }

        this.ws = new WebSocket(url);
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
            
            this.reconnectAttempts = 0; 
            this.trigger('open'); 
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                const view = new DataView(event.data);
                if (view.byteLength < 1) return;
                const opCode = view.getUint8(0);
                
                if (opCode === 1 || opCode === 2) {
                    if (view.byteLength < 9) return;
                    const x = view.getUint16(1, false);
                    const y = view.getUint16(3, false);
                    const r = view.getUint8(5);
                    const g = view.getUint8(6);
                    const b = view.getUint8(7);
                    const a = view.getUint8(8);
                    
                    const color = (opCode === 2 || a === 0) ? 'transparent' : `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    this.trigger('message', {
                        type: opCode === 2 ? 'erase_pixel' : 'pixel',
                        x: x,
                        y: y,
                        color: color
                    });
                } else if (opCode === 3 || opCode === 4) {
                    if (view.byteLength < 7) return;
                    const count = view.getUint16(1, false);
                    const r = view.getUint8(3);
                    const g = view.getUint8(4);
                    const b = view.getUint8(5);
                    const a = view.getUint8(6);
                    
                    if (view.byteLength < 7 + count * 4) return;
                    const color = (opCode === 4 || a === 0) ? 'transparent' : `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    
                    const pixels = [];
                    let offset = 7;
                    for (let idx = 0; idx < count; idx++) {
                        const px = view.getUint16(offset, false);
                        const py = view.getUint16(offset + 2, false);
                        pixels.push({ x: px, y: py });
                        offset += 4;
                    }
                    this.trigger('message', {
                        type: opCode === 4 ? 'batch_erase_pixels' : 'batch_pixels',
                        pixels: pixels,
                        color: color
                    });
                }
            } else {
                try {
                    const data = JSON.parse(event.data);
                    this.trigger('message', data);
                } catch (e) {
                    
                }
            }
        };

        this.ws.onclose = (event) => {
            this.stopHeartbeat();

            if (event.code === 4001) {
                this.isIntentionalDisconnect = true;
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
            const baseDelayCalc = this.baseDelay * Math.pow(2, this.reconnectAttempts);
            const jitter = Math.floor(Math.random() * 2000); // 0 to 2 seconds of random jitter
            const delay = baseDelayCalc + jitter;

            this.reconnectTimeoutId = setTimeout(() => {  // Fix: store ID so disconnect() can cancel it
                this.reconnectAttempts++;
                this.connect(this.canvasId, this.ticket);
            }, delay);
        }
    }

    send(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
                this.ws.send(payload);
            } else {
                this.ws.send(JSON.stringify(payload));
            }
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
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
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