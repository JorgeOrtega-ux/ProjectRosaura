// public/assets/js/modules/settings/DevicesController.js
import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class DevicesController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
    }

    init() {
        this.bindEvents();
        console.log("DevicesController inicializado.");

        if (document.getElementById('devices-container')) {
            this.initDevicesView();
        }
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const btnRevokeAll = e.target.closest('[data-action="revokeAllDevices"]');
            if (btnRevokeAll) this.revokeAllDevices(btnRevokeAll);

            const btnRevoke = e.target.closest('[data-action="revokeDevice"]');
            if (btnRevoke) this.revokeDevice(btnRevoke);
        });

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/settings/devices')) {
                this.initDevicesView();
            }
        });
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else alert(msg);
    }

    setButtonLoading(btn) {
        if (btn.disabled) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;
    }

    restoreButton(btn) {
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }

    async initDevicesView() {
        const container = document.getElementById('devices-container');
        if (!container) return;

        const existingRows = container.querySelectorAll('.device-item-row, .spinner-row, .empty-row, .component-divider');
        existingRows.forEach(row => row.remove());

        const spinnerRow = document.createElement('div');
        spinnerRow.className = 'component-group-item spinner-row';
        spinnerRow.innerHTML = '<div class="component-spinner component-spinner--centered"></div>';
        container.appendChild(spinnerRow);

        const res = await this.api.post(ApiRoutes.Settings.GetDevices);
        
        spinnerRow.remove();

        if (res.success) {
            this.renderDevices(res.devices, container);
        } else {
            const errorRow = document.createElement('div');
            errorRow.className = 'component-group-item empty-row';
            errorRow.innerHTML = `<p class="component-text--danger">${res.message}</p>`;
            container.appendChild(errorRow);
        }
    }

    renderDevices(devices, container) {
        if (devices.length === 0) {
            const emptyText = typeof window.__ === 'function' ? __('devices_empty') : 'No hay dispositivos activos.';
            const emptyRow = document.createElement('div');
            emptyRow.className = 'component-group-item empty-row';
            emptyRow.innerHTML = `<p class="component-card__description">${emptyText}</p>`;
            container.appendChild(emptyRow);
            return;
        }

        devices.forEach((device, index) => {
            if (index > 0) {
                const hr = document.createElement('hr');
                hr.className = 'component-divider';
                container.appendChild(hr);
            }

            const parsedUA = this.parseUserAgent(device.user_agent);
            
            const div = document.createElement('div');
            div.className = 'component-group-item device-item-row';
            
            const btnHtml = !device.is_current ? `
                <button class="component-button component-button--danger component-button--h36" data-action="revokeDevice" data-id="${device.id}">
                    Cerrar sesión
                </button>
            ` : '';

            const statusCurrentText = typeof window.__ === 'function' ? __('device_current') : 'Este dispositivo (Actual)';
            const statusActiveText = typeof window.__ === 'function' ? __('device_active') : 'Activo';
            const unknownIpText = typeof window.__ === 'function' ? __('device_unknown_ip') : 'Desconocida';

            const statusText = device.is_current ? statusCurrentText : statusActiveText;
            const statusClass = device.is_current ? 'component-group-item__status--success' : '';
            const statusIcon = device.is_current ? 'check_circle' : 'bolt';

            div.innerHTML = `
                <div class="component-group-item__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">${parsedUA.icon}</span>
                    </div>
                    <div class="component-group-item__text">
                        <h3 class="component-group-item__title">${parsedUA.os} - ${parsedUA.browser}</h3>
                        <div class="component-badge-list">
                            <div class="component-badge component-badge--sm">
                                <span class="material-symbols-rounded">wifi</span>
                                <span>IP: ${device.ip_address || unknownIpText}</span>
                            </div>
                            <div class="component-badge component-badge--sm">
                                <span class="material-symbols-rounded">${statusIcon}</span>
                                <span class="${statusClass}">${statusText}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-group-item__actions">${btnHtml}</div>
            `;
            container.appendChild(div);
        });
    }

    parseUserAgent(ua) {
        let browser = "Navegador Desconocido";
        let os = "OS Desconocido";
        let icon = "devices";

        if (!ua) return { browser, os, icon };

        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

        if (ua.includes("Win")) { os = "Windows"; icon = "computer"; }
        else if (ua.includes("Mac")) { os = "MacOS"; icon = "computer"; }
        else if (ua.includes("Linux")) { os = "Linux"; icon = "computer"; }
        else if (ua.includes("Android")) { os = "Android"; icon = "smartphone"; }
        else if (ua.includes("iPhone") || ua.includes("iPad")) { os = "iOS"; icon = "smartphone"; }

        return { browser, os, icon };
    }

    async revokeDevice(btn) {
        const id = btn.getAttribute('data-id');
        this.setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.RevokeDevice, { device_id: id });
        this.restoreButton(btn);

        if (res.success) {
            this.showMessage(res.message, 'success');
            this.initDevicesView(); 
        } else {
            this.showMessage(res.message, 'error');
        }
    }

    async revokeAllDevices(btn) {
        const isConfirmed = await window.dialogSystem.show('confirmRevokeAllDevices');
        if (!isConfirmed.confirmed) return;

        const actionType = isConfirmed.action;

        this.setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.RevokeAllDevices, { type: actionType });
        this.restoreButton(btn);

        if (res.success) {
            this.showMessage(res.message, 'success');
            if (actionType === 'revoke_all') {
                setTimeout(() => {
                    if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/login');
                    else window.location.href = this.basePath + '/login';
                }, 1000);
            } else {
                this.initDevicesView(); 
            }
        } else {
            this.showMessage(res.message, 'error');
        }
    }
}