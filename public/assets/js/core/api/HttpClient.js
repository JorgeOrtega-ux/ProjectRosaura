/**
 * HttpClient — Capa de transporte HTTP pura.
 * Maneja CSRF, AbortError, streaming y retry logic.
 * Los métodos de dominio viven en servicios separados (CanvasApiService, etc.)
 */
export class HttpClient {
    static isRefreshingCsrf = false;
    static csrfRefreshSubscribers = [];
    static _csrfCache = null;

    // ─── CSRF ──────────────────────────────────────────────────────────────────

    static onCsrfRefreshed(token) {
        HttpClient._csrfCache = token;
        HttpClient.csrfRefreshSubscribers.forEach(cb => cb(token));
        HttpClient.csrfRefreshSubscribers = [];
    }

    static addCsrfSubscriber(callback) {
        HttpClient.csrfRefreshSubscribers.push(callback);
    }

    static async refreshCsrfTokenProactively() {
        try {
            const baseUrl = (window.AppBasePath || '') + '/api/index.php?route=csrf.refresh';
            const response = await fetch(baseUrl, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.success && data.csrf_token) {
                    const meta = document.querySelector('meta[name="csrf-token"]');
                    if (meta) meta.setAttribute('content', data.csrf_token);
                    HttpClient.onCsrfRefreshed(data.csrf_token);
                    return data.csrf_token;
                }
            }
        } catch (e) { /* silence proactive errors */ }
        return null;
    }

    constructor() {
        this.baseUrl = (window.AppBasePath || '') + '/api/index.php';
    }

    _getCsrfToken() {
        if (!HttpClient._csrfCache) {
            const meta = document.querySelector('meta[name="csrf-token"]');
            HttpClient._csrfCache = meta ? meta.getAttribute('content') : '';
        }
        return HttpClient._csrfCache;
    }

    // ─── CSRF Retry ────────────────────────────────────────────────────────────

    async _handleCsrfRetry(originalFetchOptions, serverCsrfToken = null, url = null) {
        if (serverCsrfToken) {
            const meta = document.querySelector('meta[name="csrf-token"]');
            if (meta) meta.setAttribute('content', serverCsrfToken);
            originalFetchOptions.headers['X-CSRF-Token'] = serverCsrfToken;
            HttpClient.isRefreshingCsrf = false;
            HttpClient.onCsrfRefreshed(serverCsrfToken);
            try { return await fetch(url || this.baseUrl, originalFetchOptions); } catch (e) { return null; }
        }

        return new Promise((resolve) => {
            HttpClient.addCsrfSubscriber(async (newToken) => {
                if (newToken) {
                    originalFetchOptions.headers['X-CSRF-Token'] = newToken;
                    try { resolve(await fetch(url || this.baseUrl, originalFetchOptions)); } catch (e) { resolve(null); }
                } else {
                    resolve(null);
                }
            });

            if (!HttpClient.isRefreshingCsrf) {
                HttpClient.isRefreshingCsrf = true;
                fetch(window.location.href, { cache: 'no-store', credentials: 'same-origin', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
                    .then(res => res.text())
                    .then(text => {
                        const match = text.match(/<meta name="csrf-token" content="([^"]+)">/);
                        const newToken = (match && match[1]) ? match[1] : null;
                        if (newToken) {
                            const meta = document.querySelector('meta[name="csrf-token"]');
                            if (meta) meta.setAttribute('content', newToken);
                        }
                        HttpClient.isRefreshingCsrf = false;
                        HttpClient.onCsrfRefreshed(newToken);
                    })
                    .catch(() => { HttpClient.isRefreshingCsrf = false; HttpClient.onCsrfRefreshed(null); });
            }
        });
    }

    // ─── Response helpers ──────────────────────────────────────────────────────

    _processResponse(result) {
        if (result && !result.message && result.message_key) {
            let translated = result.message_key;
            if (typeof window.__ === 'function') translated = window.__(result.message_key);
            if (translated === result.message_key && result.message_key.includes('.')) {
                translated = result.message_key.split('.').pop();
            }
            result.message = translated;

            const securityKeys = [
                'error.unauthorized', 'admin.insufficient_privileges', 'admin.hierarchical_restriction',
                'admin.insufficient_privileges_to_grant_critical', 'admin.role_weight_too_low_for_critical',
                'admin.cannot_edit_superadmin_permissions', 'admin.cannot_delete_base_role', 'admin.cannot_edit_base_role'
            ];
            if (securityKeys.includes(result.message_key) && translated === result.message_key.split('.').pop()) {
                result.message = window.__('err_security_violation');
            }
        }
        return result;
    }

    async _parseJsonResponse(response) {
        let text = '';
        try { text = await response.text(); } catch (e) { throw new Error(`Failed to read response body: ${e.message}`); }
        if (!text || !text.trim()) return {};
        try { return JSON.parse(text); } catch (error) {
            const firstBrace = text.indexOf('{');
            const firstBracket = text.indexOf('[');
            let jsonStart = -1;
            if (firstBrace !== -1 && firstBracket !== -1) jsonStart = Math.min(firstBrace, firstBracket);
            else if (firstBrace !== -1) jsonStart = firstBrace;
            else if (firstBracket !== -1) jsonStart = firstBracket;

            if (jsonStart > 0) {
                try { return JSON.parse(text.substring(jsonStart)); } catch (e2) { /* fallthrough */ }
            }
            console.error("Non-JSON response from server! Status:", response.status, "Content:", text);
            const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
            throw new SyntaxError(`Unexpected non-JSON response from server (HTTP ${response.status}): ${cleanSnippet}`);
        }
    }

    async _handleHttpErrors(response, routeName = '') {
        if (response.status === 503) {
            window.dispatchEvent(new CustomEvent('systemMaintenanceTriggered'));
            return { success: false, aborted: true };
        }
        if (response.status === 401) {
            window.location.href = (window.AppBasePath || '') + '/login?reason=session_revoked';
            return { success: false, message: window.__('session_revoked') };
        }
        try {
            const result = await this._parseJsonResponse(response);
            if (result && (result.message || result.message_key || result.success !== undefined)) {
                return this._processResponse(result);
            }
        } catch (parseErr) {}
        return null;
    }

    async _executeFetch(fetchOptions, route = '', url = null) {
        try {
            const response = await fetch(url || this.baseUrl, fetchOptions);
            if (!response.ok) {
                const handledError = await this._handleHttpErrors(response, route);
                if (handledError) return handledError;

                if (response.status === 403 || response.status === 429) {
                    const result = await this._parseJsonResponse(response);
                    if (response.status === 403 && result.message_key === 'error.invalid_csrf_token') {
                        const retryResponse = await this._handleCsrfRetry(fetchOptions, result.csrf_token, url);
                        if (retryResponse && retryResponse.ok) {
                            return this._processResponse(await this._parseJsonResponse(retryResponse));
                        }
                    }
                    const processedResult = this._processResponse(result);
                    if (response.status === 403) {
                        window.dispatchEvent(new CustomEvent('securityViolationTriggered', { detail: processedResult }));
                    }
                    return processedResult;
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (error.name === 'AbortError') return { success: false, aborted: true };
            return { success: false, message: window.__('api_connection_error') + " (" + error.message + ")" };
        }
    }

    // ─── Public HTTP methods ───────────────────────────────────────────────────

    async post(route, data = {}, signal = null) {
        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this._getCsrfToken() },
            body: JSON.stringify({ route, ...data })
        };
        if (signal) fetchOptions.signal = signal;
        const res = await this._executeFetch(fetchOptions, route);
        if (res && res.ok) return this._processResponse(await this._parseJsonResponse(res));
        return res;
    }

    async postKeepalive(route, data = {}) {
        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this._getCsrfToken() },
            body: JSON.stringify({ route, ...data }),
            keepalive: true
        };
        const res = await this._executeFetch(fetchOptions, route);
        if (res && res.ok) return this._processResponse(await this._parseJsonResponse(res));
        return res;
    }

    async postForm(route, formData, signal = null) {
        formData.append('route', route);
        const fetchOptions = {
            method: 'POST',
            headers: { 'X-CSRF-Token': this._getCsrfToken() },
            body: formData
        };
        if (signal) fetchOptions.signal = signal;
        const res = await this._executeFetch(fetchOptions, route);
        if (res && res.ok) return this._processResponse(await this._parseJsonResponse(res));
        return res;
    }

    async postCustom(url, data = {}, signal = null) {
        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this._getCsrfToken() },
            body: JSON.stringify(data)
        };
        if (signal) fetchOptions.signal = signal;
        const res = await this._executeFetch(fetchOptions, '', url);
        if (res && res.ok) return this._processResponse(await this._parseJsonResponse(res));
        return res;
    }

    async fetchBinary(url, data = {}, signal = null) {
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/octet-stream',
                'X-CSRF-Token': this._getCsrfToken()
            },
            body: JSON.stringify(data)
        };
        if (signal) fetchOptions.signal = signal;
        return await fetch(url, fetchOptions);
    }

    async stream(route, data = {}, signal = null) {
        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this._getCsrfToken() },
            body: JSON.stringify({ route, ...data })
        };
        if (signal) fetchOptions.signal = signal;
        try {
            const response = await fetch(this.baseUrl, fetchOptions);
            if (!response.ok) {
                const handledError = await this._handleHttpErrors(response);
                if (handledError) return handledError;
                if (response.status === 403 || response.status === 429) {
                    const result = await this._parseJsonResponse(response);
                    if (response.status === 403 && result.message_key === 'error.invalid_csrf_token') {
                        const retryResponse = await this._handleCsrfRetry(fetchOptions, result.csrf_token);
                        if (retryResponse && retryResponse.ok) {
                            return { success: true, reader: retryResponse.body.getReader(), totalBytes: parseInt(retryResponse.headers.get('Content-Length') || '0', 10) };
                        }
                    }
                    const processedResult = this._processResponse(result);
                    if (response.status === 403) window.dispatchEvent(new CustomEvent('securityViolationTriggered', { detail: processedResult }));
                    return processedResult;
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return { success: true, reader: response.body.getReader(), totalBytes: parseInt(response.headers.get('Content-Length') || '0', 10) };
        } catch (error) {
            if (error.name === 'AbortError') return { success: false, aborted: true };
            return { success: false, message: window.__('api_connection_error') };
        }
    }

    async fetchHtml(url, options = {}) {
        const fetchOptions = {
            method: 'GET',
            ...options,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'text/html',
                'X-CSRF-Token': this._getCsrfToken(),
                ...(options.headers || {})
            }
        };
        if ('returnResponse' in fetchOptions) delete fetchOptions.returnResponse;
        const response = await fetch(url, fetchOptions);
        if (options.returnResponse) return response;
        if (!response.ok) throw new Error(`HTTP Status ${response.status}`);
        return await response.text();
    }

    async downloadText(route, data = {}, signal = null) {
        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this._getCsrfToken() },
            body: JSON.stringify({ route, ...data })
        };
        if (signal) fetchOptions.signal = signal;
        try {
            const response = await fetch(this.baseUrl, fetchOptions);
            if (!response.ok) {
                const handledError = await this._handleHttpErrors(response);
                if (handledError) return handledError;
                try {
                    const errorResult = await this._parseJsonResponse(response);
                    if (response.status === 403 && errorResult.message_key === 'error.invalid_csrf_token') {
                        const retryResponse = await this._handleCsrfRetry(fetchOptions, errorResult.csrf_token);
                        if (retryResponse && retryResponse.ok) return { success: true, data: await retryResponse.text() };
                    }
                    return this._processResponse(errorResult);
                } catch (e) { throw new Error(`Error HTTP: ${response.status}`); }
            }
            return { success: true, data: await response.text() };
        } catch (error) {
            if (error.name === 'AbortError') return { success: false, aborted: true };
            return { success: false, message: window.__('api_connection_error') };
        }
    }

    async downloadFile(route, data = {}, defaultFilename = null, signal = null) {
        if (!defaultFilename) {
            defaultFilename = (window.__ ? window.__('receipt_default_filename', 'Recibo.pdf') : 'Recibo.pdf');
        }
        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this._getCsrfToken() },
            body: JSON.stringify({ route, ...data })
        };
        if (signal) fetchOptions.signal = signal;
        try {
            const response = await fetch(this.baseUrl, fetchOptions);
            if (!response.ok) {
                const handledError = await this._handleHttpErrors(response, route);
                if (handledError) return handledError;
                return { success: false, message: window.__('api_connection_error') };
            }
            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                return this._processResponse(await this._parseJsonResponse(response));
            }
            const blob = await response.blob();
            let filename = defaultFilename;
            const disposition = response.headers.get('Content-Disposition');
            if (disposition && disposition.indexOf('filename=')) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
            }
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl; a.download = filename;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return { success: true };
        } catch (error) {
            if (error.name === 'AbortError') return { success: false, aborted: true };
            return { success: false, message: window.__('api_connection_error') };
        }
    }
}
