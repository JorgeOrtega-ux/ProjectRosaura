// public/assets/js/core/api/ApiServices.js

import { ApiRoutes } from './ApiRoutes.js';
import { showMessage } from '../utils/uiUtils.js';

export class ApiService {
    constructor() {
        this.baseUrl = (window.AppBasePath || '') + '/api/index.php'; 
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
                result.message = "Violación de Seguridad: Permisos insuficientes o acción denegada por jerarquía.";
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
            return { success: false, message: (typeof window.__ === 'function' ? window.__('session_revoked') : 'Sesión revocada') };
        }

        if (response.status === 500) {
            return { success: false, message: (typeof window.__ === 'function' ? window.__('server_error_database_offline') : 'Error de base de datos') };
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
            return { success: false, message: (typeof window.__ === 'function' ? window.__('api_connection_error') : 'Error de conexión') };
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
            return { success: false, message: (typeof window.__ === 'function' ? window.__('api_connection_error') : 'Error de conexión') };
        }
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
}