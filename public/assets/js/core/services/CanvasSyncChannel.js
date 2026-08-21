/**
 * CanvasSyncChannel — Servicio de comunicación entre pestañas locales mediante BroadcastChannel.
 * Permite sincronizar en caliente eventos de redimensión, reseteo, ajustes y estado entre pestañas
 * del navegador sin requerir WebSocket ni recargas de página (F5).
 */
export class CanvasSyncChannel {
    static CHANNEL_NAME = 'rosaura_canvas_events';
    static _channel = null;
    static _listeners = new Set();

    static getChannel() {
        if (!this._channel && typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
            try {
                this._channel = new BroadcastChannel(this.CHANNEL_NAME);
                this._channel.onmessage = (event) => {
                    const data = event?.data;
                    if (!data) return;
                    this._listeners.forEach(callback => {
                        try {
                            callback(data);
                        } catch (e) {
                            console.error('[CanvasSyncChannel] Listener callback error:', e);
                        }
                    });
                    window.dispatchEvent(new CustomEvent('canvas:sync_event', { detail: data }));
                };
            } catch (e) {
                console.warn('[CanvasSyncChannel] BroadcastChannel initialization error:', e);
            }
        }
        return this._channel;
    }

    /**
     * Emite un evento a todas las pestañas y ventanas abiertas en el mismo navegador.
     * @param {Object} payload - Objeto con datos del evento (type, canvasId, canvasUuid, etc.)
     */
    static broadcast(payload) {
        if (!payload) return;
        const channel = this.getChannel();
        if (channel) {
            try {
                channel.postMessage(payload);
            } catch (e) {
                console.warn('[CanvasSyncChannel] PostMessage error:', e);
            }
        }
        // También emite localmente en la misma pestaña
        window.dispatchEvent(new CustomEvent('canvas:sync_event', { detail: payload }));
    }

    /**
     * Se suscribe a los eventos del canal.
     * @param {Function} callback - Función que recibe el payload del evento.
     * @returns {Function} Función para cancelar la suscripción.
     */
    static subscribe(callback) {
        if (typeof callback !== 'function') return () => {};
        this.getChannel();
        this._listeners.add(callback);
        return () => {
            this._listeners.delete(callback);
        };
    }
}
