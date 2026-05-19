// public/assets/js/modules/settings/DevicesController.js
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class DevicesController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        
        this.abortController = null;
        this.handleClickBound = this.handleClick.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();

        if (document.querySelector('[data-ref="devices-container"]')) {
            this.initDevicesView();
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleClick(e) {
        const btnRevokeAll = e.target.closest('[data-action="revokeAllDevices"]');
        if (btnRevokeAll) this.revokeAllDevices(btnRevokeAll);

        const btnRevoke = e.target.closest('[data-action="revokeDevice"]');
        if (btnRevoke) this.revokeDevice(btnRevoke);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/settings/devices')) {
            this.initDevicesView();
        }
    }

    async initDevicesView() {
        const container = document.querySelector('[data-ref="devices-container"]');
        if (!container) return;

        container.innerHTML = '<div class="component-group-item spinner-row"><div class="component-spinner component-spinner--centered"></div></div>';

        const res = await this.api.post(ApiRoutes.Settings.GetDevices, {}, this.abortController.signal);
        if (res.aborted) return;
        
        container.innerHTML = '';

        if (res.success) {
            this.renderDevices(res.devices, container);
        } else {
            container.innerHTML = `<div class="component-group-item empty-row"><p class="component-text--danger">${res.message}</p></div>`;
        }
    }

    renderDevices(devices, container) {
        const currentDevice = devices.find(d => d.is_current);
        const otherDevices = devices.filter(d => !d.is_current);

        // 1. Agregar Sesión Actual
        if (currentDevice) {
            container.appendChild(this.createDeviceElement(currentDevice));
        }

        // 2. Agregar Otras Sesiones (con sus divisores)
        otherDevices.forEach(device => {
            const hr = document.createElement('hr');
            hr.className = 'component-divider';
            container.appendChild(hr);
            container.appendChild(this.createDeviceElement(device));
        });

        // 3. Agregar Divisor y el Ítem de "Cerrar Todas"
        const finalHr = document.createElement('hr');
        finalHr.className = 'component-divider';
        container.appendChild(finalHr);
        container.appendChild(this.createRevokeAllItem());
    }

    createDeviceElement(device) {
        const parsedUA = this.parseUserAgent(device.user_agent);
        const div = document.createElement('div');
        div.className = 'component-group-item device-item-row';
        
        const badgeOrBtn = device.is_current ? `
            <div class="component-badge component-badge--sm component-badge--success">
                <span class="material-symbols-rounded component-icon--sm">verified</span>
                ${__('device_current') || 'Sesión Actual'}
            </div>
        ` : `
            <button class="component-button component-button--danger component-button--h36" data-action="revokeDevice" data-id="${device.id}">
                ${__('btn_logout')}
            </button>
        `;

        // MODIFICADO: Se inyecta el ASN a un lado de la Ciudad (Ej: Ciudad de México (Telcel))
        let locationBadge = '';
        if (device.location && device.location !== 'Unknown' && device.location !== 'Local Network') {
            const asnText = device.asn ? ` (${device.asn})` : '';
            locationBadge = `
                <div class="component-badge component-badge--sm" title="${device.location}${asnText}">
                    <span class="material-symbols-rounded">location_on</span>
                    <span style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block;">
                        ${device.location}${asnText}
                    </span>
                </div>
            `;
        }

        const titleClass = device.is_current ? 'component-card__title component-text--bold' : 'component-card__title';

        div.innerHTML = `
            <div class="component-card__content">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">${parsedUA.icon}</span>
                </div>
                <div class="component-card__text">
                    <h2 class="${titleClass}">${parsedUA.os} - ${parsedUA.browser}</h2>
                    <div class="component-badge-list component-badge-list--spaced">
                        ${locationBadge}
                        <div class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded">wifi</span>
                            <span>${device.ip_address || __('device_unknown_ip')}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="component-card__actions component-card__actions--end">${badgeOrBtn}</div>
        `;
        return div;
    }

    createRevokeAllItem() {
        const div = document.createElement('div');
        div.className = 'component-group-item component-group-item--wrap';
        div.innerHTML = `
            <div class="component-card__content">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">logout</span>
                </div>
                <div class="component-card__text">
                    <h2 class="component-card__title">${__('btn_revoke_all')}</h2>
                    <p class="component-card__description">${__('devices_revoke_all_desc') || 'Cierra todas tus sesiones activas en otros dispositivos para mantener tu cuenta segura.'}</p>
                </div>
            </div>
            <div class="component-card__actions component-card__actions--end">
                <button class="component-button component-button--danger component-button--h36" data-action="revokeAllDevices">
                    ${__('btn_revoke_all')}
                </button>
            </div>
        `;
        return div;
    }

    parseUserAgent(ua) {
        let browser = "Browser", os = "OS", icon = "devices";
        if (!ua) return { browser, os, icon };
        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";
        if (ua.includes("Win")) { os = "Windows"; icon = "computer"; }
        else if (ua.includes("Mac")) { os = "MacOS"; icon = "computer"; }
        else if (ua.includes("Linux")) { os = "Linux"; icon = "computer"; }
        else if (ua.includes("Android")) { os = "Android"; icon = "smartphone"; }
        else if (ua.includes("iPhone")) { os = "iOS"; icon = "smartphone"; }
        return { browser, os, icon };
    }

    async revokeDevice(btn) {
        const id = btn.getAttribute('data-id');
        setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.RevokeDevice, { device_id: id }, this.abortController.signal);
        restoreButton(btn);
        if (res.success) { showMessage(res.message, 'success'); this.initDevicesView(); }
        else showMessage(res.message, 'error');
    }

    async revokeAllDevices(btn) {
        const isConfirmed = await window.dialogSystem.show('confirmRevokeAllDevices');
        if (!isConfirmed.confirmed) return;
        setButtonLoading(btn);
        const res = await this.api.post(ApiRoutes.Settings.RevokeAllDevices, { type: isConfirmed.action }, this.abortController.signal);
        restoreButton(btn);
        if (res.success) {
            showMessage(res.message, 'success');
            if (isConfirmed.action === 'revoke_all') window.location.href = this.basePath + '/login';
            else this.initDevicesView();
        } else showMessage(res.message, 'error');
    }
}

export { DevicesController };