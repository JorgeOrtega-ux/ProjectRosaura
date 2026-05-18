// public/assets/js/core/telemetry/TelemetryTracker.js

export default class TelemetryTracker {
    constructor(config = {}) {
        this.endpoint = '/api/telemetry/collect';
        this.allowTelemetry = config.allowTelemetry !== false;
        this.batch = [];
        this.batchSizeLimit = 20; // Enviar cuando se acumulen 20 eventos
        this.flushIntervalMs = 15000; // O enviar cada 15 segundos
        
        this.sessionUUID = this.generateSessionUUID();
        
        if (this.allowTelemetry) {
            this.init();
        }
    }

    init() {
        // 1. Iniciar el envío periódico (Batching)
        this.intervalId = setInterval(() => this.flush(), this.flushIntervalMs);

        // 2. Escuchar la salida de la página para enviar el último lote
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush(true);
            }
        });

        // 3. Delegación de eventos global para clics (Aislado con data-attributes)
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('[data-telemetry-click]');
            if (target) {
                const action = target.getAttribute('data-telemetry-click');
                const metadata = target.getAttribute('data-telemetry-meta') || null;
                
                this.trackEvent('interaction', {
                    action_type: action,
                    metadata: metadata ? JSON.parse(metadata) : null,
                    path: window.location.pathname
                });
            }
        });
    }

    /**
     * Registra una vista de página. Deberá ser llamado desde SpaRouter.js en viewLoaded
     */
    trackPageview(path, loadTimeMs = 0) {
        if (!this.allowTelemetry) return;

        this.pushToBatch({
            type: 'pageview',
            data: {
                path: path,
                load_time_ms: loadTimeMs,
                session_id: this.sessionUUID,
                device_type: this.getDeviceType(),
                theme_preference: this.getThemePreference(),
                locale: navigator.language || navigator.userLanguage
            }
        });
    }

    /**
     * Registra eventos específicos del lienzo u otras interacciones
     */
    trackEvent(category, data) {
        if (!this.allowTelemetry) return;

        this.pushToBatch({
            type: category === 'canvas' ? 'canvas_interaction' : 'interaction',
            data: data
        });
    }

    pushToBatch(payload) {
        this.batch.push(payload);
        if (this.batch.length >= this.batchSizeLimit) {
            this.flush();
        }
    }

    flush(isUnloading = false) {
        if (this.batch.length === 0 || !this.allowTelemetry) return;

        const payload = JSON.stringify({ events: this.batch });

        // Si la página se está cerrando, usar sendBeacon para garantizar la entrega
        if (isUnloading && navigator.sendBeacon) {
            navigator.sendBeacon(this.endpoint, payload);
        } else {
            // Envío asíncrono normal en segundo plano
            fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: isUnloading // Fallback si sendBeacon falla al salir
            }).catch(() => {
                // Falla silenciosa, la telemetría no debe romper la experiencia
            });
        }

        // Limpiar el lote
        this.batch = [];
    }

    // --- Utilidades ---
    generateSessionUUID() {
        // UUID v4 simple para identificar sesiones temporales en el frontend
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
        return 'desktop';
    }

    getThemePreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
    }
}