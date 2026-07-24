import { ApiRoutes } from './ApiRoutes.js';
import { showMessage } from '../utils/uiUtils.js';

export class ApiService {
    static isRefreshingCsrf = false;
    static csrfRefreshSubscribers = [];

    static onCsrfRefreshed(token) {
        ApiService.csrfRefreshSubscribers.forEach(callback => callback(token));
        ApiService.csrfRefreshSubscribers = [];
    }

    static addCsrfSubscriber(callback) {
        ApiService.csrfRefreshSubscribers.push(callback);
    }

    static async refreshCsrfTokenProactively() {
        try {
            const baseUrl = (window.AppBasePath || '') + '/api/index.php?route=csrf.refresh';
            const response = await fetch(baseUrl, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'same-origin',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.success && data.csrf_token) {
                    const meta = document.querySelector('meta[name="csrf-token"]');
                    if (meta) meta.setAttribute('content', data.csrf_token);
                    ApiService.onCsrfRefreshed(data.csrf_token);
                    return data.csrf_token;
                }
            }
        } catch (e) {
            // Silence proactive network errors
        }
        return null;
    }

    constructor() {
        this.baseUrl = (window.AppBasePath || '') + '/api/index.php'; 
    }

    async _handleCsrfRetry(originalFetchOptions, serverCsrfToken = null) {
        if (serverCsrfToken) {
            const meta = document.querySelector('meta[name="csrf-token"]');
            if (meta) meta.setAttribute('content', serverCsrfToken);

            originalFetchOptions.headers['X-CSRF-Token'] = serverCsrfToken;

            ApiService.isRefreshingCsrf = false;
            ApiService.onCsrfRefreshed(serverCsrfToken);

            try {
                return await fetch(this.baseUrl, originalFetchOptions);
            } catch (e) {
                return null;
            }
        }

        return new Promise((resolve) => {
            ApiService.addCsrfSubscriber(async (newToken) => {
                if (newToken) {
                    originalFetchOptions.headers['X-CSRF-Token'] = newToken;
                    try {
                        const retryResponse = await fetch(this.baseUrl, originalFetchOptions);
                        resolve(retryResponse);
                    } catch (e) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });

            if (!ApiService.isRefreshingCsrf) {
                ApiService.isRefreshingCsrf = true;

                fetch(window.location.href, { cache: 'no-store', credentials: 'same-origin', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
                    .then(res => res.text())
                    .then(text => {
                        const match = text.match(/<meta name="csrf-token" content="([^"]+)">/);
                        const newToken = (match && match[1]) ? match[1] : null;

                        if (newToken) {
                            const meta = document.querySelector('meta[name="csrf-token"]');
                            if (meta) meta.setAttribute('content', newToken);
                        }

                        ApiService.isRefreshingCsrf = false;
                        ApiService.onCsrfRefreshed(newToken);
                    })
                    .catch(() => {
                        ApiService.isRefreshingCsrf = false;
                        ApiService.onCsrfRefreshed(null);
                    });
            }
        });
    }

    _processResponse(result) {
        if (result && !result.message && result.message_key) {
            let translated = result.message_key;
            
            if (typeof window.__ === 'function') {
                translated = window.__(result.message_key);
            }

            if (translated === result.message_key && result.message_key.includes('.')) {
                translated = result.message_key.split('.').pop();
            }

            result.message = translated;
            
            const securityKeys = [
                'error.unauthorized',
                'admin.insufficient_privileges',
                'admin.hierarchical_restriction',
                'admin.insufficient_privileges_to_grant_critical',
                'admin.role_weight_too_low_for_critical',
                'admin.cannot_edit_superadmin_permissions',
                'admin.cannot_delete_base_role',
                'admin.cannot_edit_base_role'
            ];

            if (securityKeys.includes(result.message_key) && translated === result.message_key.split('.').pop()) {
                result.message = window.__('err_security_violation');
            }
        }
        return result;
    }

    async _parseJsonResponse(response) {
        let text = '';
        try {
            text = await response.text();
        } catch (e) {
            throw new Error(`Failed to read response body: ${e.message}`);
        }

        if (!text || !text.trim()) {
            return {};
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            const firstBrace = text.indexOf('{');
            const firstBracket = text.indexOf('[');
            let jsonStart = -1;
            if (firstBrace !== -1 && firstBracket !== -1) {
                jsonStart = Math.min(firstBrace, firstBracket);
            } else if (firstBrace !== -1) {
                jsonStart = firstBrace;
            } else if (firstBracket !== -1) {
                jsonStart = firstBracket;
            }

            if (jsonStart > 0) {
                const possibleJson = text.substring(jsonStart);
                try {
                    const parsed = JSON.parse(possibleJson);
                    const leadingWarning = text.substring(0, jsonStart).replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                    return parsed;
                } catch (e2) {
                    // Fallthrough to logging error below
                }
            }

            const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
            throw new SyntaxError(`Unexpected non-JSON response from server (HTTP ${response.status}): ${cleanSnippet}`);
        }
    }

    async _handleHttpErrors(response, routeName = '') {
        const routeLabel = routeName ? ` [${routeName}]` : '';

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
                if (result.error_details) {
                }
                return this._processResponse(result);
            }
        } catch (parseErr) {
        }

        return null;
    }

    _getCsrfToken() {
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        return csrfMeta ? csrfMeta.getAttribute('content') : '';
    }

    async _executeFetch(fetchOptions, route = '') {
        try {
            const response = await fetch(this.baseUrl, fetchOptions);

            if (!response.ok) {
                const handledError = await this._handleHttpErrors(response, route);
                if (handledError) return handledError;

                if (response.status === 403 || response.status === 429) {
                    const result = await this._parseJsonResponse(response); 

                    if (response.status === 403 && result.message_key === 'error.invalid_csrf_token') {
                        const retryResponse = await this._handleCsrfRetry(fetchOptions, result.csrf_token);
                        if (retryResponse && retryResponse.ok) {
                            const retryResult = await this._parseJsonResponse(retryResponse);
                            return this._processResponse(retryResult);
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
            if (error.name === 'AbortError') {
                return { success: false, aborted: true }; 
            }
            return { success: false, message: window.__('api_connection_error') };
        }
    }

    async post(route, data = {}, signal = null) {
        const payload = {
            route: route,
            ...data
        };

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this._getCsrfToken()
            },
            body: JSON.stringify(payload)
        };

        if (signal) fetchOptions.signal = signal;

        const res = await this._executeFetch(fetchOptions, route);
        if (res && res.ok) {
            const result = await this._parseJsonResponse(res);
            return this._processResponse(result);
        }
        return res;
    }

    async postForm(route, formData, signal = null) {
        formData.append('route', route);

        const fetchOptions = {
            method: 'POST',
            headers: {
                'X-CSRF-Token': this._getCsrfToken()
            },
            body: formData
        };

        if (signal) fetchOptions.signal = signal;

        const res = await this._executeFetch(fetchOptions, route);
        if (res && res.ok) {
            const result = await this._parseJsonResponse(res);
            return this._processResponse(result);
        }
        return res;
    }

    async stream(route, data = {}, signal = null) {
        const payload = {
            route: route,
            ...data
        };

        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(payload)
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
                            return { 
                                success: true, 
                                reader: retryResponse.body.getReader(), 
                                totalBytes: parseInt(retryResponse.headers.get('Content-Length') || '0', 10) 
                            };
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

            return { 
                success: true, 
                reader: response.body.getReader(), 
                totalBytes: parseInt(response.headers.get('Content-Length') || '0', 10) 
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, aborted: true }; 
            }
            return { success: false, message: window.__('api_connection_error') };
        }
    }

    async downloadText(route, data = {}, signal = null) {
        const payload = {
            route: route,
            ...data
        };

        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        const fetchOptions = {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(payload)
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
                        if (retryResponse && retryResponse.ok) {
                            const text = await retryResponse.text();
                            return { success: true, data: text };
                        }
                    }

                    return this._processResponse(errorResult);
                } catch (e) {
                     throw new Error(`Error HTTP: ${response.status}`);
                }
            }

            const text = await response.text();
            
            return { success: true, data: text };

        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, aborted: true }; 
            }
            return { success: false, message: window.__('api_connection_error') };
        }
    }

    async resizeCanvas(canvasId, newSize) {
        return await this.post(ApiRoutes.Canvases.Resize, { id: canvasId, size: newSize });
    }

    async toggleFavorite(canvasId) {
        return await this.post(ApiRoutes.Canvases.ToggleFavorite, { id: canvasId });
    }

    async getAllPermissions() {
        return await this.post(ApiRoutes.Admin.GetPermissions);
    }

    async getRolePermissions(roleId) {
        return await this.post(ApiRoutes.Admin.GetRolePermissions, { id: roleId });
    }

    async updateRolePermissions(roleId, permissionsArray) {
        return await this.post(ApiRoutes.Admin.UpdateRolePermissions, { id: roleId, permissions: permissionsArray });
    }

    async getDashboardMetrics(startDate, endDate) {
        return await this.post(ApiRoutes.Admin.GetDashboardMetrics, { 
            start_date: startDate, 
            end_date: endDate 
        });
    }

    async getPendingRequests(canvasId) {
        return await this.post(ApiRoutes.Canvases.GetPendingRequests, { canvas_id: canvasId });
    }

    async approveCanvasRequest(requestId) {
        return await this.post(ApiRoutes.Canvases.ApproveRequest, { request_id: requestId });
    }

    async rejectCanvasRequest(requestId) {
        return await this.post(ApiRoutes.Canvases.RejectRequest, { request_id: requestId });
    }

    async downloadFile(route, data = {}, defaultFilename = null, signal = null) {
        if (!defaultFilename) {
            defaultFilename = (window.__ ? window.__('receipt_default_filename', 'Recibo.pdf') : 'Recibo.pdf');
        }
        const payload = {
            route: route,
            ...data
        };

        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(payload)
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
                const result = await this._parseJsonResponse(response);
                return this._processResponse(result);
            }

            const blob = await response.blob();
            let filename = defaultFilename;
            const disposition = response.headers.get('Content-Disposition');
            if (disposition && disposition.indexOf('filename=')) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            return { success: true };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, aborted: true };
            }
            return { success: false, message: window.__('api_connection_error') };
        }
    }
}