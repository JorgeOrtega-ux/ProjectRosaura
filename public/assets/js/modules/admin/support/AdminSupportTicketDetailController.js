import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';

export class AdminSupportTicketDetailController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
        this.ticketUuid = null;

        this._boundClick = this.handleClick.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="admin-ticket-detail-wrapper"]');
        this.abortController = new AbortController();

        const match = window.location.pathname.match(/\/admin\/support\/ticket\/([a-zA-Z0-9_-]+)/);
        if (match) {
            this.ticketUuid = match[1];
        }

        this.bindEvents();
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundClick);
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        document.body.removeEventListener('click', this._boundClick);
    }

    handleClick(e) {
        const replyBtn = e.target.closest('[data-action="submitTicketReply"]');
        if (replyBtn) {
            e.preventDefault();
            this._submitReply(replyBtn);
            return;
        }

        const statusAction = e.target.closest('[data-action="updateTicketStatusAction"]');
        if (statusAction) {
            e.preventDefault();
            const newStatus = statusAction.getAttribute('data-status');
            this._updateStatus(newStatus);
            return;
        }

        const navBack = e.target.closest('[data-nav^="/admin/support/tickets"]');
        if (navBack && window.spaRouter) {
            e.preventDefault();
            window.spaRouter.navigate('/admin/support/tickets');
            return;
        }
    }

    async _loadTicketDetail() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetTicketDetail, {
                uuid: this.ticketUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success && res.ticket) {
                this._renderTicket(res.ticket);
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_ticket_not_found'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(window.__('err_generic'), 'error');
        }
    }

    _renderTicket(ticket) {
        const appUrl = window.APP_URL || '';
        const titleEl = document.querySelector('[data-ref="ticket-detail-title"]');
        const subjectEl = document.querySelector('[data-ref="ticket-detail-subject"]');
        const dateEl = document.querySelector('[data-ref="ticket-detail-date"]');
        const msgEl = document.querySelector('[data-ref="ticket-detail-original-message"]');
        const userNameEl = document.querySelector('[data-ref="ticket-user-name"]');
        const userEmailEl = document.querySelector('[data-ref="ticket-user-email"]');
        const avatarEl = document.querySelector('[data-ref="ticket-user-avatar"]');
        const catBadge = document.querySelector('[data-ref="ticket-category-badge"]');
        const priorityBadge = document.querySelector('[data-ref="ticket-priority-badge"]');
        const statusText = document.querySelector('[data-ref="ticket-status-text"]');

        if (titleEl) {
            titleEl.textContent = `${window.__('title_ticket_detail')} #${ticket.uuid.substring(0, 8)}`;
        }

        if (subjectEl) {
            subjectEl.textContent = ticket.subject;
        }

        if (dateEl) {
            dateEl.textContent = `${window.__('lbl_created_at')}: ${ticket.created_at}`;
        }

        if (userNameEl) {
            userNameEl.textContent = ticket.username || window.__('lbl_user');
        }

        if (userEmailEl) {
            userEmailEl.textContent = ticket.email || '';
        }

        const avatarWrapper = document.querySelector('[data-ref="ticket-user-avatar-wrapper"]');
        if (avatarWrapper && ticket.subscription_color) {
            const subCss = this._parseSubscriptionColor(ticket.subscription_color);
            if (subCss && subCss !== 'transparent') {
                avatarWrapper.className = 'component-button--profile subscription-dynamic component-avatar--static-md';
                avatarWrapper.setAttribute('data-sub-bg', subCss);
                avatarWrapper.style.setProperty('--active-subscription-bg', subCss);
            }
        }

        if (avatarEl) {
            const pic = ticket.profile_picture || ticket.avatar;
            const fallbackAvatar = `${appUrl}/public/assets/img/fallbacks/avatar-default.png`;
            if (pic && !pic.includes('avatar-default.png')) {
                avatarEl.src = pic.startsWith('http') ? pic : `${appUrl}/${pic.replace(/^\/+/, '')}`;
            } else {
                avatarEl.src = fallbackAvatar;
            }
            avatarEl.onerror = () => {
                avatarEl.onerror = null;
                avatarEl.src = fallbackAvatar;
            };
        }

        if (catBadge) {
            catBadge.innerHTML = `<span class="material-symbols-rounded">category</span><span>${this._escapeHtml(ticket.category || 'general')}</span>`;
        }

        if (priorityBadge) {
            const prioMap = {
                low: window.__('lbl_priority_low', [], 'Baja'),
                medium: window.__('lbl_priority_medium', [], 'Media'),
                high: window.__('lbl_priority_high', [], 'Alta'),
                urgent: window.__('lbl_priority_urgent', [], 'Urgente')
            };
            const label = prioMap[ticket.priority] || ticket.priority;
            priorityBadge.innerHTML = `<span class="material-symbols-rounded">flag</span><span>${this._escapeHtml(label)}</span>`;
            priorityBadge.className = `component-badge component-badge--sm ${ticket.priority === 'urgent' ? 'component-badge--danger' : (ticket.priority === 'high' ? 'component-badge--warning' : '')}`;
        }

        if (statusText) {
            const statusMap = {
                open: window.__('lbl_status_open', [], 'Abierto'),
                in_progress: window.__('lbl_status_in_progress', [], 'En progreso'),
                resolved: window.__('lbl_status_resolved', [], 'Resuelto'),
                closed: window.__('lbl_status_closed', [], 'Cerrado')
            };
            statusText.textContent = statusMap[ticket.status] || ticket.status;
        }

        const statusIcon = document.querySelector('[data-ref="ticket-status-icon"]');
        if (statusIcon) {
            const iconMap = {
                open: 'error',
                in_progress: 'timelapse',
                resolved: 'check_circle',
                closed: 'lock'
            };
            statusIcon.textContent = iconMap[ticket.status] || 'rule';
        }

        if (msgEl) {
            msgEl.innerHTML = `<p class="component-card__description">${this._escapeHtml(ticket.message)}</p>`;
        }

        const statusLinks = document.querySelectorAll('[data-action="updateTicketStatusAction"]');
        statusLinks.forEach(link => {
            const s = link.getAttribute('data-status');
            if (s === ticket.status) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        this._loadClientProfile(ticket);
    }

    async _loadClientProfile(ticket) {
        const metaBadges = document.querySelector('[data-ref="ticket-user-meta-badges"]');
        if (!metaBadges) return;

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetClientProfile, { ticket_uuid: ticket.uuid }, this.abortController ? this.abortController.signal : undefined);
            if (!res || !res.success || !res.user) {
                metaBadges.innerHTML = `<span class="component-badge component-badge--sm">${window.__('lbl_guest', [], 'Invitado')}</span>`;
                return;
            }

            const user = res.user;
            this.currentUserData = user;

            metaBadges.innerHTML = `
                <span class="component-badge component-badge--sm">${this._escapeHtml(user.subscription_name || 'Básico')}</span>
                <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">toll</span> ${user.coins || 0}</span>
                <span class="component-badge component-badge--sm">${user.two_factor_enabled ? '2FA Activo' : '2FA Off'}</span>
                ${user.is_suspended ? `<span class="component-badge component-badge--sm component-badge--danger"><span class="material-symbols-rounded">block</span> Suspendido</span>` : ''}
            `;
        } catch (e) {
            console.error("Failed to load client profile in ticket detail: " + e.message);
        }
    }

    async _updateStatus(newStatus) {
        if (!newStatus || !this.ticketUuid) return;

        const statusModule = document.querySelector('[data-module="moduleTicketStatusChange"]');
        if (statusModule) {
            if (window.appInstance?.moduleManager) {
                window.appInstance.moduleManager.close(statusModule);
            } else if (window.moduleManager) {
                window.moduleManager.close(statusModule);
            } else {
                statusModule.classList.add('disabled');
            }
        }

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.UpdateTicketStatus, {
                uuid: this.ticketUuid,
                status: newStatus
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                showMessage(window.__('msg_support_ticket_updated'), 'success');
                this._loadTicketDetail();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_generic'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(window.__('err_generic'), 'error');
        }
    }

    async _submitReply(btn) {
        if (!btn || !this.ticketUuid || btn.classList.contains('disabled-interaction')) return;

        const replyInput = document.querySelector('[data-ref="ticket-reply-text"]');
        const replyText = replyInput ? replyInput.value.trim() : '';

        if (!replyText || replyText.length < 5) {
            showMessage(window.__('err_support_invalid_message'), 'error');
            if (replyInput) replyInput.focus();
            return;
        }

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.ReplyTicket, {
                uuid: this.ticketUuid,
                message: replyText
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);

            if (res && res.success) {
                showMessage(window.__('msg_support_ticket_replied'), 'success');
                if (replyInput) replyInput.value = '';
                this._loadTicketDetail();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_generic'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_generic'), 'error');
        }
    }

    _parseSubscriptionColor(colorRaw) {
        if (!colorRaw) return 'transparent';
        try {
            let colorData = colorRaw;
            if (typeof colorRaw === 'string') {
                const trimmed = colorRaw.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    colorData = JSON.parse(trimmed);
                } else {
                    return colorRaw;
                }
            }
            if (colorData && typeof colorData === 'object') {
                if (colorData.type === 'solid') {
                    const firstColor = (colorData.colors && colorData.colors[0]);
                    return (typeof firstColor === 'string' ? firstColor : firstColor?.hex) || '#808080';
                }
                if (colorData.type === 'linear') {
                    const angle = colorData.angle || '90';
                    const colors = Array.isArray(colorData.colors) ? colorData.colors : [];
                    const stops = colors.map((c, i, arr) => {
                        const hex = typeof c === 'string' ? c : (c.hex || '#000');
                        const p = (typeof c === 'object' && c.percentage !== undefined) ? c.percentage : Math.floor((i / (arr.length - 1 || 1)) * 100);
                        return `${hex} ${p}%`;
                    }).join(', ');
                    return `linear-gradient(${angle}deg, ${stops})`;
                }
                if (colorData.type === 'conic') {
                    const angle = colorData.angle || '0';
                    const colors = Array.isArray(colorData.colors) ? colorData.colors : [];
                    const stops = colors.map((c, i, arr) => {
                        const hex = typeof c === 'string' ? c : (c.hex || '#000');
                        const p = (typeof c === 'object' && c.percentage !== undefined) ? c.percentage : Math.floor((i / (arr.length || 1)) * 100);
                        return `${hex} ${p}%`;
                    }).join(', ');
                    return `conic-gradient(from ${angle}deg, ${stops})`;
                }
            }
        } catch (e) {}
        return 'transparent';
    }

    _escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
