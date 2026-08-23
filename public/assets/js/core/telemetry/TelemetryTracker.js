import { ApiService } from '../api/ApiService.js';
import { ApiRoutes } from '../api/ApiRoutes.js';

class TelemetryTracker {
    constructor(options = {}) {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        
        this.allowTelemetry = options.allowTelemetry !== undefined ? options.allowTelemetry : true;
        this.batch = [];
        this.batchSizeLimit = 3;
        this.flushIntervalMs = 3000;
        this.intervalId = null;
        this.sessionUUID = null;
        
        this.handleVisibilityChangeBound = this.handleVisibilityChange.bind(this);
        this.flushBound = this.flush.bind(this);
    }

    init() {
        this.abortController = new AbortController();

        let savedUUID = sessionStorage.getItem('telemetry_session_uuid');
        if (!savedUUID) {
            savedUUID = this.generateSessionUUID();
            sessionStorage.setItem('telemetry_session_uuid', savedUUID);
        }
        this.sessionUUID = savedUUID;
        
        if (!this.allowTelemetry) return;

        this.bindEvents();
        this.intervalId = setInterval(this.flushBound, this.flushIntervalMs);
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.intervalId) clearInterval(this.intervalId);
        
        document.removeEventListener('visibilitychange', this.handleVisibilityChangeBound);
    }

    bindEvents() {
        document.addEventListener('visibilitychange', this.handleVisibilityChangeBound);
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            this.flush(true);
        }
    }

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

    trackEvent(category, data) {
        if (!this.allowTelemetry) return;
        
        this.pushToBatch({
            type: category,
            data: data
        });
    }

    pushToBatch(payload) {
        this.batch.push(payload);
        if (this.batch.length >= this.batchSizeLimit) {
            this.flush();
        }
    }

    async flush(isUnloading = false) {
        if (this.batch.length === 0 || !this.allowTelemetry) return;

        const payload = { 
            events: [...this.batch] 
        };
        
        this.batch = [];

        if (isUnloading) {
            this.api.postKeepalive(ApiRoutes.Telemetry.Collect, payload).catch(() => {});
        } else {
            this.api.post(ApiRoutes.Telemetry.Collect, payload, this.abortController.signal).catch(() => {});
        }
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

export { TelemetryTracker };