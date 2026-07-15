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

    constructor() {
        this.baseUrl = (window.AppBasePath || '') + '/api/index.php'; 
    }

    async _handleCsrfRetry(originalFetchOptions) {
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
                
                fetch(window.location.href)
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

    _handleHttpErrors(response) {
        if (response.status === 503) {
            window.dispatchEvent(new CustomEvent('systemMaintenanceTriggered'));
            return { success: false, aborted: true };
        }

        if (response.status === 401) {
            window.location.href = (window.AppBasePath || '') + '/login?reason=session_revoked';
            return { success: false, message: window.__('session_revoked') };
        }

        if (response.status === 500) {
            return { success: false, message: window.__('server_error_database_offline') };
        }
        
        return null;
    }

    async post(route, data = {}, signal = null) {
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
                const handledError = this._handleHttpErrors(response);
                if (handledError) return handledError;

                if (response.status === 403 || response.status === 429) {
                    const result = await response.json(); 

                    if (response.status === 403 && result.message_key === 'error.invalid_csrf_token') {
                        const retryResponse = await this._handleCsrfRetry(fetchOptions);
                        if (retryResponse && retryResponse.ok) {
                            const retryResult = await retryResponse.json();
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

            const result = await response.json();
            return this._processResponse(result);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, aborted: true }; 
            }
            return { success: false, message: window.__('api_connection_error') };
        }
    }

    async postForm(route, formData, signal = null) {
        formData.append('route', route);
        
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

        const fetchOptions = {
            method: 'POST',
            headers: {
                'X-CSRF-Token': csrfToken
            },
            body: formData
        };

        if (signal) fetchOptions.signal = signal;

        try {
            const response = await fetch(this.baseUrl, fetchOptions);

            if (!response.ok) {
                const handledError = this._handleHttpErrors(response);
                if (handledError) return handledError;

                if (response.status === 403 || response.status === 429) {
                    const result = await response.json(); 

                    if (response.status === 403 && result.message_key === 'error.invalid_csrf_token') {
                        const retryResponse = await this._handleCsrfRetry(fetchOptions);
                        if (retryResponse && retryResponse.ok) {
                            const retryResult = await retryResponse.json();
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

            const result = await response.json();
            return this._processResponse(result); 

        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, aborted: true }; 
            }
            return { success: false, message: window.__('api_connection_error') };
        }
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
                const handledError = this._handleHttpErrors(response);
                if (handledError) return handledError;

                if (response.status === 403 || response.status === 429) {
                    const result = await response.json(); 

                    if (response.status === 403 && result.message_key === 'error.invalid_csrf_token') {
                        const retryResponse = await this._handleCsrfRetry(fetchOptions);
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
            console.time('fetchRequest_' + route);
            console.log('[ApiService] Fetching text from', route, 'at', performance.now());
            const response = await fetch(this.baseUrl, fetchOptions);
            console.log('[ApiService] Got headers from', route, 'at', performance.now());

            if (!response.ok) {
                console.timeEnd('fetchRequest_' + route);
                const handledError = this._handleHttpErrors(response);
                if (handledError) return handledError;

                try {
                    const errorResult = await response.json();

                    if (response.status === 403 && errorResult.message_key === 'error.invalid_csrf_token') {
                        const retryResponse = await this._handleCsrfRetry(fetchOptions);
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

            console.log('[ApiService] Starting to read response text at', performance.now());
            const text = await response.text();
            console.log('[ApiService] Finished reading response text at', performance.now());
            console.timeEnd('fetchRequest_' + route);
            
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
}