import { ApiRoutes } from '../api/ApiRoutes.js';
import { ApiService } from '../api/ApiService.js';
import { CardTemplates } from '../components/CardTemplates.js';
import { formatNumber, showMessage } from '../utils/uiUtils.js';

export class NotificationManager {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.pollInterval = null;
        this.isLoading = false;
        this.hasLoadedOnce = false;

        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        if (window.activeUserId) {
            this.fetchUnreadCount();
            this.startPolling();
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        document.removeEventListener('click', this.handleDocumentClickBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleDocumentClickBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && window.activeUserId) {
                this.fetchUnreadCount();
            }
        }, 45000);
    }

    handleViewLoaded() {
        if (window.activeUserId) {
            this.fetchUnreadCount();
        }
    }

    async handleDocumentClick(e) {
        const toggleBtn = e.target.closest('[data-target="moduleNotifications"]');
        if (toggleBtn) {
            const module = document.querySelector('.component-module[data-module="moduleNotifications"]');
            if (module) {
                setTimeout(() => {
                    if (module.classList.contains('active') || !module.classList.contains('disabled')) {
                        this.loadNotifications();
                    }
                }, 50);
            }
            return;
        }

        const markAllBtn = e.target.closest('[data-action="markAllNotificationsRead"]');
        if (markAllBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.markAllAsRead(markAllBtn);
            return;
        }

        const notifItem = e.target.closest('[data-action="openNotification"]');
        if (notifItem) {
            e.preventDefault();
            e.stopPropagation();
            const notifId = notifItem.getAttribute('data-notification-id');
            const targetUrl = notifItem.getAttribute('data-target-url');
            this.handleNotificationClick(notifId, targetUrl, notifItem);
            return;
        }
    }

    async fetchUnreadCount() {
        try {
            const res = await this.api.post(ApiRoutes.Notifications.GetUnreadCount, {}, this.abortController.signal);
            if (res && res.success) {
                this.updateUnreadCount(res.unread_count || 0);
            }
        } catch (err) {
        }
    }

    async loadNotifications() {
        const listContainer = document.querySelector('[data-ref="notifications-list"]');
        if (!listContainer) return;

        if (!this.hasLoadedOnce) {
            listContainer.innerHTML = `
                <div class="component-notifications-loading">
                    <span class="material-symbols-rounded spin">sync</span>
                </div>
            `;
        }

        this.isLoading = true;

        try {
            const res = await this.api.post(ApiRoutes.Notifications.Get, { page: 1, limit: 30 }, this.abortController.signal);

            if (res && res.success) {
                const notifications = res.data || [];
                const unreadCount = res.unread_count || 0;
                this.updateUnreadCount(unreadCount);
                this.hasLoadedOnce = true;

                if (notifications.length === 0) {
                    listContainer.innerHTML = `
                        <div class="component-notifications-empty">
                            <span class="material-symbols-rounded">notifications_off</span>
                            <h4>${window.__('notifications.empty_title') || 'Sin notificaciones'}</h4>
                            <p>${window.__('notifications.empty_desc') || 'Aquí verás tus notificaciones cuando alguien interactúe contigo.'}</p>
                        </div>
                    `;
                } else {
                    listContainer.innerHTML = notifications
                        .map(n => CardTemplates.notificationItem(n, { basePath: this.basePath }))
                        .join('');
                }
            } else {
                listContainer.innerHTML = `
                    <div class="component-notifications-empty">
                        <span class="material-symbols-rounded">error</span>
                        <p>${res.message || 'Error al cargar notificaciones'}</p>
                    </div>
                `;
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                listContainer.innerHTML = `
                    <div class="component-notifications-empty">
                        <span class="material-symbols-rounded">error</span>
                        <p>Error de conexión al cargar notificaciones</p>
                    </div>
                `;
            }
        } finally {
            this.isLoading = false;
        }
    }

    async markAllAsRead(btnEl) {
        if (btnEl) btnEl.disabled = true;

        try {
            const res = await this.api.post(ApiRoutes.Notifications.MarkAllRead, {}, this.abortController.signal);
            if (res && res.success) {
                this.updateUnreadCount(0);

                const unreadItems = document.querySelectorAll('.component-notification-item--unread');
                unreadItems.forEach(item => {
                    item.classList.remove('component-notification-item--unread');
                    const dot = item.querySelector('.component-notification-item__dot');
                    if (dot) dot.remove();
                });

                if (res.message) showMessage(res.message, 'success');
            } else if (res && res.message) {
                showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage(window.__('notifications.mark_all_error') || 'Error al marcar notificaciones.', 'error');
        } finally {
            if (btnEl) btnEl.disabled = false;
        }
    }

    async handleNotificationClick(notifId, targetUrl, itemEl) {
        if (itemEl && itemEl.classList.contains('component-notification-item--unread')) {
            itemEl.classList.remove('component-notification-item--unread');
            const dot = itemEl.querySelector('.component-notification-item__dot');
            if (dot) dot.remove();

            if (notifId) {
                this.api.post(ApiRoutes.Notifications.MarkRead, { id: notifId }).then(res => {
                    if (res && typeof res.unread_count === 'number') {
                        this.updateUnreadCount(res.unread_count);
                    }
                }).catch(() => {});
            }
        }

        const moduleManager = window.mainController ? window.mainController.moduleManager : null;
        if (moduleManager && typeof moduleManager.closeModule === 'function') {
            moduleManager.closeModule('moduleNotifications');
        }

        if (targetUrl) {
            if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                window.spaRouter.navigate(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
        }
    }

    updateUnreadCount(count) {
        const num = parseInt(count, 10) || 0;
        const bellBadge = document.querySelector('[data-ref="notifications-unread-counter"]');
        const topBadge = document.querySelector('[data-ref="notif-badge-unread-count"]');

        if (bellBadge) {
            if (num > 0) {
                bellBadge.textContent = num > 99 ? '99+' : num;
                bellBadge.classList.remove('disabled');
            } else {
                bellBadge.textContent = '0';
                bellBadge.classList.add('disabled');
            }
        }

        if (topBadge) {
            if (num > 0) {
                topBadge.textContent = num > 99 ? '99+' : num;
                topBadge.classList.remove('disabled');
            } else {
                topBadge.textContent = '0';
                topBadge.classList.add('disabled');
            }
        }
    }
}