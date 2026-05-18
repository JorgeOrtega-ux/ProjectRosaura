export default class TelemetryTracker {
   constructor(config = {}) {
        // CORRECCIÓN: Apuntamos al núcleo del API, no a una URL fantasma.
        this.endpoint = '/api/index.php'; 
        
        this.allowTelemetry = config.allowTelemetry !== false;
        this.batch = [];
        this.batchSizeLimit = 3; 
        this.flushIntervalMs = 3000; 
        
        this.sessionUUID = this.generateSessionUUID();
        
        console.log("📡 [TelemetryTracker] Inicializado. Permitido:", this.allowTelemetry);
        
        if (this.allowTelemetry) {
            this.init();
        }
    }

    init() {
        this.intervalId = setInterval(() => this.flush(), this.flushIntervalMs);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                console.log("📡 [TelemetryTracker] Documento oculto, forzando flush...");
                this.flush(true);
            }
        });

        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('[data-telemetry-click]');
            if (target) {
                const action = target.getAttribute('data-telemetry-click');
                const metadata = target.getAttribute('data-telemetry-meta') || null;
                
                console.log(`🖱️ [TelemetryTracker] Clic detectado: ${action}`);
                
                this.trackEvent('interaction', {
                    action_type: action,
                    metadata: metadata ? JSON.parse(metadata) : null,
                    path: window.location.pathname
                });
            }
        });
    }

    trackPageview(path, loadTimeMs = 0) {
        if (!this.allowTelemetry) return;
        console.log(`👁️ [TelemetryTracker] Pageview registrado: ${path}`);
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

    trackEvent(category, data) {
        if (!this.allowTelemetry) return;
        this.pushToBatch({
            type: category === 'canvas' ? 'canvas_interaction' : 'interaction',
            data: data
        });
    }

    pushToBatch(payload) {
        this.batch.push(payload);
        console.log(`📦 [TelemetryTracker] Evento añadido al lote. Tamaño actual: ${this.batch.length}/${this.batchSizeLimit}`);
        if (this.batch.length >= this.batchSizeLimit) {
            this.flush();
        }
    }

flush(isUnloading = false) {
        if (this.batch.length === 0 || !this.allowTelemetry) return;

        const payload = JSON.stringify({ 
            route: 'telemetry.collect',
            events: this.batch 
        });
        
        console.log("🚀 [TelemetryTracker] Enviando lote al servidor:", JSON.parse(payload));

        // Extraer el token CSRF para pasar el filtro de seguridad de api/index.php
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        // Usamos Fetch (con keepalive) en lugar de sendBeacon para asegurar 
        // que podamos enviar el Header de CSRF sin problemas.
        fetch(this.endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: payload,
            keepalive: isUnloading
        }).then(response => {
            console.log(`✅ [TelemetryTracker] API respondió con estado: ${response.status}`);
        }).catch(err => {
            console.error(`❌ [TelemetryTracker] Error de red:`, err);
        });

        this.batch = [];
    }

    generateSessionUUID() {
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